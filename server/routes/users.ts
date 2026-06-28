import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';
import { findUserById, toClientUser } from '../utils/users';

const router = Router();

router.get('/', requireAuth, requireRole(['admin', 'teacher']), async (_req, res, next) => {
  try {
    const result = await query(
      `
        SELECT u.*, s.student_number, s.course, s.year_level, s.section, s.program_status,
          t.employee_id, t.department, t.specialization, t.assigned_courses,
          a.admin_id, a.system_role, a.access_level
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN admins a ON a.user_id = u.id
        ORDER BY u.created_at DESC
      `
    );

    res.json({ success: true, data: result.rows.map(toClientUser) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (req.authUser!.role !== 'admin' && req.authUser!.id !== user.id) {
      return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
    }

    res.json({ success: true, data: toClientUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  const client = await import('../db/pool').then(module => module.pool.connect());

  try {
    if (req.authUser!.role !== 'admin' && req.authUser!.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
    }

    const existing = await findUserById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });

    const updates = req.body || {};

    await client.query('BEGIN');
    await client.query(
      `
        UPDATE users SET
          name = COALESCE($2, name),
          contact_number = COALESCE($3, contact_number),
          address = COALESCE($4, address),
          date_of_birth = COALESCE($5, date_of_birth),
          account_status = COALESCE($6, account_status),
          online_status = COALESCE($7, online_status),
          avatar = COALESCE($8, avatar)
        WHERE id = $1
      `,
      [
        req.params.id,
        updates.name,
        updates.contactNumber,
        updates.address,
        updates.dateOfBirth,
        updates.accountStatus,
        updates.onlineStatus,
        updates.avatar
      ]
    );

    if (existing.role === 'student') {
      await client.query(
        `
          UPDATE students SET
            student_number = COALESCE($2, student_number),
            course = COALESCE($3, course),
            year_level = COALESCE($4, year_level),
            section = COALESCE($5, section),
            program_status = COALESCE($6, program_status)
          WHERE user_id = $1
        `,
        [req.params.id, updates.studentNumber, updates.course, updates.yearLevel, updates.section, updates.programStatus]
      );
    }

    if (existing.role === 'teacher') {
      await client.query(
        `
          UPDATE teachers SET
            employee_id = COALESCE($2, employee_id),
            department = COALESCE($3, department),
            specialization = COALESCE($4, specialization),
            assigned_courses = COALESCE($5, assigned_courses)
          WHERE user_id = $1
        `,
        [req.params.id, updates.employeeId, updates.department, updates.specialization, updates.assignedCourses]
      );
    }

    await client.query('COMMIT');

    const user = await findUserById(req.params.id);
    res.json({ success: true, data: toClientUser(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;

