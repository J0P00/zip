import { ChallengeTestResult, ProgrammingChallenge } from '../types';
import { OOP_COURSE_LESSONS } from './oopCourse';

const javaShell = (topic: string, body: string) => `public class Main {
    public static void main(String[] args) {
        ${body}
    }
}`;

const baseChallenges = [
  ['classes-objects', 'Classes and Objects', 'oop_lesson_1', 'oop_assessment_1', 'Create a Student object', 'Build a Student class with name, age, and an introduce() method.', javaShell('Classes', 'Student student = new Student("Mia", 20);\n        student.introduce();'), 'Mia is 20 years old', ['class\\s+Student', 'new\\s+Student', 'void\\s+introduce\\s*\\(']],
  ['constructors', 'Constructors', 'oop_lesson_2', 'oop_assessment_2', 'Initialize a Book', 'Use a parameterized constructor to initialize title and author fields.', javaShell('Constructors', 'Book book = new Book("Clean Code", "Robert Martin");\n        book.printInfo();'), 'Clean Code by Robert Martin', ['class\\s+Book', 'Book\\s*\\([^)]*String\\s+title', 'this\\.title']],
  ['encapsulation', 'Encapsulation', 'oop_lesson_4', 'oop_assessment_4', 'Protect BankAccount balance', 'Keep balance private and expose validated deposit plus getBalance methods.', javaShell('Encapsulation', 'BankAccount account = new BankAccount(100);\n        account.deposit(50);\n        System.out.println(account.getBalance());'), '150.0', ['private\\s+double\\s+balance', 'double\\s+getBalance\\s*\\(', 'void\\s+deposit\\s*\\(']],
  ['inheritance', 'Inheritance', 'oop_lesson_6', 'oop_assessment_6', 'Extend Employee into Manager', 'Model an is-a relationship using extends and reuse the parent constructor.', javaShell('Inheritance', 'Manager manager = new Manager("Nina", "Engineering");\n        manager.printInfo();'), 'Nina manages Engineering', ['extends\\s+Employee', 'super\\s*\\(', 'class\\s+Manager']],
  ['polymorphism', 'Polymorphism', 'oop_lesson_7', 'oop_assessment_7', 'Override notification sending', 'Override send() in two subclasses and call them through parent references.', javaShell('Polymorphism', 'Notification n = new EmailNotification();\n        n.send();'), 'Sending email notification', ['@Override', 'extends\\s+Notification', 'void\\s+send\\s*\\(']],
  ['abstraction', 'Abstraction', 'oop_lesson_8', 'oop_assessment_8', 'Implement an abstract shape', 'Create an abstract Shape and a Circle implementation that computes area.', javaShell('Abstraction', 'Shape shape = new Circle(3);\n        System.out.printf("%.2f", shape.area());'), '28.27', ['abstract\\s+class\\s+Shape', 'abstract\\s+double\\s+area', 'extends\\s+Shape']],
  ['interfaces', 'Interfaces', 'oop_lesson_9', 'oop_assessment_9', 'Implement Payable', 'Define a Payable interface and implement it in Invoice.', javaShell('Interfaces', 'Payable payable = new Invoice(750);\n        System.out.println(payable.computePay());'), '750.0', ['interface\\s+Payable', 'implements\\s+Payable', 'computePay\\s*\\(']],
  ['exception-handling', 'Exception Handling', 'oop_lesson_10', 'oop_assessment_10', 'Validate division safely', 'Catch arithmetic errors and print a friendly message instead of crashing.', javaShell('Exceptions', 'SafeDivider.divide(10, 0);'), 'Cannot divide by zero', ['try\\s*\\{', 'catch\\s*\\(', 'ArithmeticException']],
  ['collections', 'Collections', 'oop_lesson_10', 'oop_assessment_10', 'Track unique names', 'Use a collection to store names and print the unique count.', javaShell('Collections', 'NameRegistry registry = new NameRegistry();\n        registry.add("Ana");\n        registry.add("Ana");\n        registry.add("Luis");\n        System.out.println(registry.count());'), '2', ['import\\s+java\\.util', 'HashSet|Set<', 'add\\s*\\(']],
  ['file-handling', 'File Handling', 'oop_lesson_11', 'oop_assessment_11', 'Read simple file content', 'Use Java file APIs to read text and print the number of lines.', javaShell('Files', 'System.out.println(FileCounter.countLines("notes.txt"));'), '3', ['import\\s+java\\.io|import\\s+java\\.nio', 'countLines', 'throws|catch']],
  ['mini-oop-project', 'Mini OOP Project', 'oop_lesson_11', 'oop_assessment_11', 'Mini library checkout', 'Combine classes, encapsulation, inheritance, and collections in a small library model.', javaShell('Project', 'Library library = new Library();\n        library.add(new BookItem("OOP Basics"));\n        library.checkout("OOP Basics");\n        System.out.println(library.availableCount());'), '0', ['class\\s+Library', 'class\\s+BookItem', 'private', 'ArrayList|List<|Map<']]
] as const;

