import { 
  VideoLesson, 
  AssessmentQuestion, 
  LeaderboardUser, 
  PendingSubmission, 
  CurriculumModule, 
  LessonItem, 
  AdaptiveRule 
} from '../types';

export const INITIAL_JAVA_FILES: Record<string, string> = {
  'src/main/java/Vehicle.java': `// Vehicle.java - Base Class
public class Vehicle {
    protected String brand;
    protected int speed;

    public Vehicle(String brand) {
        this.brand = brand;
        this.speed = 0;
    }

    public void accelerate(int increment) {
        this.speed += increment;
        System.out.println(brand + " accelerated. Speed: " + speed + " km/h");
    }

    public void displayInfo() {
        System.out.println("Vehicle brand: " + brand + ", speed: " + speed);
    }
}`,

  'src/main/java/Car.java': `// Car.java - Challenge: Extend Vehicle!
public class Car extends Vehicle {
    private int doors;

    // TODO: Write constructor accepting brand & doors (use super!)
    public Car(String brand, int doors) {
        super(brand);
        this.doors = doors;
    }

    // TODO: Override displayInfo() to print Car details:
    // "Car: [brand], speed: [speed] km/h, doors: [doors]"
    @Override
    public void displayInfo() {
        System.out.println("Car: " + brand + ", speed: " + speed + " km/h, doors: " + doors);
    }
}`,

  'src/main/java/Main.java': `// Main.java - Execution Entrance
public class Main {
    public static void main(String[] args) {
        System.out.println("--- Booting OOP Vehicle Fleet Simulator ---");
        
        Vehicle generic = new Vehicle("Generic Hovercraft");
        generic.accelerate(40);
        generic.displayInfo();
        
        System.out.println("\\n--- testing Customized Subclass Polymorphism ---");
        Car modernCar = new Car("Tesla Model S", 4);
        modernCar.accelerate(110);
        modernCar.displayInfo();
    }
}`
};

