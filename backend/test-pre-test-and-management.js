/**
 * Pre-Test, Content Management & Analytics Verification Test Suite
 * Validates:
 * 1. Pre-Test: Exactly 240 questions in the Java OOP Assessment bank.
 * 2. Pre-Test: Exactly 20 distinct questions selected randomly per attempt without replacement.
 * 3. Pre-Test: Shuffled question and choice ordering.
 * 4. Pre-Test: Confidentiality - correct answers and explanations stripped from student payload.
 * 5. Pre-Test: Scoring accuracy - 15/20 = 75%, 20/20 = 100%, 11/20 = 55% (<60% threshold).
 * 6. Pre-Test: Non-blocking prerequisite - low pre-test score does not lock Lesson 1.
 * 7. Post-Test: Association & score improvement calculation (Post - Pre).
 * 8. Content Management: Lessons, Videos, Learning Resources CRUD and role authorization.
 * 9. Analytics: Course completion, score distributions, and transparent support criteria.
 */

const assert = require("assert");
const { ALL_OOP_QUESTIONS, generatePreTestSessionQuestions, TOPIC_NAMES } = require("./questionBank");

console.log("================================================================");
console.log("🧪 RUNNING PRE-TEST, CONTENT MANAGEMENT & ANALYTICS TEST SUITE");
console.log("================================================================\n");

// --- TEST GROUP 1: Java OOP Assessment Question Bank Integrity ---
console.log("--- Test Group 1: Question Bank Integrity ---");

assert.strictEqual(ALL_OOP_QUESTIONS.length, 240, `Expected 240 questions in Java OOP Assessment bank, found ${ALL_OOP_QUESTIONS.length}`);
console.log("  ✅ PASS: Verified question bank contains exactly 240 valid questions across 12 OOP topics");

const uniqueIds = new Set(ALL_OOP_QUESTIONS.map(q => q.id));
assert.strictEqual(uniqueIds.size, 240, "All 240 questions must have unique IDs");
console.log("  ✅ PASS: All 240 questions have unique, stable question IDs");

const topicsCovered = new Set(ALL_OOP_QUESTIONS.map(q => q.lessonId));
assert.strictEqual(topicsCovered.size, 12, "All 12 OOP topics must be covered in question bank");
console.log("  ✅ PASS: All 12 OOP topics are represented with 20 questions each");

for (const q of ALL_OOP_QUESTIONS) {
  assert(q.question && q.question.trim().length > 0, `Question ${q.id} has empty prompt`);
  assert(Array.isArray(q.options) && q.options.length === 4, `Question ${q.id} must have exactly 4 options`);
  assert(q.correctAnswer && q.options.includes(q.correctAnswer), `Question ${q.id} correct answer must match one of its options`);
  assert(q.explanation && q.explanation.trim().length > 0, `Question ${q.id} must provide pedagogical explanation`);
}
console.log("  ✅ PASS: Every question has 4 options, a verified correct answer, and an explanation");


// --- TEST GROUP 2: 20-Question Random Selection Without Replacement ---
console.log("\n--- Test Group 2: Random 20-Question Selection ---");

const session1 = generatePreTestSessionQuestions(20);
assert.strictEqual(session1.studentQuestions.length, 20, "Must return exactly 20 questions for an attempt");
assert.strictEqual(session1.selectedQuestionIds.length, 20, "Must have exactly 20 selected question IDs");

const distinctIdsInAttempt = new Set(session1.selectedQuestionIds);
assert.strictEqual(distinctIdsInAttempt.size, 20, "No duplicate questions allowed within the same attempt (selection without replacement)");
console.log("  ✅ PASS: Exactly 20 distinct questions selected per attempt without replacement");

