import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  Award,
  Info,
  ClipboardCheck,
  ChevronRight,
  Code2,
  Calendar,
  Layers,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { AuthenticatedUser, PreTestInsights, StudentSubView } from '../types';
import { preTestApi } from '../services/api';

interface DiagnosticResultsPageProps {
  currentUser: AuthenticatedUser;
  onNavigateTo: (view: StudentSubView) => void;
  onSelectLesson?: (lessonId: string) => void;
  theme?: 'light' | 'dark';
}

// Canonical pedagogical metadata matching curriculum
const TOPIC_CONCEPT_GUIDANCE: Record<string, { concepts: string[]; advice: string }> = {
  oop_lesson_1: {
    concepts: ['Class blueprint', 'Object instance', 'State and behavior'],
    advice: 'Demonstrates a good understanding of object creation and class blueprints.'
  },
  oop_lesson_2: {
    concepts: ['Object initialization', 'Constructor parameters', 'Default constructors'],
    advice: 'Answers constructor-related questions and object initialization correctly.'
  },
  oop_lesson_3: {
    concepts: ['Object methods', 'Parameters and return types', 'Instance field manipulation'],
    advice: 'Review how to declare and invoke object methods, pass parameters, and manage return types.'
  },
  oop_lesson_4: {
    concepts: ['Data hiding', 'Private fields', 'Getters and setters'],
    advice: 'Review access modifiers, private fields, and writing robust getter and setter validation methods.'
  },
  oop_lesson_5: {
    concepts: ['Multiple constructors', 'Parameter signatures', 'this() constructor chaining'],
    advice: 'Review defining multiple constructors with differing parameter lists and constructor chaining.'
  },
  oop_lesson_6: {
    concepts: ['Parent-child relationships', 'extends keyword', 'super keyword', 'Code reuse'],
    advice: 'Practice the use of extends and super, and understand parent-child class relationships.'
  },
  oop_lesson_7: {
    concepts: ['Method overriding', 'Dynamic method dispatch', 'Polymorphic references'],
    advice: 'Review dynamic method dispatch, method overriding, and runtime polymorphism.'
  },
  oop_lesson_8: {
    concepts: ['abstract keyword', 'Abstract methods', 'Subclass implementation obligations'],
    advice: 'Review declaring abstract classes and methods, preventing direct instantiation, and subclass contracts.'
  },
  oop_lesson_9: {
    concepts: ['Interface contracts', 'implements keyword', 'Separating specification from implementation'],
    advice: 'Review interface contracts, separating specification from implementation, and multiple interface support.'
  },
  oop_lesson_10: {
    concepts: ['Multiple interfaces', 'Constants in interfaces', 'Polymorphic reference'],
    advice: 'Review implementing multiple interfaces, default methods, and polymorphic references.'
  },
  oop_lesson_11: {
    concepts: ['Object reference arrays', 'Element instantiation', 'Array traversal'],
    advice: 'Review declaring arrays of object references, initializing each array element, and iterating object collections.'
  },
  oop_lesson_12: {
    concepts: ['Type-safe constants', 'enum keyword', 'Switch statements with enums'],
    advice: 'Review Java enums for fixed constant sets, type safety, and switch statement integration.'
  }
};

