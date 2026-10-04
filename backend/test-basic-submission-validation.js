const assert = require('assert');
const { validateBasicJavaStructure } = require('./basicJavaValidator');

const valid = validateBasicJavaStructure(
  { title: 'Classes and Objects' },
  'public class Student { private String name; public Student(String name) { this.name = name; } }'
);
assert.strictEqual(valid.compilationCheck, 'not_executed');
assert.strictEqual(valid.oopStructureCheck, 'passed');
assert(valid.requirements.every(item => item.passed));

const invalid = validateBasicJavaStructure(
  { title: 'Encapsulation' },
  'public class Student { public String name; }'
);
assert.strictEqual(invalid.oopStructureCheck, 'needs_review');
assert(invalid.requirements.some(item => item.message.includes('Encapsulation requirement not detected')));

console.log('Basic submission validation tests: PASS');
