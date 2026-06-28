import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:studentId', requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === 'student' && req.authUser!.id !== req.params.studentId) {
      return res.status(403).json({ success: false, message: 'Students can only view their own progress.' });
    }

    const result = await query('SELECT * FROM student_progress WHERE student_user_id = $1 ORDER BY updated_at DESC', [req.params.studentId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.put('/:studentId', requireAuth, async (req, res, next) => {
  try {
    if (req.authUser!.role === 'student' && req.authUser!.id !== req.params.studentId) {
      return res.status(403).json({ success: false, message: 'Students can only update their own progress.' });
    }

    const { videoId, lastPosition = 0, completionPercentage = 0, completed, notes = '' } = req.body || {};
    if (!videoId) return res.status(400).json({ success: false, message: 'videoId is required.' });

    const result = await query(
      `
        INSERT INTO student_progress (
          student_user_id, video_id, last_position, completion_percentage, completed, date_completed, notes
        )
        VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 THEN NOW() ELSE NULL END, $6)
        ON CONFLICT (student_user_id, video_id) DO UPDATE SET
          last_position = EXCLUDED.last_position,
          completion_percentage = GREATEST(student_progress.completion_percentage, EXCLUDED.completion_percentage),
          completed = student_progress.completed OR EXCLUDED.completed,
          date_completed = CASE
            WHEN student_progress.completed THEN student_progress.date_completed
            WHEN EXCLUDED.completed THEN NOW()
            ELSE NULL
          END,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `,
      [req.params.studentId, videoId, lastPosition, completionPercentage, Boolean(completed), notes]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;

