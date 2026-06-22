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
  User
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

const roleOptions: Array<{ value: Persona; label: string; helper: string }> = [
  { value: 'student', label: 'Student', helper: 'Learning workspace' },
  { value: 'teacher', label: 'Teacher', helper: 'Instructor tools' }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value: string) => emailPattern.test(value.trim());

const deriveNameFromEmail = (email: string): string => {
  const prefix = email.split('@')[0];
  if (!prefix) return 'User';
  return prefix
    .split(/[\._\-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatStudentId = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

const formatTeacherId = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) {
    return '';
  }
  return `TEA-${digits}`;
};

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

  const [loginEmail, setLoginEmail] = useState(rememberedEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<Persona>('student');
  const [registerTouched, setRegisterTouched] = useState({
    email: false,
    password: false,
    studentNumber: false,
    employeeId: false
  });

  // Dynamic role-specific fields
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regCourse, setRegCourse] = useState('BS Computer Science');
  const [regYearLevel, setRegYearLevel] = useState('1st Year');
  const [regSection, setRegSection] = useState('A');

  const [regEmployeeId, setRegEmployeeId] = useState('');

  // Success screen redirection
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

  const loginEmailError =
    loginTouched.email && loginEmail.trim() && !isValidEmail(loginEmail)
      ? 'Enter a valid email address.'
      : '';
  const loginPasswordError =
    loginTouched.password && !loginPassword.trim()
      ? 'Password is required.'
      : '';
  const canLogin = isValidEmail(loginEmail) && loginPassword.trim().length > 0 && !isSubmitting;

  const isEmailValid = isValidEmail(regEmail);
  const isPasswordValid = regPassword.length >= 6;
  const isStudentIdValid = /^\d{4}-\d{4}$/.test(regStudentNumber);
  const isTeacherIdValid = /^TEA-\d{4}$/.test(regEmployeeId);

  const registerEmailError =
    registerTouched.email && !isEmailValid
      ? 'Enter a valid email address.'
      : '';
  const registerPasswordError =
    registerTouched.password && !isPasswordValid
      ? 'Use at least 6 characters.'
      : '';
  const registerStudentIdError =
    registerTouched.studentNumber && !isStudentIdValid
      ? 'Student ID must follow YYYY-XXXX format (e.g. 2026-0001).'
      : '';
  const registerTeacherIdError =
    registerTouched.employeeId && !isTeacherIdValid
      ? 'Teacher ID must follow TEA-XXXX format (e.g. TEA-0001).'
      : '';

  const canRegister =
    isEmailValid &&
    isPasswordValid &&
    !isSubmitting &&
    (regRole === 'student' ? isStudentIdValid : regRole === 'teacher' ? isTeacherIdValid : false);

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
      email: true,
      password: true,
      studentNumber: true,
      employeeId: true
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

      const calculatedName = deriveNameFromEmail(regEmail);
      const courseAbbr = regCourse === 'BS Computer Science' ? 'CS' : 'IT';
      const yearNum = regYearLevel.charAt(0);
      const computedSection = regRole === 'student'
        ? `${courseAbbr}-${yearNum}${regSection}`
        : undefined;

      const newUser: StoredUser = {
        name: calculatedName,
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
        course: regRole === 'student' ? regCourse : undefined,
        yearLevel: regRole === 'student' ? regYearLevel : undefined,
        section: computedSection,
        programStatus: regRole === 'student' ? 'Regular' : undefined,

        // Teacher-specific fields
        employeeId: regRole === 'teacher' ? regEmployeeId.trim() : undefined,
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
      setIsRegSuccess(true); // show checkmark screen
    }, 700);
  };

  const handleRegistrationEmailChange = (value: string) => {
    setRegEmail(value);
    if (regRole === 'admin' && value.trim().toLowerCase() !== 'jericokunn@gmail.com') {
      setRegRole('student');
    }
  };

  const socialNotice = (provider: string) => {
    showNotice('error', `${provider} sign-in is not connected yet.`);
  };

  const inputBase =
    'w-full rounded-xl border bg-white px-10 py-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-[#4CAF50] focus:ring-4 focus:ring-[#4CAF50]/15 shadow-xs';
  const inputNormal = 'border-slate-200 hover:border-slate-300';
  const inputError = 'border-rose-300 focus:border-rose-500 focus:ring-rose-100/50';

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef7f0_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8"
      id="auth-screen-container"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#11182708_1px,transparent_1px),linear-gradient(to_bottom,#11182708_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute left-1/2 top-0 h-full w-full max-w-6xl -translate-x-1/2 opacity-70">
        <div className="absolute right-4 top-10 hidden h-64 w-80 rounded-lg border border-emerald-100 bg-white/55 p-5 shadow-sm backdrop-blur-sm lg:block">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Code2 className="h-4 w-4 text-[#4CAF50]" />
            <span>oop-module.ts</span>
          </div>
          <div className="space-y-2 font-mono text-xs text-slate-500">
            <div><span className="text-[#4CAF50]">class</span> Learner extends Person {'{'}</div>
            <div className="pl-4">constructor(course) {'{'}</div>
            <div className="pl-8">super();</div>
            <div className="pl-8">this.path = course;</div>
            <div className="pl-4">{'}'}</div>
            <div>{'}'}</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] lg:grid-cols-[1fr_0.86fr]"
          id="auth-main-card"
          aria-label="OOP Pedagogical Hub authentication"
        >
          <section className="flex flex-col justify-between bg-slate-950 p-6 text-white sm:p-8 lg:p-10">
            <div className="space-y-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#4CAF50] text-lg font-black text-white shadow-lg shadow-emerald-950/20">
                  O
                </div>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight">OOP Pedagogical Hub</h1>
                  <p className="text-xs font-medium text-slate-400">Programming LMS Workspace</p>
                </div>
              </div>

              <div className="max-w-sm space-y-4">
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  Secure academic access
                </div>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  Welcome Back
                </h2>
                <p className="text-sm leading-6 text-slate-300">
                  Sign in to continue your learning journey.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-10 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-4 focus:ring-white/10"
              aria-label="Return to welcome screen"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Welcome Screen
            </button>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto flex max-w-md flex-col">
              <div className="mb-8 flex rounded-md bg-slate-100 p-1" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isLogin}
                  onClick={() => {
                    setIsLogin(true);
                    setNotification(null);
                  }}
                  className={`min-h-11 flex-1 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15 ${
                    isLogin ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
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
                  className={`min-h-11 flex-1 rounded-md px-4 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15 ${
                    !isLogin ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <AnimatePresence mode="wait">
                {notification && (
                  <motion.div
                    key={notification.message}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`mb-5 flex items-start gap-2 rounded-md border px-3 py-3 text-sm font-medium ${
                      notification.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {notification.type === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{notification.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isRegSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6 text-center py-10"
                  >
                    <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/45 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50 shadow-md">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">Account Created Successfully!</h2>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        Welcome to the OOP Pedagogical Hub. Your learning/teaching workspace is ready.
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/85 inline-block">
                      <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Redirecting to Sign In in</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">{countdown}s</span>
                    </div>
                    <div className="pt-2">
                      <button 
                        type="button" 
                        onClick={() => { setIsRegSuccess(false); setIsLogin(true); }}
                        className="text-xs font-bold text-[#2f8f34] hover:text-[#26772b] underline cursor-pointer focus:outline-none"
                      >
                        Click here to sign in immediately
                      </button>
                    </div>
                  </motion.div>
                ) : isLogin ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22 }}
                    onSubmit={handleLoginSubmit}
                    className="space-y-5"
                    id="login-form-element"
                    noValidate
                  >
                    <div className="space-y-2">
                      <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Sign In</h2>
                      <p className="text-sm text-slate-500">
                        Welcome Back! Sign in to continue your learning journey.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-email" className="text-sm font-semibold text-slate-800">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                        <p id="login-email-error" className="text-xs font-medium text-rose-600">
                          {loginEmailError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="login-password" className="text-sm font-semibold text-slate-800">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                           className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15"
                           aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {loginPasswordError && (
                        <p id="login-password-error" className="text-xs font-medium text-rose-600">
                          {loginPasswordError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-slate-600">
                        <input
                           type="checkbox"
                           checked={rememberMe}
                           onChange={e => setRememberMe(e.target.checked)}
                           className="h-4 w-4 rounded border-slate-300 text-[#4CAF50] focus:ring-[#4CAF50]"
                           aria-label="Remember me"
                        />
                        Remember Me
                      </label>
                      <button
                        type="button"
                        onClick={() => showNotice('error', 'Password recovery is not connected yet.')}
                        className="min-h-11 font-semibold text-[#2f8f34] transition hover:text-[#26772b] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!canLogin}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#4CAF50] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-100 transition hover:bg-[#3f9f43] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">OR</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => socialNotice('Google')}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15"
                        aria-label="Continue with Google"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-slate-950 text-[11px] font-black text-white">G</span>
                        Continue with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => socialNotice('Microsoft')}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15"
                        aria-label="Continue with Microsoft"
                      >
                        <BriefcaseBusiness className="h-4 w-4 text-slate-700" />
                        Continue with Microsoft
                      </button>
                    </div>

                    <p className="text-center text-sm text-slate-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(false);
                          setNotification(null);
                        }}
                        className="font-extrabold text-[#2f8f34] transition hover:text-[#26772b] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/15"
                      >
                        Create one
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22 }}
                    onSubmit={handleRegisterSubmit}
                    className="space-y-5"
                    id="register-form-element"
                    noValidate
                  >
                    <div className="space-y-1">
                      <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Create Account</h2>
                      <p className="text-sm text-slate-500">
                        Join OOP Pedagogical Hub. Set up your role-based workspace.
                      </p>
                    </div>

                    {/* Role Selection Switch */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Workspace Role
                      </label>
                      <div className="relative flex rounded-full bg-slate-100 p-1 border border-slate-200/50">
                        {/* Slide highlight element */}
                        <div 
                          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out border border-slate-200/20 ${
                            regRole === 'teacher' ? 'translate-x-full' : 'translate-x-0'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setRegRole('student')}
                          className={`relative z-10 flex-1 py-2 text-center text-xs font-extrabold tracking-wide uppercase transition-colors duration-250 rounded-full focus:outline-none ${
                            regRole === 'student' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegRole('teacher')}
                          className={`relative z-10 flex-1 py-2 text-center text-xs font-extrabold tracking-wide uppercase transition-colors duration-250 rounded-full focus:outline-none ${
                            regRole === 'teacher' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Teacher
                        </button>
                      </div>
                    </div>

                    {/* Smooth Animate container for role-specific fields */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={regRole}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >
                        {/* EMAIL field (in both, required) */}
                        <div className="space-y-1.5 text-left">
                          <label htmlFor="register-email" className="text-sm font-semibold text-slate-800">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="register-email"
                              type="email"
                              autoComplete="email"
                              value={regEmail}
                              onBlur={() => setRegisterTouched(prev => ({ ...prev, email: true }))}
                              onChange={e => setRegEmail(e.target.value)}
                              placeholder="you@school.edu"
                              className={`${inputBase} ${registerEmailError ? inputError : inputNormal}`}
                              aria-label="Registration email address"
                              aria-invalid={Boolean(registerEmailError)}
                              aria-describedby={registerEmailError ? 'register-email-error' : undefined}
                            />
                          </div>
                          {registerEmailError && (
                            <p id="register-email-error" className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              {registerEmailError}
                            </p>
                          )}
                        </div>

                        {/* PASSWORD field (in both, with show/hide toggle) */}
                        <div className="space-y-1.5 text-left">
                          <label htmlFor="register-password" className="text-sm font-semibold text-slate-800">
                            Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="register-password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              value={regPassword}
                              onBlur={() => setRegisterTouched(prev => ({ ...prev, password: true }))}
                              onChange={e => setRegPassword(e.target.value)}
                              placeholder="At least 6 characters"
                              className={`${inputBase} pr-12 ${registerPasswordError ? inputError : inputNormal}`}
                              aria-label="Registration password"
                              aria-invalid={Boolean(registerPasswordError)}
                              aria-describedby={registerPasswordError ? 'register-password-error' : undefined}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(prev => !prev)}
                              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {registerPasswordError && (
                            <p id="register-password-error" className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              {registerPasswordError}
                            </p>
                          )}
                        </div>

                        {/* STUDENT ROLE FIELDS */}
                        {regRole === 'student' && (
                          <>
                            {/* Student ID (auto-formatted YYYY-XXXX) */}
                            <div className="space-y-1.5 text-left">
                              <label htmlFor="reg-student-no" className="text-sm font-semibold text-slate-800">
                                Student ID Number
                              </label>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                  required
                                  id="reg-student-no"
                                  type="text"
                                  value={regStudentNumber}
                                  onBlur={() => setRegisterTouched(prev => ({ ...prev, studentNumber: true }))}
                                  onChange={e => setRegStudentNumber(formatStudentId(e.target.value))}
                                  placeholder="YYYY-XXXX (e.g. 2026-0001)"
                                  className={`${inputBase} ${registerStudentIdError ? inputError : inputNormal}`}
                                  aria-label="Student ID Number"
                                  aria-invalid={Boolean(registerStudentIdError)}
                                  aria-describedby={registerStudentIdError ? 'register-student-no-error' : undefined}
                                />
                              </div>
                              {registerStudentIdError && (
                                <p id="register-student-no-error" className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {registerStudentIdError}
                                </p>
                              )}
                            </div>

                            {/* Course Dropdown */}
                            <div className="space-y-1.5 text-left">
                              <label htmlFor="reg-course" className="text-sm font-semibold text-slate-800">
                                Course
                              </label>
                              <select
                                id="reg-course"
                                value={regCourse}
                                onChange={e => setRegCourse(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-[#4CAF50] focus:ring-4 focus:ring-[#4CAF50]/15 shadow-xs"
                              >
                                <option value="BS Information Technology">IT (Information Technology)</option>
                                <option value="BS Computer Science">CS (Computer Science)</option>
                              </select>
                            </div>

                            {/* Year Level (Segmented Buttons) */}
                            <div className="space-y-1.5 text-left">
                              <label className="text-sm font-semibold text-slate-800">
                                Year Level
                              </label>
                              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((level) => (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => setRegYearLevel(level)}
                                    className={`py-2 text-[10px] sm:text-xs font-extrabold rounded-lg transition-all focus:outline-none ${
                                      regYearLevel === level
                                        ? 'bg-white text-emerald-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-200/25'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {level.split(' ')[0]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Section (Segmented Buttons) */}
                            <div className="space-y-1.5 text-left">
                              <label className="text-sm font-semibold text-slate-800">
                                Section
                              </label>
                              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
                                {['A', 'B', 'C', 'D'].map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    onClick={() => setRegSection(sec)}
                                    className={`py-2 text-[10px] sm:text-xs font-extrabold rounded-lg transition-all focus:outline-none ${
                                      regSection === sec
                                        ? 'bg-white text-emerald-700 shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-slate-200/25'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {sec}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* TEACHER ROLE FIELDS */}
                        {regRole === 'teacher' && (
                          <>
                            {/* Teacher ID (auto-formatted TEA-XXXX) */}
                            <div className="space-y-1.5 text-left">
                              <label htmlFor="reg-teacher-id" className="text-sm font-semibold text-slate-800">
                                Teacher ID Number
                              </label>
                              <div className="relative">
                                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                  required
                                  id="reg-teacher-id"
                                  type="text"
                                  value={regEmployeeId}
                                  onBlur={() => setRegisterTouched(prev => ({ ...prev, employeeId: true }))}
                                  onChange={e => setRegEmployeeId(formatTeacherId(e.target.value))}
                                  placeholder="TEA-XXXX (e.g. TEA-0001)"
                                  className={`${inputBase} ${registerTeacherIdError ? inputError : inputNormal}`}
                                  aria-label="Teacher ID Number"
                                  aria-invalid={Boolean(registerTeacherIdError)}
                                  aria-describedby={registerTeacherIdError ? 'register-teacher-id-error' : undefined}
                                />
                              </div>
                              {registerTeacherIdError && (
                                <p id="register-teacher-id-error" className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {registerTeacherIdError}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Primary submit button */}
                    <button
                      type="submit"
                      disabled={!canRegister}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4CAF50] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-[#3f9f43] focus:outline-none focus:ring-4 focus:ring-[#4CAF50]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none mt-2"
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

                    {/* Secondary link */}
                    <p className="text-center text-sm text-slate-500 mt-2">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setNotification(null);
                        }}
                        className="font-extrabold text-[#2f8f34] transition hover:text-[#26772b] focus:outline-none"
                      >
                        Login
                      </button>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </section>
        </motion.section>
      </div>
    </main>
  );
}
