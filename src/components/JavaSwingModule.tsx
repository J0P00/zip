import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  ExternalLink,
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
  getSwingStorageKeys,
  gradeSwingSource,
  isOopCourseComplete,
  JAVA_SWING_ASSESSMENTS,
  JAVA_SWING_EXERCISES,
  JAVA_SWING_LESSONS,
  JAVA_SWING_VIDEOS,
  SWING_PASSING_PERCENTAGE,
  SwingLesson,
  SwingLessonProgress,
  SwingProgressDb,
  SwingQuizAttempt,
  SwingQuizDb
} from '../data/javaSwingCourse';
import { CourseQuestion } from '../data/oopCourse';

interface JavaSwingModuleProps {
  currentUser: AuthenticatedUser;
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

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const userKeyFor = (user: AuthenticatedUser) => user.id || user.userId || user.email;

const getLessonCompleted = (lessonId: string, progressDb: SwingProgressDb) =>
  Boolean(progressDb[lessonId]?.contentCompleted && progressDb[lessonId]?.videoCompleted);

export default function JavaSwingModule({ currentUser, onSubmitCompleted, onUnlocked, theme }: JavaSwingModuleProps) {
  const isDark = theme === 'dark';
  const swingKeys = useMemo(() => getSwingStorageKeys(currentUser), [currentUser.email, currentUser.id, currentUser.userId]);
  const [isUnlocked, setIsUnlocked] = useState(() => isOopCourseComplete(currentUser));
  const [activeTab, setActiveTab] = useState<SwingTab>('lessons');
  const [activeLessonId, setActiveLessonId] = useState(JAVA_SWING_LESSONS[0].id);
  const [progressDb, setProgressDb] = useState<SwingProgressDb>(() => getStoredJson(swingKeys.watch, {}));
  const [quizDb, setQuizDb] = useState<SwingQuizDb>(() => getStoredJson(swingKeys.quiz, {}));
  const [quizHistory, setQuizHistory] = useState<SwingQuizAttempt[]>(() => getStoredJson(swingKeys.quizHistory, []));
  const [draftDb, setDraftDb] = useState<DraftDb>(() => getStoredJson(swingKeys.draft, {}));
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>(() => getStoredJson(swingKeys.submission, {}));
  const [quizQuestions, setQuizQuestions] = useState<CourseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<'idle' | 'active' | 'result' | 'review'>('idle');
  const [latestAttempt, setLatestAttempt] = useState<SwingQuizAttempt | null>(null);
  const [notice, setNotice] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string[]>(['Swing console ready. Run checks before final submission.']);
  const [lastResult, setLastResult] = useState<ReturnType<typeof gradeSwingSource> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeLesson = JAVA_SWING_LESSONS.find(lesson => lesson.id === activeLessonId) || JAVA_SWING_LESSONS[0];
  const activeAssessment = JAVA_SWING_ASSESSMENTS.find(item => item.lessonId === activeLesson.id) || JAVA_SWING_ASSESSMENTS[0];
  const activeExercise = JAVA_SWING_EXERCISES.find(item => item.lessonId === activeLesson.id) || JAVA_SWING_EXERCISES[0];
  const submissionKey = `${userKeyFor(currentUser)}:${activeExercise.id}`;
  const submitted = submissionDb[submissionKey];
  const [sourceCode, setSourceCode] = useState(() => submitted?.sourceCode || draftDb[submissionKey] || activeExercise.starterCode);

  useEffect(() => {
    const unlocked = isOopCourseComplete(currentUser);
    setIsUnlocked(unlocked);
    if (unlocked) {
      setNotice('Java Swing Programming unlocked. Welcome to the desktop UI track.');
      onUnlocked?.();
      const timer = window.setTimeout(() => setNotice(''), 4200);
      return () => window.clearTimeout(timer);
    }
  }, [onUnlocked]);

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
    const completedLessons = JAVA_SWING_LESSONS.filter(lesson => getLessonCompleted(lesson.id, progressDb)).length;
    const passedQuizzes = JAVA_SWING_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
    const completedExercises = JAVA_SWING_EXERCISES.filter(exercise =>
      Boolean(submissionDb[`${userKeyFor(currentUser)}:${exercise.id}`])
    ).length;
    const overall = Math.round(((completedLessons + passedQuizzes + completedExercises) / 15) * 100);
    return { completedLessons, passedQuizzes, completedExercises, overall };
  }, [currentUser, progressDb, quizDb, submissionDb]);

  const isCourseComplete = stats.completedLessons === 5 && stats.passedQuizzes === 5 && stats.completedExercises === 5;

  const getSwingLessonLockReason = (lesson: SwingLesson) => {
    if (!isUnlocked) return 'Complete all OOP lessons to unlock Java Swing.';
    if (lesson.sequence === 1) return '';
    const previous = JAVA_SWING_LESSONS.find(item => item.sequence === lesson.sequence - 1);
    if (!previous) return '';
    const previousAssessment = JAVA_SWING_ASSESSMENTS.find(item => item.lessonId === previous.id);
    const previousExercise = JAVA_SWING_EXERCISES.find(item => item.lessonId === previous.id);
    if (!getLessonCompleted(previous.id, progressDb)) return `Complete Java Swing Lesson ${previous.sequence} content and video first.`;
    if (previousAssessment && !quizDb[previousAssessment.id]?.passed) return `Pass Java Swing Quiz ${previous.sequence} first.`;
    if (previousExercise && !submissionDb[`${userKeyFor(currentUser)}:${previousExercise.id}`]) return `Submit Java Swing Exercise ${previous.sequence} first.`;
    return '';
  };

  const lessonLockReason = getSwingLessonLockReason(activeLesson);
  const quizLockedReason = lessonLockReason || (!getLessonCompleted(activeLesson.id, progressDb) ? 'Mark lesson content and video complete before starting the quiz.' : '');
  const practiceLockedReason = quizLockedReason || (!quizDb[activeAssessment.id]?.passed ? 'Pass this lesson quiz with 80% or higher to unlock programming practice.' : '');
  const passedRun = Boolean(lastResult && lastResult.score >= activeExercise.passingScore && lastResult.compileStatus === 'success');

  const selectLesson = (lesson: SwingLesson) => {
    const reason = getSwingLessonLockReason(lesson);
    if (reason) {
      setNotice(reason);
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    setActiveLessonId(lesson.id);
    setQuizMode('idle');
    setActiveTab('lessons');
  };

  const markLessonComplete = (field: 'contentCompleted' | 'videoCompleted') => {
    const current = progressDb[activeLesson.id] || { lessonId: activeLesson.id, contentCompleted: false, videoCompleted: false };
    const nextRecord: SwingLessonProgress = {
      ...current,
      [field]: true,
      completedAt: field === 'videoCompleted' && current.contentCompleted ? new Date().toISOString() : current.completedAt
    };
    const next = { ...progressDb, [activeLesson.id]: nextRecord };
    setProgressDb(next);
    setStoredJson(swingKeys.watch, next);
    setNotice(field === 'videoCompleted' ? 'Video completion saved.' : 'Lesson content marked complete.');
    window.setTimeout(() => setNotice(''), 2400);
  };

  const startQuiz = () => {
    if (quizLockedReason) {
      setNotice(quizLockedReason);
      window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    const seed = Date.now();
    setQuizQuestions(shuffleArray(activeAssessment.questions, seed).map((question, index) => ({
      ...question,
      options: shuffleArray(question.options, seed + index + 1)
    })));
    setAnswers({});
    setQuizIndex(0);
    setLatestAttempt(null);
    setQuizMode('active');
    setActiveTab('quiz');
  };

  const submitQuiz = () => {
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
      answers,
      dateCompleted: new Date().toISOString()
    };
    const nextDb = { ...quizDb, [activeAssessment.id]: attempt };
    const nextHistory = [attempt, ...quizHistory].slice(0, 100);
    setQuizDb(nextDb);
    setQuizHistory(nextHistory);
    setStoredJson(swingKeys.quiz, nextDb);
    setStoredJson(swingKeys.quizHistory, nextHistory);
    setLatestAttempt(attempt);
    setQuizMode('result');
    setNotice(attempt.passed ? 'Quiz passed. Programming practice is now unlocked.' : 'Quiz saved. You can retake until you reach 80%.');
    window.setTimeout(() => setNotice(''), 3600);
  };

  const updateSource = (value: string) => {
    setSourceCode(value);
    const next = { ...draftDb, [submissionKey]: value };
    setDraftDb(next);
    setStoredJson(swingKeys.draft, next);
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
    window.setTimeout(() => {
      const next = { ...submissionDb, [submissionKey]: submission };
      setSubmissionDb(next);
      setStoredJson(swingKeys.submission, next);
      setLastResult(result);
      setConsoleLogs(['Final Swing submission saved.', `Score: ${result.score}%`, `Submitted: ${formatDateTime(now)}`]);
      onSubmitCompleted(submission);
      setNotice('Programming exercise submitted for teacher review.');
      setIsSubmitting(false);
      window.setTimeout(() => setNotice(''), 3200);
    }, 450);
  };

  const renderLocked = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Lock className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Java Swing Programming Locked</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
        Complete all OOP lessons to unlock Java Swing.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-100 bg-slate-50 p-4 text-left text-xs font-bold text-slate-600">
        Required before unlock: every OOP video completed and every required OOP assessment passed.
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
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Recommended Java Swing Videos</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Watch the embedded tutorials, then mark the active lesson video complete.</p>
          </div>
          <button
            type="button"
            disabled={Boolean(lessonLockReason) || progressDb[activeLesson.id]?.videoCompleted}
            onClick={() => markLessonComplete('videoCompleted')}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300"
          >
            {progressDb[activeLesson.id]?.videoCompleted ? 'Video Complete' : 'Mark Active Video Complete'}
          </button>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {JAVA_SWING_VIDEOS.map(video => (
          <article key={video.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-video bg-slate-950">
              {video.embedUrl.endsWith('.mp4') ? (
                <video
                  src={video.embedUrl}
                  controls
                  className="h-full w-full"
                />
              ) : (
                <iframe
                  src={video.embedUrl}
                  title={video.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-900">{video.title}</h3>
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-black text-slate-500">{video.duration}</span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{video.description}</p>
              {!video.embedUrl.endsWith('.mp4') && (
                <a href={video.embedUrl.replace('/embed/', '/watch?v=')} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                  Open on YouTube <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </article>
        ))}
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
              <button type="button" onClick={startQuiz} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"><RotateCcw className="h-4 w-4" /> Retake</button>
              {latestAttempt.passed && <button type="button" onClick={() => setActiveTab('practice')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Open Practice</button>}
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
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">10 randomized MCQs. Unlimited retakes. Passing score: 80%.</p>
              {attempt && <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-black ${attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>Latest: {attempt.percentage}% - Attempt {attempt.attemptNumber}</p>}
              <button type="button" onClick={() => { if (lesson) setActiveLessonId(lesson.id); window.setTimeout(startQuiz, 0); }} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Start Quiz</button>
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
              New Learning Module
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
