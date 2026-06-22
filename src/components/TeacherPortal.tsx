import React, { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  FileCheck, 
  LineChart, 
  User, 
  Code2, 
  Search, 
  Filter, 
  GraduationCap, 
  Plus, 
  Clock, 
  CheckCircle, 
  Percent, 
  Award,
  Video,
  FileQuestion,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Lock
} from 'lucide-react';
import { AuthenticatedUser, MonitoringRequest, PendingSubmission, Persona } from '../types';

interface TeacherPortalProps {
  submissions: PendingSubmission[];
  onGradeSubmission: (id: string, grade: number, feedback: string) => void;
  onSelectPersona: (persona: Persona) => void;
  currentUser: AuthenticatedUser;
  monitoringRequests: MonitoringRequest[];
  onSendRequest: (studentEmailOrId: string) => { success: boolean; message: string };
  onRemoveConnection: (requestId: string) => void;
  theme?: 'light' | 'dark';
}

const getStudentEmailByName = (name: string): string => {
  const normalized = name.replace(/\s*\(you\)/i, '').trim().toLowerCase();
  if (normalized.includes('alex mercer') || normalized.includes('dmitry vance') || normalized.includes('dmitry')) {
    return 'dmitry@oophub.edu';
  }
  if (normalized.includes('rodriguez') || normalized.includes('sofia')) {
    return 'rodriguez@oophub.edu';
  }
  if (normalized.includes('volkov') || normalized.includes('dmitry volkov')) {
    return 'volkov@oophub.edu';
  }
  if (normalized.includes('chen')) {
    return 'chen@oophub.edu';
  }
  if (normalized.includes('rossi') || normalized.includes('elena rossi')) {
    return 'rossi@oophub.edu';
  }
  if (normalized.includes('hughes') || normalized.includes('liam')) {
    return 'hughes@oophub.edu';
  }
  return normalized;
};

// Detailed mock student statistics for Student Management & Analytics
const MOCK_STUDENTS_LIST = [
  { id: 'STU-0001', name: 'Dmitry Vance (Alex Mercer)', email: 'dmitry@oophub.edu', course: 'BS Computer Science', yearLevel: '3rd Year', section: 'CS-3A', points: 3450, streak: 12, completedLessons: 2, avgQuiz: 83.4, status: 'Active' },
  { id: 'STU-0002', name: 'Sofia Rodriguez', email: 'rodriguez@oophub.edu', course: 'BS Computer Science', yearLevel: '3rd Year', section: 'CS-3B', points: 3120, streak: 8, completedLessons: 4, avgQuiz: 90.0, status: 'Active' },
  { id: 'STU-0003', name: 'Dmitry Volkov', email: 'volkov@oophub.edu', course: 'BS Information Technology', yearLevel: '2nd Year', section: 'IT-2A', points: 1840, streak: 4, completedLessons: 1, avgQuiz: 75.0, status: 'Active' },
  { id: 'STU-0004', name: 'J. Chen', email: 'chen@oophub.edu', course: 'BS Computer Engineering', yearLevel: '4th Year', section: 'COE-4A', points: 2980, streak: 15, completedLessons: 3, avgQuiz: 88.0, status: 'Active' },
  { id: 'STU-0005', name: 'Elena Rossi', email: 'rossi@oophub.edu', course: 'BS Computer Science', yearLevel: '3rd Year', section: 'CS-3A', points: 2450, streak: 6, completedLessons: 2, avgQuiz: 82.0, status: 'Inactive' },
  { id: 'STU-0006', name: 'Liam Hughes', email: 'hughes@oophub.edu', course: 'BS Information Technology', yearLevel: '3rd Year', section: 'IT-3B', points: 1690, streak: 2, completedLessons: 2, avgQuiz: 80.0, status: 'Active' }
];

