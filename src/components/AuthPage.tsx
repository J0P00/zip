import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  GraduationCap,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AccountSource, AuthenticatedUser, Persona, UserTermsAgreement } from '../types';
import {
  getPublishedPolicy,
  recordTermsAcceptance,
  requiresTermsAcceptance
} from '../data/termsStore';
import { authApi, getAuthToken, isDemoEmail, progressApi, setAuthToken } from '../services/api';
import {
  DEMO_AUTHENTICATED_USERS,
  DEMO_PASSWORD,
  DEMO_STUDENT_ALT_EMAIL,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_ALT_EMAIL,
  DEMO_TEACHER_EMAIL,
  DEMO_ADMIN_EMAIL,
  seedDemoStudentProgress
} from '../data/demoSeed';
import TermsAgreementModal from './TermsAgreementModal';

interface AuthPageProps {
  initialMode: 'login' | 'register';
  onAuthSuccess: (user: AuthenticatedUser) => void;
  onCancel: () => void;
}

type Notice = { type: 'success' | 'error'; message: string } | null;

type StoredUser = {
  id?: string;
  token?: string;
  name: string;
  email: string;
  password: string;
  role: Persona;
  accountSource?: AccountSource;
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

  // Terms and Agreement consent
  termsAgreementAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
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
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  },
  {
    name: 'Dmitry Vance (Alex Mercer)',
    email: 'student@oophub.edu',
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
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
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
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  },
  {
    name: 'Dr. Elena Vance',
    email: 'teacher@oophub.edu',
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
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
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
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  },
  {
    name: 'Jerico Vance (Admin)',
    email: 'admin@oophub.edu',
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
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
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

const findExistingUserByEmail = (email: string): StoredUser | undefined => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return undefined;

  return [...demoAccounts, ...readStoredUsers()].find(
    account => account.email.trim().toLowerCase() === normalizedEmail
  );
};

const updateStoredUserTermsMetadata = (user: StoredUser, acceptance: UserTermsAgreement) => {
  try {
    const usersList = readStoredUsers();
    const nextUsers = usersList.map(stored => {
      const sameUser =
        (stored.userId && user.userId && stored.userId === user.userId) ||
        stored.email.toLowerCase() === user.email.toLowerCase();

      return sameUser
        ? {
            ...stored,
            termsAgreementAccepted: acceptance.accepted,
            termsAcceptedAt: acceptance.accepted_at,
            termsVersion: acceptance.version
          }
        : stored;
    });

    localStorage.setItem('oophub_users', JSON.stringify(nextUsers));
  } catch {
    // Consent audit still lives in the agreement table if profile metadata cannot be mirrored.
  }
};

