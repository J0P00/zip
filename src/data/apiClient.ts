import { AuthenticatedUser } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const TOKEN_KEY = 'oophub_auth_token';

type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
  user?: AuthenticatedUser;
  token?: string;
};

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Authentication still succeeds for this tab even if storage is unavailable.
  }
};

const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers = new Headers(options.headers);
  const token = getToken();

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message: payload.message || `HTTP ${response.status}: ${response.statusText}`
    };
  }

  return payload;
}

export const apiClient = {
  get token() {
    return getToken();
  },

  async login(email: string, password: string) {
    const result = await request<never>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (result.success && result.token) {
      setToken(result.token);
    }

    return result;
  },

  async register(payload: Record<string, unknown>) {
    const result = await request<never>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (result.success && result.token) {
      setToken(result.token);
    }

    return result;
  },

  async logout() {
    const result = await request('/api/auth/logout', { method: 'POST' });
    clearToken();
    return result;
  },

  clearSession() {
    clearToken();
  },

  async me() {
    return request<never>('/api/auth/me');
  },

  async updateUser(id: string, updates: Partial<AuthenticatedUser>) {
    return request<AuthenticatedUser>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getAppState() {
    return request<Record<string, unknown>>('/api/app-state');
  },

  async saveAppState(state: Record<string, unknown>) {
    return request('/api/app-state', {
      method: 'PUT',
      body: JSON.stringify(state)
    });
  },

  async updateProgress(studentId: string, progress: Record<string, unknown>) {
    return request(`/api/progress/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(progress)
    });
  }
};

export default apiClient;