export default function TeacherPortal({
  submissions,
  onGradeSubmission,
  onSelectPersona,
  currentUser,
  monitoringRequests,
  onSendRequest,
  onRemoveConnection,
  theme
}: TeacherPortalProps) {
  const isDark = theme === 'dark';
  
  // Tab control matching user's modules
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'course_builder' | 'assessment_creator' | 'ide_monitoring' | 'analytics' | 'profile'>('home');

  // Input states
  const [studentInput, setStudentInput] = useState('');
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Student Management states
  const [mgmtSearch, setMgmtSearch] = useState('');
  const [mgmtCourseFilter, setMgmtCourseFilter] = useState('All');
  const [mgmtYearFilter, setMgmtYearFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<typeof MOCK_STUDENTS_LIST[0] | null>(null);

  // Course Builder states
  const [courses, setCourses] = useState([
    { id: 'c1', title: 'OOP Fundamentals', lessons: 5, status: 'Published' },
    { id: 'c2', title: 'Java Programming', lessons: 8, status: 'Published' },
    { id: 'c3', title: 'Java Swing UI', lessons: 4, status: 'Draft' }
  ]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('c1');

  // Assessment Creator states
  const [quizQuestions, setQuizQuestions] = useState([
    { id: 1, scenario: 'Scenario 04: The Fleet Manager', question: 'What JVM pass resolves method execution dynamically based on object heap references?', answer: 'B. Dynamic Dispatch utilising Late Binding' }
  ]);
  const [newScenario, setNewScenario] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(20);

  // IDE Monitoring states
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Determine accepted student emails for current teacher
  const acceptedEmails = monitoringRequests
    .filter(req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase() && req.status === 'accepted')
    .map(req => req.studentEmail.toLowerCase());

  // 2. Filter submissions list based on accepted students only
  const visibleSubmissions = submissions.filter(sub => {
    const studentEmail = getStudentEmailByName(sub.studentName);
    return acceptedEmails.includes(studentEmail.toLowerCase());
  });

  const [selectedSub, setSelectedSub] = useState<PendingSubmission | null>(
    visibleSubmissions.find(s => s.status === 'pending') || null
  );
  const [commentText, setCommentText] = useState('');
  const [scoreText, setScoreText] = useState(95);

  const handleSelectSubmission = (sub: PendingSubmission) => {
    setSelectedSub(sub);
    setCommentText(sub.feedback || '');
    setScoreText(sub.grade || 95);
  };

  const handlePostGrade = () => {
    if (!selectedSub) return;
    if (scoreText < 0 || scoreText > 100) {
      alert('Please enter a grade score between 0 and 100.');
      return;
    }
    if (!commentText.trim()) {
      alert('Please include helpful feedback observations for the student.');
      return;
    }

    onGradeSubmission(selectedSub.id, scoreText, commentText);
    alert(`Evaluation Completed! Grade posted: ${scoreText}% for ${selectedSub.studentName}.`);
    
    const nextPending = visibleSubmissions.find(s => s.id !== selectedSub.id && s.status === 'pending');
    if (nextPending) {
      setSelectedSub(nextPending);
      setCommentText(nextPending.feedback || '');
      setScoreText(nextPending.grade || 95);
    } else {
      setSelectedSub(null);
    }
  };

  const handleSendRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim()) return;

    const res = onSendRequest(studentInput);
    if (res.success) {
      setRequestFeedback({ type: 'success', message: res.message });
      setStudentInput('');
    } else {
      setRequestFeedback({ type: 'error', message: res.message });
    }

    setTimeout(() => setRequestFeedback(null), 5000);
  };

  // 3. Dynamic metrics calculation
  const activeCount = acceptedEmails.length;
  // Use mock students list for connected students details
  const connectedStudentsDetails = MOCK_STUDENTS_LIST.filter(s => acceptedEmails.includes(s.email.toLowerCase()));

  const avgQuiz = connectedStudentsDetails.length > 0 
    ? Math.round((connectedStudentsDetails.reduce((sum, s) => sum + s.avgQuiz, 0) / connectedStudentsDetails.length) * 10) / 10
    : 84.6; // fallback baseline

  const completionRate = connectedStudentsDetails.length > 0
    ? Math.round(connectedStudentsDetails.reduce((sum, s) => sum + (s.completedLessons / 5) * 100, 0) / connectedStudentsDetails.length)
    : 72; // fallback baseline

  const pendingReviews = visibleSubmissions.filter(s => s.status === 'pending').length;

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    const newCourse = {
      id: `c_${Date.now()}`,
      title: newCourseTitle.trim(),
      lessons: 0,
      status: 'Draft'
    };
    setCourses([...courses, newCourse]);
    setNewCourseTitle('');
    alert(`Course "${newCourse.title}" created successfully!`);
  };

  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    setCourses(courses.map(c => {
      if (c.id === selectedCourseId) {
        return { ...c, lessons: c.lessons + 1 };
      }
      return c;
    }));
    setNewLessonTitle('');
    alert(`Lesson Lecture added to the selected course!`);
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    const newQ = {
      id: Date.now(),
      scenario: newScenario.trim() || 'General OOP Principles',
      question: newQuestion.trim(),
      answer: quizAnswer.trim() || 'A'
    };
    setQuizQuestions([...quizQuestions, newQ]);
    setNewQuestion('');
    setNewScenario('');
    setQuizAnswer('');
    alert('Assessment quiz problem created and saved to active question bank!');
  };

  // Filter student management list
  const filteredStudents = MOCK_STUDENTS_LIST.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(mgmtSearch.toLowerCase()) || student.id.toLowerCase().includes(mgmtSearch.toLowerCase());
    const matchesCourse = mgmtCourseFilter === 'All' || student.course.includes(mgmtCourseFilter);
    const matchesYear = mgmtYearFilter === 'All' || student.yearLevel.includes(mgmtYearFilter);
    return matchesSearch && matchesCourse && matchesYear;
  });

  // Filter connections requests
  const teacherRequests = monitoringRequests.filter(
    req => req.teacherEmail.toLowerCase() === currentUser.email.toLowerCase()
  );
  
  const pendingRequests = teacherRequests.filter(req => req.status === 'pending');
  const acceptedRequests = teacherRequests.filter(req => req.status === 'accepted');

  const filteredSubmissions = visibleSubmissions.filter(s => 
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.challengeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="teacher-portal-root">
      
      {/* Dynamic Tab Navigation Segment */}
      <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-200'} pb-2 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider`}>
        {[
          { id: 'home', label: '📊 Dashboard Overview', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'students', label: '👨‍🎓 Student Management', icon: <GraduationCap className="w-3.5 h-3.5" /> },
          { id: 'course_builder', label: '🛠️ Course Builder', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'assessment_creator', label: '📝 Assessment Creator', icon: <FileCheck className="w-3.5 h-3.5" /> },
          { id: 'ide_monitoring', label: '💻 IDE Submissions', icon: <Code2 className="w-3.5 h-3.5" /> },
          { id: 'analytics', label: '📈 Analytics Board', icon: <LineChart className="w-3.5 h-3.5" /> },
          { id: 'profile', label: '👤 Instructor profile', icon: <User className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-1 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600 font-extrabold'
                : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`
            }`}
          >
            {tab.icon}
            <span>{tab.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>

      {/* 1. HOME DASHBOARD VIEW */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-2xl border border-emerald-500/20 text-left">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Welcome, {currentUser.name}! 👩‍🏫</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Track student compilation logs, accept monitoring connections, adjust diagnostic rules, and evaluate active subclass override exercises.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="teacher-quick-stats">
            {[
              { title: 'Total Students', val: MOCK_STUDENTS_LIST.length, desc: 'Registered in Hub catalog', icon: <Users className="w-5 h-5 text-indigo-500" /> },
              { title: 'Active Monitored', val: activeCount, desc: 'With approved credentials', icon: <GraduationCap className="w-5 h-5 text-emerald-500" /> },
              { title: 'Completed Labs', val: submissions.filter(s => s.status === 'reviewed').length + pendingReviews, desc: 'Sandbox IDE files submitted', icon: <Code2 className="w-5 h-5 text-rose-500" /> },
              { title: 'Average Performance', val: `${avgQuiz}%`, desc: 'On MCQs diagnostic simulator', icon: <TrendingUp className="w-5 h-5 text-amber-500" /> }
            ].map((stat, i) => (
              <div key={i} className={`p-5 rounded-2xl border text-left flex flex-col justify-between shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {stat.title}
                  </span>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-black font-mono leading-none">{stat.val}</div>
                  <div className={`text-[10px] tracking-wide mt-1 leading-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {stat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Connection Inviter */}
            <div className={`p-6 rounded-2xl border text-left shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-extrabold mb-1">Add Student Connection</h3>
              <p className="text-xs text-slate-500 mb-4">Send a connection request to sync student metrics and sandbox editor file logs.</p>
              
              <form onSubmit={handleSendRequestSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Student Email (e.g. rodriguez@oophub.edu) or ID"
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-600' : 'bg-slate-50 border-slate-250 focus:bg-white focus:border-emerald-600'
                  }`}
                />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                  Send Connection Request
                </button>
              </form>
              
              {requestFeedback && (
                <div className={`mt-3 p-3 rounded-xl text-xs border ${
                  requestFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {requestFeedback.message}
                </div>
              )}
            </div>

            {/* Current Requests Status */}
            <div className={`p-6 rounded-2xl border text-left shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h3 className="text-sm font-extrabold mb-3">Pending Student approvals ({pendingRequests.length})</h3>
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">No pending approvals. Connect students on the left.</div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="p-2.5 border rounded-xl flex justify-between items-center text-xs bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold block">{req.studentName}</span>
                        <span className="text-slate-400 text-[10px] font-mono">{req.studentEmail}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENT MANAGEMENT VIEW */}
      {activeTab === 'students' && (
        <div className="space-y-6 text-left">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Active CS / IT Cohorts</h3>
              <p className="text-xs text-slate-500">Query and examine connected student progress files</p>
            </div>
            
            {/* Filters bar */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={mgmtSearch}
                  onChange={e => setMgmtSearch(e.target.value)}
                  className={`pl-9 pr-3 py-2 border rounded-xl text-xs outline-none transition w-full sm:w-48 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <select
                value={mgmtCourseFilter}
                onChange={e => setMgmtCourseFilter(e.target.value)}
                className={`px-2 py-1.5 border rounded-xl text-xs outline-none transition ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                }`}
              >
                <option value="All">All Courses</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Engineering">Computer Engineering</option>
              </select>

              <select
                value={mgmtYearFilter}
                onChange={e => setMgmtYearFilter(e.target.value)}
                className={`px-2 py-1.5 border rounded-xl text-xs outline-none transition ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                }`}
              >
                <option value="All">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const isConnected = acceptedEmails.includes(student.email.toLowerCase());
              return (
                <div key={student.id} className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-sm ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">{student.id}</span>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                        isConnected 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40' 
                          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                      }`}>
                        {isConnected ? 'Connected' : 'No Access'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">{student.name}</h4>
                    <span className="text-[11px] text-slate-400 block">{student.course} ({student.yearLevel})</span>
                  </div>

                  {isConnected ? (
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">XP</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{student.points}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Streak</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{student.streak}d</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Avg MCQ</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{student.avgQuiz}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl text-center text-xs text-slate-500 italic">
                      Send connection request to monitor progress
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Inspect Progress Details
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const res = onSendRequest(student.email);
                          alert(res.message);
                        }}
                        className="w-full py-2 border border-slate-250 hover:bg-slate-50 dark:border-slate-850 dark:hover:bg-slate-950 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        Send Link Invitation
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student details modal */}
          {selectedStudent && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-lg w-full mx-4 space-y-4 text-slate-850 dark:text-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block font-bold font-mono tracking-wider">{selectedStudent.id}</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{selectedStudent.name}</h3>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
                </div>
                
                <div className="space-y-4 text-left text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Email Address</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedStudent.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Section / Group</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedStudent.section}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">XP Points</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">{selectedStudent.points} XP</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Current Streak</span>
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">{selectedStudent.streak} Days active</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">Syllabus Completion (learning Path)</h4>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-slate-500">Completed Video Lectures:</span>
                      <span className="font-bold text-emerald-600">{selectedStudent.completedLessons} / 5 lessons</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(selectedStudent.completedLessons / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs">
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COURSE BUILDER VIEW */}
      {activeTab === 'course_builder' && (
        <div className="grid lg:grid-cols-12 gap-8 text-left">
          
          {/* Create Course Panel */}
          <div className={`lg:col-span-5 p-6 rounded-2xl border shadow-sm h-fit ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-base font-extrabold mb-1">Syllabus Course Builder</h3>
            <p className="text-xs text-slate-500 mb-6">Create courses, upload dynamic video content, quizzes, and IDE programming tasks.</p>

            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="course-title" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Course Title
                </label>
                <input
                  id="course-title"
                  type="text"
                  placeholder="e.g. Java Swing UI"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-600' : 'bg-slate-50 border-slate-250 focus:bg-white focus:border-emerald-600'
                  }`}
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                Create Course Module
              </button>
            </form>

            <div className="border-t border-slate-150 dark:border-slate-800 pt-6 mt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Add Video / Exercise to Course</h4>
              <form onSubmit={handleAddLesson} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="select-course" className="text-[10px] font-bold text-slate-500">Target Course</label>
                  <select
                    id="select-course"
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200'
                    }`}
                  >
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lesson-title" className="text-[10px] font-bold text-slate-500">Lesson / Exercise Title</label>
                  <input
                    id="lesson-title"
                    type="text"
                    placeholder="e.g. Lesson 04: Swing LayoutManagers"
                    value={newLessonTitle}
                    onChange={e => setNewLessonTitle(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-600' : 'bg-slate-50 border-slate-250 focus:bg-white focus:border-emerald-600'
                    }`}
                  />
                </div>
                <button type="submit" className="w-full border border-emerald-650 hover:bg-emerald-50/10 text-emerald-600 dark:text-emerald-450 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                  Add Lesson Component
                </button>
              </form>
            </div>
          </div>

          {/* Courses List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-450 uppercase tracking-widest px-1">Active Syllabus Courses ({courses.length})</h3>
            <div className="space-y-2">
              {courses.map(course => (
                <div key={course.id} className={`p-4 rounded-2xl border flex justify-between items-center ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{course.title}</h4>
                    <span className="text-xs text-slate-400 block font-medium flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> {course.lessons} Video Lessons & Labs
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    course.status === 'Published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-105 text-slate-500 dark:bg-slate-850 dark:text-slate-400'
                  }`}>
                    {course.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. ASSESSMENT CREATOR VIEW */}
      {activeTab === 'assessment_creator' && (
        <div className="grid lg:grid-cols-12 gap-8 text-left">
          
          {/* MCQ and Problem Generator */}
          <div className={`lg:col-span-5 p-6 rounded-2xl border shadow-sm h-fit ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-base font-extrabold mb-1">Interactive MCQ Builder</h3>
            <p className="text-xs text-slate-500 mb-6">Attach conceptual multiple choice evaluations to specific syllabus videos.</p>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="quiz-scenario" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Scenario Context
                </label>
                <input
                  id="quiz-scenario"
                  type="text"
                  placeholder="e.g. Scenario 05: The Swing UI Grid"
                  value={newScenario}
                  onChange={e => setNewScenario(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-105 focus:border-emerald-600' : 'bg-slate-50 border-slate-250 focus:bg-white focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quiz-question" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Prompt
                </label>
                <textarea
                  id="quiz-question"
                  placeholder="e.g. Which Swing LayoutManager lays out components in a rectangular grid of equal cells?"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition h-16 resize-none focus:border-emerald-600 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-105' : 'bg-slate-55 border-slate-250'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="quiz-answer" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Correct Option ID (A/B/C)
                </label>
                <input
                  id="quiz-answer"
                  type="text"
                  placeholder="e.g. B. GridLayout class reference"
                  value={quizAnswer}
                  onChange={e => setQuizAnswer(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-105 focus:border-emerald-600' : 'bg-slate-50 border-slate-250 focus:bg-white focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="passing-score" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Passing Score (%)
                  </label>
                  <input
                    id="passing-score"
                    type="number"
                    value={passingScore}
                    onChange={e => setPassingScore(parseInt(e.target.value) || 70)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-105' : 'bg-slate-50 border-slate-250'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="time-limit" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Time Limit (Mins)
                  </label>
                  <input
                    id="time-limit"
                    type="number"
                    value={timeLimit}
                    onChange={e => setTimeLimit(parseInt(e.target.value) || 20)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs outline-none transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-105' : 'bg-slate-50 border-slate-250'
                    }`}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                Save & Publish Assessment
              </button>
            </form>
          </div>

          {/* Active Questions bank */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-455 uppercase tracking-widest px-1">Active Questions bank ({quizQuestions.length})</h3>
            <div className="space-y-3">
              {quizQuestions.map(q => (
                <div key={q.id} className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-450 font-bold uppercase">{q.scenario}</span>
                    <span className="text-[9px] text-slate-400 font-bold">Standard MCQ</span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 leading-normal">{q.question}</h4>
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/45 rounded-xl border border-slate-100 dark:border-slate-850 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Correct Answer: <strong className="text-emerald-600 font-extrabold">{q.answer}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. IDE SUBMISSIONS MONITORING VIEW */}
      {activeTab === 'ide_monitoring' && (
        <div className="grid lg:grid-cols-12 gap-6 text-left">
          {/* Left: Queue List */}
          <div className={`lg:col-span-7 rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[500px] ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-extrabold">IDE Submissions Monitor Panel</h3>
                  <p className="text-xs text-slate-505">Grade, comment on, and verify student compilation solutions</p>
                </div>
                <div className="relative w-44 shrink-0">
                  <input
                    type="text"
                    placeholder="Filter by student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-3 py-1.5 border outline-none rounded-xl text-xs transition ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-650' : 'bg-slate-50 border-slate-250 text-slate-650 focus:bg-white focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-20 space-y-2 text-slate-400">
                  <h4 className="font-bold text-sm">No submissions found</h4>
                  <p className="text-xs max-w-xs mx-auto">
                    {activeCount === 0 
                      ? 'No connected students logs available. Add connections inside Dashboard first.'
                      : 'All reviews are completed! Fresh submissions will appear as student compilers run coding tasks.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
                  {filteredSubmissions.map((sub) => {
                    const isSelected = selectedSub?.id === sub.id;
                    const isPending = sub.status === 'pending';
                    return (
                      <div 
                        key={sub.id}
                        onClick={() => handleSelectSubmission(sub)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                          isSelected ? 'bg-emerald-500/10 border-emerald-650 ring-1 ring-emerald-500/20' : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-350'
                        }`}
                      >
                        <div className="space-y-1 text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs">{sub.studentName}</h4>
                            <span className="text-[9.5px] text-slate-400 font-mono">{sub.submittedAt}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[280px]">{sub.challengeName}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {isPending ? (
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-450 px-2 py-0.5 rounded uppercase tracking-wider">
                              Needs Grading
                            </span>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                {sub.grade}% score
                              </span>
                              <span className="text-[9px] text-slate-400 block font-medium mt-0.5">Reviewed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Code Inspector */}
          <div className="lg:col-span-5" id="teacher-grading-panel">
            {selectedSub ? (
              <div className="bg-slate-905 border border-slate-800 bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] font-mono bg-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded uppercase tracking-wide">Reviewing Draft File</span>
                      <h4 className="text-slate-100 font-bold text-sm mt-1">{selectedSub.studentName}</h4>
                      <p className="text-[10.5px] text-slate-400 italic truncate max-w-[180px]">{selectedSub.challengeName}</p>
                    </div>
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${
                      selectedSub.status === 'pending' ? 'bg-rose-950/40 text-rose-450 border border-rose-950/60' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-950/60'
                    }`}>
                      {selectedSub.status === 'pending' ? 'Pending Approval' : 'Reviewed & Graded'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest block">Student Java Source Code</span>
                    <pre className="bg-slate-950 text-emerald-450 p-3 rounded-xl font-mono text-[10.5px] leading-relaxed max-h-[160px] overflow-y-auto border border-slate-800">
                      {selectedSub.code}
                    </pre>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-850">
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Assign Grade (0 - 100%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={scoreText} 
                        onChange={(e) => setScoreText(parseInt(e.target.value) || 0)}
                        className="bg-slate-950 border border-slate-800 outline-none p-2 rounded-xl text-slate-200 text-xs w-24 font-mono font-bold focus:border-emerald-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Academic Instructor Feedback</label>
                      <textarea 
                        placeholder="Provide constructive override, inheritance hierarchy, or polymorphism feedback..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="bg-slate-950 border border-slate-800 outline-none p-3 rounded-xl text-slate-250 text-xs w-full h-16 resize-none leading-normal focus:border-emerald-600 whitespace-pre-wrap"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex">
                  <button
                    onClick={handlePostGrade}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition shadow-md"
                  >
                    Post Grade & Feedback
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border p-8 text-center text-xs italic py-32 shadow-sm flex flex-col items-center justify-center space-y-3 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <p>Select a student submission from the queue on the left to inspect source code and submit grades.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. ANALYTICS VIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 text-left">
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Student Performance charts mockup */}
            <div className={`p-6 rounded-2xl border shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-extrabold mb-1">Average Student Performance</h3>
              <p className="text-xs text-slate-400 mb-6">Quiz diagnostics average score per module</p>
              
              <div className="space-y-4">
                {[
                  { label: 'Module 1: Intro to Objects & Classes', pct: 88, color: 'bg-emerald-500' },
                  { label: 'Module 2: Core Pillar: Inheritance Hierarchy', pct: 82, color: 'bg-emerald-500' },
                  { label: 'Module 3: Polymorphism & Dynamic Dispatch', pct: 75, color: 'bg-teal-500' },
                  { label: 'Module 4: Abstract strategy Patterns', pct: 68, color: 'bg-amber-500' },
                  { label: 'Module 5: V-Table heap Address offsets', pct: 62, color: 'bg-amber-500' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="truncate max-w-[240px] text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="font-mono text-emerald-600">{item.pct}% avg</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz Pass/Fail Rate charts mockup */}
            <div className={`p-6 rounded-2xl border shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-extrabold mb-1">Quiz Diagnostics pass/fail rates</h3>
              <p className="text-xs text-slate-400 mb-6">Assessment milestones passing records</p>
              
              <div className="space-y-4">
                {[
                  { label: 'Classes & objects exam', pass: 92, fail: 8, color: 'bg-emerald-500' },
                  { label: 'Subclassing constructor diagnostics', pass: 85, fail: 15, color: 'bg-emerald-500' },
                  { label: 'Polymorphic virtual lookup', pass: 78, fail: 22, color: 'bg-teal-500' },
                  { label: 'Abstract interfaces Strategy rules', pass: 70, fail: 30, color: 'bg-amber-500' }
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-705 dark:text-slate-305">{item.label}</span>
                      <span className="font-mono text-slate-500"><strong className="text-emerald-600">{item.pass}% Pass</strong> / {item.fail}% Fail</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${item.pass}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${item.fail}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. PROFILE SETTINGS VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto text-left space-y-6">
          <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-4 border-b pb-4 border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-[#4CAF50] text-white font-black rounded-2xl flex items-center justify-center text-2xl shadow-md">
                {currentUser.name.split(/\s+/).slice(0, 2).map(n => n[0]).join('') || 'TC'}
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{currentUser.name}</h4>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[10px] font-bold rounded border border-blue-200 uppercase tracking-wider inline-block mt-1">
                  Instructor Profile
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Employee ID</span>
                  <span className="font-extrabold text-slate-805 dark:text-slate-200">{currentUser.employeeId || 'EMP-0001'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Active Department</span>
                  <span className="font-extrabold text-slate-805 dark:text-slate-200">{currentUser.department || 'College of Computer Studies'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Domain Specialization</span>
                  <span className="font-extrabold text-slate-805 dark:text-slate-200">{currentUser.specialization || 'Object-Oriented Programming'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Account status</span>
                  <span className="font-extrabold text-emerald-650 dark:text-emerald-450">Active clearance</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-1">Teaching Catalog Subjects</span>
                <p className="text-slate-655 dark:text-slate-350 font-semibold leading-normal">
                  {currentUser.assignedCourses || 'OOP 101, Advanced Java, Software Architecture'}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => {
                  const el = document.getElementById('hub-top-navbar');
                  if (el) {
                    const btn = el.querySelector('#navbar-profile-trigger') as HTMLButtonElement;
                    if (btn) btn.click();
                  }
                }}
                className="py-2 px-4 border border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Open Main Profile settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
