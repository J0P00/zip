import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  Award,
  Info
} from 'lucide-react';
import { PreTestInsights, StudentSubView } from '../../types';
import { preTestApi } from '../../services/api';

interface PreTestInsightsCardProps {
  theme?: 'light' | 'dark';
  onNavigateTo: (view: StudentSubView) => void;
  onSelectLesson?: (lessonId: string) => void;
  onLaunchPreTest?: () => void;
}

export default function PreTestInsightsCard({
  theme = 'light',
  onNavigateTo,
  onSelectLesson,
  onLaunchPreTest
}: PreTestInsightsCardProps) {
  const isDark = theme === 'dark';
  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<PreTestInsights | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(null);

  const fetchInsights = async (attemptNum?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await preTestApi.getMyInsights(attemptNum);
      if (res && res.success) {
        setHasCompleted(Boolean(res.hasCompletedPreTest));
        setInsights(res.data);
        if (res.data?.attemptNumber) {
          setSelectedAttempt(res.data.attemptNumber);
        }
      } else {
        setHasCompleted(false);
        setInsights(null);
      }
    } catch (err: any) {
      console.error('Failed to load pre-test insights:', err);
      setError(err?.message || 'Unable to load pre-test diagnostic insights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleAttemptChange = (attemptNum: number) => {
    setSelectedAttempt(attemptNum);
    fetchInsights(attemptNum);
  };

  const handleLessonAction = (lessonId: string) => {
    try {
      localStorage.setItem('selected_lesson_id', lessonId);
    } catch {
      // Ignore localStorage errors
    }
    if (onSelectLesson) {
      onSelectLesson(lessonId);
    }
    onNavigateTo('videos');
  };

  // 1. Loading State
  if (loading && !insights) {
    return (
      <section
        className={`rounded-2xl border p-6 shadow-sm animate-pulse ${cardClass}`}
        aria-label="Loading Pre-Test Insights"
      >
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="h-5 w-64 rounded bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="mt-6 h-40 rounded-xl bg-slate-100 dark:bg-slate-800/50" />
      </section>
    );
  }

  // 2. Error State
  if (error && !insights) {
    return (
      <section
        className={`rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-6 shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-rose-900 dark:text-rose-200">
                Pre-Test Diagnostic Insights Unavailable
              </h3>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchInsights(selectedAttempt || undefined)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  // 3. Empty State (Pre-test not completed yet)
  if (!hasCompleted || !insights) {
    return (
      <section
        className={`rounded-2xl border-2 border-dashed border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-sky-500/5 to-transparent p-6 shadow-sm ${cardClass}`}
        aria-labelledby="pretest-empty-title"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Diagnostic Assessment
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Baseline Prior Knowledge
              </span>
            </div>
            <h2 id="pretest-empty-title" className="mt-2 text-lg font-black text-slate-900 dark:text-white">
              Pre-Test Results & Learning Insights
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Take the 20-question Java OOP diagnostic pre-test to reveal your personalized strengths, weaknesses, and tailored topic recommendations.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Non-blocking policy: You can start Lesson 1 regardless of your pre-test score!</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onLaunchPreTest) onLaunchPreTest();
              else onNavigateTo('assessments');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700 shadow-md transition cursor-pointer shrink-0"
          >
            <ClipboardCheck className="h-4 w-4" />
            Take Diagnostic Pre-Test
          </button>
        </div>
      </section>
    );
  }

  // 4. Active Insights Results View
  const attemptsSummary = insights.attemptsSummary || [];
  const hasMultipleAttempts = attemptsSummary.length > 1;

  return (
    <section
      className={`rounded-3xl border p-6 sm:p-8 shadow-sm space-y-6 ${cardClass}`}
      id="pre-test-results-section"
      aria-labelledby="pre-test-insights-title"
    >
      {/* Header & Overall Summary */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Pre-Test Results & Learning Insights
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                insights.passed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {insights.passed ? 'Benchmark Met (≥60%)' : 'Diagnostic Baseline'}
            </span>
            {hasMultipleAttempts && (
              <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 text-[10px] font-black font-mono">
                Attempt #{insights.attemptNumber} of {attemptsSummary.length}
              </span>
            )}
          </div>

          <h2 id="pre-test-insights-title" className="mt-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Diagnostic Baseline & Skill Breakdown
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {insights.diagnosticNote}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Completed:{' '}
                {new Date(insights.submissionDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            {insights.formattedTimeSpent && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span>
                <span>Time: {insights.formattedTimeSpent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Score Badge */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shrink-0 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
              Diagnostic Score
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block font-mono">
              {insights.correctCount}/{insights.total} Correct
            </span>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
            <strong
              className={`font-mono text-3xl sm:text-4xl font-black ${
                insights.percentage >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : insights.percentage >= 60
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {insights.percentage}%
            </strong>
          </div>
        </div>
      </div>

      {/* Multiple Attempts Switcher (if student retook pre-test) */}
      {hasMultipleAttempts && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              Select Attempt:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {attemptsSummary.map((att) => {
                const isCurrent = att.attemptNumber === insights.attemptNumber;
                return (
                  <button
                    key={att.attemptNumber}
                    type="button"
                    onClick={() => handleAttemptChange(att.attemptNumber)}
                    className={`rounded-lg px-3 py-1 font-mono text-xs font-bold transition cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    Attempt #{att.attemptNumber} ({att.percentage}%)
                    {att.isLatest ? ' • Latest' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Insights updated to Attempt #{insights.attemptNumber}
          </span>
        </div>
      )}

      {/* Metrics Row: Answered, Correct, Incorrect, Passing Threshold */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
            Questions Answered
          </span>
          <span className="mt-1 block font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {insights.totalAnswered} <span className="text-xs font-bold text-slate-400">/ {insights.total}</span>
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block font-mono">
            Correct Answers
          </span>
          <span className="mt-1 block font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {insights.correctCount}
          </span>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 block font-mono">
            Incorrect Answers
          </span>
          <span className="mt-1 block font-mono text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {insights.incorrectCount}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block font-mono">
            Passing Benchmark
          </span>
          <span className="mt-1 block font-mono text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300">
            {insights.passingScore}% <span className="text-xs font-bold text-slate-400">threshold</span>
          </span>
        </div>
      </div>

      {/* Strengths & Areas to Improve 2-Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Demonstrated Strengths (80%–100%) */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                Demonstrated Strengths (80%–100%)
              </h3>
            </div>
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
              {insights.strengths.length} Topics
            </span>
          </div>

          <p className="text-[11px] text-emerald-800 dark:text-emerald-300/80">
            Topics where your answers showed solid foundational familiarity prior to course instruction.
          </p>

          {insights.strengths.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-900 p-4 text-center text-xs text-emerald-800/80 dark:text-emerald-400">
              No topics scored at or above 80% yet. You will build these skills systematically throughout the course!
            </div>
          ) : (
            <div className="space-y-2">
              {insights.strengths.map((topic) => (
                <div
                  key={topic.topicId}
                  className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-400 mr-1.5">
                      #{topic.sequence}
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {topic.topicName}
                    </strong>
                    {topic.isPreliminary && (
                      <span className="ml-2 text-[9px] font-bold text-slate-400 uppercase font-mono">
                        (Preliminary • 1 Q)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {topic.accuracyPercentage}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      ({topic.correctAnswers}/{topic.totalQuestions})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Areas to Improve (<60%) */}
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <h3 className="text-sm font-black text-rose-950 dark:text-rose-200">
                Prioritized Areas to Improve (&lt;60%)
              </h3>
            </div>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
              {insights.weaknesses.length} Topics
            </span>
          </div>

          <p className="text-[11px] text-rose-800 dark:text-rose-300/80">
            Topics with multiple missed questions, prioritized for review when studying upcoming lessons.
          </p>

          {insights.weaknesses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-300 dark:border-emerald-900 p-4 text-center text-xs text-emerald-800 dark:text-emerald-400">
              🎉 Excellent baseline! No topics scored below 60% on this diagnostic attempt.
            </div>
          ) : (
            <div className="space-y-2">
              {insights.weaknesses.map((topic) => (
                <div
                  key={topic.topicId}
                  className="rounded-xl border border-rose-200 dark:border-rose-800/80 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-400 mr-1.5">
                      #{topic.sequence}
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {topic.topicName}
                    </strong>
                    {topic.isPreliminary && (
                      <span className="ml-2 text-[9px] font-bold text-slate-400 uppercase font-mono">
                        (Preliminary • 1 Q)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      {topic.accuracyPercentage}%
                    </span>
                    <span className="text-[10px] font-bold text-rose-500 font-mono">
                      ({topic.incorrectAnswers} missed)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topic-Level Performance Breakdown Bars (All 12 Topics) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {insights?.topicPerformance?.length ? `${insights.topicPerformance.length} ` : ''}Java OOP Topics Performance Matrix
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Ordered by Course Curriculum
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.topicPerformance.map((topic) => {
            const isAssessed = topic.totalQuestions > 0;
            const pct = topic.accuracyPercentage ?? 0;

            const badgeBg =
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
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-black text-slate-400">
                        Lesson {topic.sequence}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {topic.topicName}
                      </h4>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${badgeBg}`}>
                      {topic.status}
                    </span>
                  </div>

                  {topic.isPreliminary && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>Preliminary: 1 question assessed</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">
                      {isAssessed ? `${topic.correctAnswers}/${topic.totalQuestions} Correct` : '0 Questions in Sample'}
                    </span>
                    <span className="text-slate-900 dark:text-white font-black">
                      {isAssessed ? `${pct}%` : 'Not Assessed'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${isAssessed ? pct : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personalized Learning Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Personalized Learning Recommendations
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Based on your actual assessment responses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.recommendations.slice(0, 4).map((rec) => (
              <div
                key={rec.topicId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-black text-slate-400">
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

                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {rec.missedQuestionCount} question{rec.missedQuestionCount === 1 ? '' : 's'} missed
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLessonAction(rec.lessonId)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                  >
                    <span>Study Lesson {rec.lessonSequence}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
