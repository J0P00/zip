import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Filter,
  GraduationCap,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UsersRound
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AdaptiveRule,
  CurriculumModule,
  LeaderboardUser,
  LessonItem,
  PendingSubmission
} from '../types';

interface AdminDashboardProps {
  modules: CurriculumModule[];
  lessons: LessonItem[];
  rules: AdaptiveRule[];
  submissions: PendingSubmission[];
  leaderboardUsers: LeaderboardUser[];
  activeView: string;
}

type TrendTone = 'up' | 'down' | 'neutral';
type AlertTone = 'critical' | 'warning' | 'normal';

const activityTrend = [42, 56, 48, 72, 64, 88, 96, 114, 105, 132, 148, 161];

const coursePerformance = [
  { label: 'IT Foundations', value: 72, color: 'bg-sky-500' },
  { label: 'CS Cohort', value: 84, color: 'bg-emerald-500' },
  { label: 'OOP Topics', value: 67, color: 'bg-violet-500' },
  { label: 'Java Labs', value: 78, color: 'bg-amber-500' }
];

const completionRates = [
  { label: 'Lessons', value: 82, color: '#22c55e' },
  { label: 'Labs', value: 64, color: '#38bdf8' },
  { label: 'Quizzes', value: 76, color: '#f59e0b' }
];

const conceptMastery = [
  { concept: 'Classes & Objects', score: 88, status: 'Strong', color: 'bg-emerald-500' },
  { concept: 'Encapsulation', score: 61, status: 'Needs practice', color: 'bg-amber-500' },
  { concept: 'Inheritance', score: 74, status: 'Stable', color: 'bg-sky-500' },
  { concept: 'Polymorphism', score: 48, status: 'Weak area', color: 'bg-rose-500' }
];

const weakConcepts = ['Polymorphism', 'Encapsulation', 'Abstraction'];

const recentActivities = [
  { name: 'Sofia Rodriguez', role: 'Student', event: 'registered for Advanced Java Labs', time: '8 min ago', tone: 'student' },
  { name: 'Dr. Elena Vance', role: 'Teacher', event: 'published feedback on Vehicle override submissions', time: '22 min ago', tone: 'teacher' },
  { name: 'Dmitry Volkov', role: 'Student', event: 'submitted Polymorphism diagnostics', time: '46 min ago', tone: 'student' },
  { name: 'System Monitor', role: 'Admin', event: 'logged a clean nightly sync pass', time: '1 hr ago', tone: 'admin' }
];

const systemAlerts: Array<{ title: string; detail: string; tone: AlertTone; count: string }> = [
  { title: 'Pending approvals', detail: 'Teacher account validations awaiting review', tone: 'warning', count: '7' },
  { title: 'Error logs', detail: 'No blocking API failures in the last 24 hours', tone: 'normal', count: '0' },
  { title: 'Suspicious activity', detail: 'Repeated login attempts from one session', tone: 'critical', count: '2' },
  { title: 'System notifications', detail: 'Content index rebuilt successfully', tone: 'normal', count: '14' }
];

const directoryRows = [
  { name: 'Dmitry Vance', type: 'Student', course: 'OOP 101', status: 'Active', progress: 78 },
  { name: 'Sofia Rodriguez', type: 'Student', course: 'Advanced Java', status: 'Active', progress: 91 },
  { name: 'Dr. Elena Vance', type: 'Teacher', course: 'Software Architecture', status: 'Active', progress: 100 },
  { name: 'J. Chen', type: 'Student', course: 'OOP 101', status: 'Review', progress: 64 },
  { name: 'Liam Hughes', type: 'Student', course: 'Java Labs', status: 'At Risk', progress: 52 }
];

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const getLinePoints = (values: number[]) => {
  const width = 420;
  const height = 140;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');
};

function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-32 rounded-lg border border-slate-100 bg-white shadow-sm">
            <div className="h-full rounded-lg bg-slate-100/70" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 rounded-lg bg-slate-100/70 xl:col-span-2" />
        <div className="h-80 rounded-lg bg-slate-100/70" />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  trend,
  trendTone,
  icon
}: {
  title: string;
  value: string;
  helper: string;
  trend: string;
  trendTone: TrendTone;
  icon: React.ReactNode;
}) {
  const isPositive = trendTone === 'up';
  const isNegative = trendTone === 'down';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
          {icon}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700'
              : isNegative
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isNegative ? <ArrowDownRight className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
          {trend}
        </span>
      </div>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{helper}</p>
      </div>
    </motion.article>
  );
}

function PanelHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>
          <h3 className="text-sm font-extrabold text-slate-950">{title}</h3>
        </div>
        <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function AlertBadge({ tone }: { tone: AlertTone }) {
  const styles = {
    critical: 'bg-rose-50 text-rose-700 border-rose-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    normal: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${styles[tone]}`}>
      {tone}
    </span>
  );
}

export default function AdminDashboard({
  modules,
  lessons,
  rules,
  submissions,
  leaderboardUsers,
  activeView
}: AdminDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, []);

  const pendingSubmissions = submissions.filter(submission => submission.status === 'pending').length;
  const activeRules = rules.filter(rule => rule.isActive).length;
  const activeCourses = modules.filter(module => module.status === 'Published').length;

  const metrics = [
    {
      title: 'Total Students',
      value: String(Math.max(leaderboardUsers.length + 128, 135)),
      helper: 'Across IT, CS, and Java cohorts',
      trend: '+12.4%',
      trendTone: 'up' as TrendTone,
      icon: <GraduationCap className="h-5 w-5" />
    },
    {
      title: 'Total Teachers',
      value: '18',
      helper: 'Active instructors and reviewers',
      trend: '+3',
      trendTone: 'up' as TrendTone,
      icon: <UsersRound className="h-5 w-5" />
    },
    {
      title: 'Active Courses',
      value: String(activeCourses),
      helper: `${lessons.length} catalog lessons connected`,
      trend: 'Stable',
      trendTone: 'neutral' as TrendTone,
      icon: <BookOpenCheck className="h-5 w-5" />
    },
    {
      title: 'Completed Assessments',
      value: '1,284',
      helper: `${pendingSubmissions} submissions need review`,
      trend: '+8.7%',
      trendTone: 'up' as TrendTone,
      icon: <CheckCircle2 className="h-5 w-5" />
    },
    {
      title: 'Engagement Rate',
      value: '76%',
      helper: 'Weekly active learners',
      trend: '+4.1%',
      trendTone: 'up' as TrendTone,
      icon: <Activity className="h-5 w-5" />
    },
    {
      title: 'System Alerts',
      value: '9',
      helper: `${activeRules} automation rules online`,
      trend: '-2',
      trendTone: 'down' as TrendTone,
      icon: <CircleAlert className="h-5 w-5" />
    }
  ];

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return directoryRows.filter(row => {
      const matchesFilter = filter === 'All' || row.type === filter || row.status === filter;
      const matchesQuery =
        !normalized ||
        row.name.toLowerCase().includes(normalized) ||
        row.course.toLowerCase().includes(normalized) ||
        row.status.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0" id={`admin-${activeView}-dashboard`}>
      <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              <Sparkles className="h-4 w-4" />
              Administrative intelligence center
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
              OOP Pedagogical Hub Admin Dashboard
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Monitor learners, instructors, course health, mastery gaps, and operational alerts from one clean workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            {['Live users', 'Review queue', 'Health'].map((label, index) => (
              <div key={label} className="rounded-lg border border-slate-100 px-3 py-3">
                <p className="text-lg font-extrabold text-slate-950">{index === 0 ? '314' : index === 1 ? pendingSubmissions : '99%'}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(metric => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2">
          <PanelHeader
            icon={<LineChart className="h-5 w-5" />}
            title="User Activity Over Time"
            subtitle="Weekly active users, submissions, and course visits"
          />
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <svg viewBox="0 0 420 160" role="img" aria-label="Line chart showing rising user activity" className="h-56 w-full">
              <defs>
                <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[28, 62, 96, 130].map(y => (
                <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              ))}
              <polyline
                points={`0,150 ${getLinePoints(activityTrend)} 420,150`}
                fill="url(#activityFill)"
                stroke="none"
              />
              <polyline
                points={getLinePoints(activityTrend)}
                fill="none"
                stroke="#16a34a"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
              />
              {activityTrend.map((value, index) => {
                const [x, y] = getLinePoints(activityTrend).split(' ')[index].split(',').map(Number);
                return <circle key={value + index} cx={x} cy={y} r="4" fill="#ffffff" stroke="#16a34a" strokeWidth="3" />;
              })}
            </svg>
          </div>
        </article>

        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<BarChart3 className="h-5 w-5" />}
            title="Course Performance"
            subtitle="Topic strength across program tracks"
          />
          <div className="mt-6 space-y-5">
            {coursePerformance.map(course => (
              <div key={course.label}>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{course.label}</span>
                  <span className="font-extrabold text-slate-950">{course.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className={`h-3 rounded-full ${course.color}`} style={{ width: `${course.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.95fr]">
        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<TrendingUp className="h-5 w-5" />}
            title="Student Completion Rates"
            subtitle="Progress across lesson, lab, and quiz pathways"
          />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {completionRates.map(rate => (
              <div key={rate.label} className="text-center">
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(${rate.color} ${rate.value * 3.6}deg, #f1f5f9 0deg)` }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-extrabold text-slate-950">
                    {rate.value}%
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-600">{rate.label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Learning Insights"
            subtitle="Conceptual gaps and difficulty signals"
          />
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Weak OOP Concepts</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weakConcepts.map(concept => (
                  <span key={concept} className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Performance Distribution</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Advanced', '24%', 'text-emerald-700'],
                  ['On Track', '52%', 'text-sky-700'],
                  ['Needs Help', '24%', 'text-rose-700']
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg border border-slate-100 py-3">
                    <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Course Difficulty Analysis</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                Polymorphism labs are rated hardest this week, with constructors and method overriding driving most remediation paths.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<Sparkles className="h-5 w-5" />}
            title="OOP Concept Mastery Tracker"
            subtitle="Strong and weak areas across core OOP ideas"
          />
          <div className="mt-5 space-y-4">
            {conceptMastery.map(item => (
              <div key={item.concept}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{item.concept}</p>
                    <p className="text-[11px] font-bold text-slate-400">{item.status}</p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-950">{item.score}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<UserCheck className="h-5 w-5" />}
            title="Recent Activity Feed"
            subtitle="Registrations, teaching activity, submissions, and logins"
          />
          <div className="mt-5 divide-y divide-slate-100">
            {recentActivities.map(activity => (
              <div key={`${activity.name}-${activity.time}`} className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {getInitials(activity.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-950">{activity.name}</p>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
                      {activity.role}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500">{activity.event}</p>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <PanelHeader
            icon={<AlertTriangle className="h-5 w-5" />}
            title="System Alerts"
            subtitle="Approvals, errors, suspicious activity, and platform notices"
          />
          <div className="mt-5 divide-y divide-slate-100">
            {systemAlerts.map(alert => (
              <div key={alert.title} className="flex items-start gap-3 py-4">
                <div
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    alert.tone === 'critical' ? 'bg-rose-500' : alert.tone === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-slate-950">{alert.title}</p>
                    <AlertBadge tone={alert.tone} />
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{alert.detail}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-700">{alert.count}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PanelHeader
            icon={<UsersRound className="h-5 w-5" />}
            title="Searchable Admin Directory"
            subtitle="Filter users, courses, and assessment status without leaving the dashboard"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search users or courses"
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 sm:w-64"
              />
            </label>
            <label className="relative block">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={filter}
                onChange={event => setFilter(event.target.value)}
                className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white pl-9 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 sm:w-44"
              >
                {['All', 'Student', 'Teacher', 'Active', 'Review', 'At Risk'].map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-3 font-extrabold">Name</th>
                <th className="py-3 font-extrabold">Type</th>
                <th className="py-3 font-extrabold">Course</th>
                <th className="py-3 font-extrabold">Status</th>
                <th className="py-3 font-extrabold">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => (
                <tr key={`${row.name}-${row.course}`} className="transition hover:bg-emerald-50/30">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                        {getInitials(row.name)}
                      </div>
                      <span className="font-extrabold text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 font-bold text-slate-600">{row.type}</td>
                  <td className="py-4 font-medium text-slate-500">{row.course}</td>
                  <td className="py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${
                        row.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : row.status === 'Review'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-28 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${row.progress}%` }} />
                      </div>
                      <span className="text-xs font-extrabold text-slate-700">{row.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
