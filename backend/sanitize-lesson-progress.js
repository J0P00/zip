/**
 * OOP Pedagogical Hub: Sequential Lesson Progress Sanitization Utility
 *
 * Evaluates lesson progression sequentially (Lesson 1 to 18) for all students.
 * Revokes access, locks, or deletes any advanced lesson records whose
 * immediate predecessor does not strictly meet all three completion requirements:
 *   1. video_completed === true
 *   2. quiz_passed === true (or assessment_passed === true)
 *   3. practice_submitted === true (or practice_completed === true)
 *
 * Usage via CLI:
 *   node backend/sanitize-lesson-progress.js [--dry-run] [--action=lock|delete] [--student=<id>]
 *
 * Programmatic usage:
 *   const { sanitizeLessonProgress } = require('./sanitize-lesson-progress');
 *   const results = await sanitizeLessonProgress(pool, { action: 'lock', dryRun: false });
 */

const pool = require("./db");

/**
 * Pure evaluation function for a single student's sequential lesson progress.
 * Can be used in-memory for testing or during database batch execution.
 *
 * @param {Array<{ sequence: number, id: string }>} lessons - Canonical ordered lessons (seq 1 to 18)
 * @param {Array<Object>} progressRows - Existing lesson_progress rows for the student
 * @param {Object} options - { action: 'lock' | 'delete' }
 * @returns {Object} Evaluation summary and list of actions to take
 */
function evaluateSequentialProgress(lessons, progressRows, options = {}) {
  const action = (options.action || 'lock').toLowerCase();
  const sortedLessons = [...lessons].sort((a, b) => a.sequence - b.sequence);

  // Map lesson progress rows by sequence
  const rowBySeq = new Map();
  for (const row of progressRows) {
    const seq = resolveLessonSequence(row, sortedLessons);
    if (seq !== null) {
      rowBySeq.set(seq, row);
    }
  }

  let chainBroken = false;
  let breakSeq = null;
  let breakReason = null;

  const validCompletions = [];
  const violations = [];

  for (const lesson of sortedLessons) {
    const seq = lesson.sequence;
    const row = rowBySeq.get(seq);

    if (chainBroken) {
      // Any progress on an advanced lesson after a broken chain is an unauthorized violation!
      if (row) {
        violations.push({
          rowId: row.id,
          sequence: seq,
          lessonId: row.lesson_id || lesson.id,
          action,
          reason: `Predecessor Lesson ${breakSeq} incomplete (${breakReason})`,
          originalRow: { ...row }
        });
      }
    } else {
      // Chain is currently intact
      if (row) {
        const isVideoComplete = Boolean(row.video_completed);
        const isQuizPassed = Boolean(row.quiz_passed ?? row.assessment_passed);
        const isPracticeSubmitted = Boolean(row.practice_submitted || row.practice_completed);

        const meetsAllThree = isVideoComplete && isQuizPassed && isPracticeSubmitted;

        if (meetsAllThree) {
          validCompletions.push({
            rowId: row.id,
            sequence: seq,
            lessonId: row.lesson_id || lesson.id,
            wasMarkedComplete: Boolean(row.completed)
          });
        } else {
          // Predecessor requirement failed!
          chainBroken = true;
          breakSeq = seq;
          const missing = [];
          if (!isVideoComplete) missing.push("video incomplete (<95%)");
          if (!isQuizPassed) missing.push("assessment not passed (<80%)");
          if (!isPracticeSubmitted) missing.push("practice not submitted");
          breakReason = missing.join(", ");

          // If this row itself was erroneously marked completed, flag it
          if (row.completed) {
            violations.push({
              rowId: row.id,
              sequence: seq,
              lessonId: row.lesson_id || lesson.id,
              action: 'revoke_completion',
              reason: `Marked completed but missing requirements: ${breakReason}`,
              originalRow: { ...row }
            });
          }
        }
      } else {
        // Missing progress row means student hasn't reached/completed this lesson
        chainBroken = true;
        breakSeq = seq;
        breakReason = "no progress record (not started)";
      }
    }
  }

  return {
    validCompletions,
    violations,
    chainBrokenAt: breakSeq,
    chainBrokenReason: breakReason
  };
}

/**
 * Resolves the integer sequence (1 to 18) for a lesson progress row.
 */
