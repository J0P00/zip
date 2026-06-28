import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured, logAudit } from '../database';
import { verifySessionToken, optionalSession } from '../middleware/auth';
import { AuthPayload, RegisterPayload, AuthResponse, StoredUser } from '../types';
import {
  initializeMockData,
  mockFindUserByEmail,
  mockVerifyPassword,
  mockCreateUser,
  mockCreateSession,
  mockVerifySessionToken,
  mockInvalidateSession,
  mockGetUserById
} from '../mock-db';

const router = Router();

// Initialize mock data on first load (for development mode)
let mockDataInitialized = false;

/**
 * Helper: Hash password (in production, use bcrypt)
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Helper: Generate session token
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper: Build user ID from email and role
 */
function buildUserId(email: string, role: string): string {
  const seed = email
    .trim()
    .toLowerCase()
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${role.slice(0, 3).toUpperCase()}-${String(seed).padStart(4, '0')}`;
}

/**
 * Format user data for frontend
 */
function formatUserResponse(user: any): StoredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    user_id: user.user_id,
    registration_date: user.registration_date,
    account_status: user.account_status,
    student_number: user.student_number,
    course: user.course,
    year_level: user.year_level,
    section: user.section,
    program_status: user.program_status,
    employee_id: user.employee_id,
    department: user.department,
    specialization: user.specialization,
    assigned_courses: user.assigned_courses,
    admin_id: user.admin_id,
    system_role: user.system_role,
    access_level: user.access_level,
    contact_number: user.contact_number,
    address: user.address,
    date_of_birth: user.date_of_birth,
    online_status: user.online_status,
    avatar: user.avatar,
    terms_agreement_accepted: user.terms_agreement_accepted,
    terms_accepted_at: user.terms_accepted_at,
    terms_version: user.terms_version,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', optionalSession, async (req: Request, res: Response) => {
  try {
    // Initialize mock data if needed
    if (!isSupabaseConfigured && !mockDataInitialized) {
      initializeMockData();
      mockDataInitialized = true;
    }

    const { email, password } = req.body as AuthPayload;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Use appropriate backend
    let user: any = null;
    let queryError: any = null;

    if (isSupabaseConfigured) {
      // Query Supabase
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail);

      if (result.error) {
        queryError = result.error;
      } else {
        user = result.data && result.data.length > 0 ? result.data[0] : null;
      }
    } else {
      // Use mock database
      const result = await mockFindUserByEmail(normalizedEmail);
      if (result.error) {
        queryError = result.error;
      } else {
        user = result.data;
      }
    }

    if (queryError) {
      console.error('Database query error:', queryError);
      return res.status(500).json({
        success: false,
        message: 'Database error during login'
      });
    }

    if (!user) {
      // Log failed login attempt
      if (isSupabaseConfigured) {
        await logAudit(null, 'LOGIN_FAILED', 'user', normalizedEmail, { reason: 'user_not_found' });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const passwordHash = hashPassword(password);
    if (user.password_hash !== passwordHash) {
      // Log failed login attempt
      if (isSupabaseConfigured) {
        await logAudit(user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'invalid_password' });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7); // 7 days

    // Create session record
    if (isSupabaseConfigured) {
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          user_agent: req.headers['user-agent'],
          ip_address: req.ip,
          expires_at: sessionExpiry.toISOString()
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create session'
        });
      }
    } else {
      // Use mock session
      await mockCreateSession(user.id, sessionToken);
    }

    // Log successful login
    if (isSupabaseConfigured) {
      await logAudit(user.id, 'LOGIN_SUCCESS', 'user', user.id);
    }

    return res.json({
      success: true,
      message: 'Login successful',
      session_token: sessionToken,
      user: formatUserResponse(user)
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const payload = req.body as RegisterPayload;
    const { email, password, name, role, student_number, course, year_level, section, employee_id, department } = payload;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    let existingUser: any = null;
    let queryError: any = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail);
      queryError = error;
      existingUser = data && data.length > 0 ? data[0] : null;
    } else {
      // Mock data initialized automatically if needed
      if (!mockDataInitialized) {
        initializeMockData();
        mockDataInitialized = true;
      }
      const result = await mockFindUserByEmail(normalizedEmail);
      queryError = result.error;
      existingUser = result.data;
    }

    if (queryError) {
      return res.status(500).json({
        success: false,
        message: 'Database error during registration'
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user ID
    const userId = buildUserId(normalizedEmail, role);

    // Hash password
    const passwordHash = hashPassword(password);

    // Prepare user data based on role
    const userData: any = {
      email: normalizedEmail,
      password_hash: passwordHash,
      name: name.trim(),
      role,
      user_id: userId,
      registration_date: new Date().toISOString(),
      account_status: 'Active',
      online_status: 'offline'
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.student_number = student_number || '';
      userData.course = course || '';
      userData.year_level = year_level || '';
      userData.section = section || '';
      userData.program_status = 'Regular';
    } else if (role === 'teacher') {
      userData.employee_id = employee_id || '';
      userData.department = department || 'College of Computer Studies';
      userData.specialization = 'Object-Oriented Programming';
    } else if (role === 'admin') {
      userData.admin_id = userId;
      userData.system_role = 'Administrator';
      userData.access_level = 'Level 5 - Full Access';
    }

    // Insert user
    let createdUser: any = null;
    let insertError: any = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select();
      insertError = error;
      createdUser = data && data.length > 0 ? data[0] : null;
    } else {
      const result = await mockCreateUser(userData);
      insertError = result.error;
      createdUser = result.data;
    }

    if (insertError || !createdUser) {
      console.error('User insertion error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    // Log successful registration
    if (isSupabaseConfigured) {
      await logAudit(createdUser.id, 'REGISTER', 'user', userId, {});
    }

    // Generate session for immediate login
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    if (isSupabaseConfigured) {
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: createdUser.id,
          session_token: sessionToken,
          user_agent: req.headers['user-agent'],
          ip_address: req.ip,
          expires_at: sessionExpiry.toISOString()
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
      }
    } else {
      await mockCreateSession(createdUser.id, sessionToken);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: formatUserResponse(createdUser),
      session_token: sessionToken
    } as AuthResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info from session
 */
router.get('/me', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Fetch user data
    let user: any = null;
    let queryError: any = null;

    if (isSupabaseConfigured) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('id', req.user.user_id)
        .single();
      user = result.data;
      queryError = result.error;
    } else {
      const result = await mockGetUserById(req.user.user_id);
      user = result.data;
      queryError = result.error;
    }

    if (queryError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      user: formatUserResponse(user)
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user by invalidating session
 */
router.post('/logout', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.sessionToken) {
      return res.status(400).json({
        success: false,
        message: 'No session token provided'
      });
    }

    if (isSupabaseConfigured) {
      // Delete session
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', req.sessionToken);

      if (error) {
        console.error('Session deletion error:', error);
      }

      // Log logout
      if (req.user) {
        await logAudit(req.user.user_id, 'LOGOUT', 'user', req.user.user_id, {});
      }
    } else {
      await mockInvalidateSession(req.sessionToken);
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh session token
 */
router.post('/refresh', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Generate new session token
    const newSessionToken = generateSessionToken();
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    if (isSupabaseConfigured) {
      // Delete old session and create new one
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', req.sessionToken);

      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: req.user.user_id,
          session_token: newSessionToken,
          user_agent: req.headers['user-agent'],
          ip_address: req.ip,
          expires_at: sessionExpiry.toISOString()
        });

      if (insertError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to refresh session'
        });
      }
    } else {
      await mockInvalidateSession(req.sessionToken);
      await mockCreateSession(req.user.user_id, newSessionToken);
    }

    return res.status(200).json({
      success: true,
      message: 'Session refreshed',
      session_token: newSessionToken
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
