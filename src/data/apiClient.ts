/**
 * API Client Service
 * Handles all communication with the backend API
 */

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Check if the current page hostname is a local network address (not localhost/127.0.0.1)
    const isLocalNetworkHost = 
      hostname.endsWith('.local') ||
      hostname.endsWith('.lan') ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);
      
    // Only dynamically adjust the host if we are on a local network IP address/host
    // and the target API URL is configured to localhost/127.0.0.1.
    if (isLocalNetworkHost) {
      if (envUrl) {
        try {
          const url = new URL(envUrl);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            url.hostname = hostname;
            // Match the protocol of the current page
            if (protocol === 'https:') {
              url.protocol = 'https:';
            }
            return url.origin;
          }
        } catch (e) {
          // Fallback if envUrl is not a valid absolute URL
        }
      }
      
      // Default fallback when envUrl is not defined: use current hostname and backend port 5000
      return `${protocol}//${hostname}:5000`;
    }
  }
  
  return envUrl || 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();
const SESSION_TOKEN_KEY = 'oophub_session_token';
const USER_DATA_KEY = 'oophub_user_data';

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  student_number?: string;
  course?: string;
  year_level?: string;
  section?: string;
  employee_id?: string;
  department?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any;
  session_token?: string;
  error?: string;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class APIClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.sessionToken = this.getStoredSessionToken();
  }

  /**
   * Get stored session token from localStorage
   */
  private getStoredSessionToken(): string | null {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Store session token in localStorage
   */
  private storeSessionToken(token: string): void {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
      this.sessionToken = token;
    } catch (error) {
      console.error('Error storing session token:', error);
    }
  }

  /**
   * Store user data in localStorage (for quick access)
   */
  private storeUserData(user: any): void {
    try {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  }

  /**
   * Get stored user data from localStorage
   */
  public getStoredUserData(): any {
    try {
      const data = localStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      this.sessionToken = null;
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Get authorization headers
   */
  private getHeaders(contentType = 'application/json'): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': contentType
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; error: string | null }> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers ? undefined : 'application/json'),
        credentials: 'include'
      });

      // Handle network errors
      if (!response.ok) {
        // If unauthorized, clear session
        if (response.status === 401) {
          this.clearSession();
        }

        try {
          const errorData = await response.json();
          return {
            data: null as any,
            error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
          };
        } catch {
          return {
            data: null as any,
            error: `HTTP ${response.status}: ${response.statusText}`
          };
        }
      }

      const data = await response.json();
      return { data, error: null };

    } catch (error) {
      console.error('Request error:', error);
      
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Enhance generic browser fetch network failures
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            errorMessage = 'Network connection offline. Please check your internet connection.';
          } else {
            errorMessage = `Unable to connect to the server at ${this.baseUrl}. Please check your network connection and verify the backend is running.`;
          }
        }
      }
      
      return {
        data: null as any,
        error: errorMessage
      };
    }
  }

  /**
   * Login user
   */
  public async login(credentials: AuthLoginRequest): Promise<AuthResponse> {
    const { data, error } = await this.request<AuthResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials)
      }
    );

    if (error) {
      return {
        success: false,
        message: error
      };
    }

    if (data?.success && data?.session_token && data?.user) {
      this.storeSessionToken(data.session_token);
      this.storeUserData(data.user);
    }

    return data;
  }

  /**
   * Register new user
   */
  public async register(payload: AuthRegisterRequest): Promise<AuthResponse> {
    const { data, error } = await this.request<AuthResponse>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );

    if (error) {
      return {
        success: false,
        message: error
      };
    }

    if (data?.success && data?.session_token && data?.user) {
      this.storeSessionToken(data.session_token);
      this.storeUserData(data.user);
    }

    return data;
  }

  /**
   * Get current user info
   */
  public async getCurrentUser(): Promise<{ user: any | null; error: string | null }> {
    if (!this.sessionToken) {
      return { user: null, error: 'No session token' };
    }

    const { data, error } = await this.request<APIResponse<any>>(
      '/api/auth/me'
    );

    if (error || !data?.success) {
      this.clearSession();
      return { user: null, error: error || data?.message || 'Failed to fetch user' };
    }

    if (data?.data) {
      this.storeUserData(data.data);
      return { user: data.data, error: null };
    }

    return { user: null, error: 'No user data' };
  }

  /**
   * Logout user
   */
  public async logout(): Promise<{ success: boolean; error: string | null }> {
    if (!this.sessionToken) {
      this.clearSession();
      return { success: true, error: null };
    }

    const { data, error } = await this.request<{ success: boolean }>(
      '/api/auth/logout',
      { method: 'POST' }
    );

    this.clearSession();

    if (error) {
      return { success: false, error };
    }

    return { success: data?.success || true, error: null };
  }

  /**
   * Refresh session token
   */
  public async refreshSession(): Promise<{ token: string | null; error: string | null }> {
    if (!this.sessionToken) {
      return { token: null, error: 'No session token' };
    }

    const { data, error } = await this.request<{ success: boolean; session_token: string }>(
      '/api/auth/refresh',
      { method: 'POST' }
    );

    if (error || !data?.success) {
      this.clearSession();
      return { token: null, error: error || 'Failed to refresh session' };
    }

    if (data?.session_token) {
      this.storeSessionToken(data.session_token);
      return { token: data.session_token, error: null };
    }

    return { token: null, error: 'No token in response' };
  }

  /**
   * Get all videos
   */
  public async getVideos(): Promise<{ videos: any[] | null; error: string | null }> {
    const { data, error } = await this.request<APIResponse<any[]>>(
      '/api/videos'
    );

    if (error || !data?.success) {
      return { videos: null, error: error || data?.message || 'Failed to fetch videos' };
    }

    return { videos: data?.data || [], error: null };
  }

  /**
   * Get single video
   */
  public async getVideo(id: string): Promise<{ video: any | null; error: string | null }> {
    const { data, error } = await this.request<APIResponse<any>>(
      `/api/videos/${id}`
    );

    if (error || !data?.success) {
      return { video: null, error: error || data?.message || 'Failed to fetch video' };
    }

    return { video: data?.data || null, error: null };
  }

  /**
   * Create new video (Admin only)
   */
  public async createVideo(videoData: any): Promise<{ video: any | null; error: string | null }> {
    const { data, error } = await this.request<APIResponse<any>>(
      '/api/videos',
      {
        method: 'POST',
        body: JSON.stringify(videoData)
      }
    );

    if (error || !data?.success) {
      return { video: null, error: error || data?.message || 'Failed to create video' };
    }

    return { video: data?.data || null, error: null };
  }

  /**
   * Update video (Admin only)
   */
  public async updateVideo(id: string, updates: any): Promise<{ video: any | null; error: string | null }> {
    const { data, error } = await this.request<APIResponse<any>>(
      `/api/videos/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );

    if (error || !data?.success) {
      return { video: null, error: error || data?.message || 'Failed to update video' };
    }

    return { video: data?.data || null, error: null };
  }

  /**
   * Delete video (Admin only)
   */
  public async deleteVideo(id: string): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await this.request<{ success: boolean }>(
      `/api/videos/${id}`,
      { method: 'DELETE' }
    );

    if (error || !data?.success) {
      return { success: false, error: error || 'Failed to delete video' };
    }

    return { success: true, error: null };
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.sessionToken;
  }

  /**
   * Get current session token
   */
  public getSessionToken(): string | null {
    return this.sessionToken;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

export default apiClient;