function resolveLessonSequence(row, lessons = []) {
  const lessonId = String(row.lesson_id || '').trim();

  // 1. Direct match in lessons catalog
  const match = lessons.find(l => 
    l.id === lessonId || 
    l.id === `oop_lesson_${lessonId}` ||
    l.id === `swing_lesson_${lessonId}` ||
    String(l.sequence) === lessonId
  );
  if (match) return match.sequence;

  // 2. Regex matching
  const oopMatch = lessonId.match(/^oop_lesson_(\d+)$/i);
  if (oopMatch) return parseInt(oopMatch[1], 10);

  const swingMatch = lessonId.match(/^swing_lesson_(\d+)$/i);
  if (swingMatch) return 12 + parseInt(swingMatch[1], 10);

  const plainSeqMatch = lessonId.match(/^lesson_(\d+)$/i);
  if (plainSeqMatch) return parseInt(plainSeqMatch[1], 10);

  if (/^\d+$/.test(lessonId)) return parseInt(lessonId, 10);

  return null;
}

/**
 * Builds canonical lesson array for sequence 1 to 18.
 * Queries `lessons` table with fallback to default OOP (1-12) and Swing (13-17/18) catalog.
 */
async function loadCanonicalLessons(client, minSeq = 1, maxSeq = 18) {
  try {
    const res = await client.query(
      `SELECT id, sequence, title FROM lessons WHERE sequence BETWEEN $1 AND $2 AND status <> 'Archived' ORDER BY sequence ASC`,
      [minSeq, maxSeq]
    );
    if (res.rowCount >= 12) {
      return res.rows.map(r => ({ id: r.id, sequence: Number(r.sequence), title: r.title }));
    }
  } catch (err) {
    // Fallback if table doesn't exist
  }

  // Built-in canonical fallback
  const lessons = [];
  for (let i = 1; i <= 12; i++) {
    lessons.push({ id: `oop_lesson_${i}`, sequence: i, title: `OOP Lesson ${i}` });
  }
  for (let i = 1; i <= 6; i++) {
    const seq = 12 + i;
    if (seq <= maxSeq) {
      lessons.push({ id: `swing_lesson_${i}`, sequence: seq, title: `Swing Lesson ${i}` });
    }
  }
  return lessons.filter(l => l.sequence >= minSeq && l.sequence <= maxSeq);
}

/**
 * Main sanitization worker.
 *
 * @param {import('pg').Pool | import('pg').PoolClient} clientOrPool - Database pool or client
 * @param {Object} options - Configuration options
 * @param {boolean} [options.dryRun=false] - Preview mode without writing to DB
 * @param {string} [options.action='lock'] - 'lock' or 'delete'
 * @param {number} [options.minSequence=1] - Minimum lesson sequence (default 1)
 * @param {number} [options.maxSequence=18] - Maximum lesson sequence (default 18)
 * @param {string} [options.studentId] - Optional student UUID filter
 * @returns {Promise<Object>} Sanitization summary
 */