export default function DiagnosticResultsPage({
  currentUser,
  onNavigateTo,
  onSelectLesson,
  theme = 'light'
}: DiagnosticResultsPageProps) {
  const isDark = theme === 'dark';
  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<PreTestInsights | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [activeSessionRemaining, setActiveSessionRemaining] = useState<number | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);

  const fetchDiagnosticData = useCallback(async (attemptNum?: number) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user insights
      const insightsRes = await preTestApi.getMyInsights(attemptNum);
      if (insightsRes && insightsRes.success) {
        setHasCompleted(Boolean(insightsRes.hasCompletedPreTest));
        setInsights(insightsRes.data);
        if (insightsRes.data?.attemptNumber) {
          setSelectedAttempt(insightsRes.data.attemptNumber);
        }
      } else {
        setHasCompleted(false);
        setInsights(null);
      }

      // 2. Check if student has an incomplete active session
      try {
        const activeRes = await preTestApi.getActive();
        if (activeRes && activeRes.success && activeRes.data) {
          setHasActiveSession(true);
          setActiveSessionRemaining(activeRes.data.remainingSeconds ?? null);
        } else {
          setHasActiveSession(false);
        }
      } catch {
        setHasActiveSession(false);
      }
    } catch (err: any) {
      console.error('Failed to load diagnostic results:', err);
      setError(err?.message || 'Unable to load diagnostic results. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnosticData();
  }, [fetchDiagnosticData]);

  const handleAttemptChange = (attemptNum: number) => {
    setSelectedAttempt(attemptNum);
    fetchDiagnosticData(attemptNum);
  };

  const handleLessonAction = (lessonId: string) => {
    try {
      localStorage.setItem('selected_lesson_id', lessonId);
    } catch {
      // ignore storage error
    }
    if (onSelectLesson) {
      onSelectLesson(lessonId);
    }
    onNavigateTo('lessons');
  };

  // 1. LOADING STATE
  if (loading && !insights) {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto py-6 px-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-96 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (error && !insights) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-black text-rose-950 dark:text-rose-100">
            Diagnostic Results Unavailable
          </h2>
          <p className="mt-2 text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => fetchDiagnosticData(selectedAttempt || undefined)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              type="button"
              onClick={() => onNavigateTo('dashboard')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. EMPTY STATE (Pre-test not taken yet)
  if (!hasCompleted || !insights) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-8 px-4" id="diagnostic-empty-container">
        {/* Page Header */}
        <div className="border-b pb-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
              Diagnostic Analytics
            </span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Diagnostic Results
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Understand your current Java OOP knowledge, identify your strengths, and discover which concepts need more practice.
          </p>
        </div>

        {/* Active Session in Progress Alert if incomplete */}
        {hasActiveSession && (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm font-black text-amber-950 dark:text-amber-200 block">
                    Pre-Test Assessment in Progress
                  </strong>
                  <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                    You have an ongoing diagnostic assessment session with saved answers.
                    {activeSessionRemaining !== null && ` Time remaining: ~${Math.ceil(activeSessionRemaining / 60)} minutes.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo('pretest')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition cursor-pointer shrink-0 shadow-sm"
              >
                <span>Resume Pre-Test</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State Card */}
        <div className={`rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center ${cardClass}`}>
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <ClipboardCheck className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            No Diagnostic Results Available
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            You haven't completed the Java OOP diagnostic pre-test yet. Take the 20-question pre-test to generate your baseline assessment, topic-level skill breakdown, and personalized recommendations.
          </p>

          {/* Value Highlights */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">1. Skill Matrix</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">12 Java OOP Concepts</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Identifies your individual accuracy across all topics.</p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">2. Strengths & Gaps</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">Actionable Insights</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Highlights strong points and prioritized concepts to practice.</p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
              <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">3. Non-Blocking</span>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">Diagnostic Only</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Your score never restricts access to lessons or practice.</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTo('pretest')}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 shadow-md transition cursor-pointer"
            >
              <ClipboardCheck className="h-4 w-4" />
              Take Pre-Test Assessment
            </button>
            <button
              type="button"
              onClick={() => onNavigateTo('lessons')}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
            >
              Browse Curriculum Lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. COMPLETED DIAGNOSTIC RESULTS VIEW
  const attemptsSummary = insights.attemptsSummary || [];
  const hasMultipleAttempts = attemptsSummary.length > 1;

  // Diagnostic baseline classification
  const getBaselineBand = (pct: number) => {
    if (pct >= 80) {
      return {
        label: 'Strong Baseline',
        badge: 'High Proficiency',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        description:
          'You demonstrated strong prior knowledge across core Java OOP principles. You are well-positioned to move smoothly through foundational lessons while focusing your efforts on advanced abstraction and design patterns.'
      };
    }
    if (pct >= 60) {
      return {
        label: 'Benchmark Met',
        badge: 'Developing Baseline',
        badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300',
        textColor: 'text-sky-600 dark:text-sky-400',
        description:
          'You demonstrated good familiarity with several foundational OOP concepts. Reviewing specific areas like inheritance, encapsulation, and method overrides will reinforce your comprehension before programming challenges.'
      };
    }
    return {
      label: 'Diagnostic Baseline',
      badge: 'Foundational Baseline',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
      textColor: 'text-amber-600 dark:text-amber-400',
      description:
        'This diagnostic establishes your starting baseline. The 17-lesson curriculum with video lectures and interactive IDE exercises is designed to guide you step-by-step through each concept.'
    };
  };

  const baselineInfo = getBaselineBand(insights.percentage);

  // Filter topics with 0 questions (Not Assessed / Not enough data)
  const assessedTopics = (insights.topicPerformance || []).filter(t => t.totalQuestions > 0);
  const unassessedTopics = (insights.topicPerformance || []).filter(t => t.totalQuestions === 0);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto py-6 px-4" id="diagnostic-results-container">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
              Verified Student Diagnostic Report
            </span>
            {hasMultipleAttempts && (
              <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 text-xs font-black font-mono">
                Attempt #{insights.attemptNumber} of {attemptsSummary.length}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Diagnostic Results
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Understand your current Java OOP knowledge, identify your strengths, and discover which concepts need more practice.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTo('pretest')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 px-3.5 py-2 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>Retake Pre-Test</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTo('lessons')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            <span>Go to Lessons</span>
          </button>
        </div>
      </div>

      {/* Multiple Attempts Switcher */}
      {hasMultipleAttempts && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
              Assessment Attempts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {attemptsSummary.map((att) => {
                const isSelected = att.attemptNumber === insights.attemptNumber;
                return (
                  <button
                    key={att.attemptNumber}
                    type="button"
                    onClick={() => handleAttemptChange(att.attemptNumber)}
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>Attempt #{att.attemptNumber}</span>
                    <span className="font-black">({att.percentage}%)</span>
                    {att.isLatest && <span className="text-[10px] bg-emerald-700 text-white px-1.5 rounded-sm">Latest</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Isolated to Student: <strong className="text-slate-700 dark:text-slate-300">{currentUser.name}</strong>
          </span>
        </div>
      )}

      {/* SECTION A: DIAGNOSTIC OVERVIEW CARDS */}
      <section aria-labelledby="section-overview-title" className="space-y-3">
        <h2 id="section-overview-title" className="text-sm font-black uppercase tracking-wider text-slate-400 font-mono">
          Diagnostic Overview
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Score & Percentage */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 shadow-xs">
            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 block font-mono">
              Diagnostic Score
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <strong className={`font-mono text-3xl font-black ${baselineInfo.textColor}`}>
                {insights.percentage}%
              </strong>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                ({insights.correctCount}/{insights.total})
              </span>
            </div>
            <span className="mt-1 block text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
              {baselineInfo.badge}
            </span>
          </div>

          {/* Correct Answers */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
              Correct Answers
            </span>
            <strong className="mt-1 block font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {insights.correctCount}
            </strong>
            <span className="text-[10px] font-bold text-slate-400">
              of {insights.total} questions
            </span>
          </div>

          {/* Incorrect Answers */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
              Incorrect Answers
            </span>
            <strong className="mt-1 block font-mono text-2xl font-black text-rose-600 dark:text-rose-400">
              {insights.incorrectCount}
            </strong>
            <span className="text-[10px] font-bold text-slate-400">
              missed questions
            </span>
          </div>

          {/* Questions Answered */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
              Questions Answered
            </span>
            <strong className="mt-1 block font-mono text-2xl font-black text-slate-900 dark:text-white">
              {insights.totalAnswered}
            </strong>
            <span className="text-[10px] font-bold text-slate-400">
              out of {insights.total} delivered
            </span>
          </div>

          {/* Completion Date & Time */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
              Completed On
            </span>
            <div className="mt-1 flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                {new Date(insights.submissionDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            {insights.formattedTimeSpent && (
              <span className="mt-1 block text-[10px] font-mono text-slate-400">
                Duration: {insights.formattedTimeSpent}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* SECTION B: DIAGNOSTIC BASELINE */}
      <section aria-labelledby="section-baseline-title" className={`rounded-3xl border p-6 sm:p-7 shadow-xs ${cardClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-mono text-xs font-black uppercase border ${baselineInfo.badgeColor}`}>
                {baselineInfo.label}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                Passing Benchmark: {insights.passingScore}%
              </span>
            </div>
            <h2 id="section-baseline-title" className="text-xl font-black text-slate-900 dark:text-white">
              Initial Knowledge Level
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {baselineInfo.description}
            </p>
            <p className="text-[11px] text-slate-400 leading-normal pt-1">
              {insights.diagnosticNote}
            </p>
          </div>

          {/* Reassurance Callout Box */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 lg:max-w-xs shrink-0">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 dark:text-emerald-200">
                <strong className="block font-black">Non-Blocking Policy:</strong>
                All lessons in the curriculum remain accessible. This pre-test establishes your baseline so you can track genuine learning progress over time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: SKILL BREAKDOWN MATRIX (12 JAVA OOP CONCEPTS) */}
      <section aria-labelledby="section-breakdown-title" className={`rounded-3xl border p-6 sm:p-7 shadow-xs space-y-5 ${cardClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              <h2 id="section-breakdown-title" className="text-lg font-black text-slate-900 dark:text-white">
                Skill Breakdown by Java OOP Concept
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Performance breakdown across the 12 canonical Java OOP topics evaluated in the diagnostic question pool.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
            12 Canonical Topics · Zero Duplicates
          </span>
        </div>

        {/* 12 Concept Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {insights.topicPerformance.map((topic) => {
            const hasData = topic.totalQuestions > 0;
            const pct = topic.accuracyPercentage ?? 0;

            const badgeStyle =
              topic.status === 'Strong'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : topic.status === 'Developing'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                : topic.status === 'Needs Improvement'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

            const barColor =
              topic.status === 'Strong'
                ? 'bg-emerald-500'
                : topic.status === 'Developing'
                ? 'bg-sky-500'
                : topic.status === 'Needs Improvement'
                ? 'bg-rose-500'
                : 'bg-slate-300 dark:bg-slate-700';

            return (
              <div
                key={topic.topicId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-black text-slate-400">
                        Lesson {topic.sequence}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {topic.topicName}
                      </h3>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase shrink-0 ${badgeStyle}`}>
                      {hasData ? topic.status : 'Not enough data'}
                    </span>
                  </div>

                  {topic.isPreliminary && hasData && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>Preliminary (1 question assessed)</span>
                    </div>
                  )}

                  {!hasData && (
                    <p className="mt-1 text-[10px] text-slate-400 italic">
                      Not enough data in this random sample.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">
                      {hasData ? `${topic.correctAnswers}/${topic.totalQuestions} Correct` : '0 Questions in Sample'}
                    </span>
                    <span className="text-slate-900 dark:text-white font-black">
                      {hasData ? `${pct}%` : 'Not Assessed'}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${hasData ? pct : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION D: STRENGTHS AND WEAKNESSES */}
      <section aria-labelledby="section-strengths-title" className="space-y-3">
        <h2 id="section-strengths-title" className="text-sm font-black uppercase tracking-wider text-slate-400 font-mono">
          Strengths & Areas to Improve
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Demonstrated Strengths (>=80%) */}
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                    Demonstrated Strengths (≥80%)
                  </h3>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                    Solid initial understanding
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
                {insights.strengths.length} {insights.strengths.length === 1 ? 'Topic' : 'Topics'}
              </span>
            </div>

            {insights.strengths.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 p-5 text-center text-xs text-emerald-800/80 dark:text-emerald-300">
                No topics scored at or above 80% on this diagnostic attempt. You will build these skills systematically throughout the course!
              </div>
            ) : (
              <div className="space-y-2.5">
                {insights.strengths.map((topic) => {
                  const meta = TOPIC_CONCEPT_GUIDANCE[topic.topicId];
                  return (
                    <div
                      key={topic.topicId}
                      className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-black text-slate-900 dark:text-white">
                          Lesson {topic.sequence}: {topic.topicName}
                        </strong>
                        <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {topic.accuracyPercentage}% ({topic.correctAnswers}/{topic.totalQuestions})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                        {meta?.advice || 'Demonstrates solid foundational familiarity with core concepts prior to course instruction.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Areas to Improve (<60%) */}
          <div className="rounded-3xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-950 dark:text-rose-200">
                    Prioritized Areas to Improve (&lt;60%)
                  </h3>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono">
                    Targeted for review during lessons
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white">
                {insights.weaknesses.length} {insights.weaknesses.length === 1 ? 'Topic' : 'Topics'}
              </span>
            </div>

            {insights.weaknesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 p-5 text-center text-xs text-emerald-800 dark:text-emerald-300">
                🎉 Outstanding baseline! No topics scored below 60% on this diagnostic attempt.
              </div>
            ) : (
              <div className="space-y-2.5">
                {insights.weaknesses.map((topic) => {
                  const meta = TOPIC_CONCEPT_GUIDANCE[topic.topicId];
                  return (
                    <div
                      key={topic.topicId}
                      className="rounded-2xl border border-rose-200 dark:border-rose-800/80 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-black text-slate-900 dark:text-white">
                          Lesson {topic.sequence}: {topic.topicName}
                        </strong>
                        <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                          {topic.accuracyPercentage}% ({topic.incorrectAnswers} missed)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                        {meta?.advice || 'Review the lesson lecture and practice code challenges to clarify these concepts.'}
                      </p>
                      {meta?.concepts && (
                        <div className="pt-1 flex flex-wrap gap-1">
                          {meta.concepts.map((c) => (
                            <span
                              key={c}
                              className="rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Not Enough Data Note */}
        {unassessedTopics.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 dark:text-slate-200">Topics with insufficient sample data: </strong>
              <span>
                {unassessedTopics.map(t => `${t.topicName} (Lesson ${t.sequence})`).join(', ')}.
                These topics were not in your 20-question randomized draw and are strictly not classified as weaknesses.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* SECTION E: PERSONALIZED LEARNING RECOMMENDATIONS */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <section aria-labelledby="section-recs-title" className={`rounded-3xl border p-6 sm:p-7 shadow-xs space-y-4 ${cardClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h2 id="section-recs-title" className="text-lg font-black text-slate-900 dark:text-white">
                Personalized Learning Recommendations
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Generated from your actual diagnostic responses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.recommendations.map((rec) => (
              <div
                key={rec.topicId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-black uppercase text-slate-400">
                      Lesson {rec.lessonSequence}: {rec.topicName}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        rec.priority === 'High'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rec.actionText}
                  </p>

                  {rec.concepts && rec.concepts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {rec.concepts.map((concept) => (
                        <span
                          key={concept}
                          className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {rec.missedQuestionCount} question{rec.missedQuestionCount === 1 ? '' : 's'} missed
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLessonAction(rec.lessonId)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                    >
                      <span>Study Lesson {rec.lessonSequence}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateTo('ide')}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Practice in Sandbox IDE"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
