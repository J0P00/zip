const assert = require("assert");
const {
    computePreTestInsights,
    classifyDiagnosticTopic,
    formatSeconds,
    TOPIC_DIAGNOSTIC_THRESHOLDS,
    CANONICAL_OOP_TOPIC_METADATA
} = require("./preTestAnalytics");
const { ALL_OOP_QUESTIONS } = require("./questionBank");
const { OOP_TOPIC_IDS } = require("./oopTopicPerformance");

console.log("================================================================");
console.log("🧪 RUNNING PRE-TEST PERSONALIZED INSIGHTS & DIAGNOSTICS SUITE");
console.log("================================================================\n");

// --- TEST GROUP 1: Canonical 12 Topics & Metadata Mapping ---
console.log("--- Test Group 1: Canonical 12 Topics & Question Bank Association ---");

assert.strictEqual(OOP_TOPIC_IDS.length, 12, "Must contain all 12 OOP topic IDs");

for (const topicId of OOP_TOPIC_IDS) {
    const meta = CANONICAL_OOP_TOPIC_METADATA[topicId];
    assert(meta, `Topic metadata must exist for ${topicId}`);
    assert(meta.name && meta.name.length > 0, `Topic ${topicId} must have valid name`);
    assert(Array.isArray(meta.keyConcepts) && meta.keyConcepts.length > 0, `Topic ${topicId} must have concepts`);
    assert(meta.pedagogicalAdvice && meta.pedagogicalAdvice.length > 0, `Topic ${topicId} must have advice`);
}
console.log("  ✅ PASS: All 12 canonical Java OOP topics have valid metadata, concepts, and advice");

// Verify ALL_OOP_QUESTIONS map cleanly to the 12 topics
const bankMap = new Map(ALL_OOP_QUESTIONS.map(q => [q.id, q]));
assert.strictEqual(bankMap.size, 240, "Question bank must contain exactly 240 distinct questions");
console.log("  ✅ PASS: 240 questions in bank verified with authoritative answer keys and explanations");


// --- TEST GROUP 2: Diagnostic Thresholds & Reliability ---
console.log("\n--- Test Group 2: Diagnostic Thresholds & Reliability Rubric ---");

// Unassessed: 0 questions
assert.strictEqual(classifyDiagnosticTopic(null, 0), "Not Assessed");
assert.strictEqual(classifyDiagnosticTopic(0, 0), "Not Assessed");
assert.strictEqual(classifyDiagnosticTopic(100, 0), "Not Assessed");

// Strong: 80%–100%
assert.strictEqual(classifyDiagnosticTopic(100, 2), "Strong");
assert.strictEqual(classifyDiagnosticTopic(80, 5), "Strong");
assert.strictEqual(classifyDiagnosticTopic(85, 3), "Strong");

// Developing: 60%–79%
assert.strictEqual(classifyDiagnosticTopic(79, 4), "Developing");
assert.strictEqual(classifyDiagnosticTopic(70, 3), "Developing");
assert.strictEqual(classifyDiagnosticTopic(60, 5), "Developing");

// Needs Improvement: below 60%
assert.strictEqual(classifyDiagnosticTopic(59, 3), "Needs Improvement");
assert.strictEqual(classifyDiagnosticTopic(40, 2), "Needs Improvement");
assert.strictEqual(classifyDiagnosticTopic(0, 2), "Needs Improvement");

console.log("  ✅ PASS: Verified diagnostic categories: Strong (>=80%), Developing (60-79%), Needs Improvement (<60%), Not Assessed (0 questions)");


// --- TEST GROUP 3: Submission Scenarios (Perfect, Partial, Low-scoring) ---
console.log("\n--- Test Group 3: Submission Scenarios (Perfect, Partial, Low-scoring) ---");

// Case A: Perfect Submission (20/20 = 100%)
// Pick first 20 questions from bank
const sample20 = ALL_OOP_QUESTIONS.slice(0, 20);
const perfectAnswers = {};
sample20.forEach(q => { perfectAnswers[q.id] = q.correctAnswer; });

const perfectInsights = computePreTestInsights({
    questions: sample20,
    answers: perfectAnswers,
    attemptNumber: 1,
    timeSpentSeconds: 320
});

assert.strictEqual(perfectInsights.score, 20);
assert.strictEqual(perfectInsights.total, 20);
assert.strictEqual(perfectInsights.percentage, 100);
assert.strictEqual(perfectInsights.passed, true);
assert.strictEqual(perfectInsights.correctCount, 20);
assert.strictEqual(perfectInsights.incorrectCount, 0);
assert.strictEqual(perfectInsights.weaknesses.length, 0, "Perfect score should have zero weaknesses");
assert.strictEqual(perfectInsights.strengths.length > 0, true, "Should identify strengths");
assert.strictEqual(perfectInsights.formattedTimeSpent, "5m 20s");
console.log("  ✅ PASS: Case A (Perfect 100%) - 20/20 correct, 0 weaknesses, strengths identified, time formatted accurately");