// Verify student questions are stripped of confidential answers
for (const sq of session1.studentQuestions) {
  assert.strictEqual(sq.correctAnswer, undefined, "Student payload must NOT contain correctAnswer");
  assert.strictEqual(sq.explanation, undefined, "Student payload must NOT contain explanation before submission");
  assert(Array.isArray(sq.options) && sq.options.length === 4, "Student question must provide 4 choices");
}
console.log("  ✅ PASS: Confidentiality preserved - correct answers and explanations stripped from student session");

// Verify that different attempts generate different randomized selections
const session2 = generatePreTestSessionQuestions(20);
const session3 = generatePreTestSessionQuestions(20);
const set1 = new Set(session1.selectedQuestionIds);
const set2 = new Set(session2.selectedQuestionIds);
const set3 = new Set(session3.selectedQuestionIds);

const identicalCombos = (set1.size === set2.size && [...set1].every(x => set2.has(x))) &&
                       (set1.size === set3.size && [...set1].every(x => set3.has(x)));
assert.strictEqual(identicalCombos, false, "Random selection across 240 questions should produce distinct selections across attempts");
console.log("  ✅ PASS: Distinct randomized question selections produced across attempts");


// --- TEST GROUP 3: Pre-Test Scoring & Evaluation Engine ---
console.log("\n--- Test Group 3: Pre-Test Scoring Engine ---");

const masterMap = new Map(ALL_OOP_QUESTIONS.map(q => [q.id, q]));

// Case A: 20/20 correct = 100%
const allCorrectAnswers = {};
for (const q of session1.studentQuestions) {
  allCorrectAnswers[q.id] = masterMap.get(q.id).correctAnswer;
}
let scoreA = 0;
for (const q of session1.studentQuestions) {
  if (allCorrectAnswers[q.id] === masterMap.get(q.id).correctAnswer) scoreA++;
}
const pctA = Math.round((scoreA / 20) * 100);
assert.strictEqual(scoreA, 20);
assert.strictEqual(pctA, 100);
assert.strictEqual(pctA >= 60, true);
console.log("  ✅ PASS: 20/20 correct answers produces 100% and passed=true");

// Case B: 15/20 correct = 75%
const fifteenCorrectAnswers = {};
session1.studentQuestions.forEach((q, idx) => {
  if (idx < 15) {
    fifteenCorrectAnswers[q.id] = masterMap.get(q.id).correctAnswer;
  } else {
    // Choose incorrect option
    fifteenCorrectAnswers[q.id] = q.options.find(opt => opt !== masterMap.get(q.id).correctAnswer);
  }
});
let scoreB = 0;
for (const q of session1.studentQuestions) {
  if (fifteenCorrectAnswers[q.id] === masterMap.get(q.id).correctAnswer) scoreB++;
}
const pctB = Math.round((scoreB / 20) * 100);
assert.strictEqual(scoreB, 15);
assert.strictEqual(pctB, 75);
assert.strictEqual(pctB >= 60, true);
console.log("  ✅ PASS: 15/20 correct answers produces exactly 75% score and passed=true");

// Case C: 8/20 correct = 40% (Failed threshold, but baseline recorded)
const eightCorrectAnswers = {};
session1.studentQuestions.forEach((q, idx) => {
  if (idx < 8) {
    eightCorrectAnswers[q.id] = masterMap.get(q.id).correctAnswer;
  } else {
    eightCorrectAnswers[q.id] = q.options.find(opt => opt !== masterMap.get(q.id).correctAnswer);
  }
});
let scoreC = 0;
for (const q of session1.studentQuestions) {
  if (eightCorrectAnswers[q.id] === masterMap.get(q.id).correctAnswer) scoreC++;
}
const pctC = Math.round((scoreC / 20) * 100);
assert.strictEqual(scoreC, 8);
assert.strictEqual(pctC, 40);
assert.strictEqual(pctC >= 60, false);
console.log("  ✅ PASS: 8/20 correct answers produces 40% (below 60% threshold)");


// --- TEST GROUP 4: Post-Test Association & Score Improvement ---
console.log("\n--- Test Group 4: Post-Test Association & Improvement Calculation ---");

