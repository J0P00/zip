import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  BookOpen,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { AuthenticatedUser, StudentSubView } from '../types';
import { preTestApi } from '../services/api';

interface PreTestAssessmentProps {
  currentUser: AuthenticatedUser;
  onFinish?: () => void;
  onNavigateTo?: (view: StudentSubView) => void;
  theme?: 'light' | 'dark';
}

interface PreTestQuestionItem {
  id: string;
  topic?: string;
  topicName?: string;
  question: string;
  options: string[];
  codeSnippet?: string;
  correctAnswer?: string;
  explanation?: string;
}

const PRE_TEST_TIME_LIMIT_SECONDS = 10 * 60;

export default function PreTestAssessment({
  currentUser,
  onFinish,
  onNavigateTo,
  theme = 'light'
}: PreTestAssessmentProps) {
  const isDark = theme === 'dark';
  const [viewState, setViewState] = useState<'intro' | 'active' | 'review_map' | 'result'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attempt data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PreTestQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [passingScore, setPassingScore] = useState(70);
  const [remainingSeconds, setRemainingSeconds] = useState(PRE_TEST_TIME_LIMIT_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Results
  const [resultData, setResultData] = useState<{
    score: number;
    percentage: number;
    passed: boolean;
    totalQuestions: number;
    correctCount: number;
    insights?: any;
    review: Array<{
      id: string;
      topic: string;
      question: string;
      options: string[];
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string;
    }>;
  } | null>(null);

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const currentQuestion = questions[currentIndex];

  // Ref to hold handleSubmitPreTest for stable timer trigger
  const handleSubmitRef = useRef<() => void>(() => {});

  // Check for active session on mount
  useEffect(() => {
    let isMounted = true;
    const checkActive = async () => {
      try {
        const activeRes = await preTestApi.getActive();
        const data = activeRes.data;
        if (isMounted && data && Array.isArray(data.questions) && data.questions.length > 0) {
          setSessionId(data.sessionId || null);
          setQuestions(data.questions);
          setAttemptNumber(data.attemptNumber || 1);
          if (data.remainingSeconds !== undefined && data.remainingSeconds !== null) {
            setRemainingSeconds(Math.max(0, Number(data.remainingSeconds)));
          }
          if (data.savedAnswers && typeof data.savedAnswers === 'object') {
            setAnswers(data.savedAnswers);
          }
          setViewState('active');
        }
      } catch {
        // No active session or backend offline
      }
    };
    checkActive();
    return () => {
      isMounted = false;
    };
  }, []);

  // Timer countdown: only decrement and clamp to 0
  useEffect(() => {
    if (viewState !== 'active') return;
    const timer = setInterval(() => {
      setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState]);

  // Separate effect to trigger auto-submit on 0 seconds
  useEffect(() => {
    if (viewState === 'active' && remainingSeconds === 0 && !isSubmitting) {
      handleSubmitRef.current();
    }
  }, [viewState, remainingSeconds, isSubmitting]);

  const handleStartPreTest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await preTestApi.start({ studentId: currentUser.id });
      const data = res.data;
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setSessionId(data.sessionId || null);
        setQuestions(data.questions);
        setAttemptNumber(data.attemptNumber || 1);
        if (data.remainingSeconds !== undefined && data.remainingSeconds !== null) {
          setRemainingSeconds(Math.max(0, Number(data.remainingSeconds)));
        } else {
          setRemainingSeconds(PRE_TEST_TIME_LIMIT_SECONDS);
        }
        setCurrentIndex(0);
        setAnswers(data.savedAnswers || {});
        setViewState('active');
      } else {
        throw new Error('No questions returned from pre-test service.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start pre-test. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (option: string) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  const handleSubmitPreTest = async () => {
    setIsSubmitting(true);
    setError(null);
    setShowConfirmModal(false);

    try {
      const res = await preTestApi.submit({
        sessionId: sessionId || undefined,
        answers,
        timeSpentSeconds: Math.max(0, PRE_TEST_TIME_LIMIT_SECONDS - remainingSeconds)
      });
      const data = res.data;
      if (data) {
        setResultData({
          score: data.score,
          percentage: data.percentage,
          passed: data.passed,
          totalQuestions: data.total || 20,
          correctCount: data.score,
          insights: data.insights || null,
          review: (data.review || []).map((r: any) => ({
            id: r.id,
            topic: r.topicName || r.topic || 'OOP Concept',
            question: r.question,
            options: r.options,
            selectedAnswer: r.selectedAnswer || '',
            correctAnswer: r.correctAnswer || '',
            isCorrect: Boolean(r.isCorrect),
            explanation: r.explanation || ''
          }))
        });
        setViewState('result');
      } else {
        throw new Error('Pre-test grading failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit pre-test. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  handleSubmitRef.current = handleSubmitPreTest;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. INTRO / START SCREEN
  if (viewState === 'intro') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-6">
        <div className={`rounded-3xl border p-8 shadow-sm ${cardClass}`}>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ClipboardCheck className="h-3.5 w-3.5 inline mr-1" />
              Prior-Knowledge Assessment
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-500">
              Randomized Pool: 240 Questions
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Java OOP Diagnostic Pre-Test
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Welcome to the OOP Pedagogical Hub Pre-Test! This diagnostic assessment evaluates your baseline knowledge across 12 fundamental Object-Oriented Programming concepts in Java before starting the course.
          </p>

          {/* Key Guidelines */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Question Delivery</span>
              <strong className="mt-1 block font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                20 Questions
              </strong>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Randomly selected without replacement from the 240-question Java OOP question bank.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Time Allocation</span>
              <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
                10 Minutes
              </strong>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                A server-synchronized countdown timer ensures authentic diagnostic conditions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Prior-Knowledge Rule</span>
              <strong className="mt-1 block font-mono text-xl font-black text-sky-600 dark:text-sky-400">
                Non-Blocking
              </strong>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your pre-test score establishes baseline data and does <strong>NOT</strong> lock Lesson 1 or any subsequent lesson.
              </p>
            </div>
          </div>

          {/* Non-Blocking Callout Banner */}
          <div className="mt-6 rounded-2xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/30 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 dark:text-sky-200">
              <strong className="font-black block">Pedagogical Assurance:</strong>
              This pre-test measures prior knowledge. Even if you answer zero questions correctly, Lesson 1 remains completely unlocked and accessible immediately after submission.
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t pt-6 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigateTo ? onNavigateTo('dashboard') : onFinish && onFinish()}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleStartPreTest}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Random 20 Questions...
                </>
              ) : (
                <>
                  Start Diagnostic Pre-Test
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE TEST EXPERIENCE
  if (viewState === 'active' && currentQuestion) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-4">
        {/* Progress & Timer Header */}
        <div className={`rounded-2xl border p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${cardClass}`}>
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-500">
              {currentQuestion.topic || currentQuestion.topicName || 'OOP Concept'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setViewState('review_map')}
              className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition cursor-pointer"
            >
              Review Map ({answeredCount}/{questions.length} answered)
            </button>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1 font-mono text-xs font-black text-slate-900 dark:text-white">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              {formatTimer(remainingSeconds)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${cardClass}`}>
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-black leading-relaxed text-slate-900 dark:text-white">
              {currentQuestion.question}
            </h2>

            {currentQuestion.codeSnippet && (
              <pre className="rounded-xl bg-slate-950 text-slate-100 p-4 text-xs font-mono overflow-x-auto border border-slate-800">
                <code>{currentQuestion.codeSnippet}</code>
              </pre>
            )}

            {/* Answer Choices */}
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full rounded-2xl border p-4 text-left text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100 font-bold shadow-sm ring-2 ring-emerald-500/20'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t pt-5 dark:border-slate-800">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewState('review_map')}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Review All
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
                >
                  Submit Pre-Test
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitPreTest}
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Grading...' : 'Retry Submit'}
            </button>
          </div>
        )}

        {/* 20 Question Mini-Pills Navigator */}
        <div className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
            Question Navigator ({answeredCount}/20 answered)
          </span>
          <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
            {questions.map((q, i) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id || i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-8 rounded-lg font-mono text-xs font-black transition cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* SUBMIT CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
              <div className="flex items-center gap-3 text-indigo-600 mb-3">
                <ClipboardCheck className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Submit Pre-Test?</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You have answered <strong>{answeredCount} of {questions.length}</strong> questions.
                {answeredCount < questions.length && (
                  <span className="block mt-2 text-amber-600 font-bold">
                    Warning: You still have {questions.length - answeredCount} unanswered questions. Unanswered questions are scored as 0.
                  </span>
                )}
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Review Questions
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitPreTest}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Grading Answers...' : 'Confirm Submission'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. REVIEW MAP SCREEN (Full question jump view before submission)
  if (viewState === 'review_map') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-6">
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Pre-Test Question Review Map
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verify all 20 question responses before final grading. Click any question to return to it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewState('active')}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Resume Test
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              return (
                <div
                  key={q.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setViewState('active');
                  }}
                  className={`rounded-xl border p-3.5 transition cursor-pointer flex items-start justify-between gap-3 ${
                    selected
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-slate-400">
                        #{idx + 1}
                      </span>
                      <span className="rounded bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        {q.topic}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {q.question}
                    </p>
                    <span className="text-[11px] text-slate-500 truncate block max-w-xs">
                      {selected ? `Selected: ${selected}` : '— Unanswered —'}
                    </span>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      selected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {selected ? 'Answered' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-5 dark:border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              {answeredCount} of {questions.length} questions completed
            </span>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
            >
              Submit Pre-Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. RESULTS & PEDAGOGICAL REVIEW SCREEN
  if (viewState === 'result' && resultData) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-6">
        {/* Results Banner */}
        <div className={`rounded-3xl border p-8 shadow-sm ${cardClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Diagnostic Pre-Test Completed
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase ${
                    resultData.passed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {resultData.passed ? 'Benchmark Met' : 'Prior-Knowledge Baseline'}
                </span>
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Pre-Test Assessment Results
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Your answers have been graded against the authoritative Java OOP question bank. This establishes your diagnostic baseline for the course.
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Your Score</span>
              <strong className="font-mono text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {resultData.percentage}%
              </strong>
              <span className="text-xs text-slate-400 block font-mono">
                {resultData.correctCount} / {resultData.totalQuestions} Correct
              </span>
            </div>
          </div>

          {/* Non-Blocking Callout */}
          <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="font-black block">Lesson 1 is Unlocked & Ready:</strong>
              As guaranteed by the diagnostic pre-test policy, you can proceed directly to Lesson 1: Introduction to Classes & Objects regardless of your pre-test score.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigateTo ? onNavigateTo('videos') : onFinish && onFinish()}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
            >
              Proceed to Lesson 1 Videos
            </button>
            <button
              type="button"
              onClick={() => onNavigateTo ? onNavigateTo('dashboard') : onFinish && onFinish()}
              className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>

        {/* Diagnostic Topic Performance & Insights */}
        {resultData.insights && (
          <div className={`rounded-3xl border p-6 sm:p-8 shadow-sm space-y-6 ${cardClass}`}>
            <div>
              <span className="font-mono text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                Diagnostic Analysis
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
                Your Topic Strengths & Personalized Recommendations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Based on your submitted answers, here is your foundational skill breakdown across the Java OOP curriculum.
              </p>
            </div>

            {/* Strengths & Weaknesses 2-Column Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      Demonstrated Strengths (≥80%)
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white">
                    {resultData.insights.strengths?.length || 0} Topics
                  </span>
                </div>
                {(!resultData.insights.strengths || resultData.insights.strengths.length === 0) ? (
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                    No topics reached 80% on this diagnostic attempt. You'll build these concepts in the course!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {resultData.insights.strengths.map((topic: any) => (
                      <div key={topic.topicId} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl px-3 py-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">#{topic.sequence} {topic.topicName}</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{topic.accuracyPercentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Areas to Improve */}
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="text-xs font-black text-rose-950 dark:text-rose-200">
                      Prioritized for Review (&lt;60%)
                    </h3>
                  </div>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black text-white">
                    {resultData.insights.weaknesses?.length || 0} Topics
                  </span>
                </div>
                {(!resultData.insights.weaknesses || resultData.insights.weaknesses.length === 0) ? (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                    🎉 Excellent! No topics scored below 60%.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {resultData.insights.weaknesses.map((topic: any) => (
                      <div key={topic.topicId} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/60 rounded-xl px-3 py-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">#{topic.sequence} {topic.topicName}</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{topic.incorrectAnswers} missed ({topic.accuracyPercentage}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Personalized Recommendations */}
            {resultData.insights.recommendations && resultData.insights.recommendations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                  Targeted Learning Recommendations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {resultData.insights.recommendations.slice(0, 4).map((rec: any) => (
                    <div key={rec.topicId} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-black text-slate-400">
                            Lesson {rec.lessonSequence}: {rec.topicName}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            rec.priority === 'High' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          }`}>
                            {rec.priority} Priority
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {rec.actionText}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                          {rec.missedQuestionCount} missed
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateTo ? onNavigateTo('videos') : onFinish && onFinish()}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <span>Go to Lesson</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Question Review List */}
        <div className={`rounded-3xl border p-6 sm:p-8 shadow-sm ${cardClass}`}>
          <h2 className="text-base font-black text-slate-900 dark:text-white mb-4">
            Pedagogical Question Review (20 Questions)
          </h2>

          <div className="space-y-4">
            {resultData.review.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  item.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                        item.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {item.isCorrect ? '✓' : '✕'}
                    </span>
                    <span className="font-mono text-xs font-black text-slate-400">
                      Question #{idx + 1}
                    </span>
                  </div>
                  <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {item.topic}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {item.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Your Answer:</span>
                    <strong className={item.isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                      {item.selectedAnswer || '(Unanswered)'}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 p-2.5 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Correct Answer:</span>
                    <strong className="text-emerald-800 dark:text-emerald-200">
                      {item.correctAnswer}
                    </strong>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-[11px] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <strong className="text-emerald-600 dark:text-emerald-400 font-black">Pedagogical Rationale: </strong>
                  {item.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
