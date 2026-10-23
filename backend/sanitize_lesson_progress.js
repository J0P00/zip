/**
 * OOP Pedagogical Hub: Dynamic Lesson Catalog & Progression Audit Utility
 *
 * Safe, read-only progression audit (by default) for all students
 * against the active dynamic database lesson catalog.
 *
 * Core Features:
 *   1. Dynamic Catalog: Derives lesson sequence and tracks from the `lessons` table.
 *      No hardcoded 17/18 lesson limits. Teacher-created lessons appear seamlessly.
 *   2. Independent Prerequisites: Enforces completion of the 12 required Java OOP
 *      lessons (oop_lesson_1 .. oop_lesson_12) before Java Swing unlocks.
 *   3. Evidence Preservation:
 *      NEVER wipes student progress, video watch percentage, assessment scores,
 *      quiz attempts, practice code, or teacher feedback.
 *   4. Safe Read-Only Default:
 *      Defaults to read-only audit. Writing/reconciling completion flags requires
 *      explicitly passing `--apply` or `{ dryRun: false }`.
 *
 * CLI Usage:
 *   node backend/sanitize_lesson_progress.js              # Safe read-only audit (Default)
 *   node backend/sanitize_lesson_progress.js --apply      # Reconcile completion flags only (preserves progress)
 *   node backend/sanitize_lesson_progress.js --student=123
 */

const pool = require("./db");

const REQUIRED_CANONICAL_OOP_LESSON_IDS = Object.freeze([
  'oop_lesson_1', 'oop_lesson_2', 'oop_lesson_3', 'oop_lesson_4',
  'oop_lesson_5', 'oop_lesson_6', 'oop_lesson_7', 'oop_lesson_8',
  'oop_lesson_9', 'oop_lesson_10', 'oop_lesson_11', 'oop_lesson_12'
]);

/**
 * Pure evaluation function for a student's sequential progress against a dynamic catalog.
 *
 * @param {Array<Object>} catalog - Active ordered lessons from database
 * @param {Array<Object>} progressRows - Student's lesson_progress rows
 * @param {Object} [options] - Configuration options
 * @returns {Object} Detailed audit report separating evidence from access violations
 */
