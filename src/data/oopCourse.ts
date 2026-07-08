import { VideoLesson } from '../types';

export type LessonDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface CourseQuestion {
  id: string;
  lessonId: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: LessonDifficulty;
  codeSnippet?: string;
}

export interface LessonAssessment {
  id: string;
  lessonId: string;
  title: string;
  questions: CourseQuestion[];
  passingPercentage: number;
}

interface LessonBlueprint {
  id: string;
  assessmentId: string;
  sequence: number;
  title: string;
  videoUrl: string;
  duration: string;
  description: string;
  concepts: string[];
  topic: string;
  module: string;
  difficulty: VideoLesson['difficulty'];
  anchors: string[];
  codeSnippet?: string;
}

const optionSet = (correctAnswer: string, distractors: string[]) => {
  const unique = [correctAnswer, ...distractors].filter((item, index, arr) => arr.indexOf(item) === index);
  return unique.slice(0, 4);
};

const question = (
  lesson: LessonBlueprint,
  number: number,
  difficulty: LessonDifficulty,
  questionText: string,
  correctAnswer: string,
  distractors: string[],
  explanation: string,
  codeSnippet?: string
): CourseQuestion => ({
  id: `${lesson.id}_q${number.toString().padStart(2, '0')}`,
  lessonId: lesson.id,
  question: questionText,
  options: optionSet(correctAnswer, distractors),
  correctAnswer,
  explanation,
  difficulty,
  codeSnippet
});

