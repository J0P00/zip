const assert = require('assert');
const {
    ACTIVE_OOP_PRACTICE_CHALLENGES,
    ACTIVE_OOP_PRACTICE_IDS,
    OOP_PRACTICE_LESSON_IDS
} = require('./oopPracticeCatalog');

assert.strictEqual(ACTIVE_OOP_PRACTICE_CHALLENGES.length, 12);
assert.deepStrictEqual(ACTIVE_OOP_PRACTICE_CHALLENGES.map(challenge => challenge.id), ACTIVE_OOP_PRACTICE_IDS);
assert.deepStrictEqual(
    ACTIVE_OOP_PRACTICE_CHALLENGES.map(challenge => challenge.lessonId),
    OOP_PRACTICE_LESSON_IDS
);
assert.strictEqual(new Set(ACTIVE_OOP_PRACTICE_CHALLENGES.map(challenge => challenge.lessonId)).size, 12);
assert.ok(!ACTIVE_OOP_PRACTICE_IDS.includes('practice_13'));
assert.ok(!ACTIVE_OOP_PRACTICE_IDS.includes('practice_14'));
assert.strictEqual(ACTIVE_OOP_PRACTICE_CHALLENGES[9].title, 'Process an array of objects');
assert.strictEqual(ACTIVE_OOP_PRACTICE_CHALLENGES[11].lessonId, 'oop_lesson_12');

console.log('OOP practice catalog tests: PASS');
