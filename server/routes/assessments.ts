import { Router } from 'express';
import { query } from '../db/pool';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      `
        SELECT a.*, COALESCE(json_agg(q.*) FILTER (WHERE q.id IS NOT NULL), '[]') AS questions
        FROM assessments a
        LEFT JOIN assessment_questions q ON q.assessment_id = a.id
        GROUP BY a.id
        ORDER BY a.title
      `
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole(['admin', 'teacher']), async (req, res, next) => {
  try {
    const { id, title, topicName, questionsCount, timeLimitMinutes, difficulty, questions = [] } = req.body || {};
    await query(
      `
        INSERT INTO assessments (id, title, topic_name, questions_count, time_limit_minutes, difficulty)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          topic_name = EXCLUDED.topic_name,
          questions_count = EXCLUDED.questions_count,
          time_limit_minutes = EXCLUDED.time_limit_minutes,
          difficulty = EXCLUDED.difficulty
      `,
      [id, title, topicName || '', questionsCount || questions.length, timeLimitMinutes || 0, difficulty || 'Easy']
    );

    for (const question of questions) {
      await query(
        `
          INSERT INTO assessment_questions (
            id, assessment_id, question, code_snippet, options, correct_option_id, difficulty, points
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            question = EXCLUDED.question,
            code_snippet = EXCLUDED.code_snippet,
            options = EXCLUDED.options,
            correct_option_id = EXCLUDED.correct_option_id,
            difficulty = EXCLUDED.difficulty,
            points = EXCLUDED.points
        `,
        [
          question.id,
          id,
          question.question,
          question.codeSnippet || '',
          JSON.stringify(question.options || []),
          question.correctOptionId,
          question.difficulty || difficulty || '',
          question.points || 0
        ]
      );
    }

    res.status(201).json({ success: true, message: 'Assessment saved.' });
  } catch (error) {
    next(error);
  }
});

export default router;

