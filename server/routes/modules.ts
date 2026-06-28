import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM modules ORDER BY title');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id, title, status, lessonsCount, lastUpdated, category } = req.body || {};
    const result = await query(
      `
        INSERT INTO modules (id, title, status, lessons_count, last_updated, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [id, title, status || 'Draft', lessonsCount || 0, lastUpdated || '', category || '']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const { title, status, lessonsCount, lastUpdated, category } = req.body || {};
    const result = await query(
      `
        UPDATE modules SET
          title = COALESCE($2, title),
          status = COALESCE($3, status),
          lessons_count = COALESCE($4, lessons_count),
          last_updated = COALESCE($5, last_updated),
          category = COALESCE($6, category)
        WHERE id = $1
        RETURNING *
      `,
      [req.params.id, title, status, lessonsCount, lastUpdated, category]
    );
    if (!result.rowCount) return res.status(404).json({ success: false, message: 'Module not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    await query('DELETE FROM modules WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Module deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;

