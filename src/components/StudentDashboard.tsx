import React from 'react';
import { 
  Flame, 
  Award, 
  Calendar, 
  BookOpen, 
  ChevronRight, 
  Play, 
  Code2, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  TrendingUp, 
  Clock,
  Zap,
  CheckCircle,
  HelpCircle,
  GraduationCap,
  Bell,
  MailOpen,
  Check
} from 'lucide-react';
import { AdaptiveRecommendation, AuthenticatedUser, MonitoringRequest, StudentSubView, NotificationItem } from '../types';
import { getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from '../data/oopCourse';
import { PRACTICE_CHALLENGES } from '../data/practiceChallenges';
import RecommendationCard from './RecommendationCard';

interface StudentDashboardProps {
  userName: string;
  streak: number;
  points: number;
  completedLessonsCount: number;
  recentGrade: { grade: number; feedback: string; challenge: string } | null;
  onNavigateTo: (view: StudentSubView) => void;
  currentUser: AuthenticatedUser;
  monitoringRequests: MonitoringRequest[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  theme?: 'light' | 'dark';
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  activeRecommendation?: AdaptiveRecommendation | null;
  recommendationHistory?: AdaptiveRecommendation[];
}

export default function StudentDashboard({
  userName,
  streak,
  points,
  completedLessonsCount,
  recentGrade,
  onNavigateTo,
  currentUser,
  monitoringRequests,
  onAcceptRequest,
  onRejectRequest,
  theme,
  notifications = [],
  onMarkNotificationRead,
  activeRecommendation,
  recommendationHistory = []
}: StudentDashboardProps) {
  const firstName = userName.trim().split(/\s+/)[0] || 'Student';
  const hasProgress = streak > 0 || points > 0 || completedLessonsCount > 0 || Boolean(recentGrade);
  const lessonCount = OOP_COURSE_LESSONS.length;
  const moduleProgress = Math.min(100, Math.round((completedLessonsCount / lessonCount) * 100));
  const weeklyActivityHours = hasProgress
    ? `${(completedLessonsCount * 1.4 + Math.min(streak, 7) * 0.4).toFixed(1)} hrs`
    : '0 hrs';
  
  // Custom styled column heights for weekly activity metrics
  const activityData = [
    { day: 'Mon', h: 'h-16', label: '1.2h' },
    { day: 'Tue', h: 'h-24', label: '1.8h' },
    { day: 'Wed', h: 'h-8', label: '0.5h' },
    { day: 'Thu', h: 'h-36', label: '2.5h' },
    { day: 'Fri', h: 'h-28', label: '2.0h' },
    { day: 'Sat', h: 'h-12', label: '0.8h' },
    { day: 'Sun', h: 'h-32', label: '2.2h', highlight: true },
  ];

  const badges = [
    { title: 'Quick Learner', desc: 'Finished classes lesson 1 in under 10 minutes', icon: '⚡', color: 'bg-amber-50 text-amber-700 border border-amber-100' },
    { title: 'Bug Hunter', desc: 'Resolved v-table hierarchy constructor errors', icon: '🐞', color: 'bg-rose-50 text-rose-700 border border-rose-100' },
    { title: 'OOP Initiate', desc: 'Completed basic class models diagnostic', icon: '🧩', color: 'bg-sky-50 text-sky-700 border border-sky-100' },
    { title: 'Rising Star', desc: 'Maintained 12-day streak multiplier', icon: '🔥', color: 'bg-emerald-50 text-emerald-800 border border-emerald-100' },
  ];
  const visibleActivityData = hasProgress ? activityData : activityData.map(d => ({ ...d, h: 'h-2', label: '0h', highlight: false }));
  const visibleBadges = hasProgress
    ? [
        { title: 'First Steps', desc: 'Started the OOP learning path', icon: '01', color: 'bg-sky-50 text-sky-700 border border-sky-100' },
        ...(completedLessonsCount > 0
          ? [{ title: 'Lab Starter', desc: 'Completed an initial compiled submission', icon: '</>', color: 'bg-emerald-50 text-emerald-800 border border-emerald-100' }]
          : []),
        ...(points >= 1000
          ? [{ title: 'Rising Star', desc: 'Reached 1000 XP in the course workspace', icon: 'XP', color: 'bg-amber-50 text-amber-700 border border-amber-100' }]
          : []),
        ...(streak >= 7
          ? [{ title: 'Consistent Learner', desc: `Maintained a ${streak}-day streak`, icon: '7+', color: 'bg-rose-50 text-rose-700 border border-rose-100' }]
          : [])
      ]
    : [];

  const isDark = theme === 'dark';
  const pendingRequests = monitoringRequests.filter(
    req => req.studentEmail.toLowerCase() === currentUser.email.toLowerCase() && req.status === 'pending'
  );
  const watchDb = getStoredJson<Record<string, any>>('oophub_oop_video_progress', {});
  const quizDb = getStoredJson<Record<string, any>>('oophub_oop_quiz_attempts', {});
  const submissionDb = getStoredJson<Record<string, any>>('oophub_practice_submissions', {});
  const activePractice = PRACTICE_CHALLENGES[0];
  const practiceKey = `${currentUser.id || currentUser.userId || currentUser.email}:${activePractice.id}`;
  const practiceSubmission = submissionDb[practiceKey];
  const practiceWatch = watchDb[activePractice.lessonId];
  const practiceQuiz = quizDb[activePractice.assessmentId];
  const practiceUnlocked = Boolean(practiceWatch?.completed && practiceQuiz?.passed && practiceQuiz?.percentage >= 70);
  const practiceScore = Number(practiceSubmission?.score || 0);
  const performanceIndex = Math.round((0.4 * Number(practiceQuiz?.percentage || 0)) + (0.5 * practiceScore) + (0.1 * moduleProgress));
  const performanceClass = performanceIndex >= 85 ? 'Mastered' : performanceIndex >= 70 ? 'Completed' : 'In Progress';
  const pendingAssessments = OOP_ASSESSMENTS
    .map(assessment => {
      const lesson = OOP_COURSE_LESSONS.find(item => item.id === assessment.lessonId);
      const attempt = quizDb[assessment.id];
      const previousLesson = lesson?.sequence && lesson.sequence > 1
        ? OOP_COURSE_LESSONS.find(item => item.sequence === lesson.sequence - 1)
        : undefined;
      const previousAssessment = previousLesson
        ? OOP_ASSESSMENTS.find(item => item.lessonId === previousLesson.id)
        : undefined;
      const needsPreviousVideo = Boolean(previousLesson && !watchDb[previousLesson.id]?.completed);
      const needsPreviousAssessment = Boolean(previousAssessment && !quizDb[previousAssessment.id]?.passed);
      const needsCurrentVideo = Boolean(lesson && !watchDb[lesson.id]?.completed);
      const isLocked = needsPreviousVideo || needsPreviousAssessment || needsCurrentVideo;
      const status = attempt && !attempt.passed
        ? 'Retry'
        : isLocked
          ? 'Locked'
          : 'Ready Now';

      return {
        id: assessment.id,
        title: assessment.title,
        type: `${assessment.questions.length || 15} MCQ | ${lesson?.topic || lesson?.title || 'Assessment'}`,
        sequence: lesson?.sequence || 999,
        status,
        color: status === 'Ready Now' ? 'border-l-emerald-600' : status === 'Retry' ? 'border-l-amber-500' : 'border-l-slate-400',
        isPassed: Boolean(attempt?.passed)
      };
    })
    .filter(item => !item.isPassed)
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 3);

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="student-dashboard-root">
      
      {/* Monitoring Requests Notification Panel */}
      {pendingRequests.length > 0 && (
        <div className={`p-4 border rounded-xl space-y-3 transition-colors duration-250 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-emerald-50/50 border-emerald-200 text-slate-900'
        }`} id="student-monitoring-requests-panel">
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Teacher Connection Requests</h4>
            <p className="text-xs text-slate-500">The following instructors would like to monitor your course progress, quiz diagnostics, and sandbox compiler code. Data access is only granted upon your explicit approval.</p>
          </div>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-emerald-100'
              }`}>
                <div className="text-xs text-left">
                  <span className="font-bold block">{req.teacherName}</span>
                  <span className="text-slate-400 block font-mono text-[10.5px]">{req.teacherEmail}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onRejectRequest(req.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      isDark 
                        ? 'border-slate-800 hover:bg-slate-900 text-rose-450' 
                        : 'border-slate-250 hover:bg-slate-50 text-rose-600'
                    }`}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => onAcceptRequest(req.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Primary Bento Cards Header block */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Welcome Back card utilizing dynamic glass details and emerald gradients */}
        <div className="lg:col-span-8 bg-white/70 backdrop-blur-md border border-slate-200/80 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[210px]" id="student-welcome-card">
          {/* Decorative subtle top mesh glow */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 bg-[radial-gradient(circle_at_bottom_right,ellipse,rgba(16,185,129,0.3)_0%,rgba(255,255,255,0)_70%)] pointer-events-none"></div>
          
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded">Student Workspace</span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-3 h-3 fill-white" /> Live syncing
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">Welcome back, {firstName}! 👋</h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-xl leading-relaxed">
              {hasProgress ? (
                <>
                  Your learning streak is active at <strong className="text-slate-900 font-extrabold font-mono">{streak} continuous {streak === 1 ? 'day' : 'days'}</strong>. Compile and run today's subclass structures inside our test suite to protect your multiplier status.
                </>
              ) : (
                <>
                  Your workspace is ready. Start your first lesson or open the sandbox IDE to earn XP and begin your learning streak.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-200/80 mt-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Flame className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Streak</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">{streak} {streak === 1 ? 'Day' : 'Days'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Award className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">My Points</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">{points} XP</div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-sky-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Mastery Completed</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">{completedLessonsCount}/{lessonCount} Lessons</div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Activity Widget styled as a glassmorphic Card */}
        <div className="lg:col-span-4 bg-white/70 backdrop-blur-md border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm" id="student-activity-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-tight">Active Learning Log</h3>
              <p className="text-[10px] text-slate-405 font-semibold">Weekly aggregate practice metrics</p>
            </div>
            <span className="text-[10px] sm:text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">{weeklyActivityHours}</span>
          </div>

          {/* Bar Charts Graph with transitions */}
          <div className="flex items-end justify-between h-28 gap-2 px-1">
            {visibleActivityData.map((d, index) => (
              <div key={index} className="flex flex-col items-center flex-1 group">
                <span className="text-[8px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity mb-1 block whitespace-nowrap">{d.label}</span>
                <div className={`w-full ${d.h} rounded-lg bg-slate-100 hover:bg-emerald-600 border border-slate-200/50 group-hover:border-emerald-600 transition-all duration-300 ${d.highlight ? 'bg-emerald-100 border-emerald-200' : ''}`}></div>
                <span className={`text-[10px] font-mono mt-2 block ${d.highlight ? 'text-emerald-700 font-bold' : 'text-slate-400 font-semibold'}`}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main Bento Grid layout split into features lists */}
      <div className="grid md:grid-cols-12 gap-6">
        
        {/* Playlists, Lessons & Guidance block */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Curriculum Target Milestone Card with emerald themes */}
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 relative overflow-hidden" id="bento-curriculum-milestone">
            <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase rounded text-emerald-700">{hasProgress ? 'Currently Studying' : 'Ready to Start'}</span>
                <h2 className="text-lg font-bold text-slate-900">{hasProgress ? 'Module 3: Inheritance & Polymorphism' : 'Module 1: Classes & Objects'}</h2>
                <p className="text-xs text-slate-500 font-medium">{hasProgress ? 'Deconstruct subclasses, parameter extensions, and late virtual method dispatch tables.' : 'Begin with foundational class structure, object creation, and method basics.'}</p>
              </div>
              <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">{moduleProgress}% Completed</span>
            </div>

            {/* Custom progress loading bar */}
            <div className="relative w-full h-2 bg-slate-100 rounded-full mb-6">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${moduleProgress}%` }}></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Recommended Lab Unit</span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-1">Car Vehicle Subclass Override</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">Write Java inheritance hierarchies and call super constructors securely inside our Practice IDE debugger.</p>
                </div>
                <button
                  id="student-bento-lab-cta"
                  onClick={() => onNavigateTo('ide')}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer max-w-max transition shadow-sm hover:shadow active:scale-95"
                >
                  <Code2 className="w-3.5 h-3.5" /> Open IDE
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Diagnostic Milestones</span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-1">Scenario 04: The Fleet Manager</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">Analyze how the JVM invokes methods dynamically using virtual methods and reference types.</p>
                </div>
                <button
                  id="student-bento-quiz-cta"
                  onClick={() => onNavigateTo('assessments')}
                  className="mt-4 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-500 text-slate-700 hover:text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer max-w-max transition shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Start Assessment Quiz
                </button>
              </div>
            </div>
          </div>

          <RecommendationCard recommendation={activeRecommendation || null} onNavigateTo={onNavigateTo} />

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="student-recommendation-history">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Recommended For You</h3>
                <p className="text-xs text-slate-500 font-medium">Rule-based recommendations update after every video, quiz, and coding activity.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                {recommendationHistory.length} Records
              </span>
            </div>
            <div className="space-y-3">
              {recommendationHistory.slice(0, 4).map(item => (
                <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        item.type === 'Remedial' ? 'bg-rose-100 text-rose-700' : item.type === 'Continue' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.type}
                      </span>
                      <h4 className="mt-2 text-xs font-black text-slate-900">{item.type === 'Remedial' ? 'Review' : item.type}: {item.currentTopic}</h4>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">Reason: {item.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateTo(item.targetView)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      {item.primaryActionLabel}
                    </button>
                  </div>
                </div>
              ))}
              {recommendationHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <h4 className="text-xs font-extrabold text-slate-900">No recommendation history yet</h4>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Complete a lesson video, quiz, or coding activity to generate your first adaptive recommendation.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="practice-ide-progress-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[9px] font-bold font-mono tracking-wider bg-sky-50 border border-sky-200 px-2 py-0.5 uppercase rounded text-sky-700">Practice IDE Progress</span>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900">{activePractice.title}</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Current topic: {OOP_COURSE_LESSONS.find(l => l.id === activePractice.lessonId)?.title}</p>
              </div>
              <span className={`rounded-xl px-3 py-1 text-xs font-black ${practiceSubmission ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : practiceUnlocked ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {practiceSubmission ? 'Submitted' : practiceUnlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Status', practiceUnlocked ? 'Ready' : 'Locked'],
                ['Practice Score', practiceSubmission ? `${practiceScore}%` : '--'],
                ['Submitted', practiceSubmission ? new Date(practiceSubmission.submittedAt).toLocaleDateString() : '--'],
                ['PI', `${performanceIndex}% ${performanceClass}`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <span className="block text-[9px] font-black uppercase text-slate-400">{label}</span>
                  <span className="mt-1 block text-xs font-extrabold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onNavigateTo('ide')}
              className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700"
            >
              <Code2 className="h-3.5 w-3.5" /> Open Practice IDE
            </button>
          </div>

          {/* Gamified Achievements Showcase Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="bento-achievements">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-905 uppercase tracking-tight">Unlocked Badges & Achievements</h3>
                <p className="text-xs text-slate-500 font-medium">Badges collected through compiled submissions</p>
              </div>
              <button 
                onClick={() => onNavigateTo('leaderboard')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-0.5 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-xl"
              >
                View cohort standings <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {visibleBadges.length > 0 ? (
                visibleBadges.map((b, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-100 items-center hover:bg-white hover:border-emerald-200 transition-all shadow-inner">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold ${b.color} shadow-sm shrink-0`}>
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{b.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{b.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 p-6 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">No badges unlocked yet</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">Complete your first lesson, quiz, or sandbox submission to start earning achievements.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar sub widgets (Deadlines, Recent Academic reviews) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Upcoming Academic deadlines */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" id="student-deadlines">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-emerald-600" /> Pending Assessments
            </h3>
            
            <div className="space-y-3">
              {pendingAssessments.length > 0 ? pendingAssessments.map(item => (
                <div key={item.id} className={`p-3 bg-slate-50 rounded-xl border border-slate-100 border-l-4 ${item.color} flex justify-between items-center hover:bg-white hover:shadow-sm transition-all`}>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{item.title}</h4>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">{item.type}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-650 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded text-right font-mono block whitespace-nowrap">{item.status}</span>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center">
                  <h4 className="text-xs font-extrabold text-emerald-800">All assessments cleared</h4>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">No pending assessment attempts right now.</p>
                </div>
              )}
            </div>
          </div>

          {/* Academic feedbacks and peer grading feed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" id="student-academic-feedbacks">
            <h3 className="text-sm font-extrabold text-slate-905 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Instructor Evaluation Feed
            </h3>

            {recentGrade ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-xs text-slate-800 truncate max-w-[150px]">{recentGrade.challenge}</span>
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/60 border border-emerald-200 px-2.5 py-0.5 rounded font-mono shrink-0">{recentGrade.grade}% SCORE</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed italic">
                    "{recentGrade.feedback}"
                  </p>
                  <span className="text-[10px] text-slate-400 block text-right font-mono font-bold">Grader: Dr. Elena Vance</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 font-sans">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-105 text-slate-500 text-xs text-center py-8">
                  <p className="italic">No feedbacks returned yet. Complete and submit vehicle overrides in the practice IDE sandbox, and instructors will grade your code shortly.</p>
                </div>
              </div>
            )}
          </div>

          {/* Practice Pro-Tip block */}
          <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl relative overflow-hidden" id="student-tip-log">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
            <h4 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-mono flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Pro-Tip of the Week
            </h4>
            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed font-semibold">
              When working with subclass constructor chaining, the call to <code>super(...)</code> MUST always be the <strong>very first line written inside your constructor</strong>. Any variable declaration or console printing before <code>super</code> results in compiler failure!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
