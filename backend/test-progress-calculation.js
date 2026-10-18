const assert = require('assert');
const { calculateLessonProgress, calculateCourseProgress, isPracticeCompleted, canUnlockNextLesson } = require('./progressCalculation');

assert.strictEqual(calculateLessonProgress({}), 0);
assert.strictEqual(calculateCourseProgress(Array(12).fill(0)), 0);
assert.strictEqual(calculateCourseProgress([100, ...Array(11).fill(0)]), 8.33);
assert.strictEqual(calculateCourseProgress(Array(6).fill(100).concat(Array(6).fill(0))), 50);
assert.strictEqual(calculateCourseProgress(Array(12).fill(100)), 100);
assert.strictEqual(calculateLessonProgress({ videoCompleted: true, assessmentPassed: true, practiceCompleted: false }), 66.67);
assert.strictEqual(calculateLessonProgress({ videoCompleted: true, assessmentPassed: false, practiceCompleted: false }), 33.33);
assert.strictEqual(isPracticeCompleted({ id: 'submission-1', score: 40, compileStatus: 'failed' }), false);
assert.strictEqual(isPracticeCompleted({ score: 100, compileStatus: 'success' }), false);
assert.strictEqual(isPracticeCompleted({ id: 'submission-2', score: 100, compileStatus: 'success' }), true);
assert.strictEqual(isPracticeCompleted({ id: 'submission-3', score: 100, compileStatus: 'success', remedialRequired: true }), true);
assert.strictEqual(canUnlockNextLesson({ videoCompleted: true, assessmentPassed: true, practiceCompleted: true }), true);
assert.strictEqual(canUnlockNextLesson({ videoCompleted: true, assessmentPassed: true, practiceCompleted: false }), false);
assert.strictEqual(canUnlockNextLesson({ videoCompleted: true, assessmentPassed: false, practiceCompleted: true }), false);
assert.strictEqual(canUnlockNextLesson({ videoCompleted: false, assessmentPassed: true, practiceCompleted: true }), false);

console.log('progress calculation tests passed');
