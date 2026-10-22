const assert = require("assert");
const {
    OOP_TOPIC_IDS,
    CANONICAL_OOP_LESSON_TITLES,
    buildOopTopicNameMap,
    classifyTopicMastery,
    computeOopTopicPerformance
} = require("./oopTopicPerformance");
const { TOPIC_NAMES } = require("./questionBank");

console.log("================================================================");
console.log("🧪 RUNNING OOP TOPICS PERFORMANCE & MASTERY MATRIX TEST SUITE");
console.log("================================================================\n");

// --- TEST GROUP 1: Canonical 12 OOP Topics & No Duplicate Enum ---
console.log("--- Test Group 1: 12 Unique Topics & No Duplicate Enum ---");

assert.strictEqual(OOP_TOPIC_IDS.length, 12, "Must contain exactly 12 OOP topic IDs");
const uniqueTopicIds = new Set(OOP_TOPIC_IDS);
assert.strictEqual(uniqueTopicIds.size, 12, "All 12 topic IDs must be unique");

// Verify Enum only appears once in canonical titles
const titles = Object.values(CANONICAL_OOP_LESSON_TITLES);
const enumOccurrences = titles.filter(t => t.toLowerCase().includes("enum"));
assert.strictEqual(enumOccurrences.length, 1, `Enum must appear exactly once in canonical titles, found: ${enumOccurrences.length}`);
assert.strictEqual(CANONICAL_OOP_LESSON_TITLES["oop_lesson_12"], "Enum", "Lesson 12 must be Enum");
assert.strictEqual(CANONICAL_OOP_LESSON_TITLES["oop_lesson_11"], "Array of Objects", "Lesson 11 must be Array of Objects");
assert.strictEqual(CANONICAL_OOP_LESSON_TITLES["oop_lesson_4"], "Encapsulation", "Lesson 4 must be Encapsulation");
assert.strictEqual(CANONICAL_OOP_LESSON_TITLES["oop_lesson_5"], "Constructor Overloading", "Lesson 5 must be Constructor Overloading");
assert.strictEqual(CANONICAL_OOP_LESSON_TITLES["oop_lesson_6"], "Inheritance", "Lesson 6 must be Inheritance");
console.log("  ✅ PASS: Verified exactly 12 unique topic IDs with zero duplicate Enum");

// Verify questionBank.js TOPIC_NAMES also matches without duplicate Enum
const qbTitles = Object.values(TOPIC_NAMES);
const qbEnumOccurrences = qbTitles.filter(t => t.toLowerCase().includes("enum"));
assert.strictEqual(qbEnumOccurrences.length, 1, `Enum must appear exactly once in TOPIC_NAMES, found: ${qbEnumOccurrences.length}`);
assert.strictEqual(TOPIC_NAMES["oop_lesson_12"], "Enum");
assert.strictEqual(TOPIC_NAMES["oop_lesson_11"], "Array of Objects");
console.log("  ✅ PASS: Verified questionBank.js TOPIC_NAMES has exactly one Enum at lesson 12 and Array of Objects at lesson 11");


// --- TEST GROUP 2: Mastery Classification Thresholds ---
console.log("\n--- Test Group 2: Mastery Classification Thresholds ---");

// Unattempted: Not Assessed
assert.strictEqual(classifyTopicMastery(0, 0), "Not Assessed", "Zero attempts must be Not Assessed");
assert.strictEqual(classifyTopicMastery(null, 0), "Not Assessed", "Null score with zero attempts must be Not Assessed");

// Strong: >= 75%
assert.strictEqual(classifyTopicMastery(100, 1), "Strong", "100% must be Strong");
assert.strictEqual(classifyTopicMastery(75, 5), "Strong", "75% exactly must be Strong");
assert.strictEqual(classifyTopicMastery(75.5, 3), "Strong", "75.5% must be Strong");

// Average: 60% - 74%
assert.strictEqual(classifyTopicMastery(74.9, 2), "Average", "74.9% must be Average");
assert.strictEqual(classifyTopicMastery(70, 10), "Average", "70% must be Average");
assert.strictEqual(classifyTopicMastery(60, 4), "Average", "60% exactly must be Average");

// Struggling: < 60%
assert.strictEqual(classifyTopicMastery(59.9, 1), "Struggling", "59.9% must be Struggling");
assert.strictEqual(classifyTopicMastery(40, 3), "Struggling", "40% must be Struggling");
assert.strictEqual(classifyTopicMastery(0, 2), "Struggling", "0% with >0 attempts must be Struggling");
console.log("  ✅ PASS: All mastery classifications (Strong >= 75%, Average 60-74%, Struggling < 60%, Not Assessed for 0 attempts) verified");


// --- TEST GROUP 3: Performance Aggregation Engine ---
console.log("\n--- Test Group 3: Performance Aggregation Engine ---");

