import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  Code2, 
  ArrowRight, 
  RotateCcw,
  Check,
  ChevronRight as ArrowIcon
} from 'lucide-react';
import { StudentSubView, VideoLesson } from '../types';

interface AssessmentsProps {
  onCorrectAnswerAdded: (xp: number) => void;
  onNavigateTo?: (view: StudentSubView) => void;
  lessons: VideoLesson[];
}

interface Option {
  id: string;
  text: string;
  rationale: string;
}

interface Question {
  id: string;
  question: string;
  codeSnippet?: string;
  options: Option[];
  correctOptionId: string;
}

interface Assessment {
  id: string;
  title: string;
  topicName: string;
  questionsCount: number;
  timeLimitMinutes: number;
  difficulty: 'Easy' | 'Intermediate' | 'Hard';
  questions: Question[];
}

const ASSESSMENTS: Assessment[] = [
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
  }
];

export default function Assessments({ onCorrectAnswerAdded, onNavigateTo, lessons }: AssessmentsProps) {
  const [view, setView] = useState<'dashboard' | 'active' | 'result' | 'review'>('dashboard');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  
  // Quiz progress states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({}); // { questionIdx: optionId }
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [assessmentStatuses, setAssessmentStatuses] = useState<Record<string, 'Not Started' | 'In Progress' | 'Passed'>>({
    'a1': 'Not Started',
    'a2': 'Not Started'
  });

  // Timer useEffect
  useEffect(() => {
    if (view !== 'active') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpentSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [view]);

  const handleStartAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setTimeRemaining(assessment.timeLimitMinutes * 60);
    setTimeSpentSeconds(0);
    setView('active');

    // Update status
    setAssessmentStatuses(prev => ({
      ...prev,
      [assessment.id]: 'In Progress'
    }));
  };

  const handleOptionSelect = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIdx]: optionId
    }));
  };

  const handleNext = () => {
    if (!selectedAssessment) return;
    if (currentQuestionIdx < selectedAssessment.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const handleAutoSubmit = () => {
    submitQuiz();
  };

  const submitQuiz = () => {
    if (!selectedAssessment) return;
    
    // Save state, switch view
    setView('result');
    
    // Calculate passing score
    const score = getScore();
    const passed = score >= Math.ceil(selectedAssessment.questions.length * 0.7);
    
    if (passed) {
      onCorrectAnswerAdded(150); // Add points/XP!
      setAssessmentStatuses(prev => ({
        ...prev,
        [selectedAssessment.id]: 'Passed'
      }));
    }
  };

  const getScore = () => {
    if (!selectedAssessment) return 0;
    let score = 0;
    selectedAssessment.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOptionId) {
        score++;
      }
    });
    return score;
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dashboard Renderer
  const renderDashboard = () => {
    return (
      <div className="space-y-8 animate-fade-in" id="assessment-dashboard">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">LMS Evaluations</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Module Assessments</h2>
          <p className="text-slate-500 text-sm mt-1">
            Test your Object-Oriented conceptual masteries. Complete assessments to unlock coding challenges inside the compiler IDE.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ASSESSMENTS.map(item => {
            const status = assessmentStatuses[item.id] || 'Not Started';
            const lockingVideo = lessons.find(
              l => l.unlockedAssessmentId === item.id && (!l.progressPercent || l.progressPercent < 90)
            );
            const isLocked = Boolean(lockingVideo);

            return (
              <div 
                key={item.id} 
                className={`bg-white border transition-all rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5 ${
                  isLocked ? 'opacity-85 border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{item.topicName}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono ${
                      isLocked ? 'bg-slate-100 text-slate-400 border border-slate-200' :
                      status === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {isLocked ? 'Locked' : status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {isLocked ? '🔒 ' : ''}{item.title} Assessment
                  </h3>
                  
                  {isLocked && lockingVideo ? (
                    <div className="p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl text-[10.5px] text-rose-900 leading-relaxed font-semibold">
                      Complete at least 90% of the video <strong>"{lockingVideo.title}"</strong> to unlock this assessment.
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.timeLimitMinutes} Mins</span>
                      <span>•</span>
                      <span>{item.questionsCount} Questions</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">{item.difficulty}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (isLocked && lockingVideo) {
                      alert(`🔒 Locked: You must watch "${lockingVideo.title}" to at least 90% before starting this assessment.`);
                      return;
                    }
                    handleStartAssessment(item);
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-xs cursor-pointer select-none transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    isLocked
                      ? 'bg-slate-100 text-slate-405 border border-slate-200 cursor-not-allowed'
                      : status === 'Passed'
                        ? 'bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-50'
                  }`}
                >
                  {isLocked ? 'Locked' : status === 'Passed' ? 'Retake Assessment' : 'Start Assessment'} <ArrowIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Active Test-Taking Screen
  const renderActiveAssessment = () => {
    if (!selectedAssessment) return null;
    const currentQuestion = selectedAssessment.questions[currentQuestionIdx];
    const answeredCount = Object.keys(answers).length;
    const remainingCount = selectedAssessment.questions.length - answeredCount;
    const percentComplete = Math.round((currentQuestionIdx + 1) / selectedAssessment.questions.length * 100);

    return (
      <div className="grid lg:grid-cols-12 gap-6 items-start text-slate-800 animate-fade-in" id="active-assessment-screen">
        
        {/* Left main content column */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">{selectedAssessment.title} Assessment</span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">Question {currentQuestionIdx + 1} of {selectedAssessment.questions.length}</h2>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-mono font-bold">Difficulty: {selectedAssessment.difficulty}</span>
              <span className="text-xs font-mono font-black text-rose-650 lg:hidden flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTimer(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <p className="text-sm font-semibold text-slate-850 leading-relaxed">
            {currentQuestion.question}
          </p>

          {/* Code Area */}
          {currentQuestion.codeSnippet && (
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-sky-400 border border-slate-800 overflow-x-auto relative shadow-inner">
              <span className="absolute top-2 right-3 text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase select-none">Java Editor</span>
              <pre className="leading-relaxed whitespace-pre">{currentQuestion.codeSnippet}</pre>
            </div>
          )}

          {/* Options (Radio Style) */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestionIdx] === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer select-none ${
                    isSelected 
                      ? 'bg-emerald-50/40 border-emerald-600 shadow-sm ring-1 ring-emerald-600/20' 
                      : 'bg-white border-slate-200 hover:border-slate-350'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                  <span className={`text-xs sm:text-sm font-bold text-slate-800 ${isSelected ? 'text-slate-950 font-extrabold' : ''}`}>
                    {opt.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nav Buttons */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-5">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIdx === 0}
              className={`px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1 select-none transition-all ${
                currentQuestionIdx === 0 
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'border-slate-250 text-slate-600 hover:bg-slate-55 hover:border-slate-350 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQuestionIdx === selectedAssessment.questions.length - 1 ? (
              <button
                onClick={submitQuiz}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs select-none transition-all active:scale-95 shadow-md shadow-emerald-50 cursor-pointer"
              >
                Submit Assessment
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-50 rounded-xl font-bold text-xs flex items-center gap-1 select-none transition-all cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Progress Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Progress</h3>
            
            {/* Dots */}
            <div className="flex flex-wrap gap-2 justify-center py-1">
              {selectedAssessment.questions.map((_, idx) => {
                const isCurrent = idx === currentQuestionIdx;
                const isAnswered = answers[idx] !== undefined;
                return (
                  <span 
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all ${
                      isCurrent ? 'bg-emerald-600 scale-125' :
                      isAnswered ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-slate-100'
                    }`}
                  />
                );
              })}
            </div>

            <div className="text-center">
              <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase">{percentComplete}% Complete</span>
            </div>
          </div>

          {/* Timer Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 text-center">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time Remaining</h3>
            <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <Clock className="w-6 h-6 text-emerald-600" />
              {formatTimer(timeRemaining)}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Stats</h3>
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Questions Answered:</span>
                <span className="font-extrabold text-slate-900">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-extrabold text-slate-900">{remainingCount}</span>
              </div>
            </div>

            <button
              onClick={submitQuiz}
              className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer select-none active:scale-95"
            >
              Submit Assessment
            </button>
          </div>

        </div>

      </div>
    );
  };

  // Result Summary Screen
  const renderResult = () => {
    if (!selectedAssessment) return null;
    const score = getScore();
    const total = selectedAssessment.questions.length;
    const accuracy = Math.round((score / total) * 100);
    const passed = accuracy >= 70;
    
    const timeSpentMinutes = Math.max(1, Math.round(timeSpentSeconds / 60));

    return (
      <div className="max-w-2xl mx-auto space-y-6 text-slate-800 animate-scale-in" id="assessment-result-screen">
        
        {/* Core Result Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Assessment Complete</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {passed 
                  ? `Congratulations! You passed the ${selectedAssessment.title} assessment.` 
                  : 'Study the concepts and explanations below, and try again.'}
              </p>
            </div>
          </div>

          {/* Key Metrics grid */}
          <div className="grid grid-cols-3 gap-4 border-t border-b border-slate-100 py-5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Score</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">{score} / {total}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Accuracy</span>
              <span className={`text-xl font-extrabold font-mono mt-1 block ${passed ? 'text-emerald-600' : 'text-orange-500'}`}>{accuracy}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Time Taken</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono mt-1 block">{timeSpentMinutes} {timeSpentMinutes === 1 ? 'Min' : 'Mins'}</span>
            </div>
          </div>

          {/* Strength Areas & Improvement Areas */}
          <div className="grid sm:grid-cols-2 gap-6 text-left pt-2">
            {/* Strength Areas */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Strength Areas</h4>
              <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-1.5 text-emerald-800">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Encapsulation
                </li>
                <li className="flex items-center gap-1.5 text-emerald-800">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Inheritance
                </li>
                <li className="flex items-center gap-1.5 text-emerald-800">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Polymorphism
                </li>
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Areas for Improvement</h4>
              <ul className="space-y-1.5 text-xs text-slate-650 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" /> Abstract Classes
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" /> Interfaces
                </li>
              </ul>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-4 justify-center">
            <button
              onClick={() => setView('review')}
              className="px-5 py-2.5 border border-slate-250 hover:border-slate-350 text-slate-750 font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
            >
              Review Answers
            </button>
            <button
              onClick={() => onNavigateTo?.('videos')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
            >
              Continue Learning
            </button>
            <button
              onClick={() => onNavigateTo?.('ide')}
              className="px-5 py-2.5 border border-slate-250 hover:border-slate-350 text-slate-750 font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
            >
              Practice in IDE
            </button>
          </div>
        </div>

        {/* Coding Challenge Unlock Integration */}
        {passed && (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 animate-pulse">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md uppercase font-mono">Coding Challenge Unlocked</span>
              <h3 className="text-sm font-extrabold text-slate-900 pt-1">Create Vehicle parent class and Car child class</h3>
              <p className="text-xs text-slate-500 leading-normal max-w-md">
                Demonstrate constructor invocation matching parameters and override displayInfo() logic directly.
              </p>
              <span className="text-[10px] text-emerald-700 font-bold font-mono uppercase block pt-0.5">Difficulty: Easy</span>
            </div>
            
            <button
              onClick={() => onNavigateTo?.('ide')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-100 transition-all cursor-pointer self-stretch sm:self-auto justify-center text-center shrink-0"
            >
              <Code2 className="w-4 h-4" /> Open Practice IDE
            </button>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => setView('dashboard')}
            className="text-xs text-slate-400 hover:text-slate-650 font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
          >
            ← Back to Assessment Dashboard
          </button>
        </div>

      </div>
    );
  };

  // Review Screen (detailed view of questions & answers with rationale)
  const renderReview = () => {
    if (!selectedAssessment) return null;

    return (
      <div className="max-w-3xl mx-auto space-y-6 text-slate-800 animate-fade-in" id="assessment-review-screen">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{selectedAssessment.title} Assessment</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Answer Review</h2>
          </div>
          
          <button
            onClick={() => setView('result')}
            className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold text-xs transition cursor-pointer select-none"
          >
            Back to Results
          </button>
        </div>

        <div className="space-y-6">
          {selectedAssessment.questions.map((q, qIdx) => {
            const userAnswerId = answers[qIdx];
            const isCorrect = userAnswerId === q.correctOptionId;

            return (
              <div 
                key={q.id} 
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Question {qIdx + 1}: {q.question}</h3>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded font-mono ${
                    isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                  }`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                {q.codeSnippet && (
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-sky-400 border border-slate-800 overflow-x-auto relative">
                    <pre className="leading-relaxed whitespace-pre">{q.codeSnippet}</pre>
                  </div>
                )}

                {/* Options list in review mode */}
                <div className="space-y-2">
                  {q.options.map(opt => {
                    const isSelected = userAnswerId === opt.id;
                    const isCorrectOption = opt.id === q.correctOptionId;

                    let rowStyle = 'border-slate-100 bg-slate-50/20 opacity-70';
                    if (isSelected) {
                      rowStyle = isCorrectOption 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-orange-300 bg-orange-50/20';
                    } else if (isCorrectOption) {
                      rowStyle = 'border-emerald-300 bg-emerald-50/10 font-medium';
                    }

                    return (
                      <div 
                        key={opt.id} 
                        className={`p-3.5 rounded-xl border text-xs sm:text-sm flex gap-3 items-start transition-all ${rowStyle}`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                          isCorrectOption ? 'bg-emerald-600 border-emerald-600 text-white' :
                          isSelected ? 'bg-orange-600 border-orange-600 text-white' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {opt.id}
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-800 font-semibold">{opt.text}</p>
                          
                          {/* Rationale feedback */}
                          {(isSelected || isCorrectOption) && (
                            <p className={`text-[11px] leading-relaxed mt-1 font-medium ${isCorrectOption ? 'text-emerald-700' : 'text-orange-700'}`}>
                              {opt.id === q.correctOptionId ? '✓ ' : '✗ '} {opt.rationale}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => setView('result')}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-md select-none"
          >
            Return to Summary Results
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="w-full" id="assessments-workspace">
      {view === 'dashboard' && renderDashboard()}
      {view === 'active' && renderActiveAssessment()}
      {view === 'result' && renderResult()}
      {view === 'review' && renderReview()}
    </div>
  );
}