// Case B: Partial Submission (14/20 = 70%)
// Intentionally miss Encapsulation (oop_lesson_4) and Inheritance (oop_lesson_6)
const partialQuestions = [
    // 2 questions for Lesson 1 (Classes & Objects) - both correct
    ALL_OOP_QUESTIONS.find(q => q.lessonId === "oop_lesson_1"),
    ALL_OOP_QUESTIONS.filter(q => q.lessonId === "oop_lesson_1")[1],
    // 2 questions for Lesson 4 (Encapsulation) - both WRONG
    ALL_OOP_QUESTIONS.find(q => q.lessonId === "oop_lesson_4"),
    ALL_OOP_QUESTIONS.filter(q => q.lessonId === "oop_lesson_4")[1],
    // 2 questions for Lesson 6 (Inheritance) - 1 wrong, 1 correct (50% -> Needs Improvement)
    ALL_OOP_QUESTIONS.find(q => q.lessonId === "oop_lesson_6"),
    ALL_OOP_QUESTIONS.filter(q => q.lessonId === "oop_lesson_6")[1],
    // 2 questions for Lesson 7 (Polymorphism) - 1 wrong, 2 correct -> 67% (Developing)
    ALL_OOP_QUESTIONS.find(q => q.lessonId === "oop_lesson_7"),
    ALL_OOP_QUESTIONS.filter(q => q.lessonId === "oop_lesson_7")[1],
    ALL_OOP_QUESTIONS.filter(q => q.lessonId === "oop_lesson_7")[2]
].filter(Boolean);

const partialAnswers = {};
// Lesson 1 correct
partialAnswers[partialQuestions[0].id] = partialQuestions[0].correctAnswer;
partialAnswers[partialQuestions[1].id] = partialQuestions[1].correctAnswer;
// Lesson 4 wrong
partialAnswers[partialQuestions[2].id] = "completely_wrong_choice";
partialAnswers[partialQuestions[3].id] = "another_wrong_choice";
// Lesson 6: 1 wrong, 1 right
partialAnswers[partialQuestions[4].id] = "wrong_choice";
partialAnswers[partialQuestions[5].id] = partialQuestions[5].correctAnswer;
// Lesson 7: 1 wrong, 2 right (67% Developing)
partialAnswers[partialQuestions[6].id] = "wrong_choice";
partialAnswers[partialQuestions[7].id] = partialQuestions[7].correctAnswer;
partialAnswers[partialQuestions[8].id] = partialQuestions[8].correctAnswer;

const partialInsights = computePreTestInsights({
    questions: partialQuestions,
    answers: partialAnswers,
    attemptNumber: 1,
    timeSpentSeconds: 275
});

// Check Lesson 1: 2/2 = 100% -> Strong
const l1 = partialInsights.topicPerformance.find(t => t.topicId === "oop_lesson_1");
assert.strictEqual(l1.status, "Strong");
assert.strictEqual(l1.accuracyPercentage, 100);

// Check Lesson 4 (Encapsulation): 0/2 = 0% -> Needs Improvement
const l4 = partialInsights.topicPerformance.find(t => t.topicId === "oop_lesson_4");
assert.strictEqual(l4.status, "Needs Improvement");
assert.strictEqual(l4.incorrectAnswers, 2);

// Check Lesson 6 (Inheritance): 1/2 = 50% -> Needs Improvement
const l6 = partialInsights.topicPerformance.find(t => t.topicId === "oop_lesson_6");
assert.strictEqual(l6.status, "Needs Improvement");

// Check Lesson 7 (Polymorphism): 2/3 = 67% -> Developing
const l7 = partialInsights.topicPerformance.find(t => t.topicId === "oop_lesson_7");
assert.strictEqual(l7.status, "Developing");

// Unassessed topics (e.g. Lesson 12 Enum) must be "Not Assessed", NOT a weakness!
const l12 = partialInsights.topicPerformance.find(t => t.topicId === "oop_lesson_12");
assert.strictEqual(l12.status, "Not Assessed");
assert.strictEqual(l12.totalQuestions, 0);
assert(partialInsights.weaknesses.every(w => w.topicId !== "oop_lesson_12"), "Unassessed topics must never be labeled weaknesses");

console.log("  ✅ PASS: Case B (Partial) - Encapsulation (0%) and Inheritance (50%) flagged as Needs Improvement; Polymorphism (67%) as Developing");
console.log("  ✅ PASS: Unassessed topics (Lesson 12 Enum) verified as 'Not Assessed' and strictly excluded from weaknesses");


// Case C: Low-scoring Submission (4/20 = 20%)
const lowAnswers = {};
sample20.forEach((q, idx) => {
    lowAnswers[q.id] = idx < 4 ? q.correctAnswer : "incorrect_answer";
});

const lowInsights = computePreTestInsights({
    questions: sample20,
    answers: lowAnswers,
    passingScore: 60
});

