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

export const INITIAL_LESSONS: VideoLesson[] = [
  {
    id: 'l1',
    sequence: 1,
    title: 'Intro to Objects & Classes',
    duration: '11:24',
    status: 'completed',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Learn the fundamentals of class definitions, instance instantiation, object lifetimes, and pointer/reference structures in modern object-oriented languages.',
    concepts: ['Classes vs Objects', 'State and Behavior', 'Instantiating Variables', 'Memory Allocation']
  },
  {
    id: 'l2',
    sequence: 2,
    title: 'Core Pillar: Inheritance Hierarchy',
    duration: '14:50',
    status: 'completed',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    description: 'Deconstruct parent-child relationship semantics. Understand how parameters flow from subclasses into super-constructors to construct unified compound entities.',
    concepts: ['Subclassing Syntax', 'The "super" Keyword', 'Variable Masking', 'Constructor Cascading']
  },
  {
    id: 'l3',
    sequence: 3,
    title: 'Mastering Polymorphism & Dynamic Dispatch',
    duration: '18:15',
    status: 'active',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
    description: 'Unlock programming logic versatility with dynamic type resolution references. Let runtime dispatch determine virtual override implementations at execution time.',
    concepts: ['Upcasting & Downcasting', 'Virtual Method Invocations', 'Type Coercion Safeguards', 'Dynamic Method Dispatch Map']
  },
  {
    id: 'l4',
    sequence: 4,
    title: 'Abstract Definitions & Strategy Patterns',
    duration: '12:05',
    status: 'locked',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Model functional guarantees without restricting implementational details. Implement abstract class barriers and interface contracts to decouple architectural coupling.',
    concepts: ['Abstract Methods', 'Interface Semantics', 'Multiple Interface Inheritance', 'Strategy Decoupling']
  },
  {
    id: 'l5',
    sequence: 5,
    title: 'Advanced Memory & Virtual Tables',
    duration: '22:10',
    status: 'locked',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    description: 'Dive below compilers level: dissect Virtual Method Tables (v-tables) and lookup index offsets that enable dynamic runtime polymorph overrides in low-level memory.',
    concepts: ['V-Table Assembly Representation', 'Heap Address Resolution', 'Method Dispatch Costs', 'Garbage Collector Optimization']
  }
];

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