export const OOP_LESSON_BLUEPRINTS: LessonBlueprint[] = [
  {
    id: 'oop_lesson_1',
    assessmentId: 'oop_assessment_1',
    sequence: 1,
    title: 'Classes & Objects',
    videoUrl: '/videos/lesson1.mp4',
    duration: '13:50',
    description: 'Introduces Java classes as blueprints and objects as instances with fields, methods, state, and behavior.',
    concepts: ['Class blueprint', 'Object instance', 'Fields and methods', 'new keyword', 'State and behavior'],
    topic: 'Classes & Objects',
    module: 'OOP Fundamentals',
    difficulty: 'Beginner',
    anchors: ['class', 'object', 'field', 'method', 'new keyword', 'state', 'behavior'],
    codeSnippet: `class Student {
    String name;
    int age;

    void introduce() {
        System.out.println(name + " is " + age);
    }
}`
  },
  {
    id: 'oop_lesson_2',
    assessmentId: 'oop_assessment_2',
    sequence: 2,
    title: 'Constructors',
    videoUrl: '/videos/lesson2.mp4',
    duration: '17:29',
    description: 'Explains Java constructors, object initialization, constructor names, parameters, and default constructor behavior.',
    concepts: ['Constructor purpose', 'Same name as class', 'No return type', 'Parameterized constructor', 'Default constructor'],
    topic: 'Constructors',
    module: 'OOP Fundamentals',
    difficulty: 'Beginner',
    anchors: ['constructor', 'initialization', 'parameter', 'default constructor', 'object creation'],
    codeSnippet: `class Student {
    String name;

    Student(String studentName) {
        name = studentName;
    }
}`
  },
  {
    id: 'oop_lesson_3',
    assessmentId: 'oop_assessment_3',
    sequence: 3,
    title: 'Object Methods',
    videoUrl: '/videos/lesson3.mp4',
    duration: '18:15',
    description: 'Covers object methods as class-defined behaviors, calling methods through objects, parameters, returns, and field access.',
    concepts: ['Object behavior', 'Method call', 'Parameters', 'Return values', 'Instance field access'],
    topic: 'Object Methods',
    module: 'OOP Fundamentals',
    difficulty: 'Beginner',
    anchors: ['method', 'behavior', 'object call', 'parameter', 'return value', 'instance field'],
    codeSnippet: `class Calculator {
    int add(int a, int b) {
        return a + b;
    }
}`
  },
  {
    id: 'oop_lesson_4',
    assessmentId: 'oop_assessment_4',
    sequence: 4,
    title: 'Encapsulation',
    videoUrl: '/videos/lesson4.mp4',
    duration: '12:05',
    description: 'Explains data hiding with private fields and controlled access through getter and setter methods.',
    concepts: ['Data hiding', 'private fields', 'getters', 'setters', 'validation'],
    topic: 'Encapsulation',
    module: 'OOP Fundamentals',
    difficulty: 'Intermediate',
    anchors: ['encapsulation', 'private', 'getter', 'setter', 'validation', 'data hiding'],
    codeSnippet: `class BankAccount {
    private double balance;

    public double getBalance() {
        return balance;
    }
}`
  },
  {
    id: 'oop_lesson_5',
    assessmentId: 'oop_assessment_5',
    sequence: 5,
    title: 'Constructor Overloading',
    videoUrl: '/videos/lesson5.mp4',
    duration: '10:42',
    description: 'Shows how one class can define multiple constructors with different parameter lists for flexible object creation.',
    concepts: ['Constructor overload', 'Different parameters', 'this()', 'Initialization paths', 'Compile-time selection'],
    topic: 'Constructor Overloading',
    module: 'OOP Fundamentals',
    difficulty: 'Intermediate',
    anchors: ['overloading', 'constructor', 'parameter list', 'this()', 'signature'],
    codeSnippet: `class Student {
    Student() {
        this("Unknown");
    }

    Student(String name) {
        System.out.println(name);
    }
}`
  },
  {
    id: 'oop_lesson_6',
    assessmentId: 'oop_assessment_6',
    sequence: 6,
    title: 'Inheritance',
    videoUrl: '/videos/lesson6.mp4',
    duration: '16:10',
    description: 'Introduces inheritance in Java, showing how child classes reuse and extend parent class fields and methods.',
    concepts: ['Parent class', 'Child class', 'extends keyword', 'is-a relationship', 'Code reuse'],
    topic: 'Inheritance',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['inheritance', 'parent class', 'child class', 'extends', 'is-a relationship', 'reuse'],
    codeSnippet: `class Animal {
    void eat() {
        System.out.println("Eating");
    }
}

class Dog extends Animal {
    void bark() {
        System.out.println("Barking");
    }
}`
  },
  {
    id: 'oop_lesson_7',
    assessmentId: 'oop_assessment_7',
    sequence: 7,
    title: 'Polymorphism',
    videoUrl: '/videos/lesson7.mp4',
    duration: '14:20',
    description: 'Covers polymorphism through overloaded methods, overridden behavior, parent references, and dynamic method dispatch.',
    concepts: ['Many forms', 'Method overloading', 'Method overriding', 'Parent reference', 'Runtime dispatch'],
    topic: 'Polymorphism',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['polymorphism', 'overloading', 'overriding', 'parent reference', 'runtime dispatch'],
    codeSnippet: `class Notification {
    void send() {
        System.out.println("generic");
    }
}

class EmailNotification extends Notification {
    @Override
    void send() {
        System.out.println("email");
    }
}`
  },
  {
    id: 'oop_lesson_8',
    assessmentId: 'oop_assessment_8',
    sequence: 8,
    title: 'Abstract Classes',
    videoUrl: '/videos/lesson8.mp4',
    duration: '11:55',
    description: 'Explains abstract classes as shared base definitions that can declare required behavior and provide reusable concrete methods.',
    concepts: ['abstract class', 'Abstract method', 'Concrete method', 'Shared base class', 'Subclass responsibility'],
    topic: 'Abstract Classes',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['abstract class', 'abstract method', 'concrete method', 'base class', 'subclass responsibility'],
    codeSnippet: `abstract class Report {
    abstract String title();

    void printHeader() {
        System.out.println("Report");
    }
}`
  },
  {
    id: 'oop_lesson_9',
    assessmentId: 'oop_assessment_9',
    sequence: 9,
    title: 'Interfaces / Abstraction',
    videoUrl: '/videos/lesson9.mp4',
    duration: '13:35',
    description: 'Introduces interfaces and abstraction as ways to expose essential behavior while hiding implementation details.',
    concepts: ['interface keyword', 'implements keyword', 'Behavior contract', 'Implementation hiding', 'Default methods'],
    topic: 'Interfaces / Abstraction',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['interface', 'implements', 'contract', 'abstraction', 'default method'],
    codeSnippet: `interface Payable {
    double computePay();
}

class Instructor implements Payable {
    public double computePay() {
        return 1500.0;
    }
}`
  },
  {
    id: 'oop_lesson_10',
    assessmentId: 'oop_assessment_10',
    sequence: 10,
    title: 'Array of Objects',
    videoUrl: '/videos/lesson10.mp4',
    duration: '18:40',
    description: 'Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.',
    concepts: ['Object reference array', 'Element initialization', 'Null elements', 'Array traversal', 'Object state per element'],
    topic: 'Array of Objects',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['array of objects', 'object reference', 'new object', 'null element', 'loop traversal'],
    codeSnippet: `Student[] roster = new Student[3];
roster[0] = new Student("Mia");
roster[1] = new Student("Noah");
roster[2] = new Student("Lia");`
  },
  {
    id: 'oop_lesson_11',
    assessmentId: 'oop_assessment_11',
    sequence: 11,
    title: 'Enum',
    videoUrl: '/videos/lesson11.mp4',
    duration: '15:25',
    description: 'Explains Java enums as type-safe named constants that can also contain fields, constructors, and methods.',
    concepts: ['enum keyword', 'Named constants', 'Type safety', 'switch with enum', 'Enum fields and methods'],
    topic: 'Enum',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['enum', 'constant', 'type safety', 'switch', 'values()'],
    codeSnippet: `enum Role {
    STUDENT, TEACHER, ADMIN
}

class Account {
    Role role;

    Account(Role role) {
        this.role = role;
    }
}`
  }
];

