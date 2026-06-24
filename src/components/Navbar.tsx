import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  Clock, 
  LogOut, 
  Settings, 
  Bell, 
  Laptop, 
  Sun, 
  Moon, 
  ChevronDown, 
  Check, 
  Info, 
  Lock, 
  BookOpen, 
  HelpCircle, 
  CheckCircle,
  AlertCircle,
  FileText,
  UserCheck,
  Search,
  MessageSquare,
  SlidersHorizontal,
  ClipboardList,
  MonitorCog
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthenticatedUser, Persona } from '../types';

interface NavbarProps {
  user: AuthenticatedUser;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onNavigate: (view: string) => void;
  onUpdateProfile: (updates: Partial<AuthenticatedUser>) => void;
  onLogoutTrigger: () => void;
}

export default function Navbar({ 
  user, 
  theme, 
  setTheme, 
  onNavigate, 
  onUpdateProfile, 
  onLogoutTrigger 
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Mock Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Submission Graded', desc: 'Your Vehicle class override constructor assignment was marked 100/100 by Dr. Elena Vance.', read: false, time: '10m ago' },
    { id: 2, title: 'New Adaptive Challenge', desc: 'Recommendation engine suggested Polymorphism Diagnostics Quiz based on compiler practice results.', read: false, time: '1h ago' },
    { id: 3, title: 'Streak Milestone!', desc: 'You reached a 12-day coding consistency streak! Keep up the momentum.', read: true, time: '1d ago' }
  ]);

  const messages = [
    { id: 1, name: 'Dr. Elena Vance', subject: 'Assessment rubric update', time: '5m ago' },
    { id: 2, name: 'System Monitor', subject: 'Nightly course sync completed', time: '31m ago' },
    { id: 3, name: 'Sofia Rodriguez', subject: 'Question about encapsulation lab', time: '2h ago' }
  ];

  // Dynamic Profile Completion calculation
  const calculateCompletion = (u: AuthenticatedUser): number => {
    const commonFields = [u.name, u.email, u.contactNumber, u.address, u.dateOfBirth];
    const filledCommon = commonFields.filter(Boolean).length;
    
    let roleFields: any[] = [];
    if (u.role === 'student') {
      roleFields = [u.studentNumber, u.course, u.yearLevel, u.section];
    } else if (u.role === 'teacher') {
      roleFields = [u.employeeId, u.department, u.specialization, u.assignedCourses];
    } else if (u.role === 'admin') {
      roleFields = [u.adminId, u.systemRole, u.accessLevel];
    }
    
    const filledRole = roleFields.filter(Boolean).length;
    const totalFields = commonFields.length + roleFields.length;
    const filledFields = filledCommon + filledRole;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const completionPct = calculateCompletion(user);

  // Auto close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Status helper colors
  const statusColors = {
    online: 'bg-emerald-500 ring-emerald-100',
    away: 'bg-amber-500 ring-amber-100',
    busy: 'bg-rose-500 ring-rose-100',
    offline: 'bg-slate-400 ring-slate-100'
  };

  const statusLabel = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy / DND',
    offline: 'Offline'
  };

  const roleLabel = (role: Persona) => {
    if (role === 'teacher') return 'Instructor';
    if (role === 'admin') return 'System Administrator';
    return 'Student Member';
  };

  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'OP';
  };

  const handleStatusChange = (status: 'online' | 'busy' | 'away' | 'offline') => {
    onUpdateProfile({ onlineStatus: status });
  };

  // Render Modal overlays for quick actions
  const renderActionModal = () => {
    if (!activeModal) return null;

    let title = '';
    let icon: React.ReactNode = null;
    let content: React.ReactNode = null;

    switch (activeModal) {
      case 'academic':
        title = 'Academic Information';
        icon = <BookOpen className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            {user.role === 'student' ? (
              <>
                <p className="text-slate-500 dark:text-slate-450">Your current academic enrolment details for the active semester:</p>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Student Number</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.studentNumber || '2026-0001'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Enrolled Course</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.course || 'BS Computer Science'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Year Level / Section</span>
                    <span className="font-extrabold text-slate-855 dark:text-slate-200">{user.yearLevel || '3rd Year'} - {user.section || 'CS-3A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Academic Status</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                      {user.programStatus || 'Regular'}
                    </span>
                  </div>
                </div>
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  ⚡ <strong>Note:</strong> Academic data is synchronized automatically with the College Registrar. For modifications, please file a request through the Help & Support action.
                </div>
              </>
            ) : user.role === 'teacher' ? (
              <>
                <p className="text-slate-500 dark:text-slate-400">Your academic teaching assignment credentials:</p>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Employee ID</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.employeeId || 'EMP-0001'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Department</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.department || 'College of Computer Studies'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Specialization</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200 block">{user.specialization || 'Object-Oriented Programming'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Assigned Syllabus Courses</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{user.assignedCourses || 'OOP 101, Advanced Java, Software Architecture'}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-500 dark:text-slate-400">Administrator authorization clearance properties:</p>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Admin ID</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.adminId || 'ADM-0001'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Access Clearance</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.accessLevel || 'Level 5 - Full Access'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">System Domain Authority</span>
                    <span className="font-extrabold text-slate-850 dark:text-slate-200">{user.systemRole || 'Super Administrator'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );
        break;
      case 'account':
        title = 'Account Settings';
        icon = <Settings className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Manage your core login authentication and data storage preferences.</p>
            <div className="space-y-3 text-left">
              <div className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div>
                  <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">Two-Factor Authentication (2FA)</div>
                  <div className="text-[11px] text-slate-400">Increase account credentials safety.</div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">Deactivated</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div>
                  <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">Remember Me Session Lifespan</div>
                  <div className="text-[11px] text-slate-400">Stay signed in on this device.</div>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-455">30 Days</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div>
                  <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">Personal Data Portability</div>
                  <div className="text-[11px] text-slate-400">Request a backup package of your code workspace files.</div>
                </div>
                <button type="button" onClick={() => alert('Backup request received. An email copy has been prepared.')} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition">Export</button>
              </div>
            </div>
          </div>
        );
        break;
      case 'preferences':
        title = 'System Preferences';
        icon = <SlidersHorizontal className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Tune dashboard density, alerts, and administrative workspace behavior.</p>
            <div className="space-y-3">
              {[
                { label: 'Compact dashboard mode', desc: 'Use tighter rows for analytics-heavy review sessions.' },
                { label: 'Show mastery alerts first', desc: 'Prioritize weak OOP concepts in dashboard modules.' },
                { label: 'Weekly admin digest', desc: 'Send platform health, course progress, and audit summaries.' }
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400 leading-tight pr-4">{item.desc}</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      case 'logs':
        title = 'Activity Logs';
        icon = <ClipboardList className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Recent administrative events and system audit entries.</p>
            <div className="space-y-3">
              {[
                { event: 'Admin dashboard opened', actor: user.name, time: 'Just now' },
                { event: 'Recommendation rules synchronized', actor: 'System Monitor', time: '12 min ago' },
                { event: 'Course content index refreshed', actor: 'Content Library', time: '38 min ago' },
                { event: 'Suspicious login attempt flagged', actor: 'Security Layer', time: '1 hr ago' }
              ].map((log) => (
                <div key={`${log.event}-${log.time}`} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800">
                  <MonitorCog className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-850 dark:text-slate-200">{log.event}</p>
                    <p className="text-[11px] text-slate-400">{log.actor} - {log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      case 'notifications':
        title = 'Notification Preferences';
        icon = <Bell className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Customize what updates are broadcasted to your desktop and email.</p>
            <div className="space-y-3">
              {[
                { label: 'Grade Releases', desc: 'Instantly notify when an instructor reviews my sandbox code.' },
                { label: 'Adaptive Recommendations', desc: 'Alert when the regulatory engine detects remediation path loops.' },
                { label: 'Cohort Streaks & Podium Changes', desc: 'Announce daily streak achievements and podium ranking events.' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-850 dark:text-slate-200 text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-400 leading-tight pr-4">{item.desc}</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        break;
      case 'security':
        title = 'Security & Privacy';
        icon = <Lock className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Observe active network sessions and administrative security overrides.</p>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-3">
              <div className="flex justify-between">
                <span className="font-bold">Current Browser Session:</span>
                <span className="font-mono text-emerald-650 dark:text-emerald-400 font-bold">127.0.0.1 (Chrome / Windows)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Last Security Audit Pass:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">June 16, 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Data Encryption Standard:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">AES-256 GCM Payload Protection</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">We do not share student profile details, compile results, or submission logs with third-party analytical domains.</p>
          </div>
        );
        break;
      case 'password':
        title = 'Change Password';
        icon = <Lock className="w-6 h-6 text-emerald-600" />;
        content = (
          <form onSubmit={(e) => { e.preventDefault(); alert('Password successfully updated (simulation).'); setActiveModal(null); }} className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-450">Enter your credentials below to rotate your system access keys.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Current Password</label>
                <input required type="password" placeholder="••••••••" className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-905 dark:text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">New Password</label>
                <input required type="password" placeholder="Min. 8 characters" className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-905 dark:text-white outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Confirm New Password</label>
                <input required type="password" placeholder="Re-enter password" className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-905 dark:text-white outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="flex-grow py-2 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300">Cancel</button>
              <button type="submit" className="flex-grow py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-100 dark:shadow-none">Save Password</button>
            </div>
          </form>
        );
        break;
      case 'help':
        title = 'Help & Academic Support';
        icon = <HelpCircle className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-left">
            <p className="text-slate-500 dark:text-slate-455">Need architectural guidelines or technical debugging on OOP dispatch overrides?</p>
            <div className="space-y-2.5">
              <button type="button" onClick={() => { onNavigate('videos'); setActiveModal(null); }} className="w-full block p-3 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 rounded-xl hover:bg-emerald-50/10 transition group text-left cursor-pointer">
                <span className="font-extrabold text-slate-850 dark:text-slate-200 block text-xs group-hover:text-emerald-600">📖 Reference Syllabus Playlist</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Watch animated lectures detailing virtual offset table lookups.</span>
              </button>
              <button type="button" onClick={() => { onNavigate('ide'); setActiveModal(null); }} className="w-full block p-3 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 rounded-xl hover:bg-emerald-50/10 transition group text-left cursor-pointer">
                <span className="font-extrabold text-slate-850 dark:text-slate-200 block text-xs group-hover:text-emerald-600">🎮 Interactive Sandbox IDE</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Compile overrides and study immediate compiler error remediations.</span>
              </button>
              <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-left bg-slate-50/80 dark:bg-slate-900/40">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">🏫 Contact Course Advisor</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Primary Instructor: <strong>Dr. Elena Vance</strong> (elena@oophub.edu)</span>
              </div>
            </div>
          </div>
        );
        break;
      case 'about':
        title = 'About OOP Pedagogical Hub';
        icon = <Info className="w-6 h-6 text-emerald-600" />;
        content = (
          <div className="space-y-4 text-sm text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
              <span className="text-2xl font-black">OOP</span>
            </div>
            <div>
              <h4 className="font-extrabold text-slate-850 dark:text-white text-base">OOP Pedagogical Hub</h4>
              <span className="text-xs text-slate-400">Core Engine version 2.4.0 (Stable release)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
              An advanced, adaptive object-oriented programming learning management core designed to analyze and remediate student conceptual understandings of subclass definitions, encapsulations, and dynamic method overrides.
            </p>
            <div className="text-[10px] text-slate-450 font-mono mt-4">
              © 2026 College of Computer Studies. All rights reserved.
            </div>
          </div>
        );
        break;
      default:
        return null;
    }

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs animate-fade-in">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 max-w-md w-full mx-4 space-y-4 text-slate-850 dark:text-slate-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {icon}
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h3>
            </div>
            <button 
              type="button"
              onClick={() => setActiveModal(null)} 
              className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="py-1">
            {content}
          </div>
          {activeModal !== 'password' && (
            <div className="pt-2 flex justify-end">
              <button 
                type="button"
                onClick={() => setActiveModal(null)} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition"
              >
                Close Window
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  const isDark = theme === 'dark';

  return (
    <>
      <header className={`h-16 border-b transition-colors duration-200 ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-100'} sticky top-0 z-[90]`} id="hub-top-navbar">
        <div className="px-6 h-full flex items-center justify-between">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-md shadow-md shadow-emerald-500/10">
              OOP
            </div>
            <div className="text-left">
              <span className={`font-mono text-sm sm:text-base font-extrabold tracking-tight block leading-tight ${isDark ? 'text-white' : 'text-slate-905'}`}>
                OOP Pedagogical Hub
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">
                System Status: <span className="text-emerald-500 font-bold uppercase">Online</span>
              </span>
            </div>
          </div>

          {/* Center: Global Search */}
          <label className={`hidden lg:flex h-10 w-full max-w-xl items-center gap-2 rounded-xl border px-3 transition ${isDark ? 'border-slate-800 bg-slate-900/70 text-slate-200 focus-within:border-emerald-500/50' : 'border-slate-200 bg-slate-50 text-slate-800 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100'}`}>
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={globalSearch}
              onChange={event => setGlobalSearch(event.target.value)}
              placeholder="Search users, courses, assessments"
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              aria-label="Global search users, courses, assessments"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="rounded-md px-2 py-1 text-[10px] font-extrabold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </label>

          {/* Right: Notifications Bell & Profile Section */}
          <div className="flex items-center gap-4">
            
            {/* Notifications Alert Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'border-slate-800 text-slate-350 hover:bg-slate-909 hover:text-white' : 'border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                aria-label="Toggle notifications menu"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center font-bold text-[8.5px] border-2 border-white dark:border-slate-950 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-80 sm:w-96 max-sm:fixed max-sm:inset-x-4 max-sm:mx-auto max-sm:w-auto max-sm:max-w-md max-sm:top-18 rounded-2xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-md ${isDark ? 'bg-slate-900/95 border-slate-800/80 shadow-black/40 text-slate-200' : 'bg-white/95 border-slate-200/80 shadow-slate-200/50 text-slate-800'}`}
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                      <span className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Activity Broadcaster</span>
                      {unreadCount > 0 && (
                        <button 
                          type="button"
                          onClick={handleMarkAllRead} 
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 font-medium">
                          No recent system alerts.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleToggleRead(notif.id)}
                            className={`p-4 transition-colors cursor-pointer text-left ${!notif.read ? 'bg-emerald-50/15 dark:bg-emerald-950/5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-950/40'}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-xs font-extrabold block leading-tight ${!notif.read ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                {notif.title}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium shrink-0">{notif.time}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                              {notif.desc}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages Menu */}
            <div className="relative" ref={messagesRef}>
              <button
                type="button"
                onClick={() => setIsMessagesOpen(!isMessagesOpen)}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'border-slate-800 text-slate-350 hover:bg-slate-909 hover:text-white' : 'border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                aria-label="Toggle messages menu"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
              </button>

              <AnimatePresence>
                {isMessagesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-80 max-sm:fixed max-sm:inset-x-4 max-sm:mx-auto max-sm:w-auto max-sm:max-w-md max-sm:top-18 rounded-2xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-md ${isDark ? 'bg-slate-900/95 border-slate-800/80 shadow-black/40 text-slate-200' : 'bg-white/95 border-slate-200/80 shadow-slate-200/50 text-slate-800'}`}
                  >
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                      <span className="font-extrabold text-xs uppercase tracking-wider text-slate-400">Messages</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-850">
                      {messages.map(message => (
                        <button
                          type="button"
                          key={message.id}
                          onClick={() => setIsMessagesOpen(false)}
                          className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                            {getInitials(message.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-200">{message.name}</span>
                              <span className="shrink-0 text-[9px] font-bold text-slate-400">{message.time}</span>
                            </div>
                            <p className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{message.subject}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Section Selector */}
            <div className="relative" ref={dropdownRef}>
              <button 
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left select-none cursor-pointer ${isDropdownOpen ? 'border-emerald-500/30 bg-emerald-50/5' : 'border-transparent hover:bg-slate-50'}`}
                id="navbar-profile-trigger"
              >
                {/* Avatar */}
                <div className="relative">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#4CAF50] text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                      {getInitials(user.name)}
                    </div>
                  )}
                  {/* Status Indicator Dot */}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusColors[user.onlineStatus ?? 'online']} ring-2 ring-transparent`} />
                </div>

                {/* Name & Role Badge (hidden on mobile) */}
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold leading-tight text-slate-800 truncate max-w-[100px]">
                    {user.name}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 leading-none mt-0.5">
                    {user.role === 'student' ? 'Student' : user.role === 'teacher' ? 'Teacher' : 'Admin'}
                  </span>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200 shadow-xl bg-white z-[100] overflow-hidden"
                    id="navbar-profile-dropdown"
                  >
                    {/* User Information Card (Preview Card) */}
                    <div className="p-4 flex flex-col items-center text-center space-y-3 bg-slate-50 border-b border-slate-100">
                      {/* Avatar with Status Dot */}
                      <div className="relative">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" 
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#4CAF50] text-white flex items-center justify-center text-lg font-black shadow-sm shrink-0">
                            {getInitials(user.name)}
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.onlineStatus ?? 'online']} ring-2 ring-transparent`} />
                      </div>

                      {/* Name, Email, & Role Badge */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{user.name}</h3>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            user.role === 'student' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/30' :
                            user.role === 'teacher' ? 'bg-blue-50 text-blue-700 border border-blue-200/30' :
                            'bg-purple-50 text-purple-700 border border-purple-200/30'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{user.email}</p>
                      </div>

                      {/* View Full Profile Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate('profile');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition duration-200 cursor-pointer"
                        id="view-full-profile-btn"
                      >
                        My Profile
                      </button>
                    </div>

                    {/* Online Status Selector */}
                    <div className="px-4 py-3 border-b border-slate-100 text-left bg-white">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Availability Status</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleStatusChange(status)}
                            className={`flex flex-col items-center p-1 rounded-lg border text-[9px] font-extrabold transition-all cursor-pointer ${
                              user.onlineStatus === status 
                                ? 'bg-slate-55 border-slate-350 shadow-xs text-slate-800 font-extrabold' 
                                : 'border-transparent hover:bg-slate-50 text-slate-500'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full mb-1 ${statusColors[status]}`} />
                            {statusLabel[status].split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Profile Dropdown Actions */}
                    <div className="p-2 border-b border-slate-100 text-left bg-white">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-2 py-1">Account Menu</span>
                      <div className="space-y-0.5 pt-1 text-xs">
                        {[
                          { id: 'profile', label: 'My Profile', icon: <UserCheck className="w-3.5 h-3.5 text-slate-400" />, action: () => { onNavigate('profile'); setIsDropdownOpen(false); } },
                          { id: 'account', label: 'Account Settings', icon: <Settings className="w-3.5 h-3.5 text-slate-400" />, action: () => { setIsDropdownOpen(false); setActiveModal('account'); } },
                          { id: 'preferences', label: 'System Preferences', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />, action: () => { setIsDropdownOpen(false); setActiveModal('preferences'); } },
                          { id: 'logs', label: 'Activity Logs', icon: <ClipboardList className="w-3.5 h-3.5 text-slate-400" />, action: () => { setIsDropdownOpen(false); setActiveModal('logs'); } }
                        ].map((actionItem) => (
                          <button
                            key={actionItem.id}
                            type="button"
                            onClick={actionItem.action}
                            className="flex w-full items-center gap-2 px-2 py-2.5 hover:bg-slate-50 rounded-lg transition text-left text-slate-600 font-bold hover:text-emerald-600 cursor-pointer"
                          >
                            {actionItem.icon}
                            <span>{actionItem.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logout Button */}
                    <div className="p-3 text-left bg-slate-50">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogoutTrigger();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-extrabold text-xs transition cursor-pointer border border-rose-100/50"
                        id="dropdown-logout-btn"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </header>

      {/* Render Action Modals */}
      <AnimatePresence>
        {activeModal && renderActionModal()}
      </AnimatePresence>
    </>
  );
}