// Mock sample attempts
const mockQuizAttempts = [
    // Lesson 1: 3 attempts, scores 90, 100, 50 (avg = 80, passRate = 67% at 60% threshold)
    { lesson_id: "oop_lesson_1", score: 90, passed: true },
    { lesson_id: "oop_lesson_1", score: 100, passed: true },
    { lesson_id: "oop_lesson_1", score: 50, passed: false }, // below 60% threshold

    // Lesson 2: 2 attempts, scores 55, 70 (avg = 62.5 -> 63, passRate = 50% at 60% threshold)
    { lesson_id: "oop_lesson_2", score: 55, passed: false },
    { lesson_id: "oop_lesson_2", score: 70, passed: true },

    // Lesson 6 (Inheritance): 2 attempts, scores 50, 40 (avg = 45, passRate = 0%)
    { lesson_id: "oop_lesson_6", score: 50, passed: false },
    { lesson_id: "oop_lesson_6", score: 40, passed: false },

    // Lesson 12 (Enum): 1 attempt, score 100 (avg = 100, passRate = 100%)
    { lesson_id: "oop_lesson_12", score: 100, passed: true },

    // Swing lesson attempt should NOT contaminate the 12 OOP topics matrix
    { lesson_id: "swing_lesson_1", score: 85, passed: true }
];

const mockLessonRows = [
    { id: "oop_lesson_1", title: "Classes & Objects" },
    { id: "oop_lesson_2", title: "Constructors" },
    { id: "oop_lesson_3", title: "Object Methods" },
    { id: "oop_lesson_4", title: "Encapsulation" },
    { id: "oop_lesson_5", title: "Constructor Overloading" },
    { id: "oop_lesson_6", title: "Inheritance" },
    { id: "oop_lesson_7", title: "Polymorphism" },
    { id: "oop_lesson_8", title: "Abstract Classes" },
    { id: "oop_lesson_9", title: "Interfaces / Abstraction" },
    { id: "oop_lesson_10", title: "Interfaces" },
    { id: "oop_lesson_11", title: "Array of Objects" },
    { id: "oop_lesson_12", title: "Enum" }
];

const matrix = computeOopTopicPerformance(mockQuizAttempts, mockLessonRows);

assert.strictEqual(matrix.length, 12, `Matrix must output exactly 12 rows, found ${matrix.length}`);

// Confirm each row corresponds to 1..12 in order
for (let i = 0; i < 12; i++) {
    const expectedId = `oop_lesson_${i + 1}`;
    assert.strictEqual(matrix[i].topicId, expectedId, `Row ${i} should be ${expectedId}`);
    assert.strictEqual(matrix[i].sequence, i + 1, `Row ${i} sequence should be ${i + 1}`);
}
console.log("  ✅ PASS: Matrix outputs exactly 12 ordered rows matching oop_lesson_1 to oop_lesson_12");

// Verify Lesson 1 metrics
const row1 = matrix[0];
assert.strictEqual(row1.topicName, "Classes & Objects");
assert.strictEqual(row1.attempts, 3);
assert.strictEqual(row1.avgScore, 80); // (80 + 90 + 70)/3 = 80
assert.strictEqual(row1.passRate, 67); // 2/3 passed = 67%
assert.strictEqual(row1.status, "Strong");
console.log("  ✅ PASS: Lesson 1 correctly aggregated (3 attempts, avg 80%, Strong)");

// Verify Lesson 2 metrics
const row2 = matrix[1];
assert.strictEqual(row2.topicName, "Constructors");
assert.strictEqual(row2.attempts, 2);
assert.strictEqual(row2.avgScore, 63); // (60 + 65)/2 = 62.5 -> 63
assert.strictEqual(row2.passRate, 50); // 1/2 passed = 50%
assert.strictEqual(row2.status, "Average");
console.log("  ✅ PASS: Lesson 2 correctly aggregated (2 attempts, avg 63%, Average)");

// Verify Lesson 6 metrics
const row6 = matrix[5];
assert.strictEqual(row6.topicName, "Inheritance");
assert.strictEqual(row6.attempts, 2);
assert.strictEqual(row6.avgScore, 45);
assert.strictEqual(row6.status, "Struggling");
console.log("  ✅ PASS: Lesson 6 correctly aggregated (2 attempts, avg 45%, Struggling)");

// Verify Lesson 11 (Array of Objects) has 0 attempts -> Not Assessed
const row11 = matrix[10];
assert.strictEqual(row11.topicName, "Array of Objects");
assert.strictEqual(row11.attempts, 0);
assert.strictEqual(row11.averageScore, null);
assert.strictEqual(row11.avgScore, null);
assert.strictEqual(row11.passRate, null);
assert.strictEqual(row11.status, "Not Assessed");
console.log("  ✅ PASS: Unattempted Lesson 11 has averageScore=null, passRate=null, status='Not Assessed'");

// Verify Lesson 12 (Enum) appears once with 1 attempt
const row12 = matrix[11];
assert.strictEqual(row12.topicName, "Enum");
assert.strictEqual(row12.attempts, 1);
assert.strictEqual(row12.avgScore, 100);
assert.strictEqual(row12.status, "Strong");
console.log("  ✅ PASS: Lesson 12 (Enum) appears once with 1 attempt, avg 100%, Strong");