export const OOP_COURSE_LESSONS: VideoLesson[] = OOP_LESSON_BLUEPRINTS.map((lesson, index) => ({
  id: lesson.id,
  sequence: lesson.sequence,
  title: lesson.title,
  duration: lesson.duration,
  status: index === 0 ? 'active' : 'locked',
  videoUrl: lesson.videoUrl,
  description: lesson.description,
  concepts: lesson.concepts,
  topic: lesson.topic,
  difficulty: lesson.difficulty,
  language: 'Java',
  module: lesson.module,
  category: 'Core OOP',
  courseId: 'oop',
  isArchived: false,
  unlockedAssessmentId: lesson.assessmentId,
  views: 0,
  avgWatchTime: 0,
  completedStudents: [],
  inProgressStudents: [],
  notStartedStudents: [],
  progressPercent: 0,
  video_title: lesson.title,
  creator_name: 'Local OOP Fundamentals Tutorial',
  publisher_name: 'OOP Pedagogical Hub',
  source_url: lesson.videoUrl,
  license_type: 'Local Educational Asset'
}));

const javaName = (lesson: LessonBlueprint, suffix: string) =>
  `${lesson.title.replace(/[^A-Za-z]/g, '') || 'Topic'}${suffix}`;

const explain = (correct: string, others: string, focus: string) =>
  `${correct} is correct because it matches how ${focus} works in Java. The other choices are incorrect because ${others}.`;

