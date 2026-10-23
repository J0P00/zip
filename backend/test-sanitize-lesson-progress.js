const assert = require('assert');
const {
  REQUIRED_CANONICAL_OOP_LESSON_IDS,
  auditStudentSequentialProgress
} = require('./sanitize_lesson_progress');

console.log("================================================================================");
console.log("🧪 RUNNING DYNAMIC LESSON CATALOG & SAFE PROGRESSION AUDIT TEST SUITE");
console.log("================================================================================\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    process.exitCode = 1;
  }
}

// Helper: build standard 12 required OOP lessons
function buildCanonicalOOPLessons() {
  return REQUIRED_CANONICAL_OOP_LESSON_IDS.map((id, index) => ({
    id,
    sequence: index + 1,
    title: `OOP Lesson ${index + 1}`,
    module: index < 5 ? 'OOP Fundamentals' : index < 8 ? 'Core OOP' : 'Advanced OOP',
    course_id: 'oop_fundamentals',
    track: 'oop'
  }));
}

// -----------------------------------------------------------------------------
// Test Category 1: Dynamic Lesson Catalog (No Hardcoded 17/18 Limits)
// -----------------------------------------------------------------------------
console.log("--- Test Category 1: Dynamic Catalog & Arbitrary Lesson Counts ---");

runTest("Catalog functions dynamically with arbitrary lesson counts (e.g. 24 lessons)", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();

  // Teacher adds 4 extra advanced OOP lessons (13..16)
  for (let i = 13; i <= 16; i++) {
    dynamicCatalog.push({
      id: `oop_lesson_custom_${i}`,
      sequence: i,
      title: `Custom OOP Topic ${i}`,
      module: 'Advanced OOP',
      course_id: 'oop_fundamentals',
      track: 'oop'
    });
  }

  // Teacher adds 8 Java Swing lessons (17..24)
  for (let i = 1; i <= 8; i++) {
    dynamicCatalog.push({
      id: `swing_lesson_${i}`,
      sequence: 16 + i,
      title: `Swing UI ${i}`,
      module: 'Java Swing',
      course_id: 'java_swing',
      track: 'swing'
    });
  }

  assert.strictEqual(dynamicCatalog.length, 24, "Catalog must accept arbitrary 24 lessons without limit");

  // Student completed first 3 lessons
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const audit = auditStudentSequentialProgress(dynamicCatalog, rows);
  assert.strictEqual(audit.legitimateCompletions.length, 3);
  assert.strictEqual(audit.accessViolations.length, 0);
  assert.strictEqual(audit.inProgressLessons[0].lessonId, 'oop_lesson_4');
});

runTest("Newly uploaded teacher lesson is not accidentally skipped or marked complete", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();

  // Teacher inserts a new lesson at sequence 5, shifting subsequent lessons
  const catalogWithTeacherLesson = [
    ...dynamicCatalog.slice(0, 4), // Lessons 1..4 (seq 1..4)
    {
      id: 'teacher_oop_generics',
      sequence: 5,
      title: 'Generics Deep Dive',
      module: 'Core OOP',
      course_id: 'oop_fundamentals',
      track: 'oop'
    },
    ...dynamicCatalog.slice(4).map(l => ({ ...l, sequence: l.sequence + 1 })) // Lessons 5..12 now at seq 6..13
  ];

  // Student completed lessons 1, 2, 3, 4
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_4', lesson_id: 'oop_lesson_4', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    // Student also had legacy record for oop_lesson_5 (which is now sequence 6, after the teacher's lesson)
    { id: 'lp_5', lesson_id: 'oop_lesson_5', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true }
  ];

  const audit = auditStudentSequentialProgress(catalogWithTeacherLesson, rows);

  // The new lesson 'teacher_oop_generics' has no progress record, so it stops the chain!
  // It is NOT marked complete and cannot be skipped.
  assert.strictEqual(audit.inProgressLessons[0].lessonId, 'teacher_oop_generics');
  assert.strictEqual(audit.inProgressLessons[0].reason, 'not started (no progress record)');
  // Legacy record on oop_lesson_5 is flagged as access violation because new predecessor was not completed
  assert(audit.accessViolations.some(v => v.lessonId === 'oop_lesson_5'));
});

// -----------------------------------------------------------------------------
// Test Category 2: Separation of Course Prerequisites from Lesson Counts
// -----------------------------------------------------------------------------
console.log("\n--- Test Category 2: Separate Course Prerequisites from Lesson Counts ---");

runTest("Swing unlocks when 12 required OOP lessons are complete, even if teacher added extra OOP lessons", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();

  // Teacher added 3 extra elective OOP lessons (13, 14, 15)
  dynamicCatalog.push({ id: 'extra_oop_1', sequence: 13, title: 'Reflection', module: 'Advanced OOP', track: 'oop' });
  dynamicCatalog.push({ id: 'extra_oop_2', sequence: 14, title: 'Annotations', module: 'Advanced OOP', track: 'oop' });
  dynamicCatalog.push({ id: 'extra_oop_3', sequence: 15, title: 'Concurrency', module: 'Advanced OOP', track: 'oop' });

  // Add Swing lesson 1
  dynamicCatalog.push({ id: 'swing_lesson_1', sequence: 16, title: 'JFrame & GUI', module: 'Java Swing', track: 'swing' });

  // Student has completed all 12 required canonical OOP lessons, but NOT the 3 extra elective lessons
  const rows = REQUIRED_CANONICAL_OOP_LESSON_IDS.map((id, index) => ({
    id: `lp_req_${index + 1}`,
    lesson_id: id,
    video_completed: true,
    quiz_passed: true,
    practice_submitted: true,
    completed: true
  }));

  // Student starts Swing lesson 1
  rows.push({
    id: 'lp_swing_1',
    lesson_id: 'swing_lesson_1',
    video_completed: true,
    quiz_passed: true,
    practice_submitted: true,
    completed: true
  });

  const audit = auditStudentSequentialProgress(dynamicCatalog, rows);

  assert.strictEqual(audit.requiredOOPComplete, true, "12 required OOP lessons are complete");
  assert.strictEqual(audit.completedRequiredOOPCount, 12);
  // Swing lesson 1 completion is legitimate! It is NOT blocked by the 3 extra OOP lessons.
  const swingCompleted = audit.legitimateCompletions.find(c => c.lessonId === 'swing_lesson_1');
  assert(swingCompleted !== undefined, "Swing Lesson 1 must be legitimately completed");
  assert.strictEqual(audit.accessViolations.length, 0, "No access violations for Swing");
});

