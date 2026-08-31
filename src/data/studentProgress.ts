import { AuthenticatedUser, LeaderboardUser, PracticeSubmission } from '../types';
import { OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from './oopCourse';
import { PRACTICE_CHALLENGES } from './practiceChallenges';

export const STUDENT_PROGRESS_KEY = 'oophub_student_oop_progress';

export type LessonActivityStatus = 'Completed' | 'Passed' | 'Submitted' | 'In Progress' | 'Not Started';

export interface LessonProgressActivity {
  id: string;
  label: string;
  status: LessonActivityStatus;
  occurredAt?: string;
}

export interface LessonProgressSummary {
  lessonId: string;
  sequence: number;
  title: string;
  lessonProgress: number;
  videoPercent: number;
  videoStatus: 'completed' | 'in_progress' | 'not_started';
  videoCompleted: boolean;
  videoCompletedAt?: string;
  quizPercent: number;
  quizStatus: 'passed' | 'in_progress' | 'not_started';
  quizPassed: boolean;
  quizCompletedAt?: string;
  practiceScore: number;
  practiceStatus: 'passed' | 'submitted' | 'in_progress' | 'not_started';
  practicePassed: boolean;
  practiceSubmittedAt?: string;
  practiceTaskId?: string;
  submissionId?: string;
}

export interface StudentOopProgress {
  studentId: string;
  studentEmail: string;
  studentName: string;
  videoProgress: number;
  quizScore: number;
  practiceScore: number;
  overallProgress: number;
  completedLessons: number;
  completedVideos: number;
  passedQuizzes: number;
  passedPractices: number;
  status: string;
  lastActivityAt?: string;
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
    lessonProgress: 0,
    videoPercent: 0,
    videoStatus: 'not_started',
    videoCompleted: false,
    quizPercent: 0,
    quizStatus: 'not_started',
    quizPassed: false,
    practiceScore: 0,
    practiceStatus: 'not_started',
    practicePassed: false
  }));

export const getStudentProgressKey = (user?: Partial<AuthenticatedUser> | null) =>
  String(user?.id || user?.userId || user?.email || 'student-local');

const normalizeLookup = (value?: string | null) => String(value || '').trim().toLowerCase();

const getStudentProgressAliases = (user?: Partial<AuthenticatedUser> | null) => {
  const primaryAliases = [user?.id, user?.userId, user?.email, user?.studentNumber]
    .filter(Boolean)
    .map(value => normalizeLookup(String(value)));

  if (primaryAliases.length) return primaryAliases;

  return [user?.name]
    .filter(Boolean)
    .map(value => normalizeLookup(String(value)));
};

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
        status: lesson.videoCompleted ? 'Completed' : 'In Progress',
        occurredAt: lesson.videoCompletedAt
      });
    }
    if (lesson.quizPassed || lesson.quizPercent > 0) {
      activities.push({
        id: `${lesson.lessonId}-quiz`,
        label: `${lesson.title} assessment`,
        status: lesson.quizPassed ? 'Passed' : 'In Progress',
        occurredAt: lesson.quizCompletedAt
      });
    }
    if (lesson.practicePassed || lesson.practiceScore > 0) {
      activities.push({
        id: `${lesson.lessonId}-practice`,
        label: `${lesson.title} Practice IDE`,
        status: lesson.practicePassed ? 'Submitted' : 'In Progress',
        occurredAt: lesson.practiceSubmittedAt
      });
    }
    return activities;
  });

  const sortedRows = rows.sort((a, b) => String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')));

  return sortedRows.length ? sortedRows.slice(0, 5) : [{
    id: 'not-started',
    label: 'OOP learning path',
    status: 'Not Started'
  }];
};

const normalizeLesson = (lesson: LessonProgressSummary): LessonProgressSummary => {
  const videoCompleted = Boolean(lesson.videoCompleted || lesson.videoPercent >= 95);
  const quizPassed = Boolean(lesson.quizPassed);
  const practicePassed = Boolean(lesson.practicePassed || lesson.practiceScore >= 70);
  const completedParts = [videoCompleted, quizPassed, practicePassed].filter(Boolean).length;

  return {
    ...lesson,
    lessonProgress: Math.round((completedParts / 3) * 100),
    videoCompleted,
    videoStatus: videoCompleted ? 'completed' : lesson.videoPercent > 0 ? 'in_progress' : 'not_started',
    quizPassed,
    quizStatus: quizPassed ? 'passed' : lesson.quizPercent > 0 ? 'in_progress' : 'not_started',
    practicePassed,
    practiceStatus: practicePassed ? 'passed' : lesson.practiceScore > 0 ? 'submitted' : 'not_started'
  };
};

