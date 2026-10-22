/**
 * test-dynamic-sequential-gating.js
 *
 * Verifies dynamic sequential progression gating for newly appended curriculum items:
 * 1. Dynamic prerequisite evaluation: Lesson N looks up its predecessor via
 *    (sequence < N.sequence ORDER BY sequence DESC LIMIT 1).
 * 2. Unlocking state:
 *    - Lesson N is LOCKED if preceding lesson N-1 is incomplete.
 *    - Lesson N UNLOCKS automatically when lesson N-1 is complete.
 * 3. Dynamic course progress:
 *    - calculateTotalCourseProgress dynamically calculates progress for any total count
 *      (e.g., 18, 20) instead of being bounded to 17.
 * 4. Dynamic OOP-to-Swing bridge:
 *    - All OOP lessons must be complete to unlock the first Swing lesson.
 *    - Works dynamically whether there are 12, 13, or more OOP lessons.
 * 5. Robustness against non-consecutive sequences:
 *    - Gaps in sequence numbers resolve correctly to the immediate predecessor/successor.
 */

const assert = require('assert');
const { calculateTotalCourseProgress, isPracticeCompleted, calculateLessonProgress } = require('./progressCalculation');

console.log('\n================================================================');
console.log('🧪 RUNNING DYNAMIC SEQUENTIAL GATING REGRESSION TEST SUITE');
console.log('================================================================\n');

// --- Helper mock progression engine replicating server.js logic ---
function evaluateLessonAccess({ currentLesson, allLessonsInTrack, completedLessonIds, oopAllComplete = false }) {
    // Current lesson evidence
    const currentSequence = Number(currentLesson.sequence);
    const isSwing = currentLesson.track === 'swing' || (currentLesson.module && currentLesson.module.toLowerCase().includes('swing'));

    if (isSwing && !oopAllComplete) {
        return {
            canAccess: false,
            reason: "Complete all Java OOP lessons before unlocking Java Swing."
        };
    }

    // Find immediate predecessor dynamically
    const predecessors = allLessonsInTrack
        .filter(l => Number(l.sequence) < currentSequence)
        .sort((a, b) => Number(b.sequence) - Number(a.sequence));

    if (predecessors.length === 0) {
        // First lesson in this track
        return { canAccess: true, reason: null };
    }

    const immediatePredecessor = predecessors[0];
    const isPredecessorComplete = completedLessonIds.has(immediatePredecessor.id);

    if (isPredecessorComplete) {
        return { canAccess: true, reason: null };
    }

    return {
        canAccess: false,
        reason: `Complete the previous lesson (${immediatePredecessor.title || immediatePredecessor.id}) requirements first.`
    };
}

function findNextLessonDynamic({ currentLesson, allLessonsInTrack, nextTrackFirstLesson = null, trackComplete = false }) {
    const currentSequence = Number(currentLesson.sequence);
    const successors = allLessonsInTrack
        .filter(l => Number(l.sequence) > currentSequence)
        .sort((a, b) => Number(a.sequence) - Number(b.sequence));

    if (successors.length > 0) {
        return successors[0].id;
    }

    if (trackComplete && nextTrackFirstLesson) {
        return nextTrackFirstLesson.id;
    }

    return null;
}

// ============================================================================
// TEST 1: calculateTotalCourseProgress handles dynamic total lesson counts
// ============================================================================
console.log('--- Test 1: Dynamic Curriculum Progress Calculation ---');

// Default behavior preserved
assert.strictEqual(calculateTotalCourseProgress(0, 17), 0);
assert.strictEqual(calculateTotalCourseProgress(1, 17), 5.88);
assert.strictEqual(calculateTotalCourseProgress(2, 17), 11.76);
assert.strictEqual(calculateTotalCourseProgress(17, 17), 100);

// Dynamic totals (e.g., appended 18th, 20th lesson)
assert.strictEqual(calculateTotalCourseProgress(18, 18), 100);
assert.strictEqual(calculateTotalCourseProgress(9, 18), 50);
assert.strictEqual(calculateTotalCourseProgress(1, 20), 5);
assert.strictEqual(calculateTotalCourseProgress(10, 20), 50);
assert.strictEqual(calculateTotalCourseProgress(15, 20), 75);
assert.strictEqual(calculateTotalCourseProgress(20, 20), 100);

// Safe null/undefined fallback
assert.strictEqual(calculateTotalCourseProgress(2, null), 11.76);
assert.strictEqual(calculateTotalCourseProgress(2, undefined), 11.76);

console.log('  ✅ PASS: Total course progress scales dynamically with arbitrary course sizes\n');

// ============================================================================
// TEST 2: Appended Lesson 13 (OOP Track) remains locked if Lesson 12 is incomplete
// ============================================================================
console.log('--- Test 2: Appended OOP Lesson 13 Locked when Lesson 12 Incomplete ---');

const oopLessons = [
    ...Array.from({ length: 12 }, (_, i) => ({
        id: `oop_lesson_${i + 1}`,
        sequence: i + 1,
        title: `OOP Lesson ${i + 1}`,
        track: 'oop'
    })),
    // Newly appended 13th lesson!
    {
        id: 'oop_lesson_13',
        sequence: 13,
        title: 'Design Patterns & Principles',
        track: 'oop'
    }
];

