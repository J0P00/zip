export type Persona = 'public' | 'student' | 'teacher' | 'admin';
export type AccountSource = 'demo' | 'custom';
export type PolicyStatus = 'Draft' | 'Published' | 'Archived';

export interface AuthenticatedUser {
  id?: string;
  name: string;
  email: string;
  role: Persona;
  accountSource: AccountSource;
  token?: string;
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

  // Terms and Agreement consent metadata
  termsAgreementAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export type StudentSubView = 'dashboard' | 'ide' | 'videos' | 'assessments' | 'swing' | 'leaderboard' | 'profile';
export type TeacherSubView = 'dashboard' | 'students' | 'submission-review' | 'analytics' | 'profile';
export type AdminSubView =
  | 'dashboard'
  | 'users'
  | 'courses'
  | 'library'
  | 'assessments'
  | 'practice'
  | 'monitoring'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'terms'
  | 'profile'
  | 'videos';

export interface TermsPolicyVersion {
  id: string;
  version: string;
  title: string;
  termsContent: string;
  privacyContent: string;
  status: PolicyStatus;
  forceReacceptance: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedBy?: string;
}

export interface UserTermsAgreement {
  agreement_id: string;
  user_id: string;
  accepted: boolean;
  accepted_at: string;
  ip_address?: string;
  version: string;
  user_role: Persona;
}

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
  
  // Cloudinary & metadata extensions
  cloudinaryPublicID?: string;
  yearLevel?: string;
  createdAt?: string;
  createdBy?: string;

  // Video citation database fields
  video_title?: string;
  creator_name?: string;
  publisher_name?: string;
  source_url?: string;
  publication_date?: string;
  accessed_date?: string;
  license_type?: string;
  citation_created_at?: string;
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
  progress?: number;
  videoProgress?: number;
  quizScore?: number;
  practiceScore?: number;
  status?: string;
  currentTopic?: string;
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
  studentId?: string;
  studentEmail?: string;
  section?: string;
  topicId?: string;
  topicTitle?: string;
  programOutput?: string;
  compileStatus?: 'not_run' | 'success' | 'failed' | 'runtime_error';
  runtime?: number;
  memoryUsage?: number;
  score?: number;
  isLocked?: boolean;
  errorMessage?: string;
  testResults?: ChallengeTestResult[];
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

export interface StudentVideoProgress {
  progressId: string;
  studentId: string;
  videoId: string;
  lastPosition: number; // in seconds
  completionPercentage: number;
  completed: boolean;
  dateCompleted?: string;
}

export interface StudentIDEProgress {
  submissionsCount: number;
  successfulExecutions: number;
  completed: boolean;
  code?: string;
}

export interface ChallengeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  matcher: string;
}

export interface ProgrammingChallenge {
  id: string;
  topicId: string;
  lessonId: string;
  assessmentId: string;
  title: string;
  description: string;
  learningObjectives: string[];
  requirements: string[];
  starterCode: string;
  sampleInput: string;
  sampleOutput: string;
  passingScore: number;
  testCases: ChallengeTestCase[];
  createdAt: string;
}

export interface ChallengeTestResult {
  id: string;
  isHidden: boolean;
  passed: boolean;
  expectedOutput: string;
  actualOutput: string;
  message: string;
}

export interface PracticeSubmission {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  section: string;
  challengeId: string;
  challengeTitle: string;
  topicId: string;
  topicTitle: string;
  sourceCode: string;
  programOutput: string;
  compileStatus: 'success' | 'failed' | 'runtime_error';
  runtime: number;
  memoryUsage?: number;
  score: number;
  submittedAt: string;
  isLocked: boolean;
  errorMessage?: string;
  testResults: ChallengeTestResult[];
}

export type RecommendationType = 'Remedial' | 'Continue' | 'Advanced';
export type RecommendationTrigger = 'Video Completion' | 'Quiz Score' | 'Coding Score' | 'Lesson Completion';
export type RecommendationStatus = 'Pending' | 'Completed';

export interface AdaptiveRecommendation {
  id: string;
  studentId: string;
  studentName?: string;
  lessonId: string;
  lessonTitle: string;
  currentTopic: string;
  type: RecommendationType;
  trigger: RecommendationTrigger;
  reason: string;
  generatedDate: string;
  status: RecommendationStatus;
  title: string;
  summary: string;
  actions: string[];
  primaryActionLabel: string;
  targetView: StudentSubView;
  quizScore?: number;
  codingScore?: number;
  videoCompleted?: boolean;
  lessonCompleted?: boolean;
  quizAttempts?: number;
  codingAttempts?: number;
  progressPercentage?: number;
}
