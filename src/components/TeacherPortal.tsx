import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  Copy,
  Eye,
  FileQuestion,
  GraduationCap,
  LineChart,
  Link,
  Lock,
  MailPlus,
  PlayCircle,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AdaptiveRecommendation, AuthenticatedUser, MonitoringRequest, PendingSubmission, Persona } from '../types';

interface TeacherPortalProps {
  submissions: PendingSubmission[];
  onGradeSubmission: (id: string, grade: number, feedback: string) => void;
  onSelectPersona: (persona: Persona) => void;
  currentUser: AuthenticatedUser;
  monitoringRequests: MonitoringRequest[];
  onSendRequest: (studentEmailOrId: string) => Promise<{ success: boolean; message: string }>;
  onRemoveConnection: (requestId: string) => void;
  onReopenSubmission?: (id: string) => void;
  theme?: 'light' | 'dark';
  recommendationHistory?: AdaptiveRecommendation[];
}

type TeacherTab = 'monitoring' | 'invitations' | 'topics' | 'swing' | 'assessments' | 'ide' | 'analytics' | 'architecture';
type LearningStage = 'Lesson' | 'Watch Video' | 'Assessment' | 'Practice IDE' | 'Automatic Grading' | 'Adaptive Recommendation' | 'Unlock Next Topic';
type LearningStatus = 'In Progress' | 'Completed' | 'Mastered' | 'Needs Improvement' | 'At Risk';

type TopicProgress = {
  topic: string;
  video: number;
  assessment: number;
  ideStatus: string;
  completion: number;
  unlocked: boolean;
  timeSpent: string;
};

type LiveStudent = {
  id: string;
  name: string;
  email: string;
  section: string;
  online: boolean;
  activity: string;
  currentLesson: string;
  currentTopic: string;
  swingLesson: string;
  stage: LearningStage;
  overallProgress: number;
  moduleProgress: number;
  topicProgress: number;
  videoCompletion: number;
  quizScore: number;
  practiceScore: number;
  challengesCompleted: number;
  performanceIndex: number;
  learningStatus: LearningStatus;
  lastActivity: string;
  moduleCompletion: number;
  topicCompletion: number;
  recommendation: string;
  topics: TopicProgress[];
  swing: {
    video: number;
    assessment: number;
    ide: number;
    miniProject: number;
  };
};

type TeacherNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'invitation' | 'lesson' | 'assessment' | 'ide' | 'unlock';
};

const OOP_TOPICS = [
  'Classes and Objects',
  'Constructors',
  'Methods and Parameters',
  'Encapsulation',
  'Inheritance',
  'Polymorphism',
  'Abstraction',
  'Interfaces',
  'Exception Handling',
  'Collections and Generics',
  'File I/O and Serialization'
];

const ACTIVITY_ROTATION = [
  'Watching video',
  'Taking assessment',
  'Solving Practice IDE',
  'Reviewing adaptive lesson',
  'Reading current lesson',
  'Awaiting next unlock'
];

const STAGE_ROTATION: LearningStage[] = [
  'Lesson',
  'Watch Video',
  'Assessment',
  'Practice IDE',
  'Automatic Grading',
  'Adaptive Recommendation',
  'Unlock Next Topic'
];

const getStudentEmailByName = (name: string): string => {
  const normalized = name.replace(/\s*\(you\)/i, '').trim().toLowerCase();
  if (normalized.includes('alex mercer') || normalized.includes('dmitry vance') || normalized.includes('dmitry')) return 'dmitry@oophub.edu';
  if (normalized.includes('sofia') || normalized.includes('rodriguez')) return 'rodriguez@oophub.edu';
  if (normalized.includes('volkov')) return 'volkov@oophub.edu';
  if (normalized.includes('chen')) return 'chen@oophub.edu';
  if (normalized.includes('rossi')) return 'rossi@oophub.edu';
  if (normalized.includes('hughes')) return 'hughes@oophub.edu';
  return normalized;
};