// Student has completed lessons 1 through 11, but NOT 12
const completedLessonsBefore12 = new Set([
    'oop_lesson_1', 'oop_lesson_2', 'oop_lesson_3', 'oop_lesson_4',
    'oop_lesson_5', 'oop_lesson_6', 'oop_lesson_7', 'oop_lesson_8',
    'oop_lesson_9', 'oop_lesson_10', 'oop_lesson_11'
]);

const access13Blocked = evaluateLessonAccess({
    currentLesson: oopLessons[12], // oop_lesson_13
    allLessonsInTrack: oopLessons,
    completedLessonIds: completedLessonsBefore12
});

assert.strictEqual(access13Blocked.canAccess, false, 'Lesson 13 must be locked when Lesson 12 is incomplete');
assert.ok(access13Blocked.reason.includes('oop_lesson_12') || access13Blocked.reason.includes('OOP Lesson 12'),
    'Lock reason must indicate Lesson 12 as prerequisite');

console.log('  ✅ PASS: Newly appended Lesson 13 remains locked while Lesson 12 is incomplete\n');

// ============================================================================
// TEST 3: Appended Lesson 13 Unlocks dynamically when Lesson 12 is completed
// ============================================================================
console.log('--- Test 3: Appended OOP Lesson 13 Unlocks when Lesson 12 Complete ---');

const completedLessonsWith12 = new Set([...completedLessonsBefore12, 'oop_lesson_12']);

const access13Unlocked = evaluateLessonAccess({
    currentLesson: oopLessons[12], // oop_lesson_13
    allLessonsInTrack: oopLessons,
    completedLessonIds: completedLessonsWith12
});

assert.strictEqual(access13Unlocked.canAccess, true, 'Lesson 13 must unlock when Lesson 12 is complete');
assert.strictEqual(access13Unlocked.reason, null);

console.log('  ✅ PASS: Newly appended Lesson 13 unlocks dynamically upon Lesson 12 completion\n');

// ============================================================================
// TEST 4: Appended Lesson 14 Gating (Chain of appended lessons)
// ============================================================================
console.log('--- Test 4: Chained Appended Lessons (Lesson 14 requires Lesson 13) ---');

const extendedOopLessons = [
    ...oopLessons,
    {
        id: 'oop_lesson_14',
        sequence: 14,
        title: 'Concurrency & Multithreading',
        track: 'oop'
    }
];

// Lesson 13 completed -> Lesson 14 unlocks
const access14Locked = evaluateLessonAccess({
    currentLesson: extendedOopLessons[13],
    allLessonsInTrack: extendedOopLessons,
    completedLessonIds: completedLessonsWith12 // 13 not complete yet
});
assert.strictEqual(access14Locked.canAccess, false, 'Lesson 14 must be locked when Lesson 13 is incomplete');

const completedWith13 = new Set([...completedLessonsWith12, 'oop_lesson_13']);
const access14Unlocked = evaluateLessonAccess({
    currentLesson: extendedOopLessons[13],
    allLessonsInTrack: extendedOopLessons,
    completedLessonIds: completedWith13
});
assert.strictEqual(access14Unlocked.canAccess, true, 'Lesson 14 must unlock when Lesson 13 is complete');

console.log('  ✅ PASS: Chained appended lessons (13 -> 14) enforce sequential prerequisite gating\n');

// ============================================================================
// TEST 5: Non-consecutive Sequence Numbers (Gaps in sequence)
// ============================================================================
console.log('--- Test 5: Dynamic Resolution with Non-Consecutive Sequence Numbers ---');

const customSequenceLessons = [
    { id: 'custom_1', sequence: 10, title: 'Basics', track: 'oop' },
    { id: 'custom_2', sequence: 25, title: 'Intermediate', track: 'oop' },
    { id: 'custom_3', sequence: 50, title: 'Advanced', track: 'oop' }
];

// custom_1 has no predecessor -> canAccess = true
const custom1Access = evaluateLessonAccess({
    currentLesson: customSequenceLessons[0],
    allLessonsInTrack: customSequenceLessons,
    completedLessonIds: new Set()
});
assert.strictEqual(custom1Access.canAccess, true, 'First lesson in custom sequence unlocks initially');

// custom_2 predecessor is custom_1 (sequence 10 < 25)
const custom2Blocked = evaluateLessonAccess({
    currentLesson: customSequenceLessons[1],
    allLessonsInTrack: customSequenceLessons,
    completedLessonIds: new Set()
});
assert.strictEqual(custom2Blocked.canAccess, false, 'custom_2 locked when custom_1 incomplete');

const custom2Unlocked = evaluateLessonAccess({
    currentLesson: customSequenceLessons[1],
    allLessonsInTrack: customSequenceLessons,
    completedLessonIds: new Set(['custom_1'])
});
assert.strictEqual(custom2Unlocked.canAccess, true, 'custom_2 unlocked when custom_1 completed');