const buildConceptualQuestions = (lesson: LessonBlueprint): CourseQuestion[] => {
  const [a, b, c, d, e] = lesson.anchors;
  const focus = lesson.title;

  return [
    question(lesson, 1, 'Easy', `A teammate is learning ${focus}. Which statement best describes its role in Java OOP?`, `It helps model behavior around ${a} and ${b}.`, [`It is mainly used to style web pages.`, `It replaces the Java compiler.`, `It is only available inside SQL queries.`], explain(`Modeling ${a} and ${b}`, 'they describe unrelated technologies or impossible Java behavior', focus)),
    question(lesson, 2, 'Easy', `Which Java keyword or idea is most directly connected to ${focus}?`, a, ['catch', 'SELECT', 'margin'], explain(`${a}`, 'the distractors belong to exception handling, databases, or CSS rather than this OOP topic', focus)),
    question(lesson, 3, 'Easy', `When should a beginner use the idea of ${b} while writing Java code?`, `When the program needs ${b} as part of object design.`, ['When declaring an HTML element.', 'When choosing a database port.', 'When setting a browser cookie only.'], explain(`${b}`, 'the other answers move outside Java OOP design', focus)),
    question(lesson, 4, 'Easy', `Which pair of terms belongs together for the topic ${focus}?`, `${a} and ${c}`, ['HTML and CSS', 'table and row id only', 'IP address and gateway'], explain(`${a} and ${c}`, 'the other pairs are not Java OOP concepts for this lesson', focus)),
    question(lesson, 5, 'Easy', `A student says, "${focus} is only about memorizing syntax." Which response is best?`, `Syntax matters, but the concept mainly guides how objects and behavior are designed.`, ['Yes, no design decision is involved.', 'Yes, Java objects are not affected by it.', 'No, it is used only for network routing.'], explain('The design-focused response', 'they either deny the OOP purpose or confuse it with networking', focus)),
    question(lesson, 6, 'Easy', `Which learning objective best fits ${focus}?`, `Use ${lesson.topic} correctly in a small Java class design.`, ['Create a spreadsheet formula.', 'Write CSS animations only.', 'Configure a router firewall.'], explain(`${lesson.topic}`, 'the other objectives do not assess Java OOP understanding', focus)),
    question(lesson, 7, 'Easy', `Which item is a valid concept from this lesson's vocabulary?`, c, ['DOM selector', 'HTTP cache header', 'SQL foreign key only'], explain(`${c}`, 'the alternatives are from web or database topics rather than this Java lesson', focus)),
    question(lesson, 8, 'Easy', `Why does Java code often combine ${a} with ${d}?`, `Together they help express ${focus} in maintainable object-oriented code.`, ['They turn Java into Python.', 'They disable compile-time checking.', 'They automatically create database tables.'], explain('The maintainability answer', 'the other options describe impossible or unrelated effects', focus)),
    question(lesson, 9, 'Easy', `Which statement shows the safest beginner mindset for ${focus}?`, `Write code that makes object responsibilities clear.`, ['Hide all names so no one can read the program.', 'Use the longest possible class names every time.', 'Avoid methods completely.'], explain('Clear responsibilities', 'the other choices reduce readability or prevent useful object behavior', focus)),
    question(lesson, 10, 'Easy', `What should a student check first when reviewing code about ${focus}?`, `Whether the code uses ${a}, ${b}, and ${e || d} consistently.`, ['Whether every class is public.', 'Whether comments replace working code.', 'Whether the file contains HTML tags.'], explain('Checking the relevant OOP concepts', 'the other checks are not reliable indicators of correct Java OOP design', focus))
  ];
};