const baseStudents: LiveStudent[] = [
  {
    id: 'STU-0001',
    name: 'Dmitry Vance',
    email: 'dmitry@oophub.edu',
    section: 'CS-3A',
    online: true,
    activity: 'Solving Practice IDE',
    currentLesson: 'Inheritance: Vehicle Superclass',
    currentTopic: 'Inheritance',
    swingLesson: 'JFrame and component tree',
    stage: 'Practice IDE',
    overallProgress: 64,
    moduleProgress: 70,
    topicProgress: 78,
    videoCompletion: 92,
    quizScore: 82,
    practiceScore: 75,
    challengesCompleted: 8,
    performanceIndex: 79,
    learningStatus: 'In Progress',
    lastActivity: 'just now',
    moduleCompletion: 70,
    topicCompletion: 78,
    recommendation: 'Complete one more subclass override exercise before unlocking polymorphism.',
    topics: [],
    swing: { video: 55, assessment: 42, ide: 30, miniProject: 15 }
  },
  {
    id: 'STU-0002',
    name: 'Sofia Rodriguez',
    email: 'rodriguez@oophub.edu',
    section: 'CS-3B',
    online: true,
    activity: 'Watching video',
    currentLesson: 'Polymorphism and dynamic dispatch',
    currentTopic: 'Polymorphism',
    swingLesson: 'Layout managers',
    stage: 'Watch Video',
    overallProgress: 86,
    moduleProgress: 88,
    topicProgress: 90,
    videoCompletion: 100,
    quizScore: 94,
    practiceScore: 91,
    challengesCompleted: 14,
    performanceIndex: 93,
    learningStatus: 'Mastered',
    lastActivity: '1 min ago',
    moduleCompletion: 88,
    topicCompletion: 90,
    recommendation: 'Ready for advanced interface-driven mini project.',
    topics: [],
    swing: { video: 82, assessment: 88, ide: 76, miniProject: 64 }
  },
  {
    id: 'STU-0003',
    name: 'Dmitry Volkov',
    email: 'volkov@oophub.edu',
    section: 'IT-2A',
    online: false,
    activity: 'Offline',
    currentLesson: 'Constructors and object state',
    currentTopic: 'Constructors',
    swingLesson: 'Not started',
    stage: 'Adaptive Recommendation',
    overallProgress: 35,
    moduleProgress: 42,
    topicProgress: 38,
    videoCompletion: 61,
    quizScore: 58,
    practiceScore: 52,
    challengesCompleted: 3,
    performanceIndex: 56,
    learningStatus: 'At Risk',
    lastActivity: '34 min ago',
    moduleCompletion: 42,
    topicCompletion: 38,
    recommendation: 'Review constructors lesson and assign remedial Practice IDE exercise.',
    topics: [],
    swing: { video: 0, assessment: 0, ide: 0, miniProject: 0 }
  },
  {
    id: 'STU-0004',
    name: 'J. Chen',
    email: 'chen@oophub.edu',
    section: 'COE-4A',
    online: true,
    activity: 'Taking assessment',
    currentLesson: 'Interfaces and contracts',
    currentTopic: 'Interfaces',
    swingLesson: 'Event listeners',
    stage: 'Assessment',
    overallProgress: 74,
    moduleProgress: 80,
    topicProgress: 68,
    videoCompletion: 87,
    quizScore: 79,
    practiceScore: 83,
    challengesCompleted: 10,
    performanceIndex: 81,
    learningStatus: 'Completed',
    lastActivity: '3 min ago',
    moduleCompletion: 80,
    topicCompletion: 68,
    recommendation: 'Unlock exception handling after current assessment attempt.',
    topics: [],
    swing: { video: 70, assessment: 66, ide: 60, miniProject: 45 }
  },
  {
    id: 'STU-0005',
    name: 'Elena Rossi',
    email: 'rossi@oophub.edu',
    section: 'CS-3A',
    online: false,
    activity: 'Offline',
    currentLesson: 'Encapsulation and access modifiers',
    currentTopic: 'Encapsulation',
    swingLesson: 'JPanel composition',
    stage: 'Lesson',
    overallProgress: 52,
    moduleProgress: 56,
    topicProgress: 49,
    videoCompletion: 77,
    quizScore: 71,
    practiceScore: 62,
    challengesCompleted: 5,
    performanceIndex: 68,
    learningStatus: 'Needs Improvement',
    lastActivity: '2 hr ago',
    moduleCompletion: 56,
    topicCompletion: 49,
    recommendation: 'Recommend private fields and accessor methods review.',
    topics: [],
    swing: { video: 35, assessment: 25, ide: 18, miniProject: 0 }
  },
  {
    id: 'STU-0006',
    name: 'Liam Hughes',
    email: 'hughes@oophub.edu',
    section: 'IT-3B',
    online: true,
    activity: 'Reading current lesson',
    currentLesson: 'Abstraction and abstract classes',
    currentTopic: 'Abstraction',
    swingLesson: 'Basic controls',
    stage: 'Lesson',
    overallProgress: 58,
    moduleProgress: 62,
    topicProgress: 60,
    videoCompletion: 80,
    quizScore: 76,
    practiceScore: 70,
    challengesCompleted: 7,
    performanceIndex: 74,
    learningStatus: 'In Progress',
    lastActivity: '5 min ago',
    moduleCompletion: 62,
    topicCompletion: 60,
    recommendation: 'Proceed to abstraction assessment after video completion.',
    topics: [],
    swing: { video: 48, assessment: 44, ide: 32, miniProject: 12 }
  }
];

