import { AuthenticatedUser, LeaderboardUser, PracticeSubmission } from '../types';
import { OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from './oopCourse';
import { PRACTICE_CHALLENGES } from './practiceChallenges';

export const STUDENT_PROGRESS_KEY = 'oophub_student_oop_progress';

export type LessonActivityStatus = 'Completed' | 'Passed' | 'Submitted' | 'In Progress' | 'Not Started';

export interface LessonProgressActivity {
  id: string;
  label: string;
  status: LessonActivityStatus;
}

export interface LessonProgressSummary {
  lessonId: string;
  sequence: number;
  title: string;
  videoPercent: number;
  videoCompleted: boolean;
  quizPercent: number;
  quizPassed: boolean;
  practiceScore: number;
  practicePassed: boolean;
}

export interface StudentOopProgress {
  studentId: string;
  studentEmail: string;
  studentName: string;
  videoProgress: number;
  quizScore: number;
  practiceScore: number;
  overallProgress: number;
  completedVideos: number;
  passedQuizzes: number;
  passedPractices: number;
  status: string;
  lessons: LessonProgressSummary[];
  realtime: LessonProgressActivity[];
  updatedAt: string;
}

type ProgressDb = Record<string, StudentOopProgress>;

const emptyLessons = (): LessonProgressSummary[] =>
  OOP_COURSE_LESSONS.map(lesson => ({
    lessonId: lesson.id,
    sequence: lesson.sequence,
    title: lesson.title,
    videoPercent: 0,
    videoCompleted: false,
    quizPercent: 0,
    quizPassed: false,
    practiceScore: 0,
    practicePassed: false
  }));

export const getStudentProgressKey = (user?: Partial<AuthenticatedUser> | null) =>
  String(user?.id || user?.userId || user?.email || 'student-local');

const readDb = (): ProgressDb => {
  try {
    const saved = localStorage.getItem(STUDENT_PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const writeDb = (db: ProgressDb) => {
  try {
    localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(db));
  } catch {
    // The current page state still remains usable if browser storage is unavailable.
  }
};

const computeRealtime = (lessons: LessonProgressSummary[]): LessonProgressActivity[] => {
  const rows = lessons.flatMap(lesson => {
    const activities: LessonProgressActivity[] = [];
    if (lesson.videoCompleted || lesson.videoPercent > 0) {
      activities.push({
        id: `${lesson.lessonId}-video`,
        label: `${lesson.title} video`,
        status: lesson.videoCompleted ? 'Completed' : 'In Progress'
      });
    }
    if (lesson.quizPassed || lesson.quizPercent > 0) {
      activities.push({
        id: `${lesson.lessonId}-quiz`,
        label: `${lesson.title} assessment`,
        status: lesson.quizPassed ? 'Passed' : 'In Progress'
      });
    }
    if (lesson.practicePassed || lesson.practiceScore > 0) {
      activities.push({
        id: `${lesson.lessonId}-practice`,
        label: `${lesson.title} Practice IDE`,
        status: lesson.practicePassed ? 'Submitted' : 'In Progress'
      });
    }
    return activities;
  });

  return rows.length ? rows.slice(-5).reverse() : [{
    id: 'not-started',
    label: 'OOP learning path',
    status: 'Not Started'
  }];
};

const recompute = (snapshot: StudentOopProgress): StudentOopProgress => {
  const lessonCount = OOP_COURSE_LESSONS.length || 1;
  const completedVideos = snapshot.lessons.filter(lesson => lesson.videoCompleted).length;
  const passedQuizzes = snapshot.lessons.filter(lesson => lesson.quizPassed).length;
  const passedPractices = snapshot.lessons.filter(lesson => lesson.practicePassed).length;
  const videoProgress = Math.round((completedVideos / lessonCount) * 100);
  const quizScore = Math.round((passedQuizzes / lessonCount) * 100);
  const practiceScore = Math.round((passedPractices / lessonCount) * 100);
  const overallProgress = Math.round((videoProgress + quizScore + practiceScore) / 3);

  return {
    ...snapshot,
    videoProgress,
    quizScore,
    practiceScore,
    overallProgress,
    completedVideos,
    passedQuizzes,
    passedPractices,
    status: overallProgress >= 100 ? 'Completed' : overallProgress > 0 ? 'In Progress' : 'Not Started',
    realtime: computeRealtime(snapshot.lessons),
    updatedAt: new Date().toISOString()
  };
};

export const readStudentProgress = (studentKey: string) => readDb()[studentKey];

export const readAllStudentProgress = () => readDb();

export const ensureStudentProgress = (user?: Partial<AuthenticatedUser> | null): StudentOopProgress => {
  const key = getStudentProgressKey(user);
  const db = readDb();
  const existing = db[key];
  if (existing) return existing;

  const next = recompute({
    studentId: key,
    studentEmail: user?.email || key,
    studentName: user?.name || 'Student',
    videoProgress: 0,
    quizScore: 0,
    practiceScore: 0,
    overallProgress: 0,
    completedVideos: 0,
    passedQuizzes: 0,
    passedPractices: 0,
    status: 'Not Started',
    lessons: emptyLessons(),
    realtime: [],
    updatedAt: new Date().toISOString()
  });
  db[key] = next;
  writeDb(db);
  return next;
};

const updateStudentProgress = (
  user: Partial<AuthenticatedUser> | null | undefined,
  updater: (snapshot: StudentOopProgress) => StudentOopProgress
) => {
  const key = getStudentProgressKey(user);
  const db = readDb();
  const base = db[key] || ensureStudentProgress(user);
  const next = recompute(updater(base));
  db[key] = next;
  writeDb(db);
  return next;
};

export const recordVideoProgress = (user: Partial<AuthenticatedUser> | null | undefined, lessonId: string, progress: number) =>
  updateStudentProgress(user, snapshot => ({
    ...snapshot,
    lessons: snapshot.lessons.map(lesson => lesson.lessonId === lessonId
      ? {
          ...lesson,
          videoPercent: Math.max(lesson.videoPercent, progress),
          videoCompleted: lesson.videoCompleted || progress >= 95
        }
      : lesson)
  }));

export const recordQuizAttempt = (
  user: Partial<AuthenticatedUser> | null | undefined,
  lessonId: string,
  percentage: number,
  passed: boolean
) =>
  updateStudentProgress(user, snapshot => ({
    ...snapshot,
    lessons: snapshot.lessons.map(lesson => lesson.lessonId === lessonId
      ? {
          ...lesson,
          quizPercent: Math.max(lesson.quizPercent, percentage),
          quizPassed: lesson.quizPassed || passed
        }
      : lesson)
  }));

export const recordPracticeSubmission = (
  user: Partial<AuthenticatedUser> | null | undefined,
  submission: PracticeSubmission
) => {
  const challenge = PRACTICE_CHALLENGES.find(item => item.id === submission.challengeId);
  if (!challenge) return ensureStudentProgress(user);

  return updateStudentProgress(user, snapshot => ({
    ...snapshot,
    lessons: snapshot.lessons.map(lesson => lesson.lessonId === challenge.lessonId
      ? {
          ...lesson,
          practiceScore: Math.max(lesson.practiceScore, submission.score),
          practicePassed: lesson.practicePassed || submission.score >= 70
        }
      : lesson)
  }));
};

export const progressToLeaderboardUser = (progress: StudentOopProgress, rank = 1): LeaderboardUser => ({
  rank,
  name: progress.studentName,
  points: progress.overallProgress,
  progress: progress.overallProgress,
  videoProgress: progress.videoProgress,
  quizScore: progress.quizScore,
  practiceScore: progress.practiceScore,
  status: progress.status,
  currentTopic: progress.realtime[0]?.label || 'OOP learning path',
  badges: [
    `${progress.videoProgress}% Video`,
    `${progress.quizScore}% Quiz`,
    `${progress.practiceScore}% Practice IDE`
  ],
  streak: 0,
  avatar: '',
  trend: progress.overallProgress > 0 ? 'up' : 'stable',
  realtimeOopProgress: progress.realtime
});
