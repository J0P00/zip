const requirement = (name, passed, message) => ({
  requirement: name,
  passed,
  message: passed ? `${name} detected.` : message
});

/**
 * Deliberately conservative, static checks. These checks describe source
 * structure only; they do not compile or execute student code and do not
 * determine the teacher's final grade.
 */
function validateBasicJavaStructure(challenge, sourceCode) {
  const source = String(sourceCode || '');
  const topic = `${challenge?.title || ''} ${challenge?.topicId || ''} ${challenge?.topic_id || ''}`.toLowerCase();
  const checks = [
    requirement('Java class exists', /\bclass\s+[A-Za-z_$][\w$]*/.test(source), 'A Java class was not detected.')
  ];

  if (topic.includes('class') || topic.includes('object') || /\bstudent\b/i.test(source)) {
    checks.push(requirement('Student class exists', /\bclass\s+Student\b/.test(source), 'Student class was not detected.'));
  }
  if (topic.includes('constructor') || /\bclass\s+Student\b/.test(source)) {
    checks.push(requirement('Constructor detected', /(?:public\s+)?[A-Za-z_$][\w$]*\s*\([^;{}]*\)\s*\{/.test(source), 'A constructor declaration was not detected.'));
  }
  if (topic.includes('encapsulat')) {
    checks.push(requirement('Private fields detected', /\bprivate\s+[\w$<>[\], ?]+\s+[A-Za-z_$][\w$]*\s*(?:=|;)/.test(source), 'Encapsulation requirement not detected: private fields are missing.'));
    checks.push(requirement('Getter/setter methods detected', /\b(get|set)[A-Z][A-Za-z0-9_$]*\s*\(/.test(source), 'Encapsulation requirement not detected: getter/setter methods are missing.'));
  }
  if (topic.includes('inherit')) {
    checks.push(requirement('Inheritance detected', /\bextends\s+[A-Za-z_$][\w$]*/.test(source), 'Inheritance requirement not detected.'));
  }
  if (topic.includes('polymorph')) {
    checks.push(requirement('Polymorphism structure detected', /\b(?:@Override|extends|implements)\b/.test(source), 'Polymorphism structure was not detected.'));
  }
  if (topic.includes('abstract')) {
    checks.push(requirement('Abstraction detected', /\babstract\s+(?:class|[\w$<>[\]]+\s+[A-Za-z_$][\w$]*\s*\()/.test(source), 'Abstraction requirement not detected.'));
  }
  if (topic.includes('interface')) {
    checks.push(requirement('Interface detected', /\binterface\s+[A-Za-z_$][\w$]*/.test(source), 'Interface requirement not detected.'));
  }

  return {
    compilationCheck: 'not_executed',
    oopStructureCheck: checks.every(check => check.passed) ? 'passed' : 'needs_review',
    requirements: checks,
    note: 'Basic static checks only. Teacher review is required for correctness and final grading.'
  };
}

module.exports = { validateBasicJavaStructure };