function auditStudentSequentialProgress(catalog, progressRows = [], options = {}) {
  const isSwingLesson = (l) =>
    String(l.id || '').startsWith('swing_') ||
    l.course_id === 'java_swing' ||
    String(l.module || '').toLowerCase().includes('swing') ||
    l.track === 'swing';

  // Sort catalog: OOP lessons first, then Swing lessons, each by configured sequence
  const sortedCatalog = [...catalog].sort((a, b) => {
    const aSwing = isSwingLesson(a) ? 1 : 0;
    const bSwing = isSwingLesson(b) ? 1 : 0;
    if (aSwing !== bSwing) return aSwing - bSwing;
    const seqDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
    if (seqDiff !== 0) return seqDiff;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // Map student progress rows by lesson ID
  const progressByLessonId = new Map();
  for (const row of progressRows) {
    if (row && row.lesson_id) {
      progressByLessonId.set(String(row.lesson_id), row);
    }
  }

  // 1. Check completion of the 12 required OOP lessons
  let completedRequiredOOPCount = 0;
  for (const reqId of REQUIRED_CANONICAL_OOP_LESSON_IDS) {
    const row = progressByLessonId.get(reqId);
    if (row) {
      const isComplete =
        Boolean(row.video_completed) &&
        Boolean(row.quiz_passed ?? row.assessment_passed) &&
        Boolean(row.practice_submitted || row.practice_completed);
      if (isComplete) completedRequiredOOPCount++;
    }
  }
  const requiredOOPComplete = completedRequiredOOPCount >= REQUIRED_CANONICAL_OOP_LESSON_IDS.length;

  let oopChainBroken = false;
  let oopBreakLesson = null;
  let oopBreakReason = null;

  let swingChainBroken = false;
  let swingBreakLesson = null;
  let swingBreakReason = null;

  const legitimateCompletions = [];
  const inProgressLessons = [];
  const accessViolations = [];
  const reconciledFlags = [];

  for (let i = 0; i < sortedCatalog.length; i++) {
    const lesson = sortedCatalog[i];
    const isSwing = isSwingLesson(lesson);
    const row = progressByLessonId.get(lesson.id);

    // Track historical evidence safely
    const hasEvidence = Boolean(
      row && (
        row.video_completed ||
        row.quiz_passed ||
        row.assessment_passed ||
        row.practice_submitted ||
        row.practice_completed ||
        row.completed
      )
    );

    // -------------------------------------------------------------------------
    // SWING COURSE TRACK EVALUATION
    // -------------------------------------------------------------------------
    if (isSwing) {
      if (!requiredOOPComplete) {
        if (hasEvidence) {
          accessViolations.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            sequence: lesson.sequence,
            track: 'Swing',
            violationType: 'SWING_PREREQUISITE_INCOMPLETE',
            reason: `Accessed Swing before completing all 12 required OOP lessons (${completedRequiredOOPCount}/12 completed)`,
            historicalEvidence: {
              video_completed: Boolean(row.video_completed),
              quiz_passed: Boolean(row.quiz_passed ?? row.assessment_passed),
              practice_submitted: Boolean(row.practice_submitted || row.practice_completed),
              wasMarkedCompleted: Boolean(row.completed)
            }
          });

          if (row.completed) {
            reconciledFlags.push({
              rowId: row.id,
              lessonId: lesson.id,
              action: 'reconcile_completion_false'
            });
          }
        }
        continue;
      }

      // 12 Required OOP lessons are complete; now evaluate Swing sequential progression
      if (swingChainBroken) {
        if (hasEvidence) {
          accessViolations.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            sequence: lesson.sequence,
            track: 'Swing',
            violationType: 'OUT_OF_SEQUENCE_ACCESS',
            reason: `Predecessor Swing lesson ${swingBreakLesson.id} ("${swingBreakLesson.title}") incomplete (${swingBreakReason})`,
            historicalEvidence: {
              video_completed: Boolean(row.video_completed),
              quiz_passed: Boolean(row.quiz_passed ?? row.assessment_passed),
              practice_submitted: Boolean(row.practice_submitted || row.practice_completed),
              wasMarkedCompleted: Boolean(row.completed)
            }
          });

          if (row.completed) {
            reconciledFlags.push({
              rowId: row.id,
              lessonId: lesson.id,
              action: 'reconcile_completion_false'
            });
          }
        }
      } else {
        // Predecessor Swing chain intact
        if (row) {
          const isComplete =
            Boolean(row.video_completed) &&
            Boolean(row.quiz_passed ?? row.assessment_passed) &&
            Boolean(row.practice_submitted || row.practice_completed);

          if (isComplete) {
            legitimateCompletions.push({
              lessonId: lesson.id,
              title: lesson.title,
              sequence: lesson.sequence,
              track: 'Swing'
            });
          } else {
            swingChainBroken = true;
            swingBreakLesson = lesson;
            swingBreakReason = !row.video_completed ? 'video <95%' : (!row.quiz_passed ? 'assessment <80%' : 'practice unsubmitted');
            inProgressLessons.push({ lessonId: lesson.id, title: lesson.title, track: 'Swing', reason: swingBreakReason });

            if (row.completed) {
              reconciledFlags.push({
                rowId: row.id,
                lessonId: lesson.id,
                action: 'reconcile_completion_false'
              });
            }
          }
        } else {
          swingChainBroken = true;
          swingBreakLesson = lesson;
          swingBreakReason = 'not started (no progress record)';
          inProgressLessons.push({ lessonId: lesson.id, title: lesson.title, track: 'Swing', reason: swingBreakReason });
        }
      }
      continue;
    }

    // -------------------------------------------------------------------------
    // OOP COURSE TRACK EVALUATION
    // -------------------------------------------------------------------------
    if (oopChainBroken) {
      if (hasEvidence) {
        accessViolations.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          sequence: lesson.sequence,
          track: 'OOP',
          violationType: 'OUT_OF_SEQUENCE_ACCESS',
          reason: `Predecessor OOP lesson ${oopBreakLesson.id} ("${oopBreakLesson.title}") incomplete (${oopBreakReason})`,
          historicalEvidence: {
            video_completed: Boolean(row.video_completed),
            quiz_passed: Boolean(row.quiz_passed ?? row.assessment_passed),
            practice_submitted: Boolean(row.practice_submitted || row.practice_completed),
            wasMarkedCompleted: Boolean(row.completed)
          }
        });

        if (row.completed) {
          reconciledFlags.push({
            rowId: row.id,
            lessonId: lesson.id,
            action: 'reconcile_completion_false'
          });
        }
      }
    } else {
      if (row) {
        const isComplete =
          Boolean(row.video_completed) &&
          Boolean(row.quiz_passed ?? row.assessment_passed) &&
          Boolean(row.practice_submitted || row.practice_completed);

        if (isComplete) {
          legitimateCompletions.push({
            lessonId: lesson.id,
            title: lesson.title,
            sequence: lesson.sequence,
            track: 'OOP'
          });
        } else {
          oopChainBroken = true;
          oopBreakLesson = lesson;
          oopBreakReason = !row.video_completed ? 'video <95%' : (!row.quiz_passed ? 'assessment <80%' : 'practice unsubmitted');
          inProgressLessons.push({ lessonId: lesson.id, title: lesson.title, track: 'OOP', reason: oopBreakReason });

          if (row.completed) {
            reconciledFlags.push({
              rowId: row.id,
              lessonId: lesson.id,
              action: 'reconcile_completion_false'
            });
          }
        }
      } else {
        oopChainBroken = true;
        oopBreakLesson = lesson;
        oopBreakReason = 'not started (no progress record)';
        inProgressLessons.push({ lessonId: lesson.id, title: lesson.title, track: 'OOP', reason: oopBreakReason });
      }
    }
  }

  return {
    completedRequiredOOPCount,
    requiredOOPComplete,
    legitimateCompletions,
    inProgressLessons,
    accessViolations,
    reconciledFlags
  };
}