export default function AuthPage({ initialMode, onAuthSuccess, onCancel }: AuthPageProps) {
  const rememberedEmail = localStorage.getItem('oophub_remembered_email') || '';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [notification, setNotification] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [publishedPolicy, setPublishedPolicy] = useState(() => getPublishedPolicy());
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsModalMode, setTermsModalMode] = useState<'registration' | 'reauth' | 'view'>('registration');
  const [termsInitialTab, setTermsInitialTab] = useState<'terms' | 'privacy'>('terms');
  const [pendingLogin, setPendingLogin] = useState<{ user: StoredUser; accountSource: AccountSource } | null>(null);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState(rememberedEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });

  // Registration Form States (Shared & Dedicated)
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');

  // Student specific fields
  const [regSection, setRegSection] = useState('');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regYearLevel, setRegYearLevel] = useState('2nd Year');
  const [regCourse, setRegCourse] = useState('CS'); // CS or IT

  // Teacher specific fields
  const [regTeacherId, setRegTeacherId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Touched state for validation trigger
  const [registerTouched, setRegisterTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    section: false,
    studentNumber: false,
    teacherId: false,
    terms: false
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
  const isRegConfirmPasswordValid = regConfirmPassword.length > 0 && regConfirmPassword === regPassword;
  const isRegSectionValid = regRole === 'student' ? regSection.trim().length > 0 : true;
  const isRegStudentNumberValid = regRole === 'student' ? regStudentNumber.trim().length > 0 : true;
  const isRegTeacherIdValid = regRole === 'teacher' ? regTeacherId.trim().length > 0 : true;

  const registerUsernameError =
    registerTouched.username && !isRegUsernameValid
      ? 'Username must be at least 3 characters.'
      : '';
  const registerEmailError =
    registerTouched.email && (!regEmail.trim() || !isRegEmailValid)
      ? 'Valid email address is required.'
      : '';
  const registerPasswordError =
    registerTouched.password && !isRegPasswordValid
      ? 'Password must be at least 6 characters.'
      : '';
  const registerConfirmPasswordError =
    registerTouched.confirmPassword && !isRegConfirmPasswordValid
      ? 'Passwords do not match.'
      : '';
  const registerSectionError =
    regRole === 'student' && registerTouched.section && !isRegSectionValid
      ? 'Section is required.'
      : '';
  const registerStudentNumberError =
    regRole === 'student' && registerTouched.studentNumber && !isRegStudentNumberValid
      ? 'Student number is required.'
      : '';
  const registerTeacherIdError =
    regRole === 'teacher' && registerTouched.teacherId && !isRegTeacherIdValid
      ? 'Teacher ID is required.'
      : '';
  const registerTermsError =
    registerTouched.terms && !termsAccepted
      ? 'You must review and agree to the Terms & Agreement to register.'
      : '';

  const canRegisterDetails =
    isRegUsernameValid &&
    isRegEmailValid &&
    isRegPasswordValid &&
    isRegConfirmPasswordValid &&
    isRegSectionValid &&
    isRegStudentNumberValid &&
    isRegTeacherIdValid;

  const canRegister = canRegisterDetails && termsAccepted && !isSubmitting;

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const openTermsModal = (tab: 'terms' | 'privacy' = 'terms', mode: 'registration' | 'reauth' | 'view' = 'registration') => {
    setPublishedPolicy(getPublishedPolicy());
    setTermsInitialTab(tab);
    setTermsModalMode(mode);
    setIsTermsModalOpen(true);
  };

  const startAuthenticatedSession = async (user: StoredUser, accountSource: AccountSource) => {
    const token = user.token || getAuthToken() || `local-${user.role}-${Date.now()}`;
    setAuthToken(token);

    if (rememberMe) {
      localStorage.setItem('oophub_remembered_email', user.email);
    } else {
      localStorage.removeItem('oophub_remembered_email');
    }

    if (accountSource === 'demo') {
      seedDemoStudentProgress();
    }

    showNotice('success', `Welcome back, ${user.name}! Redirecting to workspace...`);

    setTimeout(() => {
      onAuthSuccess({
        id: user.id || user.userId || `usr-${Date.now()}`,
        name: user.name,
        email: user.email,
        role: user.role,
        accountSource,
        token,
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
        avatar: user.avatar ?? '',
        termsAgreementAccepted: user.termsAgreementAccepted ?? true,
        termsAcceptedAt: user.termsAcceptedAt ?? '',
        termsVersion: user.termsVersion ?? ''
      });
    }, 500);
  };

  const completeLogin = async (user: StoredUser, accountSource: AccountSource) => {
    const activePolicy = getPublishedPolicy();
    const userId = user.userId ?? buildUserId(user.email, user.role);
    const mustAcceptTerms =
      (user.role === 'student' || user.role === 'teacher') &&
      !user.termsAgreementAccepted &&
      requiresTermsAcceptance(userId, activePolicy);

    setPublishedPolicy(activePolicy);

    if (mustAcceptTerms) {
      setPendingLogin({ user, accountSource });
      setTermsModalMode('reauth');
      setTermsInitialTab('terms');
      setIsTermsModalOpen(true);
      setIsSubmitting(false);
      showNotice('error', `Please review and accept Terms version ${activePolicy.version} before continuing.`);
      return;
    }

    await startAuthenticatedSession(user, accountSource);
  };

  const handleTermsModalClose = () => {
    setIsTermsModalOpen(false);

    if (pendingLogin) {
      setPendingLogin(null);
      showNotice('error', 'You must accept the Terms and Agreement before signing in.');
    }
  };

  const handleTermsModalAccept = async () => {
    if (pendingLogin) {
      const activePolicy = getPublishedPolicy();
      const userId = pendingLogin.user.userId ?? buildUserId(pendingLogin.user.email, pendingLogin.user.role);

      try {
        const acceptance = recordTermsAcceptance({
          userId,
          role: pendingLogin.user.role,
          version: activePolicy.version
        });
        const updatedUser: StoredUser = {
          ...pendingLogin.user,
          userId,
          termsAgreementAccepted: acceptance.accepted,
          termsAcceptedAt: acceptance.accepted_at,
          termsVersion: acceptance.version
        };

        updateStoredUserTermsMetadata(updatedUser, acceptance);
        setPendingLogin(null);
        setIsTermsModalOpen(false);
        await startAuthenticatedSession(updatedUser, pendingLogin.accountSource);
      } catch {
        showNotice('error', 'Unable to record terms acceptance. Please try again.');
      }
      return;
    }

    setTermsAccepted(true);
    setRegisterTouched(prev => ({ ...prev, terms: true }));
    setIsTermsModalOpen(false);
    showNotice('success', `Terms version ${publishedPolicy.version} accepted for registration.`);
  };

  const handleQuickDemoLogin = async (role: 'student' | 'teacher' | 'admin') => {
    seedDemoStudentProgress();
    const demoUser = DEMO_AUTHENTICATED_USERS[role];
    if (!demoUser) return;
    
    setLoginEmail(demoUser.email);
    setLoginPassword(DEMO_PASSWORD);
    setIsSubmitting(true);

    try {
      const response = await authApi.login(demoUser.email, DEMO_PASSWORD);
      await completeLogin(
        {
          ...response.user,
          role: response.user.role as Persona,
          token: response.token,
          password: ''
        },
        'demo'
      );
    } catch {
      // Offline fallback login for instant local access
      await completeLogin(
        {
          ...demoUser,
          password: DEMO_PASSWORD,
          token: `demo-${role}-token-${Date.now()}`
        },
        'demo'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginTouched({ email: true, password: true });

    if (!canLogin) {
      showNotice('error', 'Check your email and password before signing in.');
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = loginEmail.trim().toLowerCase();

    try {
      const response = await authApi.login(normalizedEmail, loginPassword);
      const accountSource: AccountSource = isDemoEmail(response.user.email, response.user.role) ? 'demo' : 'custom';
      if (accountSource === 'demo') {
        seedDemoStudentProgress();
      }
      await completeLogin(
        {
          ...response.user,
          role: response.user.role as Persona,
          token: response.token,
          password: ''
        },
        accountSource
      );
    } catch (error) {
      // Check local demo accounts & stored users fallback
      const allAccounts = [...demoAccounts, ...readStoredUsers()];
      const matched = allAccounts.find(
        acc => acc.email.toLowerCase() === normalizedEmail && acc.password === loginPassword
      );

      if (matched) {
        const accountSource: AccountSource = isDemoEmail(matched.email, matched.role) ? 'demo' : 'custom';
        if (accountSource === 'demo') {
          seedDemoStudentProgress();
        }
        await completeLogin(
          {
            ...matched,
            accountSource,
            token: `local-token-${Date.now()}`
          },
          accountSource
        );
        return;
      }

      setIsSubmitting(false);
      showNotice('error', error instanceof Error ? error.message : 'Invalid email or password. Please verify credentials or create an account.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      studentNumber: true,
      section: true,
      teacherId: true,
      terms: true
    });

    if (!termsAccepted) {
      showNotice('error', 'You must accept the Terms and Agreement before creating an account.');
      return;
    }

    if (!canRegisterDetails) {
      showNotice('error', 'Complete the required account details.');
      return;
    }

    const normalizedEmail = regEmail.trim().toLowerCase();
    if (findExistingUserByEmail(normalizedEmail)) {
      setIsSubmitting(false);
      showNotice('error', 'An account with this email already exists. Please sign in or use a different email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const displayCourse = regCourse === 'CS' ? 'CS (Computer Science)' : 'IT (Information Technology)';
      const computedSection = regRole === 'student' ? regSection.trim().toUpperCase() : undefined;
      const activePolicy = getPublishedPolicy();

      const response = await authApi.register({
        name: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        studentNumber: regRole === 'student' ? regStudentNumber.trim() : undefined,
        course: regRole === 'student' ? displayCourse : undefined,
        yearLevel: regRole === 'student' ? regYearLevel : undefined,
        section: computedSection,
        programStatus: regRole === 'student' ? 'Regular' : undefined,
        employeeId: regRole === 'teacher' ? regTeacherId.trim() : undefined,
        department: regRole === 'teacher' ? 'College of Computer Studies' : undefined,
        specialization: regRole === 'teacher' ? 'Object-Oriented Programming' : undefined,
        assignedCourses: regRole === 'teacher' ? 'OOP 101, Advanced Java' : undefined,
        termsVersion: activePolicy.version
      });

      setPublishedPolicy(activePolicy);
      setAuthToken(response.token);
      setLoginEmail(response.user.email);
      setLoginPassword('');
      setTermsAccepted(false);
      setIsSubmitting(false);
      setIsRegSuccess(true);
    } catch (error) {
      // Local registration fallback if backend is offline
      try {
        const activePolicy = getPublishedPolicy();
        const displayCourse = regCourse === 'CS' ? 'CS (Computer Science)' : 'IT (Information Technology)';
        const computedSection = regRole === 'student' ? regSection.trim().toUpperCase() : undefined;
        const normalizedEmail = regEmail.trim().toLowerCase();

        if (findExistingUserByEmail(normalizedEmail)) {
          setIsSubmitting(false);
          showNotice('error', 'An account with this email already exists. Please sign in or use a different email.');
          return;
        }

        const newLocalUser: StoredUser = {
          name: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: regRole,
          userId: buildUserId(regEmail.trim(), regRole),
          registrationDate: new Date().toISOString(),
          accountStatus: 'Active',
          studentNumber: regRole === 'student' ? regStudentNumber.trim() : undefined,
          course: regRole === 'student' ? displayCourse : undefined,
          yearLevel: regRole === 'student' ? regYearLevel : undefined,
          section: computedSection,
          programStatus: regRole === 'student' ? 'Regular' : undefined,
          employeeId: regRole === 'teacher' ? regTeacherId.trim() : undefined,
          department: regRole === 'teacher' ? 'College of Computer Studies' : undefined,
          specialization: regRole === 'teacher' ? 'Object-Oriented Programming' : undefined,
          assignedCourses: regRole === 'teacher' ? 'OOP 101, Advanced Java' : undefined,
          termsAgreementAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: activePolicy.version,
          onlineStatus: 'online'
        };

        const existingUsers = readStoredUsers();
        existingUsers.push(newLocalUser);
        localStorage.setItem('oophub_users', JSON.stringify(existingUsers));

        setLoginEmail(newLocalUser.email);
        setLoginPassword('');
        setTermsAccepted(false);
        setIsSubmitting(false);
        setIsRegSuccess(true);
        return;
      } catch {}

      setIsSubmitting(false);
      showNotice('error', error instanceof Error ? error.message : 'Unable to create account. Please try again.');
    }
  };

  const inputBase =
    'w-full rounded-xl border bg-white px-10 py-2.5 text-sm text-slate-905 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs';
  const inputNormal = 'border-slate-200 hover:border-slate-300';
  const inputError = 'border-rose-350 focus:border-rose-500 focus:ring-rose-100/50';

  return (
    <>
    <main
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_48%,#eef7f0_100%)] px-4 py-16 text-slate-950 sm:px-6 lg:px-8 font-sans"
      id="auth-screen-container"
    >
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98106_1px,transparent_1px),linear-gradient(to_bottom,#10b98106_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Floating blurred corner blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[540px]">
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
              className={`min-h-9 flex-1 rounded-full px-4 text-xs font-bold transition-all focus:outline-none cursor-pointer ${
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
              className={`min-h-9 flex-1 rounded-full px-4 text-xs font-bold transition-all focus:outline-none cursor-pointer ${
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
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <form
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
                        placeholder="Email"
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
                        placeholder="Password"
                        className={`${inputBase} pr-12 ${loginPasswordError ? inputError : inputNormal}`}
                        aria-label="Password"
                        aria-invalid={Boolean(loginPasswordError)}
                        aria-describedby={loginPasswordError ? 'login-password-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
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
                  </div>

                  <button
                    type="submit"
                    disabled={!canLogin}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all hover:shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-sm font-extrabold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 mt-3 cursor-pointer"
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

                  <p className="text-center text-xs text-slate-500 pt-1">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setNotification(null);
                      }}
                      className="font-bold text-emerald-600 hover:text-emerald-700 transition focus:outline-none cursor-pointer"
                    >
                      Create one
                    </button>
                  </p>
                </form>
              </motion.div>
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
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-username" className="text-xs font-bold text-slate-700">
                        Full Name / Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-username"
                          type="text"
                          value={regUsername}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, username: true }))}
                          onChange={e => setRegUsername(e.target.value)}
                          placeholder="Enter your full name"
                          className={`${inputBase} ${registerUsernameError ? inputError : inputNormal}`}
                          aria-label="Full name"
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
                          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
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

                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-confirm-password" className="text-xs font-bold text-slate-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, confirmPassword: true }))}
                          onChange={e => setRegConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className={`${inputBase} pr-12 ${registerConfirmPasswordError ? inputError : inputNormal}`}
                          aria-label="Confirm Password"
                        />
                      </div>
                      {registerConfirmPasswordError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {registerConfirmPasswordError}
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
                            placeholder="Enter your section (e.g. CS-3A, IT-2B)"
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

                <section
                  className={`rounded-xl border p-4 text-left shadow-sm transition ${
                    registerTermsError
                      ? 'border-rose-200 bg-rose-50/40'
                      : termsAccepted
                        ? 'border-[#dfe8c5] bg-[#f6f8ee]'
                        : 'border-slate-200 bg-white'
                  }`}
                  aria-label="Terms and Agreement"
                >
                  <div className="flex items-start gap-3">
                    <input
                      id="reg-terms-agreement"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={event => {
                        setRegisterTouched(prev => ({ ...prev, terms: true }));
                        if (event.target.checked) {
                          openTermsModal('terms', 'registration');
                          return;
                        }
                        setTermsAccepted(false);
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#6b7f2a] focus:ring-[#6b7f2a]"
                      aria-describedby={registerTermsError ? 'reg-terms-error' : 'reg-terms-version'}
                    />
                    <div className="min-w-0 flex-1">
                      <p id="reg-terms-label" className="text-xs font-bold leading-5 text-slate-700">
                        I have read, understood, and agree to the{' '}
                        <button
                          type="button"
                          onClick={() => openTermsModal('terms', 'registration')}
                          className="font-extrabold text-[#5f6f24] underline decoration-[#6b7f2a]/30 underline-offset-2 hover:text-[#435018] focus:outline-none cursor-pointer"
                        >
                          Terms and Conditions
                        </button>{' '}
                        and{' '}
                        <button
                          type="button"
                          onClick={() => openTermsModal('privacy', 'registration')}
                          className="font-extrabold text-[#5f6f24] underline decoration-[#6b7f2a]/30 underline-offset-2 hover:text-[#435018] focus:outline-none cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                        .
                      </p>
                      <p id="reg-terms-version" className="mt-1 text-[11px] font-semibold text-slate-500">
                        Active policy version: {publishedPolicy.version}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openTermsModal('terms', 'registration')}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#dfe8c5] bg-white px-3 text-[11px] font-extrabold text-[#5f6f24] transition hover:bg-[#f6f8ee] focus:outline-none focus:ring-4 focus:ring-[#dfe8c5] cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Terms
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {registerTermsError && (
                    <p id="reg-terms-error" className="mt-3 flex items-center gap-1 text-xs font-semibold text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {registerTermsError}
                    </p>
                  )}
                  {termsAccepted && (
                    <p className="mt-3 flex items-center gap-1 text-xs font-extrabold text-[#5f6f24]">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      Agreement accepted for this registration.
                    </p>
                  )}
                </section>

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
    <TermsAgreementModal
      isOpen={isTermsModalOpen}
      policy={publishedPolicy}
      mode={termsModalMode}
      initialTab={termsInitialTab}
      onClose={handleTermsModalClose}
      onAccept={termsModalMode === 'view' ? undefined : handleTermsModalAccept}
    />
    </>
  );
}