const buildCodeAnalysisQuestions = (lesson: LessonBlueprint): CourseQuestion[] => {
  const cls = javaName(lesson, 'Demo');
  const helper = javaName(lesson, 'Item');
  const focus = lesson.title;

  return [
    question(
      lesson,
      11,
      'Medium',
      `Which statement about this ${focus} code is correct?`,
      'The object stores its own state and the method reads that state.',
      ['The field belongs only to the main method.', 'The method cannot access instance fields.', 'The constructor must return void.'],
      explain('The object-state statement', 'fields can be instance state, methods can read them, and constructors do not declare a return type', focus),
      `class ${helper} {
    String label;

    ${helper}(String label) {
        this.label = label;
    }

    String describe() {
        return label;
    }
}`
    ),
    question(
      lesson,
      12,
      'Medium',
      'Which line contains the Java error?',
      'Line 3',
      ['Line 1', 'Line 2', 'Line 5'],
      explain('Line 3', 'constructors use the class name without a return type, while the other listed lines are valid in this context', focus),
      `1 class ${cls} {
2     int count;
3     void ${cls}(int count) { this.count = count; }
4     int getCount() { return count; }
5 }`
    ),
    question(
      lesson,
      13,
      'Medium',
      'What should replace the missing code so the object is initialized before use?',
      `new ${helper}("core")`,
      [`${helper}`, `"core".${helper}()`, `null`],
      explain(`new ${helper}("core")`, 'the other choices do not construct a usable object instance', focus),
      `class ${helper} {
    String name;
    ${helper}(String name) { this.name = name; }
}
class Main {
    public static void main(String[] args) {
        ${helper} item = /* missing code */;
        System.out.println(item.name);
    }
}`
    ),
    question(
      lesson,
      14,
      'Medium',
      `Which revision best improves the ${focus} design without changing the behavior?`,
      'Keep object data inside fields and expose behavior through methods.',
      ['Move all data to unrelated global variables.', 'Replace every class with one long main method.', 'Use comments instead of constructors or methods.'],
      explain('Encapsulating data with behavior', 'the other revisions make the design less object-oriented and harder to maintain', focus),
      lesson.codeSnippet
    ),
    question(
      lesson,
      15,
      'Medium',
      'Which statement correctly identifies the purpose of the highlighted Java structure?',
      `It demonstrates ${lesson.topic} by organizing related data and behavior.`,
      ['It converts Java code to HTML.', 'It prevents all runtime errors automatically.', 'It removes the need for object creation in every case.'],
      explain(`The ${lesson.topic} statement`, 'the alternatives describe unrelated or impossible behavior', focus),
      lesson.codeSnippet
    )
  ];
};

const buildOutputQuestions = (lesson: LessonBlueprint): CourseQuestion[] => {
  const base = javaName(lesson, 'Base');
  const child = javaName(lesson, 'Child');
  const focus = lesson.title;

  return [
    question(
      lesson,
      16,
      'Medium',
      'What is the output?',
      'Ava-2',
      ['Ava', '2-Ava', 'Compilation error'],
      explain('Ava-2', 'string concatenation follows the expression order and the class compiles', focus),
      `class StudentRecord {
    String name;
    int level;
    StudentRecord(String name, int level) {
        this.name = name;
        this.level = level;
    }
    String label() { return name + "-" + level; }
}
class Main {
    public static void main(String[] args) {
        System.out.println(new StudentRecord("Ava", 2).label());
    }
}`
    ),
    question(
      lesson,
      17,
      'Medium',
      'What is the output?',
      'Base Child',
      ['Child Base', 'Base', 'Compilation error'],
      explain('Base Child', 'the parent constructor runs before the child constructor, and the code is valid', focus),
      `class ${base} {
    ${base}() { System.out.print("Base "); }
}
class ${child} extends ${base} {
    ${child}() { System.out.print("Child"); }
}
class Main {
    public static void main(String[] args) {
        new ${child}();
    }
}`
    ),
    question(
      lesson,
      18,
      'Medium',
      'What is the output?',
      'email',
      ['generic', 'email generic', 'Compilation error'],
      explain('email', 'overridden methods are selected from the actual object type at runtime', focus),
      `class Message {
    void send() { System.out.print("generic"); }
}
class Email extends Message {
    void send() { System.out.print("email"); }
}
class Main {
    public static void main(String[] args) {
        Message m = new Email();
        m.send();
    }
}`
    ),
    question(
      lesson,
      19,
      'Medium',
      'What is the output?',
      '2',
      ['0', '1', 'Compilation error'],
      explain('2', 'two initialized array elements are non-null, while the third slot remains null', focus),
      `class Course {
    String title;
    Course(String title) { this.title = title; }
}
class Main {
    public static void main(String[] args) {
        Course[] list = new Course[3];
        list[0] = new Course("OOP");
        list[1] = new Course("Java");
        int count = 0;
        for (Course c : list) if (c != null) count++;
        System.out.print(count);
    }
}`
    ),
    question(
      lesson,
      20,
      'Medium',
      'What is the output?',
      'ADMIN',
      ['0', 'Role.ADMIN', 'Compilation error'],
      explain('ADMIN', 'printing an enum constant uses its declared constant name by default', focus),
      `enum Role { STUDENT, TEACHER, ADMIN }
class Main {
    public static void main(String[] args) {
        Role current = Role.ADMIN;
        System.out.print(current);
    }
}`
    )
  ];
};

