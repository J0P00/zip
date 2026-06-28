export type Persona = 'student' | 'teacher' | 'admin';
export type AccountSource = 'express' | 'local';

export interface StoredUser {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  role: Persona;
  user_id: string;
  registration_date: string;
  account_status: string;
  
  // Student specific
  student_number?: string;
  course?: string;
  year_level?: string;
  section?: string;
  program_status?: string;
  
  // Teacher specific
  employee_id?: string;
  department?: string;
  specialization?: string;
  assigned_courses?: string;
  
  // Admin specific
  admin_id?: string;
  system_role?: string;
  access_level?: string;
  
  // Common fields
  contact_number?: string;
  address?: string;
  date_of_birth?: string;
  online_status?: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
  terms_agreement_accepted?: boolean;
  terms_accepted_at?: string;
  terms_version?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoLesson {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: number;
  video_url: string;
  thumbnail_url: string;
  lesson_number: number;
  curriculum_id: string;
  created_by: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: StoredUser;
  session_token?: string;
}

export interface RegisterPayload extends AuthPayload {
  name: string;
  role: Persona;
  student_number?: string;
  course?: string;
  year_level?: string;
  section?: string;
  employee_id?: string;
  department?: string;
}

export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface SessionData {
  user_id: string;
  email: string;
  role: Persona;
  timestamp: number;
}