const recompute = (snapshot: StudentOopProgress): StudentOopProgress => {
  const lessonCount = OOP_COURSE_LESSONS.length || 1;
  const lessons = OOP_COURSE_LESSONS.map(courseLesson => {
    const saved = snapshot.lessons.find(lesson => lesson.lessonId === courseLesson.id);
    return normalizeLesson({
      ...emptyLessons().find(lesson => lesson.lessonId === courseLesson.id)!,
      ...saved,
      sequence: courseLesson.sequence,
      title: courseLesson.title
    });
  });
  const completedVideos = lessons.filter(lesson => lesson.videoCompleted).length;
  const passedQuizzes = lessons.filter(lesson => lesson.quizPassed).length;
  const passedPractices = lessons.filter(lesson => lesson.practicePassed).length;
  const completedLessons = lessons.filter(lesson => lesson.lessonProgress >= 100).length;
  const videoProgress = Math.round((completedVideos / lessonCount) * 100);
  const quizScore = Math.round((passedQuizzes / lessonCount) * 100);
  const practiceScore = Math.round((passedPractices / lessonCount) * 100);
  const overallProgress = Math.round(lessons.reduce((sum, lesson) => sum + lesson.lessonProgress, 0) / lessonCount);
  const latestActivityAt = lessons
    .flatMap(lesson => [lesson.videoCompletedAt, lesson.quizCompletedAt, lesson.practiceSubmittedAt])
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    ...snapshot,
    lessons,
    videoProgress,
    quizScore,
    practiceScore,
    overallProgress,
    completedLessons,
    completedVideos,
    passedQuizzes,
    passedPractices,
    status: overallProgress >= 100 ? 'Completed' : overallProgress > 0 ? 'In Progress' : 'Not Started',
    lastActivityAt: latestActivityAt || snapshot.lastActivityAt,
    realtime: computeRealtime(lessons),
    updatedAt: new Date().toISOString()
  };
};

export const findStudentProgress = (...studentKeys: Array<string | undefined | null>) => {
  const db = readDb();
  const normalizedKeys = studentKeys.map(normalizeLookup).filter(Boolean);
  return Object.entries(db).find(([key, progress]) => {
    const aliases = [
      key,
      progress.studentId,
      progress.studentEmail,
      progress.studentName
    ].map(normalizeLookup);
    return normalizedKeys.some(candidate => aliases.includes(candidate));
  })?.[1];
};

export const readStudentProgress = (studentKey: string) => findStudentProgress(studentKey);

export const readAllStudentProgress = () => readDb();

export const ensureStudentProgress = (user?: Partial<AuthenticatedUser> | null): StudentOopProgress => {
  const key = getStudentProgressKey(user);
  const db = readDb();
  const existing = findStudentProgress(...getStudentProgressAliases(user));
  if (existing) return existing;

  const next = recompute({
    studentId: key,
    studentEmail: user?.email || key,
    studentName: user?.name || 'Student',
    videoProgress: 0,
    quizScore: 0,
    practiceScore: 0,
    overallProgress: 0,
    completedLessons: 0,
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
  const base = findStudentProgress(...getStudentProgressAliases(user)) || ensureStudentProgress(user);
  const writeKey = base.studentId || key;
  const now = new Date().toISOString();
  const next = recompute(updater(base));
  const normalizedAliases = [writeKey, key, next.studentEmail].map(normalizeLookup);
  Object.keys(db).forEach(existingKey => {
    const progress = db[existingKey];
    if (normalizedAliases.includes(normalizeLookup(existingKey)) || normalizedAliases.includes(normalizeLookup(progress.studentId)) || normalizedAliases.includes(normalizeLookup(progress.studentEmail))) {
      delete db[existingKey];
    }
  });
  db[writeKey] = { ...next, lastActivityAt: next.lastActivityAt || now };
  writeDb(db);
  return db[writeKey];
};

export const recordVideoProgress = (user: Partial<AuthenticatedUser> | null | undefined, lessonId: string, progress: number) =>
  updateStudentProgress(user, snapshot => {
    const now = new Date().toISOString();
    return {
      ...snapshot,
      lessons: snapshot.lessons.map(lesson => lesson.lessonId === lessonId
        ? {
            ...lesson,
            videoPercent: Math.max(lesson.videoPercent, progress),
            videoCompleted: lesson.videoCompleted || progress >= 95,
            videoCompletedAt: lesson.videoCompletedAt || (progress >= 95 ? now : undefined)
          }
        : lesson)
    };
  });

export const recordQuizAttempt = (
  user: Partial<AuthenticatedUser> | null | undefined,
  lessonId: string,
  percentage: number,
  passed: boolean
) =>
  updateStudentProgress(user, snapshot => {
    const now = new Date().toISOString();
    return {
      ...snapshot,
      lessons: snapshot.lessons.map(lesson => lesson.lessonId === lessonId
        ? {
            ...lesson,
            quizPercent: Math.max(lesson.quizPercent, percentage),
            quizPassed: lesson.quizPassed || passed,
            quizCompletedAt: lesson.quizCompletedAt || now
          }
        : lesson)
    };
  });

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
          practicePassed: lesson.practicePassed || submission.score >= 70,
          practiceSubmittedAt: lesson.practiceSubmittedAt || submission.submittedAt,
          practiceTaskId: submission.challengeId,
          submissionId: submission.id
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
  lessonProgress: progress.lessons.map(lesson => ({
    lessonId: lesson.lessonId,
    title: lesson.title,
    sequence: lesson.sequence,
    videoProgress: lesson.videoPercent,
    quizScore: lesson.quizPercent,
    practiceScore: lesson.practiceScore,
    lessonProgress: lesson.lessonProgress,
    status: lesson.lessonProgress >= 100 ? 'Completed' : lesson.lessonProgress > 0 ? 'In Progress' : 'Not Started'
  })),
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
