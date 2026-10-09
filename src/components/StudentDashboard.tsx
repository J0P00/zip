import React from 'react';
import { 
  Flame, 
  Calendar, 
  BookOpen, 
  ChevronRight, 
  Play, 
  Code2, 
  CheckCircle2, 

  Sparkles, 
  TrendingUp, 
  Clock,
  Zap,
  CheckCircle,
  HelpCircle,
  GraduationCap,
  Bell,
  MailOpen,
  Check,
  LockKeyhole,
  Circle
} from 'lucide-react';
import { AuthenticatedUser, MonitoringRequest, StudentSubView, NotificationItem } from '../types';
import { getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from '../data/oopCourse';
import { getCurrentPracticeChallenge, PRACTICE_CHALLENGES } from '../oopPracticeCatalog';
import type { StudentResultsData } from '../services/interpretation';

interface StudentDashboardProps {
  userName: string;
  streak: number;
  points: number;
  completedLessonsCount: number;
  onNavigateTo: (view: StudentSubView) => void;
  currentUser: AuthenticatedUser;
  monitoringRequests: MonitoringRequest[];
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  theme?: 'light' | 'dark';
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  studentResults?: StudentResultsData | null;
  studentResultsError?: string | null;
  studentResultsLoading?: boolean;
}

export default function StudentDashboard({
  userName,
  streak,
  points,
  completedLessonsCount,
  onNavigateTo,
  currentUser,
  monitoringRequests,
  onAcceptRequest,
  onRejectRequest,
  theme,
  notifications = [],
  onMarkNotificationRead,
  studentResults = null,
  studentResultsError = null,
  studentResultsLoading = false
}: StudentDashboardProps) {
  const firstName = userName.trim().split(/\s+/)[0] || 'Student';
  const effectiveCompletedLessons = studentResults?.completedLessons ?? completedLessonsCount;
  const hasProgress = Boolean(studentResults?.hasActivity) || streak > 0 || points > 0 || effectiveCompletedLessons > 0;
  const lessonCount = OOP_COURSE_LESSONS.length;
  const moduleProgress = studentResults
    ? studentResults.overallProgress
    : Math.min(100, Math.round((effectiveCompletedLessons / lessonCount) * 100));
  const isDark = theme === 'dark';
  const pendingRequests = monitoringRequests.filter(
    req => req.studentEmail.toLowerCase() === currentUser.email.toLowerCase() && req.status === 'pending'
  );
  const activePractice = getCurrentPracticeChallenge();
  const activeLesson = OOP_COURSE_LESSONS.find(lesson => lesson.id === activePractice.lessonId) || OOP_COURSE_LESSONS[0];
  const activeAssessment = OOP_ASSESSMENTS.find(assessment => assessment.id === activePractice.assessmentId) || OOP_ASSESSMENTS[0];
  const oopComplete = Boolean(studentResults?.oopComplete);
  const lessonAccessComplete = (lessonId: string) => {
    const topic = studentResults?.oopTopics?.find(item => item.id === lessonId);
    return Boolean(topic?.lessonCompleted);
  };
  const nextLesson = OOP_COURSE_LESSONS.find(lesson => !lessonAccessComplete(lesson.id)) || OOP_COURSE_LESSONS[OOP_COURSE_LESSONS.length - 1];
  const currentLesson = nextLesson;
  const authoritativeCurrentTopic = oopComplete
    ? null
    : studentResults?.oopTopics?.find(topic => !(topic.videoCompleted && topic.quizPassed))
      || studentResults?.oopTopics?.find(topic => topic.attempted)
      || null;
  const dashboardCurrentLesson = authoritativeCurrentTopic
    ? OOP_COURSE_LESSONS.find(lesson => lesson.id === authoritativeCurrentTopic.id) || currentLesson
    : currentLesson;
  const dashboardCurrentModuleLabel = oopComplete
    ? 'OOP completed - Java Swing available'
    : `Lesson ${dashboardCurrentLesson.sequence}: ${dashboardCurrentLesson.title}`;
  const dashboardPractice = PRACTICE_CHALLENGES.find(challenge => challenge.lessonId === dashboardCurrentLesson.id) || activePractice;
  const dashboardAssessment = OOP_ASSESSMENTS.find(assessment => assessment.lessonId === dashboardCurrentLesson.id) || activeAssessment;
  const currentTopicEvidence = studentResults?.oopTopics?.find(topic => topic.id === dashboardCurrentLesson.id);
  const practiceSubmission = currentTopicEvidence?.practiceCompleted
    ? { submittedAt: '' }
    : null;
  const practiceScore = Number(currentTopicEvidence?.practiceScore || 0);
  const practiceUnlocked = Boolean(currentTopicEvidence?.practiceUnlocked);
  const performanceIndex = studentResults?.learningScore ?? 0;
  const learningState = studentResults?.learningState ?? 'BEGINNER';
  const learningStateClass = learningState === 'MASTERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : learningState === 'DEVELOPING' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200';
  const performanceClass = studentResults?.learningState ?? 'BEGINNER';
  const swingTopicState = studentResults?.swingTopics || [];
  const journeyTopics = studentResults?.oopTopics || [];
  const journeyProgress = studentResults?.overallProgress ?? 0;
  const journeyCompletedCount = journeyTopics.filter(topic => topic.lessonCompleted).length;
  const journeyCurrentTopic = journeyTopics.find(topic => !topic.lessonCompleted) || null;
  const journeyCurrentIndex = journeyCurrentTopic ? journeyTopics.findIndex(topic => topic.id === journeyCurrentTopic.id) : -1;
  const journeyNextAction = (() => {
    if (!studentResults || journeyTopics.length === 0) {
      return { label: 'Continue Video', detail: 'Start the first available OOP lesson.', view: 'videos' as StudentSubView };
    }

    if (journeyCurrentTopic) {
      if (journeyCurrentTopic.videoPercentage === null || journeyCurrentTopic.videoPercentage < 95) {
        return { label: 'Continue Video', detail: `Continue watching “${journeyCurrentTopic.title}”.`, view: 'videos' as StudentSubView };
      } else if (!journeyCurrentTopic.quizPassed) {
        return { label: 'Assessment Required', detail: `Take the assessment for “${journeyCurrentTopic.title}”.`, view: 'assessments' as StudentSubView };
      } else {
        return { label: 'Practice Required', detail: `Complete the coding practice for “${journeyCurrentTopic.title}”.`, view: 'ide' as StudentSubView };
      }
    }

    const swingCurrentTopic = swingTopicState.find(topic => !topic.lessonCompleted);
    if (swingCurrentTopic) {
      if (!swingCurrentTopic.videoCompleted) {
        return { label: 'Continue Swing', detail: `Continue watching “${swingCurrentTopic.title}”.`, view: 'swing' as StudentSubView };
      } else if (!swingCurrentTopic.quizPassed) {
        return { label: 'Swing Assessment', detail: `Take the assessment for “${swingCurrentTopic.title}”.`, view: 'swing' as StudentSubView };
      } else {
        return { label: 'Swing Practice', detail: `Complete the coding practice for “${swingCurrentTopic.title}”.`, view: 'swing' as StudentSubView };
      }
    }

    return { label: 'Course Completed', detail: 'All OOP and Swing lessons are completely finished.', view: 'dashboard' as StudentSubView };
  })();
  const swingProgress = {
    unlocked: Boolean(studentResults?.swingUnlocked),
    completedLessons: swingTopicState.filter(topic => topic.contentCompleted && topic.videoCompleted && topic.quizPassed && topic.exerciseCompleted).length,
    passedQuizzes: swingTopicState.filter(topic => topic.quizPassed).length,
    completedExercises: swingTopicState.filter(topic => topic.exerciseCompleted).length,
    overall: studentResults?.swingUnlocked
      ? Math.round((swingTopicState.filter(topic => topic.contentCompleted && topic.videoCompleted && topic.quizPassed && topic.exerciseCompleted).length / Math.max(1, swingTopicState.length)) * 100)
      : 0
  };
  const pendingAssessments = OOP_ASSESSMENTS
    .map(assessment => {
      const lesson = OOP_COURSE_LESSONS.find(item => item.id === assessment.lessonId);
      const currentTopic = studentResults?.oopTopics?.find(item => item.id === lesson?.id);
      const latestScore = currentTopic?.quizPercentage ?? null;
      const passed = currentTopic?.quizPassed === true;
      let status = 'Ready';
      let statusKind: 'ready' | 'retry' | 'locked' | 'loading' = 'ready';

      if (!studentResults) {
        status = 'Loading';
        statusKind = 'loading';
      } else if (passed) {
        status = 'Passed';
      } else if (currentTopic?.quizPassed === false && latestScore !== null) {
        status = 'Retry';
        statusKind = 'retry';
      } else if (currentTopic && currentTopic.lessonUnlocked === false) {
        status = currentTopic.accessReason || 'Complete the previous lesson first';
        statusKind = 'locked';
      } else if (currentTopic && currentTopic.assessmentUnlocked === false) {
        status = 'Complete the video first';
        statusKind = 'locked';
      } else if (lesson && !currentTopic?.videoCompleted) {
        status = 'Complete the video first';
        statusKind = 'locked';
      } else if (!currentTopic && lesson && lesson.sequence > 1) {
        status = 'Locked until previous lesson is complete';
        statusKind = 'locked';
      }

      return {
        id: assessment.id,
        title: assessment.title,
        lessonTitle: lesson?.title || 'OOP Lesson',
        sequence: lesson?.sequence || 999,
        latestScore,
        status,
        statusKind,
        isPassed: passed,
        actionAvailable: statusKind === 'ready' || statusKind === 'retry'
      };
    })
    .filter(item => !item.isPassed)
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 3);

  const topicMetrics = OOP_COURSE_LESSONS.map(lesson => {
    const topic = studentResults?.oopTopics?.find(item => item.id === lesson.id);
    return { lesson, topic };
  });
  const passedAssessmentCount = topicMetrics.filter(({ topic }) => topic?.quizPassed === true).length;
  const submittedPracticeCount = studentResults?.submittedPracticeActivities ?? topicMetrics.filter(({ topic }) => topic?.practiceScore !== null && topic?.practiceScore !== undefined).length;
  const completedPracticeCount = studentResults?.completedPracticeActivities ?? topicMetrics.filter(({ topic }) => topic?.practiceCompleted === true).length;
  const latestAssessmentScore = currentTopicEvidence?.quizPercentage ?? null;
  const assessmentProgress = Math.round((passedAssessmentCount / Math.max(1, lessonCount)) * 100);
  const practiceProgress = Math.round((completedPracticeCount / Math.max(1, lessonCount)) * 100);
  const videoProgress = studentResults?.videoPercentage ?? 0;

  const areasForImprovement = studentResults
    ? topicMetrics.flatMap(({ lesson, topic }) => {
        if (!topic || topic.lessonUnlocked === false || topic.lessonCompleted) return [];
        if (!topic.videoCompleted || (topic.videoPercentage ?? 0) < 95) {
          return [{ lesson, label: 'Video incomplete', detail: `${topic.videoPercentage ?? 0}% watched; at least 95% is required.`, view: 'videos' as StudentSubView }];
        }
        if (topic.quizPassed !== true) {
          const score = topic.quizPercentage === null ? 'Not attempted' : `${topic.quizPercentage}%`;
          return [{ lesson, label: 'Assessment needs attention', detail: `Latest score: ${score}. A passing score is 60%.`, view: 'assessments' as StudentSubView }];
        }
        if (topic.practiceCompleted !== true) {
          const practiceDetail = topic.practiceScore === null || topic.practiceScore === undefined
            ? 'Practice has not been submitted.'
            : `Practice is submitted at ${topic.practiceScore}%, but is not marked complete.`;
          return [{ lesson, label: 'Practice needs attention', detail: practiceDetail, view: 'ide' as StudentSubView }];
        }
        return [];
      }).slice(0, 4)
    : [];

  const recommendedNextSteps = (() => {
    if (!studentResults) return [];
    const topicEntry = topicMetrics.find(({ topic }) => topic && !topic.lessonCompleted);
    if (!topicEntry || !topicEntry.topic || topicEntry.topic.lessonUnlocked === false) return [];
    const { lesson, topic } = topicEntry;
    if (!topic.videoCompleted || (topic.videoPercentage ?? 0) < 95) {
      return [{ lesson, title: 'Finish the lesson video', reason: `${topic.title} is at ${topic.videoPercentage ?? 0}%; reach 95% to unlock the assessment.`, view: 'videos' as StudentSubView, action: 'Continue video' }];
    }
    if (topic.quizPassed !== true && topic.assessmentUnlocked !== false) {
      return [{ lesson, title: topic.quizPercentage === null ? 'Take the lesson assessment' : 'Retake the lesson assessment', reason: topic.quizPercentage === null ? 'This assessment has not been attempted.' : `The latest score is ${topic.quizPercentage}%; 60% is required to pass.`, view: 'assessments' as StudentSubView, action: topic.quizPercentage === null ? 'Start assessment' : 'Retake assessment' }];
    }
    if (topic.quizPassed === true && topic.practiceCompleted !== true && topic.practiceUnlocked !== false) {
      return [{ lesson, title: 'Complete the coding practice', reason: topic.practiceScore === null || topic.practiceScore === undefined ? 'The eligible practice problem has not been submitted.' : 'The practice submission is not yet marked complete.', view: 'ide' as StudentSubView, action: 'Open Practice IDE' }];
    }
    return [];
  })();
  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="student-dashboard-root">
      {(studentResultsLoading || studentResultsError) && (
        <div className={`rounded-xl border p-4 text-sm font-semibold ${
          studentResultsError
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-sky-200 bg-sky-50 text-sky-800'
        }`}>
          {studentResultsError || 'Loading authoritative progress from the backend...'}
        </div>
      )}

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
        <div className="lg:col-span-12 min-w-0 bg-white/70 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between" id="student-welcome-card">
          <div className="absolute right-5 top-5 hidden items-center gap-4 sm:flex" aria-label={`Course progress ${journeyProgress}%`}>
            <div className="relative h-20 w-20 rounded-full" style={{ background: `conic-gradient(#10b981 ${journeyProgress}%, #d1fae5 0)` }}>
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white text-lg font-black text-slate-800">{journeyProgress}%</div>
            </div>
            <div className="min-w-[150px]">
              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Course progress</span>
              <span className="mt-1 block text-xs font-bold text-slate-800">{effectiveCompletedLessons} of {lessonCount} lessons completed</span>
              <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${journeyProgress}%` }} /></div>
            </div>
          </div>
          {/* Decorative subtle top mesh glow */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 bg-[radial-gradient(circle_at_bottom_right,ellipse,rgba(16,185,129,0.3)_0%,rgba(255,255,255,0)_70%)] pointer-events-none"></div>

          <div className="space-y-2 relative z-10 sm:pr-56">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded">Student Workspace</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${learningStateClass}`}>
                <Zap className="w-3 h-3 fill-current" /> {learningState}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">Welcome back, {firstName}! 👋</h1>
            <p className="text-sm font-semibold text-slate-600">Your next step is clear. Keep building your OOP skills.</p>
            {studentResults && (
              <div className="mt-3 max-w-xl rounded-xl border border-slate-200 bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-600">
                <span className="font-black text-slate-800">Learning Score: {studentResults.learningScore}%.</span> {studentResults.learningStateInterpretation}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-200/80 mt-4 relative z-10">
            <div className="flex items-center gap-2 border-l border-slate-200 pl-6 first:border-l-0 first:pl-0">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-sky-600" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Mastery Completed</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">{effectiveCompletedLessons}/{studentResults?.totalLessons || lessonCount} Lessons</div>
              </div>
            </div>
          </div>
        </div>

        {/* Authoritative student progress and improvement guidance */}
        <section className="lg:col-span-12 min-w-0 bg-white/90 border border-slate-200 p-5 rounded-2xl shadow-sm" id="student-progress-section" aria-labelledby="student-progress-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Student Progress</span>
              <h2 id="student-progress-title" className="mt-1 text-lg font-extrabold text-slate-900">Your learning at a glance</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Progress is calculated from your authenticated account records.</p>
            </div>
            <span className={`rounded-xl px-3 py-1.5 text-xs font-black ${learningStateClass}`}>{learningState} · {performanceIndex}%</span>
          </div>

          <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Lessons', `${effectiveCompletedLessons}/${lessonCount}`, 'completed', 'text-emerald-700'],
              ['Assessments', studentResults?.quizAttempts ? `${studentResults.averageQuizScore}%` : '--', `${passedAssessmentCount} passed · latest ${latestAssessmentScore === null ? '--' : `${latestAssessmentScore}%`}`, 'text-sky-700'],              ['Coding practice', `${completedPracticeCount}/${lessonCount}`, `${submittedPracticeCount} submitted`, 'text-violet-700'],
              ['Learning score', `${performanceIndex}%`, learningState, 'text-amber-700']
            ].map(([label, value, detail, color]) => (
              <div key={label} className="h-full min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</span>
                <span className={`mt-1 block text-lg font-black ${color}`}>{value}</span>
                <span className="block text-[10px] font-bold text-slate-500">{detail}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid items-start gap-3 sm:grid-cols-3" aria-label="Learning activity progress">
            {[
              ['Video lessons', videoProgress, '95% required per lesson'],
              ['Assessments passed', assessmentProgress, '60% required to pass'],
              ['Coding practice completed', practiceProgress, 'Submission is not completion']
            ].map(([label, value, detail]) => (
              <div key={label}>
                <div className="flex justify-between gap-2 text-[10px] font-black text-slate-600"><span>{label}</span><span>{value}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100" role="progressbar" aria-label={String(label)} aria-valuenow={Number(value)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${value}%` }} />
                </div>
                <span className="mt-1 block text-[9px] font-semibold text-slate-400">{detail}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Areas to Improve</h3>
              <div className="mt-2 space-y-2">
                {areasForImprovement.length ? areasForImprovement.map(item => (
                  <div key={item.lesson.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wide text-amber-700">Lesson {item.lesson.sequence}</span>
                        <h4 className="mt-0.5 text-xs font-extrabold text-slate-900">{item.lesson.title}</h4>
                        <p className="mt-1 text-[10px] font-semibold text-slate-600"><strong>{item.label}:</strong> {item.detail}</p>
                      </div>
                      <button type="button" onClick={() => onNavigateTo(item.view)} className="shrink-0 rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-amber-800 hover:border-amber-400">Open</button>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[10px] font-bold text-emerald-800">No active improvement items. Keep going.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Recommended Next Steps</h3>
              <div className="mt-2 space-y-2">
                {recommendedNextSteps.length ? recommendedNextSteps.map(item => (
                  <div key={item.lesson.id} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <span className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Lesson {item.lesson.sequence}</span>
                    <h4 className="mt-0.5 text-xs font-extrabold text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-[10px] font-semibold text-slate-600">{item.reason}</p>
                    <button type="button" onClick={() => onNavigateTo(item.view)} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-emerald-700">{item.action}</button>
                  </div>
                )) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] font-bold text-slate-600">Complete the current required activity to unlock the next step.</p>
                )}
              </div>
            </div>
          </div>
        </section>
        {/* Backend-backed learning journey */}
        <div className="lg:col-span-6 min-w-0 bg-white/70 backdrop-blur-md border border-slate-200 p-5 rounded-2xl shadow-sm" id="student-activity-card">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-tight">Learning Journey</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Track your progress through the OOP learning path</p>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">Overall Progress</span>
              <span className="text-lg font-black font-mono text-emerald-700">{journeyProgress}%</span>
            </div>
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${journeyProgress}%` }} />
          </div>

          <div className="mt-4 space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {journeyTopics.length ? journeyTopics.map((topic, index) => {
              const completed = topic.lessonCompleted;
              const current = !completed && index === journeyCurrentIndex;
              const locked = !completed && !current;
              const journeyStatus = completed
                ? 'Video complete · Assessment passed · Practice complete'
                : current
                  ? `Video ${topic.videoPercentage ?? 0}% · ${topic.quizPassed ? 'Assessment passed' : 'Assessment needed'} · ${topic.practiceCompleted ? 'Practice complete' : topic.practiceScore !== null && topic.practiceScore !== undefined ? `Practice ${topic.practiceScore}%` : 'Practice needed'}`
                  : `Locked until ${journeyCurrentTopic?.title || 'the previous lesson'}`;
              return (
                <div key={topic.id} className={`relative flex gap-2.5 ${locked ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${completed ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : current ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-100 border-slate-300 text-slate-500'}`}>
                      {completed ? <Check className="h-3.5 w-3.5" /> : current ? <Circle className="h-2.5 w-2.5 fill-current" /> : <LockKeyhole className="h-3 w-3" />}
                    </div>
                    {index < journeyTopics.length - 1 && <div className="mt-1 h-full min-h-3 w-px bg-slate-200" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Lesson {topic.sequence}</div>
                    <div className="truncate text-[11px] font-extrabold text-slate-800">{topic.title}</div>
                    <div className={`text-[10px] font-semibold ${completed ? 'text-emerald-700' : current ? 'text-slate-600' : 'text-slate-400'}`}>
                      {journeyStatus}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-[10px] font-semibold text-slate-500">Progress is loading from your account.</p>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Next Step</div>
            <div className="mt-1 text-[11px] font-extrabold text-slate-800">{journeyNextAction.label}</div>
            <p className="mt-0.5 text-[10px] font-semibold leading-4 text-slate-600">{journeyNextAction.detail}</p>
            <button type="button" onClick={() => onNavigateTo(journeyNextAction.view)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 hover:text-emerald-900">
              {journeyNextAction.view === 'swing' ? 'Start Java Swing' : 'Continue Learning'} <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-slate-500">
            <span>{journeyTopics.length || studentResults?.totalLessons || lessonCount} Lessons</span>
            <span className="text-emerald-700">✓ {journeyCompletedCount} Completed</span>
            <span className="text-slate-600">● {journeyCurrentTopic ? 1 : 0} In Progress</span>
            <span className="text-slate-500">🔒 {Math.max(0, (journeyTopics.length || studentResults?.totalLessons || lessonCount) - journeyCompletedCount - (journeyCurrentTopic ? 1 : 0))} Locked</span>
          </div>
        </div>


        {/* Upcoming assessments */}
        <section className="lg:col-span-6 min-w-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm" id="student-deadlines" aria-labelledby="upcoming-assessments-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 id="upcoming-assessments-title" className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-emerald-600" /> Upcoming Assessments
            </h3>
            <button type="button" onClick={() => onNavigateTo('assessments')} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 hover:border-emerald-400 hover:text-emerald-700">View all assessments →</button>
          </div>

          <div className="space-y-2.5">
            {pendingAssessments.length > 0 ? pendingAssessments.map(item => (
              <div key={item.id} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-100 border-l-4 border-l-slate-300 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h4 className="break-words text-xs font-extrabold text-slate-900">{item.title}</h4>
                  <span className="mt-0.5 block break-words text-[10px] font-bold text-slate-400">15 MCQ · Lesson {item.sequence} · {item.lessonTitle}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-500">Latest score: {item.latestScore === null ? 'Not attempted' : `${item.latestScore}%`}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.statusKind === 'ready' ? 'bg-emerald-100 text-emerald-800' : item.statusKind === 'retry' ? 'bg-amber-100 text-amber-800' : item.statusKind === 'loading' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'}`}>{item.statusKind === 'ready' ? 'Ready' : item.statusKind === 'retry' ? 'Retry' : item.statusKind === 'loading' ? 'Loading' : 'Locked'}</span>
                  {item.actionAvailable && <button type="button" onClick={() => onNavigateTo('assessments')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black text-white hover:bg-emerald-700">Start now</button>}
                  {!item.actionAvailable && <span className="max-w-[190px] text-right text-[10px] font-semibold text-slate-500">{item.status}</span>}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4 text-center">
                <h4 className="text-xs font-extrabold text-emerald-800">All assessments cleared</h4>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700">No pending assessment attempts right now.</p>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Main Bento Grid layout split into features lists */}
      <div className="space-y-6">

        {/* Playlists, Lessons & Guidance block */}
        <div className="min-w-0 space-y-6">

          {/* Curriculum Target Milestone Card with emerald themes */}
          <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 relative overflow-hidden" id="bento-curriculum-milestone">
            <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold font-mono tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase rounded text-emerald-700">{hasProgress ? 'Currently Studying' : 'Ready to Start'}</span>
                <h2 className="text-lg font-bold text-slate-900">{dashboardCurrentModuleLabel}</h2>
                <p className="text-xs text-slate-500 font-medium">{hasProgress ? `Continue ${dashboardCurrentLesson.title.toLowerCase()} and complete its video and 60% assessment.` : 'Begin with foundational class structure, object creation, and method basics.'}</p>
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
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{dashboardPractice.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">{dashboardPractice.description}</p>
                </div>
                <button
                  id="student-bento-lab-cta"
                  onClick={() => onNavigateTo('ide')}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer max-w-max transition shadow-sm hover:shadow active:scale-95"
                >
                <Code2 className="w-3.5 h-3.5" /> Open {dashboardPractice.title}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Diagnostic Milestones</span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{dashboardAssessment.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Assess {dashboardCurrentLesson.title.toLowerCase()} concepts with 15 quiz checks tied to this week’s programming problem.</p>
                </div>
                <button
                  id="student-bento-quiz-cta"
                  onClick={() => onNavigateTo('assessments')}
                  className="mt-4 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-500 text-slate-700 hover:text-emerald-800 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer max-w-max transition shadow-sm"
                >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Start {dashboardAssessment.title}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="student-swing-progress-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${swingProgress.unlocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {swingProgress.unlocked ? 'Unlocked' : 'Prerequisite Locked'}
                </span>
                <h3 className="mt-3 text-sm font-extrabold text-slate-900 uppercase tracking-tight">Java Swing Programming</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {swingProgress.unlocked
                    ? 'Continue GUI lessons, video tutorials, 80% mastery quizzes, and Swing coding exercises.'
                    : 'Complete all OOP lessons to unlock Java Swing.'}
                </p>
              </div>
              <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{swingProgress.overall}%</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${swingProgress.overall}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-[11px] font-bold text-slate-600 sm:grid-cols-3">
              <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">Lessons {swingProgress.completedLessons}/5</span>
              <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">Quiz Scores {swingProgress.passedQuizzes}/5</span>
              <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">Programming {swingProgress.completedExercises}/5</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo('swing')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Open Swing Lesson
            </button>
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
                    ['Submitted', practiceSubmission?.submittedAt ? new Date(practiceSubmission.submittedAt).toLocaleDateString() : '--'],
                ['PI', `${performanceIndex}% ${performanceClass}`]
              ].map(([label, value]) => (
                <div key={label} className="h-full min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
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



        </div>

        {/* Additional dashboard guidance */}
        <div className="min-w-0 space-y-6">


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