const buildScenarioQuestions = (lesson: LessonBlueprint): CourseQuestion[] => {
  const [a, b, c, d, e] = lesson.anchors;
  const focus = lesson.title;

  return [
    question(lesson, 21, 'Hard', `A school LMS must represent each learner with a name, number, course, and behavior for printing a profile. Which design best applies ${focus}?`, `Create a Java type that groups the learner state with profile behavior.`, ['Store every learner in one comma-separated String.', 'Use unrelated local variables in many methods.', 'Represent learners only as comments.'], explain('A grouped Java type', 'the alternatives scatter state, remove behavior, or are not executable designs', focus)),
    question(lesson, 22, 'Hard', `An instructor wants future lessons to reuse ${a} but still allow specialized behavior using ${b}. What is the best design goal?`, `Separate shared structure from the parts that vary.`, ['Duplicate every line in every class.', 'Avoid compiling until all topics are finished.', 'Put all code into a single static method.'], explain('Separating shared and varying behavior', 'the other choices create duplication or remove useful object design', focus)),
    question(lesson, 23, 'Hard', `A grading module fails because students can put invalid values into an object. Which improvement best follows Java OOP practice?`, `Protect object state and expose controlled methods for updates.`, ['Make every field public for faster typing.', 'Delete constructors from the program.', 'Use random values instead of validation.'], explain('Controlled updates', 'the other choices make invalid state easier or remove initialization support', focus)),
    question(lesson, 24, 'Hard', `A team is reviewing code for ${focus}. Which evidence shows deeper understanding rather than memorization?`, `The student explains why ${c} changes the design and predicts the code behavior.`, ['The student only recites the file name.', 'The student chooses the longest option.', 'The student ignores the code and guesses.'], explain('Explaining design and behavior', 'the other responses do not demonstrate conceptual or code-level understanding', focus)),
    question(lesson, 25, 'Hard', `You are extending the LMS with a new feature that uses ${d} and ${e || a}. Which choice is the best long-term decision?`, `Write small Java classes or interfaces with clear responsibilities and testable behavior.`, ['Hard-code every result in the user interface.', 'Mix database passwords into model classes.', 'Avoid names that describe the domain.'], explain('Clear, testable responsibilities', 'the alternatives are brittle, insecure, or unreadable', focus))
  ];
};

const buildLessonQuestions = (lesson: LessonBlueprint): CourseQuestion[] => [
  ...buildConceptualQuestions(lesson),
  ...buildCodeAnalysisQuestions(lesson),
  ...buildOutputQuestions(lesson),
  ...buildScenarioQuestions(lesson)
];

export const OOP_ASSESSMENTS: LessonAssessment[] = OOP_LESSON_BLUEPRINTS.map(lesson => ({
  id: lesson.assessmentId,
  lessonId: lesson.id,
  title: `${lesson.title} Assessment`,
  passingPercentage: 70,
  questions: buildLessonQuestions(lesson)
}));

export const shuffleArray = <T,>(items: T[], seed = Date.now()): T[] => {
  const next = [...items];
  let value = seed;

  for (let i = next.length - 1; i > 0; i -= 1) {
    value = (value * 9301 + 49297) % 233280;
    const j = Math.floor((value / 233280) * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
};

export const getStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const setStoredJson = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};
