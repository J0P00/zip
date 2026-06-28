import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

const allowedKeys = new Set([
  'videoLessons',
  'notifications',
  'monitoringRequests',
  'leaderboardUsers',
  'pendingSubmissions',
  'curriculumModules',
  'lessonItems',
  'adaptiveRules'
]);

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT key, value FROM app_state');
    const data = result.rows.reduce<Record<string, any>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/', requireAuth, async (req, res, next) => {
  try {
    const entries = Object.entries(req.body || {}).filter(([key]) => allowedKeys.has(key));

    for (const [key, value] of entries) {
      await query(
        `
          INSERT INTO app_state (key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [key, JSON.stringify(value)]
      );
    }

    res.json({ success: true, message: 'Application state synchronized.' });
  } catch (error) {
    next(error);
  }
});

export default router;

