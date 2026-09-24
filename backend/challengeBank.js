const baseChallenges = [
  ['classes-objects', 'Classes and Objects', 'oop_lesson_1', 'oop_assessment_1', 'Create a Student object', 'Build a Student class with name, age, and an introduce() method.', 'public class Main {\n    public static void main(String[] args) {\n        Student student = new Student("Mia", 20);\n        student.introduce();\n    }\n}', 'Mia is 20 years old', ['class\\s+Student', 'new\\s+Student', 'void\\s+introduce\\s*\\(']],
  ['constructors', 'Constructors', 'oop_lesson_2', 'oop_assessment_2', 'Initialize a Book', 'Use a parameterized constructor to initialize title and author fields.', 'public class Main {\n    public static void main(String[] args) {\n        Book book = new Book("Clean Code", "Robert Martin");\n        book.printInfo();\n    }\n}', 'Clean Code by Robert Martin', ['class\\s+Book', 'Book\\s*\\([^)]*String\\s+title', 'this\\.title']],
  ['encapsulation', 'Encapsulation', 'oop_lesson_4', 'oop_assessment_4', 'Protect BankAccount balance', 'Keep balance private and expose validated deposit plus getBalance methods.', 'public class Main {\n    public static void main(String[] args) {\n        BankAccount account = new BankAccount(100);\n        account.deposit(50);\n        System.out.println(account.getBalance());\n    }\n}', '150.0', ['private\\s+double\\s+balance', 'double\\s+getBalance\\s*\\(', 'void\\s+deposit\\s*\\(']],
  ['inheritance', 'Inheritance', 'oop_lesson_6', 'oop_assessment_6', 'Extend Employee into Manager', 'Model an is-a relationship using extends and reuse the parent constructor.', 'public class Main {\n    public static void main(String[] args) {\n        Manager manager = new Manager("Nina", "Engineering");\n        manager.printInfo();\n    }\n}', 'Nina manages Engineering', ['extends\\s+Employee', 'super\\s*\\(', 'class\\s+Manager']],
  ['polymorphism', 'Polymorphism', 'oop_lesson_7', 'oop_assessment_7', 'Override notification sending', 'Override send() in two subclasses and call them through parent references.', 'public class Main {\n    public static void main(String[] args) {\n        Notification n = new EmailNotification();\n        n.send();\n    }\n}', 'Sending email notification', ['@Override', 'extends\\s+Notification', 'void\\s+send\\s*\\(']],
  ['abstraction', 'Abstraction', 'oop_lesson_8', 'oop_assessment_8', 'Implement an abstract shape', 'Create an abstract Shape and a Circle implementation that computes area.', 'public class Main {\n    public static void main(String[] args) {\n        Shape shape = new Circle(3);\n        System.out.printf("%.2f", shape.area());\n    }\n}', '28.27', ['abstract\\s+class\\s+Shape', 'abstract\\s+double\\s+area', 'extends\\s+Shape']],
  ['interfaces', 'Interfaces', 'oop_lesson_9', 'oop_assessment_9', 'Implement Payable', 'Define a Payable interface and implement it in Invoice.', 'public class Main {\n    public static void main(String[] args) {\n        Payable payable = new Invoice(750);\n        System.out.println(payable.computePay());\n    }\n}', '750.0', ['interface\\s+Payable', 'implements\\s+Payable', 'computePay\\s*\\(']],
  ['exception-handling', 'Exception Handling', 'oop_lesson_10', 'oop_assessment_10', 'Validate division safely', 'Catch arithmetic errors and print a friendly message instead of crashing.', 'public class Main {\n    public static void main(String[] args) {\n        SafeDivider.divide(10, 0);\n    }\n}', 'Cannot divide by zero', ['try\\s*\\{', 'catch\\s*\\(', 'ArithmeticException']],
  ['collections', 'Collections', 'oop_lesson_10', 'oop_assessment_10', 'Track unique names', 'Use a collection to store names and print the unique count.', 'public class Main {\n    public static void main(String[] args) {\n        NameRegistry registry = new NameRegistry();\n        registry.add("Ana");\n        registry.add("Ana");\n        registry.add("Luis");\n        System.out.println(registry.count());\n    }\n}', '2', ['import\\s+java\\.util', 'HashSet|Set<', 'add\\s*\\(']],
  ['file-handling', 'File Handling', 'oop_lesson_11', 'oop_assessment_11', 'Read simple file content', 'Use Java file APIs to read text and print the number of lines.', 'public class Main {\n    public static void main(String[] args) {\n        System.out.println(FileCounter.countLines("notes.txt"));\n    }\n}', '3', ['import\\s+java\\.io|import\\s+java\\.nio', 'countLines', 'throws|catch']],
  ['mini-oop-project', 'Mini OOP Project', 'oop_lesson_11', 'oop_assessment_11', 'Mini library checkout', 'Combine classes, encapsulation, inheritance, and collections in a small library model.', 'public class Main {\n    public static void main(String[] args) {\n        Library library = new Library();\n        library.add(new BookItem("OOP Basics"));\n        library.checkout("OOP Basics");\n        System.out.println(library.availableCount());\n    }\n}', '0', ['class\\s+Library', 'class\\s+BookItem', 'private', 'ArrayList|List<|Map<']]
];

