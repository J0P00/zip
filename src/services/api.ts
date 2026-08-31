import { AdaptiveRecommendation, AuthenticatedUser, Persona } from '../types';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://oop-backend-j0oj.onrender.com')
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

type RequestOptions = RequestInit & {
  token?: string;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? getAuthToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed with status ${response.status}`);
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
  }) =>
    apiRequest<{ success: boolean; data: any }>('/api/progress', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  getQuizAttempts: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: any[] }>(`/api/quiz-attempts/${studentId}`, { token }),
  getStudentResults: (studentId: string, token?: string) =>
    apiRequest<{ success: boolean; data: import('./interpretation').StudentResultsData }>(`/api/student-results/${encodeURIComponent(studentId)}`, { token }),
  saveQuizAttempt: (body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>('/api/quiz-attempts', {
      method: 'POST',
      body: JSON.stringify(body)
    })
};

export const lessonApi = {
  list: () => apiRequest<{ success: boolean; data: any[] }>('/api/lessons'),
  create: (body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>('/api/lessons', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; data: any }>(`/api/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/lessons/${id}`, {
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
    apiRequest<{ success: boolean; data: any }>(`/api/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  remove: (id: string) =>
    apiRequest<{ success: boolean; data: any }>(`/api/assessments/${id}`, {
      method: 'DELETE'
    })
};

export const practiceApi = {
  listChallenges: () => apiRequest<{ success: boolean; data: any[] }>('/api/practice-challenges'),
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

export const adminApi = {
  overview: () => apiRequest<{ success: boolean; data: any }>('/api/admin/overview'),
  monitoring: () => apiRequest<{ success: boolean; data: any }>('/api/admin/monitoring'),
  reports: () => apiRequest<{ success: boolean; data: any }>('/api/admin/reports')
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

export const isDemoEmail = (email: string, role?: Persona) => {
  void role;
  return false;
};
