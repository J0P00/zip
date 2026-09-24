import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AlertCircle, Award, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Lock, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { AdaptiveRecommendation, AssessmentReviewQuestion, AssessmentSessionData, AssessmentSessionQuestion, AuthenticatedUser, StudentSubView, VideoLesson } from '../types';
import { OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from '../data/oopCourse';
import { assessmentApi, practiceApi, progressApi } from '../services/api';
import RecommendationCard from './RecommendationCard';
import SecureWatermark from './SecureWatermark';

interface AssessmentsProps {
  currentUser: AuthenticatedUser;
  onCorrectAnswerAdded: (xp: number, attempt: QuizAttempt) => void;
  onNavigateTo?: (view: StudentSubView) => void;
  lessons: VideoLesson[];
  activeRecommendation?: AdaptiveRecommendation | null;
}

interface WatchRecord {
  lessonId: string;
  lastPosition: number;
  completionPercentage: number;
  completed: boolean;
  dateCompleted?: string;
}

interface QuizAttempt {
  assessmentId: string;
  lessonId: string;
  score: number;
  total: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  passed: boolean;
  attemptNumber: number;
  answers: Record<string, string>;
  dateCompleted: string;
}

type WatchDb = Record<string, WatchRecord>;
type QuizDb = Record<string, QuizAttempt>;
type SubmissionDb = Record<string, { score?: number; compileStatus?: string }>;

const PASSING_PERCENTAGE = 80;

const getAssessmentLockedReason = (lessonId: string, watchDb: WatchDb, quizDb: QuizDb, submissionDb: SubmissionDb, studentKey: string) => {
  const lesson = OOP_COURSE_LESSONS.find(item => item.id === lessonId);
  if (!lesson) return 'Lesson unavailable';

  if (lesson.sequence > 1) {
    const previous = OOP_COURSE_LESSONS.find(item => item.sequence === lesson.sequence - 1);
    const previousAssessment = previous ? OOP_ASSESSMENTS.find(item => item.lessonId === previous.id) : undefined;
    if (previous && !watchDb[previous.id]?.completed) return `Complete Lesson ${previous.sequence} video first.`;
    if (previousAssessment && !quizDb[previousAssessment.id]?.passed) return `Pass Assessment ${lesson.sequence - 1} first.`;
  }

  if (!watchDb[lessonId]?.completed) return 'Watch at least 95% of this lesson video first.';
  return '';
};

export default function Assessments({ currentUser, onCorrectAnswerAdded, onNavigateTo, activeRecommendation }: AssessmentsProps) {
  const [watchDb, setWatchDb] = useState<WatchDb>({});
  const [quizDb, setQuizDb] = useState<QuizDb>({});
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>({});
  const studentKey = currentUser.id || currentUser.userId || currentUser.email;

  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<AssessmentSessionData | null>(null);
  const [questions, setQuestions] = useState<AssessmentSessionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<'dashboard' | 'active' | 'result' | 'review'>('dashboard');
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<AssessmentReviewQuestion[]>([]);

  // Security state
  const [violationCount, setViolationCount] = useState(0);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(1200);

  const activeAssessment = OOP_ASSESSMENTS.find(item => item.id === activeAssessmentId) || null;
  const activeLesson = activeAssessment ? OOP_COURSE_LESSONS.find(item => item.id === activeAssessment.lessonId) : null;
  const currentQuestion = questions[currentIndex];

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const sessionDataRef = useRef(sessionData);
  sessionDataRef.current = sessionData;

  // Initial progress sync
  useEffect(() => {
    let isMounted = true;
    const token = currentUser.token;
    const user = currentUser.id;
    if (!token || !user) return;

    Promise.all([
      progressApi.getVideoProgress(user, token),
      progressApi.getQuizAttempts(user, token),
      practiceApi.listMine()
    ])
      .then(([videoResponse, response, submissions]) => {
        if (!isMounted) return;
        setWatchDb(
          videoResponse.data.reduce((acc: WatchDb, row: any) => ({
            ...acc,
            [row.video_id]: {
              lessonId: row.video_id,
              lastPosition: Number(row.last_position || 0),
              completionPercentage: Number(row.completion_percentage || 0),
              completed: Boolean(row.completed)
            }
          }), {})
        );
        const remoteDb = response.data.reduce((acc: QuizDb, row: any) => {
          acc[row.assessment_id] = {
            assessmentId: row.assessment_id,
            lessonId: row.lesson_id || '',
            score: row.score,
            total: row.total,
            percentage: Number(row.percentage || 0),
            correctAnswers: row.correct_answers,
            incorrectAnswers: row.incorrect_answers,
            passed: Boolean(row.passed),
            attemptNumber: row.attempt_number,
            answers: row.answers || {},
            dateCompleted: row.date_completed
          };
          return acc;
        }, {});
        setQuizDb(remoteDb);
        setSubmissionDb(
          submissions.data.reduce((acc: SubmissionDb, row: any) => ({
            ...acc,
            [`${user}:${row.challenge_id}`]: {
              score: Number(row.score || 0),
              compileStatus: row.compile_status
            }
          }), {})
        );
      })
      .catch(error => console.warn('Unable to load assessment attempts from backend:', error));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, currentUser.token]);

  // Check for active uncompleted session on mount
  useEffect(() => {
    let isMounted = true;
    if (OOP_ASSESSMENTS.length > 0 && view === 'dashboard') {
      const firstAvailable = OOP_ASSESSMENTS.find(a => !getAssessmentLockedReason(a.lessonId, watchDb, quizDb, submissionDb, studentKey));
      if (firstAvailable) {
        assessmentApi.getActiveSession(firstAvailable.id).then(res => {
          if (!isMounted || !res.data) return;
          const activeSess = res.data;
          setActiveAssessmentId(activeSess.assessmentId);
          setSessionData(activeSess);
          setQuestions(activeSess.questions);
          setAnswers(activeSess.savedAnswers || {});
          setViolationCount(activeSess.violationCount);
          setRemainingTime(activeSess.remainingSeconds);
          setView('active');
        }).catch(() => {});
      }
    }
    return () => { isMounted = false; };
  }, [quizDb, submissionDb, watchDb, studentKey, view]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (view !== 'active' || !sessionData) return;

    const timer = setInterval(() => {
      const expiresMs = new Date(sessionData.expiresAt).getTime();
      const left = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setRemainingTime(left);

      if (left <= 0) {
        clearInterval(timer);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [view, sessionData]);

  // Log security event helper
  const recordSecurityEvent = useCallback(async (eventType: string, metadata: Record<string, any> = {}) => {
    const active = sessionDataRef.current;
    if (!active || view !== 'active') return;

    try {
      const res = await assessmentApi.logEvent(active.sessionId, {
        eventType,
        metadata: { ...metadata, timestamp: new Date().toISOString() },
        answers: answersRef.current
      });
      setViolationCount(res.violationCount);

      if (res.violationCount === 1) {
        setSecurityWarning('Warning: Leaving the assessment page has been recorded.');
      } else {
        setSecurityWarning(`Warning ${res.violationCount} of ${res.threshold || 3}: Repeatedly leaving the assessment may invalidate this attempt.`);
      }

      setTimeout(() => setSecurityWarning(null), 6000);
    } catch (err) {
      console.warn('Unable to log security event:', err);
    }
  }, [view]);

  // Tab switch & window blur / focus detection
  useEffect(() => {
    if (view !== 'active' || !sessionData) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordSecurityEvent('TAB_SWITCH', { detail: 'Tab switched or browser minimized' });
      } else {
        recordSecurityEvent('PAGE_RETURN', { detail: 'Returned to assessment tab' });
      }
    };

    const handleWindowBlur = () => {
      recordSecurityEvent('WINDOW_BLUR', { detail: 'Window lost focus' });
    };

    const handleWindowFocus = () => {
      recordSecurityEvent('WINDOW_FOCUS', { detail: 'Window regained focus' });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'You have an assessment in progress. Leaving now may record a security event.';
      return event.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [view, sessionData, recordSecurityEvent]);

  // Scoped copy/paste/cut/contextmenu interception for protected assessment interface
  const handleProtectedContainerKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const type = e.key.toLowerCase() === 'c' ? 'COPY_ATTEMPT'
        : e.key.toLowerCase() === 'v' ? 'PASTE_ATTEMPT'
        : e.key.toLowerCase() === 'x' ? 'CUT_ATTEMPT'
        : 'SELECT_ALL_ATTEMPT';
      recordSecurityEvent(type, { key: e.key });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    recordSecurityEvent('CONTEXT_MENU_ATTEMPT', { x: e.clientX, y: e.clientY });
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    e.preventDefault();
    recordSecurityEvent('COPY_ATTEMPT', { action: 'clipboard_copy' });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    recordSecurityEvent('PASTE_ATTEMPT', { action: 'clipboard_paste' });
  };

  const handleCut = (e: React.ClipboardEvent) => {
    e.preventDefault();
    recordSecurityEvent('CUT_ATTEMPT', { action: 'clipboard_cut' });
  };

  const courseStats = useMemo(() => {
    const completedLessons = OOP_COURSE_LESSONS.filter(lesson => watchDb[lesson.id]?.completed).length;
    const passedAssessments = OOP_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
    return {
      completedLessons,
      lockedLessons: OOP_COURSE_LESSONS.length - completedLessons,
      passedAssessments,
      overall: Math.round(((completedLessons + passedAssessments) / (OOP_COURSE_LESSONS.length * 2)) * 100)
    };
  }, [watchDb, quizDb]);

  const startAssessment = async (assessmentId: string) => {
    const assessment = OOP_ASSESSMENTS.find(item => item.id === assessmentId);
    if (!assessment) return;
    const reason = getAssessmentLockedReason(assessment.lessonId, watchDb, quizDb, submissionDb, studentKey);
    if (reason) return;

    setSessionError(null);
    try {
      const response = await assessmentApi.startSession({
        assessmentId: assessment.id,
        lessonId: assessment.lessonId
      });

      const sess = response.data;
      setActiveAssessmentId(assessment.id);
      setSessionData(sess);
      setQuestions(sess.questions);
      setCurrentIndex(0);
      setAnswers(sess.savedAnswers || {});
      setViolationCount(sess.violationCount);
      setRemainingTime(sess.remainingSeconds);
      setLatestAttempt(null);
      setReviewQuestions([]);
      setView('active');
    } catch (err: any) {
      setSessionError(err.message || 'Unable to start assessment session.');
    }
  };

  const handleAnswerSelect = (option: string) => {
    if (!currentQuestion) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: option };
    setAnswers(nextAnswers);

    // Sync in-progress answers to server periodically or with event
    if (sessionData) {
      assessmentApi.logEvent(sessionData.sessionId, {
        eventType: 'ANSWER_UPDATE',
        metadata: { questionId: currentQuestion.id },
        answers: nextAnswers
      }).catch(() => {});
    }
  };

  const submitAssessment = async () => {
    if (!sessionData) return;
    setIsSubmitting(true);

    try {
      const result = await assessmentApi.submitSession(sessionData.sessionId, {
        answers
      });

      const attempt: QuizAttempt = {
        assessmentId: sessionData.assessmentId,
        lessonId: sessionData.lessonId,
        score: result.data.score,
        total: result.data.total,
        percentage: result.data.percentage,
        correctAnswers: result.data.correctAnswers,
        incorrectAnswers: result.data.incorrectAnswers,
        passed: result.data.passed,
        attemptNumber: result.data.attempt?.attempt_number || sessionData.attemptNumber,
        answers,
        dateCompleted: new Date().toISOString()
      };

      const nextDb = { ...quizDb, [sessionData.assessmentId]: attempt };
      setQuizDb(nextDb);
      setLatestAttempt(attempt);
      setReviewQuestions(result.data.review || []);
      setView('result');

      onCorrectAnswerAdded(attempt.passed ? 150 : 0, attempt);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to submit assessment to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    if (sessionData && view === 'active' && !isSubmitting) {
      submitAssessment();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in" id="oop-assessments-dashboard">
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                Secure Assessment Mode
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Clock className="h-3 w-3" /> 20 min timer
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">Lesson Assessments</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Each attempt delivers 15 server-randomized MCQs with authoritative grading, secure countdown timer, and cheating deterrence. Passing score is 80%.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              ['Progress', `${courseStats.overall}%`],
              ['Completed', `${courseStats.completedLessons}/${OOP_COURSE_LESSONS.length}`],
              ['Locked', `${courseStats.lockedLessons}`],
              ['Passed', `${courseStats.passedAssessments}/${OOP_ASSESSMENTS.length}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
                <span className="mt-1 block font-mono text-lg font-black text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sessionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="mb-1 inline h-4 w-4 mr-1 text-rose-600" />
          {sessionError}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-4">
        {OOP_ASSESSMENTS.map(assessment => {
          const lesson = OOP_COURSE_LESSONS.find(item => item.id === assessment.lessonId);
          const reason = getAssessmentLockedReason(assessment.lessonId, watchDb, quizDb, submissionDb, studentKey);
          const attempt = quizDb[assessment.id];
          const passed = attempt?.passed;

          return (
            <article key={assessment.id} className={`rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900 ${reason ? 'border-slate-200 opacity-75 dark:border-slate-800' : 'border-emerald-200 dark:border-emerald-800/60'}`}>
              <div className="flex min-h-[190px] flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {lesson?.sequence}</span>
                    {reason ? <Lock className="h-4 w-4 text-slate-400" /> : passed ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Award className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">{assessment.title}</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    15 randomized MCQs with server validation.
                  </p>
                  {attempt && (
                    <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-black ${attempt.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'}`}>
                      Latest: {attempt.score}/{attempt.total} ({attempt.percentage}%) - Attempt {attempt.attemptNumber}
                    </p>
                  )}
                  {reason && <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400">{reason}</p>}
                </div>
                <button
                  disabled={Boolean(reason)}
                  onClick={() => startAssessment(assessment.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-800"
                >
                  {attempt?.passed ? 'Retake Assessment' : 'Start Secure Assessment'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderActive = () => {
    if (!activeAssessment || !currentQuestion || !sessionData) return null;
    const selected = answers[currentQuestion.id];
    const answeredCount = Object.keys(answers).length;

    return (
      <div
        className="relative grid gap-6 lg:grid-cols-12 animate-fade-in"
        id="oop-assessment-active"
        onKeyDown={handleProtectedContainerKeyDown}
        onContextMenu={handleContextMenu}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCut={handleCut}
      >
        {/* Dynamic Traceable Watermark */}
        <SecureWatermark
          studentIdentifier={currentUser.studentNumber || currentUser.userId || currentUser.name}
          activityIdentifier={activeAssessment.title}
          sessionIdentifier={sessionData.sessionId}
        />

        {/* Security Warning Toast */}
        {securityWarning && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 animate-bounce">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{securityWarning}</span>
          </div>
        )}

        <section
          className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8 dark:border-slate-800 dark:bg-slate-900 select-none"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] font-black uppercase text-slate-400">{activeAssessment.title}</span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Question {currentIndex + 1} of {questions.length}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-black ${remainingTime <= 180 ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>{formatTimer(remainingTime)}</span>
                </div>
                <span className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{currentQuestion.difficulty || 'Medium'}</span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm font-bold leading-7 text-slate-800 dark:text-slate-200">{currentQuestion.question}</p>
          {currentQuestion.codeSnippet && (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-sky-300">{currentQuestion.codeSnippet}</pre>
          )}

          <div className="mt-5 space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selected === option;
              const letter = ['A', 'B', 'C', 'D'][index] || `${index + 1}`;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition cursor-pointer ${isSelected ? 'border-emerald-600 bg-emerald-50/60 text-slate-950 dark:bg-emerald-950/40 dark:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{letter}</span>
                  <span className={option.includes('\n') || option.includes(';') || option.includes('{') ? "font-mono text-xs whitespace-pre-wrap leading-relaxed" : ""}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(value => value - 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            {currentIndex === questions.length - 1 ? (
              <button
                disabled={isSubmitting}
                onClick={submitAssessment}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Grading Answers...' : 'Submit Assessment'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(value => value + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 dark:border-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Question Navigator</h3>
              {violationCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-black text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {violationCount} security events
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-8 w-8 rounded-lg text-[10px] font-black cursor-pointer transition ${index === currentIndex ? 'bg-emerald-600 text-white' : answers[question.id] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-400">{answeredCount} of {questions.length} answered</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Assessment Security Protocol</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Tab switches and focus loss are logged authoritatively.</li>
              <li>Timer runs server-side and continues across page refreshes.</li>
              <li>Answers are graded server-side upon final submission.</li>
            </ul>
          </div>
        </aside>
      </div>
    );
  };

  const renderResult = () => {
    if (!activeAssessment || !latestAttempt || !activeLesson) return null;

    return (
      <div className="mx-auto max-w-3xl space-y-5 animate-scale-in" id="oop-assessment-result">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${latestAttempt.passed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400'}`}>
            {latestAttempt.passed ? <CheckCircle className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">{latestAttempt.passed ? 'Assessment Passed' : 'Assessment Not Passed'}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {latestAttempt.passed ? `Lesson ${activeLesson.sequence + 1} and Practice IDE are unlocked.` : `Score is below the 80% passing threshold. Rewatch ${activeLesson.title}, then retake the assessment.`}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-100 py-5 dark:border-slate-800">
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Score</span><strong className="font-mono text-xl dark:text-white">{latestAttempt.score}/{latestAttempt.total}</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Percentage</span><strong className="font-mono text-xl dark:text-white">{latestAttempt.percentage}%</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Attempt</span><strong className="font-mono text-xl dark:text-white">{latestAttempt.attemptNumber}</strong></div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {reviewQuestions.length > 0 && (
              <button onClick={() => setView('review')} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
                Review Answers
              </button>
            )}
            <button onClick={() => startAssessment(activeAssessment.id)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <RotateCcw className="h-4 w-4" /> Retake Assessment
            </button>
            <button onClick={() => { setView('dashboard'); onNavigateTo?.('videos'); }} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer">
              Continue Learning
            </button>
          </div>
        </section>
        <RecommendationCard recommendation={activeRecommendation || null} onNavigateTo={onNavigateTo} />
      </div>
    );
  };

  const renderReview = () => {
    if (!activeAssessment || !latestAttempt) return null;

    return (
      <div className="mx-auto max-w-4xl space-y-5 animate-fade-in" id="oop-assessment-review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] font-black uppercase text-slate-400">{activeAssessment.title}</span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Authoritative Assessment Review</h2>
          </div>
          <button onClick={() => setView('result')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
            Back to Result
          </button>
        </div>
        {reviewQuestions.map((question, index) => {
          const selected = question.selectedAnswer;
          const isCorrect = question.isCorrect;

          return (
            <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-extrabold leading-6 text-slate-900 dark:text-white">{index + 1}. {question.question}</h3>
                <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'}`}>
                  {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              {question.codeSnippet && <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-sky-300 font-mono">{question.codeSnippet}</pre>}
              <div className="mt-4 space-y-2">
                {question.options.map(option => {
                  const correct = option === question.correctAnswer;
                  const chosen = option === selected;
                  return (
                    <div key={option} className={`rounded-xl border px-4 py-3 text-xs font-bold ${correct ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : chosen ? 'border-orange-300 bg-orange-50/50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-200' : 'border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}>
                      {option}
                    </div>
                  );
                })}
              </div>
              {question.explanation && (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <strong>Explanation:</strong> {question.explanation}
                </p>
              )}
              <p className="mt-2 font-mono text-[10px] font-black uppercase text-slate-400">Difficulty: {question.difficulty || 'Medium'}</p>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full" id="assessments-workspace">
      {view === 'dashboard' && renderDashboard()}
      {view === 'active' && renderActive()}
      {view === 'result' && renderResult()}
      {view === 'review' && renderReview()}
    </div>
  );
}