const withTopicProgress = (student: LiveStudent, studentIndex: number): LiveStudent => ({
  ...student,
  topics: OOP_TOPICS.map((topic, index) => {
    const completion = Math.max(0, Math.min(100, student.overallProgress + (studentIndex * 4) - index * 7 + 18));
    const unlocked = index <= Math.floor(student.overallProgress / 12);
    return {
      topic,
      video: unlocked ? Math.min(100, completion + 8) : 0,
      assessment: unlocked ? Math.max(0, completion - 4) : 0,
      ideStatus: !unlocked ? 'Locked' : completion >= 80 ? 'Passed' : completion >= 55 ? 'In Review' : 'Needs Work',
      completion,
      unlocked,
      timeSpent: unlocked ? `${2 + ((index + studentIndex) % 5)}h ${10 + index * 3}m` : '--'
    };
  })
});

const initialStudents = baseStudents.map(withTopicProgress);

const statusClass = (status: LearningStatus) => {
  if (status === 'Mastered') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Needs Improvement') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'At Risk') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const teacherScopedCode = (email: string) => {
  const seed = email.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `TEA-${String(seed).slice(-4)}-OOP`;
};

export default function TeacherPortal({
  submissions,
  onGradeSubmission,
  currentUser,
  monitoringRequests,
  onSendRequest,
  onRemoveConnection,
  onReopenSubmission,
  theme,
  recommendationHistory = []
}: TeacherPortalProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<TeacherTab>('monitoring');
  const [students, setStudents] = useState<LiveStudent[]>(initialStudents);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0]?.id ?? '');
  const [studentInput, setStudentInput] = useState('');
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [scoreText, setScoreText] = useState(90);
  const [notifications, setNotifications] = useState<TeacherNotification[]>([
    {
      id: 'n1',
      title: 'Practice IDE submitted',
      message: 'Dmitry Vance submitted Vehicle Subclass Override for automatic grading.',
      timestamp: 'just now',
      type: 'ide'
    },
    {
      id: 'n2',
      title: 'Topic unlocked',
      message: 'Sofia Rodriguez unlocked Interfaces after passing polymorphism requirements.',
      timestamp: '4 min ago',
      type: 'unlock'
    },
    {
      id: 'n3',
      title: 'Assessment alert',
      message: 'Dmitry Volkov scored below threshold and received a review recommendation.',
      timestamp: '12 min ago',
      type: 'assessment'
    }
  ]);

  const acceptedEmails = useMemo(
    () =>
      monitoringRequests
        .filter(req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase() && req.status === 'accepted')
        .map(req => req.studentEmail.toLowerCase()),
    [currentUser.email, monitoringRequests]
  );

  const teacherRequests = monitoringRequests.filter(req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase());
  const pendingRequests = teacherRequests.filter(req => req.status === 'pending');

  const connectedStudents = students.filter(student => acceptedEmails.includes(student.email.toLowerCase()));
  const visibleStudents = connectedStudents.length > 0 ? connectedStudents : students.slice(0, 4);
  const selectedStudent = visibleStudents.find(student => student.id === selectedStudentId) ?? visibleStudents[0];
  const visibleStudentKeys = visibleStudents.flatMap(student => [student.id, student.email, student.name]);
  const visibleRecommendations = recommendationHistory.filter(item =>
    visibleStudentKeys.includes(item.studentId) ||
    (item.studentName ? visibleStudentKeys.includes(item.studentName) : false)
  );
  const remedialCounts = visibleRecommendations
    .filter(item => item.type === 'Remedial')
    .reduce<Record<string, number>>((acc, item) => {
      const key = item.studentName || item.studentId;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const repeatedRemedialStudents = Object.entries(remedialCounts).filter(([, count]) => count >= 2);

  const visibleSubmissions = submissions.filter(sub => {
    const studentEmail = sub.studentEmail || getStudentEmailByName(sub.studentName);
    return acceptedEmails.includes(studentEmail.toLowerCase());
  });

  const filteredSubmissions = visibleSubmissions.filter(sub => {
    const score = Number(sub.score ?? sub.grade ?? 0);
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.challengeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Passed' && score >= 70) ||
      (statusFilter === 'Failed' && score < 70) ||
      (statusFilter === 'Pending' && sub.status === 'pending');
    return matchesSearch && matchesStatus;
  });

  const selectedSubmission =
    filteredSubmissions.find(sub => sub.id === selectedSubId) ??
    filteredSubmissions.find(sub => sub.status === 'pending') ??
    filteredSubmissions[0];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStudents(prev =>
        prev.map((student, index) => {
          if (!student.online) return student;
          const bump = index % 2 === 0 ? 1 : 2;
          const nextStage = STAGE_ROTATION[(STAGE_ROTATION.indexOf(student.stage) + 1) % STAGE_ROTATION.length];
          const nextActivity = ACTIVITY_ROTATION[(ACTIVITY_ROTATION.indexOf(student.activity) + 1 + index) % ACTIVITY_ROTATION.length] || 'Learning activity';
          const nextProgress = Math.min(100, student.overallProgress + bump);
          const nextQuiz = Math.min(100, student.quizScore + (nextStage === 'Assessment' ? 1 : 0));
          const nextPractice = Math.min(100, student.practiceScore + (nextStage === 'Practice IDE' ? 1 : 0));
          const nextIndex = Math.round(nextQuiz * 0.35 + nextPractice * 0.4 + nextProgress * 0.25);
          const nextStatus: LearningStatus =
            nextIndex >= 90 ? 'Mastered' : nextIndex >= 80 ? 'Completed' : nextIndex >= 70 ? 'In Progress' : nextIndex >= 60 ? 'Needs Improvement' : 'At Risk';
          return withTopicProgress(
            {
              ...student,
              activity: nextActivity,
              stage: nextStage,
              overallProgress: nextProgress,
              moduleProgress: Math.min(100, student.moduleProgress + bump),
              topicProgress: Math.min(100, student.topicProgress + bump),
              topicCompletion: Math.min(100, student.topicCompletion + bump),
              moduleCompletion: Math.min(100, student.moduleCompletion + bump),
              quizScore: nextQuiz,
              practiceScore: nextPractice,
              performanceIndex: nextIndex,
              learningStatus: nextStatus,
              lastActivity: 'just now'
            },
            index
          );
        })
      );

      setNotifications(prev => {
        const sample = visibleStudents[0];
        if (!sample) return prev;
        const next: TeacherNotification = {
          id: `live-${Date.now()}`,
          title: 'Live learning update',
          message: `${sample.name} advanced to ${sample.stage} in ${sample.currentTopic}.`,
          timestamp: 'now',
          type: 'lesson'
        };
        return [next, ...prev].slice(0, 6);
      });
    }, 9000);

    return () => window.clearInterval(interval);
  }, [visibleStudents]);

  useEffect(() => {
    if (!selectedSubmission) return;
    setSelectedSubId(selectedSubmission.id);
    setCommentText(selectedSubmission.feedback || '');
    setScoreText(Number(selectedSubmission.grade ?? selectedSubmission.score ?? 90));
  }, [selectedSubmission?.id]);

  const handleSendRequestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentInput.trim()) return;
    setIsSendingInvite(true);
    try {
      const res = await onSendRequest(studentInput.trim());
      setRequestFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      if (res.success) setStudentInput('');
      window.setTimeout(() => setRequestFeedback(null), 5000);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyInvitation = async () => {
    const linkValue = `${window.location.origin}/invite/${teacherScopedCode(currentUser.email)}`;
    try {
      await navigator.clipboard.writeText(linkValue);
      setRequestFeedback({ type: 'success', message: 'Invitation link copied to clipboard.' });
    } catch {
      setRequestFeedback({ type: 'success', message: `Invitation code: ${teacherScopedCode(currentUser.email)}` });
    }
  };

  const handlePostGrade = () => {
    if (!selectedSubmission) return;
    if (scoreText < 0 || scoreText > 100) {
      alert('Please enter a grade score between 0 and 100.');
      return;
    }
    if (!commentText.trim()) {
      alert('Please include teacher feedback before posting.');
      return;
    }
    onGradeSubmission(selectedSubmission.id, scoreText, commentText);
    const gradeNotification: TeacherNotification = {
      id: `grade-${Date.now()}`,
      title: 'Grade published',
      message: `${selectedSubmission.studentName} received ${scoreText}% and adaptive feedback.`,
      timestamp: 'now',
      type: 'ide'
    };
    setNotifications(prev => [gradeNotification, ...prev].slice(0, 6));
  };

  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
  const averageQuiz = avg(visibleStudents.map(student => student.quizScore));
  const averagePractice = avg(visibleStudents.map(student => student.practiceScore));
  const averagePerformance = avg(visibleStudents.map(student => student.performanceIndex));
  const videoCompletionRate = avg(visibleStudents.map(student => student.videoCompletion));
  const completionRate = avg(visibleStudents.map(student => student.overallProgress));
  const atRiskStudents = visibleStudents.filter(student => student.learningStatus === 'At Risk' || student.learningStatus === 'Needs Improvement');
  const mostSuccessfulStudent = [...visibleStudents].sort((a, b) => b.performanceIndex - a.performanceIndex)[0];
  const mostDifficultTopic = OOP_TOPICS.map(topic => ({
    topic,
    avg: avg(visibleStudents.map(student => student.topics.find(item => item.topic === topic)?.completion ?? 0))
  })).sort((a, b) => a.avg - b.avg)[0];

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const mutedPanel = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-emerald-50/20 border-emerald-100/50';

  return (
    <div className={`space-y-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="teacher-portal-root">
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">Teacher Account Module</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Real-Time OOP Learning Command Center</h2>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500">
              Monitor invited students only, track adaptive learning events, review Practice IDE evidence, and follow each learner from lesson to unlock.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[520px]">
            {[
              ['Connected', visibleStudents.length],
              ['Online', visibleStudents.filter(student => student.online).length],
              ['At Risk', atRiskStudents.length],
              ['Avg PI', `${averagePerformance}%`]
            ].map(([label, value]) => (
              <div key={label} className={`rounded-xl border p-3 ${mutedPanel}`}>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                <strong className="mt-1 block font-mono text-lg">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-2xl border p-2 shadow-sm ${cardClass}`}>
        <div className="flex min-w-max gap-1">
          {[
            ['monitoring', 'Live Monitoring', Activity],
            ['invitations', 'Invitations', MailPlus],
            ['topics', '11 OOP Topics', BookOpen],
            ['swing', 'Java Swing', PlayCircle],
            ['assessments', 'Assessments', FileQuestion],
            ['ide', 'Practice IDE', Code2],
            ['analytics', 'Analytics', BarChart3],
            ['architecture', 'Data Model', Lock]
          ].map(([id, label, Icon]) => {
            const TabIcon = Icon as typeof Activity;
            return (
              <button
                key={id as string}
                type="button"
                onClick={() => setActiveTab(id as TeacherTab)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                  activeTab === id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {label as string}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'monitoring' && selectedStudent && (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr_320px]">
          <div className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">Connected Students</h3>
                <p className="text-[11px] text-slate-500">Teacher-scoped live roster</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{visibleStudents.length} visible</span>
            </div>
            <div className="space-y-2">
              {visibleStudents.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedStudent.id === student.id
                      ? 'border-emerald-500 bg-emerald-50/40'
                      : isDark
                        ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{student.name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{student.section} | {student.email}</p>
                    </div>
                    {student.online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${student.overallProgress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>{student.activity}</span>
                    <span>{student.overallProgress}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black">{selectedStudent.name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusClass(selectedStudent.learningStatus)}`}>
                    {selectedStudent.learningStatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{selectedStudent.currentLesson} | {selectedStudent.currentTopic}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-xs font-black text-emerald-700">
                <Sparkles className="h-4 w-4" />
                {selectedStudent.stage}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Overall Progress', selectedStudent.overallProgress],
                ['Module Progress', selectedStudent.moduleProgress],
                ['Topic Progress', selectedStudent.topicProgress],
                ['Video Completion', selectedStudent.videoCompletion],
                ['Quiz Score', selectedStudent.quizScore],
                ['Practice IDE Score', selectedStudent.practiceScore],
                ['Performance Index', selectedStudent.performanceIndex],
                ['Topic Completion', selectedStudent.topicCompletion]
              ].map(([label, value]) => (
                <div key={label as string} className={`rounded-xl border p-3 ${mutedPanel}`}>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>{label as string}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Rule-Based Adaptive Learning</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{selectedStudent.recommendation}</p>
              <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                {['Save activity', 'Run adaptive rules', 'Update PI', 'Push live dashboard'].map(step => (
                  <div key={step} className="flex items-center gap-2 rounded-xl bg-white p-2 font-bold text-slate-600 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recommendation History</p>
                  <h4 className="mt-1 text-sm font-black text-slate-900">Current Rule-Based Recommendations</h4>
                </div>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700">
                  {repeatedRemedialStudents.length} repeated remedial
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {visibleRecommendations.slice(0, 4).map(item => (
                  <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-900">{item.studentName || item.studentId}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.lessonTitle} | {item.reason}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        item.type === 'Remedial' ? 'bg-rose-100 text-rose-700' : item.type === 'Continue' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-[10px] font-bold text-slate-500 sm:grid-cols-3">
                      <span>Trigger: {item.trigger}</span>
                      <span>Status: {item.status}</span>
                      <span>Generated: {new Date(item.generatedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {visibleRecommendations.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">
                    No generated recommendation records for visible students yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-7 bg-emerald-50/20 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {STAGE_ROTATION.map(stage => <span key={stage} className="text-center">{stage}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1 p-3">
                {STAGE_ROTATION.map(stage => (
                  <div key={stage} className={`h-2 rounded-full ${stage === selectedStudent.stage ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black">Real-Time Notifications</h3>
              <Bell className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              {notifications.map(note => (
                <div key={note.id} className={`rounded-xl border p-3 ${mutedPanel}`}>
                  <p className="text-xs font-black">{note.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{note.message}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">{note.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Invitation System</h3>
            <p className="mt-1 text-xs text-slate-500">Teachers can monitor only students who accept this teacher-scoped invitation.</p>
            <div className={`mt-5 rounded-2xl border p-4 ${mutedPanel}`}>
              <p className="text-[10px] font-black uppercase text-slate-400">Invitation Code</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
                <span className="font-mono text-lg font-black text-emerald-700">{teacherScopedCode(currentUser.email)}</span>
                <button type="button" onClick={handleCopyInvitation} className="rounded-lg bg-emerald-600 p-2 text-white">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">Invite link: /invite/{teacherScopedCode(currentUser.email)}</p>
            </div>
            <form onSubmit={handleSendRequestSubmit} className="mt-5 space-y-3">
              <label className="text-xs font-black text-slate-700">Send direct invitation by email or student ID</label>
              <div className="flex gap-2">
                <input
                  value={studentInput}
                  onChange={event => setStudentInput(event.target.value)}
                  placeholder="student@oophub.edu or STU-0001"
                  className={`min-h-11 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-emerald-600 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                />
                <button type="submit" disabled={isSendingInvite} className="rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {isSendingInvite ? 'Checking...' : 'Invite'}
                </button>
              </div>
            </form>
            {requestFeedback && (
              <div className={`mt-3 rounded-xl border p-3 text-xs font-bold ${requestFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                {requestFeedback.message}
              </div>
            )}
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Access Control</h3>
            <p className="mt-1 text-xs text-slate-500">Only accepted invitations appear in monitoring and grading views.</p>
            <div className="mt-4 space-y-2">
              {teacherRequests.length === 0 ? (
                <div className={`rounded-xl border p-8 text-center text-xs text-slate-500 ${mutedPanel}`}>No invitation records yet.</div>
              ) : (
                teacherRequests.map(req => (
                  <div key={req.id} className={`flex items-center justify-between rounded-xl border p-3 ${mutedPanel}`}>
                    <div>
                      <p className="text-xs font-black">{req.studentName}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{req.studentEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${req.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : req.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                        {req.status}
                      </span>
                      {req.status === 'accepted' && (
                        <button type="button" onClick={() => onRemoveConnection(req.id)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {pendingRequests.length > 0 && <p className="text-[11px] font-semibold text-slate-500">{pendingRequests.length} student invitation awaiting acceptance.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'topics' && selectedStudent && (
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black">11 Java OOP Topics Progress</h3>
              <p className="text-xs text-slate-500">Topic-level video, assessment, IDE, unlock, and time-spent monitoring for {selectedStudent.name}.</p>
            </div>
            <select value={selectedStudent.id} onChange={event => setSelectedStudentId(event.target.value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
              {visibleStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="bg-emerald-50/20 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3">Topic</th>
                  <th className="px-3 py-3">Video</th>
                  <th className="px-3 py-3">Assessment</th>
                  <th className="px-3 py-3">Practice IDE</th>
                  <th className="px-3 py-3">Completion</th>
                  <th className="px-3 py-3">Unlock</th>
                  <th className="px-3 py-3">Time Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedStudent.topics.map(topic => (
                  <tr key={topic.topic} className={isDark ? 'divide-slate-800' : ''}>
                    <td className="px-3 py-3 font-black">{topic.topic}</td>
                    <td className="px-3 py-3">{topic.video}%</td>
                    <td className="px-3 py-3">{topic.assessment}%</td>
                    <td className="px-3 py-3">{topic.ideStatus}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${topic.completion}%` }} />
                        </div>
                        <span className="font-mono font-bold">{topic.completion}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{topic.unlocked ? <UserCheck className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-slate-400" />}</td>
                    <td className="px-3 py-3 font-mono text-slate-500">{topic.timeSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'swing' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {visibleStudents.map(student => (
            <div key={student.id} className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-black">{student.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">Current Swing Lesson: {student.swingLesson}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Swing Track</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Video Completion', student.swing.video],
                  ['Swing Assessment', student.swing.assessment],
                  ['Swing IDE Progress', student.swing.ide],
                  ['Mini Project Completion', student.swing.miniProject]
                ].map(([label, value]) => (
                  <div key={label as string} className={`rounded-xl border p-3 ${mutedPanel}`}>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                      <span>{label as string}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <h3 className="text-base font-black">Assessment Monitoring</h3>
          <p className="mt-1 text-xs text-slate-500">Attempts, score ranges, question analysis, and completion time for connected students.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {visibleStudents.map(student => {
              const incorrect = Math.max(1, Math.round((100 - student.quizScore) / 8));
              const correct = 25 - incorrect;
              return (
                <div key={student.id} className={`rounded-2xl border p-4 ${mutedPanel}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black">{student.name}</p>
                      <p className="text-[11px] text-slate-500">{student.currentTopic} assessment history</p>
                    </div>
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {[
                      ['Attempts', 2 + (student.quizScore % 3)],
                      ['Highest', `${Math.min(100, student.quizScore + 8)}%`],
                      ['Average', `${student.quizScore}%`],
                      ['Lowest', `${Math.max(0, student.quizScore - 14)}%`],
                      ['Correct', correct],
                      ['Incorrect', incorrect],
                      ['Completion', `${18 + (student.quizScore % 10)} min`],
                      ['Status', student.quizScore >= 70 ? 'Passed' : 'Review']
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl bg-white p-2 shadow-sm">
                        <span className="block text-[9px] font-black uppercase text-slate-400">{label as string}</span>
                        <strong className="mt-1 block">{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ide' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-black">Practice IDE Monitoring</h3>
                <p className="text-xs text-slate-500">Student code, compilation, runtime, outputs, test cases, grades, and feedback.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search submissions" className={`h-10 rounded-xl border pl-9 pr-3 text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`} />
                </div>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={`h-10 rounded-xl border px-3 text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <option>All</option>
                  <option>Pending</option>
                  <option>Passed</option>
                  <option>Failed</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {filteredSubmissions.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center text-xs text-slate-500 ${mutedPanel}`}>
                  No visible submissions. Invite and connect students before reviewing their Practice IDE work.
                </div>
              ) : (
                filteredSubmissions.map(sub => {
                  const score = Number(sub.score ?? sub.grade ?? 0);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubId(sub.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedSubmission?.id === sub.id ? 'border-emerald-650 bg-emerald-50/40' : isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black">{sub.studentName}</p>
                          <p className="mt-1 text-xs font-bold text-slate-600">{sub.challengeName}</p>
                          <p className="mt-1 text-[10px] font-mono text-slate-400">{sub.topicTitle || 'Practice IDE'} | {sub.compileStatus || 'not_run'} | {sub.submittedAt}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {sub.status === 'pending' ? 'Needs Review' : `${score}%`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl">
            {selectedSubmission ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-550">Submission Inspector</p>
                    <h3 className="mt-1 text-sm font-black">{selectedSubmission.studentName}</h3>
                    <p className="text-[11px] text-slate-400">{selectedSubmission.challengeName}</p>
                  </div>
                  <Eye className="h-5 w-5 text-emerald-500" />
                </div>
                <pre className="max-h-52 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">{selectedSubmission.code}</pre>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    ['Compile', selectedSubmission.compileStatus || 'not_run'],
                    ['Runtime', selectedSubmission.runtime ? `${selectedSubmission.runtime} ms` : '--'],
                    ['Memory', selectedSubmission.memoryUsage ? `${selectedSubmission.memoryUsage} MB` : '--']
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-2">
                      <span className="block text-[9px] font-black uppercase text-slate-500">{label}</span>
                      <strong className="mt-1 block text-[10px]">{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[9px] font-black uppercase text-slate-500">Program Output</p>
                    <pre className="min-h-20 rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] text-slate-300">{selectedSubmission.programOutput || 'No output captured.'}</pre>
                  </div>
                  <div>
                    <p className="mb-1 text-[9px] font-black uppercase text-slate-500">Expected / Errors</p>
                    <pre className="min-h-20 rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] text-slate-300">{selectedSubmission.errorMessage || 'Expected output matched by test cases.'}</pre>
                  </div>
                </div>
                <div className="space-y-1">
                  {(selectedSubmission.testResults ?? []).map(test => (
                    <div key={test.id} className={`flex justify-between rounded-lg border px-2 py-1 text-[10px] font-bold ${test.passed ? 'border-emerald-900 bg-emerald-950/30 text-emerald-300' : 'border-rose-900 bg-rose-950/30 text-rose-300'}`}>
                      <span>{test.isHidden ? 'Hidden' : 'Sample'} test {test.id}</span>
                      <span>{test.passed ? 'Passed' : 'Failed'}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <input type="number" min="0" max="100" value={scoreText} onChange={event => setScoreText(parseInt(event.target.value) || 0)} className="w-28 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs font-black outline-none focus:border-emerald-500" />
                  <textarea value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Teacher feedback and adaptive remediation notes..." className="h-20 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs outline-none focus:border-emerald-500" />
                  <div className="flex gap-2">
                    {onReopenSubmission && <button type="button" onClick={() => onReopenSubmission(selectedSubmission.id)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black">Reopen</button>}
                    <button type="button" onClick={handlePostGrade} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">Post Grade & Feedback</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[440px] items-center justify-center text-center text-xs text-slate-500">Select a submission to inspect source code and grading details.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Learning Analytics</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Average Quiz Score', `${averageQuiz}%`],
                ['Average Practice IDE Score', `${averagePractice}%`],
                ['Video Completion Rate', `${videoCompletionRate}%`],
                ['Performance Index', `${averagePerformance}%`],
                ['Most Difficult Topic', mostDifficultTopic?.topic || '--'],
                ['Most Successful Student', mostSuccessfulStudent?.name || '--'],
                ['Students At Risk', atRiskStudents.length],
                ['Learning Completion Rate', `${completionRate}%`],
                ['Programming Success Rate', `${avg(visibleStudents.map(student => student.practiceScore >= 70 ? 100 : 0))}%`],
                ['Most Failed Topic', mostDifficultTopic?.topic || '--']
              ].map(([label, value]) => (
                <div key={label} className={`rounded-xl border p-3 ${mutedPanel}`}>
                  <span className="block text-[9px] font-black uppercase text-slate-400">{label}</span>
                  <strong className="mt-1 block text-sm">{value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Weekly and Monthly Progress</h3>
            <div className="mt-5 space-y-4">
              {[
                ['Week 1', 54],
                ['Week 2', 62],
                ['Week 3', 73],
                ['Week 4', completionRate],
                ['Month Target', 88]
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span>{label as string}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Event-Driven Workflow</h3>
            <div className="mt-4 space-y-2">
              {[
                'Student activity is saved to PostgreSQL.',
                'Rule-based adaptive learning algorithm runs immediately.',
                'Performance index and learning status are recalculated.',
                'Next lesson, assessment, or Practice IDE activity is locked or unlocked.',
                'Socket.IO pushes live updates to teacher dashboards.',
                'Teacher receives a real-time notification.'
              ].map((step, index) => (
                <div key={step} className={`flex items-center gap-3 rounded-xl border p-3 ${mutedPanel}`}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">{index + 1}</span>
                  <p className="text-xs font-bold">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Normalized Tables</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[
                'teachers',
                'students',
                'teacher_students',
                'invitations',
                'lesson_progress',
                'assessments',
                'practice_ide',
                'submissions',
                'notifications',
                'analytics',
                'performance_indexes',
                'adaptive_recommendations'
              ].map(table => (
                <div key={table} className={`rounded-xl border p-3 font-mono font-bold ${mutedPanel}`}>{table}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {visibleStudents.length === 0 && (
        <div className={`rounded-2xl border p-10 text-center shadow-sm ${cardClass}`}>
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <h3 className="mt-3 text-base font-black">No Connected Students</h3>
          <p className="mt-1 text-xs text-slate-500">Generate an invitation code or send an invite before monitoring student progress.</p>
          <button type="button" onClick={() => setActiveTab('invitations')} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">
            Open Invitations
          </button>
        </div>
      )}
    </div>
  );
}
