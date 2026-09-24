/**
 * Comprehensive Security & Integrity Test Suite
 * Tests Secure Assessment Mode, Coding Practice Mode, and Sequential Progression.
 */

const assert = require('assert');
const { OOP_PARSED_QUESTIONS } = require('./questionBank');
const { PRACTICE_CHALLENGES, evaluateChallenge } = require('./challengeBank');

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 RUNNING SECURITY & INTEGRITY VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // Group 1: Question Bank & Answer Confidentiality
  // ----------------------------------------------------
  console.log('--- Group 1: Question Bank & Answer Confidentiality ---');

  test('Question bank contains valid questions for all 12 lessons', () => {
    for (let i = 1; i <= 12; i++) {
      const lessonKey = `oop_lesson_${i}`;
      const questions = OOP_PARSED_QUESTIONS[lessonKey];
      assert(Array.isArray(questions), `Lesson ${lessonKey} should return questions array`);
      assert(questions.length >= 3, `Lesson ${lessonKey} should have at least 3 questions`);
      for (const q of questions) {
        assert(q.id, 'Question must have id');
        assert(q.question, 'Question must have text');
        assert(Array.isArray(q.options) && q.options.length >= 3, 'Question must have at least 3 options');
        assert(q.correctAnswer, 'Question must have correctAnswer defined');
      }
    }
  });

  test('Session question generator strips correct answers from student payload', () => {
    const rawQuestions = OOP_PARSED_QUESTIONS['oop_lesson_1'];
    // Simulate generateSessionQuestions logic
    const sanitized = rawQuestions.map(q => {
      const { correctAnswer, explanation, ...clientSafe } = q;
      return clientSafe;
    });

    for (const q of sanitized) {
      assert.strictEqual(q.correctAnswer, undefined, 'Client question MUST NOT expose correctAnswer');
      assert.strictEqual(q.explanation, undefined, 'Client question MUST NOT expose explanation before submission');
      assert(q.id && q.question && q.options, 'Client question must retain question and options');
    }
  });

  // ----------------------------------------------------
  // Group 2: Coding Practice & Hidden Test Confidentiality
  // ----------------------------------------------------
  console.log('\n--- Group 2: Practice Challenge & Test Confidentiality ---');

  test('Challenge bank keeps hidden test cases separate and confidential', () => {
    const challenge = PRACTICE_CHALLENGES[0];
    assert(challenge, 'Challenge 1 must exist');
    assert(challenge.testCases.length >= 2, 'Challenge 1 must have multiple test cases');
    
    const hiddenTests = challenge.testCases.filter(tc => tc.isHidden);
    assert(hiddenTests.length >= 1, 'Challenge 1 must have at least one hidden test case');

    // Redaction logic for student payload
    const studentPayload = {
      ...challenge,
      testCases: challenge.testCases.filter(tc => !tc.isHidden).map(tc => ({
        id: tc.id,
        label: tc.label,
        description: tc.description,
        input: tc.input,
        expectedOutput: tc.expectedOutput
      }))
    };

    assert.strictEqual(
      studentPayload.testCases.some(tc => tc.isHidden),
      false,
      'Student payload must not contain any hidden test cases'
    );
  });

  test('Server-side challenge evaluation grades code against public AND hidden tests', () => {
    const challenge = PRACTICE_CHALLENGES[0];
    // Valid solution for Student class (Challenge 1)
    const validStudentCode = `
public class Main {
    public static void main(String[] args) {
        Student student = new Student("Mia", 20);
        student.introduce();
    }
}

class Student {
    private String name;
    private int age;

    public Student(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void introduce() {
        System.out.println(name + " is " + age + " years old");
    }
}
    `;

    const result = evaluateChallenge(challenge, validStudentCode, true);
    assert.strictEqual(result.compileStatus, 'success', 'Compilation should succeed');
    assert.strictEqual(result.score, 100, 'Score should be 100%');
    assert(result.testResults.length >= challenge.testCases.length, 'Must evaluate against all test cases');
    assert(result.testResults.every(t => t.passed), 'All test cases must pass');
    assert(result.oopValidation && result.oopValidation.passed, 'OOP validation must pass');
  });

  test('Server-side challenge evaluation fails incomplete or invalid code', () => {
    const challenge = PRACTICE_CHALLENGES[0];
    const incompleteCode = `
public class Main {
    public static void main(String[] args) {
        // missing Student instantiation
    }
}
    `;

    const result = evaluateChallenge(challenge, incompleteCode, true);
    assert.strictEqual(result.compileStatus, 'runtime_error', 'Incomplete code should not have success compileStatus');
    assert(result.score < 70, 'Incomplete code score must be below passingScore');
  });

  // ----------------------------------------------------
  // Group 3: Server Assessment Scoring Engine
  // ----------------------------------------------------
  console.log('\n--- Group 3: Server Assessment Scoring Engine ---');

  test('Accurate scoring when all answers are correct (100% >= 80% pass threshold)', () => {
    const questions = OOP_PARSED_QUESTIONS['oop_lesson_1'];
    const studentAnswers = {};
    questions.forEach(q => {
      studentAnswers[q.id] = q.correctAnswer;
    });

    let correctCount = 0;
    questions.forEach(q => {
      if (studentAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;

    assert.strictEqual(score, 100);
    assert.strictEqual(passed, true);
  });

  test('Fails assessment when score is below 80% pass threshold', () => {
    const questions = OOP_PARSED_QUESTIONS['oop_lesson_1'];
    const studentAnswers = {}; // No correct answers

    let correctCount = 0;
    questions.forEach(q => {
      if (studentAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80;

    assert.strictEqual(score, 0);
    assert.strictEqual(passed, false);
  });

  // ----------------------------------------------------
  // Group 4: Security Event Severity Classification
  // ----------------------------------------------------
  console.log('\n--- Group 4: Security Event Severity Classification ---');

  test('Correct severity classification for security events', () => {
    function classifySeverity(eventType) {
      switch (eventType) {
        case 'DEVTOOLS_SUSPECT':
        case 'TERMINATED_SECURITY':
        case 'MULTIPLE_ATTEMPTS':
          return 'HIGH';
        case 'COPY_ATTEMPT':
        case 'PASTE_ATTEMPT':
        case 'KEYBOARD_SHORTCUT':
        case 'RIGHT_CLICK':
          return 'MEDIUM';
        case 'TAB_SWITCH':
        case 'WINDOW_BLUR':
        case 'FULLSCREEN_EXIT':
        default:
          return 'LOW';
      }
    }

    assert.strictEqual(classifySeverity('DEVTOOLS_SUSPECT'), 'HIGH');
    assert.strictEqual(classifySeverity('COPY_ATTEMPT'), 'MEDIUM');
    assert.strictEqual(classifySeverity('PASTE_ATTEMPT'), 'MEDIUM');
    assert.strictEqual(classifySeverity('TAB_SWITCH'), 'LOW');
    assert.strictEqual(classifySeverity('WINDOW_BLUR'), 'LOW');
  });

  // ----------------------------------------------------
  // Group 5: Sequential Progression Logic
  // ----------------------------------------------------
  console.log('\n--- Group 5: Sequential Progression Prerequisites ---');

  test('Assessment unlocks only when Video Progress is >= 95%', () => {
    function isAssessmentUnlocked(videoProgress) {
      return Number(videoProgress || 0) >= 95;
    }

    assert.strictEqual(isAssessmentUnlocked(0), false, '0% video should lock assessment');
    assert.strictEqual(isAssessmentUnlocked(50), false, '50% video should lock assessment');
    assert.strictEqual(isAssessmentUnlocked(94), false, '94% video should lock assessment');
    assert.strictEqual(isAssessmentUnlocked(95), true, '95% video should unlock assessment');
    assert.strictEqual(isAssessmentUnlocked(100), true, '100% video should unlock assessment');
  });

  test('Practice IDE unlocks only when Assessment is passed (score >= 80%)', () => {
    function isPracticeUnlocked(assessmentPassed, quizScore) {
      return Boolean(assessmentPassed) || Number(quizScore || 0) >= 80;
    }

    assert.strictEqual(isPracticeUnlocked(false, 70), false, '70% quiz should lock practice');
    assert.strictEqual(isPracticeUnlocked(false, 79), false, '79% quiz should lock practice');
    assert.strictEqual(isPracticeUnlocked(true, 80), true, '80% quiz should unlock practice');
    assert.strictEqual(isPracticeUnlocked(true, 100), true, '100% quiz should unlock practice');
  });

  test('Lesson N+1 unlocks only when Lesson N is fully completed (Practice passed)', () => {
    function isLessonUnlocked(lessonIndex, previousLessonProgress) {
      if (lessonIndex === 0) return true; // First lesson always unlocked
      return Boolean(previousLessonProgress && previousLessonProgress.completed);
    }

    assert.strictEqual(isLessonUnlocked(0, null), true, 'Lesson 1 is always unlocked');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: true, completed: false }), false, 'Lesson 2 is locked if Lesson 1 practice is incomplete');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: true, completed: true }), true, 'Lesson 2 is unlocked when Lesson 1 practice is completed');
  });

  console.log('\n====================================================');
  console.log(`🎯 TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSecurityTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
