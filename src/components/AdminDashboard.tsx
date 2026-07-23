import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  UsersRound,
  Video
} from 'lucide-react';
import { adminApi, assessmentApi, practiceApi } from '../services/api';
import {
  AdaptiveRule,
  CurriculumModule,
  LeaderboardUser,
  LessonItem,
  PendingSubmission,
  VideoLesson
} from '../types';

interface AdminDashboardProps {
  modules: CurriculumModule[];
  lessons: LessonItem[];
  rules: AdaptiveRule[];
  submissions: PendingSubmission[];
  leaderboardUsers: LeaderboardUser[];
  videoLessons: VideoLesson[];
  activeView: string;
}

const olive = 'text-[#556b2f]';
const oliveBg = 'bg-[#556b2f]';
const oliveSoft = 'bg-[#f3f6ed]';
const oliveBorder = 'border-[#dfe8d0]';

const reportRows = [
  'Student Progress Report',
  'Quiz Performance Report',
  'Programming Performance Report',
  'Lesson Completion Report',
  'Overall Learning Analytics'
];

function PageCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-100 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-lg border ${oliveBorder} ${oliveSoft} p-2 ${olive}`}>
        {icon}
      </div>
      <div>
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function PrimaryButton({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-md ${oliveBg} px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#475a27]`}>
      {icon}
      {children}
    </button>
  );
}