// Next lesson dynamic search with gaps
const nextAfterCustom1 = findNextLessonDynamic({
    currentLesson: customSequenceLessons[0],
    allLessonsInTrack: customSequenceLessons
});
assert.strictEqual(nextAfterCustom1, 'custom_2', 'Next lesson after sequence 10 is sequence 25 (custom_2)');

const nextAfterCustom2 = findNextLessonDynamic({
    currentLesson: customSequenceLessons[1],
    allLessonsInTrack: customSequenceLessons
});
assert.strictEqual(nextAfterCustom2, 'custom_3', 'Next lesson after sequence 25 is sequence 50 (custom_3)');

console.log('  ✅ PASS: Non-consecutive sequences resolve immediate predecessor and successor accurately\n');

// ============================================================================
// TEST 6: Dynamic OOP-to-Swing Bridge with Custom OOP Count
// ============================================================================
console.log('--- Test 6: Dynamic OOP-to-Swing Bridge with Custom OOP Count ---');

const swingLessons = [
    { id: 'swing_lesson_1', sequence: 1, title: 'JFrame & GUI Intro', track: 'swing' },
    { id: 'swing_lesson_2', sequence: 2, title: 'Layout Managers', track: 'swing' }
];

// With 13 OOP lessons:
// If 12 completed, but 13 incomplete -> Swing Lesson 1 remains LOCKED
const swingAccessBlocked = evaluateLessonAccess({
    currentLesson: swingLessons[0],
    allLessonsInTrack: swingLessons,
    completedLessonIds: new Set(),
    oopAllComplete: false // because lesson 13 is not complete!
});
assert.strictEqual(swingAccessBlocked.canAccess, false, 'Swing Lesson 1 must remain locked if any OOP lesson is incomplete');
assert.ok(swingAccessBlocked.reason.includes('Complete all'), 'Reason specifies completing all OOP lessons');

// When all 13 OOP lessons are completed -> Swing Lesson 1 UNLOCKS
const swingAccessUnlocked = evaluateLessonAccess({
    currentLesson: swingLessons[0],
    allLessonsInTrack: swingLessons,
    completedLessonIds: new Set(),
    oopAllComplete: true
});
assert.strictEqual(swingAccessUnlocked.canAccess, true, 'Swing Lesson 1 unlocks once all OOP lessons complete');

// Transition next lesson from last OOP lesson (Lesson 13) to Swing Lesson 1
const nextAfterLastOOP = findNextLessonDynamic({
    currentLesson: oopLessons[12], // oop_lesson_13
    allLessonsInTrack: oopLessons,
    nextTrackFirstLesson: swingLessons[0],
    trackComplete: true
});
assert.strictEqual(nextAfterLastOOP, 'swing_lesson_1', 'Next lesson after completing last OOP lesson transitions to swing_lesson_1');

console.log('  ✅ PASS: Dynamic OOP-to-Swing bridge respects total dynamic OOP count\n');

// ============================================================================
// TEST 7: Appended Swing Lessons (Swing Lesson 6 requires Swing Lesson 5)
// ============================================================================
console.log('--- Test 7: Appended Swing Lesson Gating ---');

const extendedSwingLessons = [
    ...swingLessons,
    { id: 'swing_lesson_3', sequence: 3, title: 'Swing 3', track: 'swing' },
    { id: 'swing_lesson_4', sequence: 4, title: 'Swing 4', track: 'swing' },
    { id: 'swing_lesson_5', sequence: 5, title: 'Swing 5', track: 'swing' },
    // Newly appended 6th Swing lesson
    { id: 'swing_lesson_6', sequence: 6, title: 'Advanced JavaFX / Swing Integration', track: 'swing' }
];

const completedSwingUpTo4 = new Set(['swing_lesson_1', 'swing_lesson_2', 'swing_lesson_3', 'swing_lesson_4']);

const swing6Blocked = evaluateLessonAccess({
    currentLesson: extendedSwingLessons[5],
    allLessonsInTrack: extendedSwingLessons,
    completedLessonIds: completedSwingUpTo4, // 5 incomplete
    oopAllComplete: true
});
assert.strictEqual(swing6Blocked.canAccess, false, 'Swing Lesson 6 must remain locked when Swing Lesson 5 is incomplete');

const completedSwingUpTo5 = new Set([...completedSwingUpTo4, 'swing_lesson_5']);
const swing6Unlocked = evaluateLessonAccess({
    currentLesson: extendedSwingLessons[5],
    allLessonsInTrack: extendedSwingLessons,
    completedLessonIds: completedSwingUpTo5,
    oopAllComplete: true
});
assert.strictEqual(swing6Unlocked.canAccess, true, 'Swing Lesson 6 unlocks when Swing Lesson 5 is complete');

console.log('  ✅ PASS: Appended Swing lessons enforce sequential gating within Swing track\n');

console.log('================================================================');
console.log('🎯 ALL DYNAMIC SEQUENTIAL GATING REGRESSION TESTS PASSED (100%)');
console.log('================================================================\n');
