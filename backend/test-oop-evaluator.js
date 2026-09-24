const assert = require('assert');
const { PRACTICE_CHALLENGES, evaluateChallenge } = require('./challengeBank');

function runOopEvaluatorTests() {
  console.log('================================================================');
  console.log('🧪 TESTING ADVANCED JAVA OOP PRACTICE EVALUATOR');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  const studentChallenge = PRACTICE_CHALLENGES.find(c => c.id === 'practice_1' || c.topicId === 'classes-objects');
  assert.ok(studentChallenge, 'Found Student challenge');

  console.log('--- Test 1: Procedural Solution (Output passes, OOP Structure fails) ---');
  const proceduralCode = `
public class Main {
    public static void main(String[] args) {
        String name = "Mia";
        int age = 20;
        System.out.println(name + " is " + age + " years old");
    }
}
`;

  const proceduralResult = evaluateChallenge(studentChallenge, proceduralCode, true);
  
  test('Procedural code compiles and runs', () => {
    assert.strictEqual(proceduralResult.compileStatus, 'runtime_error'); // runtime_error because overall evaluation failed
  });

  test('Procedural code output matches text but OOP structure is FALSE', () => {
    assert.strictEqual(proceduralResult.oopValidation.passed, false);
    assert.ok(proceduralResult.oopValidation.passedCount < proceduralResult.oopValidation.total);
    assert.strictEqual(proceduralResult.isPassed, false);
  });

  test('Procedural code automated score is below passing threshold', () => {
    assert.ok(proceduralResult.score < studentChallenge.passingScore, `Score ${proceduralResult.score} should be < ${studentChallenge.passingScore}`);
  });

  test('Educational feedback clearly identifies missing Student class and methods', () => {
    const feedbackStr = proceduralResult.educationalFeedback.join('\n');
    assert.ok(feedbackStr.includes('Student'), 'Feedback mentions Student class');
    assert.ok(feedbackStr.includes('introduce'), 'Feedback mentions introduce method');
  });

  console.log('\n--- Test 2: Standard OOP Solution (Class, Object, Constructor, Method) ---');
  const standardOopCode = `
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

  const standardResult = evaluateChallenge(studentChallenge, standardOopCode, true);

  test('Standard OOP code compiles cleanly with status "success"', () => {
    assert.strictEqual(standardResult.compileStatus, 'success');
  });

  test('Standard OOP code passes all OOP structural requirements (100%)', () => {
    assert.strictEqual(standardResult.oopValidation.passed, true);
    assert.strictEqual(standardResult.oopValidation.score, 100);
    assert.strictEqual(standardResult.oopValidation.passedCount, standardResult.oopValidation.total);
  });

  test('Standard OOP code passes behavioral tests and hidden tests', () => {
    assert.strictEqual(standardResult.behavioralValidation.passed, true);
    assert.strictEqual(standardResult.hiddenValidation.passed, true);
  });

  test('Standard OOP code achieves 100% automated score and passes', () => {
    assert.strictEqual(standardResult.score, 100);
    assert.strictEqual(standardResult.isPassed, true);
  });

  console.log('\n--- Test 3: Alternative Valid OOP Solution (Flexible Implementation) ---');
  const alternativeOopCode = `
public class Main {
    public static void main(String[] args) {
        Student s = new Student();
        s.name = "Mia";
        s.age = 20;
        s.introduce();
    }
}

class Student {
    String name;
    int age;

    void introduce() {
        System.out.println(this.name + " is " + this.age + " years old");
    }
}
`;

  const alternativeResult = evaluateChallenge(studentChallenge, alternativeOopCode, true);

  test('Alternative valid OOP solution is accepted without requiring identical formatting', () => {
    assert.strictEqual(alternativeResult.compileStatus, 'success');
    assert.strictEqual(alternativeResult.oopValidation.passed, true);
    assert.strictEqual(alternativeResult.isPassed, true);
    assert.strictEqual(alternativeResult.score, 100);
  });

  console.log('\n--- Test 4: Comment Spoofing Prevention (Comments must NOT satisfy AST requirements) ---');
  const spoofedCommentCode = `
public class Main {
    public static void main(String[] args) {
        // class Student
        // new Student("Mia", 20)
        // student.introduce()
        System.out.println("Mia is 20 years old");
    }
}
`;

  const spoofedResult = evaluateChallenge(studentChallenge, spoofedCommentCode, true);

  test('Comments mentioning OOP keywords do NOT fool the AST evaluator', () => {
    assert.strictEqual(spoofedResult.oopValidation.passed, false);
    assert.strictEqual(spoofedResult.isPassed, false);
  });

  console.log('\n--- Test 5: Encapsulation Practice (Private balance field enforcement) ---');
  const encapChallenge = PRACTICE_CHALLENGES.find(c => c.id === 'practice_3' || c.topicId === 'encapsulation');

  const publicBalanceCode = `
public class Main {
    public static void main(String[] args) {
        BankAccount account = new BankAccount(100);
        account.deposit(50);
        System.out.println(account.getBalance());
    }
}

class BankAccount {
    public double balance; // VIOLATION: Not private!
    public BankAccount(double b) { this.balance = b; }
    public void deposit(double d) { balance += d; }
    public double getBalance() { return balance; }
}
`;

  const publicBalanceResult = evaluateChallenge(encapChallenge, publicBalanceCode, true);

  test('Public balance field fails Encapsulation private requirement', () => {
    assert.strictEqual(publicBalanceResult.oopValidation.passed, false);
    const privateReq = publicBalanceResult.oopValidation.requirements.find(r => r.id === 'req_private_balance');
    assert.ok(privateReq);
    assert.strictEqual(privateReq.passed, false);
    assert.strictEqual(publicBalanceResult.isPassed, false);
  });

  const correctEncapCode = `
public class Main {
    public static void main(String[] args) {
        BankAccount account = new BankAccount(100);
        account.deposit(50);
        System.out.println(account.getBalance());
    }
}

class BankAccount {
    private double balance; // Correctly private
    public BankAccount(double b) { this.balance = b; }
    public void deposit(double d) { balance += d; }
    public double getBalance() { return balance; }
}
`;

  const correctEncapResult = evaluateChallenge(encapChallenge, correctEncapCode, true);

  test('Private balance field satisfies Encapsulation requirements', () => {
    assert.strictEqual(correctEncapResult.oopValidation.passed, true);
    assert.strictEqual(correctEncapResult.isPassed, true);
    assert.strictEqual(correctEncapResult.score, 100);
  });

  console.log('\n================================================================');
  console.log(`🎯 EVALUATOR TEST RESULTS: ${passed}/${passed + failed} tests passed (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOopEvaluatorTests();
