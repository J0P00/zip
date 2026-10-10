import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Film,
  GraduationCap,
  LayoutGrid,
  Lock,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Terminal,
  Trophy
} from 'lucide-react';
import { AuthenticatedUser, PracticeSubmission } from '../types';
import { getStoredJson, setStoredJson, shuffleArray } from '../data/oopCourse';
import {
  gradeSwingSource,
  JAVA_SWING_ASSESSMENTS,
  JAVA_SWING_EXERCISES,
  JAVA_SWING_LESSONS,
  JAVA_SWING_VIDEOS,
  SWING_DRAFT_KEY,
  SWING_PASSING_PERCENTAGE,
  SWING_QUIZ_KEY,
  SWING_SUBMISSION_KEY,
  SWING_WATCH_KEY,
  SwingLesson,
  SwingLessonProgress,
  SwingProgressDb,
  SwingQuizAttempt,
  SwingQuizDb
} from '../data/javaSwingCourse';
import { CourseQuestion } from '../data/oopCourse';
import { swingApi } from '../services/api';

interface JavaSwingModuleProps {
  currentUser: AuthenticatedUser;
  oopUnlocked: boolean;
  studentResults?: any;
  onSubmitCompleted: (submission: PracticeSubmission) => void;
  onUnlocked?: () => void;
  theme?: 'light' | 'dark';
}

type SwingTab = 'lessons' | 'videos' | 'quiz' | 'practice' | 'progress';
type DraftDb = Record<string, string>;
type SubmissionDb = Record<string, PracticeSubmission>;
type SwingGradeResult = {
  compileStatus: PracticeSubmission['compileStatus'];
  score: number;
  runtime: number;
  memoryUsage: number | undefined;
  programOutput: string;
  errorMessage: string;
  testResults: PracticeSubmission['testResults'];
};

const QUIZ_HISTORY_KEY = 'oophub_swing_quiz_history';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const userKeyFor = (user: AuthenticatedUser) => user.id || user.userId || user.email;

const getLessonCompleted = (lessonId: string, progressDb: SwingProgressDb) =>
  Boolean(progressDb[lessonId]?.contentCompleted && progressDb[lessonId]?.videoCompleted);

