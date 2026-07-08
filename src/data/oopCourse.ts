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
    title: 'Method Overriding',
    videoUrl: '/videos/lesson7.mp4',
    duration: '14:20',
    description: 'Explains how subclasses provide their own implementation of inherited methods while keeping the same method signature.',
    concepts: ['Override behavior', 'Same signature', '@Override annotation', 'Runtime method call', 'Subclass implementation'],
    topic: 'Method Overriding',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['overriding', 'method signature', '@Override', 'subclass method', 'runtime behavior'],
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
    id: 'oop_lesson_8',
    assessmentId: 'oop_assessment_8',
    sequence: 8,
    title: 'Polymorphism',
    videoUrl: '/videos/lesson8.mp4',
    duration: '11:55',
    description: 'Covers polymorphism through parent references, subclass objects, and dynamic method dispatch in Java programs.',
    concepts: ['Many forms', 'Parent reference', 'Subclass object', 'Dynamic dispatch', 'Late binding'],
    topic: 'Polymorphism',
    module: 'Core OOP',
    difficulty: 'Intermediate',
    anchors: ['polymorphism', 'parent reference', 'subclass object', 'dynamic dispatch', 'late binding'],
    codeSnippet: `Animal pet = new Dog();
pet.sound();`
  },
  {
    id: 'oop_lesson_9',
    assessmentId: 'oop_assessment_9',
    sequence: 9,
    title: 'Abstraction',
    videoUrl: '/videos/lesson9.mp4',
    duration: '13:35',
    description: 'Shows how abstraction hides implementation details and focuses attention on essential behavior and contracts.',
    concepts: ['Essential behavior', 'Implementation hiding', 'Abstract idea', 'Reusable contract', 'Simplified design'],
    topic: 'Abstraction',
    module: 'Advanced OOP',
    difficulty: 'Intermediate',
    anchors: ['abstraction', 'implementation hiding', 'essential behavior', 'contract', 'design'],
    codeSnippet: `abstract class Shape {
    abstract double area();
}`
  },
  {
    id: 'oop_lesson_10',
    assessmentId: 'oop_assessment_10',
    sequence: 10,
    title: 'Abstract Classes',
    videoUrl: '/videos/lesson10.mp4',
    duration: '18:40',
    description: 'Explains abstract classes as shared base definitions that can contain both abstract methods and concrete reusable behavior.',
    concepts: ['abstract class', 'Abstract method', 'Concrete method', 'Shared base class', 'Subclass responsibility'],
    topic: 'Abstract Classes',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['abstract class', 'abstract method', 'concrete method', 'base class', 'subclass responsibility'],
    codeSnippet: `abstract class Vehicle {
    abstract void move();

    void start() {
        System.out.println("Starting");
    }
}`
  },
  {
    id: 'oop_lesson_11',
    assessmentId: 'oop_assessment_11',
    sequence: 11,
    title: 'Interfaces',
    videoUrl: '/videos/lesson11.mp4',
    duration: '15:25',
    description: 'Introduces Java interfaces as contracts that classes can implement to guarantee common capabilities across different types.',
    concepts: ['interface keyword', 'implements keyword', 'Contract methods', 'Multiple interfaces', 'Capability design'],
    topic: 'Interfaces',
    module: 'Advanced OOP',
    difficulty: 'Advanced',
    anchors: ['interface', 'implements', 'contract', 'multiple interfaces', 'capability'],
    codeSnippet: `interface Drivable {
    void drive();
}

class Car implements Drivable {
    public void drive() {
        System.out.println("Driving");
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

const buildLessonQuestions = (lesson: LessonBlueprint): CourseQuestion[] => {
  const [a, b, c, d, e] = lesson.anchors;
  const easy = [
    question(lesson, 1, 'Easy', `In "${lesson.title}", which term is presented as the main focus of the lesson?`, lesson.title, ['Inheritance', 'Arrays', 'Exception Handling'], `This lesson is centered on ${lesson.title}.`),
    question(lesson, 2, 'Easy', `Which Java idea from the lesson is most closely connected to "${a}"?`, a, [b, c, d], `The lesson introduces ${a} as a key term for understanding ${lesson.title}.`),
    question(lesson, 3, 'Easy', `Which item belongs to the vocabulary introduced for this lesson?`, b, ['HTML tag', 'SQL table', 'CSS selector'], `${b} is part of the lesson vocabulary.`),
    question(lesson, 4, 'Easy', `What kind of programming language examples does the lesson use?`, 'Java', ['Python only', 'SQL only', 'HTML only'], 'The course videos and code examples are focused on Java syntax.'),
    question(lesson, 5, 'Easy', `Which concept is paired with "${lesson.title}" in the course syllabus?`, lesson.topic, ['Network Routing', 'Database Indexing', 'Page Styling'], `${lesson.topic} is the lesson topic for this video.`),
    question(lesson, 6, 'Easy', `Which folder supplies the video for this lesson?`, '/videos/', ['https://youtube.com/', '/images/', '/api/videos/'], 'The videos are loaded from the local public/videos folder through /videos paths.'),
    question(lesson, 7, 'Easy', `Which lesson number is "${lesson.title}"?`, `Lesson ${lesson.sequence}`, ['Lesson 9', 'Lesson 0', 'Final Exam'], `The syllabus places this topic at lesson ${lesson.sequence}.`),
    question(lesson, 8, 'Easy', `Which of the following is listed as a key concept for "${lesson.title}"?`, c, ['Package install', 'HTTP status', 'CSS grid'], `${c} is one of this lesson's listed concepts.`),
    question(lesson, 9, 'Easy', `What should a student do before taking Assessment ${lesson.sequence}?`, 'Watch the lesson video', ['Skip to the next lesson', 'Delete progress', 'Use an external video'], 'Progression requires watching the current video before the assessment is available.'),
    question(lesson, 10, 'Easy', `What does the course use to present the "${lesson.title}" tutorial?`, 'An HTML5 video player', ['A YouTube embed', 'An external livestream', 'A PDF-only reader'], 'The module uses a responsive HTML5 video player for local MP4 files.')
  ];

  const medium = [
    question(lesson, 11, 'Medium', `In the Java example style for "${lesson.title}", which code block best matches the lesson focus?`, lesson.codeSnippet || 'class Example {}', ['SELECT * FROM lessons;', '<div>Example</div>', 'body { color: red; }'], `The lesson is Java-focused, so the matching example is the Java snippet.`, lesson.codeSnippet),
    question(lesson, 12, 'Medium', `Why does the lesson emphasize "${d}"?`, `Because it helps explain ${lesson.title} in Java programs`, ['Because it installs dependencies', 'Because it creates database rows', 'Because it deploys the website'], `${d} is directly related to how ${lesson.title} works in Java.`),
    question(lesson, 13, 'Medium', `Which statement best matches the instructor-style explanation for "${lesson.title}"?`, lesson.description, ['The lesson teaches CSS animations only.', 'The lesson teaches database joins only.', 'The lesson teaches Git branching only.'], 'The description summarizes the local lesson content used by this module.'),
    question(lesson, 14, 'Medium', `Which pair is most relevant to "${lesson.title}"?`, `${a} and ${b}`, ['route and controller', 'margin and padding', 'request and response'], `${a} and ${b} are both lesson anchors for this topic.`),
    question(lesson, 15, 'Medium', `If a student scores below 70% on this lesson assessment, what should happen?`, 'Keep the next lesson locked and recommend rewatching', ['Unlock every lesson', 'Mark the course completed', 'Hide the current lesson'], 'The progression rule keeps the next lesson locked until the current quiz is passed.'),
    question(lesson, 16, 'Medium', `Which progress threshold completes the "${lesson.title}" video?`, '95% watched', ['50% watched', '70% watched', '10 seconds watched'], 'The module marks a lesson video complete only after at least 95% has been watched.'),
    question(lesson, 17, 'Medium', `Which data should be saved while watching "${lesson.title}"?`, 'Last watched position and completion percentage', ['Only the title color', 'Only the browser size', 'Only the navigation label'], 'The system saves video progress so playback can resume.'),
    question(lesson, 18, 'Medium', `Which concept would be a reasonable review target after missing this lesson's questions?`, e || d, ['DNS caching', 'Flexbox wrapping', 'Image compression'], `${e || d} is part of the lesson anchor set.`),
    question(lesson, 19, 'Medium', `Which assessment belongs immediately after "${lesson.title}"?`, `Assessment ${lesson.sequence}`, ['Assessment 99', 'Landing Page', 'Teacher Portal'], `Each lesson has its own matching assessment in sequence.`),
    question(lesson, 20, 'Medium', `What does answer randomization protect in Assessment ${lesson.sequence}?`, 'It reduces memorizing positions instead of understanding concepts', ['It changes the video file', 'It edits the database password', 'It skips explanations'], 'Randomizing answer order helps students focus on understanding.')
  ];

  const hard = [
    question(lesson, 21, 'Hard', `A student watches 96% of "${lesson.title}" but fails the assessment. What is the correct unlock state?`, 'The next lesson remains locked', ['The next lesson unlocks immediately', 'All lessons reset', 'The video becomes external'], 'Both requirements are needed: video completion and passing assessment.'),
    question(lesson, 22, 'Hard', `A student passes Assessment ${lesson.sequence} but only watched 80% of the video. What should the module require?`, 'Return to the video and reach 95%', ['Skip the video requirement', 'Delete the assessment attempt', 'Open YouTube'], 'The video must be completed at 95% or more before progression is satisfied.'),
    question(lesson, 23, 'Hard', `Which saved record best proves mastery for "${lesson.title}"?`, 'Video completed, quiz score, percentage, correct answers, attempt number, and completion date', ['Only the video filename', 'Only the current tab', 'Only the selected theme'], 'The requested database fields include watch completion and quiz attempt details.'),
    question(lesson, 24, 'Hard', `If answer choices are shuffled, how should correctness be checked?`, 'Compare the selected answer text to the stored correct answer', ['Compare the visual letter only', 'Assume option A is always correct', 'Use the previous question answer'], 'Shuffled choices cannot rely on fixed positions.'),
    question(lesson, 25, 'Hard', `What makes Assessment ${lesson.sequence} scalable for a future lesson video?`, 'It is generated from the lesson blueprint and associated content', ['It is pasted into the video tag', 'It depends on YouTube URLs', 'It removes local progress'], 'New lesson blueprints can add videos and assessments without rewriting the UI.')
  ];

  return [...easy, ...medium, ...hard];
};

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