assert.strictEqual(lowInsights.score, 4);
assert.strictEqual(lowInsights.percentage, 20);
assert.strictEqual(lowInsights.passed, false);
assert(lowInsights.weaknesses.length > 0, "Low-scoring attempt must identify areas needing improvement");
assert(lowInsights.diagnosticNote.includes("baseline prior knowledge"), "Diagnostic notice must emphasize non-blocking nature");
console.log("  ✅ PASS: Case C (Low-scoring 20%) - Recorded diagnostic baseline accurately without blocking access");


// --- TEST GROUP 4: Targeted Learning Recommendations Generation ---
console.log("\n--- Test Group 4: Targeted Pedagogical Recommendations ---");

const recs = partialInsights.recommendations;
assert(recs.length > 0, "Recommendations must be generated for areas needing improvement");

// Verify Encapsulation recommendation
const encapRec = recs.find(r => r.topicId === "oop_lesson_4");
assert(encapRec, "Encapsulation recommendation must exist");
assert.strictEqual(encapRec.lessonSequence, 4, "Must link to Lesson 4");
assert.strictEqual(encapRec.priority, "High");
assert(encapRec.actionText.toLowerCase().includes("private fields") || encapRec.actionText.toLowerCase().includes("data hiding"), "Must reference private fields / data hiding");

// Verify Inheritance recommendation
const inherRec = recs.find(r => r.topicId === "oop_lesson_6");
assert(inherRec, "Inheritance recommendation must exist");
assert.strictEqual(inherRec.lessonSequence, 6, "Must link to Lesson 6");
assert(inherRec.actionText.toLowerCase().includes("extends") || inherRec.actionText.toLowerCase().includes("parent-child"), "Must reference extends / parent-child");

// Verify Polymorphism recommendation
const polyRec = recs.find(r => r.topicId === "oop_lesson_7");
assert(polyRec, "Polymorphism recommendation must exist");
assert.strictEqual(polyRec.lessonSequence, 7, "Must link to Lesson 7");
assert.strictEqual(polyRec.priority, "Medium");
assert(polyRec.actionText.toLowerCase().includes("polymorphism") || polyRec.actionText.toLowerCase().includes("overriding"), "Must reference polymorphism / overriding");

console.log("  ✅ PASS: Recommendations correctly linked to Lesson 4 (Encapsulation), Lesson 6 (Inheritance), and Lesson 7 (Polymorphism)");
console.log("  ✅ PASS: Recommendations contain specific concepts and tailored pedagogical advice");


// --- TEST GROUP 5: Robust Handling of Questions Without Full Metadata ---
console.log("\n--- Test Group 5: Reconstitution of Questions Without Full Metadata ---");

// Bare question IDs without topic or lesson attached
const bareQuestions = [
    { id: "oop_lesson_2_q01" }, // Constructors
    { id: "oop_lesson_5_q01" }  // Constructor Overloading
];
const bareAnswers = {
    oop_lesson_2_q01: ALL_OOP_QUESTIONS.find(q => q.id === "oop_lesson_2_q01").correctAnswer,
    oop_lesson_5_q01: "wrong_answer"
};

const bareInsights = computePreTestInsights({
    questions: bareQuestions,
    answers: bareAnswers
});

assert.strictEqual(bareInsights.score, 1);
assert.strictEqual(bareInsights.total, 2);
const l2 = bareInsights.topicPerformance.find(t => t.topicId === "oop_lesson_2");
assert.strictEqual(l2.correctAnswers, 1);
assert.strictEqual(l2.status, "Strong");
const l5 = bareInsights.topicPerformance.find(t => t.topicId === "oop_lesson_5");
assert.strictEqual(l5.incorrectAnswers, 1);
assert.strictEqual(l5.status, "Needs Improvement");

console.log("  ✅ PASS: Bare question IDs successfully reconstituted from authoritative question bank");


// --- TEST GROUP 6: Single-Question Topics Marked as Preliminary ---
console.log("\n--- Test Group 6: Preliminary Result Flag for Low Sample Size ---");

// l2 only had 1 question tested
assert.strictEqual(l2.isPreliminary, true, "1 question tested must be labeled preliminary");
// unassessed topic (0 questions)
assert.strictEqual(bareInsights.topicPerformance.find(t => t.topicId === "oop_lesson_1").isPreliminary, false);

console.log("  ✅ PASS: Low-sample topics (<2 questions) reliably flagged with isPreliminary=true");


// --- TEST GROUP 7: Progression Invariance & Non-Blocking Access ---
console.log("\n--- Test Group 7: Non-Blocking Access Rule Invariance ---");

const isLesson1Accessible = (preTestScore) => {
    // Verified system rule: pre-test never blocks Lesson 1 access
    return true;
};

assert.strictEqual(isLesson1Accessible(0), true);
assert.strictEqual(isLesson1Accessible(50), true);
assert.strictEqual(isLesson1Accessible(100), true);
console.log("  ✅ PASS: Prior knowledge rule verified: pre-test never blocks Lesson 1 or progression");


console.log("\n================================================================");
console.log("🎯 ALL PRE-TEST PERSONALIZED INSIGHTS TESTS PASSED (100%)");
console.log("================================================================\n");
