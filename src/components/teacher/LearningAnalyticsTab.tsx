import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Award,
  BookOpen,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Search,
  Clock,
  Sparkles,
  HelpCircle,
  FileQuestion,
  UserCheck,
  X,
  Eye,
  GraduationCap
} from 'lucide-react';
import { TeacherCourseAnalytics, StudentDeepDiveAnalytics } from '../../types';
import { analyticsApi } from '../../services/api';
import { OOP_TOPIC_NAMES } from '../../data/oopQuestions';

interface LearningAnalyticsTabProps {
  theme?: 'light' | 'dark';
}

export default function LearningAnalyticsTab({ theme = 'light' }: LearningAnalyticsTabProps) {
  const isDark = theme === 'dark';
  const [analytics, setAnalytics] = useState<TeacherCourseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student Drill-Down Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDeepDive, setStudentDeepDive] = useState<StudentDeepDiveAnalytics | null>(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const selectedStudentIdRef = useRef<string | null>(null);

  // Filter for topic matrix
  const [topicFilter, setTopicFilter] = useState<'All' | 'Strong' | 'Average' | 'Struggling' | 'Not Assessed'>('All');

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.getTeacherAnalytics();
      if (res.data) {
        setAnalytics(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load teacher analytics:', err);
      setError(err?.message || 'Failed to load live teacher analytics.');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleOpenStudentDrillDown = async (studentId: string) => {
    selectedStudentIdRef.current = studentId;
    setSelectedStudentId(studentId);
    setStudentDeepDive(null);
    setIsLoadingDeepDive(true);
    try {
      const res = await analyticsApi.getStudentAnalytics(studentId);
      if (selectedStudentIdRef.current === studentId && res.data) {
        setStudentDeepDive(res.data);
      }
    } catch {
      if (selectedStudentIdRef.current === studentId) {
        setStudentDeepDive(null);
      }
    } finally {
      if (selectedStudentIdRef.current === studentId) {
        setIsLoadingDeepDive(false);
      }
    }
  };

  const filteredTopics = useMemo(() => {
    if (!analytics?.topicPerformance) return [];
    // Defensive de-duplication by stable lesson ID (one row per OOP lesson).
    const uniqueTopics = analytics.topicPerformance.filter(
      (topic, index, all) => all.findIndex(other => other.topicId === topic.topicId) === index
    );
    if (topicFilter === 'All') return uniqueTopics;
    return uniqueTopics.filter(t => t.status === topicFilter);
  }, [analytics, topicFilter]);

  if (isLoading && !analytics) {
    return (
      <div className="py-20 text-center font-bold text-slate-400">
        Loading comprehensive learning analytics...
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="text-sm font-bold text-rose-800 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={loadAnalytics}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
          >
            Retry Loading Analytics
          </button>
        </div>
      </div>
    );
  }

  const overview = analytics?.courseOverview;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Overview Cards */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <BarChart3 className="h-3.5 w-3.5" />
                Panel Comment 2
              </span>
              <span className="text-xs text-slate-400 font-bold">
                Real-Time Course Analytics & Diagnostic Gain
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">OOP Pedagogical Learning Analytics</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Aggregated student performance, score distributions, pre-test vs. post-test learning gains, and transparent pedagogical interventions.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer self-start md:self-auto"
          >
            Refresh Data
          </button>
        </div>

        {/* Overview Metric Cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Enrolled Students</span>
            <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
              {overview?.totalEnrolled ?? 0}
            </strong>
            <span className="text-[10px] text-slate-400">Active in cohort</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Course Completion</span>
            <strong className="mt-1 block font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
              {overview?.courseCompletionRate ?? 0}%
            </strong>
            <span className="text-[10px] text-slate-400">{overview?.totalLessonsCompleted ?? 0} lessons passed</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Avg Quiz Score</span>
            <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
              {overview?.averageAssessmentScore ?? 0}%
            </strong>
            <span className="text-[10px] text-slate-400">{overview?.assessmentPassingRate ?? 0}% pass rate</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Pre-Test Average</span>
            <strong className="mt-1 block font-mono text-xl font-black text-sky-600 dark:text-sky-400">
              {overview?.preTestAverageScore ?? 0}%
            </strong>
            <span className="text-[10px] text-slate-400">{overview?.preTestTakersCount ?? 0} students taken</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Post-Test Average</span>
            <strong className="mt-1 block font-mono text-xl font-black text-indigo-600 dark:text-indigo-400">
              {overview?.postTestAverageScore ?? 0}%
            </strong>
            <span className="text-[10px] text-slate-400">{overview?.postTestTakersCount ?? 0} completed</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <span className="text-[10px] font-black uppercase text-slate-400 block">Learning Gain</span>
            <strong className={`mt-1 block font-mono text-xl font-black ${
              (overview?.averageScoreImprovement ?? 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {overview?.averageScoreImprovement !== null && overview?.averageScoreImprovement !== undefined
                ? `${overview.averageScoreImprovement >= 0 ? '+' : ''}${overview.averageScoreImprovement}%`
                : '—'}
            </strong>
            <span className="text-[10px] text-slate-400">Score improvement</span>
          </div>
        </div>
      </div>

      {/* 2. Score Distribution Histogram & Support Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score Distribution Histogram */}
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Class Score Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Frequency distribution of student assessment scores across 5 performance tiers.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {Object.entries(analytics?.scoreDistribution || {}).map(([tierKey, tier]) => {
              const barColor =
                tierKey === '90-100%'
                  ? 'bg-emerald-500'
                  : tierKey === '80-89%'
                  ? 'bg-emerald-600'
                  : tierKey === '70-79%'
                  ? 'bg-sky-500'
                  : tierKey === '60-69%'
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

              return (
                <div key={tierKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">{tier.label}</span>
                    <span className="font-mono text-slate-400">
                      {tier.count} student{tier.count === 1 ? '' : 's'} ({tier.percentage}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.max(tier.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transparent Intervention Radar */}
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Students Requiring Support
              </h3>
              <p className="text-xs text-slate-400">
                Identified strictly by repeated quiz failures (&ge;2), stalled progress (&lt;30%), or inactivity. (Low pre-test score excluded).
              </p>
            </div>
            <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-black text-amber-800 dark:text-amber-300">
              {analytics?.studentsRequiringSupport?.length || 0} Flagged
            </span>
          </div>

          <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
            {!analytics?.studentsRequiringSupport || analytics.studentsRequiringSupport.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
                All enrolled students are progressing on track without active risk triggers.
              </div>
            ) : (
              analytics.studentsRequiringSupport.map(s => (
                <div
                  key={s.studentId}
                  className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-black text-slate-900 dark:text-white">
                        {s.name}
                      </strong>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {s.section} • {s.studentNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenStudentDrillDown(s.studentId)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-amber-700 transition cursor-pointer"
                    >
                      <Eye className="h-3 w-3" />
                      View Profile
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">
                      Trigger Reasons:
                    </span>
                    <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                      {s.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-white dark:bg-slate-900 p-2 text-[11px] border border-amber-100 dark:border-amber-900/40">
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Recommended Action: </strong>
                    <span className="text-slate-700 dark:text-slate-300">{s.recommendedAction}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. 12 OOP Topic Strengths and Weaknesses Matrix */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="p-5 border-b dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              12 OOP Topics Performance & Mastery Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates student attempt counts, quiz pass rates, and pedagogical mastery across each OOP topic.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value as any)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold outline-none ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <option value="All">All Mastery Levels</option>
              <option value="Strong">Strong (&ge;75%)</option>
              <option value="Average">Average (60-74%)</option>
              <option value="Struggling">Struggling (&lt;60%)</option>
              <option value="Not Assessed">Not Assessed (no attempts)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase tracking-wider text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className="px-4 py-3 font-black">OOP Topic</th>
                <th className="px-4 py-3 font-black text-center">Attempts</th>
                <th className="px-4 py-3 font-black text-center">Average Score</th>
                <th className="px-4 py-3 font-black text-center">Pass Rate</th>
                <th className="px-4 py-3 font-black text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredTopics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                    No OOP topics match this mastery level.
                  </td>
                </tr>
              )}
              {filteredTopics.map((topic, index) => {
                const notAssessed = topic.status === 'Not Assessed' || topic.attemptCount === 0;
                return (
                <tr key={topic.topicId} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                  <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                    <span className="mr-2 font-mono text-[10px] text-slate-400">#{topic.sequence ?? index + 1}</span>
                    {topic.topicName}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                    {topic.attemptCount}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-black">
                    {notAssessed || topic.averageScore === null ? <span className="text-slate-400">No data</span> : `${topic.averageScore}%`}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    {notAssessed || topic.passRate === null ? <span className="text-slate-400">No data</span> : `${topic.passRate}%`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        notAssessed
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : topic.status === 'Strong'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : topic.status === 'Average'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {notAssessed ? 'Not Assessed' : topic.status}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pre-Test vs Post-Test Comparative Learning Gains */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="p-5 border-b dark:border-slate-800">
          <h3 className="text-base font-black flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Pre-Test vs. Post-Test Comparative Learning Gains
          </h3>
          <p className="text-xs text-slate-400">
            Measures baseline diagnostic knowledge against final post-test outcomes to evaluate pedagogical learning gains.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase tracking-wider text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className="px-4 py-3 font-black">Student Name</th>
                <th className="px-4 py-3 font-black">Student ID</th>
                <th className="px-4 py-3 font-black text-center">Diagnostic Pre-Test</th>
                <th className="px-4 py-3 font-black text-center">Final Post-Test</th>
                <th className="px-4 py-3 font-black text-center">Learning Gain (Score Delta)</th>
                <th className="px-4 py-3 font-black text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {!analytics?.prePostComparison || analytics.prePostComparison.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    No pre-test and post-test comparisons recorded yet.
                  </td>
                </tr>
              ) : (
                analytics.prePostComparison.map(comp => (
                  <tr key={comp.studentId} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                      {comp.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {comp.studentNumber}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {comp.preTestScore !== null ? `${comp.preTestScore}%` : 'Not Taken'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {comp.postTestScore !== null && comp.postTestScore !== undefined ? `${comp.postTestScore}%` : 'In Progress'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-black">
                      {comp.scoreImprovement !== null && comp.scoreImprovement !== undefined ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-black ${
                            comp.scoreImprovement >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {comp.scoreImprovement >= 0 ? `+${comp.scoreImprovement}%` : `${comp.scoreImprovement}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDrillDown(comp.studentId)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Details <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DRILL-DOWN MODAL */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-black">
                    {studentDeepDive?.student.name || 'Student Analytics Deep Dive'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {studentDeepDive?.student.studentNumber} • {studentDeepDive?.student.email} • {studentDeepDive?.student.section}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingDeepDive ? (
              <div className="py-20 text-center font-bold text-slate-400">
                Loading individual student analytics...
              </div>
            ) : !studentDeepDive ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                No detailed analytics available for this student.
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
                {/* Pre/Post Summary Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase text-slate-400">Diagnostic Pre-Test</span>
                    <strong className="block mt-1 font-mono text-lg font-black text-sky-600 dark:text-sky-400">
                      {studentDeepDive.preTest ? `${studentDeepDive.preTest.percentage}%` : 'Not taken'}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {studentDeepDive.preTest ? `${studentDeepDive.preTest.score}/${studentDeepDive.preTest.total}` : ''}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase text-slate-400">Final Post-Test</span>
                    <strong className="block mt-1 font-mono text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {studentDeepDive.postTest ? `${studentDeepDive.postTest.percentage}%` : 'In progress'}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {studentDeepDive.postTest ? `${studentDeepDive.postTest.score}/${studentDeepDive.postTest.total}` : ''}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] font-black uppercase text-slate-400">Score Improvement</span>
                    <strong className="block mt-1 font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {studentDeepDive.scoreImprovement !== null && studentDeepDive.scoreImprovement !== undefined
                        ? `+${studentDeepDive.scoreImprovement}%`
                        : '—'}
                    </strong>
                    <span className="text-[10px] text-slate-400">Learning gain</span>
                  </div>
                </div>

                {/* Topics Table */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Topic-by-Topic Mastery
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b text-[10px] uppercase text-slate-400 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                        <tr>
                          <th className="px-3 py-2 font-black">Topic</th>
                          <th className="px-3 py-2 font-black text-center">Video</th>
                          <th className="px-3 py-2 font-black text-center">Best Quiz</th>
                          <th className="px-3 py-2 font-black text-center">Attempts</th>
                          <th className="px-3 py-2 font-black text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {studentDeepDive.topics.map(t => (
                          <tr key={t.lessonId}>
                            <td className="px-3 py-2 font-bold">{t.title}</td>
                            <td className="px-3 py-2 text-center font-mono">
                              {t.videoCompleted ? '✓ 100%' : `${t.videoPercentage}%`}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold">
                              {t.bestQuizScore}%
                            </td>
                            <td className="px-3 py-2 text-center font-mono">
                              {t.attemptsCount}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                  t.quizPassed
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {t.quizPassed ? 'Passed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Quiz Attempts */}
                {studentDeepDive.recentQuizAttempts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      Recent Assessment Submissions
                    </h4>
                    <div className="space-y-1.5">
                      {studentDeepDive.recentQuizAttempts.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                        >
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold">
                              {att.topicName}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Attempt #{att.attemptNumber} • {new Date(att.dateCompleted).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs">
                              {att.score}/{att.total} ({att.percentage}%)
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                att.passed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {att.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-3 flex justify-end shrink-0 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentId(null)}
                className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
