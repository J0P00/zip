export type Persona = 'public' | 'student' | 'teacher' | 'admin';
export type AccountSource = 'demo' | 'custom';

export interface AuthenticatedUser {
  name: string;
  email: string;
  role: Persona;
  accountSource: AccountSource;
  userId?: string;
  registrationDate?: string;
  contactNumber?: string;
  address?: string;
  dateOfBirth?: string;
  accountStatus?: string;
  
  // Student-specific profile fields
  studentNumber?: string;
  course?: string;
  yearLevel?: string;
  section?: string;
  programStatus?: string;

  // Teacher-specific profile fields
  employeeId?: string;
  department?: string;
  specialization?: string;
  assignedCourses?: string;

  // Admin-specific profile fields
  adminId?: string;
  systemRole?: string;
  accessLevel?: string;

  // Global user preference & status fields
  onlineStatus?: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
}

export type StudentSubView = 'dashboard' | 'ide' | 'videos' | 'assessments' | 'leaderboard' | 'profile';
export type TeacherSubView = 'dashboard' | 'students' | 'submission-review' | 'analytics' | 'profile';
export type AdminSubView =
  | 'dashboard'
  | 'users'
  | 'courses'
  | 'library'
  | 'assessments'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'profile';

export interface CodeFile {
  name: string;
  path: string;
  content: string;
  isFolder?: boolean;
}

export interface IDEChallenge {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  goals: string[];
  instructions: string[];
  proTip: string;
  initialFiles: Record<string, string>;
  testSuite: {
    run: () => { success: boolean; output: string[] };
  };
}

export interface VideoLesson {
  id: string;
  title: string;
  duration: string;
  sequence: number;
  status: 'completed' | 'active' | 'locked';
  videoUrl: string;
  description: string;
  concepts: string[];
  thumbnailUrl?: string;
  topic?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  language?: string;
  module?: string;
  category?: string;
  courseId?: string;
  isArchived?: boolean;
  unlockedAssessmentId?: string;
  views?: number;
  avgWatchTime?: number;
  completedStudents?: string[];
  inProgressStudents?: string[];
  notStartedStudents?: string[];
  progressPercent?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'upload' | 'update' | 'assign' | 'unlock';
}

export interface AssessmentQuestion {
  id: string;
  scenario: string;
  question: string;
  codeSnippet: string;
  options: {
    id: string;
    text: string;
    rationale: string;
  }[];
  correctOptionId: string;
  difficulty: string;
  points: number;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  points: number;
  badges: string[];
  streak: number;
  isCurrentUser?: boolean;
  avatar?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface PendingSubmission {
  id: string;
  studentName: string;
  challengeName: string;
  submittedAt: string;
  status: 'pending' | 'reviewed';
  code: string;
  grade?: number;
  feedback?: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  status: 'Published' | 'Draft' | 'Archived';
  lessonsCount: number;
  lastUpdated: string;
  category: string;
}

export interface LessonItem {
  id: string;
  title: string;
  module: string;
  type: 'Video' | 'Lab' | 'Quiz';
  difficulty: string;
}

export interface AdaptiveRule {
  id: string;
  trigger: string;
  condition: string;
  action: string;
  isActive: boolean;
}

export interface MonitoringRequest {
  id: string;
  teacherEmail: string;
  teacherName: string;
  studentEmail: string;
  studentName: string;
  studentId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface AssessmentQuestionOption {
  id: string;
  text: string;
  rationale: string;
}

export interface AssessmentQuestionItem {
  id: string;
  question: string;
  codeSnippet?: string;
  options: AssessmentQuestionOption[];
  correctOptionId: string;
}

export interface Assessment {
  id: string;
  title: string;
  topicName: string;
  questionsCount: number;
  timeLimitMinutes: number;
  difficulty: 'Easy' | 'Intermediate' | 'Hard';
  questions: AssessmentQuestionItem[];
}
