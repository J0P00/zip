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
  UserRound
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
  MonitoringRequest
} from './types';

// Import Mock Data
import { 
  INITIAL_JAVA_FILES, 
  INITIAL_LESSONS, 
  INITIAL_QUESTIONS, 
  INITIAL_LEADERBOARD_USERS, 
  INITIAL_SUBMISSIONS, 
  INITIAL_CURRICULUM_MODULES, 
  INITIAL_LESSON_ITEMS, 
  INITIAL_ADAPTIVE_RULES 
} from './data/mockData';

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
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import Navbar from './components/Navbar';

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

export default function App() {
  // Core Persona and Navigation state
  const [persona, setPersona] = useState<Persona>('public');
  const [studentTab, setStudentTab] = useState<StudentSubView>('dashboard');
  const [teacherTab, setTeacherTab] = useState<TeacherSubView>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminSubView>('curriculum');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Authenticated user profile and state triggers
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Student Statistics State
  const [streak, setStreak] = useState<number>(DEMO_STUDENT_PROGRESS.streak);
  const [points, setPoints] = useState<number>(DEMO_STUDENT_PROGRESS.points);
  const [completedLessonsCount, setCompletedLessonsCount] = useState<number>(DEMO_STUDENT_PROGRESS.completedLessonsCount);

  // Dynamic shared database states
  const [videoLessons, setVideoLessons] = useState<VideoLesson[]>(INITIAL_LESSONS);
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
    setCompletedLessonsCount(prev => Math.min(prev + 1, 5));

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

  const learningProgress = Math.min(100, Math.round((completedLessonsCount / 5) * 100));
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
          { label: 'Completed Courses', value: completedLessonsCount >= 5 ? '1' : '0', helper: 'Courses completed from the active learning path' },
          { label: 'Learning Progress', value: `${learningProgress}%`, helper: 'Progress through the current OOP module sequence' },
          { label: 'Certificates Earned', value: points >= 1500 ? '1' : '0', helper: 'Certificates unlocked by finishing course requirements' }
        ];

  const handleUpdateProfile = (updates: Partial<AuthenticatedUser>) => {
    setCurrentUser(prev => {
      if (!prev) return prev;

      const updated = { ...prev, ...updates };

      if (prev.accountSource === 'custom') {
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

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-250 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`} id="master-app-canvas">
      

      {/* Main Rendering Logic block depending on Persona */}
      {authMode ? (
        <AuthPage 
          initialMode={authMode}
          onCancel={() => setAuthMode(null)}
          onAuthSuccess={(user) => {
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
              setAdminTab('curriculum');
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
            <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0" id="portal-sidebar-nav">
            
            {/* Top Workspace Identity block */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                  {persona === 'student' ? 'S' : persona === 'teacher' ? 'T' : 'A'}
                </div>
                <div>
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
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${studentTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  {tab.icon} {tab.label}
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
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${teacherTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}

              {/* ADMIN TAB LINKS */}
              {persona === 'admin' && [
                { id: 'curriculum', label: '📋 Active Curriculum', icon: <Compass className="w-4 h-4" /> },
                { id: 'engine', label: '⚡ Recommendation Rules', icon: <Settings className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`side-admin-btn-${tab.id}`}
                  onClick={() => {
                    setAdminTab(tab.id as AdminSubView);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3.5 rounded-xl font-bold text-xs text-left cursor-pointer transition-all flex items-center gap-2.5 ${adminTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}

              {/* public exit shortcut */}
              <div className="pt-6 border-t border-slate-800/80 mt-6 space-y-2 block">
                <button
                  onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                  className="w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-205 text-[11px] font-bold text-left cursor-pointer transition flex items-center gap-1.5"
                >
                  Theme: {theme === 'light' ? 'Light' : 'Dark'}
                </button>
                <button
                  id="side-btn-exit"
                  onClick={() => {
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-202 text-[11px] font-bold text-left cursor-pointer transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>

            </nav>

            {/* Sidebar quick status display */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/20 text-center font-mono text-[10px] text-slate-400 md:block hidden">
              <div>Pedagogical Core: <span className="text-[#10b981] font-bold">ONLINE</span></div>
              <div className="text-[9px] mt-0.5 text-slate-500">Workspace hash: aq_25556</div>
            </div>

          </aside>

          {/* Core Content canvas */}
          <main className="flex-1 p-6 overflow-y-auto" id="portal-content-canvas">
            
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
                  {persona === 'admin' && adminTab === 'curriculum' && 'Curriculum & Catalog Layout panels'}
                  {persona === 'admin' && adminTab === 'engine' && 'Adaptive Recommendation Engine configurations'}
                  {((persona === 'student' && studentTab === 'profile') ||
                    (persona === 'teacher' && teacherTab === 'profile') ||
                    (persona === 'admin' && adminTab === 'profile')) && 'User Profile & Credentials'}
                </h1>
                <p className={`text-xs font-medium mt-1 leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {persona === 'student' && studentTab === 'dashboard' && 'Track progress scores, active streaks, and watch specialized adaptive loop recommendations.'}
                  {persona === 'student' && studentTab === 'ide' && 'Extend base Java classes, call super constructors, and run simulated tests instantly.'}
                  {persona === 'student' && studentTab === 'videos' && 'View loop animations of dispatch lookups and write synchronized local study notes.'}
                  {persona === 'student' && studentTab === 'assessments' && 'Diagnose Company Fleet dispatch hierarchies to earn high achievement points.'}
                  {persona === 'student' && studentTab === 'leaderboard' && 'Observe podium standings, select students profiles, and fast-track metrics.'}
                  {persona === 'teacher' && teacherTab === 'dashboard' && 'Review sandbox compiler drafts, enter academic feedbacks, and submit final grades.'}
                  {persona === 'admin' && adminTab === 'curriculum' && 'Manage syllabus modules, connect catalog lectures, and import bulk records via CSV.'}
                  {persona === 'admin' && adminTab === 'engine' && 'Adjust dynamic regulatory triggers, customize matching actions, and test challenge databases.'}
                  {((persona === 'student' && studentTab === 'profile') ||
                    (persona === 'teacher' && teacherTab === 'profile') ||
                    (persona === 'admin' && adminTab === 'profile')) && 'Manage your personal details, academic enrolment cards, teacher qualifications, or administrative system access.'}
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
              />
            )}

            {persona === 'student' && studentTab === 'assessments' && (
              <Assessments 
                onNavigateTo={(view) => setStudentTab(view as any)}
                onCorrectAnswerAdded={handleCorrectAnswerAdded}
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
            {persona === 'admin' && adminTab === 'curriculum' && (
              <AdminCurriculum 
                modules={curriculumModules}
                lessons={lessonItems}
                onAddLesson={handleAddLessonItem}
                onDeleteLesson={handleDeleteLessonItem}
                onUpdateModule={handleUpdateModuleStatus}
              />
            )}

            {persona === 'admin' && adminTab === 'engine' && (
              <AdminEngine 
                rules={adaptiveRules}
                onAddRule={handleAddAdaptiveRule}
                onDeleteRule={handleDeleteAdaptiveRule}
                onToggleRule={handleToggleAdaptiveRule}
              />
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