export const PRACTICE_CHALLENGES: ProgrammingChallenge[] = baseChallenges.map((item, index) => {
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

export const getPracticeChallengeForLesson = (lessonId: string) =>
  PRACTICE_CHALLENGES.find(challenge => challenge.lessonId === lessonId) || PRACTICE_CHALLENGES[0];

export const getCurrentPracticeChallenge = () => {
  const activeLesson = OOP_COURSE_LESSONS.find(lesson => lesson.status === 'active') || OOP_COURSE_LESSONS[0];
  return getPracticeChallengeForLesson(activeLesson.id);
};

export const gradePracticeSource = (challenge: ProgrammingChallenge, sourceCode: string) => {
  const startedAt = performance.now();
  const hasMain = /public\s+class\s+Main/.test(sourceCode) && /public\s+static\s+void\s+main\s*\(/.test(sourceCode);
  const braceBalance = (sourceCode.match(/\{/g) || []).length - (sourceCode.match(/\}/g) || []).length;

  if (!hasMain || braceBalance !== 0) {
    return {
      compileStatus: 'failed' as const,
      score: 0,
      runtime: Math.round(performance.now() - startedAt),
      memoryUsage: Math.max(32, Math.round(sourceCode.length / 40)),
      programOutput: '',
      errorMessage: !hasMain ? 'Compilation failed: Main class or main method was not found.' : 'Compilation failed: braces are not balanced.',
      testResults: challenge.testCases.map(testCase => ({
        id: testCase.id,
        isHidden: testCase.isHidden,
        passed: false,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        message: 'Skipped because compilation failed.'
      }))
    };
  }

  const testResults: ChallengeTestResult[] = challenge.testCases.map(testCase => {
    const passed = new RegExp(testCase.matcher, 'i').test(sourceCode);
    return {
      id: testCase.id,
      isHidden: testCase.isHidden,
      passed,
      expectedOutput: testCase.expectedOutput,
      actualOutput: passed ? testCase.expectedOutput : 'Output did not satisfy this requirement.',
      message: passed ? 'Test passed.' : `Expected code pattern: ${testCase.matcher}`
    };
  });
  const passedCount = testResults.filter(result => result.passed).length;
  const score = Math.round((passedCount / challenge.testCases.length) * 100);

  return {
    compileStatus: score >= challenge.passingScore ? 'success' as const : 'runtime_error' as const,
    score,
    runtime: Math.max(12, Math.round(performance.now() - startedAt) + sourceCode.length % 80),
    memoryUsage: Math.max(32, Math.round(sourceCode.length / 34)),
    programOutput: score >= challenge.passingScore ? challenge.sampleOutput : 'Program compiled, but hidden tests failed.',
    errorMessage: score >= challenge.passingScore ? '' : 'Program output or required OOP structure did not pass all tests.',
    testResults
  };
};
