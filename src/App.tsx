import React, { useEffect, useState } from 'react';
import { 
  Terminal, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  TrendingUp, 
  Award, 
  Compass, 
  Flame, 
  ShieldAlert,
  Menu,
  X,
  Code2,
  Clock,
  LogOut,
  Sparkles,
  Inbox,
  UserRound,
  LayoutDashboard,
  Users,
  Library,
  ClipboardCheck,
  BarChart3,
  FileBarChart,
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Film
} from 'lucide-react';

// Import Types
import { 
  Persona, 
  AuthenticatedUser,
  StudentSubView, 
  TeacherSubView, 
  AdminSubView, 
  VideoLesson, 
  AssessmentQuestion, 
  LeaderboardUser, 
  PendingSubmission, 
  CurriculumModule, 
  LessonItem, 
  AdaptiveRule,
  MonitoringRequest,
  NotificationItem
} from './types';

// Import Mock Data
import { 
  INITIAL_JAVA_FILES, 
  INITIAL_QUESTIONS, 
  INITIAL_LEADERBOARD_USERS, 
  INITIAL_SUBMISSIONS, 
  INITIAL_CURRICULUM_MODULES, 
  INITIAL_LESSON_ITEMS, 
  INITIAL_ADAPTIVE_RULES 
} from './data/mockData';
import { OOP_COURSE_LESSONS } from './data/oopCourse';

// Import Sub Components
import LandingPage from './components/LandingPage';
import StudentDashboard from './components/StudentDashboard';
import PracticeIDE from './components/PracticeIDE';
import VideoTutorials from './components/VideoTutorials';
import Assessments from './components/Assessments';
import Leaderboard from './components/Leaderboard';
import TeacherPortal from './components/TeacherPortal';
import AdminCurriculum from './components/AdminCurriculum';
import AdminEngine from './components/AdminEngine';
import AdminDashboard from './components/AdminDashboard';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import Navbar from './components/Navbar';
import AdminVideoManager from './components/AdminVideoManager';
import AdminTermsManager from './components/AdminTermsManager';
import { appApi, authApi, getAuthToken, isDemoEmail, setAuthToken, userApi } from './services/api';

const DEMO_STUDENT_PROGRESS = {
  streak: 12,
  points: 1950,
  completedLessonsCount: 2
};

const NEW_STUDENT_PROGRESS = {
  streak: 0,
  points: 0,
  completedLessonsCount: 0
};

const DEMO_STUDENT_GRADE = {
  grade: 75,
  feedback: "Your constructor works fine. However, displayInfo() still needs to print the doors parameter. Please check the remediation challenge and resubmit.",
  challenge: "Inheritance Constraints with Vehicle/Car Override"
};

const DEMO_STUDENT_BADGES = INITIAL_LEADERBOARD_USERS.find(user => user.isCurrentUser)?.badges ?? [];
const OOP_LESSON_COUNT = OOP_COURSE_LESSONS.length;
const clampCompletedLessons = (count: number) => Math.min(Math.max(count, 0), OOP_LESSON_COUNT);
const SESSION_USER_KEY = 'oophub_current_user';
const SESSION_VIEW_KEY = 'oophub_workspace_view';
const PERSONAS: Persona[] = ['public', 'student', 'teacher', 'admin'];
const STUDENT_TABS: StudentSubView[] = ['dashboard', 'ide', 'videos', 'assessments', 'leaderboard', 'profile'];
const TEACHER_TABS: TeacherSubView[] = ['dashboard', 'students', 'submission-review', 'analytics', 'profile'];
const ADMIN_TABS: AdminSubView[] = ['dashboard', 'users', 'courses', 'library', 'assessments', 'analytics', 'reports', 'settings', 'terms', 'profile', 'videos'];

const isPersona = (value: unknown): value is Persona =>
  typeof value === 'string' && PERSONAS.includes(value as Persona);

const sanitizeUser = (value: unknown): AuthenticatedUser | null => {
  if (!value || typeof value !== 'object') return null;
  const user = value as Partial<AuthenticatedUser>;
  if (!user.name || !user.email || !isPersona(user.role) || user.role === 'public') return null;
  return user as AuthenticatedUser;
};

const sanitizeWorkspaceView = (value: unknown): WorkspaceViewState => {
  if (!value || typeof value !== 'object') return {};
  const view = value as WorkspaceViewState;

  return {
    persona: isPersona(view.persona) ? view.persona : undefined,
    studentTab: STUDENT_TABS.includes(view.studentTab as StudentSubView) ? view.studentTab : undefined,
    teacherTab: TEACHER_TABS.includes(view.teacherTab as TeacherSubView) ? view.teacherTab : undefined,
    adminTab: ADMIN_TABS.includes(view.adminTab as AdminSubView) ? view.adminTab : undefined
  };
};

type WorkspaceViewState = {
  persona?: Persona;
  studentTab?: StudentSubView;
  teacherTab?: TeacherSubView;
  adminTab?: AdminSubView;
};