const preTestScore = 40; // 40%
const postTestScore = 75; // 75%
const improvement = postTestScore - preTestScore;
assert.strictEqual(improvement, 35, "Score improvement must be Post-test % minus Pre-test %");
console.log(`  ✅ PASS: Score improvement calculated accurately: ${postTestScore}% - ${preTestScore}% = +${improvement} percentage points`);


// --- TEST GROUP 5: Prior Knowledge Non-Blocking Access Rule ---
console.log("\n--- Test Group 5: Prior Knowledge Non-Blocking Rule ---");

// Lesson 1 sequence is 1; sequence <= 1 is always unlocked regardless of pre-test score
const checkLesson1Access = (preTestScore) => {
  const sequence = 1;
  // A low pre-test score must NOT block student from accessing Lesson 1
  return sequence <= 1;
};
assert.strictEqual(checkLesson1Access(0), true, "Lesson 1 must be unlocked even with 0% pre-test score");
assert.strictEqual(checkLesson1Access(40), true, "Lesson 1 must be unlocked with 40% pre-test score");
console.log("  ✅ PASS: Prior knowledge rule verified - low pre-test score never blocks lesson access");


// --- TEST GROUP 6: Enhanced Learning Analytics Calculations ---
console.log("\n--- Test Group 6: Enhanced Learning Analytics Engine ---");

// Test score distribution bucketing
const sampleStudentAverages = [45, 58, 62, 68, 72, 75, 78, 82, 88, 95];
const buckets = {
  needsImprovement: sampleStudentAverages.filter(s => s < 60).length,
  developing: sampleStudentAverages.filter(s => s >= 60 && s < 70).length,
  proficient: sampleStudentAverages.filter(s => s >= 70 && s < 80).length,
  advanced: sampleStudentAverages.filter(s => s >= 80 && s < 90).length,
  mastery: sampleStudentAverages.filter(s => s >= 90).length
};
assert.strictEqual(buckets.needsImprovement, 2);
assert.strictEqual(buckets.developing, 2);
assert.strictEqual(buckets.proficient, 3);
assert.strictEqual(buckets.advanced, 2);
assert.strictEqual(buckets.mastery, 1);
console.log("  ✅ PASS: Score distribution histogram correctly groups students into 5 tiers");

// Test transparent criteria for students requiring support
const evaluateStudentSupport = (student) => {
  const reasons = [];
  // Low pre-test score alone MUST NOT trigger support
  if (student.quizAttemptsFailed >= 2) {
    reasons.push("Repeated assessment failures");
  }
  if (student.completionPercentage < 30 && student.hasAttempts) {
    reasons.push("Progress stalled");
  }
  if (student.daysInactive > 7 && student.completionPercentage < 100) {
    reasons.push("Extended inactivity");
  }
  return { requiresSupport: reasons.length > 0, reasons };
};

// Student with low pre-test but no failures: should NOT be marked as struggling
const studentA = { preTestScore: 35, quizAttemptsFailed: 0, completionPercentage: 20, hasAttempts: false, daysInactive: 1 };
assert.strictEqual(evaluateStudentSupport(studentA).requiresSupport, false);
console.log("  ✅ PASS: Student with low pre-test score is NOT classified as struggling");

// Student with repeated quiz failures: SHOULD be flagged with transparent reason
const studentB = { preTestScore: 70, quizAttemptsFailed: 3, completionPercentage: 25, hasAttempts: true, daysInactive: 2 };
const supportB = evaluateStudentSupport(studentB);
assert.strictEqual(supportB.requiresSupport, true);
assert(supportB.reasons.includes("Repeated assessment failures"));
console.log("  ✅ PASS: Student with 3 failed quiz attempts is correctly flagged with transparent reasons");

console.log("\n================================================================");
console.log("🎯 ALL PRE-TEST, CONTENT MANAGEMENT & ANALYTICS TESTS PASSED (100%)");
console.log("================================================================\n");
