import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const toDbParams = (body: any) => [
  body.id,
  body.courseId || null,
  body.title,
  body.duration || '',
  body.sequence || 0,
  body.status || 'locked',
  body.videoUrl,
  body.description || '',
  JSON.stringify(body.concepts || []),
  body.thumbnailUrl || '',
  body.topic || '',
  body.difficulty || '',
  body.language || '',
  body.module || '',
  body.category || '',
  Boolean(body.isArchived),
  body.unlockedAssessmentId || null,
  body.views || 0,
  body.avgWatchTime || 0,
  JSON.stringify(body.completedStudents || []),
  JSON.stringify(body.inProgressStudents || []),
  JSON.stringify(body.notStartedStudents || []),
  body.progressPercent || 0,
  JSON.stringify(body)
];

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT metadata FROM video_tutorials ORDER BY sequence, title');
    res.json({ success: true, data: result.rows.map(row => row.metadata) });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    await query(
      `
        INSERT INTO video_tutorials (
          id, course_id, title, duration, sequence, status, video_url, description,
          concepts, thumbnail_url, topic, difficulty, language, module, category,
          is_archived, unlocked_assessment_id, views, avg_watch_time,
          completed_students, in_progress_students, not_started_students, progress_percent, metadata
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9::jsonb, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20::jsonb, $21::jsonb, $22::jsonb, $23, $24::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = NOW()
      `,
      toDbParams(req.body)
    );
    res.status(201).json({ success: true, data: req.body });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    await query(
      `
        UPDATE video_tutorials SET metadata = $2::jsonb, updated_at = NOW()
        WHERE id = $1
      `,
      [req.params.id, JSON.stringify(req.body)]
    );
    res.json({ success: true, data: req.body });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    await query('DELETE FROM video_tutorials WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Video deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;