function SoftButton({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button className={`inline-flex items-center justify-center gap-1.5 rounded-md border ${oliveBorder} ${oliveSoft} px-3 py-2 text-xs font-bold ${olive} transition hover:bg-[#e9efd9]`}>
      {icon}
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#556b2f] focus:ring-4 focus:ring-[#556b2f]/10';
const textareaClass = 'min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-[#556b2f] focus:ring-4 focus:ring-[#556b2f]/10';

function Actions() {
  return (
    <div className="flex flex-wrap gap-2">
      <SoftButton icon={<Edit3 className="h-3.5 w-3.5" />}>Edit</SoftButton>
      <SoftButton icon={<Eye className="h-3.5 w-3.5" />}>Preview</SoftButton>
      <SoftButton icon={<Trash2 className="h-3.5 w-3.5" />}>Delete</SoftButton>
    </div>
  );
}

export default function AdminDashboard({
  modules,
  lessons,
  rules,
  submissions,
  leaderboardUsers,
  videoLessons,
  activeView
}: AdminDashboardProps) {
  const [studentSearch, setStudentSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [overview, setOverview] = useState<any>({
    stats: {
      totalStudents: 0,
      totalTeachers: 0,
      totalLectures: 0,
      totalAssessments: 0,
      totalPracticeActivities: 0
    },
    recentActivities: []
  });
  const [dbAssessments, setDbAssessments] = useState<any[]>([]);
  const [dbPracticeActivities, setDbPracticeActivities] = useState<any[]>([]);
  const [monitoring, setMonitoring] = useState<{ students: any[]; teachers: any[] }>({ students: [], teachers: [] });
  const [reports, setReports] = useState<any>({});

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminApi.overview(),
      assessmentApi.list(),
      practiceApi.listChallenges(),
      adminApi.monitoring(),
      adminApi.reports()
    ])
      .then(([overviewResponse, assessmentResponse, practiceResponse, monitoringResponse, reportResponse]) => {
        if (!isMounted) return;
        setOverview(overviewResponse.data);
        setDbAssessments(assessmentResponse.data);
        setDbPracticeActivities(practiceResponse.data);
        setMonitoring(monitoringResponse.data);
        setReports(reportResponse.data);
      })
      .catch(error => {
        console.warn('Unable to load admin data from PostgreSQL:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeVideos = videoLessons.filter(video => !video.isArchived);
  const recentActivities = overview.recentActivities || [];
  const quizRows = dbAssessments;
  const practiceRows = dbPracticeActivities;
  const studentRows = monitoring.students || [];
  const teacherRows = monitoring.teachers || [];

  const monitoredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    return studentRows.filter(row => {
      const matchesSearch = !search || row.name.toLowerCase().includes(search) || row.course.toLowerCase().includes(search);
      const matchesCourse = courseFilter === 'All' || row.course === courseFilter;
      const matchesYear = yearFilter === 'All' || row.year_level === yearFilter;
      const matchesStatus = statusFilter === 'All' || (row.account_status || row.status) === statusFilter;
      return matchesSearch && matchesCourse && matchesYear && matchesStatus;
    });
  }, [courseFilter, statusFilter, studentSearch, yearFilter]);

  const renderDashboard = () => (
    <div className="space-y-5">
      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle
            icon={<LayoutDashboard className="h-5 w-5" />}
            title="OOP Pedagogical Hub Admin"
            subtitle="A simple workspace for learning content, assessment, programming practice, monitoring, and reports."
          />
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
            {modules.filter(module => module.status === 'Published').length} published learning modules
          </div>
        </div>
      </PageCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total Students', String(overview.stats?.totalStudents || 0), <GraduationCap className="h-5 w-5" />],
          ['Total Teachers', String(overview.stats?.totalTeachers || 0), <UsersRound className="h-5 w-5" />],
          ['Total Lectures', String(overview.stats?.totalLectures || activeVideos.length || 0), <Video className="h-5 w-5" />],
          ['Total Assessments', String(overview.stats?.totalAssessments || 0), <ClipboardCheck className="h-5 w-5" />],
          ['Total Practice Activities', String(overview.stats?.totalPracticeActivities || 0), <Code2 className="h-5 w-5" />]
        ].map(([label, value, icon]) => (
          <PageCard key={label as string}>
            <div className={`mb-5 inline-flex rounded-lg border ${oliveBorder} ${oliveSoft} p-2 ${olive}`}>
              {icon}
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-extrabold text-slate-950">{value}</p>
          </PageCard>
        ))}
      </div>

      <PageCard>
        <SectionTitle
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Recent Activities"
          subtitle="Quick updates from students, teachers, and learning content."
        />
        <div className="mt-4 divide-y divide-slate-100">
          {recentActivities.length === 0 && (
            <div className="py-3 text-sm font-semibold text-slate-500">No database activity yet.</div>
          )}
          {recentActivities.map((activity: any) => (
            <div key={`${activity.activity}-${activity.created_at}`} className="flex items-center gap-3 py-3 text-sm font-semibold text-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${oliveBg}`} />
              {activity.activity}
            </div>
          ))}
        </div>
      </PageCard>
    </div>
  );

  const renderVideos = () => (
    <div className="space-y-5">
      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle icon={<Video className="h-5 w-5" />} title="Lecture Management" subtitle="Create, edit, and delete lecture information while reusing any teacher-assigned video." />
          <PrimaryButton icon={<Plus className="h-4 w-4" />}>Create Lecture</PrimaryButton>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Field label="Module"><input className={inputClass} placeholder="Module 1" /></Field>
          <Field label="Lesson Title"><input className={inputClass} placeholder="Classes and Objects" /></Field>
          <Field label="Lesson Order"><input className={inputClass} placeholder="1" /></Field>
          <Field label="Status"><select className={inputClass}><option>Active</option><option>Draft</option><option>Archived</option></select></Field>
          <Field label="Description"><input className={inputClass} placeholder="Short lesson summary" /></Field>
          <Field label="Learning Objectives"><input className={inputClass} placeholder="Separate objectives with commas" /></Field>
        </div>
      </PageCard>

      <PageCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <tr><th className="py-3">Order</th><th>Lesson Title</th><th>Module</th><th>Existing Video</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeVideos.slice(0, 6).map(video => (
                <tr key={video.id} className="align-middle">
                  <td className="py-4 font-bold text-slate-500">{video.sequence}</td>
                  <td className="font-extrabold text-slate-900">{video.title}</td>
                  <td className="font-medium text-slate-600">{video.module || 'OOP Module'}</td>
                  <td className="font-medium text-slate-600">{video.videoUrl ? 'Assigned' : 'No video assigned'}</td>
                  <td><span className={`rounded-md ${oliveSoft} px-2 py-1 text-[11px] font-bold ${olive}`}>{video.status}</span></td>
                  <td><Actions /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  );

  const renderAssessments = () => (
    <div className="space-y-5">
      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle icon={<ClipboardCheck className="h-5 w-5" />} title="Assessment / Quiz Management" subtitle="Create quizzes for lessons with passing scores, attempts, choices, and correct answers." />
          <PrimaryButton icon={<Plus className="h-4 w-4" />}>Create Quiz</PrimaryButton>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Field label="Quiz Title"><input className={inputClass} placeholder="Encapsulation Quiz" /></Field>
          <Field label="Lesson"><input className={inputClass} placeholder="Lesson 2" /></Field>
          <Field label="Passing Score"><input className={inputClass} placeholder="75%" /></Field>
          <Field label="Quiz Type"><select className={inputClass}><option>Multiple Choice</option><option>True/False</option><option>Identification</option></select></Field>
          <Field label="Attempts"><input className={inputClass} placeholder="2" /></Field>
          <Field label="Correct Answer"><input className={inputClass} placeholder="Answer key" /></Field>
        </div>
      </PageCard>

      <PageCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <tr><th className="py-3">Quiz Title</th><th>Lesson</th><th>Type</th><th>Passing Score</th><th>Attempts</th><th>Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizRows.map(row => (
                <tr key={row.id || row.title}>
                  <td className="py-4 font-extrabold text-slate-900">{row.title}</td>
                  <td className="font-medium text-slate-600">{row.lessonId || row.lesson_id}</td>
                  <td className="font-medium text-slate-600">{row.quizType || row.quiz_type}</td>
                  <td className="font-bold text-slate-700">{row.passingScore ?? row.passing_score}%</td>
                  <td className="font-bold text-slate-700">{row.attempts}</td>
                  <td><Actions /></td>
                </tr>
              ))}
              {quizRows.length === 0 && (
                <tr><td className="py-4 text-sm font-semibold text-slate-500" colSpan={6}>No quizzes found in PostgreSQL.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  );

  const renderPractice = () => (
    <div className="space-y-5">
      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle icon={<Code2 className="h-5 w-5" />} title="Programming Practice Activities" subtitle="Prepare coding exercises with starter code, expected output, and hidden test cases." />
          <PrimaryButton icon={<Plus className="h-4 w-4" />}>Create Activity</PrimaryButton>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Activity Title"><input className={inputClass} placeholder="Create a Student class" /></Field>
          <Field label="Lesson"><input className={inputClass} placeholder="Lesson 1" /></Field>
          <Field label="Programming Language"><input className={inputClass} placeholder="Java" /></Field>
          <Field label="Difficulty"><select className={inputClass}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field>
          <Field label="Instructions"><textarea className={textareaClass} placeholder="Describe what the student should build." /></Field>
          <Field label="Starter Code"><textarea className={textareaClass} placeholder="public class Main { }" /></Field>
          <Field label="Expected Output"><textarea className={textareaClass} placeholder="Expected program output" /></Field>
          <Field label="Hidden Test Cases"><textarea className={textareaClass} placeholder="Input and expected output cases" /></Field>
        </div>
      </PageCard>

      <PageCard>
        <div className="grid gap-3 lg:grid-cols-3">
          {practiceRows.map(row => (
            <article key={row.id || row.title} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-950">{row.title}</h3>
                <span className={`rounded-md ${oliveSoft} px-2 py-1 text-[10px] font-bold ${olive}`}>{row.status || 'Draft'}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">{row.lessonId || 'Unassigned lesson'} | {row.topicId || 'OOP'} | {(row.testCases || row.test_cases || []).length} test cases</p>
              <div className="mt-4"><Actions /></div>
            </article>
          ))}
          {practiceRows.length === 0 && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              No practice activities found in PostgreSQL.
            </div>
          )}
        </div>
      </PageCard>
    </div>
  );

  const renderMonitoring = () => (
    <PageCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionTitle icon={<UsersRound className="h-5 w-5" />} title="User Monitoring" subtitle="Monitor student learning progress without school-management modules." />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} className={`${inputClass} pl-9`} placeholder="Search student" />
          </label>
          <select value={courseFilter} onChange={event => setCourseFilter(event.target.value)} className={inputClass}><option>All</option><option>OOP Fundamentals</option><option>Java Programming</option></select>
          <select value={yearFilter} onChange={event => setYearFilter(event.target.value)} className={inputClass}><option>All</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={inputClass}><option>All</option><option>Active</option><option>Inactive</option><option>Suspended</option></select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
            <tr><th className="py-3">Student Name</th><th>Student Number</th><th>Course</th><th>Year Level</th><th>Email</th><th>Progress</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitoredStudents.map(row => (
              <tr key={row.id || row.email}>
                <td className="py-4 font-extrabold text-slate-900">{row.name}</td>
                <td className="font-medium text-slate-600">{row.student_number || '-'}</td>
                <td className="font-medium text-slate-600">{row.course}</td>
                <td className="font-medium text-slate-600">{row.year_level || '-'}</td>
                <td className="font-medium text-slate-600">{row.email}</td>
                <td><div className="flex items-center gap-2"><div className="h-2 w-24 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${oliveBg}`} style={{ width: `${Number(row.progress || 0)}%` }} /></div><span className="text-xs font-bold">{Number(row.progress || 0)}%</span></div></td>
                <td><span className={`rounded-md ${oliveSoft} px-2 py-1 text-[11px] font-bold ${olive}`}>{row.account_status || 'Active'}</span></td>
                <td><SoftButton icon={<Eye className="h-3.5 w-3.5" />}>View Details</SoftButton></td>
              </tr>
            ))}
            {monitoredStudents.length === 0 && (
              <tr><td className="py-4 text-sm font-semibold text-slate-500" colSpan={8}>No registered students found in PostgreSQL.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
            <tr><th className="py-3">Teacher Name</th><th>Teacher ID</th><th>Email</th><th>Department</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teacherRows.map(row => (
              <tr key={row.id || row.email}>
                <td className="py-4 font-extrabold text-slate-900">{row.name}</td>
                <td className="font-medium text-slate-600">{row.employee_id || '-'}</td>
                <td className="font-medium text-slate-600">{row.email}</td>
                <td className="font-medium text-slate-600">{row.department || '-'}</td>
                <td><span className={`rounded-md ${oliveSoft} px-2 py-1 text-[11px] font-bold ${olive}`}>{row.account_status || 'Active'}</span></td>
              </tr>
            ))}
            {teacherRows.length === 0 && (
              <tr><td className="py-4 text-sm font-semibold text-slate-500" colSpan={5}>No registered teachers found in PostgreSQL.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageCard>
  );

  const renderReports = () => (
    <div className="space-y-5">
      <PageCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle icon={<BarChart3 className="h-5 w-5" />} title="Reports" subtitle="Generate downloadable reports for student progress, quizzes, programming practice, and lesson completion." />
          <PrimaryButton icon={<FileText className="h-4 w-4" />}>Generate Report</PrimaryButton>
        </div>
      </PageCard>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportRows.map(report => (
          <PageCard key={report}>
            <h3 className="text-sm font-extrabold text-slate-950">{report}</h3>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Ready to export as PDF or Excel for administrative review.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SoftButton icon={<Download className="h-3.5 w-3.5" />}>Download PDF</SoftButton>
              <SoftButton icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Download Excel</SoftButton>
            </div>
          </PageCard>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-5 lg:grid-cols-3">
      <PageCard>
        <SectionTitle icon={<Settings className="h-5 w-5" />} title="Admin Profile" subtitle="Basic administrator information." />
        <div className="mt-5 space-y-4">
          <Field label="Admin Name"><input className={inputClass} defaultValue="System Administrator" /></Field>
          <Field label="Email"><input className={inputClass} defaultValue="admin@oophub.edu" /></Field>
          <PrimaryButton icon={<Save className="h-4 w-4" />}>Save</PrimaryButton>
        </div>
      </PageCard>
      <PageCard>
        <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="Change Password" subtitle="Keep admin access protected." />
        <div className="mt-5 space-y-4">
          <Field label="Current Password"><input className={inputClass} type="password" /></Field>
          <Field label="New Password"><input className={inputClass} type="password" /></Field>
          <PrimaryButton icon={<Save className="h-4 w-4" />}>Update Password</PrimaryButton>
        </div>
      </PageCard>
      <PageCard>
        <SectionTitle icon={<BookOpen className="h-5 w-5" />} title="System Information" subtitle="Simple details about the learning system." />
        <dl className="mt-5 space-y-3 text-sm">
          <div><dt className="text-xs font-bold uppercase text-slate-400">System Title</dt><dd className="font-extrabold text-slate-800">OOP Pedagogical Hub</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Purpose</dt><dd className="font-medium text-slate-600">Self-paced OOP learning, assessment, and monitoring</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Primary Color</dt><dd className={`font-bold ${olive}`}>Olive Green</dd></div>
        </dl>
      </PageCard>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0" id={`admin-${activeView}-dashboard`}>
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'videos' && renderVideos()}
      {activeView === 'assessments' && renderAssessments()}
      {activeView === 'practice' && renderPractice()}
      {activeView === 'monitoring' && renderMonitoring()}
      {activeView === 'reports' && renderReports()}
      {activeView === 'settings' && renderSettings()}
    </div>
  );
}