/**
 * Loads dynamic active lesson catalog from database without fixed limits.
 */
async function loadDynamicCatalog(client) {
  const result = await client.query(`
    SELECT id, title, module, course_id, track, sequence, status
    FROM lessons
    WHERE status <> 'Archived'
    ORDER BY
      CASE
        WHEN id LIKE 'swing_%' OR COALESCE(course_id, '') = 'java_swing' OR LOWER(COALESCE(module, '')) LIKE '%swing%' OR COALESCE(track, '') = 'swing' THEN 1
        ELSE 0
      END ASC,
      sequence ASC,
      id ASC
  `);
  return result.rows;
}

/**
 * Runs progression audit and optional safe completion reconciliation.
 */
async function auditProgress(clientOrPool, options = {}) {
  const applyChanges = Boolean(options.apply || options.commit || options.dryRun === false);
  const targetStudentId = options.studentId || null;

  const client = typeof clientOrPool.connect === 'function' ? await clientOrPool.connect() : clientOrPool;
  const shouldRelease = typeof clientOrPool.connect === 'function';

  try {
    if (applyChanges) {
      await client.query("BEGIN");
    }

    const catalog = await loadDynamicCatalog(client);

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
    let totalReconciled = 0;
    const auditLog = [];

    for (const student of students) {
      const progressRes = await client.query(
        `SELECT * FROM lesson_progress WHERE student_id = $1`,
        [student.id]
      );
      const studentRows = progressRes.rows;

      const audit = auditStudentSequentialProgress(catalog, studentRows, options);

      if (audit.accessViolations.length > 0) {
        studentsWithViolations++;
        totalViolations += audit.accessViolations.length;

        for (const v of audit.accessViolations) {
          auditLog.push({
            studentId: student.id,
            studentEmail: student.email,
            lessonId: v.lessonId,
            lessonTitle: v.lessonTitle,
            track: v.track,
            violationType: v.violationType,
            reason: v.reason,
            evidence: v.historicalEvidence
          });
        }
      }

      // Reconcile completion flags only if explicitly applied (NEVER modifies historical evidence)
      if (applyChanges && audit.reconciledFlags.length > 0) {
        for (const rec of audit.reconciledFlags) {
          await client.query(
            `UPDATE lesson_progress SET completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE id = $1`,
            [rec.rowId]
          );
          totalReconciled++;
        }
      }
    }

    if (applyChanges) {
      await client.query("COMMIT");
    }

    return {
      applyChanges,
      isReadOnly: !applyChanges,
      catalogSize: catalog.length,
      totalStudents,
      studentsWithViolations,
      totalViolations,
      totalReconciled,
      auditLog
    };
  } catch (err) {
    if (applyChanges) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    throw err;
  } finally {
    if (shouldRelease) client.release();
  }
}

