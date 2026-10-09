const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync(require.resolve('../src/components/PracticeIDE.tsx'), 'utf8');
assert.ok(source.includes('Promise.allSettled(accessRequests)'));
assert.ok(source.includes("setAccessLoadState('error')"));
assert.ok(source.includes('Retry access check'));
assert.ok(source.includes('accessAttempt'));

console.log('Practice IDE loading-state tests: PASS');