const INITIAL_LESSONS_BASE: VideoLesson[] = [
  {
    id: 'l1',
    sequence: 1,
    title: 'test',
    duration: '13:50',
    status: 'completed',
    videoUrl: 'http://localhost:3000/videos/lesson1.mp4',
    description: 'Learn the fundamentals of class definitions, instance instantiation, object lifetimes, and pointer/reference structures in modern object-oriented languages.',
    concepts: ['Classes vs Objects', 'State and Behavior', 'Instantiating Variables', 'Memory Allocation'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80',
    topic: 'Objects & Classes',
    difficulty: 'Beginner',
    language: 'Java',
    module: 'Intro to Java & Classes',
    category: 'Basics',
    courseId: 'oop',
    isArchived: false,
    unlockedAssessmentId: 'a2',
    views: 124,
    avgWatchTime: 512,
    completedStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu', 'chen@oophub.edu'],
    inProgressStudents: ['hughes@oophub.edu'],
    notStartedStudents: [],
    progressPercent: 100
  },
  {
    id: 'l2',
    sequence: 2,
    title: 'Constructors',
    duration: '17:29',
    status: 'completed',
    videoUrl: 'http://localhost:3000/videos/lesson2.mp4',
    description: 'Deconstruct parent-child relationship semantics. Understand how parameters flow from subclasses into super-constructors to construct unified compound entities.',
    concepts: ['Subclassing Syntax', 'The "super" Keyword', 'Variable Masking', 'Constructor Cascading'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
    topic: 'Inheritance',
    difficulty: 'Beginner',
    language: 'Java',
    module: 'Inheritance vs Composition',
    category: 'Core OOP',
    courseId: 'oop',
    isArchived: false,
    unlockedAssessmentId: 'a1',
    views: 98,
    avgWatchTime: 654,
    completedStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu'],
    inProgressStudents: ['chen@oophub.edu'],
    notStartedStudents: ['hughes@oophub.edu'],
    progressPercent: 100
  },
  {
    id: 'l3',
    sequence: 3,
    title: 'Mastering Polymorphism & Dynamic Dispatch',
    duration: '18:15',
    status: 'active',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
    description: 'Unlock programming logic versatility with dynamic type resolution references. Let runtime dispatch determine virtual override implementations at execution time.',
    concepts: ['Upcasting & Downcasting', 'Virtual Method Invocations', 'Type Coercion Safeguards', 'Dynamic Method Dispatch Map'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=300&q=80',
    topic: 'Polymorphism',
    difficulty: 'Intermediate',
    language: 'Java',
    module: 'Polymorphism & Dynamic Binding',
    category: 'Core OOP',
    courseId: 'oop',
    isArchived: false,
    views: 45,
    avgWatchTime: 420,
    completedStudents: [],
    inProgressStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu'],
    notStartedStudents: ['chen@oophub.edu', 'hughes@oophub.edu'],
    progressPercent: 40
  },
  {
    id: 'l4',
    sequence: 4,
    title: 'Abstract Definitions & Strategy Patterns',
    duration: '12:05',
    status: 'locked',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Model functional guarantees without restricting implementational details. Implement abstract class barriers and interface contracts to decouple architectural coupling.',
    concepts: ['Abstract Methods', 'Interface Semantics', 'Multiple Interface Inheritance', 'Strategy Decoupling'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1516116211223-5c359a36298a?auto=format&fit=crop&w=300&q=80',
    topic: 'Abstraction',
    difficulty: 'Intermediate',
    language: 'Java',
    module: 'Design Patterns Core',
    category: 'Advanced Architecture',
    courseId: 'oop',
    isArchived: false,
    views: 12,
    avgWatchTime: 230,
    completedStudents: [],
    inProgressStudents: [],
    notStartedStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu', 'chen@oophub.edu', 'hughes@oophub.edu'],
    progressPercent: 0
  },
  {
    id: 'l5',
    sequence: 5,
    title: 'Advanced Memory & Virtual Tables',
    duration: '22:10',
    status: 'locked',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Dive below compilers level: dissect Virtual Method Tables (v-tables) and lookup index offsets that enable dynamic runtime polymorph overrides in low-level memory.',
    concepts: ['V-Table Assembly Representation', 'Heap Address Resolution', 'Method Dispatch Costs', 'Garbage Collector Optimization'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=300&q=80',
    topic: 'V-Tables',
    difficulty: 'Advanced',
    language: 'Java',
    module: 'Polymorphism & Dynamic Binding',
    category: 'Core OOP',
    courseId: 'oop',
    isArchived: false,
    views: 4,
    avgWatchTime: 820,
    completedStudents: [],
    inProgressStudents: [],
    notStartedStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu', 'chen@oophub.edu', 'hughes@oophub.edu'],
    progressPercent: 0
  },
  {
    id: 'jl1',
    sequence: 1,
    title: 'Syntax & Datatypes',
    duration: '08:45',
    status: 'completed',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Master compilation, class entry points, syntax structures, variables initialization, primitive types, and object reference basics.',
    concepts: ['Variables', 'Types', 'Entry Points', 'Compiler pass'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80',
    topic: 'Syntax',
    difficulty: 'Beginner',
    language: 'Java',
    module: 'Intro to Java & Classes',
    category: 'Basics',
    courseId: 'java_lang',
    isArchived: false,
    views: 89,
    avgWatchTime: 480,
    completedStudents: ['rodriguez@oophub.edu', 'volkov@oophub.edu'],
    inProgressStudents: [],
    notStartedStudents: [],
    progressPercent: 100
  },
  {
    id: 'jl2',
    sequence: 2,
    title: 'Control Structures & Loops',
    duration: '10:15',
    status: 'active',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    description: 'Implement branching control structures (if-else, switch cases) and execution loop arrays (while, standard for, advanced for-each).',
    concepts: ['Loops', 'Branches', 'Boolean conditions'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=300&q=80',
    topic: 'Control Flow',
    difficulty: 'Beginner',
    language: 'Java',
    module: 'Intro to Java & Classes',
    category: 'Basics',
    courseId: 'java_lang',
    isArchived: false,
    views: 74,
    avgWatchTime: 520,
    completedStudents: ['rodriguez@oophub.edu'],
    inProgressStudents: ['volkov@oophub.edu'],
    notStartedStudents: [],
    progressPercent: 30
  },
  {
    id: 'js1',
    sequence: 1,
    title: 'Window Frames & Containers',
    duration: '09:30',
    status: 'active',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Create desktop frame components using JFrame, add containers like JPanel, and declare window dimensions.',
    concepts: ['JFrame', 'JPanel', 'Containers'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&w=300&q=80',
    topic: 'Swing Basics',
    difficulty: 'Intermediate',
    language: 'Java',
    module: 'Java Swing UI',
    category: 'Basics',
    courseId: 'swing_ui',
    isArchived: false,
    views: 35,
    avgWatchTime: 380,
    completedStudents: [],
    inProgressStudents: ['rodriguez@oophub.edu'],
    notStartedStudents: ['volkov@oophub.edu'],
    progressPercent: 0
  }
];

const buildSeedCitation = (lesson: VideoLesson) => {
  const isW3C = lesson.videoUrl.includes('media.w3.org');
  const isW3Schools = lesson.videoUrl.includes('w3schools.com');

  return {
    video_title: lesson.title,
    creator_name: isW3C ? 'Blender Foundation' : isW3Schools ? 'W3Schools Demo Media' : 'OOP Pedagogical Hub Academic Team',
    publisher_name: isW3C ? 'W3C Media Repository' : isW3Schools ? 'W3Schools' : 'OOP Pedagogical Hub',
    source_url: lesson.videoUrl,
    accessed_date: '2026-06-26T00:00:00.000Z',
    license_type: 'Educational Use',
    citation_created_at: '2026-06-26T00:00:00.000Z'
  };
};

export const INITIAL_LESSONS: VideoLesson[] = INITIAL_LESSONS_BASE.map(lesson => ({
  ...lesson,
  ...buildSeedCitation(lesson)
}));

export const INITIAL_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'q1',
    scenario: 'Scenario 04: The Fleet Manager',
    question: 'An operations manager is building a dynamic logistics dashboard. They create an array of "Vehicle" and load it with references to subclasses: CargoTruck, DeliveryVan, and ElectricSedan. They iterate through this array, firing vehicle.accelerate() and vehicle.displayInfo(). What Java compiler core behavior does this runtime capability leverage?',
    codeSnippet: `Vehicle[] fleet = new Vehicle[3];
fleet[0] = new CargoTruck("HeavyDuty-X", 12000);
fleet[1] = new DeliveryVan("Sprintey", 350);
fleet[2] = new ElectricSedan("Model 3", 85);

for (Vehicle v : fleet) {
    v.accelerate(30); // Runs specific overridden method subclass logic
    v.displayInfo();  // resolved dynamically!
}`,
    options: [
      {
        id: 'A',
        text: 'Static Polymorphism at Compilation (Method Overloading lookup tables)',
        rationale: 'Incorrect. Method overloading resolved static type parameters during compile pass based strictly on matching argument signatures rather than dynamic subclass types.'
      },
      {
        id: 'B',
        text: 'Dynamic Dispatch utilizing Late Binding (Polymorphic Method Overriding)',
        rationale: 'Correct! The Java Virtual Machine (JVM) references real object runtime class signatures on heap structures to resolve and fire overridden method instances via V-Tables.'
      },
      {
        id: 'C',
        text: 'Type Eradication through Generic Bounds (Subtype Class Casting Optimization)',
        rationale: 'Incorrect. Type erasure is a compiler-time mechanism used specifically in Generics validation rather than dynamic method resolution hierarchies.'
      }
    ],
    correctOptionId: 'B',
    difficulty: 'Intermediate',
    points: 150
  }
];

export const INITIAL_LEADERBOARD_USERS: LeaderboardUser[] = [
  { rank: 1, name: 'Alex Mercer', points: 3450, badges: ['Overachiever', 'Speedster', 'Clean Coder'], streak: 12, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', trend: 'stable' },
  { rank: 2, name: 'S. Rodriguez', points: 3120, badges: ['Bug Hunter', 'Refactoring Master'], streak: 8, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', trend: 'up' },
  { rank: 3, name: 'J. Chen', points: 2980, badges: ['Architecture Guru'], streak: 15, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', trend: 'down' },
  { rank: 4, name: 'Elena Rossi', points: 2450, badges: ['Fast Learner'], streak: 6, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', trend: 'up' },
  { rank: 5, name: 'You', points: 1950, badges: ['Rising Star', 'OOP Initiate'], streak: 5, isCurrentUser: true, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', trend: 'up' },
  { rank: 6, name: 'Dmitry Volkov', points: 1840, badges: ['Memory leak finder'], streak: 4, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', trend: 'stable' },
  { rank: 7, name: 'Liam Hughes', points: 1690, badges: ['Linter fanatic'], streak: 2, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80', trend: 'down' }
];

export const INITIAL_SUBMISSIONS: PendingSubmission[] = [
  {
    id: 'sub_1',
    studentName: 'Alex Mercer',
    challengeName: 'Inheritance Constraints with Vehicle/Car Override',
    submittedAt: 'Today, 2:15 PM',
    status: 'pending',
    code: `// Alex Mercer - Car.java Submission
public class Car extends Vehicle {
    private int doors;

    public Car(String brand, int doors) {
        super(brand);
        this.doors = doors;
    }

    @Override
    public void displayInfo() {
        System.out.println("Car: " + brand + ", speed: " + speed + " km/h, doors: " + doors);
    }
}`
  },
  {
    id: 'sub_2',
    studentName: 'S. Rodriguez',
    challengeName: 'Abstract Factories Pattern Lab',
    submittedAt: 'Yesterday, 6:40 PM',
    status: 'pending',
    code: `// Sofia Rodriguez - Abstract Factory Pattern Implementation
public interface GUIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

public class WinFactory implements GUIFactory {
    public Button createButton() { return new WinButton(); }
    public Checkbox createCheckbox() { return new WinCheckbox(); }
}`
  },
  {
    id: 'sub_3',
    studentName: 'Dmitry Volkov',
    challengeName: 'Inheritance Constraints with Vehicle/Car Override',
    submittedAt: 'Yesterday, 11:15 AM',
    status: 'reviewed',
    code: `// Dmitry - Car.java
public class Car extends Vehicle {
    int doors;
    public Car(String b, int d) {
        super(b);
        this.doors = d;
    }
    // Forgot to override displayInfo!
}`,
    grade: 75,
    feedback: 'Your constructor works fine, Dmitry. However, you forgot to override displayInfo() to print the doors parameter. Please check the remediation challenge and resubmit.'
  }
];

export const INITIAL_CURRICULUM_MODULES: CurriculumModule[] = [
  { id: 'm1', title: 'Intro to Java & Classes', status: 'Published', lessonsCount: 4, lastUpdated: 'May 20, 2026', category: 'Basics' },
  { id: 'm2', title: 'Inheritance vs Composition', status: 'Published', lessonsCount: 5, lastUpdated: 'May 28, 2026', category: 'Core OOP' },
  { id: 'm3', title: 'Polymorphism & Dynamic Binding', status: 'Published', lessonsCount: 6, lastUpdated: 'Jun 01, 2026', category: 'Core OOP' },
  { id: 'm4', title: 'Design Patterns Core', status: 'Draft', lessonsCount: 3, lastUpdated: 'Jun 02, 2026', category: 'Advanced Architecture' }
];

export const INITIAL_LESSON_ITEMS: LessonItem[] = [
  { id: 'li1', title: 'The Singleton Pattern', module: 'Design Patterns Core', type: 'Video', difficulty: 'Advanced' },
  { id: 'li2', title: 'Understanding Encapsulation', module: 'Intro to Java & Classes', type: 'Quiz', difficulty: 'Beginner' },
  { id: 'li3', title: 'Abstract Factories Deep Dive', module: 'Design Patterns Core', type: 'Lab', difficulty: 'Advanced' },
  { id: 'li4', title: 'Car/Vehicle Polymorphism Lab', module: 'Polymorphism & Dynamic Binding', type: 'Lab', difficulty: 'Intermediate' }
];

export const INITIAL_ADAPTIVE_RULES: AdaptiveRule[] = [
  { id: 'r1', trigger: 'Quiz Failed (< 70%)', condition: 'Failed Polymorphism dispatch core questions', action: 'Recommend Lesson 3 (video) + Polymorphism Sandbox Lab', isActive: true },
  { id: 'r2', trigger: 'Lab Submission Incomplete', condition: 'Car constructor forgets calling super constructor', action: 'Inject inline compiler error highlighting subclass constructor rules', isActive: true },
  { id: 'r3', trigger: 'Perfect Daily Streak > 5 Days', condition: 'Alexander score > 1500 points', action: 'Unlock fast-track Advanced Memory and Virtual Tables preview', isActive: false },
  { id: 'r4', trigger: 'Submodule Idle Timeout', condition: 'Has not engaged in interactive sandbox for 4 days', action: 'Send active slack webhook alerting reinforcement sandbox challenge', isActive: true }
];

export const INITIAL_ASSESSMENTS: any[] = [
  {
    id: 'a2',
    title: 'Encapsulation & Access',
    topicName: 'Encapsulation & Variables',
    questionsCount: 5,
    timeLimitMinutes: 5,
    difficulty: 'Easy',
    questions: [
      {
        id: 'eq1',
        question: 'Which access modifier restricts member visibility strictly to the declaring class itself?',
        options: [
          { id: 'A', text: 'public', rationale: 'Incorrect. Public makes it accessible from any package.' },
          { id: 'B', text: 'protected', rationale: 'Incorrect. Protected is accessible to package members and subclasses.' },
          { id: 'C', text: 'private', rationale: 'Correct! The private modifier hides class variables and methods from outside access.' },
          { id: 'D', text: 'default (package-private)', rationale: 'Incorrect. Default access allows visibility within the entire package.' }
        ],
        correctOptionId: 'C'
      },
      {
        id: 'eq2',
        question: 'What is the primary role of getter and setter methods in class design?',
        options: [
          { id: 'A', text: 'To bypass Java safety rules', rationale: 'Incorrect. Getters/setters reinforce design guidelines.' },
          { id: 'B', text: 'To safely retrieve/modify fields and validate updates', rationale: 'Correct! They encapsulate data fields, preventing direct field mutation and permitting validation logic.' },
          { id: 'C', text: 'To allow faster memory allocations', rationale: 'Incorrect. They are standard method calls and add no memory optimization.' },
          { id: 'D', text: 'To automatically compile structures', rationale: 'Incorrect. Compilation is independent of design patterns.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'eq3',
        question: 'Which modifier grants access to a class member from subclasses, even if they reside in different packages?',
        options: [
          { id: 'A', text: 'private', rationale: 'Incorrect. Private is restricted to the declaring class.' },
          { id: 'B', text: 'protected', rationale: 'Correct! Protected fields can be accessed by subclasses in other packages.' },
          { id: 'C', text: 'default (package-private)', rationale: 'Incorrect. Default allows access within the same package only.' },
          { id: 'D', text: 'final', rationale: 'Incorrect. Final controls mutability, not access permissions.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'eq4',
        question: 'What is the compilation outcome of accessing a private variable directly from another class?',
        codeSnippet: `class BankAccount {
    private double balance = 100.0;
}
public class Main {
    public static void main(String[] args) {
        BankAccount account = new BankAccount();
        System.out.println(account.balance);
    }
}`,
        options: [
          { id: 'A', text: 'Prints "100.0"', rationale: 'Incorrect. Direct private access is blocked by compilers.' },
          { id: 'B', text: 'Compilation Error: balance has private access in BankAccount', rationale: 'Correct! Compilers block references to private fields from outer classes.' },
          { id: 'C', text: 'Compiles, but prints "0.0" at runtime', rationale: 'Incorrect. The code fails to compile.' },
          { id: 'D', text: 'Throws NullPointerException', rationale: 'Incorrect. It is a compilation visibility error.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'eq5',
        question: 'Which OOP concept emphasizes bundling data and methods inside a class and restricting direct data modifications?',
        options: [
          { id: 'A', text: 'Polymorphism', rationale: 'Incorrect. Polymorphism deals with multi-form behaviors.' },
          { id: 'B', text: 'Inheritance', rationale: 'Incorrect. Inheritance deals with base class extensions.' },
          { id: 'C', text: 'Encapsulation', rationale: 'Correct! Encapsulation bundles fields and methods together and hides raw internal state.' },
          { id: 'D', text: 'Abstraction', rationale: 'Incorrect. Abstraction hides implementation detail complexity.' }
        ],
        correctOptionId: 'C'
      }
    ]
  },
  {
    id: 'a1',
    title: 'Inheritance & super',
    topicName: 'Inheritance Hierarchy',
    questionsCount: 10,
    timeLimitMinutes: 7,
    difficulty: 'Easy',
    questions: [
      {
        id: 'q1',
        question: 'Which of the following describes the relationship established by inheritance?',
        options: [
          { id: 'A', text: '"has-a" relationship', rationale: 'Incorrect. "has-a" describes composition or aggregation (e.g. Car has-a Engine).' },
          { id: 'B', text: '"is-a" relationship', rationale: 'Correct! Inheritance models specialization, where a subclass is-a superclass (e.g. Dog is-a Animal).' },
          { id: 'C', text: '"uses-a" relationship', rationale: 'Incorrect. "uses-a" describes dependency injection or association.' },
          { id: 'D', text: '"implements-a" relationship', rationale: 'Incorrect. "implements-a" is not a standard OOP term, classes implement interfaces.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'q2',
        question: 'Which keyword is used to call a parent class constructor in Java?',
        options: [
          { id: 'A', text: 'this', rationale: 'Incorrect. The "this" keyword invokes current class constructors or refers to the current object.' },
          { id: 'B', text: 'parent', rationale: 'Incorrect. "parent" is used in PHP, but not in Java.' },
          { id: 'C', text: 'super', rationale: 'Correct! The "super" keyword is used to invoke a parent class constructor or reference parent members.' },
          { id: 'D', text: 'base', rationale: 'Incorrect. "base" is used in C#, but not in Java.' }
        ],
        correctOptionId: 'C'
      },
      {
        id: 'q3',
        question: 'What must be the first statement in a subclass constructor if you explicitly call a parent constructor?',
        options: [
          { id: 'A', text: 'The parent field initialization', rationale: 'Incorrect. Fields cannot be accessed before the constructor is run.' },
          { id: 'B', text: 'A call to super() or super(...)', rationale: 'Correct! Subclass constructors must invoke parent constructors as the first statement in the body.' },
          { id: 'C', text: 'A static method call', rationale: 'Incorrect. Non-static constructor statements cannot precede super().' },
          { id: 'D', text: 'System.out.println()', rationale: 'Incorrect. Printing is an statement and cannot run before parent construction.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'q4',
        question: 'What will be printed when compiling and running the following code?',
        codeSnippet: `class Animal {
    void sound() {
        System.out.println("Animal");
    }
}
class Dog extends Animal {
    void sound() {
        System.out.println("Dog");
    }
}
public class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.sound();
    }
}`,
        options: [
          { id: 'A', text: 'Animal', rationale: 'Incorrect. Java resolves virtual methods dynamically based on the object on the heap, not the reference type.' },
          { id: 'B', text: 'Dog', rationale: 'Correct! At runtime, a refers to a Dog instance, so the overridden Dog.sound() method is called.' },
          { id: 'C', text: 'Compilation Error', rationale: 'Incorrect. Upcasting is implicit and fully valid.' },
          { id: 'D', text: 'Runtime Exception', rationale: 'Incorrect. The object on the heap matches the sound() signature.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'q5',
        question: 'What will be printed by the following constructor cascading execution?',
        codeSnippet: `class Parent {
    Parent() {
        System.out.print("Parent ");
    }
}
class Child extends Parent {
    Child() {
        System.out.print("Child ");
    }
}
public class Main {
    public static void main(String[] args) {
        Child c = new Child();
    }
}`,
        options: [
          { id: 'A', text: 'Child Parent', rationale: 'Incorrect. Parent constructors execute before Child constructors.' },
          { id: 'B', text: 'Parent Child', rationale: 'Correct! When constructing Child, the compiler implicitly inserts a call to super() at the start, printing "Parent " then "Child ".' },
          { id: 'C', text: 'Child', rationale: 'Incorrect. Parent constructor is automatically triggered.' },
          { id: 'D', text: 'Parent', rationale: 'Incorrect. Both constructors are executed sequentially.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'q6',
        question: 'What is the compilation outcome of overriding a public parent class method with a private access modifier in the child class?',
        codeSnippet: `class Parent {
    public void display() {
        System.out.println("Parent");
    }
}
class Child extends Parent {
    private void display() { // Attempting override
        System.out.println("Child");
    }
}`,
        options: [
          { id: 'A', text: 'Compiles and runs normally', rationale: 'Incorrect. Subclasses cannot restrict access permissions.' },
          { id: 'B', text: 'Compilation Error: Cannot reduce the visibility of the inherited method', rationale: 'Correct! Overriding methods cannot have a more restrictive access modifier than the parent method.' },
          { id: 'C', text: 'Compiles but throws IllegalAccessError at runtime', rationale: 'Incorrect. This issue is caught during compilation.' },
          { id: 'D', text: 'Runs successfully, but suppresses child output', rationale: 'Incorrect. It fails compilation completely.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'q7',
        question: 'Which of the following is true about method overriding in Java?',
        options: [
          { id: 'A', text: 'Method name and parameter types must match exactly', rationale: 'Correct! Method signature (name + parameters) must match the parent signature to override.' },
          { id: 'B', text: 'Return types can be completely arbitrary', rationale: 'Incorrect. The return type must match or be a covariant subtype.' },
          { id: 'C', text: 'Static methods can be overridden by subclasses', rationale: 'Incorrect. Static methods are hidden (shadowed), not dynamically overridden.' },
          { id: 'D', text: 'Overriding methods must throw more general checked exceptions', rationale: 'Incorrect. Overriding methods can only throw narrower checked exceptions.' }
        ],
        correctOptionId: 'A'
      },
      {
        id: 'q8',
        question: 'What is the printed output of this dynamic method invocation?',
        codeSnippet: `class Printer {
    void print() { System.out.print("P "); }
}
class LaserPrinter extends Printer {
    void print() { System.out.print("L "); }
}
public class Main {
    public static void main(String[] args) {
        Printer p1 = new Printer();
        Printer p2 = new LaserPrinter();
        p1.print();
        p2.print();
    }
}`,
        options: [
          { id: 'A', text: 'P P', rationale: 'Incorrect. p2 references a LaserPrinter, which overrides the print method.' },
          { id: 'B', text: 'L L', rationale: 'Incorrect. p1 is a plain Printer class.' },
          { id: 'C', text: 'P L', rationale: 'Correct! p1 prints "P " and p2 uses late binding to invoke LaserPrinter.print() printing "L ".' },
          { id: 'D', text: 'L P', rationale: 'Incorrect. The order is Printer first, then LaserPrinter.' }
        ],
        correctOptionId: 'C'
      },
      {
        id: 'q9',
        question: 'If a class does not explicitly extend any class, what class is its direct superclass in Java?',
        options: [
          { id: 'A', text: 'java.lang.Object', rationale: 'Correct! java.lang.Object is the root of the Java class hierarchy.' },
          { id: 'B', text: 'java.lang.Class', rationale: 'Incorrect. java.lang.Class represents runtime class structures, it is not inherited by default.' },
          { id: 'C', text: 'java.lang.System', rationale: 'Incorrect. System is a helper utility class.' },
          { id: 'D', text: 'None', rationale: 'Incorrect. Object is always the implicit ancestor.' }
        ],
        correctOptionId: 'A'
      },
      {
        id: 'q10',
        question: 'What is the compilation outcome of attempting to override a method declared as final?',
        codeSnippet: `class Base {
    final void show() {
        System.out.println("Base");
    }
}
class Derived extends Base {
    void show() { // Attempting override
        System.out.println("Derived");
    }
}`,
        options: [
          { id: 'A', text: 'Compiles successfully', rationale: 'Incorrect. final prevents overriding.' },
          { id: 'B', text: 'Compilation Error: Cannot override the final method from Base', rationale: 'Correct! In Java, "final" prevents subclasses from overriding base class method definitions.' },
          { id: 'C', text: 'Compiles, but calls default Base method at runtime', rationale: 'Incorrect. Overriding validation fails at compilation.' },
          { id: 'D', text: 'Throws FinalOverrideException at runtime', rationale: 'Incorrect. This validation is done by the javac compiler.' }
        ],
        correctOptionId: 'B'
      }
    ]
  },
  {
    id: 'a3',
    title: 'Polymorphism & late binding',
    topicName: 'Polymorphism & Dynamic Dispatch',
    questionsCount: 2,
    timeLimitMinutes: 5,
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'pq1',
        question: 'Which reference type can be used to hold a subclass object in Java?',
        options: [
          { id: 'A', text: 'Only the exact subclass reference type', rationale: 'Incorrect. Java supports upcasting to parent types.' },
          { id: 'B', text: 'Any ancestor class or implemented interface type (upcasting)', rationale: 'Correct! Upcasting allows a superclass variable to reference a subclass instance.' },
          { id: 'C', text: 'Only java.lang.Class', rationale: 'Incorrect. Object variables can be declared as the superclass type.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'pq2',
        question: 'What resolves overridden method calls at runtime in the JVM?',
        options: [
          { id: 'A', text: 'The reference type of the variable (static binding)', rationale: 'Incorrect. Static binding applies to overloaded, static, private, or final methods.' },
          { id: 'B', text: 'The actual object type stored on the Heap (late binding)', rationale: 'Correct! Method overriding uses late binding to resolve the method based on the runtime type on the heap.' },
          { id: 'C', text: 'The compiler class imports list', rationale: 'Incorrect. Compilation imports resolve namespace lookups, not runtime calls.' }
        ],
        correctOptionId: 'B'
      }
    ]
  },
  {
    id: 'a4',
    title: 'Abstraction & Interfaces',
    topicName: 'Abstract Definitions & Strategy Patterns',
    questionsCount: 2,
    timeLimitMinutes: 5,
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'abq1',
        question: 'Which of the following is true about abstract classes in Java?',
        options: [
          { id: 'A', text: 'They can be instantiated using the new keyword', rationale: 'Incorrect. Abstract classes cannot be directly instantiated.' },
          { id: 'B', text: 'They are designed to act as blueprints and cannot be directly instantiated', rationale: 'Correct! Abstract classes provide base contracts and concrete methods, but cannot be instantiated directly.' },
          { id: 'C', text: 'They cannot contain concrete methods', rationale: 'Incorrect. They can contain fully implemented concrete methods alongside abstract methods.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'abq2',
        question: 'Can a Java class implement multiple interfaces?',
        options: [
          { id: 'A', text: 'Yes, a class can implement any number of interfaces', rationale: 'Correct! Java allows multiple inheritance of type through interfaces.' },
          { id: 'B', text: 'No, a class can only implement one interface', rationale: 'Incorrect. Java allows multiple interface implementation, although only extending one class.' },
          { id: 'C', text: 'Only if interfaces have identical method signatures', rationale: 'Incorrect. Method signatures should ideally not conflict, but classes can implement multiple distinct interfaces.' }
        ],
        correctOptionId: 'A'
      }
    ]
  },
  {
    id: 'a5',
    title: 'V-Tables & Memory Offsets',
    topicName: 'Advanced Memory & Virtual Tables',
    questionsCount: 2,
    timeLimitMinutes: 5,
    difficulty: 'Hard',
    questions: [
      {
        id: 'vtq1',
        question: 'What does the abbreviation "V-Table" stand for in dynamic dispatch implementations?',
        options: [
          { id: 'A', text: 'Variable Table', rationale: 'Incorrect. V-Table represents virtual method bindings.' },
          { id: 'B', text: 'Virtual Method Table', rationale: 'Correct! The Virtual Method Table maps method signatures to their runtime memory offsets.' },
          { id: 'C', text: 'Vector Table', rationale: 'Incorrect. Vector tables are used in interrupt handling, not dynamic dispatch.' }
        ],
        correctOptionId: 'B'
      },
      {
        id: 'vtq2',
        question: 'Where are objects and their class reference blocks stored in JVM memory?',
        options: [
          { id: 'A', text: 'In the Stack segment', rationale: 'Incorrect. The Stack holds local variable values and method activation frames.' },
          { id: 'B', text: 'In the Heap segment', rationale: 'Correct! All objects and instance variables are allocated on the JVM dynamic Heap.' },
          { id: 'C', text: 'In CPU Cache memory directly', rationale: 'Incorrect. JVM abstracts memory into Stack, Heap, and Method Area.' }
        ],
        correctOptionId: 'B'
      }
    ]
  }
];
