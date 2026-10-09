const assert = require('assert');
const { seedPracticeChallenges } = require('./server');
const { ACTIVE_OOP_PRACTICE_CHALLENGES } = require('./oopPracticeCatalog');

class FakeSeedClient {
    constructor() {
        this.challenges = new Map();
        this.testCases = new Map();
        this.transactions = 0;
    }

    async query(sql, params = []) {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized === 'BEGIN') {
            this.transactions += 1;
            return { rowCount: 0, rows: [] };
        }
        if (normalized === 'COMMIT' || normalized === 'ROLLBACK') return { rowCount: 0, rows: [] };
        if (normalized.startsWith('UPDATE programming_challenges SET status')) return { rowCount: 0, rows: [] };
        if (normalized.startsWith('INSERT INTO programming_challenges')) {
            this.challenges.set(params[0], { id: params[0], lesson_id: params[2] });
            return { rowCount: 1, rows: [] };
        }
        if (normalized.startsWith('INSERT INTO challenge_test_cases')) {
            assert.ok(normalized.includes('ON CONFLICT (id) DO NOTHING'), 'test-case seed must be idempotent');
            if (!this.testCases.has(params[0])) {
                this.testCases.set(params[0], {
                    id: params[0], challenge_id: params[1], input: params[2], expected_output: params[3]
                });
            }
            return { rowCount: 1, rows: [] };
        }
        throw new Error(`Unexpected seed query: ${normalized}`);
    }

    release() {}
}

const client = new FakeSeedClient();
client.challenges.set('legacy_challenge', { id: 'legacy_challenge', lesson_id: 'oop_lesson_1' });
client.testCases.set('classes_sample_output', {
    id: 'classes_sample_output',
    challenge_id: 'practice_1',
    input: 'custom input',
    expected_output: 'custom output'
});

const db = { connect: async () => client };

(async () => {
    await seedPracticeChallenges(db);
    await seedPracticeChallenges(db);

    const expectedTestCaseCount = ACTIVE_OOP_PRACTICE_CHALLENGES.reduce(
        (count, challenge) => count + (challenge.testCases || []).length,
        0
    );
    assert.strictEqual(client.transactions, 2, 'seeding twice must use two successful transactions');
    assert.strictEqual(client.testCases.size, expectedTestCaseCount, 'seeding twice must not duplicate test cases');
    assert.deepStrictEqual(client.testCases.get('classes_sample_output'), {
        id: 'classes_sample_output',
        challenge_id: 'practice_1',
        input: 'custom input',
        expected_output: 'custom output'
    }, 'existing customized seed rows must be preserved');
    assert.strictEqual(client.challenges.get('practice_3').lesson_id, 'oop_lesson_3');
    console.log('Practice seeding idempotency tests: PASS');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
