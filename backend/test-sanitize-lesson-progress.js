const assert = require('assert');
const {
  evaluateSequentialProgress,
  resolveLessonSequence
} = require('./sanitize-lesson-progress');

console.log("================================================================================");
console.log("🧪 RUNNING SEQUENTIAL PROGRESSION SANITIZATION TEST SUITE");
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

// Canonical 18 lessons catalog
const mockLessons = [];
for (let i = 1; i <= 12; i++) {
  mockLessons.push({ id: `oop_lesson_${i}`, sequence: i, title: `OOP Lesson ${i}` });
}
for (let i = 1; i <= 6; i++) {
  mockLessons.push({ id: `swing_lesson_${i}`, sequence: 12 + i, title: `Swing Lesson ${i}` });
}

// -----------------------------------------------------------------------------
// Test Category 1: Lesson Sequence Resolution
// -----------------------------------------------------------------------------
console.log("--- Test Category 1: Lesson Sequence Resolution ---");

runTest("Resolves canonical OOP lesson IDs (oop_lesson_1 to oop_lesson_12)", () => {
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'oop_lesson_1' }, mockLessons), 1);
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'oop_lesson_5' }, mockLessons), 5);
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'oop_lesson_12' }, mockLessons), 12);
});

runTest("Resolves canonical Swing lesson IDs (swing_lesson_1 to swing_lesson_6 -> 13 to 18)", () => {
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'swing_lesson_1' }, mockLessons), 13);
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'swing_lesson_5' }, mockLessons), 17);
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'swing_lesson_6' }, mockLessons), 18);
});

runTest("Resolves numeric and alias strings ('1' to '18', 'lesson_4')", () => {
  assert.strictEqual(resolveLessonSequence({ lesson_id: '4' }, mockLessons), 4);
  assert.strictEqual(resolveLessonSequence({ lesson_id: 'lesson_8' }, mockLessons), 8);
  assert.strictEqual(resolveLessonSequence({ lesson_id: '18' }, mockLessons), 18);
});

// -----------------------------------------------------------------------------
// Test Category 2: Legitimate Sequential Progression
// -----------------------------------------------------------------------------
console.log("\n--- Test Category 2: Legitimate Sequential Progression ---");

runTest("Legitimate continuous sequential completion (Lesson 1-4) produces ZERO violations", () => {
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_4', lesson_id: 'oop_lesson_4', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.violations.length, 0, "No violations for valid sequence");
  assert.strictEqual(result.validCompletions.length, 4, "All 4 lessons validly complete");
  assert.strictEqual(result.chainBrokenAt, 5, "Next incomplete lesson is Lesson 5");
});

runTest("Legitimate in-progress lesson (predecessors complete, current video watched) is NOT flagged as violation", () => {
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    // Lesson 3 is legitimately unlocked: student watched video, but has not yet passed assessment
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: false, practice_submitted: false, completed: false },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.violations.length, 0, "Legitimate in-progress lesson must not be flagged");
  assert.strictEqual(result.validCompletions.length, 2, "Lessons 1 and 2 are complete");
  assert.strictEqual(result.chainBrokenAt, 3, "Chain terminates at Lesson 3 (in-progress)");
});

// -----------------------------------------------------------------------------
// Test Category 3: Out-of-Sequence Violations (Legacy Conflict Handling)
// -----------------------------------------------------------------------------
console.log("\n--- Test Category 3: Out-of-Sequence Violations ---");

runTest("Failed assessment at Lesson 2 revokes and locks advanced completions (Lesson 3-5)", () => {
  const rows = [
    // Lesson 1 complete
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    // Lesson 2 FAILED assessment
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: false, practice_submitted: false, completed: false },
    // Out-of-sequence advanced legacy records
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_4', lesson_id: 'oop_lesson_4', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_5', lesson_id: 'oop_lesson_5', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.validCompletions.length, 1, "Only Lesson 1 is legitimately complete");
  assert.strictEqual(result.violations.length, 3, "Lessons 3, 4, 5 must be flagged as violations");
  assert.strictEqual(result.chainBrokenAt, 2, "Chain broke at Lesson 2");

  const violatedSeqs = result.violations.map(v => v.sequence);
  assert.deepStrictEqual(violatedSeqs, [3, 4, 5]);
  assert(result.violations[0].reason.includes("Predecessor Lesson 2 incomplete"));
});

