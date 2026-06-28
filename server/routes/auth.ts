import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logAudit } from '../database';
import { verifySessionToken, optionalSession } from '../middleware/auth';
import { AuthPayload, RegisterPayload, AuthResponse, StoredUser } from '../types';
import {
  mockFindUserByEmail,
  mockCreateUser,
  mockCreateSession,
  mockInvalidateSession,
  mockGetUserById
} from '../mock-db';

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function buildUserId(email: string, role: string): string {
  const seed = email
    .trim()
    .toLowerCase()
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${role.slice(0, 3).toUpperCase()}-${String(seed).padStart(4, '0')}`;
}

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

router.post('/login', optionalSession, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AuthPayload;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error } = await mockFindUserByEmail(normalizedEmail);

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error during login'
      });
    }

    if (!user || user.password_hash !== hashPassword(password)) {
      await logAudit(user?.id || null, 'LOGIN_FAILED', 'user', normalizedEmail, {
        reason: user ? 'invalid_password' : 'user_not_found'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const sessionToken = generateSessionToken();
    const session = await mockCreateSession(user.id, sessionToken);

    if (session.error) {
      console.error('Session creation error:', session.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create session'
      });
    }

    await logAudit(user.id, 'LOGIN_SUCCESS', 'user', user.id);

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

router.post('/register', async (req: Request, res: Response) => {
  try {
    const payload = req.body as RegisterPayload;
    const { email, password, name, role, student_number, course, year_level, section, employee_id, department } = payload;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, name, and role are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await mockFindUserByEmail(normalizedEmail);

    if (existing.error) {
      return res.status(500).json({
        success: false,
        message: 'Database error during registration'
      });
    }

    if (existing.data) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const userId = buildUserId(normalizedEmail, role);
    const userData: any = {
      email: normalizedEmail,
      password_hash: hashPassword(password),
      name: name.trim(),
      role,
      user_id: userId,
      registration_date: new Date().toISOString(),
      account_status: 'Active',
      online_status: 'offline'
    };

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

    const { data: createdUser, error: insertError } = await mockCreateUser(userData);
    if (insertError || !createdUser) {
      console.error('User insertion error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    const sessionToken = generateSessionToken();
    await mockCreateSession(createdUser.id, sessionToken);
    await logAudit(createdUser.id, 'REGISTER', 'user', userId, {});

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

router.get('/me', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { data: user, error } = await mockGetUserById(req.user.user_id);
    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: formatUserResponse(user),
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

router.post('/logout', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.sessionToken) {
      return res.status(400).json({
        success: false,
        message: 'No session token provided'
      });
    }

    await mockInvalidateSession(req.sessionToken);

    if (req.user) {
      await logAudit(req.user.user_id, 'LOGOUT', 'user', req.user.user_id, {});
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

router.post('/refresh', verifySessionToken, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const newSessionToken = generateSessionToken();
    await mockInvalidateSession(req.sessionToken);
    await mockCreateSession(req.user.user_id, newSessionToken);

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