export default function JavaSwingModule({ currentUser, oopUnlocked, studentResults, onSubmitCompleted, onUnlocked, theme }: JavaSwingModuleProps) {
  const isDark = theme === 'dark';
  const [isUnlocked, setIsUnlocked] = useState(oopUnlocked);
  const [activeTab, setActiveTab] = useState<SwingTab>('lessons');
  const [activeLessonId, setActiveLessonId] = useState(JAVA_SWING_LESSONS[0].id);
  const [progressDb, setProgressDb] = useState<SwingProgressDb>({});
  const [quizDb, setQuizDb] = useState<SwingQuizDb>({});
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>({});
  const [quizHistory, setQuizHistory] = useState<SwingQuizAttempt[]>(() => getStoredJson(QUIZ_HISTORY_KEY, []));
  const [draftDb, setDraftDb] = useState<DraftDb>(() => getStoredJson(SWING_DRAFT_KEY, {}));
  const [quizQuestions, setQuizQuestions] = useState<CourseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<'idle' | 'active' | 'result' | 'review'>('idle');
  const [latestAttempt, setLatestAttempt] = useState<SwingQuizAttempt | null>(null);
  const [notice, setNotice] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>(['Swing console ready. Run checks before final submission.']);
  const [lastResult, setLastResult] = useState<SwingGradeResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const swingVideoRef = useRef<HTMLVideoElement | null>(null);
  const swingVideoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swingVideoSaveInFlightRef = useRef(false);
  const pendingSwingVideoRef = useRef<{ lessonId: string; position: number; percentage: number; completed: boolean } | null>(null);
  const activeLesson = JAVA_SWING_LESSONS.find(lesson => lesson.id === activeLessonId) || JAVA_SWING_LESSONS[0];
  const activeAssessment = JAVA_SWING_ASSESSMENTS.find(item => item.lessonId === activeLesson.id) || JAVA_SWING_ASSESSMENTS[0];
  const activeExercise = JAVA_SWING_EXERCISES.find(item => item.lessonId === activeLesson.id) || JAVA_SWING_EXERCISES[0];
  const submissionKey = `${userKeyFor(currentUser)}:${activeExercise.id}`;
  const submitted = submissionDb[submissionKey];
  const [sourceCode, setSourceCode] = useState(() => submitted?.sourceCode || draftDb[submissionKey] || activeExercise.starterCode);

  useEffect(() => {
    const newProgDb: SwingProgressDb = {};
    const newQuizDb: SwingQuizDb = {};
    const newSubDb: SubmissionDb = {};
    if (studentResults?.swingTopics) {
      studentResults.swingTopics.forEach((topic: any) => {
        newProgDb[topic.id] = {
          lessonId: topic.id,
          contentCompleted: topic.contentCompleted,
          videoCompleted: topic.videoCompleted,
          videoPercentage: Number(topic.videoPercentage || 0),
          videoLastPosition: Number(topic.videoLastPosition || 0),
          completedAt: new Date().toISOString()
        };
        const assessmentId = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === topic.id)?.id || `swing_quiz_${topic.sequence}`;
        newQuizDb[assessmentId] = {
          assessmentId,
          lessonId: topic.id,
          score: Number(topic.quizScore || 0),
          total: Number(topic.quizTotal || 0),
          percentage: Number(topic.quizPercentage || 0),
          correctAnswers: Number(topic.quizScore || 0),
          incorrectAnswers: Math.max(0, Number(topic.quizTotal || 0) - Number(topic.quizScore || 0)),
          passed: topic.quizPassed,
           attemptNumber: Number(topic.quizAttemptCount || 0),
           attemptCount: Number(topic.quizAttemptCount || 0),
          answers: {},
          dateCompleted: new Date().toISOString()
        };
        if (Number(topic.quizAttemptCount || 0) <= 0) delete newQuizDb[assessmentId];
        const exercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === topic.id);
        if (exercise && topic.exerciseCompleted) {
          const key = `${userKeyFor(currentUser)}:${exercise.id}`;
          newSubDb[key] = {
            id: `sub_${Date.now()}`,
            studentId: currentUser.id || '',
            studentName: currentUser.name,
            studentEmail: currentUser.email,
            section: currentUser.section || 'Unassigned',
            challengeId: exercise.id,
            challengeTitle: exercise.title,
            topicId: topic.id,
            topicTitle: topic.title,
            sourceCode: exercise.starterCode,
            programOutput: '',
            compileStatus: 'success',
            runtime: 10,
            memoryUsage: 10,
            score: topic.submissionScore || exercise.passingScore,
            submittedAt: new Date().toISOString(),
            isLocked: true,
            errorMessage: '',
            testResults: []
          };
        }
      });
    }
    setProgressDb(newProgDb);
    setQuizDb(newQuizDb);
    setSubmissionDb(newSubDb);
  }, [studentResults, currentUser]);

  useEffect(() => {
    const unlocked = oopUnlocked;
    setIsUnlocked(unlocked);
    if (unlocked) {
      setNotice('Java Swing Programming unlocked. Welcome to the desktop UI track.');
      onUnlocked?.();
      const timer = window.setTimeout(() => setNotice(''), 4200);
      return () => window.clearTimeout(timer);
    }
  }, [oopUnlocked, onUnlocked]);

  useEffect(() => {
    setVideoError(false);
    setVideoAttempt(0);
  }, [activeLessonId]);

  useEffect(() => {
    const key = `${userKeyFor(currentUser)}:${activeExercise.id}`;
    setSourceCode(submissionDb[key]?.sourceCode || draftDb[key] || activeExercise.starterCode);
    setLastResult(submissionDb[key] ? {
      compileStatus: submissionDb[key].compileStatus,
      score: submissionDb[key].score,
      runtime: submissionDb[key].runtime,
      memoryUsage: submissionDb[key].memoryUsage ?? 0,
      programOutput: submissionDb[key].programOutput,
      errorMessage: submissionDb[key].errorMessage || '',
      testResults: submissionDb[key].testResults
    } : null);
    setConsoleLogs([submissionDb[key] ? 'Already submitted. Teacher review is available in the instructor portal.' : 'Swing console ready. Run checks before final submission.']);
  }, [activeExercise.id, currentUser.email, currentUser.id, currentUser.userId, draftDb, submissionDb]);

  const stats = useMemo(() => {
    if (!isUnlocked) {
      return { completedLessons: 0, passedQuizzes: 0, completedExercises: 0, overall: 0 };
    }
    const completedLessons = JAVA_SWING_LESSONS.filter(lesson => getLessonCompleted(lesson.id, progressDb)).length;
    const passedQuizzes = JAVA_SWING_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
    const completedExercises = JAVA_SWING_EXERCISES.filter(exercise => {
      const submission = submissionDb[`${userKeyFor(currentUser)}:${exercise.id}`];
      return Boolean(submission && submission.compileStatus === 'success' && submission.score >= exercise.passingScore);
    }).length;
    const overall = Math.round(((completedLessons + passedQuizzes + completedExercises) / 15) * 100);
    return { completedLessons, passedQuizzes, completedExercises, overall };
  }, [currentUser, isUnlocked, progressDb, quizDb, submissionDb]);

  const isCourseComplete = stats.completedLessons === 5 && stats.passedQuizzes === 5 && stats.completedExercises === 5;

  const getSwingLessonLockReason = (lesson: SwingLesson) => {
    if (!isUnlocked) return 'Complete all OOP lessons, assessments, and coding practice to unlock Java Swing.';
    const topic = studentResults?.swingTopics?.find((t: any) => t.id === lesson.id);
    if (topic && !topic.lessonUnlocked) return topic.accessReason || 'Locked.';
    return '';
  };

  const lessonLockReason = getSwingLessonLockReason(activeLesson);
  const topicDetails = studentResults?.swingTopics?.find((t: any) => t.id === activeLesson.id);
  const localProgress = progressDb[activeLesson.id];
  const videoPercentage = Math.max(Number(localProgress?.videoPercentage || 0), Number(topicDetails?.videoPercentage || 0));
  const videoCompleted = Boolean(localProgress?.videoCompleted || topicDetails?.videoCompleted) && videoPercentage >= 95;
  const assessmentPassed = Boolean(quizDb[activeAssessment.id]?.passed || topicDetails?.quizPassed);
  const quizLockedReason = lessonLockReason || (!videoCompleted ? 'Watch at least 95% of this Java Swing video before starting the assessment.' : '');
  const practiceLockedReason = quizLockedReason || (!assessmentPassed ? 'Pass this lesson quiz with 60% or higher to unlock programming practice.' : '');
  const passedRun = Boolean(lastResult && lastResult.score >= activeExercise.passingScore && lastResult.compileStatus === 'success');

  const selectLesson = (lesson: SwingLesson, nextTab: SwingTab = 'lessons') => {
    const reason = getSwingLessonLockReason(lesson);
    if (reason) {
      setNotice(reason);
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    setActiveLessonId(lesson.id);
    setQuizMode('idle');
    setActiveTab(nextTab);
  };

  const flushSwingVideoProgress = async () => {
    if (swingVideoSaveInFlightRef.current || !pendingSwingVideoRef.current) return;
    const pending = pendingSwingVideoRef.current;
    pendingSwingVideoRef.current = null;
    swingVideoSaveInFlightRef.current = true;
    try {
      await swingApi.updateProgress({
        lessonId: pending.lessonId,
        videoPercentage: pending.percentage,
        lastPosition: pending.position,
        videoCompleted: pending.completed
      });
      if (pending.completed) onSubmitCompleted({ id: 'swing_video_progress' } as any);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save video progress.');
    } finally {
      swingVideoSaveInFlightRef.current = false;
      if (pendingSwingVideoRef.current) void flushSwingVideoProgress();
    }
  };

  const persistSwingVideoProgress = (force = false) => {
    const video = swingVideoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const position = Math.min(video.duration, Math.max(0, video.currentTime));
    const percentage = Math.min(100, Math.round((position / video.duration) * 100));

    const current = progressDb[activeLesson.id] || { lessonId: activeLesson.id, contentCompleted: false, videoCompleted: false };
    const next: SwingLessonProgress = {
      ...current,
      lessonId: activeLesson.id,
      videoLastPosition: Math.max(current.videoLastPosition || 0, position),
      videoPercentage: Math.max(current.videoPercentage || 0, percentage),
      videoCompleted: Boolean(current.videoCompleted || percentage >= 95)
    };
    setProgressDb(previous => ({ ...previous, [activeLesson.id]: next }));
    pendingSwingVideoRef.current = {
      lessonId: activeLesson.id,
      position: next.videoLastPosition || position,
      percentage: next.videoPercentage || percentage,
      completed: Boolean(next.videoCompleted)
    };
    if (force) {
      if (swingVideoSaveTimerRef.current) clearTimeout(swingVideoSaveTimerRef.current);
      swingVideoSaveTimerRef.current = null;
      void flushSwingVideoProgress();
    } else if (!swingVideoSaveTimerRef.current) {
      swingVideoSaveTimerRef.current = setTimeout(() => {
        swingVideoSaveTimerRef.current = null;
        void flushSwingVideoProgress();
      }, 2000);
    }
  };

  useEffect(() => () => {
    if (swingVideoSaveTimerRef.current) clearTimeout(swingVideoSaveTimerRef.current);
    void flushSwingVideoProgress();
  }, [currentUser.id]);
  const markLessonComplete = async (field: 'contentCompleted' | 'videoCompleted') => {
    if (!isUnlocked) {
      setNotice('Complete all OOP lessons, assessments, and coding practice to unlock Java Swing.');
      return;
    }

    const current = progressDb[activeLesson.id] || { lessonId: activeLesson.id, contentCompleted: false, videoCompleted: false };
    const nextRecord: SwingLessonProgress = {
      ...current,
      [field]: true,
      completedAt: field === 'videoCompleted' && current.contentCompleted ? new Date().toISOString() : current.completedAt
    };
    setProgressDb({ ...progressDb, [activeLesson.id]: nextRecord });
    
    try {
      await swingApi.updateProgress(field === 'videoCompleted'
        ? {
            lessonId: activeLesson.id,
            videoPercentage: current.videoPercentage || 95,
            lastPosition: current.videoLastPosition || 0,
            videoCompleted: true
          }
        : { lessonId: activeLesson.id, contentCompleted: true });
      onSubmitCompleted({ id: 'dummy_progress' } as any);
    } catch (err) {}

    setNotice(field === 'videoCompleted' ? 'Video completion saved.' : 'Lesson content marked complete.');
    window.setTimeout(() => setNotice(''), 2400);
  };

  const startQuiz = () => {
    const attemptsUsed = quizDb[activeAssessment.id]?.attemptCount ?? quizDb[activeAssessment.id]?.attemptNumber ?? 0;
    if (attemptsUsed >= 3) {
      setNotice("You have used all 3 attempts for this quiz.");
      window.setTimeout(() => setNotice(""), 3200);
      return;
    }
    if (quizLockedReason) {
      setNotice(quizLockedReason);
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    const seed = Date.now();
    setQuizQuestions(shuffleArray(activeAssessment.questions, seed).slice(0, 15).map((question, index) => ({
      ...question,
      options: shuffleArray(question.options, seed + index + 1)
    })));
    setAnswers({});
    setQuizIndex(0);
    setLatestAttempt(null);
    setQuizMode('active');
    setActiveTab('quiz');
  };

  const submitQuiz = async () => {
    const attemptsUsed = quizDb[activeAssessment.id]?.attemptCount ?? quizDb[activeAssessment.id]?.attemptNumber ?? 0;
    if (attemptsUsed >= 3) {
      setNotice("You have used all 3 attempts for this quiz.");
      return;
    }
    let score = 0;
    quizQuestions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) score += 1;
    });
    const total = quizQuestions.length;
    const percentage = Math.round((score / total) * 100);
    const attempt: SwingQuizAttempt = {
      assessmentId: activeAssessment.id,
      lessonId: activeLesson.id,
      score,
      total,
      percentage,
      correctAnswers: score,
      incorrectAnswers: total - score,
      passed: percentage >= SWING_PASSING_PERCENTAGE,
      attemptNumber: (quizDb[activeAssessment.id]?.attemptNumber || 0) + 1,
      attemptCount: (quizDb[activeAssessment.id]?.attemptCount || quizDb[activeAssessment.id]?.attemptNumber || 0) + 1,
      answers,
      dateCompleted: new Date().toISOString()
    };
    
    try {
      const response = await swingApi.submitQuiz({
        assessmentId: activeAssessment.id,
        lessonId: activeLesson.id,
        score,
        total,
        percentage,
        correctAnswers: score,
        incorrectAnswers: total - score,
        passed: percentage >= SWING_PASSING_PERCENTAGE,
        answers,
        dateCompleted: attempt.dateCompleted
      });
      const persistedAttempt: SwingQuizAttempt = {
        ...attempt,
        attemptNumber: Number(response.data?.attemptNumber || attempt.attemptNumber),
        attemptCount: Number(response.data?.attemptCount || attempt.attemptCount || attempt.attemptNumber)
      };
      const nextDb = { ...quizDb, [activeAssessment.id]: persistedAttempt };
      const nextHistory = [persistedAttempt, ...quizHistory].slice(0, 100);
      setQuizDb(nextDb);
      setQuizHistory(nextHistory);
      setStoredJson(QUIZ_HISTORY_KEY, nextHistory);
      onSubmitCompleted({ id: 'dummy_quiz' } as any);
      setLatestAttempt(persistedAttempt);
      setQuizMode("result");
      setNotice(persistedAttempt.passed ? "Quiz passed. Programming practice is now unlocked." : "Quiz saved. You can retake until you reach 60%.");
      window.setTimeout(() => setNotice(""), 3600);
    } catch (err: any) {
      setNotice(err?.message || "Unable to save this quiz attempt.");
      return;

    }
  };

  const updateSource = (value: string) => {
    setSourceCode(value);
    const next = { ...draftDb, [submissionKey]: value };
    setDraftDb(next);
    setStoredJson(SWING_DRAFT_KEY, next);
  };

  const runCode = () => {
    if (practiceLockedReason) {
      setNotice(practiceLockedReason);
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    setIsRunning(true);
    setConsoleLogs(['javac Main.java', 'Checking Swing structure and required components...']);
    window.setTimeout(() => {
      const result = gradeSwingSource(activeExercise, sourceCode);
      setLastResult(result);
      setConsoleLogs([
        result.compileStatus === 'failed' ? 'Compilation failed.' : 'Compilation succeeded.',
        result.errorMessage || 'All required Swing checks passed.',
        `Score preview: ${result.score}%`,
        `Runtime: ${result.runtime} ms`,
        `Output: ${result.programOutput || '(none)'}`
      ]);
      setIsRunning(false);
    }, 500);
  };

  const resetCode = () => {
    if (submitted) return;
    updateSource(activeExercise.starterCode);
    setLastResult(null);
    setConsoleLogs(['Editor reset to starter code.']);
  };

  const submitCode = () => {
    if (practiceLockedReason || submitted) {
      setNotice(practiceLockedReason || 'This exercise has already been submitted.');
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    setIsSubmitting(true);
    const result = gradeSwingSource(activeExercise, sourceCode);
    const now = new Date().toISOString();
    const submission: PracticeSubmission = {
      id: `swing_sub_${Date.now()}`,
      studentId: userKeyFor(currentUser),
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      section: currentUser.section || 'Unassigned',
      challengeId: activeExercise.id,
      challengeTitle: activeExercise.title,
      topicId: activeExercise.topicId,
      topicTitle: `Java Swing Lesson ${activeLesson.sequence}`,
      sourceCode,
      programOutput: result.programOutput,
      compileStatus: result.compileStatus,
      runtime: result.runtime,
      memoryUsage: result.memoryUsage,
      score: result.score,
      submittedAt: now,
      isLocked: true,
      errorMessage: result.errorMessage,
      testResults: result.testResults
    };
    
    swingApi.submitCode({
      challengeId: activeExercise.id,
      challengeTitle: activeExercise.title,
      topicId: activeLesson.id,
      topicTitle: `Java Swing Lesson ${activeLesson.sequence}`,
      sourceCode,
      programOutput: result.programOutput,
      compileStatus: result.compileStatus,
      runtime: result.runtime,
      memoryUsage: result.memoryUsage,
      score: result.score,
      errorMessage: result.errorMessage,
      testResults: result.testResults
    }).then(() => {
      const next = { ...submissionDb, [submissionKey]: submission };
      setSubmissionDb(next);
      setLastResult(result);
      setConsoleLogs(['Final Swing submission saved.', `Score: ${result.score}%`, `Submitted: ${formatDateTime(now)}`]);
      onSubmitCompleted(submission);
      setNotice('Programming exercise submitted for teacher review.');
      setIsSubmitting(false);
      window.setTimeout(() => setNotice(''), 3200);
    }).catch(() => {
      setNotice('Failed to submit. Try again.');
      setIsSubmitting(false);
    });
  };

  const renderLocked = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Java Swing Programming Locked</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
        Complete all OOP lessons, assessments, and coding practice to unlock Java Swing.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-100 bg-slate-50 p-4 text-left text-xs font-bold text-slate-600">
        Required before unlock: every OOP video, assessment, and required coding practice activity must be complete.
      </div>
    </div>
  );

  const renderLesson = () => (
    <div className="grid gap-5 lg:grid-cols-12">
      <aside className="space-y-3 lg:col-span-3">
        {JAVA_SWING_LESSONS.map(lesson => {
          const reason = getSwingLessonLockReason(lesson);
          const current = lesson.id === activeLesson.id;
          const done = getLessonCompleted(lesson.id, progressDb);
          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => selectLesson(lesson)}
              className={`w-full rounded-xl border p-3 text-left transition ${current ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-emerald-200'} ${reason ? 'opacity-65' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {lesson.sequence}</span>
                {reason ? <Lock className="h-4 w-4 text-slate-400" /> : done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <BookOpen className="h-4 w-4 text-emerald-600" />}
              </div>
              <h3 className="mt-1 text-xs font-extrabold text-slate-900">{lesson.title}</h3>
              {reason && <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">{reason}</p>}
            </button>
          );
        })}
      </aside>

      <section className="space-y-5 lg:col-span-9">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Java Swing Programming</span>
              <h2 className="mt-3 text-2xl font-extrabold text-slate-900">{activeLesson.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{activeLesson.introduction}</p>
            </div>
            <button
              type="button"
              disabled={Boolean(lessonLockReason) || progressDb[activeLesson.id]?.contentCompleted}
              onClick={() => markLessonComplete('contentCompleted')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300"
            >
              {progressDb[activeLesson.id]?.contentCompleted ? 'Content Complete' : 'Mark Content Complete'}
            </button>
          </div>
        </article>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><GraduationCap className="h-4 w-4 text-emerald-600" /> Learning Objectives</h3>
            <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
              {activeLesson.objectives.map(item => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />{item}</li>)}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><LayoutGrid className="h-4 w-4 text-emerald-600" /> Topic Map</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeLesson.topics.map(topic => <span key={topic} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-600">{topic}</span>)}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900">Lesson Content</h3>
          <div className="mt-3 space-y-3 text-sm font-semibold leading-7 text-slate-600">
            {activeLesson.content.map(item => <p key={item}>{item}</p>)}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-slate-900">Diagram</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {activeLesson.diagram.map((node, index) => (
              <div key={node.label} className="relative rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <span className="font-mono text-[10px] font-black text-emerald-700">0{index + 1}</span>
                <h4 className="mt-1 text-xs font-extrabold text-slate-900">{node.label}</h4>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{node.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-white">Code Example</h3>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-xs leading-6 text-emerald-200">{activeLesson.codeExample}</pre>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900">Best Practices</h3>
              <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
                {activeLesson.bestPractices.map(item => <li key={item}>- {item}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900">Summary</h3>
              <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">{activeLesson.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeLesson.keyTakeaways.map(item => <span key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{item}</span>)}
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );

  const renderVideos = () => (
    <section className="space-y-5 animate-fade-in">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">Course Syllabus</span>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900">Java Swing Fundamentals</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Five Java Swing video lessons covering windows, controls, events, layouts, and dialogs.</p>
          </div>
          <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 lg:w-56">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Overall Progress</span>
              <span className="font-mono text-emerald-700">{Math.round((JAVA_SWING_LESSONS.filter(lesson => progressDb[lesson.id]?.videoCompleted).length / JAVA_SWING_LESSONS.length) * 100)}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(JAVA_SWING_LESSONS.filter(lesson => progressDb[lesson.id]?.videoCompleted).length / JAVA_SWING_LESSONS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
            <div className="aspect-video bg-black">
              {(() => {
                const video = JAVA_SWING_VIDEOS.find(item => item.lessonId === activeLesson.id) || JAVA_SWING_VIDEOS[0];
                return video.embedUrl.endsWith('.mp4') ? (
                  <video
                    key={video.id + '-' + videoAttempt}
                    ref={swingVideoRef}
                    src={video.embedUrl}
                    controls
                    className="h-full w-full object-contain"
                    onLoadedMetadata={() => {
                      setVideoError(false);
                      const saved = progressDb[activeLesson.id]?.videoLastPosition || 0;
                      if (swingVideoRef.current && saved > 0 && saved < swingVideoRef.current.duration) {
                        swingVideoRef.current.currentTime = saved;
                      }
                    }}
                    onTimeUpdate={() => persistSwingVideoProgress(false)}
                    onPause={() => persistSwingVideoProgress(true)}
                    onEnded={() => persistSwingVideoProgress(true)}
                    onError={() => setVideoError(true)}
                  />
                ) : (
                  <iframe src={video.embedUrl} title={video.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                );
              })()}
            </div>
            <div className="border-t border-slate-800 bg-white p-5">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {activeLesson.sequence}</span>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">{activeLesson.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{activeLesson.introduction}</p>
                </div>
                <button type="button" disabled={Boolean(lessonLockReason) || videoCompleted || videoError} onClick={() => markLessonComplete('videoCompleted')} className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto">
                  {progressDb[activeLesson.id]?.videoCompleted ? 'Video Complete' : 'Mark Video Complete'}
                </button>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {activeLesson.topics.slice(0, 4).map(topic => (
                  <div key={topic} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-tight text-slate-900"><BookOpen className="h-4 w-4 text-emerald-600" /> Lesson Queue</h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">5 Lessons</span>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {JAVA_SWING_LESSONS.map(lesson => {
                const reason = getSwingLessonLockReason(lesson);
                const isActive = lesson.id === activeLesson.id;
                const completed = progressDb[lesson.id]?.videoCompleted;
                const statusLabel = reason ? 'Locked' : completed ? 'Complete' : 'Ready';
                return (
                  <button key={lesson.id} type="button" onClick={() => selectLesson(lesson, 'videos')} className={`w-full rounded-2xl border p-3 text-left transition-all ${isActive ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'} ${reason ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2"><span className="inline-flex min-w-[2.2rem] items-center justify-center rounded-md bg-slate-100 px-1.5 py-1 font-mono text-[10px] font-black uppercase text-slate-700">{lesson.sequence}</span><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Java Swing</span></div>
                        <h4 className="truncate text-sm font-extrabold text-slate-900">{lesson.title}</h4>
                      </div>
                      <div className="flex shrink-0 items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${reason ? 'bg-slate-100 text-slate-500' : completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{statusLabel}</span>{reason ? <Lock className="h-4 w-4 text-slate-400" /> : completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Play className="h-4 w-4 text-slate-500" />}</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500"><span>{JAVA_SWING_VIDEOS.find(video => video.lessonId === lesson.id)?.duration}</span><span>{reason ? 'Unavailable' : completed ? '100% watched' : 'Not started'}</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: completed ? '100%' : '0%' }} /></div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-xs font-semibold leading-6 text-slate-500 shadow-sm backdrop-blur-md">
            <h3 className="mb-2 text-sm font-extrabold text-slate-900">Unlock Rule</h3>
            Complete the current video and lesson content before moving to the next Java Swing lesson. Pass the quiz to unlock its programming exercise.
          </div>
        </aside>
      </div>
    </section>
  );

  const renderQuiz = () => {
    const currentQuestion = quizQuestions[quizIndex];
    if (quizMode === 'active' && currentQuestion) {
      return (
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
            <span className="font-mono text-[10px] font-black uppercase text-slate-400">{activeAssessment.title}</span>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Question {quizIndex + 1} of {quizQuestions.length}</h2>
            <p className="mt-5 text-sm font-bold leading-7 text-slate-800">{currentQuestion.question}</p>
            <div className="mt-5 space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold ${answers[currentQuestion.id] === option ? 'border-emerald-600 bg-emerald-50 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">{['A', 'B', 'C', 'D'][index]}</span>
                  {option}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-slate-100 pt-5">
              <button type="button" disabled={quizIndex === 0} onClick={() => setQuizIndex(value => value - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:opacity-40">Previous</button>
              {quizIndex === quizQuestions.length - 1 ? (
                <button type="button" onClick={submitQuiz} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white">Submit Quiz</button>
              ) : (
                <button type="button" onClick={() => setQuizIndex(value => value + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">Next</button>
              )}
            </div>
          </div>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
            <h3 className="text-sm font-extrabold text-slate-900">Question Map</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {quizQuestions.map((question, index) => (
                <button key={question.id} type="button" onClick={() => setQuizIndex(index)} className={`h-8 w-8 rounded-lg text-[10px] font-black ${quizIndex === index ? 'bg-emerald-600 text-white' : answers[question.id] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{index + 1}</button>
              ))}
            </div>
          </aside>
        </section>
      );
    }

    if ((quizMode === 'result' || quizMode === 'review') && latestAttempt) {
      return (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${latestAttempt.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {latestAttempt.passed ? <CheckCircle2 className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{latestAttempt.passed ? 'Swing Quiz Passed' : 'Retake Recommended'}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Score: {latestAttempt.score}/{latestAttempt.total} ({latestAttempt.percentage}%). Passing score is {SWING_PASSING_PERCENTAGE}%.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" onClick={() => setQuizMode('review')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Review Answers</button>
               {(latestAttempt.attemptCount ?? latestAttempt.attemptNumber) < 3 && <button type="button" onClick={startQuiz} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"><RotateCcw className="h-4 w-4" /> Retake</button>}
              {latestAttempt.passed ? <button type="button" onClick={() => setActiveTab('practice')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Open Practice</button> : <button type="button" onClick={() => setActiveTab('videos')} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white">Return to Tutorial</button>}
            </div>
          </div>
          {quizMode === 'review' && quizQuestions.map((question, index) => {
            const selected = latestAttempt.answers[question.id];
            const correct = selected === question.correctAnswer;
            return (
              <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-extrabold leading-6 text-slate-900">{index + 1}. {question.question}</h3>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{correct ? 'Correct' : 'Incorrect'}</span>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-600">Your answer: {selected || 'No answer'}</p>
                <p className="mt-1 text-xs font-bold text-emerald-700">Correct answer: {question.correctAnswer}</p>
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">{question.explanation}</p>
              </article>
            );
          })}
        </section>
      );
    }

    return (
      <section className="grid gap-5 lg:grid-cols-3">
        {JAVA_SWING_ASSESSMENTS.map(assessment => {
          const lesson = JAVA_SWING_LESSONS.find(item => item.id === assessment.lessonId);
          const attempt = quizDb[assessment.id];
          const selected = activeAssessment.id === assessment.id;
          return (
            <article key={assessment.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${selected ? 'border-emerald-300' : 'border-slate-200'}`}>
              <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {lesson?.sequence}</span>
              <h3 className="mt-2 text-sm font-extrabold text-slate-900">{assessment.title}</h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">15 randomized MCQs from the full question bank. Maximum 3 attempts. Passing score: {SWING_PASSING_PERCENTAGE}%.</p>
              {attempt && <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-black ${attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>Latest: {attempt.percentage}% - Attempt {attempt.attemptNumber} of 3 - {Math.max(0, 3 - (attempt.attemptCount ?? attempt.attemptNumber))} remaining</p>}
              <button type="button" disabled={(attempt?.attemptCount ?? attempt?.attemptNumber ?? 0) >= 3} onClick={() => { if (lesson) setActiveLessonId(lesson.id); window.setTimeout(startQuiz, 0); }} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Start Quiz</button>
            </article>
          );
        })}
      </section>
    );
  };

  const renderPractice = () => (
    <div className="grid gap-5 lg:grid-cols-12">
      <aside className="space-y-3 lg:col-span-3">
        {JAVA_SWING_EXERCISES.map(exercise => {
          const lesson = JAVA_SWING_LESSONS.find(item => item.id === exercise.lessonId);
          const done = Boolean(submissionDb[`${userKeyFor(currentUser)}:${exercise.id}`]);
          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() => { if (lesson) setActiveLessonId(lesson.id); }}
              className={`w-full rounded-xl border p-3 text-left text-xs transition ${exercise.id === activeExercise.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <span className="font-mono text-[10px] font-black uppercase text-slate-400">Exercise {lesson?.sequence}</span>
              <h3 className="mt-1 font-extrabold text-slate-900">{exercise.title}</h3>
              <span className={`mt-2 inline-flex rounded px-2 py-1 text-[9px] font-black uppercase ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{done ? 'Submitted' : 'Pending'}</span>
            </button>
          );
        })}
      </aside>
      <main className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm lg:col-span-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-slate-200">Main.java</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Auto-save</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={resetCode} disabled={Boolean(submitted)} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-300 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
            <button type="button" onClick={runCode} disabled={isRunning || isSubmitting || Boolean(practiceLockedReason)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-900 disabled:opacity-40"><Play className="h-3.5 w-3.5 text-emerald-600" /> {isRunning ? 'Running' : 'Run'}</button>
          </div>
        </div>
        <textarea
          value={sourceCode}
          onChange={event => updateSource(event.target.value)}
          disabled={Boolean(practiceLockedReason) || Boolean(submitted)}
          spellCheck={false}
          className="h-[520px] w-full resize-none bg-slate-950 p-5 font-mono text-xs leading-6 text-emerald-100 outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </main>
      <aside className="space-y-4 lg:col-span-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-black uppercase text-emerald-600">Lesson {activeLesson.sequence}</span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900">{activeExercise.title}</h2>
            </div>
            {practiceLockedReason ? <Lock className="h-5 w-5 text-slate-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{activeExercise.description}</p>
          {practiceLockedReason && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800"><AlertCircle className="mb-1 h-4 w-4" />{practiceLockedReason}</div>}
          <ul className="mt-4 space-y-1.5 text-xs font-semibold leading-5 text-slate-600">
            {activeExercise.requirements.map(item => <li key={item}>- {item}</li>)}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase text-slate-400"><Terminal className="h-3.5 w-3.5" /> Console</span>
            {lastResult && <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300">{lastResult.score}%</span>}
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-[11px] leading-5 text-slate-300">
            {consoleLogs.map((line, index) => <pre key={`${line}-${index}`} className="whitespace-pre-wrap">{line}</pre>)}
          </div>
          <button
            type="button"
            onClick={submitCode}
            disabled={Boolean(practiceLockedReason) || Boolean(submitted) || isRunning || isSubmitting}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${passedRun || !lastResult ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <Send className="h-4 w-4" /> {submitted ? 'Already Submitted' : isSubmitting ? 'Submitting' : 'Submit Final Solution'}
          </button>
        </section>
      </aside>
    </div>
  );

  const renderProgress = () => (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Progress Tracking</span>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900">Java Swing Progress</h2>
          </div>
          {isCourseComplete && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"><Trophy className="h-4 w-4" /> Java Swing Completion Badge</span>}
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${stats.overall}%` }} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Overall Completion', `${stats.overall}%`],
          ['Lessons Complete', `${stats.completedLessons}/5`],
          ['Quiz Scores', `${stats.passedQuizzes}/5 passed`],
          ['Programming Progress', `${stats.completedExercises}/5 submitted`]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
            <strong className="mt-2 block text-xl font-extrabold text-slate-900">{value}</strong>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900">Quiz History</h3>
        <div className="mt-3 space-y-2">
          {quizHistory.length ? quizHistory.slice(0, 8).map(attempt => (
            <div key={`${attempt.assessmentId}-${attempt.attemptNumber}-${attempt.dateCompleted}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold text-slate-600">
              <span>{JAVA_SWING_ASSESSMENTS.find(item => item.id === attempt.assessmentId)?.title}</span>
              <span>{attempt.score}/{attempt.total} ({attempt.percentage}%) - Attempt {attempt.attemptNumber}</span>
              <span>{formatDateTime(attempt.dateCompleted)}</span>
            </div>
          )) : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">No Java Swing quiz attempts yet.</p>}
        </div>
      </div>
    </section>
  );

  return (
    <div className={`space-y-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="java-swing-module">
      {notice && (
        <div className="animate-fade-in rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm">
          <Sparkles className="mr-2 inline h-4 w-4" />
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
              New Learning Lesson
            </span>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Java Swing Programming</h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Desktop GUI lessons unlock after full OOP mastery, then progress through videos, quizzes, and programming submissions.
            </p>
          </div>
          <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 lg:w-72">
            <div className="flex justify-between text-xs font-black text-slate-700">
              <span>Overall Swing Progress</span>
              <span className="font-mono text-emerald-700">{stats.overall}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${stats.overall}%` }} />
            </div>
          </div>
        </div>
      </section>

      {!isUnlocked ? renderLocked() : (
        <>
          <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {[
              ['lessons', 'Lessons', BookOpen],
              ['videos', 'Videos', Film],
              ['quiz', 'Quiz', Award],
              ['practice', 'Practice', Code2],
              ['progress', 'Progress', Trophy]
            ].map(([id, label, Icon]) => {
              const TabIcon = Icon as typeof BookOpen;
              return (
                <button
                  key={id as string}
                  type="button"
                  onClick={() => setActiveTab(id as SwingTab)}
                  className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${activeTab === id ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                >
                  <TabIcon className="h-4 w-4" />
                  {label as string}
                </button>
              );
            })}
          </nav>

          {activeTab === 'lessons' && renderLesson()}
          {activeTab === 'videos' && renderVideos()}
          {activeTab === 'quiz' && renderQuiz()}
          {activeTab === 'practice' && renderPractice()}
          {activeTab === 'progress' && renderProgress()}
        </>
      )}
    </div>
  );
}