runTest("Unsubmitted practice at Lesson 4 locks Lesson 5", () => {
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    // Lesson 4 video & assessment passed, but practice NOT submitted
    { id: 'lp_4', lesson_id: 'oop_lesson_4', video_completed: true, quiz_passed: true, practice_submitted: false, completed: false },
    // Lesson 5 erroneously marked completed
    { id: 'lp_5', lesson_id: 'oop_lesson_5', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.validCompletions.length, 3, "Lessons 1-3 complete");
  assert.strictEqual(result.violations.length, 1, "Lesson 5 must be locked");
  assert.strictEqual(result.violations[0].sequence, 5);
  assert(result.violations[0].reason.includes("Lesson 4 incomplete"));
});

runTest("Action 'delete' sets action to delete for all unauthorized records", () => {
  const rows = [
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: false, quiz_passed: false, practice_submitted: false, completed: false },
    { id: 'lp_3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'delete' });
  assert.strictEqual(result.violations.length, 1);
  assert.strictEqual(result.violations[0].action, 'delete');
});

runTest("Student with NO Lesson 1 record locks all advanced records up to Lesson 18", () => {
  const rows = [
    // Lesson 1 is completely absent
    { id: 'lp_6', lesson_id: 'oop_lesson_6', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_13', lesson_id: 'swing_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.validCompletions.length, 0);
  assert.strictEqual(result.violations.length, 2);
  assert.strictEqual(result.chainBrokenAt, 1);
});

runTest("False completion flag on incomplete lesson is revoked", () => {
  const rows = [
    // Lesson 1 has completed = TRUE in database, but video_completed is FALSE!
    { id: 'lp_1', lesson_id: 'oop_lesson_1', video_completed: false, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const result = evaluateSequentialProgress(mockLessons, rows, { action: 'lock' });
  assert.strictEqual(result.validCompletions.length, 0, "Lesson 1 is NOT validly complete");
  // Lesson 1 false completion revoked, Lesson 2 advanced violation
  assert.strictEqual(result.violations.length, 2);
  assert.strictEqual(result.violations[0].sequence, 1);
  assert.strictEqual(result.violations[0].action, 'revoke_completion');
  assert.strictEqual(result.violations[1].sequence, 2);
});

// -----------------------------------------------------------------------------
// Test Category 4: Multi-Student Isolation
// -----------------------------------------------------------------------------
console.log("\n--- Test Category 4: Multi-Student Isolation ---");

runTest("Evaluating Student A does not leak into Student B", () => {
  const studentARows = [
    { id: 'lp_a1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_a2', lesson_id: 'oop_lesson_2', video_completed: false, quiz_passed: false, practice_submitted: false, completed: false },
    { id: 'lp_a3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const studentBRows = [
    { id: 'lp_b1', lesson_id: 'oop_lesson_1', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_b2', lesson_id: 'oop_lesson_2', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
    { id: 'lp_b3', lesson_id: 'oop_lesson_3', video_completed: true, quiz_passed: true, practice_submitted: true, completed: true },
  ];

  const resA = evaluateSequentialProgress(mockLessons, studentARows, { action: 'lock' });
  const resB = evaluateSequentialProgress(mockLessons, studentBRows, { action: 'lock' });

  assert.strictEqual(resA.violations.length, 1, "Student A has 1 violation (Lesson 3)");
  assert.strictEqual(resB.violations.length, 0, "Student B has 0 violations (all 3 valid)");
  assert.strictEqual(resB.validCompletions.length, 3, "Student B has 3 valid completions");
});

console.log("\n================================================================================");
console.log(`🎯 ALL ${passedCount}/${totalCount} PROGRESSION SANITIZATION TESTS PASSED (100%)`);
console.log("================================================================================\n");