const PRACTICE_CHALLENGES = baseChallenges.map((item, index) => {
  const [topicId, topicTitle, lessonId, assessmentId, title, description, starterCode, sampleOutput, matchers] = item;

  return {
    id: `practice_${index + 1}`,
    topicId,
    lessonId,
    assessmentId,
    title,
    description,
    learningObjectives: [
      `Apply ${topicTitle} in a short Java program.`,
      'Write code that compiles cleanly and produces deterministic console output.',
      'Practice reading requirements before submitting a final solution.'
    ],
    requirements: [
      `Use Java syntax directly related to ${topicTitle}.`,
      `Print exactly: ${sampleOutput}`,
      'Keep the main class named Main.'
    ],
    starterCode: `${starterCode}\n\n// Add the required classes below this line.\n`,
    sampleInput: 'No stdin required',
    sampleOutput,
    passingScore: 70,
    testCases: [
      { id: `${topicId}_sample`, input: '', expectedOutput: sampleOutput, isHidden: false, matcher: matchers[0] },
      { id: `${topicId}_concept_1`, input: '', expectedOutput: sampleOutput, isHidden: true, matcher: matchers[1] },
      { id: `${topicId}_concept_2`, input: '', expectedOutput: sampleOutput, isHidden: true, matcher: matchers[2] }
    ],
    createdAt: '2026-07-15T00:00:00.000Z'
  };
});

const evaluateChallenge = (challenge, sourceCode, includeHidden = false) => {
  const startTime = Date.now();
  const hasMain = /public\s+class\s+Main/.test(sourceCode) && /public\s+static\s+void\s+main\s*\(/.test(sourceCode);
  const braceBalance = (sourceCode.match(/\{/g) || []).length - (sourceCode.match(/\}/g) || []).length;

  const testCases = challenge.testCases || [];
  const testsToRun = includeHidden ? testCases : testCases.filter(t => !t.isHidden);

  if (!hasMain || braceBalance !== 0) {
    const errorMsg = !hasMain
      ? 'Compilation failed: Main class or main method was not found.'
      : 'Compilation failed: braces are not balanced.';

    return {
      compileStatus: 'failed',
      score: 0,
      runtime: Math.max(10, Date.now() - startTime),
      memoryUsage: Math.max(32, Math.round(sourceCode.length / 40)),
      programOutput: '',
      errorMessage: errorMsg,
      testResults: testsToRun.map(tc => ({
        id: tc.id,
        isHidden: Boolean(tc.isHidden),
        passed: false,
        expectedOutput: tc.isHidden ? '(hidden)' : tc.expectedOutput,
        actualOutput: '',
        message: 'Skipped because compilation failed.'
      }))
    };
  }

  const evaluatedTests = testsToRun.map(tc => {
    const passed = Boolean(tc.matcher && new RegExp(tc.matcher, 'i').test(sourceCode));
    return {
      id: tc.id,
      isHidden: Boolean(tc.isHidden),
      passed,
      expectedOutput: tc.isHidden ? '(hidden test)' : tc.expectedOutput,
      actualOutput: passed ? (tc.isHidden ? '(passed hidden criteria)' : tc.expectedOutput) : (tc.isHidden ? '(hidden test requirement not satisfied)' : 'Output did not satisfy this requirement.'),
      message: passed ? 'Test passed.' : (tc.isHidden ? 'Hidden requirement failed.' : `Expected code pattern: ${tc.matcher}`)
    };
  });

  const totalAllTests = testCases.length || 1;
  const passedCount = testCases.filter(tc => tc.matcher && new RegExp(tc.matcher, 'i').test(sourceCode)).length;
  const score = Math.round((passedCount / totalAllTests) * 100);
  const passed = score >= (challenge.passingScore || 70);

  return {
    compileStatus: passed ? 'success' : 'runtime_error',
    score,
    runtime: Math.max(15, (Date.now() - startTime) + (sourceCode.length % 80)),
    memoryUsage: Math.max(32, Math.round(sourceCode.length / 34)),
    programOutput: passed ? challenge.sampleOutput : 'Program compiled, but tests did not pass all requirements.',
    errorMessage: passed ? '' : 'Program output or required OOP structure did not pass all tests.',
    testResults: evaluatedTests
  };
};

module.exports = {
  PRACTICE_CHALLENGES,
  evaluateChallenge
};
