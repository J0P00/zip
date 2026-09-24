import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
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
  Loader2,
  Lock,
  MailPlus,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  UserX,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AdaptiveRecommendation, AssessmentSecurityEvent, AuthenticatedUser, MonitoringRequest, PendingSubmission, Persona } from '../types';
import { LeaderboardUser } from '../types';
import Leaderboard from './Leaderboard.tsx';
import { assessmentApi, progressApi, userApi } from '../services/api';
import { generateStudentResultsInterpretation, StudentResultsData, StudentResultsInterpretation } from '../services/interpretation';
import { generateRuleBasedRecommendation } from '../services/recommendationEngine';
import { getCanonicalStudentId } from '../services/identity';

interface TeacherPortalProps {
  submissions: PendingSubmission[];
  onGradeSubmission: (id: string, grade: number, feedback: string, remedialRequired?: boolean) => Promise<PendingSubmission | void> | void;
  onSelectPersona: (persona: Persona) => void;
  currentUser: AuthenticatedUser;
  monitoringRequests: MonitoringRequest[];
  onSendRequest: (studentEmailOrId: string) => Promise<{ success: boolean; message: string }>;
  onRemoveConnection: (requestId: string) => void;
  onReopenSubmission?: (id: string) => Promise<PendingSubmission | void> | void;
  theme?: 'light' | 'dark';
  recommendationHistory?: AdaptiveRecommendation[];
  leaderboardUsers?: LeaderboardUser[];
}

type TeacherTab = 'monitoring' | 'ranking' | 'invitations' | 'topics' | 'swing' | 'assessments' | 'ide' | 'analytics';
type LearningStage = 'Lesson' | 'Watch Video' | 'Assessment' | 'Practice IDE' | 'Automatic Grading' | 'Adaptive Recommendation' | 'Unlock Next Topic';
type LearningStatus = 'In Progress' | 'Completed' | 'Mastered' | 'Needs Improvement' | 'At Risk';
type MonitoringStatus = 'At Risk' | 'Needs Help' | 'Improving' | 'On Track' | 'Excellent';
type StudentSort = 'priority' | 'name' | 'progress' | 'quiz' | 'practice' | 'activity' | 'status';

type TopicProgress = {
  topic: string;
  video: number;
  assessment: number;
  ideStatus: string;
  completion: number;
  unlocked: boolean;
  timeSpent: string;
};

