import {
  AdaptiveRecommendation,
  AuthenticatedUser,
  Persona,
  RankingEntry,
  ManagedLesson,
  ManagedVideo,
  LearningResource,
  PreTestConfig,
  PreTestAttempt,
  PreTestInsights,
  TeacherCourseAnalytics,
  StudentDeepDiveAnalytics
} from '../types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://oop-backend-new.onrender.com')
    .replace(/\/+$/, '');

const TOKEN_KEY = 'oophub_auth_token';

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setAuthToken = (token: string) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Authentication still succeeds for the current render even if storage is disabled.
  }
};

export const getYouTubeVideoId = (value: string) => {
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || '';
    if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v') || '';
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || '';
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || '';
    }
  } catch { /* invalid URLs are handled by validateVideoUrl */ }
  return '';
};

export const validateVideoUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Video URL is required.';
  if (trimmed.startsWith('/')) return null; // legacy authorized local playback URL
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return 'Use an http:// or https:// video URL.';
    return null;
  } catch {
    return 'Enter a valid video URL.';
  }
};

export type ApiError = Error & {
  code?: string;
  status?: number;
  body?: any;
  endpoint?: string;
};

type RequestOptions = RequestInit & {
  token?: string;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token || getAuthToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let rawText = '';
  let payload: any = null;
  try {
    rawText = await response.text();
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText ? { raw: rawText.slice(0, 500) } : null;
  }

  if (!response.ok) {
    const errorMsg =
      payload?.message ||
      payload?.error ||
      (typeof payload?.raw === 'string' && payload.raw) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg) as ApiError;
    error.code = payload?.code;
    error.status = response.status;
    error.body = payload;
    error.endpoint = path;
    throw error;
  }

  return payload as T;
}

export type AuthResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthenticatedUser;
};

export const authApi = {
  register: (body: Record<string, unknown>) =>
    apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  forgotPassword: (email: string) =>
    apiRequest<{ success: boolean; message: string; exists: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  resetPassword: (email: string, newPassword: string) =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword })
    }),
  lookupAccount: (identifier: string) =>
    apiRequest<{ success: boolean; message: string; user?: { name: string; email: string; role: string; studentNumber?: string; employeeId?: string } }>('/api/auth/lookup-account', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    }),
  me: (token?: string) => apiRequest<{ success: boolean; user: AuthenticatedUser }>('/api/auth/me', { token })
};

export const userApi = {
  listUsers: (token?: string) =>
    apiRequest<{ success: boolean; data: AuthenticatedUser[] }>('/api/users', { token }),
  updateProfile: (id: string, updates: Partial<AuthenticatedUser>) =>
    apiRequest<{ success: boolean; data: AuthenticatedUser }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
};

export const progressApi = {
  getVideoProgress: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: any[] }>(`/api/progress/${studentId}`, { token }),
  saveVideoProgress: (body: {
    videoId: string;
    lastPosition?: number;
    completionPercentage: number;
    completed: boolean;
  }, token?: string) =>
    apiRequest<{ success: boolean; data: any }>('/api/progress', {
      method: 'PUT',
      token,
      body: JSON.stringify(body)
    }),
  getQuizAttempts: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: any[] }>(`/api/quiz-attempts/${studentId}`, { token }),
  getStudentResults: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: import('./interpretation').StudentResultsData }>(`/api/student-results/${encodeURIComponent(studentId)}`, { token }),
  saveQuizAttempt: (body: Record<string, unknown>, token?: string) =>
    apiRequest<{ success: boolean; data: any }>('/api/quiz-attempts', {
      method: 'POST',
      token,
      body: JSON.stringify(body)
    })
};

export const rankingApi = {
  list: (token?: string) =>
    apiRequest<{ success: boolean; data: RankingEntry[] }>('/api/rankings', { token })
};