// -----------------------------------------------------------------------------
// CLI Execution
// -----------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const applyChanges = args.includes('--apply') || args.includes('--commit');
  const studentArg = args.find(a => a.startsWith('--student='));
  const studentId = studentArg ? studentArg.split('=')[1] : null;

  console.log("================================================================================");
  console.log("🔍 OOP PEDAGOGICAL HUB: SAFE PROGRESSION & DYNAMIC CATALOG AUDIT");
  console.log(`Mode   : ${applyChanges ? "RECONCILING COMPLETION FLAGS (Preserving Evidence)" : "READ-ONLY AUDIT (Safe / Zero DB Writes)"}`);
  if (studentId) console.log(`Target : Student ${studentId}`);
  console.log("================================================================================\n");

  auditProgress(pool, { apply: applyChanges, studentId })
    .then(result => {
      console.log(`Catalog Loaded : ${result.catalogSize} active dynamic lessons from database`);
      console.log(`Students Audited: ${result.totalStudents}\n`);

      if (result.auditLog.length > 0) {
        console.log("--- Sample of Detected Access Sequence Violations (Evidence Preserved) ---");
        result.auditLog.slice(0, 20).forEach(item => {
          console.log(`  [${item.track}] ${item.studentEmail} -> Lesson: ${item.lessonId} ("${item.lessonTitle}")`);
          console.log(`        Violation : ${item.violationType} (${item.reason})`);
          console.log(`        Evidence  : Video=${item.evidence.video_completed}, Quiz=${item.evidence.quiz_passed}, Practice=${item.evidence.practice_submitted} [PRESERVED]`);
        });
        if (result.auditLog.length > 20) {
          console.log(`  ... and ${result.auditLog.length - 20} more records.`);
        }
        console.log();
      }

      console.log("================================================================================");
      console.log("📊 AUDIT SUMMARY");
      console.log("================================================================================");
      console.log(`Total Students Evaluated       : ${result.totalStudents}`);
      console.log(`Students with Access Violations: ${result.studentsWithViolations}`);
      console.log(`Total Access Violations Found  : ${result.totalViolations}`);
      console.log(`Historical Learning Data Wiped : 0 (All video, quiz, and practice preserved)`);
      if (result.applyChanges) {
        console.log(`Completion Flags Reconciled    : ${result.totalReconciled}`);
        console.log("\n✅ Completion flags safely reconciled while preserving all student work.");
      } else {
        console.log("\n🛡️  Read-only audit completed. Database untouched. Pass --apply to reconcile completion flags.");
      }
      console.log("================================================================================\n");
      pool.end();
    })
    .catch(err => {
      console.error("\n❌ Audit failed with error:", err.message);
      pool.end();
      process.exit(1);
    });
}

module.exports = {
  REQUIRED_CANONICAL_OOP_LESSON_IDS,
  auditProgress,
  auditStudentSequentialProgress,
  loadDynamicCatalog
};
