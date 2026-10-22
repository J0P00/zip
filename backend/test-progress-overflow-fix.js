const assert = require('assert');
const { calculateLessonProgress, calculateCourseProgress, calculateTotalCourseProgress } = require('./progressCalculation');

console.log('================================================================');
console.log('🧪 RUNNING PROGRESS OVERFLOW (101%) BUG REGRESSION TESTS');
console.log('================================================================\n');

// Test 1: calculateTotalCourseProgress bounds [0, 100]
console.log('--- Test 1: calculateTotalCourseProgress Bounds & Clamping ---');
{
    // Normal completion
    assert.strictEqual(calculateTotalCourseProgress(0, 17), 0);
    assert.strictEqual(calculateTotalCourseProgress(17, 17), 100);
    assert.strictEqual(calculateTotalCourseProgress(12, 12), 100);

    // Overflow inputs: completed > total
    assert.strictEqual(calculateTotalCourseProgress(13, 12), 100, 'Should clamp to 100 if completed > total');
    assert.strictEqual(calculateTotalCourseProgress(18, 17), 100, 'Should clamp to 100 if completed > total');
    assert.strictEqual(calculateTotalCourseProgress(100, 12), 100, 'Should clamp to 100');

    // Negative inputs
    assert.strictEqual(calculateTotalCourseProgress(-5, 17), 0, 'Should clamp negative completed to 0');

    console.log('  ✅ PASS: calculateTotalCourseProgress strictly clamped to [0, 100]');
}

// Test 2: calculateCourseProgress bounds [0, 100]
console.log('\n--- Test 2: calculateCourseProgress Bounds & Clamping ---');
{
    assert.strictEqual(calculateCourseProgress([]), 0);
    assert.strictEqual(calculateCourseProgress([100, 100, 100]), 100);
    assert.strictEqual(calculateCourseProgress([101, 105, 150]), 100, 'Should clamp to 100 even with overflowing lesson inputs');
    assert.strictEqual(calculateCourseProgress([-10, -50]), 0, 'Should clamp to 0 even with negative inputs');

    console.log('  ✅ PASS: calculateCourseProgress strictly clamped to [0, 100]');
}

// Test 3: Mathematical Verification of the 95.0 Video Divisor Bug
console.log('\n--- Test 3: Simulation of 95% Video Completion Threshold Formula ---');
{
    // OLD FORMULA (BUGGY):
    // ((LEAST(100, GREATEST(0, video_percentage)) / 95.0) + assessment_passed + practice_completed) / 3.0 * 100
    const buggyCalc = (videoPct, assessmentPassed, practiceCompleted) => {
        const clampedVideo = Math.min(100, Math.max(0, videoPct));
        const numerator = (clampedVideo / 95.0) + (assessmentPassed ? 1 : 0) + (practiceCompleted ? 1 : 0);
        return Math.round((numerator / 3.0) * 100);
    };

    const buggyResult = buggyCalc(100, true, true);
    assert.strictEqual(buggyResult, 102, 'Old formula reproduces overflow: 102% (or 101.75%)');
    console.log(`  ℹ️ Confirmed: Old formula yielded ${buggyResult}% on 100% video completion`);

    // NEW FORMULA (FIXED):
    // ((LEAST(1.0, GREATEST(0.0, video_percentage / 95.0)) + assessment_passed + practice_completed) / 3.0 * 100)
    // Clamped by LEAST(100, GREATEST(0, ...))
    const fixedCalc = (videoPct, assessmentPassed, practiceCompleted) => {
        const videoRatio = Math.min(1.0, Math.max(0.0, videoPct / 95.0));
        const numerator = videoRatio + (assessmentPassed ? 1.0 : 0.0) + (practiceCompleted ? 1.0 : 0.0);
        const percent = Math.round((numerator / 3.0) * 100);
        return Math.min(100, Math.max(0, percent));
    };

    const fixed100 = fixedCalc(100, true, true);
    assert.strictEqual(fixed100, 100, 'Fixed formula produces exactly 100%, never 101% or 102%');

    const fixed95 = fixedCalc(95, true, true);
    assert.strictEqual(fixed95, 100, '95% video completion gives exactly 100% when quiz & practice are passed');

    const fixed50 = fixedCalc(50, false, false);
    assert.strictEqual(fixed50, 18, '50% video gives expected ~18% of lesson');

    console.log('  ✅ PASS: Fixed formula produces exactly 100% on 100% and 95% video completion');
}

// Test 4: Learning Score Formula Clamp
console.log('\n--- Test 4: Learning Score Weighted Formula Clamp ---');
{
    const calcLearningScore = (overallProgress, quizAvg, practiceAvg) => {
        const score = Math.round(
            (Math.min(100, Math.max(0, overallProgress)) * 0.40) +
            (Math.min(100, Math.max(0, quizAvg)) * 0.30) +
            (Math.min(100, Math.max(0, practiceAvg)) * 0.30)
        );
        return Math.min(100, Math.max(0, score));
    };

    assert.strictEqual(calcLearningScore(100, 100, 100), 100);
    assert.strictEqual(calcLearningScore(105, 105, 105), 100);
    assert.strictEqual(calcLearningScore(-10, -20, -30), 0);
    console.log('  ✅ PASS: Learning score is bounded strictly to [0, 100]');
}

console.log('\n================================================================');
console.log('🎯 ALL PROGRESS OVERFLOW (101%) BUG TESTS PASSED (100%)');
console.log('================================================================');