export const lessonApi = {
  list: () => apiRequest<{ success: boolean; data: any[] }>('/api/lessons'),
  getPlaybackUrl: (lessonId: string, token?: string) =>
    apiRequest<{ success: boolean; data: { videoUrl: string; expiresIn: number } }>(`/api/videos/lesson/${encodeURIComponent(lessonId)}/playback-url`, { token }),
  getAccess: (lessonId: string, token?: string) =>
    apiRequest<{ success: boolean; data: { canAccess: boolean; canStart: boolean; reason?: string | null; videoProgress: number; passingScore: number; current?: import('../types').LessonEvidence } }>(
      `/api/lesson-access/${encodeURIComponent(lessonId)}`,
      { token }
    ),
  create: (body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>(`/api/lessons/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/lessons/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
};

export const assessmentApi = {
  list: () => apiRequest<{ success: boolean; data: any[] }>('/api/assessments'),
  create: (body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>('/api/assessments', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>(`/api/assessments/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/assessments/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }),
  startSession: (body: { assessmentId: string; lessonId?: string; sessionToken?: string }) =>
    apiRequest<{ success: boolean; resumed?: boolean; data: import('../types').AssessmentSessionData }>('/api/assessments/session/start', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: body.sessionToken ? { 'x-session-token': body.sessionToken } : {}
    }),
  getActiveSession: (assessmentId: string) =>
    apiRequest<{ success: boolean; data: import('../types').AssessmentSessionData | null }>(`/api/assessments/session/active/${encodeURIComponent(assessmentId)}`),
  logEvent: (sessionId: string, body: { eventType: string; metadata?: Record<string, any>; answers?: Record<string, string> }) =>
    apiRequest<{ success: boolean; violationCount: number; severity: string; threshold: number; message: string }>(`/api/assessments/session/${encodeURIComponent(sessionId)}/event`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  submitSession: (sessionId: string, body: { answers: Record<string, string> }) =>
    apiRequest<{ success: boolean; data: import('../types').AssessmentSubmitResult }>(`/api/assessments/session/${encodeURIComponent(sessionId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getStudentSessions: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: any[] }>(`/api/assessments/sessions/student/${encodeURIComponent(studentId)}`, { token }),
  getSessionEvents: (sessionId: string, token?: string) =>
    apiRequest<{ success: boolean; session: any; data: import('../types').AssessmentSecurityEvent[] }>(`/api/assessments/sessions/${encodeURIComponent(sessionId)}/events`, { token })
};

export const practiceApi = {
  listChallenges: () => apiRequest<{ success: boolean; data: any[] }>('/api/practice-challenges'),
  listSubmissions: () => apiRequest<{ success: boolean; data: any[] }>('/api/practice-submissions'),
  listMine: (token?: string) => apiRequest<{ success: boolean; data: any[] }>('/api/practice-submissions/me', { token }),
  runCode: (challengeId: string, sourceCode: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/practice-challenges/${encodeURIComponent(challengeId)}/run`, {
      method: 'POST',
      body: JSON.stringify({ sourceCode })
    }),
  submit: (body: { challengeId: string; sourceCode: string }) =>
    apiRequest<{ success: boolean; data: any }>('/api/practice-submissions', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  reopenSubmission: (id: string) =>
    apiRequest<{ success: boolean; data: any }>('/api/practice-submissions/' + encodeURIComponent(id) + '/reopen', {
      method: 'PATCH'
    }),
  gradeSubmission: (id: string, body: { grade: number; feedback: string; remedialRequired?: boolean }) =>
    apiRequest<{ success: boolean; data: any }>('/api/practice-submissions/' + encodeURIComponent(id) + '/grade', {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  createChallenge: (body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>('/api/practice-challenges', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateChallenge: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>(`/api/practice-challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  removeChallenge: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/practice-challenges/${id}`, {
      method: 'DELETE'
    })
};

export const swingApi = {
  updateProgress: (body: any, token?: string) => apiRequest<{ success: boolean; data: any }>('/api/swing/progress', { method: 'PUT', token, body: JSON.stringify(body) }),
  submitQuiz: (body: any, token?: string) => apiRequest<{ success: boolean; data: any }>('/api/swing/quiz-attempts', { method: 'POST', token, body: JSON.stringify(body) }),
  submitCode: (body: any, token?: string) => apiRequest<{ success: boolean; data: any }>('/api/swing/submissions', { method: 'POST', token, body: JSON.stringify(body) })
};

export const notificationApi = {
  list: () => apiRequest<{ success: boolean; data: import('../types').NotificationItem[] }>('/api/notifications'),
  markRead: (id: string) =>
    apiRequest<{ success: boolean; data: import('../types').NotificationItem }>('/api/notifications/' + encodeURIComponent(id) + '/read', {
      method: 'PATCH'
    }),
  markAllRead: () =>
    apiRequest<{ success: boolean }>('/api/notifications/read-all', {
      method: 'PATCH'
    }),
  streamUrl: () => API_BASE_URL + '/api/notifications/stream?token=' + encodeURIComponent(getAuthToken())
};

export const teacherApi = {
  monitoring: (token?: string) => apiRequest<{ success: boolean; data: any }>('/api/teacher/monitoring', { token })
};

export const videoApi = {
  list: (lessonId?: string) => {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    return apiRequest<{ success: boolean; count: number; data: ManagedVideo[] }>(`/api/videos${query}`);
  },
  create: (body: Partial<ManagedVideo>) =>
    apiRequest<{ success: boolean; data: ManagedVideo }>('/api/videos', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  update: (id: string, body: Partial<ManagedVideo>) =>
    apiRequest<{ success: boolean; data: ManagedVideo }>(`/api/videos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/api/videos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
};

export const storageApi = {
  getStatus: () =>
    apiRequest<{
      success: boolean;
      data: {
        configured: boolean;
        maxFileSizeBytes: number;
        maxFileSizeMb: number;
        acceptedTypes: string[];
        provider: 'local';
        uploadEndpoint: string;
      };
    }>('/api/videos/storage-status')
};

export const resourceApi = {
  list: (lessonId?: string) => {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : '';
    return apiRequest<{ success: boolean; count: number; data: LearningResource[] }>(`/api/learning-resources${query}`);
  },
  create: (body: Partial<LearningResource>) =>
    apiRequest<{ success: boolean; data: LearningResource }>('/api/learning-resources', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  update: (id: string, body: Partial<LearningResource>) =>
    apiRequest<{ success: boolean; data: LearningResource }>(`/api/learning-resources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; message: string }>(`/api/learning-resources/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
};

export const preTestApi = {
  getConfig: () =>
    apiRequest<{ success: boolean; data: PreTestConfig }>('/api/pre-test'),
  updateConfig: (body: Partial<PreTestConfig>) =>
    apiRequest<{ success: boolean; data: PreTestConfig }>('/api/pre-test', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  getQuestions: (topic?: string) => {
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : '';
    return apiRequest<{ success: boolean; count: number; data: any[] }>(`/api/pre-test/questions${query}`);
  },
  start: (body?: { studentId?: string }) =>
    apiRequest<{
      success: boolean;
      resumed: boolean;
      data: {
        sessionId: string;
        sessionToken: string;
        assessmentId: string;
        lessonId: string;
        startedAt: string;
        expiresAt: string;
        remainingSeconds: number;
        attemptNumber: number;
        questions: any[];
        savedAnswers: Record<string, string>;
      };
    }>('/api/pre-test/start', {
      method: 'POST',
      body: JSON.stringify(body || {})
    }),
  getActive: () =>
    apiRequest<{
      success: boolean;
      data: {
        sessionId: string;
        sessionToken: string;
        assessmentId: string;
        lessonId: string;
        startedAt: string;
        expiresAt: string;
        remainingSeconds: number;
        attemptNumber: number;
        questions: any[];
        savedAnswers: Record<string, string>;
      } | null;
    }>('/api/pre-test/active'),
  submit: (body: { sessionId?: string; answers: Record<string, string>; timeSpentSeconds?: number }) =>
    apiRequest<{
      success: boolean;
      data: {
        sessionId: string;
        assessmentId: string;
        score: number;
        total: number;
        percentage: number;
        passed: boolean;
        passingScore: number;
        attemptNumber: number;
        dateCompleted: string;
        review: any[];
        insights?: PreTestInsights;
      };
    }>('/api/pre-test/submit', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getAttempts: (courseId?: string) => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return apiRequest<{ success: boolean; total: number; data: PreTestAttempt[] }>(`/api/pre-test/attempts${query}`);
  },
  getMyAttempts: () =>
    apiRequest<{ success: boolean; data: PreTestAttempt[] }>('/api/pre-test/my-attempts'),
  getMyInsights: (attemptNumber?: number) => {
    const query = attemptNumber ? `?attempt=${encodeURIComponent(attemptNumber)}` : '';
    return apiRequest<{ success: boolean; hasCompletedPreTest: boolean; data: PreTestInsights | null }>(`/api/pre-test/my-insights${query}`);
  }
};

export const analyticsApi = {
  getTeacherAnalytics: (courseId?: string) => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return apiRequest<{ success: boolean; data: TeacherCourseAnalytics }>(`/api/teacher/analytics${query}`);
  },
  getStudentAnalytics: (studentId: string) =>
    apiRequest<{ success: boolean; data: StudentDeepDiveAnalytics }>(`/api/teacher/analytics/student/${encodeURIComponent(studentId)}`)
};

export const monitoringApi = {
  list: () => apiRequest<{ success: boolean; data: any[] }>('/api/monitoring-requests'),
  create: (studentId: string) => apiRequest<{ success: boolean; data: any }>('/api/monitoring-requests', {
    method: 'POST',
    body: JSON.stringify({ studentId })
  }),
  update: (id: string, status: 'pending' | 'accepted' | 'rejected') =>
    apiRequest<{ success: boolean; data: any }>(`/api/monitoring-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
};

export const recommendationApi = {
  list: (studentId?: string, token?: string) => {
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    return apiRequest<{ success: boolean; data: AdaptiveRecommendation[] }>(`/api/recommendations${query}`, { token });
  },
  save: (recommendation: AdaptiveRecommendation) =>
    apiRequest<{ success: boolean; data: AdaptiveRecommendation }>('/api/recommendations', {
      method: 'POST',
      body: JSON.stringify(recommendation)
    }),
  complete: (id: string) =>
    apiRequest<{ success: boolean; data: AdaptiveRecommendation }>(`/api/recommendations/${id}/complete`, {
      method: 'PATCH'
    })
};

export const appApi = {
  getLessons: () => apiRequest<{ success: boolean; data: any[] }>('/api/lessons'),
  health: () => apiRequest<{ status?: string; message?: string }>('/health')
};