async function sanitizeLessonProgress(clientOrPool, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const action = (options.action || 'lock').toLowerCase() === 'delete' ? 'delete' : 'lock';
  const minSeq = options.minSequence || 1;
  const maxSeq = options.maxSequence || 18;
  const targetStudentId = options.studentId || null;

  const client = typeof clientOrPool.connect === 'function' ? await clientOrPool.connect() : clientOrPool;
  const shouldRelease = typeof clientOrPool.connect === 'function';

  try {
    if (!dryRun) {
      await client.query("BEGIN");
    }

    const canonicalLessons = await loadCanonicalLessons(client, minSeq, maxSeq);

    // Fetch students to evaluate
    let studentSql = `
      SELECT DISTINCT u.id, u.email, u.name
      FROM users u
      WHERE u.role = 'student'
         OR u.id IN (SELECT DISTINCT student_id FROM lesson_progress WHERE student_id IS NOT NULL)
    `;
    const studentParams = [];
    if (targetStudentId) {
      studentSql += ` AND (u.id::text = $1 OR u.user_id = $1 OR LOWER(u.email) = LOWER($1))`;
      studentParams.push(targetStudentId);
    }
    studentSql += ` ORDER BY u.email`;

    const studentsRes = await client.query(studentSql, studentParams);
    const students = studentsRes.rows;

    let totalStudents = students.length;
    let studentsWithViolations = 0;
    let totalViolations = 0;
    let totalLocked = 0;
    let totalDeleted = 0;
    let totalCompletionsUpdated = 0;
    const auditLog = [];

    for (const student of students) {
      // Load student's progress rows
      const progressRes = await client.query(
        `SELECT * FROM lesson_progress WHERE student_id = $1`,
        [student.id]
      );
      const progressRows = progressRes.rows;

      const evalResult = evaluateSequentialProgress(canonicalLessons, progressRows, { action });

      if (evalResult.violations.length > 0) {
        studentsWithViolations++;
        totalViolations += evalResult.violations.length;

        for (const violation of evalResult.violations) {
          auditLog.push({
            studentEmail: student.email,
            sequence: violation.sequence,
            lessonId: violation.lessonId,
            action: dryRun ? 'DRY_RUN_PREVIEW' : violation.action,
            reason: violation.reason
          });

          if (!dryRun) {
            if (violation.action === 'delete') {
              await client.query(`DELETE FROM lesson_progress WHERE id = $1`, [violation.rowId]);
              totalDeleted++;
            } else if (violation.action === 'revoke_completion') {
              await client.query(
                `UPDATE lesson_progress SET completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE id = $1`,
                [violation.rowId]
              );
              totalLocked++;
            } else {
              // Lock / revoke all progress flags
              await client.query(
                `UPDATE lesson_progress 
                 SET completed = FALSE,
                     completed_at = NULL,
                     video_completed = FALSE,
                     quiz_passed = FALSE,
                     practice_submitted = FALSE,
                     practice_completed = FALSE,
                     updated_at = NOW()
                 WHERE id = $1`,
                [violation.rowId]
              );
              totalLocked++;
            }
          }
        }
      }

      // Ensure legitimate completions have completed = TRUE
      if (!dryRun) {
        for (const valid of evalResult.validCompletions) {
          if (!valid.wasMarkedComplete) {
            await client.query(
              `UPDATE lesson_progress SET completed = TRUE, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $1`,
              [valid.rowId]
            );
            totalCompletionsUpdated++;
          }
        }
      }
    }

    if (!dryRun) {
      await client.query("COMMIT");
    }

    return {
      dryRun,
      action,
      totalStudents,
      studentsWithViolations,
      totalViolations,
      totalLocked,
      totalDeleted,
      totalCompletionsUpdated,
      auditLog
    };
  } catch (err) {
    if (!dryRun) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    throw err;
  } finally {
    if (shouldRelease) {
      client.release();
    }
  }
}

// -----------------------------------------------------------------------------
// CLI Execution
// -----------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const deleteAction = args.includes('--action=delete') || args.includes('--delete');
  const action = deleteAction ? 'delete' : 'lock';

  const studentArg = args.find(a => a.startsWith('--student='));
  const studentId = studentArg ? studentArg.split('=')[1] : null;

  console.log("================================================================================");
  console.log("🛠️  OOP PEDAGOGICAL HUB: SEQUENTIAL PROGRESSION SANITIZER");
  console.log(`Mode   : ${dryRun ? "DRY-RUN (Preview Only)" : "COMMITTING CHANGES"}`);
  console.log(`Action : ${action.toUpperCase()}`);
  if (studentId) console.log(`Target : Student ${studentId}`);
  console.log("================================================================================\n");

  sanitizeLessonProgress(pool, { dryRun, action, studentId })
    .then(result => {
      if (result.auditLog.length > 0) {
        console.log("--- Sample of Sanitized Records ---");
        result.auditLog.slice(0, 25).forEach(item => {
          console.log(`  [Seq ${item.sequence}] ${item.studentEmail} | Lesson: ${item.lessonId} | ${item.action} | ${item.reason}`);
        });
        if (result.auditLog.length > 25) {
          console.log(`  ... and ${result.auditLog.length - 25} more records.`);
        }
        console.log();
      }

      console.log("================================================================================");
      console.log("📊 SANITIZATION SUMMARY");
      console.log("================================================================================");
      console.log(`Total Students Evaluated       : ${result.totalStudents}`);
      console.log(`Students with Violations       : ${result.studentsWithViolations}`);
      console.log(`Total Violations Detected      : ${result.totalViolations}`);
      if (!dryRun) {
        if (action === 'delete') {
          console.log(`Records Deleted from Database  : ${result.totalDeleted}`);
        } else {
          console.log(`Records Locked / Reset to False: ${result.totalLocked}`);
        }
        console.log(`Completions Synced to True     : ${result.totalCompletionsUpdated}`);
        console.log("\n✅ Database progression data successfully sanitized.");
      } else {
        console.log("\n🔍 Dry-run complete. Run without --dry-run to apply changes.");
      }
      console.log("================================================================================\n");
      pool.end();
    })
    .catch(err => {
      console.error("\n❌ Sanitization failed with error:", err.message);
      pool.end();
      process.exit(1);
    });
}

module.exports = {
  sanitizeLessonProgress,
  evaluateSequentialProgress,
  resolveLessonSequence,
  loadCanonicalLessons
};