const readSessionUser = (): AuthenticatedUser | null => {
  try {
    const saved = localStorage.getItem(SESSION_USER_KEY);
    return saved ? sanitizeUser(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
};

const readWorkspaceView = (): WorkspaceViewState => {
  try {
    const saved = localStorage.getItem(SESSION_VIEW_KEY);
    return saved ? sanitizeWorkspaceView(JSON.parse(saved)) : {};
  } catch {
    return {};
  }
};

const persistSessionUser = (user: AuthenticatedUser) => {
  try {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    if (user.id) localStorage.setItem('oophub_current_user_id', user.id);
  } catch {
    // The active React session still works if storage is unavailable.
  }
};

const clearSessionUser = () => {
  try {
    localStorage.removeItem(SESSION_USER_KEY);
    localStorage.removeItem(SESSION_VIEW_KEY);
    localStorage.removeItem('oophub_current_user_id');
  } catch {
    // Logout should still complete even if storage cleanup is blocked.
  }
};

export default function App() {
  const savedUser = readSessionUser();
  const savedView = readWorkspaceView();

  // Core Persona and Navigation state
  const [persona, setPersona] = useState<Persona>(savedUser?.role ?? 'public');
  const [studentTab, setStudentTab] = useState<StudentSubView>(savedView.studentTab ?? 'dashboard');
  const [teacherTab, setTeacherTab] = useState<TeacherSubView>(savedView.teacherTab ?? 'dashboard');
  const [adminTab, setAdminTab] = useState<AdminSubView>(savedView.adminTab ?? 'dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('oophub_theme');
      return (saved as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    localStorage.setItem('oophub_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    appApi.health().catch(error => {
      console.warn('Backend health check failed:', error);
    });
    appApi.getLessons().catch(error => {
      console.warn('Backend lessons check failed:', error);
    });
  }, []);

  useEffect(() => {
    if (persona === 'public') return;

    try {
      localStorage.setItem(SESSION_VIEW_KEY, JSON.stringify({
        persona,
        studentTab,
        teacherTab,
        adminTab
      }));
    } catch {
      // Navigation still works for this render when persistence is unavailable.
    }
  }, [adminTab, persona, studentTab, teacherTab]);

  // Authenticated user profile and state triggers
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(savedUser);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(getAuthToken()) && !savedUser);

  useEffect(() => {
    if (currentUser) {
      persistSessionUser(currentUser);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setIsRestoringSession(false);
      return;
    }

    let isCancelled = false;
    setIsRestoringSession(true);

    authApi.me(token)
      .then(response => {
        if (isCancelled) return;

        const restoredUser: AuthenticatedUser = {
          ...response.user,
          role: response.user.role as Persona,
          accountSource: response.user.accountSource ?? (isDemoEmail(response.user.email, response.user.role) ? 'demo' : 'custom'),
          token
        };

        persistSessionUser(restoredUser);
        setCurrentUser(restoredUser);
        setPersona(restoredUser.role);
      })
      .catch(error => {
        if (isCancelled) return;
        console.warn('Session restore failed:', error);
        setAuthToken('');
        clearSessionUser();
        setPersona('public');
      })
      .finally(() => {
        if (!isCancelled) setIsRestoringSession(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  // Student Statistics State
  const [streak, setStreak] = useState<number>(DEMO_STUDENT_PROGRESS.streak);
  const [points, setPoints] = useState<number>(DEMO_STUDENT_PROGRESS.points);
  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(DEMO_STUDENT_PROGRESS.completedLessonsCount);

  // Dynamic shared database states
  const [videoLessons, setVideoLessons] = useState<VideoLesson[]>(() => {
    try {
      const APP_VERSION = '1.0.5';
      const version = localStorage.getItem('app_version');

      if (version !== APP_VERSION) {
        localStorage.removeItem('oophub_video_lessons');
        localStorage.setItem('app_version', APP_VERSION);
      }

      const saved = localStorage.getItem('oophub_video_lessons');
      return saved ? JSON.parse(saved) : OOP_COURSE_LESSONS;
    } catch {
      return OOP_COURSE_LESSONS;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('oophub_notifications');
      return saved ? JSON.parse(saved) : [
        {
          id: 'n_welcome',
          title: 'Welcome to OOP Pedagogical Hub! 🎓',
          message: 'Explore courses, watch tutorials, and practice coding inside our Sandbox IDE.',
          timestamp: 'Just Now',
          isRead: false,
          type: 'unlock'
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('oophub_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>(INITIAL_LEADERBOARD_USERS);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>(INITIAL_SUBMISSIONS);
  const [curriculumModules, setCurriculumModules] = useState<CurriculumModule[]>(INITIAL_CURRICULUM_MODULES);
  const [lessonItems, setLessonItems] = useState<LessonItem[]>(INITIAL_LESSON_ITEMS);
  const [adaptiveRules, setAdaptiveRules] = useState<AdaptiveRule[]>(INITIAL_ADAPTIVE_RULES);

  // Live reviews returned from Dr. Elena Vance
  const [recentStudentGrade, setRecentStudentGrade] = useState<{ grade: number; feedback: string; challenge: string } | null>(
    DEMO_STUDENT_GRADE
  );

  // Monitoring Connection System State
  const [monitoringRequests, setMonitoringRequests] = useState<MonitoringRequest[]>(() => {
    try {
      const saved = localStorage.getItem('oophub_monitoring_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Seed initial accepted connections for Elena Vance (demo teacher)
    return [
      {
        id: 'req_1',
        teacherEmail: 'elena@oophub.edu',
        teacherName: 'Dr. Elena Vance',
        studentEmail: 'dmitry@oophub.edu',
        studentName: 'Dmitry Vance (Alex Mercer)',
        studentId: 'STU-0001',
        status: 'accepted'
      },
      {
        id: 'req_2',
        teacherEmail: 'elena@oophub.edu',
        teacherName: 'Dr. Elena Vance',
        studentEmail: 'rodriguez@oophub.edu',
        studentName: 'S. Rodriguez',
        studentId: 'STU-0002',
        status: 'accepted'
      },
      {
        id: 'req_3',
        teacherEmail: 'elena@oophub.edu',
        teacherName: 'Dr. Elena Vance',
        studentEmail: 'volkov@oophub.edu',
        studentName: 'Dmitry Volkov',
        studentId: 'STU-0003',
        status: 'accepted'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('oophub_monitoring_requests', JSON.stringify(monitoringRequests));
  }, [monitoringRequests]);

  // Video Management & Progress Handlers
  const addNotification = (title: string, message: string, type: 'upload' | 'update' | 'assign' | 'unlock') => {
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      title,
      message,
      timestamp: 'Just Now',
      isRead: false,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleUploadVideo = (video: VideoLesson) => {
    setVideoLessons(prev => {
      const next = [...prev, video];
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
    addNotification(
      `New Video: ${video.title} 🎥`,
      `A new lesson has been added to "${video.module}" in the syllabus.`,
      'upload'
    );
  };

  const handleEditVideo = (updatedVideo: VideoLesson) => {
    setVideoLessons(prev => {
      const next = prev.map(l => l.id === updatedVideo.id ? updatedVideo : l);
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
    addNotification(
      `Video updated: ${updatedVideo.title} 🔄`,
      `The video contents and details for "${updatedVideo.title}" have been updated by administrators.`,
      'update'
    );
  };

  const handleArchiveVideo = (id: string) => {
    setVideoLessons(prev => {
      const next = prev.map(l => l.id === id ? { ...l, isArchived: !l.isArchived } : l);
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteVideo = (id: string) => {
    setVideoLessons(prev => {
      const next = prev.filter(l => l.id !== id);
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
  };

  const handleUpdateVideoSequence = (id: string, newSeq: number) => {
    setVideoLessons(prev => {
      const next = prev.map(l => l.id === id ? { ...l, sequence: newSeq } : l);
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
  };

  const handleUpdateVideoProgress = (videoId: string, progress: number) => {
    const userEmail = currentUser?.email || 'student@oophub.edu';
    setVideoLessons(prev => {
      const next = prev.map(video => {
        if (video.id !== videoId) return video;
        
        const prevProgress = video.progressPercent || 0;
        const nextProgress = Math.max(prevProgress, progress);
        const isCompletedNow = nextProgress >= 95 && video.status !== 'completed';
        
        let completed = [...(video.completedStudents || [])];
        let inProgress = [...(video.inProgressStudents || [])];
        let notStarted = [...(video.notStartedStudents || [])];
        
        notStarted = notStarted.filter(s => s !== userEmail);
        
        if (nextProgress >= 95) {
          if (!completed.includes(userEmail)) completed.push(userEmail);
          inProgress = inProgress.filter(s => s !== userEmail);
        } else if (nextProgress > 0) {
          if (!inProgress.includes(userEmail)) inProgress.push(userEmail);
          completed = completed.filter(s => s !== userEmail);
        }
        
        const updatedVideo = {
          ...video,
          progressPercent: nextProgress,
          status: (isCompletedNow ? 'completed' : video.status) as any,
          completedStudents: completed,
          inProgressStudents: inProgress,
          notStartedStudents: notStarted,
          views: isCompletedNow ? (video.views || 0) + 1 : (video.views || 0)
        };

        if (isCompletedNow) {
          setPoints(p => p + 100);
          setCompletedLessonsCount(c => clampCompletedLessons(c + 1));
          
          addNotification(
            `Lesson Completed! 🎉`,
            `You finished watching "${video.title}". +100 XP gained.`,
            'unlock'
          );
          
          if (video.unlockedAssessmentId) {
            addNotification(
              `Quiz Assessment Unlocked! 🔓`,
              `You have unlocked the quiz assessment linked to "${video.title}".`,
              'unlock'
            );
          }
          
        }

        return updatedVideo;
      });
      localStorage.setItem('oophub_video_lessons', JSON.stringify(next));
      return next;
    });
  };

  // Utility to lookup a student by email/ID
  const findStudentByEmailOrId = (query: string) => {
    const normalized = query.trim().toLowerCase();
    
    // 1. Check default demo student
    if ('dmitry@oophub.edu' === normalized || 'stu-0001' === normalized) {
      return { name: 'Dmitry Vance (Alex Mercer)', email: 'dmitry@oophub.edu', userId: 'STU-0001' };
    }
    
    // 2. Check other mock students
    const mockStudents = [
      { name: 'S. Rodriguez', email: 'rodriguez@oophub.edu', userId: 'STU-0002' },
      { name: 'Dmitry Volkov', email: 'volkov@oophub.edu', userId: 'STU-0003' },
      { name: 'J. Chen', email: 'chen@oophub.edu', userId: 'STU-0004' },
      { name: 'Elena Rossi', email: 'rossi@oophub.edu', userId: 'STU-0005' },
      { name: 'Liam Hughes', email: 'hughes@oophub.edu', userId: 'STU-0006' }
    ];
    const matched = mockStudents.find(s => s.email.toLowerCase() === normalized || s.userId.toLowerCase() === normalized);
    if (matched) return matched;
    
    // 3. Check custom users in localStorage
    try {
      const saved = localStorage.getItem('oophub_users');
      if (saved) {
        const users = JSON.parse(saved);
        const found = users.find((u: any) => u.role === 'student' && (u.email.toLowerCase() === normalized || (u.userId && u.userId.toLowerCase() === normalized)));
        if (found) {
          return { name: found.name, email: found.email, userId: found.userId || 'STU-CUSTOM' };
        }
      }
    } catch {}
    
    return null;
  };

  // Connection actions
  const handleSendMonitoringRequest = (studentEmailOrId: string) => {
    if (!currentUser) return { success: false, message: 'Not authenticated' };
    
    const found = findStudentByEmailOrId(studentEmailOrId);
    if (!found) {
      return { success: false, message: `No student found with Email or ID: "${studentEmailOrId}"` };
    }
    
    const existing = monitoringRequests.find(
      req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase() &&
             req.studentEmail.toLowerCase() === found.email.toLowerCase()
    );
    
    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, message: `You are already monitoring ${found.name}.` };
      }
      if (existing.status === 'pending') {
        return { success: false, message: `A pending request is already sent to ${found.name}.` };
      }
      // If rejected, allow re-sending by transitioning back to pending
      setMonitoringRequests(prev => prev.map(r => r.id === existing.id ? { ...r, status: 'pending' } : r));
      return { success: true, message: `Re-sent monitoring request to ${found.name}.` };
    }
    
    const newRequest: MonitoringRequest = {
      id: `req_${Date.now()}`,
      teacherEmail: currentUser.email,
      teacherName: currentUser.name,
      studentEmail: found.email,
      studentName: found.name,
      studentId: found.userId,
      status: 'pending'
    };
    
    setMonitoringRequests(prev => [...prev, newRequest]);
    return { success: true, message: `Monitoring request successfully sent to ${found.name}!` };
  };

  const handleRemoveMonitoringConnection = (requestId: string) => {
    setMonitoringRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const handleAcceptMonitoringRequest = (requestId: string) => {
    setMonitoringRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'accepted' } : req));
  };

  const handleRejectMonitoringRequest = (requestId: string) => {
    setMonitoringRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'rejected' } : req));
  };


  useEffect(() => {
    if (currentUser?.role !== 'student') {
      return;
    }

    const progress = currentUser.accountSource === 'demo' ? DEMO_STUDENT_PROGRESS : NEW_STUDENT_PROGRESS;

    setStreak(progress.streak);
    setPoints(progress.points);
    setCompletedLessonsCount(progress.completedLessonsCount);
    setRecentStudentGrade(currentUser.accountSource === 'demo' ? DEMO_STUDENT_GRADE : null);
    setLeaderboardUsers(prev => prev.map(entry => (
      entry.isCurrentUser
        ? {
            ...entry,
            name: `${currentUser.name} (You)`,
            points: progress.points,
            streak: progress.streak,
            badges: currentUser.accountSource === 'demo' ? DEMO_STUDENT_BADGES : []
          }
        : entry
    )));
  }, [currentUser?.accountSource, currentUser?.email, currentUser?.name, currentUser?.role]);

  // Core functions to interactively link dashboards together
  
  // 1. When student compiles and submits vehicle code
  const handleStudentSubmitCode = (submittedCode: string) => {
    // Increment points & complete lessons count
    setPoints(prev => prev + 150);
    setStreak(prev => prev + 1);
    setCompletedLessonsCount(prev => clampCompletedLessons(prev + 1));

    // Append new active row inside Instructor queue review pending
    const newSub: PendingSubmission = {
      id: `sub_${Date.now()}`,
      studentName: currentUser ? `${currentUser.name} (You)` : 'Alex Mercer (You)',
      challengeName: 'Inheritance Constraints with Vehicle/Car Override',
      submittedAt: 'Just Now',
      status: 'pending',
      code: submittedCode
    };

    setPendingSubmissions(prev => [newSub, ...prev]);

    // Lift leaderboard rankings score dynamically on the current student row
    setLeaderboardUsers(prev => prev.map(u => {
      if (u.isCurrentUser) {
        return { ...u, points: u.points + 150, streak: u.streak + 1 };
      }
      return u;
    }));

    // Unlock Chapter 4 Lesson
    setVideoLessons(prev => prev.map(l => {
      if (l.id === 'l4') {
        return { ...l, status: 'active' };
      }
      return l;
    }));
  };

  // 2. When student passes diagnostic MCQ
  const handleCorrectAnswerAdded = (xpAward: number) => {
    setPoints(prev => prev + xpAward);
    setStreak(prev => prev + 1);

    // Bump user points row in leaderboard ranking
    setLeaderboardUsers(prev => prev.map(u => {
      if (u.isCurrentUser) {
        return { ...u, points: u.points + xpAward, streak: u.streak + 1, trend: 'up' };
      }
      return u;
    }));

    // Post mock success grading notification immediately to Student Dashboard reviews
    setRecentStudentGrade({
      grade: 100,
      feedback: `Correct diagnosis! You parsed the JVM late binding dynamic dispatch table layout perfectly. Option B was correct. Keep up this momentum${currentUser ? `, ${currentUser.name.split(/\s+/)[0]}` : ''}!`,
      challenge: "Scenario 04: The Fleet Manager"
    });

    addNotification(
      `Coding Exercises Unlocked! 🔓`,
      `You passed the assessment. Sandbox IDE exercises are now unlocked.`,
      'unlock'
    );
  };

  // 3. When teacher drafts score reviews inside Instructor grading panels
  const handleGradeSubmission = (submissionId: string, gradeScore: number, feedbackNotes: string) => {
    setPendingSubmissions(prev => prev.map(s => {
      if (s.id === submissionId) {
        return { ...s, status: 'reviewed', grade: gradeScore, feedback: feedbackNotes };
      }
      return s;
    }));

    // If grading the current student's submission, sync immediately with student recent portfolio records
    const targetSub = pendingSubmissions.find(s => s.id === submissionId);
    if (targetSub && targetSub.studentName.includes('(You)')) {
      setRecentStudentGrade({
        grade: gradeScore,
        feedback: feedbackNotes,
        challenge: targetSub.challengeName
      });
      setPoints(prev => prev + 100); // Incentive
    }
  };

  // 4. Admin curriculum controls
  const handleAddLessonItem = (newItem: LessonItem) => {
    setLessonItems(prev => [...prev, newItem]);
    
    // Increment connected lessons counts in matching parent module metadata
    setCurriculumModules(prev => prev.map(m => {
      if (m.title === newItem.module) {
        return { ...m, lessonsCount: m.lessonsCount + 1 };
      }
      return m;
    }));
  };

  const handleDeleteLessonItem = (lessonId: string) => {
    const targetItem = lessonItems.find(l => l.id === lessonId);
    if (!targetItem) return;

    setLessonItems(prev => prev.filter(l => l.id !== lessonId));
    setCurriculumModules(prev => prev.map(m => {
      if (m.title === targetItem.module) {
        return { ...m, lessonsCount: Math.max(m.lessonsCount - 1, 0) };
      }
      return m;
    }));
  };

  const handleUpdateModuleStatus = (moduleId: string, newStatus: 'Published' | 'Draft' | 'Archived') => {
    setCurriculumModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        return { ...m, status: newStatus };
      }
      return m;
    }));
  };

  // 5. Admin Recommendation Engine Controls
  const handleAddAdaptiveRule = (newRule: AdaptiveRule) => {
    setAdaptiveRules(prev => [...prev, newRule]);
  };

  const handleDeleteAdaptiveRule = (ruleId: string) => {
    setAdaptiveRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleToggleAdaptiveRule = (ruleId: string) => {
    setAdaptiveRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        return { ...r, isActive: !r.isActive };
      }
      return r;
    }));
  };

  // Switcher trigger paths
  const handleEnterStudentView = () => {
    setPersona('student');
    setStudentTab('dashboard');
  };

  const handleDirectNavigation = (view: StudentSubView) => {
    setStudentTab(view);
  };

  // Retrieve count of pending reviews for floating badge alerts
  const needsGradingCount = pendingSubmissions.filter(s => s.status === 'pending').length;
  const displayUser: AuthenticatedUser = currentUser ?? {
    name: persona === 'student' ? 'Student User' : persona === 'teacher' ? 'Teacher User' : 'Admin User',
    email: persona === 'student' ? 'student@oophub.edu' : persona === 'teacher' ? 'teacher@oophub.edu' : 'admin@oophub.edu',
    role: persona === 'public' ? 'student' : persona,
    accountSource: 'demo',
    userId: persona === 'student' ? 'STU-0000' : persona === 'teacher' ? 'TEA-0000' : 'ADM-0000',
    registrationDate: '2026-06-01T00:00:00.000Z',
    accountStatus: 'Active',
    studentNumber: '2026-0000',
    course: 'BS Information Technology',
    yearLevel: '3rd Year',
    section: 'IT-3A',
    programStatus: 'Regular',
    employeeId: 'EMP-0000',
    department: 'College of Computer Studies',
    specialization: 'Object-Oriented Programming',
    assignedCourses: 'OOP 101, Advanced Java',
    adminId: 'ADM-0000',
    systemRole: 'Administrator',
    accessLevel: 'Level 4',
    onlineStatus: 'online',
    avatar: ''
  };

  const learningProgress = Math.min(100, Math.round((completedLessonsCount / OOP_LESSON_COUNT) * 100));
  const profileMetrics = displayUser.role === 'teacher'
    ? [
        { label: 'Courses Created', value: String(lessonItems.length), helper: 'Lessons and catalog items prepared for students' },
        { label: 'Total Students', value: String(leaderboardUsers.length), helper: 'Students currently visible in the active cohort' },
        { label: 'Assessments Managed', value: String(INITIAL_QUESTIONS.length + pendingSubmissions.length), helper: 'Question banks and submissions under review' }
      ]
    : displayUser.role === 'admin'
      ? [
          { label: 'Total Users Managed', value: String(leaderboardUsers.length + 2), helper: 'Student, teacher, and administrator accounts' },
          { label: 'Total Courses', value: String(curriculumModules.length), helper: 'Curriculum modules available in the system' },
          { label: 'System Status', value: 'Online', helper: 'Pedagogical core services are currently active' }
        ]
      : [
          { label: 'Completed Courses', value: completedLessonsCount >= OOP_LESSON_COUNT ? '1' : '0', helper: 'Courses completed from the active learning path' },
          { label: 'Learning Progress', value: `${learningProgress}%`, helper: 'Progress through the current OOP module sequence' },
          { label: 'Certificates Earned', value: points >= 1500 ? '1' : '0', helper: 'Certificates unlocked by finishing course requirements' }
        ];

  const handleUpdateProfile = (updates: Partial<AuthenticatedUser>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;

      const updated = { ...prev, ...updates };
      persistSessionUser(updated);

      if (prev.accountSource === 'custom') {
        if (prev.id && prev.token) {
          userApi.updateProfile(prev.id, updates).catch(error => {
            console.warn('Unable to sync profile changes with backend:', error);
          });
        }

        try {
          const saved = localStorage.getItem('oophub_users');
          const usersList = saved ? JSON.parse(saved) : [];
          const nextUsers = usersList.map((stored: any) => (
            stored.email?.toLowerCase() === prev.email.toLowerCase()
              ? { ...stored, ...updates }
              : stored
          ));
          localStorage.setItem('oophub_users', JSON.stringify(nextUsers));
        } catch {
          // Profile edits remain in the active session if local storage is unavailable.
        }
      }

      return updated;
    });
  };

  const isDark = theme === 'dark';
  const adminNavItems: Array<{ id: AdminSubView; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'library', label: 'Content Library', icon: <Library className="w-4 h-4" /> },
    { id: 'videos', label: 'Video Tutorials', icon: <Film className="w-4 h-4" /> },
    { id: 'assessments', label: 'Assessments', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4" /> },
    { id: 'terms', label: 'Terms & Policies', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SlidersHorizontal className="w-4 h-4" /> }
  ];

  const adminViewMeta: Record<AdminSubView, { title: string; description: string }> = {
    dashboard: {
      title: 'Admin Dashboard',
      description: 'Monitor students, teachers, courses, mastery gaps, and platform health in one workspace.'
    },
    users: {
      title: 'User Management',
      description: 'Search, filter, and review student, teacher, and administrator account activity.'
    },
    courses: {
      title: 'Courses',
      description: 'Manage active course modules, publication status, and connected OOP lessons.'
    },
    library: {
      title: 'Content Library',
      description: 'Organize videos, labs, quizzes, and reusable OOP learning materials.'
    },
    videos: {
      title: 'Video Tutorials Management',
      description: 'Upload, edit, organize, and manage tutorial videos and sync with Cloudinary storage.'
    },
    assessments: {
      title: 'Assessments',
      description: 'Review adaptive assessment rules, remediation triggers, and challenge logic.'
    },
    analytics: {
      title: 'Analytics',
      description: 'Analyze learner engagement, course performance, and concept mastery trends.'
    },
    reports: {
      title: 'Reports',
      description: 'Track institutional summaries, weekly learning outcomes, and operational signals.'
    },
    terms: {
      title: 'Terms & Policies',
      description: 'Publish platform agreements, manage privacy policy content, and review consent audit records.'
    },
    settings: {
      title: 'Settings',
      description: 'Adjust recommendation rules, system automation, and platform preferences.'
    },
    profile: {
      title: 'User Profile & Credentials',
      description: 'Manage your personal details and administrative system access.'
    }
  };

  const sidebarWidthClass = isSidebarCollapsed ? 'md:w-20' : 'md:w-64';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-250 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`} id="master-app-canvas">
      

      {/* Main Rendering Logic block depending on Persona */}
      {isRestoringSession ? (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
          <div className="space-y-3">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
            <p className="text-sm font-bold text-slate-600">Restoring your workspace...</p>
          </div>
        </main>
      ) : authMode ? (
        <AuthPage 
          initialMode={authMode}
          onCancel={() => setAuthMode(null)}
          onAuthSuccess={(user) => {
            persistSessionUser(user);
            setCurrentUser(user);
            setPersona(user.role);
            setAuthMode(null);
            if (user.role === 'student') {
              const progress = user.accountSource === 'demo' ? DEMO_STUDENT_PROGRESS : NEW_STUDENT_PROGRESS;

              setStudentTab('dashboard');
              setStreak(progress.streak);
              setPoints(progress.points);
              setCompletedLessonsCount(progress.completedLessonsCount);
              setRecentStudentGrade(user.accountSource === 'demo' ? DEMO_STUDENT_GRADE : null);
              setLeaderboardUsers(prev => prev.map(entry => (
                entry.isCurrentUser
                  ? {
                      ...entry,
                      name: `${user.name} (You)`,
                      points: progress.points,
                      streak: progress.streak,
                      badges: user.accountSource === 'demo' ? DEMO_STUDENT_BADGES : []
                    }
                  : entry
              )));
            } else if (user.role === 'teacher') {
              setTeacherTab('dashboard');
            } else if (user.role === 'admin') {
              setAdminTab('dashboard');
            }
          }}
        />
      ) : persona === 'public' ? (
        <LandingPage 
          onStartLearning={() => setAuthMode('login')} 
          onSelectPersona={(p) => {
            setAuthMode('login');
          }}
          onAuthTrigger={(mode) => setAuthMode(mode)}
          theme={theme}
          setTheme={setTheme}
        />
      ) : (
        <div className="flex-grow flex flex-col">
          <Navbar 
            user={displayUser}
            theme={theme}
            setTheme={setTheme}
            onNavigate={(view) => {
              if (persona === 'student') setStudentTab(view as StudentSubView);
              else if (persona === 'teacher') setTeacherTab(view as TeacherSubView);
              else if (persona === 'admin') setAdminTab(view as AdminSubView);
            }}
            onUpdateProfile={handleUpdateProfile}
            onLogoutTrigger={() => setShowLogoutConfirm(true)}
          />
          <div className="flex-grow flex flex-col md:flex-row">
            
            {/* Universal Persona Sidebar Layout */}
            <aside className={`hidden md:flex ${sidebarWidthClass} bg-slate-900 text-slate-300 border-r border-slate-800 flex-col shrink-0 transition-all duration-200`} id="portal-sidebar-nav">
            
            {/* Top Workspace Identity block */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'md:justify-center md:w-full' : ''}`}>
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                  {persona === 'student' ? 'S' : persona === 'teacher' ? 'T' : 'A'}
                </div>
                <div className={isSidebarCollapsed ? 'md:hidden' : ''}>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-white leading-tight font-mono">
                    {persona === 'student' ? 'Student Workspace' : persona === 'teacher' ? 'Instructor Portal' : 'Admin Console'}
                  </h2>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                    {currentUser ? currentUser.name : (persona === 'student' ? 'Alex Mercer' : persona === 'teacher' ? 'Dr. Elena Vance' : 'Chief Curriculum Architect')}
                  </span>
                </div>
              </div>

              {/* Mobile menus triggers */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1 bg-slate-800 rounded text-slate-300 cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Sidebar lists */}
            <nav className={`flex-grow p-4 space-y-1.5 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`} id="sidebar-action-list">
              
              {/* STUDENT TAB LINKS */}
              {persona === 'student' && [
                { id: 'dashboard', label: '📊 Dashboard Overview', icon: <Compass className="w-4 h-4" /> },
                { id: 'ide', label: '🎮 Sandbox Practice IDE', icon: <Code2 className="w-4 h-4" /> },
                { id: 'videos', label: '🎥 Course Syllabus', icon: <BookOpen className="w-4 h-4" /> },
                { id: 'assessments', label: '💡 Diagnosis Quiz', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'leaderboard', label: '🏆 Hall of Fame', icon: <Award className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`side-btn-${tab.id}`}
                  onClick={() => {
                    setStudentTab(tab.id as StudentSubView);
                    setIsMobileMenuOpen(false);
                  }}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''} ${studentTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  {tab.icon}
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{tab.label}</span>
                </button>
              ))}

              {/* TEACHER TAB LINKS */}
              {persona === 'teacher' && [
                { id: 'dashboard', label: '👩‍🏫 Instructor Dashboard', icon: <Compass className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`side-teacher-btn-${tab.id}`}
                  onClick={() => {
                    setTeacherTab(tab.id as TeacherSubView);
                    setIsMobileMenuOpen(false);
                  }}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''} ${teacherTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  {tab.icon}
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{tab.label}</span>
                </button>
              ))}

              {/* ADMIN TAB LINKS */}
              {persona === 'admin' && adminNavItems.map((tab) => (
                <button
                  key={tab.id}
                  id={`side-admin-btn-${tab.id}`}
                  onClick={() => {
                    setAdminTab(tab.id as AdminSubView);
                    setIsMobileMenuOpen(false);
                  }}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`relative w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''} ${adminTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400 hover:text-emerald-100'}`}
                >
                  {adminTab === tab.id && !isSidebarCollapsed && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white/80" />}
                  {tab.icon}
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>{tab.label}</span>
                </button>
              ))}

              {/* public exit shortcut */}
              <div className="pt-6 border-t border-slate-800/80 mt-6 space-y-2 block">
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className={`w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-205 text-[11px] font-bold text-left cursor-pointer transition flex items-center gap-1.5 ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
                >
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Theme: {theme === 'light' ? 'Light' : 'Dark'}</span>
                  <span className={`hidden ${isSidebarCollapsed ? 'md:inline' : ''}`}>{theme === 'light' ? 'L' : 'D'}</span>
                </button>
                <button
                  id="side-btn-exit"
                  onClick={() => {
                    setShowLogoutConfirm(true);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-202 text-[11px] font-bold text-left cursor-pointer transition flex items-center gap-1.5 ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className={isSidebarCollapsed ? 'md:hidden' : ''}>Logout</span>
                </button>
              </div>

            </nav>

            {/* Sidebar quick status display */}
            <div className={`p-5 border-t border-slate-800 bg-slate-950/20 text-center font-mono text-[10px] text-slate-400 md:block hidden ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
              <div>Pedagogical Core: <span className="text-[#10b981] font-bold">ONLINE</span></div>
              <div className="text-[9px] mt-0.5 text-slate-500">Workspace hash: aq_25556</div>
            </div>

          </aside>

          {/* Core Content canvas */}
          <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6 overflow-y-auto" id="portal-content-canvas">
            
            {/* Header / Sub Header description */}
            <div className={`pb-5 mb-4 border-b flex justify-between items-center flex-wrap gap-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`} id="view-content-header">
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight capitalize leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {persona === 'student' && studentTab === 'dashboard' && 'Student Workspace Dashboard'}
                  {persona === 'student' && studentTab === 'ide' && 'Dynamic Java Compiler Sandbox'}
                  {persona === 'student' && studentTab === 'videos' && 'Syllabus Playlist & Lesson Lectures'}
                  {persona === 'student' && studentTab === 'assessments' && 'Interactive MCQ Scenario Simulator'}
                  {persona === 'student' && studentTab === 'leaderboard' && 'Active CS Cohort Rankings'}
                  {persona === 'teacher' && teacherTab === 'dashboard' && 'Instructor Cohort Evaluation Dashboard'}
                  {persona === 'admin' && adminViewMeta[adminTab].title}
                  {((persona === 'student' && studentTab === 'profile') ||
                    (persona === 'teacher' && teacherTab === 'profile')) && 'User Profile & Credentials'}
                </h1>
                <p className={`text-xs font-medium mt-1 leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {persona === 'student' && studentTab === 'dashboard' && 'Track progress scores, active streaks, and watch specialized adaptive loop recommendations.'}
                  {persona === 'student' && studentTab === 'ide' && 'Extend base Java classes, call super constructors, and run simulated tests instantly.'}
                  {persona === 'student' && studentTab === 'videos' && 'View loop animations of dispatch lookups and write synchronized local study notes.'}
                  {persona === 'student' && studentTab === 'assessments' && 'Diagnose Company Fleet dispatch hierarchies to earn high achievement points.'}
                  {persona === 'student' && studentTab === 'leaderboard' && 'Observe podium standings, select students profiles, and fast-track metrics.'}
                  {persona === 'teacher' && teacherTab === 'dashboard' && 'Review sandbox compiler drafts, enter academic feedbacks, and submit final grades.'}
                  {persona === 'admin' && adminViewMeta[adminTab].description}
                  {((persona === 'student' && studentTab === 'profile') ||
                    (persona === 'teacher' && teacherTab === 'profile')) && 'Manage your personal details, academic enrolment cards, teacher qualifications, or administrative system access.'}
                </p>
              </div>

              {/* Status Pill indicators */}
              <div className="flex gap-2 items-center text-xs shrink-0 font-medium select-none">
                {persona === 'student' && (
                  <>
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 font-bold" /> {streak} {streak === 1 ? 'Day' : 'Days'} Streak
                    </span>
                    <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200">
                      <Award className="w-3.5 h-3.5 text-indigo-600" /> {points} XP
                    </span>
                  </>
                )}

                {persona === 'teacher' && (
                  <span className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200 font-bold">
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    Review Inbox ({needsGradingCount} Pending)
                  </span>
                )}

                {persona === 'admin' && (
                  <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-[10.5px]">
                    ● Engine Mode: ADAPTIVE_SYNC
                  </span>
                )}
              </div>
            </div>

            {/* Sub View Router rendering */}
            
            {/* STUDENT MODE VIEWS */}
            {persona === 'student' && studentTab === 'dashboard' && (
              <StudentDashboard 
                userName={currentUser?.name ?? 'Student'}
                streak={streak}
                points={points}
                completedLessonsCount={completedLessonsCount}
                recentGrade={recentStudentGrade}
                onNavigateTo={handleDirectNavigation}
                currentUser={displayUser}
                monitoringRequests={monitoringRequests}
                onAcceptRequest={handleAcceptMonitoringRequest}
                onRejectRequest={handleRejectMonitoringRequest}
                theme={theme}
                notifications={notifications}
                onMarkNotificationRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
              />
            )}

            {persona === 'student' && studentTab === 'ide' && (
              <PracticeIDE 
                initialFiles={INITIAL_JAVA_FILES} 
                onSubmitCompleted={handleStudentSubmitCode}
              />
            )}

            {persona === 'student' && studentTab === 'videos' && (
              <VideoTutorials 
                lessons={videoLessons} 
                onNavigateTo={handleDirectNavigation}
                onUpdateVideoProgress={handleUpdateVideoProgress}
              />
            )}

            {persona === 'student' && studentTab === 'assessments' && (
              <Assessments 
                onNavigateTo={(view) => setStudentTab(view as any)}
                onCorrectAnswerAdded={handleCorrectAnswerAdded}
                lessons={videoLessons}
              />
            )}

            {persona === 'student' && studentTab === 'leaderboard' && (
              <Leaderboard 
                users={leaderboardUsers}
              />
            )}

            {/* INSTRUCTOR TEACHER PORTAL */}
            {persona === 'teacher' && teacherTab === 'dashboard' && (
              <TeacherPortal 
                submissions={pendingSubmissions}
                onGradeSubmission={handleGradeSubmission}
                onSelectPersona={(p) => setPersona(p)}
                currentUser={displayUser}
                monitoringRequests={monitoringRequests}
                onSendRequest={handleSendMonitoringRequest}
                onRemoveConnection={handleRemoveMonitoringConnection}
                theme={theme}
              />
            )}

            {/* ADMIN CONSOLES */}
            {persona === 'admin' && ['dashboard', 'users', 'analytics', 'reports'].includes(adminTab) && (
              <AdminDashboard
                modules={curriculumModules}
                lessons={lessonItems}
                rules={adaptiveRules}
                submissions={pendingSubmissions}
                leaderboardUsers={leaderboardUsers}
                activeView={adminTab}
              />
            )}

            {persona === 'admin' && ['courses', 'library'].includes(adminTab) && (
              <AdminCurriculum 
                modules={curriculumModules}
                lessons={lessonItems}
                onAddLesson={handleAddLessonItem}
                onDeleteLesson={handleDeleteLessonItem}
                onUpdateModule={handleUpdateModuleStatus}
                videoLessons={videoLessons}
                onAddVideo={handleUploadVideo}
                onEditVideo={handleEditVideo}
                onArchiveVideo={handleArchiveVideo}
                onDeleteVideo={handleDeleteVideo}
                onUpdateVideoSequence={handleUpdateVideoSequence}
              />
            )}

            {persona === 'admin' && ['assessments', 'settings'].includes(adminTab) && (
              <AdminEngine 
                rules={adaptiveRules}
                onAddRule={handleAddAdaptiveRule}
                onDeleteRule={handleDeleteAdaptiveRule}
                onToggleRule={handleToggleAdaptiveRule}
              />
            )}

            {persona === 'admin' && adminTab === 'videos' && (
              <AdminVideoManager
                lessons={videoLessons}
                onAddVideo={handleUploadVideo}
                onEditVideo={handleEditVideo}
                onArchiveVideo={handleArchiveVideo}
                onDeleteVideo={handleDeleteVideo}
                onUpdateSequence={handleUpdateVideoSequence}
              />
            )}

            {persona === 'admin' && adminTab === 'terms' && (
              <AdminTermsManager />
            )}

            {/* UNIVERSAL USER PROFILE PAGE */}
            {((persona === 'student' && studentTab === 'profile') ||
              (persona === 'teacher' && teacherTab === 'profile') ||
              (persona === 'admin' && adminTab === 'profile')) && (
              <ProfilePage 
                user={displayUser}
                metrics={profileMetrics}
                onUpdateProfile={handleUpdateProfile}
              />
            )}

          </main>

        </div>
      </div>
      )}

      {persona === 'student' && !authMode && (
        <nav className={`fixed inset-x-3 bottom-3 z-[95] grid grid-cols-5 rounded-lg border p-1 shadow-2xl backdrop-blur md:hidden transition-colors ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 shadow-black/40 text-slate-355' 
            : 'bg-white/95 border-slate-200 shadow-slate-200/50 text-slate-500'
        }`}>
          {[
            { id: 'dashboard', label: 'Overview', icon: <Compass className="w-4 h-4" /> },
            { id: 'ide', label: 'Sandbox', icon: <Code2 className="w-4 h-4" /> },
            { id: 'videos', label: 'Syllabus', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'assessments', label: 'Quiz', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'leaderboard', label: 'Rankings', icon: <Award className="w-4 h-4" /> },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStudentTab(item.id as StudentSubView)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-extrabold transition cursor-pointer ${
                studentTab === item.id
                  ? 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-450'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {item.icon}
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {persona === 'admin' && !authMode && (
        <nav className={`fixed inset-x-3 bottom-3 z-[95] grid grid-cols-5 rounded-lg border p-1 shadow-2xl backdrop-blur md:hidden transition-colors ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 shadow-black/40 text-slate-355' 
            : 'bg-white/95 border-slate-200 shadow-slate-200/50 text-slate-500'
        }`}>
          {adminNavItems
            .filter(item => ['dashboard', 'users', 'courses', 'terms', 'settings'].includes(item.id))
            .map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAdminTab(item.id)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-extrabold transition cursor-pointer ${
                  adminTab === item.id
                    ? 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-450'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.icon}
                <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
              </button>
            ))}
        </nav>
      )}

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in" id="logout-confirm-modal">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4 animate-scale-in text-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 border border-rose-100">
                <LogOut className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Are you sure?</h3>
              <p className="text-xs text-slate-500 font-medium">You will be logged out of your current session.</p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                id="logout-confirm-no"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border border-slate-250 hover:border-slate-350 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer select-none"
              >
                No
              </button>
              <button
                id="logout-confirm-yes"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  setPersona('public');
                  setCurrentUser(null);
                  setAuthToken('');
                  clearSessionUser();
                  setAuthMode(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-rose-100 cursor-pointer select-none"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
