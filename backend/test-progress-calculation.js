const assert = require('assert');
const { calculateLessonProgress, calculateCourseProgress, isPracticeCompleted } = require('./progressCalculation');

assert.strictEqual(calculateLessonProgress({}), 0);
assert.strictEqual(calculateCourseProgress(Array(12).fill(0)), 0);
assert.strictEqual(calculateCourseProgress([100, ...Array(11).fill(0)]), 8.33);
assert.strictEqual(calculateCourseProgress(Array(6).fill(100).concat(Array(6).fill(0))), 50);
assert.strictEqual(calculateCourseProgress(Array(12).fill(100)), 100);
assert.strictEqual(calculateLessonProgress({ videoCompleted: true, assessmentPassed: true, practiceCompleted: false }), 66.67);
assert.strictEqual(calculateLessonProgress({ videoCompleted: true, assessmentPassed: false, practiceCompleted: false }), 33.33);
assert.strictEqual(isPracticeCompleted({}), false);
assert.strictEqual(isPracticeCompleted({ id: 'submission-pending' }), true);
assert.strictEqual(isPracticeCompleted({ submissionId: 'submission-pending' }), true);
assert.strictEqual(isPracticeCompleted({ id: 'submission-remedial', remedialRequired: true }), false);
assert.strictEqual(isPracticeCompleted({ id: 'submission-invalid', validationFailed: true }), false);

console.log('progress calculation tests passed');
