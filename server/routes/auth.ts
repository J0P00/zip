import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { hashPassword, signToken, verifyPassword } from '../utils/auth';
import { buildUserId, findUserByEmail, findUserById, toClientUser } from '../utils/users';

const router = Router();

const allowedRoles = ['student', 'teacher', 'admin'] as const;

router.post('/register', async (req, res, next) => {
  const client = await import('../db/pool').then(module => module.pool.connect());

  try {
    const {
      name,
      email,
      password,
      role,
      studentNumber,
      course,
      yearLevel,
      section,
      employeeId,
      department,
      specialization,
      assignedCourses,
      adminId,
      systemRole,
      accessLevel,
      termsVersion
    } = req.body || {};

    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name must be at least 3 characters.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be student, teacher, or admin.' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account is already registered with this email address.' });
    }

    const passwordHash = await hashPassword(password);
    const computedUserId = buildUserId(email, role);

    await client.query('BEGIN');

    const userResult = await client.query(
      `
        INSERT INTO users (
          user_id, name, email, password_hash, role,
          terms_agreement_accepted, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, LOWER($3), $4, $5, TRUE, NOW(), $6)
        RETURNING *
      `,
      [computedUserId, String(name).trim(), email, passwordHash, role, termsVersion || '2026.06.26']
    );

    const user = userResult.rows[0];

    if (role === 'student') {
      await client.query(
        `
          INSERT INTO students (user_id, student_number, course, year_level, section, program_status)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [user.id, studentNumber || computedUserId, course || '', yearLevel || '', section || '', 'Regular']
      );
    }

    if (role === 'teacher') {
      await client.query(
        `
          INSERT INTO teachers (user_id, employee_id, department, specialization, assigned_courses)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          user.id,
          employeeId || computedUserId,
          department || 'College of Computer Studies',
          specialization || 'Object-Oriented Programming',
          assignedCourses || 'OOP 101, Advanced Java'
        ]
      );
    }

    if (role === 'admin') {
      await client.query(
        `
          INSERT INTO admins (user_id, admin_id, system_role, access_level)
          VALUES ($1, $2, $3, $4)
        `,
        [user.id, adminId || computedUserId, systemRole || 'Administrator', accessLevel || 'Level 5 - Full Access']
      );
    }

    await client.query(
      `
        INSERT INTO user_terms_agreements (user_id, accepted, version, user_role, ip_address)
        VALUES ($1, TRUE, $2, $3, $4)
      `,
      [user.id, termsVersion || '2026.06.26', role, req.ip]
    );

    await client.query('COMMIT');

    const fullUser = await findUserById(user.id);
    const token = signToken({ id: user.id, userId: user.user_id, email: user.email, role });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: toClientUser(fullUser)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken({ id: user.id, userId: user.user_id, email: user.email, role: user.role });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: toClientUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (_req, res) => {
  return res.json({ success: true, message: 'Logout successful.' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.authUser!.id);
    return res.json({ success: true, user: toClientUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;

