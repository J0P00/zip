import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AccountSource, AuthenticatedUser, Persona, UserTermsAgreement } from '../types';
import {
  getPublishedPolicy,
  recordTermsAcceptance,
  requiresTermsAcceptance
} from '../data/termsStore';
import { authApi, getAuthToken, isDemoEmail, progressApi, setAuthToken } from '../services/api';
import { seedDemoStudentProgress } from '../data/demoSeed';
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

const demoAccounts: StoredUser[] = [];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => emailPattern.test(value.trim());

export interface PasswordSecurityCheck {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export const checkPasswordSecurity = (pwd: string): PasswordSecurityCheck => ({
  minLength: pwd.length >= 8,
  hasUpper: /[A-Z]/.test(pwd),
  hasLower: /[a-z]/.test(pwd),
  hasNumber: /[0-9]/.test(pwd),
  hasSpecial: /[^A-Za-z0-9]/.test(pwd)
});

export const isStrongPassword = (pwd: string): boolean => {
  const check = checkPasswordSecurity(pwd);
  return check.minLength && check.hasUpper && check.hasLower && check.hasNumber && check.hasSpecial;
};

export const getPasswordStrengthMeter = (pwd: string) => {
  if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200', textClass: 'text-slate-400' };
  const check = checkPasswordSecurity(pwd);
  const passed = Object.values(check).filter(Boolean).length;

  if (passed <= 2) {
    return { score: 1, label: 'Weak', color: 'bg-rose-500', textClass: 'text-rose-600' };
  }
  if (passed <= 3) {
    return { score: 2, label: 'Fair', color: 'bg-amber-500', textClass: 'text-amber-600' };
  }
  if (passed === 4) {
    return { score: 3, label: 'Good', color: 'bg-blue-500', textClass: 'text-blue-600' };
  }
  return { score: 4, label: 'Strong', color: 'bg-emerald-500', textClass: 'text-emerald-600' };
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

const writeStoredUsers = (users: StoredUser[]) => {
  try {
    localStorage.setItem('oophub_users', JSON.stringify(users));
  } catch {
    // Local storage fallback
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

    writeStoredUsers(nextUsers);
  } catch {
    // Consent audit still lives in the agreement table if profile metadata cannot be mirrored.
  }
};

/** Reusable visual password strength meter and interactive checklist */
function PasswordStrengthPanel({ password }: { password: string }) {
  const check = checkPasswordSecurity(password);
  const strength = getPasswordStrengthMeter(password);

  if (!password) return null;

  return (
    <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-600">Password Strength:</span>
        <span className={`font-black uppercase tracking-wider text-[10px] ${strength.textClass}`}>
          {strength.label}
        </span>
      </div>

      {/* 4-bar indicator */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
        <div className={`h-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
        <div className={`h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
        <div className={`h-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <div className={`flex items-center gap-1.5 font-medium transition-colors ${check.minLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${check.minLength ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            ✓
          </div>
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-1.5 font-medium transition-colors ${check.hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${check.hasUpper ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            ✓
          </div>
          <span>1 uppercase letter (A-Z)</span>
        </div>
        <div className={`flex items-center gap-1.5 font-medium transition-colors ${check.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${check.hasLower ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            ✓
          </div>
          <span>1 lowercase letter (a-z)</span>
        </div>
        <div className={`flex items-center gap-1.5 font-medium transition-colors ${check.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${check.hasNumber ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            ✓
          </div>
          <span>1 numeric digit (0-9)</span>
        </div>
        <div className={`flex items-center gap-1.5 font-medium transition-colors ${check.hasSpecial ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
          <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${check.hasSpecial ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
            ✓
          </div>
          <span>1 special symbol (!@#$...)</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage({ initialMode, onAuthSuccess, onCancel }: AuthPageProps) {
  const rememberedEmail = localStorage.getItem('oophub_remembered_email') || '';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [notification, setNotification] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Independent password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  // Forgot Password / Account Recovery States
  const [forgotRecoveryTab, setForgotRecoveryTab] = useState<'reset' | 'lookup'>('reset');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailVerified, setForgotEmailVerified] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotTouched, setForgotTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    lookup: false
  });
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Account Lookup States
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    name: string;
    email: string;
    role: string;
    studentNumber?: string;
    employeeId?: string;
  } | null>(null);

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
  const isRegPasswordStrong = isStrongPassword(regPassword);
  const isRegConfirmPasswordValid =
    regConfirmPassword.length > 0 && regConfirmPassword === regPassword;
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
    registerTouched.password && !isRegPasswordStrong
      ? 'Password must meet all strong security criteria below.'
      : '';
  const registerConfirmPasswordError =
    registerTouched.confirmPassword && !isRegConfirmPasswordValid
      ? regConfirmPassword ? 'Passwords do not match.' : 'Please confirm your password.'
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
    isRegPasswordStrong &&
    isRegConfirmPasswordValid &&
    isRegSectionValid &&
    isRegStudentNumberValid &&
    isRegTeacherIdValid;

  const canRegister = canRegisterDetails && termsAccepted && !isSubmitting;

  // Forgot password validations
  const isForgotEmailValid = isValidEmail(forgotEmail);
  const isForgotNewPasswordStrong = isStrongPassword(forgotNewPassword);
  const isForgotConfirmPasswordValid =
    forgotConfirmPassword.length > 0 && forgotConfirmPassword === forgotNewPassword;
  const canResetPassword =
    forgotEmailVerified && isForgotNewPasswordStrong && isForgotConfirmPasswordValid && !isSubmitting;

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const isDuplicateEmailNotice = Boolean(notification?.message.toLowerCase().includes('email already exists'));

  const switchToSignInFromNotice = () => {
    setLoginEmail(regEmail.trim());
    setLoginPassword('');
    setIsLogin(true);
    setIsForgotPassword(false);
    setNotification(null);
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
      if (import.meta.env.PROD) {
        setIsSubmitting(false);
        showNotice('error', error instanceof Error ? error.message : 'Unable to sign in to the backend.');
        return;
      }

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
      if (!isRegPasswordStrong) {
        showNotice('error', 'Please make sure your password is strong and meets all security criteria.');
      } else if (!isRegConfirmPasswordValid) {
        showNotice('error', 'Passwords do not match. Please re-enter.');
      } else {
        showNotice('error', 'Complete the required account details.');
      }
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
      if (import.meta.env.PROD) {
        setIsSubmitting(false);
        showNotice('error', error instanceof Error ? error.message : 'Unable to create the account on the backend.');
        return;
      }

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
        writeStoredUsers(existingUsers);

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

  // Verify Email for Password Reset
  const handleVerifyForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotTouched(prev => ({ ...prev, email: true }));

    if (!isForgotEmailValid) {
      showNotice('error', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const normalized = forgotEmail.trim().toLowerCase();

    try {
      // Try backend first
      await authApi.forgotPassword(normalized);
      setForgotEmailVerified(true);
      setIsSubmitting(false);
      showNotice('success', 'Email verified! Please enter your new strong password below.');
    } catch (err) {
      // Check local storage accounts
      const localAccount = findExistingUserByEmail(normalized);
      if (localAccount) {
        setForgotEmailVerified(true);
        setIsSubmitting(false);
        showNotice('success', 'Account identified! Please set your new strong password below.');
        return;
      }

      setIsSubmitting(false);
      showNotice('error', err instanceof Error ? err.message : 'No registered account found with this email.');
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotTouched(prev => ({ ...prev, password: true, confirmPassword: true }));

    if (!isForgotNewPasswordStrong) {
      showNotice('error', 'Your new password must satisfy all strong password security requirements.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      showNotice('error', 'New passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    const normalized = forgotEmail.trim().toLowerCase();

    try {
      // Try backend update
      await authApi.resetPassword(normalized, forgotNewPassword);
    } catch {
      // Backend may be offline in dev, continue to update local users
    }

    // Update local storage record if exists
    try {
      const usersList = readStoredUsers();
      const updated = usersList.map(u => {
        if (u.email.toLowerCase() === normalized) {
          return { ...u, password: forgotNewPassword };
        }
        return u;
      });
      writeStoredUsers(updated);
    } catch {}

    setIsSubmitting(false);
    setForgotSuccess(true);
    setLoginEmail(normalized);
    setLoginPassword('');
    showNotice('success', 'Your password has been successfully reset! You can now sign in.');
  };

  // Handle Account Lookup
  const handleAccountLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotTouched(prev => ({ ...prev, lookup: true }));

    const query = lookupQuery.trim();
    if (!query) {
      showNotice('error', 'Enter your Student Number, Teacher ID, or Username.');
      return;
    }

    setIsSubmitting(true);
    setLookupResult(null);

    try {
      // Try backend endpoint
      const res = await authApi.lookupAccount(query);
      if (res.user) {
        setLookupResult(res.user);
        setIsSubmitting(false);
        showNotice('success', 'Account located!');
        return;
      }
    } catch {}

    // Check local accounts
    const localUsers = readStoredUsers();
    const queryLower = query.toLowerCase();
    const found = localUsers.find(
      u =>
        u.name.toLowerCase() === queryLower ||
        (u.studentNumber && u.studentNumber.toLowerCase() === queryLower) ||
        (u.employeeId && u.employeeId.toLowerCase() === queryLower) ||
        u.email.toLowerCase() === queryLower
    );

    if (found) {
      const [uPart, domain] = found.email.split('@');
      const maskedEmail =
        uPart.length <= 2
          ? `${uPart[0]}*@${domain}`
          : `${uPart[0]}${'*'.repeat(Math.min(uPart.length - 2, 6))}${uPart.slice(-1)}@${domain}`;

      setLookupResult({
        name: found.name,
        email: maskedEmail,
        role: found.role,
        studentNumber: found.studentNumber,
        employeeId: found.employeeId
      });
      setIsSubmitting(false);
      showNotice('success', 'Account located from system records!');
      return;
    }

    setIsSubmitting(false);
    showNotice('error', 'No matching account found with the provided details. Please verify and try again.');
  };

  const inputBase =
    'w-full rounded-xl border bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs';
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
              {isForgotPassword ? <KeyRound className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              {isForgotPassword ? 'Account Recovery' : 'OOP Pedagogical Hub'}
            </h1>
            <p className="text-[10px] font-bold text-emerald-700/85 tracking-widest uppercase mt-0.5">
              {isForgotPassword ? 'Password & Credentials Assistance' : 'Programming LMS Workspace'}
            </p>
          </div>

          {/* Mode Switcher (When not in forgot password) */}
          {!isForgotPassword && (
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
          )}

          {/* Notification Banner */}
          <AnimatePresence mode="wait">
            {notification && (
              <motion.div
                key={notification.message}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-4 rounded-2xl border p-4 text-sm shadow-sm ${
                  notification.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
                role={notification.type === 'error' ? 'alert' : 'status'}
                aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
              >
                <div className="flex items-start gap-3">
                  {notification.type === 'success' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="break-words text-sm font-bold leading-5">
                      {notification.message}
                    </p>
                    {isDuplicateEmailNotice && (
                      <button
                        type="button"
                        onClick={switchToSignInFromNotice}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-rose-700 cursor-pointer"
                      >
                        Sign in with this email
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black transition cursor-pointer ${
                      notification.type === 'success'
                        ? 'text-emerald-700 hover:bg-emerald-100'
                        : 'text-rose-700 hover:bg-rose-100'
                    }`}
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms switcher */}
          <AnimatePresence mode="wait">
            {isForgotPassword ? (
              /* Forgot Password / Account Recovery View */
              <motion.div
                key="forgot-password-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Forgot Sub-tab selector */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotRecoveryTab('reset');
                      setNotification(null);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      forgotRecoveryTab === 'reset'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotRecoveryTab('lookup');
                      setNotification(null);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      forgotRecoveryTab === 'lookup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Forgot Email / ID
                  </button>
                </div>

                {forgotSuccess ? (
                  /* Success State after Password Reset */
                  <div className="space-y-5 text-center py-4">
                    <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Password Updated Successfully!</h3>
                      <p className="text-xs text-slate-500">
                        You can now sign in to your OOP Pedagogical Hub account with your new secure password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setIsLogin(true);
                        setForgotSuccess(false);
                        setForgotEmailVerified(false);
                        setForgotNewPassword('');
                        setForgotConfirmPassword('');
                        setNotification(null);
                      }}
                      className="w-full flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-extrabold text-white transition-all shadow-xs cursor-pointer"
                    >
                      Sign In with New Password
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : forgotRecoveryTab === 'reset' ? (
                  /* Tab 1: Reset Password via Email */
                  <div className="space-y-4 text-left">
                    {!forgotEmailVerified ? (
                      /* Step 1: Verify Email */
                      <form onSubmit={handleVerifyForgotEmail} className="space-y-4" noValidate>
                        <div className="space-y-1">
                          <label htmlFor="forgot-email" className="text-xs font-bold text-slate-700">
                            Registered Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="forgot-email"
                              type="email"
                              value={forgotEmail}
                              onChange={e => setForgotEmail(e.target.value)}
                              onBlur={() => setForgotTouched(prev => ({ ...prev, email: true }))}
                              placeholder="Enter your registered email"
                              className={`${inputBase} ${
                                forgotTouched.email && !isForgotEmailValid ? inputError : inputNormal
                              }`}
                              aria-label="Registered email address"
                            />
                          </div>
                          {forgotTouched.email && !isForgotEmailValid && (
                            <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              Please enter a valid email address.
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={!isForgotEmailValid || isSubmitting}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Verifying Account...
                            </>
                          ) : (
                            <>
                              Verify & Continue
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      /* Step 2: Set New Strong Password */
                      <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[240px] font-mono">{forgotEmail}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForgotEmailVerified(false);
                              setForgotNewPassword('');
                              setForgotConfirmPassword('');
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>

                        {/* New Password */}
                        <div className="space-y-1">
                          <label htmlFor="forgot-new-password" className="text-xs font-bold text-slate-700">
                            New Strong Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="forgot-new-password"
                              type={showForgotNewPassword ? 'text' : 'password'}
                              value={forgotNewPassword}
                              onChange={e => setForgotNewPassword(e.target.value)}
                              onBlur={() => setForgotTouched(prev => ({ ...prev, password: true }))}
                              placeholder="Create strong password"
                              className={`${inputBase} pr-12 ${
                                forgotTouched.password && !isForgotNewPasswordStrong ? inputError : inputNormal
                              }`}
                              aria-label="New Password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotNewPassword(prev => !prev)}
                              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                              aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <PasswordStrengthPanel password={forgotNewPassword} />
                        </div>

                        {/* Confirm New Password with Eye Icon */}
                        <div className="space-y-1">
                          <label htmlFor="forgot-confirm-password" className="text-xs font-bold text-slate-700">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="forgot-confirm-password"
                              type={showForgotConfirmPassword ? 'text' : 'password'}
                              value={forgotConfirmPassword}
                              onChange={e => setForgotConfirmPassword(e.target.value)}
                              onBlur={() => setForgotTouched(prev => ({ ...prev, confirmPassword: true }))}
                              placeholder="Confirm new password"
                              className={`${inputBase} pr-12 ${
                                forgotTouched.confirmPassword && !isForgotConfirmPasswordValid ? inputError : inputNormal
                              }`}
                              aria-label="Confirm New Password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotConfirmPassword(prev => !prev)}
                              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                              aria-label={showForgotConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                              {showForgotConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {forgotTouched.confirmPassword && !isForgotConfirmPasswordValid && (
                            <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {forgotConfirmPassword ? 'Passwords do not match.' : 'Please confirm your new password.'}
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={!canResetPassword}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 mt-4 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Updating Password...
                            </>
                          ) : (
                            <>
                              Update & Save Password
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Tab 2: Account Lookup by Student Number / Employee ID / Username */
                  <form onSubmit={handleAccountLookupSubmit} className="space-y-4 text-left" noValidate>
                    <div className="space-y-1">
                      <label htmlFor="lookup-query" className="text-xs font-bold text-slate-700">
                        Student No. / Employee ID / Username
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="lookup-query"
                          type="text"
                          value={lookupQuery}
                          onChange={e => setLookupQuery(e.target.value)}
                          placeholder="e.g. 2024-0012, T-0912, or Full Name"
                          className={`${inputBase} ${inputNormal}`}
                          aria-label="Student number, Employee ID, or Username"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 pt-0.5">
                        We will search our database to retrieve your registered account email.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={!lookupQuery.trim() || isSubmitting}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          Find Account
                          <Search className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    {lookupResult && (
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{lookupResult.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            {lookupResult.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-500">Registered Email: </span>
                          <span className="font-mono font-bold text-slate-900">{lookupResult.email}</span>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setForgotRecoveryTab('reset');
                              setForgotEmail(lookupResult.email.includes('*') ? '' : lookupResult.email);
                              setNotification(null);
                            }}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                          >
                            Proceed to Reset Password →
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {/* Back to Sign In Link */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsLogin(true);
                      setNotification(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition focus:outline-none cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </motion.div>
            ) : isRegSuccess ? (
              /* Success Screen after Registration */
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
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Welcome to the OOP Pedagogical Hub. Your secure role-based workspace has been initialized.
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
              /* Sign In Form */
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
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        aria-label="Remember me"
                      />
                      Remember Me
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(loginEmail.trim());
                        setNotification(null);
                      }}
                      className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition focus:outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
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
                        Signing In...
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
              /* Create Account Form */
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

                    {/* Password Field with Eye Toggle & Real-time Security Checklist */}
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

                      {/* Password Security Strength Checklist & Progress Meter */}
                      <PasswordStrengthPanel password={regPassword} />

                      {registerPasswordError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {registerPasswordError}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password Field with Dedicated Eye Toggle */}
                    <div className="space-y-1 text-left">
                      <label htmlFor="reg-confirm-password" className="text-xs font-bold text-slate-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onBlur={() => setRegisterTouched(prev => ({ ...prev, confirmPassword: true }))}
                          onChange={e => setRegConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className={`${inputBase} pr-12 ${registerConfirmPasswordError ? inputError : inputNormal}`}
                          aria-label="Confirm Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(prev => !prev)}
                          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
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
