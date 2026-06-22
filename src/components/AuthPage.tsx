import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  GraduationCap
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AccountSource, AuthenticatedUser, Persona } from '../types';

interface AuthPageProps {
  initialMode: 'login' | 'register';
  onAuthSuccess: (user: AuthenticatedUser) => void;
  onCancel: () => void;
}

type Notice = { type: 'success' | 'error'; message: string } | null;

type StoredUser = {
  name: string;
  email: string;
  password: string;
  role: Persona;
  userId?: string;
  registrationDate?: string;
  contactNumber?: string;
  address?: string;
  dateOfBirth?: string;
  accountStatus?: string;

  // Student specific
  studentNumber?: string;
  course?: string;
  yearLevel?: string;
  section?: string;
  programStatus?: string;

  // Teacher specific
  employeeId?: string;
  department?: string;
  specialization?: string;
  assignedCourses?: string;

  // Admin specific
  adminId?: string;
  systemRole?: string;
  accessLevel?: string;

  // Status & Avatar
  onlineStatus?: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
};

const demoAccounts: StoredUser[] = [
  {
    name: 'Dmitry Vance (Alex Mercer)',
    email: 'dmitry@oophub.edu',
    password: 'password123',
    role: 'student',
    userId: 'STU-0001',
    registrationDate: '2026-06-01T00:00:00.000Z',
    accountStatus: 'Active',
    studentNumber: '2026-0001',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    section: 'CS-3A',
    programStatus: 'Regular',
    contactNumber: '+1 (555) 019-2834',
    address: '123 Academic Way, University Hills',
    dateOfBirth: '2005-04-12',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  },
  {
    name: 'Dr. Elena Vance',
    email: 'elena@oophub.edu',
    password: 'password123',
    role: 'teacher',
    userId: 'TEA-0001',
    registrationDate: '2026-06-01T00:00:00.000Z',
    accountStatus: 'Active',
    employeeId: 'EMP-0001',
    department: 'College of Computer Studies',
    specialization: 'Object-Oriented Programming',
    assignedCourses: 'OOP 101, Advanced Java, Software Architecture',
    contactNumber: '+1 (555) 083-9921',
    address: '456 Faculty Lane, Green Hills',
    dateOfBirth: '1985-09-22',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    name: 'Jerico Vance (Admin)',
    email: 'jericokunn@gmail.com',
    password: 'password123',
    role: 'admin',
    userId: 'ADM-0001',
    registrationDate: '2026-06-01T00:00:00.000Z',
    accountStatus: 'Active',
    adminId: 'ADM-0001',
    systemRole: 'Super Admin',
    accessLevel: 'Level 5 - Full Access',
    contactNumber: '+1 (555) 091-7723',
    address: 'System Ops HQ, Tech Park',
    dateOfBirth: '1990-01-15',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => emailPattern.test(value.trim());

const buildUserId = (email: string, role: Persona) => {
  const seed = email
    .trim()
    .toLowerCase()
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${role.slice(0, 3).toUpperCase()}-${String(seed).padStart(4, '0')}`;
};

const readStoredUsers = (): StoredUser[] => {
  try {
    const saved = localStorage.getItem('oophub_users');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export default function AuthPage({ initialMode, onAuthSuccess, onCancel }: AuthPageProps) {
  const rememberedEmail = localStorage.getItem('oophub_remembered_email') || '';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [notification, setNotification] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState(rememberedEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });

  // Registration Form States (Shared & Dedicated)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');

  // Student specific fields
  const [regSection, setRegSection] = useState('');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regYearLevel, setRegYearLevel] = useState('2nd Year');
  const [regCourse, setRegCourse] = useState('CS'); // CS or IT

  // Teacher specific fields
  const [regTeacherId, setRegTeacherId] = useState('');

  // Touched state for validation trigger
  const [registerTouched, setRegisterTouched] = useState({
    username: false,
    email: false,
    password: false,
    section: false,
    studentNumber: false,
    teacherId: false
  });

  // Success screen redirection countdown
  const [isRegSuccess, setIsRegSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Auto redirect countdown effect
  useEffect(() => {
    if (!isRegSuccess) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRegSuccess(false);
          setIsLogin(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRegSuccess]);

  // Validation Checkers
  const isLoginEmailValid = isValidEmail(loginEmail);
  const isLoginPasswordValid = loginPassword.trim().length > 0;
  const canLogin = isLoginEmailValid && isLoginPasswordValid && !isSubmitting;

  const loginEmailError =
    loginTouched.email && loginEmail.trim() && !isLoginEmailValid
      ? 'Enter a valid email address.'
      : '';
  const loginPasswordError =
    loginTouched.password && !isLoginPasswordValid
      ? 'Password is required.'
      : '';

  // Registration Validations
  const isRegUsernameValid = regUsername.trim().length >= 3;
  const isRegEmailValid = isValidEmail(regEmail);
  const isRegPasswordValid = regPassword.length >= 6;
  const isRegSectionValid = regRole === 'student' ? regSection.trim().length > 0 : true;
  const isRegStudentNumberValid = regRole === 'student' ? regStudentNumber.trim().length > 0 : true;
  const isRegTeacherIdValid = regRole === 'teacher' ? regTeacherId.trim().length > 0 : true;

  const registerUsernameError =
    registerTouched.username && !isRegUsernameValid
      ? 'Username must be at least 3 characters.'
      : '';
  const registerEmailError =
    registerTouched.email && !isRegEmailValid
      ? 'Enter a valid email address.'
      : '';
  const registerPasswordError =
    registerTouched.password && !isRegPasswordValid
      ? 'Password must be at least 6 characters.'
      : '';
  const registerSectionError =
    regRole === 'student' && registerTouched.section && !isRegSectionValid
      ? 'Section is required (e.g. A, B, C).'
      : '';
  const registerStudentNumberError =
    regRole === 'student' && registerTouched.studentNumber && !isRegStudentNumberValid
      ? 'Student number is required.'
      : '';
  const registerTeacherIdError =
    regRole === 'teacher' && registerTouched.teacherId && !isRegTeacherIdValid
      ? 'Teacher ID is required.'
      : '';

  const canRegister =
    isRegUsernameValid &&
    isRegEmailValid &&
    isRegPasswordValid &&
    !isSubmitting &&
    (regRole === 'student'
      ? isRegSectionValid && isRegStudentNumberValid
      : isRegTeacherIdValid);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    window.setTimeout(() => setNotification(null), 4000);
  };

  const completeLogin = (user: StoredUser, accountSource: AccountSource) => {
    if (rememberMe) {
      localStorage.setItem('oophub_remembered_email', user.email);
    } else {
      localStorage.removeItem('oophub_remembered_email');
    }

    showNotice('success', `Welcome back, ${user.name}. Loading workspace...`);
    window.setTimeout(() => {
      onAuthSuccess({
        name: user.name,
        email: user.email,
        role: user.role,
        accountSource,
        userId: user.userId ?? buildUserId(user.email, user.role),
        registrationDate: user.registrationDate ?? new Date().toISOString(),
        contactNumber: user.contactNumber ?? '',
        address: user.address ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
        accountStatus: user.accountStatus ?? 'Active',
        
        // Student details
        studentNumber: user.studentNumber ?? '',
        course: user.course ?? '',
        yearLevel: user.yearLevel ?? '',
        section: user.section ?? '',
        programStatus: user.programStatus ?? 'Regular',

        // Teacher details
        employeeId: user.employeeId ?? '',
        department: user.department ?? '',
        specialization: user.specialization ?? '',
        assignedCourses: user.assignedCourses ?? '',

        // Admin details
        adminId: user.adminId ?? '',
        systemRole: user.systemRole ?? '',
        accessLevel: user.accessLevel ?? '',

        // Status & Avatar
        onlineStatus: user.onlineStatus ?? 'online',
        avatar: user.avatar ?? ''
      });
    }, 800);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginTouched({ email: true, password: true });

    if (!canLogin) {
      showNotice('error', 'Check your email and password before signing in.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const matchedDefault = demoAccounts.find(
        user => user.email.toLowerCase() === normalizedEmail && user.password === loginPassword
      );
      const matchedCustom = readStoredUsers().find(
        user => user.email.toLowerCase() === normalizedEmail && user.password === loginPassword
      );

      if (matchedDefault) {
        completeLogin(matchedDefault, 'demo');
        return;
      }

      if (matchedCustom) {
        completeLogin(matchedCustom, 'custom');
        return;
      }

      setIsSubmitting(false);
      showNotice('error', 'Invalid email or password. Please verify credentials or create an account.');
    }, 700);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterTouched({
      username: true,
      email: true,
      password: true,
      studentNumber: true,
      section: true,
      teacherId: true
    });

    if (!canRegister) {
      showNotice('error', 'Complete the required account details.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      const usersList = readStoredUsers();
      const normalizedEmail = regEmail.trim().toLowerCase();
      const alreadyExists = [...demoAccounts, ...usersList].some(
        user => user.email.toLowerCase() === normalizedEmail
      );

      if (alreadyExists) {
        setIsSubmitting(false);
        showNotice('error', 'An account is already registered with this email address.');
        return;
      }

      const displayCourse = regCourse === 'CS' ? 'CS (Computer Science)' : 'IT (Information Technology)';
      const computedSection = regRole === 'student' ? regSection.trim().toUpperCase() : undefined;

      const newUser: StoredUser = {
        name: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        userId: buildUserId(regEmail, regRole),
        registrationDate: new Date().toISOString(),
        contactNumber: '',
        address: '',
        dateOfBirth: '',
        accountStatus: 'Active',
        
        // Student-specific fields
        studentNumber: regRole === 'student' ? regStudentNumber.trim() : undefined,
        course: regRole === 'student' ? displayCourse : undefined,
        yearLevel: regRole === 'student' ? regYearLevel : undefined,
        section: computedSection,
        programStatus: regRole === 'student' ? 'Regular' : undefined,

        // Teacher-specific fields
        employeeId: regRole === 'teacher' ? regTeacherId.trim() : undefined,
        department: regRole === 'teacher' ? 'College of Computer Studies' : undefined,
        specialization: regRole === 'teacher' ? 'Object-Oriented Programming' : undefined,
        assignedCourses: regRole === 'teacher' ? 'OOP 101, Advanced Java' : undefined,

        // Global defaults
        onlineStatus: 'online',
        avatar: ''
      };

      usersList.push(newUser);
      localStorage.setItem('oophub_users', JSON.stringify(usersList));
      setLoginEmail(newUser.email);
      setLoginPassword('');
      setIsSubmitting(false);
      setIsRegSuccess(true);
    }, 700);
  };

  const socialNotice = (provider: string) => {
    showNotice('error', `${provider} sign-in is not connected yet.`);
  };

  const inputBase =
    'w-full rounded-xl border bg-white px-10 py-2.5 text-sm text-slate-905 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs';
  const inputNormal = 'border-slate-200 hover:border-slate-300';
  const inputError = 'border-rose-350 focus:border-rose-500 focus:ring-rose-100/50';

  return (
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef7f0_100%)] px-4 py-16 text-slate-950 sm:px-6 lg:px-8 font-sans"
      id="auth-screen-container"
    >
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98106_1px,transparent_1px),linear-gradient(to_bottom,#10b98106_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Floating blurred corner blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[480px]">
        {/* Back Link above card */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute -top-12 left-0 flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 px-2 py-1 rounded cursor-pointer"
          aria-label="Return to welcome screen"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Welcome Page
        </button>

        {/* Auth Centered Card */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-[0_16px_48px_rgba(15,23,42,0.05)] relative z-10"
          id="auth-main-card"
          aria-label="OOP Pedagogical Hub authentication"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm mb-3">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">OOP Pedagogical Hub</h1>
            <p className="text-[10px] font-bold text-emerald-700/85 tracking-widest uppercase mt-0.5">Programming LMS Workspace</p>
          </div>

          {/* Mode Switcher */}
          <div className="mb-6 flex rounded-full bg-slate-100 p-1 border border-slate-200/50" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              onClick={() => {
                setIsLogin(true);
                setNotification(null);
              }}
              className={`min-h-9 flex-1 rounded-full px-4 text-xs font-bold transition-all focus:outline-none ${
                isLogin ? 'bg-white text-slate-900 shadow-xs border border-slate-200/20' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              onClick={() => {
                setIsLogin(false);
                setNotification(null);
              }}
              className={`min-h-9 flex-1 rounded-full px-4 text-xs font-bold transition-all focus:outline-none ${
                !isLogin ? 'bg-white text-slate-900 shadow-xs border border-slate-200/20' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Notification Banner */}
          <AnimatePresence mode="wait">
            {notification && (
              <motion.div
                key={notification.message}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs font-semibold ${
                  notification.type === 'success'
                    ? 'border-emerald-100 bg-emerald-50/50 text-emerald-800'
                    : 'border-rose-100 bg-rose-50/50 text-rose-700'
                }`}
                role="status"
                aria-live="polite"
              >
                {notification.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms switcher */}
          <AnimatePresence mode="wait">
            {isRegSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="space-y-6 text-center py-6"
              >
                <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 animate-bounce" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900">Account Created!</h2>
                  <p className="text-xs text-slate-550 max-w-xs mx-auto leading-relaxed">
                    Welcome to the OOP Pedagogical Hub. Your role-based workspace has been initialized.
                  </p>
                </div>
                <div className="py-3 px-5 bg-slate-50 rounded-xl border border-slate-100 inline-block">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Redirecting in</span>
                  <span className="text-xl font-black text-emerald-600 mt-0.5 block font-mono">{countdown}s</span>
                </div>
                <div className="pt-1">
                  <button 
                    type="button" 
                    onClick={() => { setIsRegSuccess(false); setIsLogin(true); }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer focus:outline-none"
                  >
                    Click to sign in immediately
                  </button>
                </div>
              </motion.div>
            ) : isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
                id="login-form-element"
                noValidate
              >
                <div className="space-y-1 text-left">
                  <label htmlFor="login-email" className="text-xs font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                       id="login-email"
                       type="email"
                       autoComplete="email"
                       value={loginEmail}
                       onBlur={() => setLoginTouched(prev => ({ ...prev, email: true }))}
                       onChange={e => setLoginEmail(e.target.value)}
                       placeholder="you@school.edu"
                       className={`${inputBase} ${loginEmailError ? inputError : inputNormal}`}
                       aria-label="Email address"
                       aria-invalid={Boolean(loginEmailError)}
                       aria-describedby={loginEmailError ? 'login-email-error' : undefined}
                    />
                  </div>
                  {loginEmailError && (
                    <p id="login-email-error" className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {loginEmailError}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-left">
                  <label htmlFor="login-password" className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                       id="login-password"
                       type={showPassword ? 'text' : 'password'}
                       autoComplete="current-password"
                       value={loginPassword}
                       onBlur={() => setLoginTouched(prev => ({ ...prev, password: true }))}
                       onChange={e => setLoginPassword(e.target.value)}
                       placeholder="Enter your password"
                       className={`${inputBase} pr-12 ${loginPasswordError ? inputError : inputNormal}`}
                       aria-label="Password"
                       aria-invalid={Boolean(loginPasswordError)}
                       aria-describedby={loginPasswordError ? 'login-password-error' : undefined}
                    />
                    <button
                       type="button"
                       onClick={() => setShowPassword(prev => !prev)}
                       className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none"
                       aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginPasswordError && (
                    <p id="login-password-error" className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {loginPasswordError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-xs pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-600 font-semibold select-none">
                    <input
                       type="checkbox"
                       checked={rememberMe}
                       onChange={e => setRememberMe(e.target.checked)}
                       className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                       aria-label="Remember me"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => showNotice('error', 'Password recovery is not connected yet.')}
                    className="font-bold text-emerald-600 hover:text-emerald-700 transition focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!canLogin}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all hover:shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-sm font-extrabold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 mt-3"
                  aria-label="Sign in"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-slate-150" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OR</span>
                  <div className="h-px flex-1 bg-slate-150" />
                </div>

                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => socialNotice('Google')}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-350 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    aria-label="Continue with Google"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-slate-900 text-[9px] font-black text-white">G</span>
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => socialNotice('Microsoft')}
                    className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-350 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                    aria-label="Continue with Microsoft"
                  >
                    <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-650" />
                    Continue with Microsoft
                  </button>
                </div>

                <p className="text-center text-xs text-slate-500 pt-1">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setNotification(null);
                    }}
                    className="font-bold text-emerald-600 hover:text-emerald-700 transition focus:outline-none"
                  >
                    Create one
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
                id="register-form-element"
                noValidate
              >
                {/* Role Switcher Toggle */}
                <div className="sticky top-0 z-20 bg-white pb-2.5">
                  <div className="relative flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
                    <div 
                      className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-xs border border-slate-200/10 transition-all duration-300 ease-out ${
                        regRole === 'teacher' ? 'translate-x-full' : 'translate-x-0'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRegRole('student');
                        setNotification(null);
                      }}
                      className={`relative z-10 flex-1 py-2 text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
                        regRole === 'student' ? 'text-emerald-750 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>👨‍🎓</span>
                      <span>Student Registration</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegRole('teacher');
                        setNotification(null);
                      }}
                      className={`relative z-10 flex-1 py-2 text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
                        regRole === 'teacher' ? 'text-emerald-750 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>👩‍🏫</span>
                      <span>Teacher Registration</span>
                    </button>
                  </div>
                </div>

                {/* Form fields with slide animation on switch */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={regRole}
                    initial={{ opacity: 0, x: regRole === 'student' ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: regRole === 'student' ? 12 : -12 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    {/* Common Fields */}
                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-username" className="text-xs font-bold text-slate-700">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-username"
                          type="text"
                          value={regUsername}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, username: true }))}
                          onChange={e => setRegUsername(e.target.value)}
                          placeholder="Enter username"
                          className={`${inputBase} ${registerUsernameError ? inputError : inputNormal}`}
                          aria-label="Username"
                        />
                      </div>
                      {registerUsernameError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {registerUsernameError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-email" className="text-xs font-bold text-slate-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-email"
                          type="email"
                          value={regEmail}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, email: true }))}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="Enter email address"
                          className={`${inputBase} ${registerEmailError ? inputError : inputNormal}`}
                          aria-label="Email address"
                        />
                      </div>
                      {registerEmailError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {registerEmailError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-password" className="text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          value={regPassword}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, password: true }))}
                          onChange={e => setRegPassword(e.target.value)}
                          placeholder="Create password"
                          className={`${inputBase} pr-12 ${registerPasswordError ? inputError : inputNormal}`}
                          aria-label="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(prev => !prev)}
                          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {registerPasswordError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {registerPasswordError}
                        </p>
                      )}
                    </div>

                    {/* Student Specific Fields */}
                    {regRole === 'student' && (
                      <>
                        <div className="space-y-1 text-left">
                          <label htmlFor="reg-section" className="text-xs font-bold text-slate-700">
                            Section
                          </label>
                          <input
                            id="reg-section"
                            type="text"
                            value={regSection}
                            onBlur={() => setRegisterTouched(prev => ({ ...prev, section: true }))}
                            onChange={e => setRegSection(e.target.value)}
                            placeholder="Enter your section (e.g. A, B, C)"
                            className={`${inputBase} pl-4 pr-4 ${registerSectionError ? inputError : inputNormal}`}
                            aria-label="Section"
                          />
                          {registerSectionError && (
                            <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {registerSectionError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 text-left">
                          <label htmlFor="reg-student-no" className="text-xs font-bold text-slate-700">
                            Student Number
                          </label>
                          <input
                            id="reg-student-no"
                            type="text"
                            value={regStudentNumber}
                            onBlur={() => setRegisterTouched(prev => ({ ...prev, studentNumber: true }))}
                            onChange={e => setRegStudentNumber(e.target.value)}
                            placeholder="Enter student number"
                            className={`${inputBase} pl-4 pr-4 ${registerStudentNumberError ? inputError : inputNormal}`}
                            aria-label="Student Number"
                          />
                          {registerStudentNumberError && (
                            <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {registerStudentNumberError}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 text-left">
                          <label htmlFor="reg-year" className="text-xs font-bold text-slate-700">
                            Year Level
                          </label>
                          <select
                            id="reg-year"
                            value={regYearLevel}
                            onChange={e => setRegYearLevel(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs"
                          >
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                          </select>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">
                            Course
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                              regCourse === 'CS'
                                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 ring-2 ring-emerald-500/10'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                            }`}>
                              <input
                                type="radio"
                                name="course"
                                value="CS"
                                checked={regCourse === 'CS'}
                                onChange={() => setRegCourse('CS')}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                              />
                              <span className="text-xs font-semibold">CS (Computer Science)</span>
                            </label>
                            <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                              regCourse === 'IT'
                                ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 ring-2 ring-emerald-500/10'
                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                            }`}>
                              <input
                                type="radio"
                                name="course"
                                value="IT"
                                checked={regCourse === 'IT'}
                                onChange={() => setRegCourse('IT')}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                              />
                              <span className="text-xs font-semibold">IT (Information Technology)</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Teacher Specific Fields */}
                    {regRole === 'teacher' && (
                      <div className="space-y-1 text-left">
                        <label htmlFor="reg-teacher-id" className="text-xs font-bold text-slate-700">
                          Teacher ID
                        </label>
                        <input
                          id="reg-teacher-id"
                          type="text"
                          value={regTeacherId}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, teacherId: true }))}
                          onChange={e => setRegTeacherId(e.target.value)}
                          placeholder="Enter teacher ID"
                          className={`${inputBase} pl-4 pr-4 ${registerTeacherIdError ? inputError : inputNormal}`}
                          aria-label="Teacher ID"
                        />
                        {registerTeacherIdError && (
                          <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {registerTeacherIdError}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Submit Action button with lift + glow */}
                <button
                  type="submit"
                  disabled={!canRegister}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all hover:shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-sm font-extrabold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 mt-5 cursor-pointer"
                  aria-label="Create account"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-500 pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setNotification(null);
                    }}
                    className="font-bold text-emerald-600 hover:text-emerald-700 transition focus:outline-none cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </main>
  );
}
