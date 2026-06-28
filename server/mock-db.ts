/**
 * Express backend data store
 * Provides in-memory data storage for development and deployment demos.
 */

import crypto from 'crypto';

// In-memory storage
const mockUsers: any[] = [];
const mockSessions: any[] = [];
const mockVideos: any[] = [];
let isInitialized = false;

// Initialize with sample data
export function initializeMockData() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  // Add sample admin user
  const adminId = generateId();
  mockUsers.push({
    id: adminId,
    user_id: 'admin_001',
    email: 'admin@test.com',
    password_hash: hashPassword('admin123'),
    name: 'Admin User',
    role: 'admin',
    registration_date: new Date(),
    account_status: 'Active',
    terms_agreement_accepted: true,
    created_at: new Date(),
    updated_at: new Date(),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  });

  // Add sample teacher user
  const teacherId = generateId();
  mockUsers.push({
    id: teacherId,
    user_id: 'teacher_001',
    email: 'teacher@test.com',
    password_hash: hashPassword('teacher123'),
    name: 'Teacher User',
    role: 'teacher',
    employee_id: 'EMP001',
    department: 'Computer Science',
    specialization: 'OOP Fundamentals',
    registration_date: new Date(),
    account_status: 'Active',
    terms_agreement_accepted: true,
    created_at: new Date(),
    updated_at: new Date(),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher'
  });

  // Add sample student user
  const studentId = generateId();
  mockUsers.push({
    id: studentId,
    user_id: 'student_001',
    email: 'student@test.com',
    password_hash: hashPassword('student123'),
    name: 'Student User',
    role: 'student',
    student_number: 'STU001',
    course: 'Bachelor of Science in Computer Science',
    year_level: '2',
    section: 'A',
    registration_date: new Date(),
    account_status: 'Active',
    terms_agreement_accepted: true,
    created_at: new Date(),
    updated_at: new Date(),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'
  });

  // Add sample videos
  mockVideos.push({
    id: generateId(),
    title: 'Java OOP Fundamentals - Part 1',
    description: 'Introduction to Object-Oriented Programming concepts in Java',
    instructor: 'Teacher User',
    duration: 3600,
    video_url: 'https://example.com/video1',
    thumbnail_url: 'https://api.dicebear.com/7.x/icons/svg?seed=oop1',
    lesson_number: 1,
    curriculum_id: 'curriculum_001',
    created_by: teacherId,
    is_available: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  mockVideos.push({
    id: generateId(),
    title: 'Java OOP Fundamentals - Part 2',
    description: 'Advanced OOP concepts: Inheritance and Polymorphism',
    instructor: 'Teacher User',
    duration: 4200,
    video_url: 'https://example.com/video2',
    thumbnail_url: 'https://api.dicebear.com/7.x/icons/svg?seed=oop2',
    lesson_number: 2,
    curriculum_id: 'curriculum_001',
    created_by: teacherId,
    is_available: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('✅ Mock database initialized with sample data');
  console.log('   Users: admin@test.com (admin123), teacher@test.com (teacher123), student@test.com (student123)');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `mock_${crypto.randomBytes(8).toString('hex')}`;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function mockFindUserByEmail(email: string) {
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    return { data: user, error: null };
  }
  return { data: null, error: null };
}

export async function mockVerifyPassword(email: string, password: string) {
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { valid: false, user: null };
  }

  const passwordHash = hashPassword(password);
  const valid = user.password_hash === passwordHash;

  if (valid) {
    const { password_hash, ...userData } = user;
    return { valid: true, user: userData };
  }

  return { valid: false, user: null };
}

export async function mockCreateUser(userData: any) {
  const newUser = {
    id: generateId(),
    ...userData,
    password_hash: userData.password ? hashPassword(userData.password) : (userData.password_hash || ''),
    registration_date: new Date(),
    account_status: 'Active',
    created_at: new Date(),
    updated_at: new Date(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.email}`
  };

  // Remove password field
  const { password, ...userWithoutPassword } = newUser;

  mockUsers.push(newUser);
  return { data: userWithoutPassword, error: null };
}

export async function mockGetUserById(id: string) {
  const user = mockUsers.find(u => u.id === id);
  if (user) {
    const { password_hash, ...userData } = user;
    return { data: userData, error: null };
  }
  return { data: null, error: 'User not found' };
}

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

export async function mockCreateSession(userId: string, token: string) {
  const session = {
    id: generateId(),
    user_id: userId,
    session_token: token,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    last_activity: new Date()
  };

  mockSessions.push(session);
  return { data: session, error: null };
}

export async function mockVerifySessionToken(token: string) {
  const session = mockSessions.find(s => s.session_token === token);
  if (!session) {
    return { data: null, error: 'Invalid session' };
  }

  if (session.expires_at < new Date()) {
    return { data: null, error: 'Session expired' };
  }

  // Update last activity
  session.last_activity = new Date();

  // Get user
  const user = mockUsers.find(u => u.id === session.user_id);
  if (!user) {
    return { data: null, error: 'User not found' };
  }

  const { password_hash, ...userData } = user;
  return { data: { user: userData, session }, error: null };
}

export async function mockInvalidateSession(token: string) {
  const index = mockSessions.findIndex(s => s.session_token === token);
  if (index > -1) {
    mockSessions.splice(index, 1);
  }
  return { success: true };
}

// ============================================================================
// VIDEO OPERATIONS
// ============================================================================

export async function mockGetAllVideos() {
  return { data: mockVideos, error: null };
}

export async function mockGetVideoById(id: string) {
  const video = mockVideos.find(v => v.id === id);
  if (video) {
    return { data: video, error: null };
  }
  return { data: null, error: 'Video not found' };
}

export async function mockCreateVideo(videoData: any) {
  const newVideo = {
    id: generateId(),
    ...videoData,
    created_at: new Date(),
    updated_at: new Date()
  };

  mockVideos.push(newVideo);
  return { data: newVideo, error: null };
}

export async function mockUpdateVideo(id: string, videoData: any) {
  const index = mockVideos.findIndex(v => v.id === id);
  if (index > -1) {
    mockVideos[index] = {
      ...mockVideos[index],
      ...videoData,
      updated_at: new Date()
    };
    return { data: mockVideos[index], error: null };
  }
  return { data: null, error: 'Video not found' };
}

export async function mockDeleteVideo(id: string) {
  const index = mockVideos.findIndex(v => v.id === id);
  if (index > -1) {
    mockVideos.splice(index, 1);
    return { success: true };
  }
  return { success: false };
}