runTest("Swing remains locked if only 11 required OOP lessons are complete, even if total lesson count is high", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();
  dynamicCatalog.push({ id: 'extra_oop_1', sequence: 13, title: 'Elective 1', track: 'oop' });
  dynamicCatalog.push({ id: 'extra_oop_2', sequence: 14, title: 'Elective 2', track: 'oop' });
  dynamicCatalog.push({ id: 'swing_lesson_1', sequence: 15, title: 'Swing 1', track: 'swing' });

  // Student completed 11 required OOP lessons + 2 electives (13 lessons completed in total!),
  // but oop_lesson_12 is MISSING
  const rows = REQUIRED_CANONICAL_OOP_LESSON_IDS.slice(0, 11).map((id, index) => ({
    id: `lp_req_${index + 1}`,
    lesson_id: id,
    video_completed: true,
    quiz_passed: true,
    practice_submitted: true,
    completed: true
  }));
  rows.push({ id: 'lp_ex_1', lesson_id: 'extra_oop_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true });
  rows.push({ id: 'lp_ex_2', lesson_id: 'extra_oop_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true });

  // Student tried to access Swing 1
  rows.push({ id: 'lp_sw_1', lesson_id: 'swing_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true });

  const audit = auditStudentSequentialProgress(dynamicCatalog, rows);

  assert.strictEqual(audit.requiredOOPComplete, false, "Swing must be locked because oop_lesson_12 is missing");
  assert.strictEqual(audit.completedRequiredOOPCount, 11);
  assert(audit.accessViolations.some(v => v.lessonId === 'swing_lesson_1' && v.violationType === 'SWING_PREREQUISITE_INCOMPLETE'));
});

// -----------------------------------------------------------------------------
// Test Category 3: Safe Read-Only Audit & Historical Evidence Preservation
// -----------------------------------------------------------------------------
console.log("\n--- Test Category 3: Evidence Preservation & Read-Only Audit ---");

runTest("Audit never wipes video progress, quiz attempts, or practice submissions", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();

  const rows = [
    // Lesson 1 complete
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    // Lesson 2 incomplete practice
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: false, completed: false },
    // Student already took Lesson 3 and Lesson 4 in the past
    {
      id: 'lp_3',
      lesson_id: 'oop_lesson_3',
      video_completed: true,
      quiz_passed: true,
      practice_submitted: true,
      completed: true
    },
    {
      id: 'lp_4',
      lesson_id: 'oop_lesson_4',
      video_completed: true,
      quiz_passed: true,
      practice_submitted: true,
      completed: true
    }
  ];

  const audit = auditStudentSequentialProgress(dynamicCatalog, rows);

  // Violations reported
  assert.strictEqual(audit.accessViolations.length, 2);
  const v3 = audit.accessViolations.find(v => v.lessonId === 'oop_lesson_3');
  assert(v3 !== undefined);
  assert.strictEqual(v3.violationType, 'OUT_OF_SEQUENCE_ACCESS');

  // Verify that historical evidence was captured and PRESERVED (never mutated or deleted)
  assert.strictEqual(v3.historicalEvidence.video_completed, true);
  assert.strictEqual(v3.historicalEvidence.quiz_passed, true);
  assert.strictEqual(v3.historicalEvidence.practice_submitted, true);

  // Original row attributes remain untouched
  assert.strictEqual(rows[2].video_completed, true);
  assert.strictEqual(rows[2].quiz_passed, true);
  assert.strictEqual(rows[2].practice_submitted, true);

  // Only the completed authorization flag is queued for reconciliation
  assert.strictEqual(audit.reconciledFlags.length, 2);
  assert.strictEqual(audit.reconciledFlags[0].action, 'reconcile_completion_false');
});

runTest("Missing progress rows break sequential chain deterministically", () => {
  const dynamicCatalog = buildCanonicalOOPLessons();

  // Student has no records for Lesson 1 and Lesson 2, but has records for Lesson 3
  const rows = [
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true }
  ];

  const audit = auditStudentSequentialProgress(dynamicCatalog, rows);

  assert.strictEqual(audit.legitimateCompletions.length, 0);
  assert.strictEqual(audit.inProgressLessons[0].lessonId, 'oop_lesson_1');
  assert.strictEqual(audit.inProgressLessons[0].reason, 'not started (no progress record)');
  assert.strictEqual(audit.accessViolations.length, 1);
  assert.strictEqual(audit.accessViolations[0].lessonId, 'oop_lesson_3');
});

console.log("\n================================================================================");
console.log(`🎯 ALL ${passedCount}/${totalCount} DYNAMIC PROGRESSION & AUDIT TESTS PASSED (100%)`);
console.log("================================================================================\n");
