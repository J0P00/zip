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

const SDPT_VIDEO_CITATIONS: Record<number, Pick<VideoLesson, 'video_title' | 'creator_name' | 'publisher_name' | 'source_url' | 'accessed_date'>> = {
  1: { video_title: 'Classes & Objects', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=CwdhP_zA3lg&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or', accessed_date: '2026-07-14' },
  2: { video_title: 'Constructors', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=zoZ8uzpDiBA&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=2', accessed_date: '2026-07-14' },
  3: { video_title: 'Object Methods', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=nlwXDmrF3Lg&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=3', accessed_date: '2026-07-14' },
  4: { video_title: 'Encapsulation', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=RkOgR2gTD20&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=4', accessed_date: '2026-07-14' },
  5: { video_title: 'Constructor Overloading', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=FcJnGlDRlP8&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=5', accessed_date: '2026-07-14' },
  6: { video_title: 'Inheritance', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=ptyqpfyB6oA&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=6', accessed_date: '2026-07-14' },
  7: { video_title: 'Polymorphism', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=3uPkB0_OdiM&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=7', accessed_date: '2026-07-14' },
  8: { video_title: 'Abstract Classes', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=vr-OAZZZE_Y&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=8', accessed_date: '2026-07-14' },
  9: { video_title: 'Interfaces & Abstract', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=ynHgzRZyOXE&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=9', accessed_date: '2026-07-14' },
  10: { video_title: 'Interfaces', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=eLgxaCtIkAc&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=10', accessed_date: '2026-07-14' },
  11: { video_title: 'Array of Objects', creator_name: 'SDPT Solutions', publisher_name: 'YouTube', source_url: 'https://www.youtube.com/watch?v=D4ZEbQ6v2Zk&list=PLVnJhHoKgEmqJoW6MSTpHtBpWv3rn-0Or&index=11', accessed_date: '2026-07-14' },
  12: { video_title: 'Enum', creator_name: 'Java OOP Course', publisher_name: 'OOP Pedagogical Hub', source_url: '/JAVA OOP Video Lesson/Lesson 12 Enum.mp4', accessed_date: '2026-09-13' }
};

const OOP_TOPIC_CITATIONS: Record<number, Pick<VideoLesson, 'citation_text' | 'citation_url'>> = {
  1: {
    citation_text: 'Classes (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html'
  },
  2: {
    citation_text: 'Providing constructors for your classes (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/constructors.html'
  },
  3: {
    citation_text: 'Defining Methods (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html'
  },
  4: {
    citation_text: 'Inheritance (The Java Tutorials > Learning the Java Language > Interfaces and Inheritance). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html'
  },
  5: {
    citation_text: 'Defining Methods (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html'
  },
  6: {
    citation_text: 'Abstract Methods and Classes (The Java Tutorials > Learning the Java Language > Interfaces and Inheritance). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html'
  },
  7: {
    citation_text: 'Interfaces (The Java Tutorials > Learning the Java Language > Interfaces and Inheritance). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html'
  },
  8: {
    citation_text: 'Abstract Methods and Classes (The Java Tutorials > Learning the Java Language > Interfaces and Inheritance). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html'
  },
  9: {
    citation_text: 'Interfaces (The Java Tutorials > Learning the Java Language > Interfaces and Inheritance). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html'
  },
  10: {
    citation_text: 'Arrays (The Java Tutorials > Learning the Java Language > Language Basics). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/arrays.html'
  },
  11: {
    citation_text: 'Enum Types (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html'
  },
  12: {
    citation_text: 'Enum Types (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle.',
    citation_url: 'https://docs.oracle.com/javase/tutorial/java/javaOO/enum.html'
  }
};

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const OOP_CITATION_TITLE_MAP = new Map(
  [
    ['Classes and Objects', 1],
    ['Constructors', 2],
    ['Object Methods', 3],
    ['Inheritance', 4],
    ['Method Overriding', 5],
    ['Abstract Class', 6],
    ['Interface', 7],
    ['Abstraction', 8],
    ['Abstraction Interfaces', 9],
    ['Array of Objects', 10],
    ['Enum', 11]
  ].map(([title, sequence]) => [normalizeTitle(String(title)), Number(sequence)])
);

export const applyOopLessonCitation = (lesson: VideoLesson): VideoLesson => {
  const matchedTitleCitation = OOP_CITATION_TITLE_MAP.get(normalizeTitle(lesson.title));
  const isOopLesson = lesson.courseId === 'oop' || lesson.id.startsWith('oop_lesson_');
  const citationIndex = matchedTitleCitation || (isOopLesson ? lesson.sequence : undefined);
  const citation = citationIndex !== undefined ? OOP_TOPIC_CITATIONS[citationIndex] : undefined;

  return citation ? { ...lesson, ...citation } : lesson;
};

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
    videoUrl: '/JAVA OOP Video Lesson/Lesson 1Classes & Objects.mp4',
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
    videoUrl: '/JAVA OOP Video Lesson/Lesson 2 Constructor.mp4',
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
    videoUrl: '/JAVA OOP Video Lesson/Lesson 3Object Method.mp4',
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
    videoUrl: '/JAVA OOP Video Lesson/Lesson 4 Encapsulation.mp4',
    duration: '12:05',
    description: 'Explains encapsulation in Java by protecting fields and controlling access through methods.',
    concepts: ['Data hiding', 'private fields', 'Getters', 'Setters', 'Access control'],
    topic: 'Encapsulation',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['encapsulation', 'data hiding', 'private', 'getter', 'setter', 'access control'],
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
    id: 'oop_lesson_5',
    assessmentId: 'oop_assessment_5',
    sequence: 5,
    title: 'Constructor Overloading',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 5 Constructor Overloading.mp4',
    duration: '10:42',
    description: 'Explains how multiple constructors with different parameters initialize objects in flexible ways.',
    concepts: ['Multiple constructors', 'Different parameters', 'Constructor signatures', 'Object initialization', 'Overloading'],
    topic: 'Constructor Overloading',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['constructor overloading', 'constructor', 'parameters', 'signature', 'initialization'],
    codeSnippet: `class Animal {
    void sound() {
        System.out.println("Animal sound");
    }
}

class Dog extends Animal {
    @Override
    void sound() {
        System.out.println("Bark");
    }
}`
  },
  {
    id: 'oop_lesson_6',
    assessmentId: 'oop_assessment_6',
    sequence: 6,
    title: 'Inheritance',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 6 Inheritance.mp4',
    duration: '16:10',
    description: 'Introduces inheritance in Java, showing how child classes reuse and extend parent class fields and methods.',
    concepts: ['Parent class', 'Child class', 'extends keyword', 'super keyword', 'is-a relationship'],
    topic: 'Inheritance',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['inheritance', 'parent class', 'child class', 'extends', 'super', 'is-a relationship'],
    codeSnippet: `abstract class Shape {
    abstract double area();
}

class Circle extends Shape {
    double area() {
        return 3.14;
    }
}`
  },
  {
    id: 'oop_lesson_7',
    assessmentId: 'oop_assessment_7',
    sequence: 7,
    title: 'Polymorphism',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 7 Polymorphism.mp4',
    duration: '14:20',
    description: 'Explains polymorphism and how one parent type can represent many concrete object forms.',
    concepts: ['Many forms', 'Parent reference', 'Method overriding', 'Runtime dispatch', 'Flexible design'],
    topic: 'Polymorphism',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['polymorphism', 'overriding', 'parent reference', 'runtime dispatch', 'many forms'],
    codeSnippet: `interface Flyable {
    void fly();
}

class Bird implements Flyable {
    public void fly() {
        System.out.println("Flying");
    }
}`
  },
  {
    id: 'oop_lesson_8',
    assessmentId: 'oop_assessment_8',
    sequence: 8,
    title: 'Abstract Classes',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 8 Abstract Classes.mp4',
    duration: '11:55',
    description: 'Explains abstraction as focusing on essential behavior while hiding unnecessary implementation details.',
    concepts: ['Essential behavior', 'Implementation hiding', 'Abstract class', 'Interface', 'Simplified design'],
    topic: 'Abstraction',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['abstraction', 'essential behavior', 'implementation hiding', 'abstract class', 'interface'],
    codeSnippet: `abstract class Payment {
    abstract void pay();

    void receipt() {
        System.out.println("Paid");
    }
}`
  },
  {
    id: 'oop_lesson_9',
    assessmentId: 'oop_assessment_9',
    sequence: 9,
    title: 'Interfaces & Abstract',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 9 Interfaces & Abstract.mp4',
    duration: '13:35',
    description: 'Shows how interfaces support abstraction by defining required behavior without exposing implementation details.',
    concepts: ['Interface abstraction', 'implements keyword', 'Behavior contract', 'Implementation hiding', 'Flexible design'],
    topic: 'Abstraction (Interfaces)',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['interface abstraction', 'interface', 'implements', 'contract', 'implementation hiding'],
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
    title: 'Interfaces',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 10 Interfaces.mp4',
    duration: '18:40',
    description: 'Introduces interfaces as contracts that classes implement to provide required behavior.',
    concepts: ['interface keyword', 'implements keyword', 'Behavior contract', 'Abstract methods', 'Multiple interfaces'],
    topic: 'Interfaces',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['interface', 'implements', 'contract', 'abstract method', 'multiple interfaces'],
    codeSnippet: `Student[] roster = new Student[3];
roster[0] = new Student("Mia");
roster[1] = new Student("Noah");
roster[2] = new Student("Lia");`
  },
  {
    id: 'oop_lesson_11',
    assessmentId: 'oop_assessment_11',
    sequence: 11,
    title: 'Array of Objects',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 11 Array Of Object.mp4',
    duration: '15:25',
    description: 'Shows how arrays can store object references, how each element must be initialized, and how loops process object collections.',
    concepts: ['Object reference array', 'Element initialization', 'Null elements', 'Array traversal', 'Object state per element'],
    topic: 'Array of Objects',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['array of objects', 'object reference', 'new object', 'null element', 'loop traversal'],
    codeSnippet: `enum Role {
    STUDENT, TEACHER, ADMIN
}

class Account {
    Role role;

    Account(Role role) {
        this.role = role;
    }
}`
  },
  {
    id: 'oop_lesson_12',
    assessmentId: 'oop_assessment_12',
    sequence: 12,
    title: 'Enum',
    videoUrl: '/JAVA OOP Video Lesson/Lesson 12 Enum.mp4',
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

export const OOP_COURSE_LESSONS: VideoLesson[] = OOP_LESSON_BLUEPRINTS.map((lesson, index) => {
  const citation = SDPT_VIDEO_CITATIONS[lesson.sequence];

  return applyOopLessonCitation({
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
    video_title: citation.video_title,
    creator_name: citation.creator_name,
    publisher_name: citation.publisher_name,
    source_url: citation.source_url,
    accessed_date: citation.accessed_date,
    citation_created_at: citation.accessed_date
  });
});

export const OOP_ASSESSMENTS: LessonAssessment[] = OOP_LESSON_BLUEPRINTS.map(lesson => ({
  id: lesson.assessmentId,
  lessonId: lesson.id,
  title: `${lesson.title} Assessment`,
  passingPercentage: 80,
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
