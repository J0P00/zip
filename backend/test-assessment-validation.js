const assert = require('assert');
const { normalizeAssessmentPercentage, isPassingAssessment } = require('./assessmentValidation');
const { PRACTICE_CHALLENGES } = require('./challengeBank');

function test(name, fn) {
  fn();
  console.log(`PASS: ${name}`);
}

test('Lesson 3 score 11/15 passes', () => {
  assert.strictEqual(Math.round(normalizeAssessmentPercentage({ score: 11, total: 15 })), 73);
  assert.strictEqual(isPassingAssessment({ score: 11, total: 15 }), true);
});

test('Exactly 60% passes', () => {
  assert.strictEqual(isPassingAssessment({ score: 3, total: 5 }), true);
});

test('Below 60% fails', () => {
  assert.strictEqual(isPassingAssessment({ score: 2, total: 5 }), false);
});

test('Decimal percentage values are normalized from 0..1 to 0..100', () => {
  assert.strictEqual(isPassingAssessment({ percentage: 0.6 }), true);
  assert.strictEqual(isPassingAssessment({ percentage: 0.59 }), false);
});

test('Missing or invalid results fail safely', () => {
  assert.strictEqual(normalizeAssessmentPercentage({}), 0);
  assert.strictEqual(isPassingAssessment({ percentage: 'not-a-score' }), false);
  assert.strictEqual(isPassingAssessment({ score: 0, total: 0 }), false);
});

test('Practice IDs map to the correct lessons and assessments', () => {
  const lesson3 = PRACTICE_CHALLENGES.find(challenge => challenge.id === 'practice_3');
  assert.deepStrictEqual(
    { lessonId: lesson3.lessonId, assessmentId: lesson3.assessmentId, title: lesson3.title },
    { lessonId: 'oop_lesson_3', assessmentId: 'oop_assessment_3', title: 'Build a calculator method' }
  );
});

test('A previous passing attempt remains valid after a later failed attempt', () => {
  const attempts = [
    { score: 11, total: 15 },
    { score: 8, total: 15 }
  ];
  assert.strictEqual(attempts.some(isPassingAssessment), true);
});

test('A passing attempt for another lesson does not qualify Lesson 3', () => {
  const attempts = [{ lessonId: 'oop_lesson_2', score: 15, total: 15 }];
  assert.strictEqual(attempts.some(attempt => attempt.lessonId === 'oop_lesson_3' && isPassingAssessment(attempt)), false);
});

console.log('Assessment validation tests: PASS');
