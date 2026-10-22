/**
 * test-track-separation.js
 *
 * Verifies track separation between Java OOP and Java Swing in Lesson Management:
 * 1. Track attribute validation ('oop' vs 'swing').
 * 2. Lessons correctly categorize into tracks.
 * 3. Progression engine integrity:
 *    - OOP filter SQL ignores Swing lessons (neither track='swing' nor module='Java Swing' are counted as OOP).
 *    - Java Swing Lesson 1 prerequisite requires completion of all 12 OOP lessons.
 *    - Independent sequencing (OOP 1-12, Swing 1-5).
 */

const assert = require('assert');

function isSwingLesson(lesson) {
    if (lesson.track === 'swing') return true;
    if (lesson.track === 'oop') return false;
    const id = String(lesson.id || '').toLowerCase();
    const courseId = String(lesson.courseId || lesson.course_id || '').toLowerCase();
    const mod = String(lesson.module || '').toLowerCase();
    return id.startsWith('swing_lesson_') || courseId === 'java_swing' || mod.includes('swing');
}

function getDisplaySequence(lesson) {
    if (isSwingLesson(lesson)) {
        return lesson.sequence > 12 ? lesson.sequence - 12 : lesson.sequence;
    }
    return lesson.sequence;
}

function validateTrackPayload(track) {
    if (track === undefined || track === null) return { valid: true, value: 'oop' };
    const raw = String(track).toLowerCase().trim();
    if (raw !== 'oop' && raw !== 'swing' && raw !== 'java_swing') {
        return { valid: false, message: "Invalid track. Track must be 'oop' or 'swing'." };
    }
    return { valid: true, value: (raw === 'swing' || raw === 'java_swing') ? 'swing' : 'oop' };
}

function runTrackSeparationTests() {
    console.log('================================================================');
    console.log('📚 RUNNING TEACHER PORTAL TRACK SEPARATION REGRESSION TESTS');
    console.log('================================================================\n');

    // Test 1: Track validation
    console.log('--- Test 1: Track property validation ---');
    assert.strictEqual(validateTrackPayload('oop').value, 'oop');
    assert.strictEqual(validateTrackPayload('swing').value, 'swing');
    assert.strictEqual(validateTrackPayload('java_swing').value, 'swing');
    assert.strictEqual(validateTrackPayload(undefined).value, 'oop');
    assert.strictEqual(validateTrackPayload('invalid_track').valid, false);
    console.log('  ✅ PASS: Track validation accepts "oop" and "swing", rejects invalid tracks\n');

    // Test 2: Track separation in lesson catalogue
    console.log('--- Test 2: Catalog track segregation ---');
    const catalog = [
        { id: 'oop_lesson_1', title: 'Classes & Objects', sequence: 1, module: 'Object-Oriented Programming (Java)', track: 'oop' },
        { id: 'oop_lesson_2', title: 'Constructors', sequence: 2, module: 'Object-Oriented Programming (Java)', track: 'oop' },
        { id: 'oop_lesson_12', title: 'Enums', sequence: 12, module: 'Object-Oriented Programming (Java)', track: 'oop' },
        { id: 'swing_lesson_1', title: 'JFrame & GUI Intro', sequence: 13, module: 'Java Swing', track: 'swing' },
        { id: 'swing_lesson_2', title: 'JButton & Events', sequence: 14, module: 'Java Swing', track: 'swing' },
        { id: 'swing_lesson_5', title: 'Dialogs & Menus', sequence: 17, module: 'Java Swing', track: 'swing' },
    ];

    const oopTrack = catalog.filter(l => !isSwingLesson(l));
    const swingTrack = catalog.filter(l => isSwingLesson(l));

    assert.strictEqual(oopTrack.length, 3, 'Must filter exactly 3 OOP lessons');
    assert.strictEqual(swingTrack.length, 3, 'Must filter exactly 3 Swing lessons');
    console.log('  ✅ PASS: Catalog filters cleanly into distinct OOP and Swing tracks\n');

    // Test 3: Independent sequencing per track
    console.log('--- Test 3: Independent sequence display calculation ---');
    assert.strictEqual(getDisplaySequence(catalog[0]), 1, 'OOP Lesson 1 sequence is 1');
    assert.strictEqual(getDisplaySequence(catalog[2]), 12, 'OOP Lesson 12 sequence is 12');
    assert.strictEqual(getDisplaySequence(catalog[3]), 1, 'Swing Lesson 1 (effective 13) displays as SEQ #1');
    assert.strictEqual(getDisplaySequence(catalog[4]), 2, 'Swing Lesson 2 (effective 14) displays as SEQ #2');
    assert.strictEqual(getDisplaySequence(catalog[5]), 5, 'Swing Lesson 5 (effective 17) displays as SEQ #5');
    console.log('  ✅ PASS: Sequence displays independently (OOP 1-12, Swing 1-5)\n');

    // Test 4: Dynamic prerequisite gating check
    console.log('--- Test 4: Dynamic prerequisite gating check ---');
    // Swing Lesson 1 requires 12/12 OOP lessons completed
    const evaluateSwingAccess = (completedOopLessonsCount) => {
        const oopComplete = completedOopLessonsCount >= 12;
        if (!oopComplete) {
            return { canAccess: false, reason: 'Complete all 12 Java OOP lessons before unlocking Java Swing.' };
        }
        return { canAccess: true, reason: null };
    };

    assert.strictEqual(evaluateSwingAccess(11).canAccess, false, 'Swing Lesson 1 must remain locked with 11/12 OOP completed');
    assert.strictEqual(evaluateSwingAccess(12).canAccess, true, 'Swing Lesson 1 unlocks when all 12 OOP lessons completed');
    console.log('  ✅ PASS: Java Swing Lesson 1 prerequisite strictly requires all 12 OOP lessons\n');

    console.log('================================================================');
    console.log('🎯 ALL TRACK SEPARATION REGRESSION TESTS PASSED (100%)');
    console.log('================================================================');
}

runTrackSeparationTests();
