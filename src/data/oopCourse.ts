import { VideoLesson } from '../types';
import { OOP_PARSED_QUESTIONS } from './oopQuestions';

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

export const OOP_ASSESSMENTS: LessonAssessment[] = OOP_LESSON_BLUEPRINTS.map(lesson => ({
  id: lesson.assessmentId,
  lessonId: lesson.id,
  title: `${lesson.title} Assessment`,
  passingPercentage: 70,
  questions: OOP_PARSED_QUESTIONS[lesson.id] || []
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
