import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Code,
  Edit,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldAlert,
  User,
  Image as ImageIcon,
  MessageSquare,
  Lock
} from 'lucide-react';
import { AuthenticatedUser, Persona } from '../types';

interface ProfileMetric {
  label: string;
  value: string;
  helper: string;
}

interface ProfilePageProps {
  user: AuthenticatedUser;
  metrics: ProfileMetric[];
  onUpdateProfile: (updates: Partial<AuthenticatedUser>) => void;
}

const formatFullDate = (value?: string) => {
  if (!value) return 'June 16, 2026';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'June 16, 2026';
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ProfilePage({ user, metrics, onUpdateProfile }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'about' | 'academic' | 'logs' | 'settings'>('timeline');
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState('');
  
  // Custom states for social features
  const [bio, setBio] = useState('Learning and mastering Object-Oriented Programming principles at the OOP Pedagogical Hub.');
  const [coverGradient, setCoverGradient] = useState('bg-gradient-to-r from-emerald-500/10 to-teal-500/10');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');

  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    contactNumber: user.contactNumber ?? '',
    address: user.address ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
    studentNumber: user.studentNumber ?? '',
    course: user.course ?? '',
    yearLevel: user.yearLevel ?? '',
    section: user.section ?? '',
    programStatus: user.programStatus ?? 'Regular',
    employeeId: user.employeeId ?? '',
    department: user.department ?? '',
    specialization: user.specialization ?? '',
    assignedCourses: user.assignedCourses ?? '',
    adminId: user.adminId ?? '',
    systemRole: user.systemRole ?? '',
    accessLevel: user.accessLevel ?? ''
  });

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      contactNumber: user.contactNumber ?? '',
      address: user.address ?? '',
      dateOfBirth: user.dateOfBirth ?? '',
      studentNumber: user.studentNumber ?? '',
      course: user.course ?? '',
      yearLevel: user.yearLevel ?? '',
      section: user.section ?? '',
      programStatus: user.programStatus ?? 'Regular',
      employeeId: user.employeeId ?? '',
      department: user.department ?? '',
      specialization: user.specialization ?? '',
      assignedCourses: user.assignedCourses ?? '',
      adminId: user.adminId ?? '',
      systemRole: user.systemRole ?? '',
      accessLevel: user.accessLevel ?? ''
    });
    if (user.avatar) {
      setAvatarUrl(user.avatar);
    }
  }, [user]);

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'OP';

  const calculateCompletion = (): number => {
    const commonFields = [form.name, form.email, form.contactNumber, form.address, form.dateOfBirth, bio];
    const filledCommon = commonFields.filter(Boolean).length;
    
    let roleFields: any[] = [];
    if (user.role === 'student') {
      roleFields = [form.studentNumber, form.course, form.yearLevel, form.section];
    } else if (user.role === 'teacher') {
      roleFields = [form.employeeId, form.department, form.specialization, form.assignedCourses];
    } else if (user.role === 'admin') {
      roleFields = [form.adminId, form.systemRole, form.accessLevel];
    }
    
    const filledRole = roleFields.filter(Boolean).length;
    const totalFields = commonFields.length + roleFields.length;
    return Math.round(((filledCommon + filledRole) / totalFields) * 100);
  };

  const completionPct = calculateCompletion();

  const handleSave = () => {
    onUpdateProfile({
      name: form.name.trim() || user.name,
      email: form.email.trim() || user.email,
      contactNumber: form.contactNumber.trim(),
      address: form.address.trim(),
      dateOfBirth: form.dateOfBirth,
      studentNumber: form.studentNumber.trim(),
      course: form.course.trim(),
      yearLevel: form.yearLevel.trim(),
      section: form.section.trim(),
      programStatus: form.programStatus,
      employeeId: form.employeeId.trim(),
      department: form.department.trim(),
      specialization: form.specialization.trim(),
      assignedCourses: form.assignedCourses.trim(),
      adminId: form.adminId.trim(),
      systemRole: form.systemRole.trim(),
      accessLevel: form.accessLevel.trim(),
      avatar: avatarUrl
    });
    setIsEditing(false);
    setNotice('Profile updated successfully.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const cycleCover = () => {
    const gradients = [
      'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
      'bg-gradient-to-r from-green-500/10 to-emerald-600/15',
      'bg-gradient-to-r from-sky-400/10 to-emerald-500/10',
      'bg-gradient-to-r from-slate-200 to-slate-100',
      'bg-emerald-50'
    ];
    const currentIndex = gradients.indexOf(coverGradient);
    const nextIndex = (currentIndex + 1) % gradients.length;
    setCoverGradient(gradients[nextIndex]);
    setNotice('Cover style updated.');
    window.setTimeout(() => setNotice(''), 2000);
  };

  const handleAvatarPrompt = () => {
    const url = prompt('Enter image URL for your profile picture:', avatarUrl);
    if (url !== null) {
      setAvatarUrl(url);
      onUpdateProfile({ avatar: url });
      setNotice('Profile picture updated.');
      window.setTimeout(() => setNotice(''), 2000);
    }
  };

  const statusColors = {
    online: 'bg-emerald-500 ring-emerald-100',
    away: 'bg-amber-500 ring-amber-100',
    busy: 'bg-rose-500 ring-rose-100',
    offline: 'bg-slate-400 ring-slate-100'
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] rounded-xl bg-slate-50 text-slate-800 p-4 sm:p-6" id="profile-page-root">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Banner Alert Notification */}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800 animate-fade-in shadow-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {notice}
          </div>
        )}

        {/* 1. COVER SECTION */}
        <section className="relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className={`h-40 sm:h-52 w-full transition-all duration-300 ${coverGradient}`} id="profile-cover-banner">
            <button
              type="button"
              onClick={cycleCover}
              className="absolute right-4 top-4 bg-white/80 hover:bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Edit Cover
            </button>
          </div>

          {/* Profile Picture Overlap & Identity Header */}
          <div className="px-6 pb-6 pt-0 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20">
              {/* Avatar Holder */}
              <div 
                className="relative group cursor-pointer"
                onClick={handleAvatarPrompt}
                title="Click to edit profile picture"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white bg-slate-100 shadow-md transition group-hover:brightness-90"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#4CAF50] text-white flex items-center justify-center text-3xl font-black border-4 border-white shadow-md transition group-hover:brightness-90">
                    {initials}
                  </div>
                )}
                {/* Hover overlay icon */}
                <div className="absolute inset-0 rounded-full bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="w-6 h-6 text-white" />
                </div>
                {/* Online Status Indicator */}
                <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white ${statusColors[user.onlineStatus ?? 'online']} shadow-sm`} />
              </div>

              {/* Name & Basic Meta Details */}
              <div className="text-center sm:text-left space-y-1.5 pb-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{user.name}</h2>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{user.email}</p>
                <div className="text-xs text-slate-400 font-medium flex items-center justify-center sm:justify-start gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Joined {formatFullDate(user.registrationDate)}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  setIsEditing(true);
                }}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Account Settings
              </button>
              <button
                type="button"
                onClick={() => alert('Future Message features are ready for integration.')}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Messages
              </button>
            </div>
          </div>

          {/* Bio section & Quick Info Chips Tagline */}
          <div className="border-t border-slate-100 p-6 space-y-4">
            {/* Bio text area */}
            <div className="text-left">
              {isEditing ? (
                <div className="space-y-1">
                  <label htmlFor="profile-bio-edit" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Short Bio</label>
                  <textarea
                    id="profile-bio-edit"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full text-xs sm:text-sm text-slate-800 p-3 bg-white border border-slate-200 rounded-xl focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    rows={2}
                    maxLength={150}
                  />
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium italic">
                  "{bio}"
                </p>
              )}
            </div>

            {/* Quick Info Chips */}
            <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs font-bold select-none">
              {user.role === 'student' && (
                <>
                  <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                    ID: {form.studentNumber || '2026-0001'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Course: {form.course || 'BSIT'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Year: {form.yearLevel || '1st Year'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Section: {form.section || 'CS-1A'}
                  </span>
                </>
              )}
              {user.role === 'teacher' && (
                <>
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                    Teacher ID: {form.employeeId || 'EMP-0001'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Dept: {form.department || 'CCS'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Spec: {form.specialization || 'Object-Oriented Programming'}
                  </span>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg">
                    Admin ID: {form.adminId || 'ADM-0001'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    System Role: {form.systemRole || 'System Architect'}
                  </span>
                  <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg">
                    Clearance: {form.accessLevel || 'Level 5'}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 4. NAVIGATION TABS */}
        <div className="sticky top-16 z-30 bg-slate-50 py-1.5 border-b border-slate-200">
          <nav className="flex gap-1 overflow-x-auto select-none" aria-label="Profile navigation tabs">
            {([
              { id: 'timeline', label: 'Timeline Feed', icon: FileText },
              { id: 'about', label: 'About Info', icon: User },
              { id: 'academic', label: 'Academic Details', icon: BookOpen },
              { id: 'logs', label: 'Activity Logs', icon: Clock },
              { id: 'settings', label: 'Update Info', icon: Settings }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'settings') setIsEditing(true);
                  else setIsEditing(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 5. PAGE LAYOUT STRUCTURE */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[280px_1fr]">
          
          {/* LEFT PANEL: INFO CARD */}
          <aside className="space-y-6">
            
            {/* Info Card Component */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace Bio</h3>
                <span className="text-[10px] text-slate-400 font-medium block">Personal identification records</span>
              </div>

              {/* Progress Completion Indicator */}
              <div className="space-y-2 py-1.5 border-y border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-500">Profile Completion</span>
                  <span className="font-black text-emerald-600">{completionPct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              {/* Personal Info list */}
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Full Name</span>
                  <span className="font-extrabold text-slate-800">{form.name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Email Address</span>
                  <span className="font-extrabold text-slate-800 truncate block">{form.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Contact</span>
                  <span className="font-extrabold text-slate-800">{form.contactNumber || 'Not provided'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Location Address</span>
                  <span className="font-extrabold text-slate-800 leading-normal block">{form.address || 'Not provided'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px]">Account Status</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                    {user.accountStatus ?? 'Active'}
                  </span>
                </div>
              </div>
            </section>

            {/* Static System Quick Help */}
            <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-left space-y-3">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Academic Integrity</span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Your sandbox compiler attempts, graded assessments, and activity timestamps are audit-logged for curriculum validation.
              </p>
            </section>

          </aside>

          {/* RIGHT PANEL: MAIN CONTENT AREA */}
          <main className="space-y-6">
            
            {/* TAB VIEW RENDERING */}

            {/* TAB 1: TIMELINE FEED */}
            {activeTab === 'timeline' && (
              <section className="space-y-4 text-left">
                
                {/* Dynamic Feed Post Item */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                        <Code className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Sandbox Sandbox Compilation</h4>
                        <span className="text-[10px] text-slate-400 block font-medium">1 hour ago ● Code Practice IDE</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-500">
                      SUCCESS
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    Successfully compiled and tested Java Class constructor inheritance. Called <code>super()</code> to initialize base class properties within a polymorphic vehicle cohort simulator.
                  </p>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-600 overflow-x-auto">
                    <code>
                      public class Car extends Vehicle &#123;<br />
                      &nbsp;&nbsp;public Car(String model) &#123;<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;super("Car", model);<br />
                      &nbsp;&nbsp;&#125;<br />
                      &#125;
                    </code>
                  </div>
                </div>

                {/* Feed Item 2 */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Earned Assessment Points</h4>
                        <span className="text-[10px] text-slate-400 block font-medium">1 day ago ● MCQ Diagnostics</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-emerald-600">
                      +150 XP
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    Answered polymorphic execution dispatch scenarios correctly during JVM late binding validation diagnostic MCQ simulator. Passed with a score of 100/100.
                  </p>
                </div>

              </section>
            )}

            {/* TAB 2: ABOUT INFO */}
            {activeTab === 'about' && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Detailed Biography</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Platform enrollment profiles and credentials</p>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 font-medium">
                  <p>
                    Currently enrolled at the OOP Pedagogical Hub to specialize in software engineering architecture patterns. Actively studying Java virtual machines, runtime stack allocations, interfaces vs abstract base classes, and polymorphic constraint structures.
                  </p>
                  <p>
                    This workspace is connected directly to the institutional identity console. Changing account credentials (such as password and profile parameters) resets token credentials. Keep security overrides active at all times.
                  </p>
                </div>

                {/* Achievements List */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Achievements</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {metrics.map((metric) => (
                      <div key={metric.label} className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block text-xs leading-none">{metric.label}</span>
                          <span className="text-[10px] text-slate-400 block mt-1 font-medium">{metric.value} — {metric.helper}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: ACADEMIC INFO */}
            {activeTab === 'academic' && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {user.role === 'student' ? 'Academic Enrolment Information' : user.role === 'teacher' ? 'Teaching Assignments' : 'System Administration Authorization'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Verified registrar information profile card</p>
                </div>

                {/* Role Specific Forms Card */}
                {user.role === 'student' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Student ID Number</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.studentNumber || '2026-0001'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Enrolled Course / Program</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.course || 'BS Computer Science'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Current Year Level</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.yearLevel || '3rd Year'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Active Section assignment</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.section || 'CS-3A'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Enrolled Syllabus Tracks</span>
                      <div className="flex gap-2 pt-1.5 flex-wrap">
                        <span className="px-2 py-1 rounded bg-white text-[10px] text-slate-600 border border-slate-200/50 font-bold">OOP 101 - Core Polymorphism</span>
                        <span className="px-2 py-1 rounded bg-white text-[10px] text-slate-600 border border-slate-200/50 font-bold">CS 220 - Dynamic Dispatch Constraints</span>
                      </div>
                    </div>
                  </div>
                )}

                {user.role === 'teacher' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Employee ID / Number</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.employeeId || 'EMP-0001'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Department Assignment</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.department || 'College of Computer Studies'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Core Research Specialization</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.specialization || 'Object-Oriented Programming'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Assigned Syllabus Classes</span>
                      <span className="font-semibold text-slate-600 text-xs leading-normal block pt-0.5">{form.assignedCourses || 'OOP 101, Advanced Java, Software Architecture'}</span>
                    </div>
                  </div>
                )}

                {user.role === 'admin' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Admin ID Number</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.adminId || 'ADM-0001'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Clearance Access Level</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.accessLevel || 'Level 5 - Full Access'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1 col-span-2">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Administrative System Role</span>
                      <span className="font-extrabold text-slate-800 text-sm">{form.systemRole || 'Super Administrator'}</span>
                    </div>
                  </div>
                )}

              </section>
            )}

            {/* TAB 4: ACTIVITY LOGS */}
            {activeTab === 'logs' && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Security & Activity Audit Logs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Platform session overrides and compilation history</p>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    { event: 'Logged in successfully', ip: 'Cloud session', device: 'Chrome / Windows', time: 'June 16, 2026 at 7:42 PM' },
                    { event: 'Modified personal bio status', ip: 'Cloud session', device: 'Chrome / Windows', time: 'June 16, 2026 at 7:35 PM' },
                    { event: 'Compiled vehicle test suite challenge', ip: 'Cloud session', device: 'Chrome / Windows', time: 'June 16, 2026 at 6:42 PM' },
                    { event: 'Authorized profile information card synchronize', ip: 'Cloud session', device: 'Chrome / Windows', time: 'June 01, 2026 at 10:00 AM' }
                  ].map((log, idx) => (
                    <div key={idx} className="py-3.5 flex justify-between gap-4 items-start flex-wrap">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-800 block">{log.event}</span>
                        <span className="text-[10px] text-slate-400 block font-medium font-mono">{log.ip} ● {log.device}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 shrink-0 font-mono">
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TAB 5: SETTINGS */}
            {activeTab === 'settings' && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-left space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Edit Profile Details</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Modify your basic and institutional details</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div>
                    <label htmlFor="settings-name" className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Full Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 font-semibold focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-email" className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Email Address</label>
                    <input
                      id="settings-email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-850 font-semibold focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-tel" className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Contact Number</label>
                    <input
                      id="settings-tel"
                      type="tel"
                      value={form.contactNumber}
                      onChange={e => setForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-850 font-semibold focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-dob" className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Date of Birth</label>
                    <input
                      id="settings-dob"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-850 font-semibold focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="settings-address" className="block text-slate-400 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Address</label>
                    <input
                      id="settings-address"
                      type="text"
                      value={form.address}
                      onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-850 font-semibold focus:border-[#4CAF50] focus:ring-4 focus:ring-emerald-100/50 outline-none transition"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">
                    <ShieldAlert className="w-4 h-4 text-emerald-600" />
                    Clearance overrides verified
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Information Changes
                  </button>
                </div>
              </section>
            )}

          </main>

        </div>

      </div>
    </div>
  );
}
