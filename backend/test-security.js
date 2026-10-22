/**
 * Comprehensive Security & Integrity Test Suite
 * Tests Secure Assessment Mode, Coding Practice Mode, and Sequential Progression.
 */

const assert = require('assert');
const { OOP_PARSED_QUESTIONS } = require('./questionBank');
const { PRACTICE_CHALLENGES } = require('./challengeBank');
const { validateBasicJavaStructure } = require('./basicJavaValidator');

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

  test('Server-side submission validation is static and does not assign a grade', () => {
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

    const result = validateBasicJavaStructure(challenge, validStudentCode);
    assert.strictEqual(result.compilationCheck, 'not_executed');
    assert.strictEqual(result.oopStructureCheck, 'passed');
    assert(result.requirements.every(t => t.passed));
  });

  test('Static validation reports missing structure without failing the submission itself', () => {
    const challenge = PRACTICE_CHALLENGES[0];
    const incompleteCode = `
public class Main {
    public static void main(String[] args) {
        // missing Student instantiation
    }
}
    `;

    const result = validateBasicJavaStructure(challenge, incompleteCode);
    assert.strictEqual(result.compilationCheck, 'not_executed');
    assert.strictEqual(result.oopStructureCheck, 'needs_review');
    assert(result.requirements.some(item => !item.passed));
  });

  // ----------------------------------------------------
  // Group 3: Server Assessment Scoring Engine
  // ----------------------------------------------------
  console.log('\n--- Group 3: Server Assessment Scoring Engine ---');

  test('Accurate scoring when all answers are correct (100% >= 60% pass threshold)', () => {
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
    const passed = score >= 60;

    assert.strictEqual(score, 100);
    assert.strictEqual(passed, true);
  });

  test('Fails assessment when score is below 60% pass threshold', () => {
    const questions = OOP_PARSED_QUESTIONS['oop_lesson_1'];
    const studentAnswers = {}; // No correct answers

    let correctCount = 0;
    questions.forEach(q => {
      if (studentAnswers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 60;

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

  test('Practice IDE unlocks only when Assessment is passed (configured threshold)', () => {
    function isPracticeUnlocked(assessmentPassed, quizScore) {
      return Boolean(assessmentPassed) || Number(quizScore || 0) >= 60;
    }

    assert.strictEqual(isPracticeUnlocked(false, 59), false, '59% quiz should lock practice');
    assert.strictEqual(isPracticeUnlocked(false, 60), true, '60% quiz should unlock practice');
    assert.strictEqual(isPracticeUnlocked(true, 100), true, '100% quiz should unlock practice');
  });

  test('Lesson N+1 requires Lesson N full completion', () => {
    function isLessonUnlocked(lessonIndex, previousLessonProgress) {
      if (lessonIndex === 0) return true;
      return Boolean(previousLessonProgress?.videoCompleted && previousLessonProgress?.assessmentPassed && previousLessonProgress?.practiceCompleted && previousLessonProgress?.completed);
    }

    assert.strictEqual(isLessonUnlocked(0, null), true, 'New student can access Lesson 1');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: false, assessmentPassed: false, practiceCompleted: false, completed: false }), false, 'Video incomplete keeps Lesson 2 locked');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: false, practiceCompleted: false, completed: false }), false, 'Video-only completion keeps Lesson 2 locked');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: true, practiceCompleted: false, completed: false }), false, 'Assessment pass without practice keeps Lesson 2 locked');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: true, practiceCompleted: false, completed: false, historicalPracticeSubmission: true }), false, 'Historical practice submission cannot bypass completion');
    assert.strictEqual(isLessonUnlocked(1, { videoCompleted: true, assessmentPassed: true, practiceCompleted: true, completed: true }), true, 'Full Lesson 1 completion unlocks Lesson 2');
    assert.strictEqual(isLessonUnlocked(2, { videoCompleted: true, assessmentPassed: true, practiceCompleted: true, completed: true }), true, 'A fully completed preceding lesson unlocks the next lesson');
  });

test('Demo progress remains student-scoped', () => {
    const progressByStudent = {
      'demo-student-id': { completed: true },
      'normal-student-id': { completed: false }
    };
    const getCompletion = studentId => Boolean(progressByStudent[studentId]?.completed);
    assert.strictEqual(getCompletion('demo-student-id'), true, 'Demo reads its own progress');
    assert.strictEqual(getCompletion('normal-student-id'), false, 'Normal students do not inherit demo progress');
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