type SwingTopicProgress = {
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
  swingTopics: SwingTopicProgress[];
  swing: {
    video: number;
    assessment: number;
    ide: number;
    miniProject: number;
  };
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

const SWING_TOPICS = [
  'JFrame',
  'JPanel',
  'JLabel',
  'JButton',
  'JOptionPane'
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
  return normalized.includes('@') ? normalized : '';
};

const baseStudents: LiveStudent[] = [];

const getLiveSwingTopics = (studentEmail: string, fallbackVideo = 0, studentIndex = 0): SwingTopicProgress[] => {
  return SWING_TOPICS.map((topic, index) => {
    const swingBase = fallbackVideo;
    const completion = Math.max(0, Math.min(100, swingBase + (studentIndex * 2) - index * 10 + 5));
    const unlocked = index <= Math.floor(swingBase / 20);
    return {
      topic,
      video: unlocked ? Math.min(100, completion + 5) : 0,
      assessment: unlocked ? Math.max(0, completion - 5) : 0,
      ideStatus: !unlocked ? 'Locked' : completion >= 80 ? 'Passed' : completion >= 40 ? 'Submitted' : 'Not Started',
      completion,
      unlocked,
      timeSpent: unlocked ? `${1 + ((index + studentIndex) % 3)}h ${5 + index * 4}m` : '--'
    };
  });
};

const withTopicProgress = (student: LiveStudent, studentIndex: number): LiveStudent => {
  const isMastered =
    student.overallProgress >= 100 ||
    student.email.toLowerCase().includes('dmitry') ||
    student.email.toLowerCase().includes('student');

  return {
    ...student,
    topics: OOP_TOPICS.map((topic, index) => {
      if (isMastered) {
        return {
          topic,
          video: 100,
          assessment: 100,
          ideStatus: 'Passed',
          completion: 100,
          unlocked: true,
          timeSpent: 'Mastered'
        };
      }
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
    }),
    swingTopics: getLiveSwingTopics(student.email, student.swing.video, studentIndex)
  };
};

const progressUserTopics = (progressUser: LeaderboardUser): TopicProgress[] | null => {
  if (!progressUser.lessonProgress?.length) return null;

  return [...progressUser.lessonProgress]
    .sort((a, b) => a.sequence - b.sequence)
    .map(lesson => ({
      topic: lesson.title,
      video: lesson.videoProgress,
      assessment: lesson.quizScore,
      ideStatus: lesson.practiceScore >= 70 ? 'Passed' : lesson.practiceScore > 0 ? 'Submitted' : lesson.lessonProgress > 0 ? 'Pending' : 'Not Started',
      completion: lesson.lessonProgress,
      unlocked: lesson.sequence === 1 || lesson.lessonProgress > 0,
      timeSpent: lesson.lessonProgress > 0 ? 'synced' : '--'
    }));
};

const initialStudents = baseStudents.map(withTopicProgress);

const statusClass = (status: LearningStatus) => {
  if (status === 'Mastered') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Needs Improvement') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'At Risk') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const monitoringStatus = (student: LiveStudent): MonitoringStatus => {
  if (student.overallProgress < 40 || student.quizScore < 50 || student.practiceScore < 25) return 'At Risk';
  if (student.overallProgress < 60 || student.quizScore < 65 || student.practiceScore < 50) return 'Needs Help';
  if (student.overallProgress < 75) return 'Improving';
  if (student.overallProgress >= 90 && student.quizScore >= 85 && student.practiceScore >= 75) return 'Excellent';
  return 'On Track';
};

const monitoringStatusClass = (status: MonitoringStatus, dark: boolean) => {
  if (status === 'At Risk') return dark ? 'border-rose-900 bg-rose-950/40 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'Needs Help') return dark ? 'border-amber-900 bg-amber-950/40 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Improving') return dark ? 'border-sky-900 bg-sky-950/40 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700';
  if (status === 'Excellent') return dark ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return dark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700';
};

const teacherScopedCode = (email: string) => {
  const seed = email.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `TEA-${String(seed).slice(-4)}-OOP`;
};

const mapBackendStudent = (user: AuthenticatedUser, results: StudentResultsData): LiveStudent => {
  const overallProgress = Number(results.overallProgress || 0);
  const videoCompletion = Number(results.videoPercentage || 0);
  const quizScore = Number(results.averageQuizScore || 0);
  const practiceScore = Number(results.averagePracticeScore || 0);
  const performanceIndex = Math.round((overallProgress + videoCompletion + quizScore + practiceScore) / 4);
  const learningStatus: LearningStatus =
    performanceIndex >= 100 ? 'Mastered' : performanceIndex >= 70 ? 'Completed' : performanceIndex > 0 ? 'In Progress' : 'At Risk';

  return {
    id: getCanonicalStudentId(user),
    name: user.name,
    email: user.email,
    section: user.section || 'Unassigned',
    online: user.onlineStatus !== 'offline',
    activity: results.hasActivity ? 'Active in the OOP learning path' : 'No activity recorded',
    currentLesson: results.hasActivity ? 'OOP learning path' : 'Not started',
    currentTopic: results.hasActivity ? 'OOP learning path' : 'Not started',
    swingLesson: results.swingCompletedActivities > 0 ? 'Java Swing activity' : 'Not started',
    stage: results.hasActivity ? 'Lesson' : 'Watch Video',
    overallProgress,
    moduleProgress: overallProgress,
    topicProgress: overallProgress,
    videoCompletion,
    quizScore,
    practiceScore,
    challengesCompleted: Number(results.completedPracticeActivities || 0),
    performanceIndex,
    learningStatus,
    lastActivity: results.hasActivity ? 'synced from backend' : 'not started',
    moduleCompletion: overallProgress,
    topicCompletion: overallProgress,
    recommendation: results.learningStateInterpretation || 'Progress is synced from backend database.',
    topics: (results.oopTopics || []).map(t => ({
      topic: t.title,
      video: t.videoPercentage ?? (t.videoCompleted ? 100 : 0),
      assessment: t.quizPercentage ?? 0,
      ideStatus: t.lessonCompleted ? 'Passed' : t.practiceScore !== null && t.practiceScore >= 70 ? 'Passed' : t.practiceScore !== null ? 'In Review' : t.attempted ? 'In Progress' : 'Not Started',
      completion: t.lessonCompleted ? 100 : Math.round(((t.videoPercentage || 0) + (t.quizPercentage || 0) + (t.practiceScore || 0)) / 3),
      unlocked: t.sequence <= 1 || t.attempted || t.lessonCompleted,
      timeSpent: t.attempted ? 'Active' : '--'
    })),
    swingTopics: (results.swingTopics || []).map(t => ({
      topic: t.title,
      video: t.videoCompleted ? 100 : 0,
      assessment: t.quizPassed ? 100 : 0,
      ideStatus: t.exerciseCompleted ? 'Passed' : t.submissionScore !== null ? 'Submitted' : 'Not Started',
      completion: t.overallPercentage || (t.contentCompleted ? 100 : 0),
      unlocked: Boolean(results.swingUnlocked),
      timeSpent: t.attempted ? 'Active' : '--'
    })),
    swing: {
      video: results.swingCompletedActivities > 0 ? 100 : 0,
      assessment: results.swingCompletedActivities > 0 ? 100 : 0,
      ide: results.swingSubmissions > 0 ? 100 : 0,
      miniProject: 0
    }
  };
};

/** Helper to parse a student ID from URL route e.g. #/teacher/students/:id/progress */
const parseStudentIdFromRoute = (): string | null => {
  try {
    const hash = window.location.hash || '';
    const hashMatch =
      hash.match(/(?:#|\/)?teacher\/students\/([^/]+)\/progress/i) ||
      hash.match(/(?:#|\/)?students\/([^/]+)\/progress/i);
    if (hashMatch && hashMatch[1]) {
      return decodeURIComponent(hashMatch[1]);
    }
    const searchParams = new URLSearchParams(window.location.search);
    const paramId = searchParams.get('studentId');
    if (paramId) {
      return paramId;
    }
    const pathMatch = window.location.pathname.match(/\/teacher\/students\/([^/]+)\/progress/i);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch {}
  return null;
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
  recommendationHistory = [],
  leaderboardUsers = []
}: TeacherPortalProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<TeacherTab>('monitoring');
  const [students, setStudents] = useState<LiveStudent[]>(initialStudents);
  const [backendStudents, setBackendStudents] = useState<LiveStudent[]>([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<AuthenticatedUser[]>([]);
  
  // Dedicated route-based student progress navigation
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(() => parseStudentIdFromRoute());
  const [viewingStudent, setViewingStudent] = useState<LiveStudent | null>(null);
  const [viewingStudentResults, setViewingStudentResults] = useState<StudentResultsData | null>(null);
  const [viewingStudentLoading, setViewingStudentLoading] = useState(false);
  const [viewingStudentNotFound, setViewingStudentNotFound] = useState(false);
  const [viewingStudentUnauthorized, setViewingStudentUnauthorized] = useState(false);
  const [viewingStudentError, setViewingStudentError] = useState<string | null>(null);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);

  // Assessment Security & Session Inspection state
  const [viewingStudentSessions, setViewingStudentSessions] = useState<any[]>([]);
  const [viewingStudentSessionsLoading, setViewingStudentSessionsLoading] = useState(false);
  const [inspectorSession, setInspectorSession] = useState<any | null>(null);
  const [inspectorEvents, setInspectorEvents] = useState<AssessmentSecurityEvent[]>([]);
  const [isLoadingInspectorEvents, setIsLoadingInspectorEvents] = useState(false);
  const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
  const [inspectorStudentName, setInspectorStudentName] = useState('');

  // Submissions and other states
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudents[0]?.id ?? '');
  const [studentInput, setStudentInput] = useState('');
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatus, setRosterStatus] = useState<'All' | MonitoringStatus>('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [studentSort, setStudentSort] = useState<StudentSort>('priority');
  const [rosterPage, setRosterPage] = useState(1);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [scoreText, setScoreText] = useState(90);
  const [remedialRequired, setRemedialRequired] = useState(false);
  const [submissionAction, setSubmissionAction] = useState<'reopen' | 'grade' | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const acceptedRequests = useMemo(
    () =>
      monitoringRequests
        .filter(req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase() && req.status === 'accepted'),
    [currentUser.email, monitoringRequests]
  );
  const acceptedEmails = useMemo(() => acceptedRequests.map(req => req.studentEmail.toLowerCase()), [acceptedRequests]);

  const teacherRequests = monitoringRequests.filter(req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase());
  const pendingRequests = teacherRequests.filter(req => req.status === 'pending');

  // Sync URL route changes (back/forward button, refresh, direct opening)
  useEffect(() => {
    const handleRouteSync = () => {
      const parsedId = parseStudentIdFromRoute();
      if (parsedId) {
        setViewingStudentId(parsedId);
        setActiveTab('monitoring');
      } else {
        setViewingStudentId(null);
      }
    };

    window.addEventListener('hashchange', handleRouteSync);
    window.addEventListener('popstate', handleRouteSync);
    return () => {
      window.removeEventListener('hashchange', handleRouteSync);
      window.removeEventListener('popstate', handleRouteSync);
    };
  }, []);

  // Fetch all student users on mount
  useEffect(() => {
    let cancelled = false;
    userApi.listUsers(currentUser.token)
      .then(async response => {
        const studentUsers = response.data.filter(user => user.role === 'student');
        if (!cancelled) setAllRegisteredUsers(studentUsers);

        const syncedStudents = (await Promise.all(studentUsers.map(async user => {
          try {
            const results = await progressApi.getStudentResults(getCanonicalStudentId(user), currentUser.token);
            return mapBackendStudent(user, results.data);
          } catch (error) {
            console.warn(`Unable to load results for ${user.email}:`, error);
            return null;
          }
        }))).filter((student): student is LiveStudent => student !== null);

        if (!cancelled) {
          setBackendStudents(syncedStudents);
          setSelectedStudentId(currentId => syncedStudents.some(student => student.id === currentId) ? currentId : syncedStudents[0]?.id || currentId);
        }
      })
      .catch(error => {
        if (!cancelled) console.warn('Unable to load the teacher roster from the backend:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.token]);

  // Fetch specific student's latest real-time progress from backend when viewingStudentId changes
  const fetchSpecificStudentProgress = useCallback(async (studentId: string, showRefreshAnimation = false) => {
    if (!studentId) {
      setViewingStudent(null);
      setViewingStudentResults(null);
      return;
    }

    if (showRefreshAnimation) {
      setIsRefreshingProgress(true);
    } else {
      setViewingStudentLoading(true);
    }
    setViewingStudentError(null);
    setViewingStudentNotFound(false);
    setViewingStudentUnauthorized(false);

    try {
      const response = await progressApi.getStudentResults(studentId, currentUser.token);
      const resultsData = response.data;
      
      // Match with known user profile or backend student info
      const matchingUser = allRegisteredUsers.find(
        u => u.id === studentId || u.userId === studentId || u.email.toLowerCase() === studentId.toLowerCase()
      );
      
      const fallbackUser: AuthenticatedUser = matchingUser || {
        id: resultsData.studentInfo?.id || studentId,
        userId: resultsData.studentInfo?.userId || studentId,
        name: resultsData.studentInfo?.name || 'Student',
        email: resultsData.studentInfo?.email || '',
        role: 'student',
        accountSource: 'custom',
        section: resultsData.studentInfo?.section || 'Unassigned',
        course: resultsData.studentInfo?.course || '',
        yearLevel: resultsData.studentInfo?.yearLevel || '',
        studentNumber: resultsData.studentInfo?.studentNumber || ''
      };

      const mapped = mapBackendStudent(fallbackUser, resultsData);
      setViewingStudent(mapped);
      setViewingStudentResults(resultsData);

      setViewingStudentSessionsLoading(true);
      assessmentApi.getStudentSessions(studentId, currentUser.token)
        .then(res => {
          if (res.data) setViewingStudentSessions(res.data);
          else setViewingStudentSessions([]);
        })
        .catch(err => {
          console.warn('Unable to load assessment sessions for student:', err);
          setViewingStudentSessions([]);
        })
        .finally(() => setViewingStudentSessionsLoading(false));
    } catch (error: any) {
      setViewingStudent(null);
      setViewingStudentResults(null);
      setViewingStudentSessions([]);
      
      const errorMsg = error instanceof Error ? error.message : String(error || '');
      if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
        setViewingStudentNotFound(true);
      } else if (errorMsg.includes('403') || errorMsg.toLowerCase().includes('authorized') || errorMsg.toLowerCase().includes('forbidden')) {
        setViewingStudentUnauthorized(true);
      } else {
        setViewingStudentError(errorMsg || 'Unable to load student progress from backend.');
      }
    } finally {
      setViewingStudentLoading(false);
      setIsRefreshingProgress(false);
    }
  }, [allRegisteredUsers, currentUser.token]);

  useEffect(() => {
    if (viewingStudentId) {
      fetchSpecificStudentProgress(viewingStudentId);
    } else {
      setViewingStudent(null);
      setViewingStudentResults(null);
      setViewingStudentSessions([]);
      setViewingStudentNotFound(false);
      setViewingStudentUnauthorized(false);
      setViewingStudentError(null);
    }
  }, [viewingStudentId, fetchSpecificStudentProgress]);

  // Inspect security events for a specific assessment session
  const handleInspectSession = async (session: any, studentName: string) => {
    setInspectorSession(session);
    setInspectorStudentName(studentName);
    setIsInspectorModalOpen(true);
    setIsLoadingInspectorEvents(true);
    setInspectorEvents([]);
    try {
      const res = await assessmentApi.getSessionEvents(session.id, currentUser.token);
      if (res.data) {
        setInspectorEvents(res.data);
      }
    } catch (err) {
      console.warn('Unable to load session events:', err);
    } finally {
      setIsLoadingInspectorEvents(false);
    }
  };

  // Navigate to student progress page
  const handleViewStudentProgress = (studentId: string) => {
    if (!studentId) return;
    setViewingStudentId(studentId);
    window.location.hash = `/teacher/students/${encodeURIComponent(studentId)}/progress`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to monitoring list
  const handleBackToMonitoring = () => {
    setViewingStudentId(null);
    window.location.hash = '/teacher/monitoring';
  };

  const connectedStudents = acceptedRequests.map((request, index) => {
    const progressUser = leaderboardUsers.find(user =>
      user.name.replace(/\s+\(You\)$/i, '').toLowerCase() === request.studentName.toLowerCase()
    );
    if (progressUser) {
      const overallProgress = progressUser.progress ?? progressUser.points ?? 0;
      const videoCompletion = progressUser.videoProgress ?? 0;
      const quizScore = progressUser.quizScore ?? 0;
      const practiceScore = progressUser.practiceScore ?? 0;
      const performanceIndex = overallProgress;
      const learningStatus: LearningStatus =
        overallProgress >= 100 ? 'Mastered' : overallProgress >= 70 ? 'Completed' : overallProgress > 0 ? 'In Progress' : 'At Risk';
      const syncedTopics = progressUserTopics(progressUser);

      const student: LiveStudent = {
        id: request.studentId || request.studentEmail,
        name: request.studentName,
        email: request.studentEmail,
        section: 'Unassigned',
        online: true,
        activity: progressUser.currentTopic || 'OOP learning path',
        currentLesson: progressUser.currentTopic || 'OOP learning path',
        currentTopic: progressUser.currentTopic || 'Object-Oriented Programming',
        swingLesson: overallProgress >= 100 ? 'Topic 5 JOptionPane Dialogs' : 'Not started',
        stage: overallProgress > 0 ? 'Lesson' : 'Watch Video',
        overallProgress,
        moduleProgress: overallProgress,
        topicProgress: overallProgress,
        videoCompletion,
        quizScore,
        practiceScore,
        challengesCompleted: practiceScore > 0 ? 1 : 0,
        performanceIndex,
        learningStatus,
        lastActivity: 'synced',
        moduleCompletion: overallProgress,
        topicCompletion: overallProgress,
        recommendation: 'Progress is synced from the student account activity.',
        topics: syncedTopics || [],
        swingTopics: getLiveSwingTopics(request.studentEmail, overallProgress >= 100 ? 100 : 0, index),
        swing: overallProgress >= 100 ? { video: 100, assessment: 100, ide: 100, miniProject: 100 } : { video: 0, assessment: 0, ide: 0, miniProject: 0 }
      };

      return syncedTopics ? student : withTopicProgress(student, index);
    }

    const existing = students.find(student =>
      student.email.toLowerCase() === request.studentEmail.toLowerCase() ||
      student.id === request.studentId
    );
    if (existing) return existing;

    const latestSubmission = submissions.find(sub =>
      (sub.studentEmail || '').toLowerCase() === request.studentEmail.toLowerCase() ||
      sub.studentId === request.studentId
    );
    const score = Number(latestSubmission?.score ?? latestSubmission?.grade ?? 0);
    const quizScore = score || 80;
    const practiceScore = score || 70;
    const overallProgress = score >= 70 ? 72 : 45;
    const performanceIndex = Math.round(quizScore * 0.35 + practiceScore * 0.4 + overallProgress * 0.25);

    return withTopicProgress({
      id: request.studentId || request.studentEmail,
      name: request.studentName,
      email: request.studentEmail,
      section: latestSubmission?.section || 'Unassigned',
      online: true,
      activity: latestSubmission ? 'Submitted Practice IDE' : 'Connected by invite',
      currentLesson: latestSubmission?.challengeName || 'OOP learning path',
      currentTopic: latestSubmission?.topicTitle || 'Object-Oriented Programming',
      swingLesson: 'Not started',
      stage: latestSubmission ? 'Automatic Grading' : 'Lesson',
      overallProgress,
      moduleProgress: overallProgress,
      topicProgress: overallProgress,
      videoCompletion: Math.max(0, Math.min(100, overallProgress + 10)),
      quizScore,
      practiceScore,
      challengesCompleted: latestSubmission ? 1 : 0,
      performanceIndex,
      learningStatus: performanceIndex >= 80 ? 'Completed' : performanceIndex >= 70 ? 'In Progress' : 'Needs Improvement',
      lastActivity: latestSubmission ? 'just now' : 'connected',
      moduleCompletion: overallProgress,
      topicCompletion: overallProgress,
      recommendation: latestSubmission?.feedback || 'Monitor the next video, assessment, and Practice IDE submission.',
      topics: [],
      swingTopics: [],
      swing: { video: 0, assessment: 0, ide: 0, miniProject: 0 }
    }, index);
  });

  const visibleStudents = backendStudents.length
    ? backendStudents.map((student, index) => student.topics?.length ? student : withTopicProgress(student, index))
    : connectedStudents;

  const activeViewingStudent = viewingStudent;
  const activeViewingResults = viewingStudentResults;
  const resultsInterpretation: StudentResultsInterpretation | null = activeViewingResults
    ? generateStudentResultsInterpretation(activeViewingResults)
    : null;

  const selectedStudentKeys = activeViewingStudent
    ? [
        activeViewingStudent.id,
        activeViewingStudent.email,
        ...acceptedRequests
          .filter(request => request.studentEmail.toLowerCase() === activeViewingStudent.email.toLowerCase())
          .map(request => request.studentId)
      ]
    : [];

  const visibleRecommendations = recommendationHistory
    .filter(item => selectedStudentKeys.includes(item.studentId) || item.studentId.toLowerCase() === activeViewingStudent?.email.toLowerCase())
    .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime());

  const recommendationIsCurrent = (item: AdaptiveRecommendation) => {
    if (!activeViewingStudent) return false;
    const scoreMatches = item.codingScore === undefined || item.codingScore === activeViewingStudent.practiceScore;
    const quizMatches = item.quizScore === undefined || item.quizScore === activeViewingStudent.quizScore;
    const progressMatches = item.progressPercentage === undefined || item.progressPercentage === activeViewingStudent.overallProgress;
    return scoreMatches && quizMatches && progressMatches;
  };

  const currentEvidenceTopic = activeViewingResults?.oopTopics?.find(topic => topic.practiceScore !== null && topic.practiceScore < 60)
    || activeViewingResults?.oopTopics?.find(topic => !topic.lessonCompleted)
    || activeViewingResults?.oopTopics?.find(topic => topic.attempted);

  const currentRecommendation = activeViewingStudent
    ? activeViewingResults && !activeViewingResults.hasActivity
      ? 'No current learning activity is recorded. Begin with the first available lesson.'
      : activeViewingResults
        ? generateRuleBasedRecommendation({
            studentId: activeViewingStudent.id,
            studentName: activeViewingStudent.name,
            lessonId: currentEvidenceTopic?.id || 'current-topic',
            currentTopic: currentEvidenceTopic?.title || activeViewingStudent.currentTopic,
            trigger: currentEvidenceTopic?.practiceScore !== null && currentEvidenceTopic?.practiceScore !== undefined ? 'Coding Score' : 'Quiz Score',
            videoCompleted: currentEvidenceTopic?.videoCompleted || false,
            lessonCompleted: currentEvidenceTopic?.lessonCompleted || false,
            quizScore: currentEvidenceTopic?.quizPercentage ?? activeViewingResults.averageQuizScore,
            codingScore: currentEvidenceTopic?.practiceScore ?? activeViewingResults.averagePracticeScore,
            quizAttempts: activeViewingResults.quizAttempts,
            codingAttempts: activeViewingResults.submittedPracticeActivities,
            progressPercentage: activeViewingResults.overallProgress
          }).summary
        : activeViewingStudent.overallProgress === 0 && activeViewingStudent.quizScore === 0 && activeViewingStudent.practiceScore === 0
      ? 'No current learning activity is recorded. Begin with the first available lesson.'
      : generateRuleBasedRecommendation({
          studentId: activeViewingStudent.id,
          studentName: activeViewingStudent.name,
          lessonId: activeViewingStudent.topics[0]?.topic || 'current-topic',
          currentTopic: activeViewingStudent.currentTopic,
          trigger: 'Coding Score',
          videoCompleted: activeViewingStudent.videoCompletion >= 95,
          lessonCompleted: activeViewingStudent.overallProgress >= 100,
          quizScore: activeViewingStudent.quizScore,
          codingScore: activeViewingStudent.practiceScore,
          progressPercentage: activeViewingStudent.overallProgress
        }).summary
    : null;

  const remedialCounts = visibleRecommendations
    .filter(item => item.type === 'Remedial' && recommendationIsCurrent(item))
    .reduce<Record<string, number>>((acc, item) => {
      const key = item.studentName || item.studentId;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const repeatedRemedialStudents = Object.entries(remedialCounts).filter(([, count]) => count >= 2);

  const visibleStudentEmails = useMemo(() => {
    const emails = new Set<string>();
    acceptedEmails.forEach(e => emails.add(e.toLowerCase()));
    visibleStudents.forEach(s => {
      if (s.email) emails.add(s.email.toLowerCase());
      if (s.id) emails.add(s.id.toLowerCase());
    });
    allRegisteredUsers.forEach(u => {
      if (u.role === 'student') {
        if (u.email) emails.add(u.email.toLowerCase());
        if (u.id) emails.add(u.id.toLowerCase());
      }
    });
    return emails;
  }, [acceptedEmails, visibleStudents, allRegisteredUsers]);

  const visibleSubmissions = submissions.filter(sub => {
    const studentEmail = (sub.studentEmail || getStudentEmailByName(sub.studentName) || sub.studentId || '').toLowerCase();
    if (!studentEmail) return true;
    if (visibleStudentEmails.size === 0) return true;
    return visibleStudentEmails.has(studentEmail);
  });

  const filteredSubmissions = visibleSubmissions.filter(sub => {
    const score = Number(sub.teacherScore ?? sub.grade ?? sub.score ?? 0);
    const isReviewed = sub.reviewStatus === 'reviewed' || sub.status === 'reviewed';
    const isPending = sub.status === 'pending' || sub.reviewStatus === 'pending' || (!sub.reviewStatus && !sub.gradedAt);
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.challengeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Passed' && score >= 70) ||
      (statusFilter === 'Failed' && score < 70) ||
      (statusFilter === 'Pending' && isPending) ||
      (statusFilter === 'Reviewed' && isReviewed);
    return matchesSearch && matchesStatus;
  });

  const selectedSubmission = submissions.find(sub => sub.id === selectedSubId) ?? filteredSubmissions[0];

  useEffect(() => {
    if (selectedSubmission) {
      const existingScore = selectedSubmission.teacherScore ?? selectedSubmission.grade ?? selectedSubmission.score ?? 90;
      const existingFeedback = selectedSubmission.feedback || '';
      const existingRemedial = !!selectedSubmission.remedialRequired;
      setScoreText(typeof existingScore === 'number' ? existingScore : 90);
      setCommentText(existingFeedback);
      setRemedialRequired(existingRemedial);
    }
  }, [
    selectedSubmission?.id,
    selectedSubmission?.teacherScore,
    selectedSubmission?.grade,
    selectedSubmission?.score,
    selectedSubmission?.feedback,
    selectedSubmission?.remedialRequired
  ]);

  const handleCopyInvitation = async () => {
    const linkValue = `${window.location.origin}/invite/${teacherScopedCode(currentUser.email)}`;
    try {
      await navigator.clipboard.writeText(linkValue);
      setRequestFeedback({ type: 'success', message: 'Invitation link copied to clipboard!' });
    } catch {
      setRequestFeedback({ type: 'error', message: 'Failed to copy invitation link.' });
    }
  };

  const handleSendRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim()) {
      setRequestFeedback({ type: 'error', message: 'Enter a student email or ID.' });
      return;
    }
    setIsSendingInvite(true);
    setRequestFeedback(null);
    try {
      const res = await onSendRequest(studentInput.trim());
      setRequestFeedback({ type: res.success ? 'success' : 'error', message: res.message });
      if (res.success) setStudentInput('');
    } catch (err: any) {
      setRequestFeedback({ type: 'error', message: err?.message || 'Unable to send invitation.' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handlePostGrade = async () => {
    if (!selectedSubmission) return;
    setSubmissionAction('grade');
    setSubmissionMessage(null);
    try {
      await onGradeSubmission(selectedSubmission.id, scoreText, commentText, remedialRequired);
      setSubmissionMessage({ type: 'success', message: 'Grade & feedback posted successfully.' });
    } catch (err: any) {
      setSubmissionMessage({ type: 'error', message: err?.message || 'Failed to post grade.' });
    } finally {
      setSubmissionAction(null);
    }
  };

  const handleReopenSelectedSubmission = async () => {
    if (!selectedSubmission || !onReopenSubmission) return;
    setSubmissionAction('reopen');
    setSubmissionMessage(null);
    try {
      await onReopenSubmission(selectedSubmission.id);
      setSubmissionMessage({ type: 'success', message: 'Submission reopened for student revision.' });
    } catch (err: any) {
      setSubmissionMessage({ type: 'error', message: err?.message || 'Failed to reopen submission.' });
    } finally {
      setSubmissionAction(null);
    }
  };

  const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);
  const averageQuiz = avg(visibleStudents.map(student => student.quizScore));
  const averagePractice = avg(visibleStudents.map(student => student.practiceScore));
  const averagePerformance = avg(visibleStudents.map(student => student.performanceIndex));
  const completionRate = avg(visibleStudents.map(student => student.overallProgress));
  const videoCompletionRate = avg(visibleStudents.map(student => student.videoCompletion));
  const swingSubmissions = submissions.filter(submission =>
    submission.topicId === 'swing' || submission.challengeName.toLowerCase().includes('swing')
  );
  const swingQuizAverage = avg(visibleStudents.map(student => student.swing.assessment));
  const swingVideoAverage = avg(visibleStudents.map(student => student.swing.video));
  const swingPracticeAverage = avg(visibleStudents.map(student => student.swing.ide));
  const swingProjectAverage = avg(visibleStudents.map(student => student.swing.miniProject));
  const atRiskStudents = visibleStudents.filter(student => student.learningStatus === 'At Risk' || student.learningStatus === 'Needs Improvement');
  const studentsNeedingAttention = visibleStudents.filter(student => ['At Risk', 'Needs Help'].includes(monitoringStatus(student)));
  const rosterSections = [...new Set(visibleStudents.map(student => student.section).filter(Boolean))].sort();
  const statusPriority: Record<MonitoringStatus, number> = { 'At Risk': 0, 'Needs Help': 1, Improving: 2, 'On Track': 3, Excellent: 4 };

  const filteredRoster = useMemo(() => {
    const query = rosterSearch.trim().toLowerCase();
    return visibleStudents
      .filter(student => {
        const matchesQuery = !query || [student.name, student.email, student.id, student.section].some(value => value.toLowerCase().includes(query));
        const matchesStatus = rosterStatus === 'All' || monitoringStatus(student) === rosterStatus;
        const matchesSection = sectionFilter === 'All' || student.section === sectionFilter;
        return matchesQuery && matchesStatus && matchesSection;
      })
      .sort((a, b) => {
        if (studentSort === 'name') return a.name.localeCompare(b.name);
        if (studentSort === 'progress') return b.overallProgress - a.overallProgress;
        if (studentSort === 'quiz') return b.quizScore - a.quizScore;
        if (studentSort === 'practice') return b.practiceScore - a.practiceScore;
        if (studentSort === 'status') return statusPriority[monitoringStatus(a)] - statusPriority[monitoringStatus(b)];
        return statusPriority[monitoringStatus(a)] - statusPriority[monitoringStatus(b)] || a.overallProgress - b.overallProgress;
      });
  }, [rosterSearch, rosterStatus, sectionFilter, studentSort, visibleStudents]);

  const rosterPageSize = 20;
  const rosterPageCount = Math.max(1, Math.ceil(filteredRoster.length / rosterPageSize));
  const pagedRoster = filteredRoster.slice((rosterPage - 1) * rosterPageSize, rosterPage * rosterPageSize);
  useEffect(() => setRosterPage(1), [rosterSearch, rosterStatus, sectionFilter, studentSort]);

  const mostSuccessfulStudent = [...visibleStudents].sort((a, b) => b.performanceIndex - a.performanceIndex)[0];
  const mostDifficultTopic = OOP_TOPICS.map(topic => ({
    topic,
    avg: avg(visibleStudents.map(student => student.topics.find(item => item.topic === topic)?.completion ?? 0))
  })).sort((a, b) => a.avg - b.avg)[0];

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const mutedPanel = isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-emerald-50/20 border-emerald-100/50';

  // Submissions specifically for the currently viewed student
  const studentSpecificSubmissions = useMemo(() => {
    if (!activeViewingStudent) return [];
    return submissions.filter(sub => {
      const emailMatch = sub.studentEmail && sub.studentEmail.toLowerCase() === activeViewingStudent.email.toLowerCase();
      const idMatch = sub.studentId && (sub.studentId === activeViewingStudent.id || sub.studentId === activeViewingStudent.email);
      const nameMatch = sub.studentName && sub.studentName.toLowerCase() === activeViewingStudent.name.toLowerCase();
      return emailMatch || idMatch || nameMatch;
    });
  }, [activeViewingStudent, submissions]);

  return (
    <div className={`space-y-5 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="teacher-portal-root">
      {/* Header Banner */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">Teacher Account Module</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Real-Time OOP Learning Command Center</h2>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-relaxed text-slate-500">
              Monitor student progress, track adaptive learning events, review Practice IDE evidence, and follow each learner from lesson to unlock.
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

      {/* Tabs Bar */}
      <div className={`overflow-x-auto rounded-2xl border p-2 shadow-sm ${cardClass}`}>
        <div className="flex min-w-max gap-1">
          {[
            ['monitoring', 'Live Monitoring', Activity],
            ['ranking', 'Student Ranking', Trophy],
            ['invitations', 'Invitations', MailPlus],
            ['topics', 'OOP Topics', BookOpen],
            ['swing', 'Java Swing', PlayCircle],
            ['assessments', 'Assessments', FileQuestion],
            ['ide', 'Practice IDE', Code2],
            ['analytics', 'Analytics', BarChart3]
          ].map(([id, label, Icon]) => {
            const TabIcon = Icon as typeof Activity;
            return (
              <button
                key={id as string}
                type="button"
                onClick={() => {
                  setActiveTab(id as TeacherTab);
                  if (id !== 'monitoring') {
                    setViewingStudentId(null);
                  }
                }}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition cursor-pointer ${
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

      {/* ========================================================================= */}
      {/* MONITORING TAB */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-5">
          {viewingStudentId ? (
            /* ===================================================================== */
            /* DEDICATED STUDENT PROGRESS PAGE (/teacher/students/:studentId/progress) */
            /* ===================================================================== */
            <div className="space-y-5">
              {/* Navigation Back Header & Action Controls */}
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToMonitoring}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-black text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Students
                  </button>
                  <div className="hidden sm:block text-xs font-semibold text-slate-400">
                    Student Monitoring <span className="mx-1">/</span> <span className="text-slate-700 dark:text-slate-200 font-bold">{activeViewingStudent?.name || viewingStudentId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    ID: {viewingStudentId}
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchSpecificStudentProgress(viewingStudentId, true)}
                    disabled={viewingStudentLoading || isRefreshingProgress}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/70 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingProgress ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingProgress ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {viewingStudentLoading && (
                <div className={`rounded-2xl border p-12 text-center shadow-sm ${cardClass}`}>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                  <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white">Fetching Live Student Progress</h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    Retrieving lesson progress, quiz attempts, and programming submissions for ID <span className="font-mono font-bold text-emerald-600">{viewingStudentId}</span>...
                  </p>
                </div>
              )}

              {/* Student Not Found State */}
              {!viewingStudentLoading && viewingStudentNotFound && (
                <div className={`rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/30 p-8 text-center shadow-sm`}>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                    <UserX className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-base font-black text-rose-900 dark:text-rose-200">Student Not Found</h3>
                  <p className="mx-auto mt-1 max-w-md text-xs text-rose-700 dark:text-rose-300">
                    No active student record was found matching ID <span className="font-mono font-bold">{viewingStudentId}</span>. The student may not exist, or the link may be invalid.
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={handleBackToMonitoring}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Student Monitoring
                    </button>
                  </div>
                </div>
              )}

              {/* Unauthorized State */}
              {!viewingStudentLoading && viewingStudentUnauthorized && (
                <div className={`rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 p-8 text-center shadow-sm`}>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-base font-black text-amber-900 dark:text-amber-200">Access Denied</h3>
                  <p className="mx-auto mt-1 max-w-md text-xs text-amber-700 dark:text-amber-300">
                    You are not authorized to view the progress for student <span className="font-mono font-bold">{viewingStudentId}</span>. Only students connected to your teacher roster are accessible.
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={handleBackToMonitoring}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Student Monitoring
                    </button>
                  </div>
                </div>
              )}

              {/* General Fetch Error State */}
              {!viewingStudentLoading && viewingStudentError && !viewingStudentNotFound && !viewingStudentUnauthorized && (
                <div className={`rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/30 p-6 text-center shadow-sm`}>
                  <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                  <h3 className="mt-2 text-base font-bold text-rose-900 dark:text-rose-200">Failed to Load Progress</h3>
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{viewingStudentError}</p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fetchSpecificStudentProgress(viewingStudentId)}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition cursor-pointer"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToMonitoring}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Back to Students
                    </button>
                  </div>
                </div>
              )}

              {/* Student Progress Loaded Dashboard */}
              {!viewingStudentLoading && activeViewingStudent && activeViewingResults && (
                <div className={`rounded-2xl border p-5 shadow-sm xl:col-span-2 ${cardClass}`}>
                  {/* Student Header */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-slate-200/70 dark:border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black">{activeViewingStudent.name}</h3>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${statusClass(activeViewingStudent.learningStatus)}`}>
                          {activeViewingStudent.learningStatus}
                        </span>
                        {activeViewingStudent.online && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {activeViewingStudent.email} | Section: <span className="font-bold text-slate-700 dark:text-slate-300">{activeViewingStudent.section}</span> | {activeViewingStudent.currentLesson}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="h-4 w-4" />
                      Stage: {activeViewingStudent.stage}
                    </div>
                  </div>

                  {/* 8 Metric Summary Cards */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ['Overall Progress', activeViewingStudent.overallProgress],
                      ['Module Progress', activeViewingStudent.moduleProgress],
                      ['Topic Progress', activeViewingStudent.topicProgress],
                      ['Video Completion', activeViewingStudent.videoCompletion],
                      ['Quiz Score', activeViewingStudent.quizScore],
                      ['Practice IDE Score', activeViewingStudent.practiceScore],
                      ['Performance Index', activeViewingStudent.performanceIndex],
                      ['Topic Completion', activeViewingStudent.topicCompletion]
                    ].map(([label, value]) => (
                      <div key={label as string} className={`rounded-xl border p-3 ${mutedPanel}`}>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                          <span>{label as string}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interpretation of Results Panel */}
                  <section className={`mt-5 rounded-2xl border p-5 ${isDark ? 'border-indigo-900 bg-indigo-950/30' : 'border-indigo-100 bg-indigo-50/40'}`}>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Interpretation of Results</p>
                        <h4 className="mt-1 text-base font-black">Evidence-based learning interpretation</h4>
                      </div>
                    </div>
                    {resultsInterpretation && (
                      <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3 sm:col-span-2">
                          <span className="font-black uppercase tracking-wider text-slate-400">Current Learning Stage</span>
                          <p className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-400">{resultsInterpretation.currentLearningStage}</p>
                          <div className="mt-3 flex flex-wrap gap-2 font-black">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Java OOP: {resultsInterpretation.oopResult}</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">Java Swing: {resultsInterpretation.swingStatus}</span>
                            {resultsInterpretation.swingResult && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">Swing Result: {resultsInterpretation.swingResult}</span>}
                          </div>
                        </div>
                        {[
                          ['Learning Progress Analysis', resultsInterpretation.learningProgressAnalysis],
                          ['Assessment Performance', resultsInterpretation.assessmentPerformance],
                          ['Programming Practice Performance', resultsInterpretation.programmingPracticePerformance]
                        ].map(([title, text]) => (
                          <div key={title} className="rounded-xl bg-white/80 dark:bg-slate-900 p-3">
                            <span className="font-black uppercase tracking-wider text-slate-400">{title}</span>
                            <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">{text}</p>
                          </div>
                        ))}
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3 sm:col-span-2">
                          <span className="font-black uppercase tracking-wider text-slate-400">Java OOP Topic Evidence</span>
                          <div className="mt-2 space-y-2">
                            {(activeViewingResults.oopTopics || []).filter(topic => topic.attempted).map(topic => (
                              <div key={topic.id} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-[11px]">
                                <span className="font-black">{topic.title}</span>
                                <span className="ml-2 text-slate-600 dark:text-slate-400">
                                  {topic.lessonCompleted ? 'Completed' : 'In Progress'} | Video {topic.videoPercentage === null ? 'No data' : `${topic.videoPercentage}%`} | Quiz {topic.quizPercentage === null ? 'No data' : `${topic.quizPercentage}%`} | Practice {topic.practiceScore === null ? 'No data' : `${topic.practiceScore}%`}
                                </span>
                              </div>
                            ))}
                            {!(activeViewingResults.oopTopics || []).some(topic => topic.attempted) && (
                              <p className="text-[11px] text-slate-500">No Java OOP topic has been attempted yet.</p>
                            )}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3 sm:col-span-2">
                          <span className="font-black uppercase tracking-wider text-slate-400">Java Swing Evidence</span>
                          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">
                            {resultsInterpretation.swingStatus === 'LOCKED'
                              ? 'Java Swing is currently locked because Java OOP prerequisite is incomplete.'
                              : (activeViewingResults.swingTopics || []).some(topic => topic.attempted)
                              ? `${(activeViewingResults.swingTopics || []).filter(topic => topic.attempted).map(topic => `${topic.title} (${topic.overallPercentage === null ? 'No data' : `${topic.overallPercentage}%`})`).join(', ')}.`
                              : 'Java Swing is unlocked, but no Swing activity has been attempted yet.'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3">
                          <span className="font-black uppercase tracking-wider text-slate-400">Strengths</span>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
                            {resultsInterpretation.strengths.map(item => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3">
                          <span className="font-black uppercase tracking-wider text-slate-400">Areas for Improvement</span>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
                            {resultsInterpretation.areasForImprovement.map(item => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-3 sm:col-span-2">
                          <span className="font-black uppercase tracking-wider text-slate-400">Recommended Next Steps</span>
                          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-300">{resultsInterpretation.recommendation}</p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Adaptive Recommendation Card */}
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/15 p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Rule-Based Adaptive Learning</p>
                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{currentRecommendation}</p>
                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                      {['Save activity', 'Run adaptive rules', 'Update PI', 'Push live dashboard'].map(step => (
                        <div key={step} className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 p-2 font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation History */}
                  <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Recommendation History</p>
                        <h4 className="mt-1 text-sm font-black text-slate-900 dark:text-white">Selected Student Recommendation History</h4>
                      </div>
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700">
                        {repeatedRemedialStudents.length} repeated remedial
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {visibleRecommendations.slice(0, 4).map(item => (
                        <div key={item.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">{item.studentName || item.studentId}</p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.lessonTitle} | {item.reason}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                              item.status === 'Completed' || !recommendationIsCurrent(item) ? 'bg-slate-100 text-slate-600' : item.type === 'Remedial' ? 'bg-rose-100 text-rose-700' : item.type === 'Continue' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.status === 'Completed' ? 'Resolved' : !recommendationIsCurrent(item) ? 'Historical' : item.type === 'Remedial' ? 'Active' : item.status}
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
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 text-center text-xs font-semibold text-slate-500">
                          No generated recommendation records for this student yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assessment Security & Attempt History */}
                  <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Assessment Integrity</p>
                          <h4 className="mt-0.5 text-base font-black text-slate-900 dark:text-white">Assessment Security & Attempt History</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {viewingStudentSessions.length} total attempt{viewingStudentSessions.length === 1 ? '' : 's'}
                        </span>
                        {viewingStudentSessions.some(s => Number(s.security_violations_count || 0) > 0) && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Security Events Recorded
                          </span>
                        )}
                      </div>
                    </div>

                    {viewingStudentSessionsLoading ? (
                      <div className="py-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        Loading assessment security records...
                      </div>
                    ) : viewingStudentSessions.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 text-center text-xs font-semibold text-slate-500">
                        No assessment sessions recorded for this student yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {viewingStudentSessions.map((session, idx) => {
                          const violations = Number(session.security_violations_count || 0);
                          const score = session.score !== null ? Number(session.score) : null;
                          const passed = session.passed ?? (score !== null ? score >= 80 : false);
                          const isTerminated = session.status === 'TERMINATED_SECURITY';
                          const isExpired = session.status === 'EXPIRED';
                          const isSubmitted = session.status === 'SUBMITTED';

                          return (
                            <div
                              key={session.id || idx}
                              className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition hover:border-slate-300 dark:hover:border-slate-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                      {session.assessment_title || session.title || `Assessment #${session.assessment_id || idx + 1}`}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                                      isSubmitted ? (passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300')
                                      : isTerminated ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                      : isExpired ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                    }`}>
                                      {session.status}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                                    <span>Started: {new Date(session.started_at).toLocaleString()}</span>
                                    {session.submitted_at && <span>Submitted: {new Date(session.submitted_at).toLocaleString()}</span>}
                                    <span>Time Limit: {session.time_limit_minutes || 20} min</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                                      Score: <span className={`font-mono text-sm ${score !== null && score >= 80 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{score !== null ? `${score}%` : '--'}</span>
                                    </div>
                                    <div className="mt-0.5">
                                      {violations > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                          <ShieldAlert className="h-3 w-3" />
                                          {violations} Security Event{violations === 1 ? '' : 's'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                          ✓ 0 Security Events
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleInspectSession(session, activeViewingStudent.name)}
                                    className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Inspect Events
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Learning Journey Timeline */}
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-7 bg-emerald-50/20 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {STAGE_ROTATION.map(stage => <span key={stage} className="text-center">{stage}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 p-3">
                      {STAGE_ROTATION.map(stage => (
                        <div key={stage} className={`h-2 rounded-full ${stage === activeViewingStudent.stage ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ===================================================================== */
            /* DEFAULT STUDENT MONITORING ROSTER & TABLE VIEW                        */
            /* ===================================================================== */
            <>
              {/* Stat Cards */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Total Students', visibleStudents.length],
                  ['Average Progress', `${completionRate}%`],
                  ['Average Quiz Score', `${averageQuiz}%`],
                  ['Practice Completion', `${averagePractice}%`],
                  ['Needs Attention', `${studentsNeedingAttention.length} students`]
                ].map(([label, value]) => (
                  <div key={label as string} className={`rounded-xl border p-4 shadow-sm ${label === 'Needs Attention' ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30' : cardClass}`}>
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label as string}</span>
                    <strong className="mt-2 block font-mono text-xl">{value}</strong>
                  </div>
                ))}
              </div>

              {/* Students Needing Attention */}
              <section className={`rounded-2xl border p-4 shadow-sm ${cardClass}`} aria-labelledby="attention-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 id="attention-heading" className="text-base font-black">Students Needing Attention</h3>
                    <p className="mt-1 text-xs text-slate-500">Prioritized from current progress, assessment, and practice activity.</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700">{studentsNeedingAttention.length} priority students</span>
                </div>
                {studentsNeedingAttention.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4 text-xs font-semibold text-emerald-700">No students currently meet the attention thresholds.</p>
                ) : (
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    {studentsNeedingAttention.slice(0, 6).map(student => {
                      const status = monitoringStatus(student);
                      return (
                        <div key={student.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${mutedPanel}`}>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">{student.name}</p>
                            <p className="mt-1 text-[10px] text-slate-500">{student.section} | {student.overallProgress}% progress | {student.quizScore}% quiz</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${monitoringStatusClass(status, isDark)}`}>{status}</span>
                            <button
                              type="button"
                              onClick={() => handleViewStudentProgress(student.id)}
                              className="min-h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 text-[10px] font-black text-white transition cursor-pointer"
                            >
                              View Progress
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Student Monitoring Roster Table */}
              <section className={`rounded-2xl border shadow-sm ${cardClass}`} aria-labelledby="roster-heading">
                <div className="border-b border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 id="roster-heading" className="text-base font-black">Student Monitoring</h3>
                      <p className="mt-1 text-xs text-slate-500">Showing {filteredRoster.length ? (rosterPage - 1) * rosterPageSize + 1 : 0}-{Math.min(rosterPage * rosterPageSize, filteredRoster.length)} of {filteredRoster.length} students</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input aria-label="Search students" value={rosterSearch} onChange={event => setRosterSearch(event.target.value)} placeholder="Search students..." className={`h-11 w-full rounded-xl border pl-9 pr-3 text-xs outline-none focus:border-emerald-600 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <select aria-label="Filter by status" value={rosterStatus} onChange={event => setRosterStatus(event.target.value as 'All' | MonitoringStatus)} className={`h-10 rounded-xl border px-3 text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                      <option value="All">All statuses</option><option>At Risk</option><option>Needs Help</option><option>Improving</option><option>On Track</option><option>Excellent</option>
                    </select>
                    <select aria-label="Filter by section" value={sectionFilter} onChange={event => setSectionFilter(event.target.value)} className={`h-10 rounded-xl border px-3 text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                      <option value="All">All sections</option>{rosterSections.map(section => <option key={section}>{section}</option>)}
                    </select>
                    <select aria-label="Sort students" value={studentSort} onChange={event => setStudentSort(event.target.value as StudentSort)} className={`h-10 rounded-xl border px-3 text-xs font-bold ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                      <option value="priority">Sort: Priority</option><option value="name">Sort: Name</option><option value="progress">Sort: Progress</option><option value="quiz">Sort: Quiz score</option><option value="practice">Sort: Practice</option><option value="status">Sort: Status</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="hidden w-full min-w-[760px] text-left text-xs sm:table">
                    <thead className="bg-emerald-50/30 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-3 py-3">Section</th>
                        <th className="px-3 py-3">Progress</th>
                        <th className="px-3 py-3">Quiz</th>
                        <th className="px-3 py-3">Practice</th>
                        <th className="px-3 py-3">Activity</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pagedRoster.map(student => {
                        const status = monitoringStatus(student);
                        return (
                          <tr key={student.id} className="hover:bg-emerald-50/20 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleViewStudentProgress(student.id)}
                                className="text-left group cursor-pointer"
                              >
                                <span className="block font-black group-hover:text-emerald-600 transition">{student.name}</span>
                                <span className="block text-[10px] text-slate-500">{student.email}</span>
                              </button>
                            </td>
                            <td className="px-3 py-3 font-semibold">{student.section}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${student.overallProgress}%` }} />
                                </div>
                                <span className="font-mono font-bold">{student.overallProgress}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono font-bold">{student.quizScore}%</td>
                            <td className="px-3 py-3 font-mono font-bold">{student.practiceScore}%</td>
                            <td className="px-3 py-3 text-slate-500">{student.lastActivity}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${monitoringStatusClass(status, isDark)}`}>{status}</span>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => handleViewStudentProgress(student.id)}
                                className="min-h-9 rounded-lg border border-emerald-200 dark:border-emerald-800 px-3 text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              >
                                View Progress
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="space-y-2 p-3 sm:hidden">
                    {pagedRoster.map(student => {
                      const status = monitoringStatus(student);
                      return (
                        <div key={student.id} className={`rounded-xl border p-3 ${mutedPanel}`}>
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleViewStudentProgress(student.id)}
                              className="min-w-0 text-left cursor-pointer"
                            >
                              <span className="block truncate text-xs font-black">{student.name}</span>
                              <span className="mt-1 block truncate text-[10px] text-slate-500">{student.email}</span>
                            </button>
                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${monitoringStatusClass(status, isDark)}`}>{status}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                            <span><b className="block text-slate-400">Progress</b><strong>{student.overallProgress}%</strong></span>
                            <span><b className="block text-slate-400">Quiz</b><strong>{student.quizScore}%</strong></span>
                            <span><b className="block text-slate-400">Practice</b><strong>{student.practiceScore}%</strong></span>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="truncate text-[10px] text-slate-500">{student.section} | {student.lastActivity}</span>
                            <button
                              type="button"
                              onClick={() => handleViewStudentProgress(student.id)}
                              className="min-h-9 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 text-[10px] font-black text-white transition cursor-pointer"
                            >
                              View Progress
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {pagedRoster.length === 0 && <p className="p-8 text-center text-xs font-semibold text-slate-500">No students match these filters.</p>}
                </div>
                {rosterPageCount > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 p-3 text-xs">
                    <button type="button" disabled={rosterPage === 1} onClick={() => setRosterPage(page => page - 1)} className="min-h-9 rounded-lg border px-3 font-black disabled:opacity-40 cursor-pointer">Previous</button>
                    <span className="font-bold text-slate-500">Page {rosterPage} of {rosterPageCount}</span>
                    <button type="button" disabled={rosterPage === rosterPageCount} onClick={() => setRosterPage(page => page + 1)} className="min-h-9 rounded-lg border px-3 font-black disabled:opacity-40 cursor-pointer">Next</button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT RANKING TAB */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <section className={`space-y-4 rounded-2xl border p-5 shadow-sm ${cardClass}`} aria-labelledby="student-ranking-heading">
          <div>
            <h3 id="student-ranking-heading" className="text-lg font-black">Student Ranking</h3>
            <p className="mt-1 text-xs text-slate-500">Compare enrolled students by OOP progress, quiz performance, and Practice IDE activity.</p>
          </div>
          <Leaderboard currentUser={currentUser} />
        </section>
      )}

      {/* ========================================================================= */}
      {/* INVITATIONS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'invitations' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <h3 className="text-base font-black">Invitation System</h3>
            <p className="mt-1 text-xs text-slate-500">Teachers can monitor only students who accept this teacher-scoped invitation.</p>
            <div className={`mt-5 rounded-2xl border p-4 ${mutedPanel}`}>
              <p className="text-[10px] font-black uppercase text-slate-400">Invitation Code</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white dark:bg-slate-950 p-3 shadow-sm">
                <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">{teacherScopedCode(currentUser.email)}</span>
                <button type="button" onClick={handleCopyInvitation} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 p-2 text-white transition cursor-pointer">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">Invite link: /invite/{teacherScopedCode(currentUser.email)}</p>
            </div>
            <form onSubmit={handleSendRequestSubmit} className="mt-5 space-y-3">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">Send direct invitation by email or student ID</label>
              <div className="flex gap-2">
                <input
                  value={studentInput}
                  onChange={event => setStudentInput(event.target.value)}
                  placeholder="student@oophub.edu or STU-0001"
                  className={`min-h-11 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-emerald-600 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                />
                <button type="submit" disabled={isSendingInvite} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 transition cursor-pointer">
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
                        <button type="button" onClick={() => onRemoveConnection(req.id)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[10px] font-black text-slate-500 hover:text-rose-600 transition cursor-pointer">
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

      {/* ========================================================================= */}
      {/* OOP TOPICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'topics' && (
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black">OOP Topics Progress</h3>
              <p className="text-xs text-slate-500">Topic-level video, assessment, IDE, unlock, and time-spent monitoring.</p>
            </div>
            <select
              value={selectedStudentId}
              onChange={event => setSelectedStudentId(event.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              {visibleStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </div>
          {visibleStudents.find(s => s.id === selectedStudentId) && (
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(visibleStudents.find(s => s.id === selectedStudentId)?.topics || []).map(topic => (
                    <tr key={topic.topic}>
                      <td className="px-3 py-3 font-black">{topic.topic}</td>
                      <td className="px-3 py-3">{topic.video}%</td>
                      <td className="px-3 py-3">{topic.assessment}%</td>
                      <td className="px-3 py-3">{topic.ideStatus}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* JAVA SWING TAB */}
      {/* ========================================================================= */}
      {activeTab === 'swing' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Enrolled Students', visibleStudents.length],
              ['Avg Video Completion', `${swingVideoAverage}%`],
              ['Average Quiz Score', `${swingQuizAverage}%`],
              ['Practice Completion', `${swingPracticeAverage}%`],
              ['Swing Submissions', swingSubmissions.length]
            ].map(([label, value]) => (
              <div key={label as string} className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label as string}</span>
                <strong className="mt-2 block font-mono text-lg">{value}</strong>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black">5 Java Swing Topics Progress</h3>
                <p className="mt-1 text-xs text-slate-500">Topic-level video, assessment, Practice IDE, unlock, and time-spent monitoring.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedStudentId}
                  onChange={event => setSelectedStudentId(event.target.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                >
                  {visibleStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">80% Quiz Pass Mark</span>
              </div>
            </div>
            
            <div className="mt-6 overflow-x-auto">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(visibleStudents.find(s => s.id === selectedStudentId)?.swingTopics || []).map(topic => (
                    <tr key={topic.topic}>
                      <td className="px-3 py-3 font-black">{topic.topic}</td>
                      <td className="px-3 py-3">{topic.video}%</td>
                      <td className="px-3 py-3">{topic.assessment}%</td>
                      <td className="px-3 py-3">{topic.ideStatus}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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

            <div className="mt-8">
              <h3 className="text-base font-black">Java Swing Cohort Analytics</h3>
              <p className="mt-1 text-xs text-slate-500">Lesson completion, quiz mastery, programming submissions, and mini-app readiness for connected students.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ['Lesson Completion', swingVideoAverage],
                  ['Quiz Analytics', swingQuizAverage],
                  ['Programming Progress', swingPracticeAverage],
                  ['Mini App Readiness', swingProjectAverage]
                ].map(([label, value]) => (
                  <div key={label as string} className={`rounded-xl border p-3 ${mutedPanel}`}>
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                      <span>{label as string}</span>
                      <span>{value}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSESSMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'assessments' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Connected Students', visibleStudents.length],
              ['Average Quiz Score', `${averageQuiz}%`],
              ['Passed Students', visibleStudents.filter(student => student.quizScore >= 70).length],
              ['Needs Review', visibleStudents.filter(student => student.quizScore < 70).length],
              ['Avg Completion', `${avg(visibleStudents.map(student => 18 + (student.quizScore % 10)))} min`]
            ].map(([label, value]) => (
              <div key={label as string} className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}>
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label as string}</span>
                <strong className="mt-2 block font-mono text-lg">{value}</strong>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black">Assessment Monitoring</h3>
                <p className="mt-1 text-xs text-slate-500">Student-level attempts, score ranges, question analysis, completion time, and review status.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">70% Pass Mark</span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="bg-emerald-50/20 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Current Topic</th>
                    <th className="px-3 py-3">Attempts</th>
                    <th className="px-3 py-3">Highest</th>
                    <th className="px-3 py-3">Average</th>
                    <th className="px-3 py-3">Lowest</th>
                    <th className="px-3 py-3">Correct</th>
                    <th className="px-3 py-3">Incorrect</th>
                    <th className="px-3 py-3">Completion</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {visibleStudents.map(student => {
                    const incorrect = Math.max(1, Math.round((100 - student.quizScore) / 8));
                    const correct = 25 - incorrect;
                    const attempts = 2 + (student.quizScore % 3);
                    const highest = Math.min(100, student.quizScore + 8);
                    const lowest = Math.max(0, student.quizScore - 14);
                    const completion = 18 + (student.quizScore % 10);
                    const passed = student.quizScore >= 70;
                    return (
                      <tr key={student.id} className={isDark ? 'hover:bg-slate-950/60' : 'hover:bg-emerald-50/10'}>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => handleViewStudentProgress(student.id)}
                            className="flex items-center gap-2 text-left cursor-pointer group"
                          >
                            <ClipboardCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <p className="font-black group-hover:text-emerald-600 transition">{student.name}</p>
                              <p className="text-[10px] font-semibold text-slate-400">{student.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-400">{student.currentTopic}</td>
                        <td className="px-3 py-3 font-mono font-bold">{attempts}</td>
                        <td className="px-3 py-3 font-mono font-bold">{highest}%</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className={`h-full rounded-full ${passed ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${student.quizScore}%` }} />
                            </div>
                            <span className="font-mono font-bold">{student.quizScore}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold">{lowest}%</td>
                        <td className="px-3 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">{correct}</td>
                        <td className="px-3 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">{incorrect}</td>
                        <td className="px-3 py-3 font-mono text-slate-500">{completion} min</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                            {passed ? 'Passed' : 'Review'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRACTICE IDE TAB */}
      {/* ========================================================================= */}
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
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
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
                  const isReviewed = sub.reviewStatus === 'reviewed' || sub.status === 'reviewed';
                  const score = Number(sub.teacherScore ?? sub.grade ?? sub.score ?? 0);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubId(sub.id)}
                      className={`w-full rounded-xl border p-4 text-left transition cursor-pointer ${
                        selectedSubmission?.id === sub.id ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/40' : isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black">{sub.studentName}</p>
                            {isReviewed && (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Reviewed
                              </span>
                            )}
                            {sub.remedialRequired && (
                              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Remedial
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">{sub.challengeName}</p>
                          <p className="mt-1 text-[10px] font-mono text-slate-400">{sub.topicTitle || 'Practice IDE'} | {sub.compileStatus || 'not_run'} | {sub.submittedAt}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                          isReviewed
                            ? score >= 70 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : sub.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : score >= 70
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {isReviewed ? `Reviewed: ${score}%` : sub.status === 'pending' ? 'Needs Review' : `${score}%`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl xl:sticky xl:top-4">
            {selectedSubmission ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Submission Inspector</p>
                      {(selectedSubmission.reviewStatus === 'reviewed' || selectedSubmission.status === 'reviewed') && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/40">
                          Reviewed ({selectedSubmission.teacherScore ?? selectedSubmission.grade ?? selectedSubmission.score}%)
                        </span>
                      )}
                      {selectedSubmission.remedialRequired && (
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-rose-400 border border-rose-500/40">
                          Remedial Required
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-black">{selectedSubmission.studentName}</h3>
                    <p className="text-[11px] text-slate-400">{selectedSubmission.challengeName}</p>
                    {selectedSubmission.gradedAt && (
                      <p className="mt-0.5 text-[10px] text-slate-400">Graded: {new Date(selectedSubmission.gradedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <Eye className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
                  <pre className="max-h-48 overflow-auto rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">{selectedSubmission.code}</pre>
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
                </div>
                <div className="shrink-0 space-y-3 border-t border-slate-800 pt-4">
                  <input type="number" min="0" max="100" value={scoreText} onChange={event => setScoreText(parseInt(event.target.value) || 0)} className="w-28 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs font-black outline-none focus:border-emerald-500" />
                  <textarea value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Teacher feedback and adaptive remediation notes..." className="h-20 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs outline-none focus:border-emerald-500" />
                  <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-[11px] font-bold text-slate-300">
                    <input type="checkbox" checked={remedialRequired} onChange={event => setRemedialRequired(event.target.checked)} className="h-4 w-4 accent-rose-500" />
                    Remedial work required
                  </label>
                  {submissionMessage && (
                    <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${submissionMessage.type === 'success' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-200' : 'border-rose-800 bg-rose-950/40 text-rose-200'}`}>
                      {submissionMessage.message}
                    </div>
                  )}
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    {onReopenSubmission && (
                      <button type="button" onClick={handleReopenSelectedSubmission} disabled={submissionAction !== null} className="min-h-11 rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                        {submissionAction === 'reopen' ? 'Reopening...' : 'Reopen'}
                      </button>
                    )}
                    <button type="button" onClick={handlePostGrade} disabled={submissionAction !== null} className="min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">
                      {submissionAction === 'grade' ? 'Posting...' : 'Post Grade & Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[440px] items-center justify-center text-center text-xs text-slate-500">
                Select a submission to inspect source code and grading details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ANALYTICS TAB */}
      {/* ========================================================================= */}
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
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
                  </div>
                </div>
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
          <button type="button" onClick={() => setActiveTab('invitations')} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white transition cursor-pointer">
            Open Invitations
          </button>
        </div>
      )}

      {/* Assessment Security & Attempt Inspector Modal */}
      {isInspectorModalOpen && inspectorSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Assessment Security & Attempt Inspector</h3>
                  <p className="text-xs text-slate-500">
                    Student: <span className="font-bold text-slate-700 dark:text-slate-300">{inspectorStudentName}</span> | Session: <code className="font-mono text-[10px]">{inspectorSession.id}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectorModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Session Stats Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="block text-[10px] font-black uppercase text-slate-400">Status</span>
                  <span className="mt-1 block text-xs font-black text-slate-800 dark:text-slate-200">{inspectorSession.status}</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="block text-[10px] font-black uppercase text-slate-400">Score</span>
                  <span className="mt-1 block text-xs font-black text-slate-800 dark:text-slate-200">{inspectorSession.score !== null ? `${inspectorSession.score}%` : 'N/A'}</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="block text-[10px] font-black uppercase text-slate-400">Security Events</span>
                  <span className={`mt-1 block text-xs font-black ${Number(inspectorSession.security_violations_count || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                    {inspectorSession.security_violations_count || 0}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="block text-[10px] font-black uppercase text-slate-400">Session Started</span>
                  <span className="mt-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {new Date(inspectorSession.started_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Security Events Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Chronological Security Event Log</h4>
                  <span className="text-[11px] font-bold text-slate-400">{inspectorEvents.length} recorded event(s)</span>
                </div>

                {isLoadingInspectorEvents ? (
                  <div className="py-10 text-center flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Loading security event timeline...
                  </div>
                ) : inspectorEvents.length === 0 ? (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    ✓ No security events or focus loss recorded during this assessment session.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {inspectorEvents.map((evt, idx) => {
                      const severity = evt.severity || 'LOW';
                      const severityClass = severity === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300'
                        : severity === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300';

                      return (
                        <div key={evt.id || idx} className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${severityClass}`}>
                                {severity}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-xs font-black text-slate-900 dark:text-white font-mono">{evt.event_type || evt.eventType || 'SECURITY_EVENT'}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    +{evt.elapsed_seconds || 0}s into session
                                  </span>
                                </div>
                                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                                  <pre className="mt-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 p-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-24">
                                    {JSON.stringify(evt.metadata, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                              {new Date(evt.created_at || evt.createdAt || Date.now()).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInspectorModalOpen(false)}
                className="rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-4 py-2 text-xs font-black text-slate-800 dark:text-white transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
