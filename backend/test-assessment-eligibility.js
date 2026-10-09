const assert = require('assert');
const { hasPassingAssessment } = require('./assessmentEligibility');

const base = {
    lessonId: 'oop_lesson_3',
    canonicalAssessmentId: 'oop_assessment_3',
    databaseAssessmentIds: ['assessment-db-3']
};

assert.strictEqual(hasPassingAssessment({
    ...base,
    attempts: [{ assessment_id: 'oop_assessment_3', lesson_id: 'oop_lesson_3', score: 11, total: 15 }]
}), true, '11/15 must pass Lesson 3 at 60% threshold');

assert.strictEqual(hasPassingAssessment({
    ...base,
    attempts: [{ assessment_id: 'assessment-db-3', lesson_id: '', score: 11, total: 15 }]
}), true, 'legacy empty lesson_id may use the database assessment bound to Lesson 3');

assert.strictEqual(hasPassingAssessment({
    ...base,
    attempts: [{ assessment_id: 'oop_assessment_2', lesson_id: 'oop_lesson_2', score: 15, total: 15 }]
}), false, 'a passing attempt for another lesson cannot unlock Lesson 3');

assert.strictEqual(hasPassingAssessment({
    ...base,
    attempts: [{ assessment_id: 'oop_assessment_3', lesson_id: 'oop_lesson_3', score: 8, total: 15 }]
}), false, 'below-threshold Lesson 3 attempts must remain blocked');

console.log('Assessment eligibility regression tests: PASS');