// Confirm that no other row is named Enum
const enumRows = matrix.filter(r => r.topicName.toLowerCase().includes("enum"));
assert.strictEqual(enumRows.length, 1, `Exactly one row named Enum expected in matrix, found: ${enumRows.length}`);
console.log("  ✅ PASS: Exactly one row named Enum exists in the entire 12-topic matrix");


// --- TEST GROUP 4: Frontend Mastery Filtering & Deduplication Simulation ---
console.log("\n--- Test Group 4: Frontend Filter & Deduplication Simulation ---");

// Test simulated UI filter behavior
const applyFilter = (topics, filter) => {
    // Exact logic from LearningAnalyticsTab.tsx
    const seen = new Set();
    const uniqueTopics = topics.filter(t => {
        const key = t.topicId || t.topicName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return uniqueTopics.filter(topic => {
        if (filter === 'All') return true;
        if (filter === 'Not Assessed') return topic.status === 'Not Assessed';
        if (filter === 'Strong') return topic.status === 'Strong';
        if (filter === 'Average') return topic.status === 'Average';
        if (filter === 'Struggling') return topic.status === 'Struggling';
        return true;
    });
};

const allFiltered = applyFilter(matrix, 'All');
assert.strictEqual(allFiltered.length, 12, "Filter 'All' should display all 12 unique topics");

const strongFiltered = applyFilter(matrix, 'Strong');
assert.strictEqual(strongFiltered.length, 2, "Filter 'Strong' should match Lesson 1 and Lesson 12");
assert(strongFiltered.every(t => t.status === 'Strong'));

const avgFiltered = applyFilter(matrix, 'Average');
assert.strictEqual(avgFiltered.length, 1, "Filter 'Average' should match Lesson 2");
assert.strictEqual(avgFiltered[0].topicName, "Constructors");

const strugglingFiltered = applyFilter(matrix, 'Struggling');
assert.strictEqual(strugglingFiltered.length, 1, "Filter 'Struggling' should match Lesson 6");
assert.strictEqual(strugglingFiltered[0].topicName, "Inheritance");

const notAssessedFiltered = applyFilter(matrix, 'Not Assessed');
assert.strictEqual(notAssessedFiltered.length, 8, "Filter 'Not Assessed' should match 8 unattempted topics");
assert(notAssessedFiltered.every(t => t.status === 'Not Assessed'));

// Deduplication test with simulated duplicate input
const corruptedInput = [...matrix, matrix[11]]; // Duplicate Enum appended
const deduplicated = applyFilter(corruptedInput, 'All');
assert.strictEqual(deduplicated.length, 12, "Deduplication must discard duplicate rows");

console.log("  ✅ PASS: All mastery level filters ('All', 'Strong', 'Average', 'Struggling', 'Not Assessed') accurately isolate topics");
console.log("  ✅ PASS: Defensive deduplication by topicId/topicName verified");

// --- TEST GROUP 5: Dynamic Aggregation for Appended Lessons (e.g. Lesson 13 Testing) ---
console.log("\n--- Test Group 5: Dynamic Aggregation for Appended Lessons (Lesson 13 Testing) ---");

const dynamicLessonRows = [
    ...mockLessonRows,
    { id: "oop_lesson_13", title: "Testing", sequence: 13, module: "Object-Oriented Programming (Java)" },
    { id: "swing_lesson_1", title: "Java Swing Intro", sequence: 14, module: "Java Swing" } // should be filtered out
];

const dynamicAttempts = [
    ...mockQuizAttempts,
    { lesson_id: "oop_lesson_13", score: 85, passed: true },
    { lesson_id: "oop_lesson_13", score: 95, passed: true }
];

const dynamicMatrix = computeOopTopicPerformance(dynamicAttempts, dynamicLessonRows);

assert.strictEqual(dynamicMatrix.length, 13, `Dynamic matrix must output exactly 13 rows for 13 OOP lessons, found ${dynamicMatrix.length}`);
const row13 = dynamicMatrix[12];
assert.strictEqual(row13.topicId, "oop_lesson_13");
assert.strictEqual(row13.sequence, 13);
assert.strictEqual(row13.topicName, "Testing");
assert.strictEqual(row13.attempts, 2);
assert.strictEqual(row13.avgScore, 90); // (85 + 95) / 2 = 90
assert.strictEqual(row13.passRate, 100);
assert.strictEqual(row13.status, "Strong");
assert(!dynamicMatrix.some(t => t.topicId.startsWith("swing_")), "Java Swing lessons must never leak into the OOP matrix");

console.log("  ✅ PASS: Appended Lesson 13 (Testing) dynamically populates row 13 in the matrix");
console.log("  ✅ PASS: Lesson 13 attempts and scores correctly aggregated (2 attempts, 90% avg, Strong)");
console.log("  ✅ PASS: Java Swing lessons cleanly excluded from OOP matrix");

console.log("\n================================================================");
console.log("🎯 ALL OOP TOPICS PERFORMANCE & MASTERY MATRIX TESTS PASSED (100%)");
console.log("================================================================\n");
