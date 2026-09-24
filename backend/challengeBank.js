const { evaluateAdvancedJavaPractice } = require('./javaAstEvaluator');

const baseChallenges = [
  {
    id: 'practice_1',
    topicId: 'classes-objects',
    topicTitle: 'Classes and Objects',
    lessonId: 'oop_lesson_1',
    assessmentId: 'oop_assessment_1',
    title: 'Create a Student object',
    description: 'Build a Student class with name, age, and an introduce() method.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Student student = new Student("Mia", 20);
        student.introduce();
    }
}

// Add the Student class below this line.
`,
    sampleInput: '',
    sampleOutput: 'Mia is 20 years old',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_student_class',
        name: 'Student Class',
        description: 'Define a custom Student class.',
        check: (ast) => ast.classes.some(c => c.name === 'Student' && !c.isInterface),
        failureMessage: 'Required "Student" class was not detected in AST.'
      },
      {
        id: 'req_student_fields',
        name: 'Student Fields (name, age)',
        description: 'Student class must declare name and age fields.',
        check: (ast) => {
          const student = ast.classes.find(c => c.name === 'Student');
          if (!student) return false;
          const hasName = student.fields.some(f => f.name.toLowerCase().includes('name'));
          const hasAge = student.fields.some(f => f.name.toLowerCase().includes('age'));
          return hasName && hasAge;
        },
        failureMessage: 'Student class must declare name and age fields.'
      },
      {
        id: 'req_student_method',
        name: 'introduce() Method',
        description: 'Student class must define an introduce() method.',
        check: (ast) => {
          const student = ast.classes.find(c => c.name === 'Student');
          return student && student.methods.some(m => m.name === 'introduce');
        },
        failureMessage: 'Student class must define an introduce() method.'
      },
      {
        id: 'req_student_instantiation',
        name: 'Student Object Creation',
        description: 'Create an instance of the Student class using new Student(...).',
        check: (ast) => ast.instantiations.some(i => i.className === 'Student'),
        failureMessage: 'Must instantiate a Student object using new Student(...).'
      },
      {
        id: 'req_introduce_call',
        name: 'introduce() Invocation',
        description: 'Invoke the introduce() method on the student object.',
        check: (ast) => ast.methodInvocations.some(inv => inv.includes('introduce')),
        failureMessage: 'Must invoke the introduce() method on the created Student object.'
      }
    ],
    testCases: [
      { id: 'classes_sample_output', input: '', expectedOutput: 'Mia is 20 years old', isHidden: false },
      { id: 'classes_hidden_format', input: '', expectedOutput: 'Mia is 20 years old', isHidden: true, matcher: 'Student\\s+student' },
      { id: 'classes_hidden_method', input: '', expectedOutput: 'Mia is 20 years old', isHidden: true, matcher: 'student\\.introduce' }
    ]
  },
  {
    id: 'practice_2',
    topicId: 'constructors',
    topicTitle: 'Constructors',
    lessonId: 'oop_lesson_2',
    assessmentId: 'oop_assessment_2',
    title: 'Initialize a Book',
    description: 'Use a parameterized constructor to initialize title and author fields.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Book book = new Book("Clean Code", "Robert Martin");
        book.printInfo();
    }
}

// Add the Book class below this line.
`,
    sampleInput: '',
    sampleOutput: 'Clean Code by Robert Martin',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_book_class',
        name: 'Book Class',
        description: 'Define a Book class.',
        check: (ast) => ast.classes.some(c => c.name === 'Book'),
        failureMessage: 'Required "Book" class was not detected.'
      },
      {
        id: 'req_book_constructor',
        name: 'Parameterized Constructor',
        description: 'Book class must define a constructor that initializes title and author.',
        check: (ast) => {
          const book = ast.classes.find(c => c.name === 'Book');
          return book && book.constructors.some(con => con.parameters.length >= 2 || con.usesThis);
        },
        failureMessage: 'Book class must declare a parameterized constructor initializing its fields.'
      },
      {
        id: 'req_book_instantiation',
        name: 'Book Object Instantiation',
        description: 'Instantiate a Book object with new Book(...).',
        check: (ast) => ast.instantiations.some(i => i.className === 'Book'),
        failureMessage: 'Must instantiate a Book object using new Book(...).'
      }
    ],
    testCases: [
      { id: 'constructors_sample_output', input: '', expectedOutput: 'Clean Code by Robert Martin', isHidden: false },
      { id: 'constructors_hidden_ctor', input: '', expectedOutput: 'Clean Code by Robert Martin', isHidden: true, matcher: 'new\\s+Book' }
    ]
  },
  {
    id: 'practice_3',
    topicId: 'encapsulation',
    topicTitle: 'Encapsulation',
    lessonId: 'oop_lesson_4',
    assessmentId: 'oop_assessment_4',
    title: 'Protect BankAccount balance',
    description: 'Keep balance private and expose validated deposit plus getBalance methods.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        BankAccount account = new BankAccount(100);
        account.deposit(50);
        System.out.println(account.getBalance());
    }
}

// Add the BankAccount class below this line.
`,
    sampleInput: '',
    sampleOutput: '150.0',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_bank_class',
        name: 'BankAccount Class',
        description: 'Define a BankAccount class.',
        check: (ast) => ast.classes.some(c => c.name === 'BankAccount'),
        failureMessage: 'Required "BankAccount" class was not detected.'
      },
      {
        id: 'req_private_balance',
        name: 'Private Encapsulated Field',
        description: 'Balance field must be marked private.',
        check: (ast) => {
          const acct = ast.classes.find(c => c.name === 'BankAccount');
          return acct && acct.fields.some(f => f.name.toLowerCase().includes('balance') && f.isPrivate);
        },
        failureMessage: 'Encapsulation violation: balance field must be declared with private access modifier.'
      },
      {
        id: 'req_deposit_method',
        name: 'deposit() and getBalance() Methods',
        description: 'Provide public getter and mutator methods.',
        check: (ast) => {
          const acct = ast.classes.find(c => c.name === 'BankAccount');
          return acct && acct.methods.some(m => m.name === 'deposit') && acct.methods.some(m => m.name === 'getBalance');
        },
        failureMessage: 'BankAccount class must declare deposit() and getBalance() accessor/mutator methods.'
      }
    ],
    testCases: [
      { id: 'encapsulation_sample_output', input: '', expectedOutput: '150.0', isHidden: false },
      { id: 'encapsulation_hidden_private', input: '', expectedOutput: '150.0', isHidden: true, matcher: 'private\\s+double\\s+balance' }
    ]
  },
  {
    id: 'practice_4',
    topicId: 'inheritance',
    topicTitle: 'Inheritance',
    lessonId: 'oop_lesson_6',
    assessmentId: 'oop_assessment_6',
    title: 'Extend Employee into Manager',
    description: 'Model an is-a relationship using extends and reuse the parent constructor.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Manager manager = new Manager("Nina", "Engineering");
        manager.printInfo();
    }
}

// Add the Employee and Manager classes below this line.
`,
    sampleInput: '',
    sampleOutput: 'Nina manages Engineering',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_manager_class',
        name: 'Manager Class with Extends',
        description: 'Manager class must extend Employee.',
        check: (ast) => {
          const mgr = ast.classes.find(c => c.name === 'Manager');
          return mgr && mgr.extends && mgr.extends.includes('Employee');
        },
        failureMessage: 'Inheritance requirement: Manager class must inherit from Employee using "extends Employee".'
      },
      {
        id: 'req_employee_parent',
        name: 'Employee Parent Class',
        description: 'Define Employee parent class.',
        check: (ast) => ast.classes.some(c => c.name === 'Employee'),
        failureMessage: 'Parent class "Employee" was not detected.'
      }
    ],
    testCases: [
      { id: 'inheritance_sample_output', input: '', expectedOutput: 'Nina manages Engineering', isHidden: false },
      { id: 'inheritance_hidden_extends', input: '', expectedOutput: 'Nina manages Engineering', isHidden: true, matcher: 'extends\\s+Employee' }
    ]
  },
  {
    id: 'practice_5',
    topicId: 'polymorphism',
    topicTitle: 'Polymorphism',
    lessonId: 'oop_lesson_7',
    assessmentId: 'oop_assessment_7',
    title: 'Override notification sending',
    description: 'Override send() in subclass and invoke through parent reference.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Notification n = new EmailNotification();
        n.send();
    }
}

// Add Notification and EmailNotification classes below.
`,
    sampleInput: '',
    sampleOutput: 'Sending email notification',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_poly_classes',
        name: 'Notification and EmailNotification Classes',
        description: 'EmailNotification must extend Notification.',
        check: (ast) => {
          const emailNotif = ast.classes.find(c => c.name === 'EmailNotification');
          return emailNotif && emailNotif.extends && emailNotif.extends.includes('Notification');
        },
        failureMessage: 'Polymorphism requirement: EmailNotification must extend Notification.'
      },
      {
        id: 'req_poly_override',
        name: 'Overridden send() Method',
        description: 'EmailNotification must override the send() method.',
        check: (ast) => {
          const emailNotif = ast.classes.find(c => c.name === 'EmailNotification');
          return emailNotif && emailNotif.methods.some(m => m.name === 'send');
        },
        failureMessage: 'EmailNotification must override the send() method.'
      }
    ],
    testCases: [
      { id: 'poly_sample_output', input: '', expectedOutput: 'Sending email notification', isHidden: false },
      { id: 'poly_hidden_override', input: '', expectedOutput: 'Sending email notification', isHidden: true, matcher: 'void\\s+send' }
    ]
  },
  {
    id: 'practice_6',
    topicId: 'abstraction',
    topicTitle: 'Abstraction',
    lessonId: 'oop_lesson_8',
    assessmentId: 'oop_assessment_8',
    title: 'Implement an abstract shape',
    description: 'Create an abstract Shape and a Circle implementation that computes area.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Shape shape = new Circle(3);
        System.out.printf("%.2f", shape.area());
    }
}

// Add abstract Shape and Circle classes below.
`,
    sampleInput: '',
    sampleOutput: '28.27',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_abstract_shape',
        name: 'Abstract Shape Class',
        description: 'Declare an abstract class Shape with an abstract area() method.',
        check: (ast) => {
          const shape = ast.classes.find(c => c.name === 'Shape');
          return shape && (shape.isAbstract || shape.methods.some(m => m.isAbstract || m.name === 'area'));
        },
        failureMessage: 'Abstraction requirement: Shape must be an abstract class defining an abstract area() method.'
      },
      {
        id: 'req_circle_concrete',
        name: 'Concrete Circle Subclass',
        description: 'Circle class must extend Shape and implement area().',
        check: (ast) => {
          const circle = ast.classes.find(c => c.name === 'Circle');
          return circle && circle.extends && circle.extends.includes('Shape') && circle.methods.some(m => m.name === 'area');
        },
        failureMessage: 'Circle class must extend Shape and provide concrete area() implementation.'
      }
    ],
    testCases: [
      { id: 'abs_sample_output', input: '', expectedOutput: '28.27', isHidden: false },
      { id: 'abs_hidden_abstract', input: '', expectedOutput: '28.27', isHidden: true, matcher: 'abstract\\s+(class\\s+Shape|double\\s+area)' }
    ]
  },
  {
    id: 'practice_7',
    topicId: 'interfaces',
    topicTitle: 'Interfaces',
    lessonId: 'oop_lesson_9',
    assessmentId: 'oop_assessment_9',
    title: 'Implement Payable',
    description: 'Define a Payable interface and implement it in Invoice.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Payable payable = new Invoice(750);
        System.out.println(payable.computePay());
    }
}

// Add Payable interface and Invoice class below.
`,
    sampleInput: '',
    sampleOutput: '750.0',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_payable_interface',
        name: 'Payable Interface',
        description: 'Declare a Payable interface with computePay() method.',
        check: (ast) => ast.interfaces.some(i => i.name === 'Payable'),
        failureMessage: 'Interface requirement: Define an "interface Payable" with computePay() method.'
      },
      {
        id: 'req_invoice_implements',
        name: 'Invoice Implements Payable',
        description: 'Invoice class must implement Payable.',
        check: (ast) => {
          const inv = ast.classes.find(c => c.name === 'Invoice');
          return inv && inv.implements.some(iface => iface.includes('Payable'));
        },
        failureMessage: 'Invoice class must implement Payable interface using "implements Payable".'
      }
    ],
    testCases: [
      { id: 'iface_sample_output', input: '', expectedOutput: '750.0', isHidden: false },
      { id: 'iface_hidden_implements', input: '', expectedOutput: '750.0', isHidden: true, matcher: 'implements\\s+Payable' }
    ]
  },
  {
    id: 'practice_8',
    topicId: 'exception-handling',
    topicTitle: 'Exception Handling',
    lessonId: 'oop_lesson_10',
    assessmentId: 'oop_assessment_10',
    title: 'Validate division safely',
    description: 'Catch arithmetic errors and print a friendly message instead of crashing.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        SafeDivider.divide(10, 0);
    }
}

// Add SafeDivider class below.
`,
    sampleInput: '',
    sampleOutput: 'Cannot divide by zero',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_safedivider_class',
        name: 'SafeDivider Class',
        description: 'Define SafeDivider class.',
        check: (ast) => ast.classes.some(c => c.name === 'SafeDivider'),
        failureMessage: 'SafeDivider class was not detected.'
      },
      {
        id: 'req_try_catch',
        name: 'Try-Catch Block',
        description: 'Use a try-catch block to handle division by zero safely.',
        check: (ast) => ast.tryCatchBlocks.length > 0,
        failureMessage: 'Exception handling requirement: Implement a try-catch block to handle division exceptions safely.'
      }
    ],
    testCases: [
      { id: 'exc_sample_output', input: '', expectedOutput: 'Cannot divide by zero', isHidden: false },
      { id: 'exc_hidden_catch', input: '', expectedOutput: 'Cannot divide by zero', isHidden: true, matcher: 'catch\\s*\\(' }
    ]
  },
  {
    id: 'practice_9',
    topicId: 'collections',
    topicTitle: 'Collections',
    lessonId: 'oop_lesson_10',
    assessmentId: 'oop_assessment_10',
    title: 'Track unique names',
    description: 'Use a collection to store names and print the unique count.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        NameRegistry registry = new NameRegistry();
        registry.add("Ana");
        registry.add("Ana");
        registry.add("Luis");
        System.out.println(registry.count());
    }
}

// Add NameRegistry class below.
`,
    sampleInput: '',
    sampleOutput: '2',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_registry_class',
        name: 'NameRegistry Class',
        description: 'Define NameRegistry class with add and count methods.',
        check: (ast) => {
          const reg = ast.classes.find(c => c.name === 'NameRegistry');
          return reg && reg.methods.some(m => m.name === 'add') && reg.methods.some(m => m.name === 'count');
        },
        failureMessage: 'NameRegistry class must define add(String) and count() methods.'
      }
    ],
    testCases: [
      { id: 'coll_sample_output', input: '', expectedOutput: '2', isHidden: false },
      { id: 'coll_hidden_count', input: '', expectedOutput: '2', isHidden: true, matcher: 'count\\s*\\(' }
    ]
  },
  {
    id: 'practice_10',
    topicId: 'file-handling',
    topicTitle: 'File Handling',
    lessonId: 'oop_lesson_11',
    assessmentId: 'oop_assessment_11',
    title: 'Read simple file content',
    description: 'Use Java file APIs to read text and print the number of lines.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println(FileCounter.countLines("notes.txt"));
    }
}

// Add FileCounter class below.
`,
    sampleInput: '',
    sampleOutput: '3',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_filecounter_class',
        name: 'FileCounter Class',
        description: 'Define FileCounter class with countLines method.',
        check: (ast) => {
          const fc = ast.classes.find(c => c.name === 'FileCounter');
          return fc && fc.methods.some(m => m.name === 'countLines');
        },
        failureMessage: 'FileCounter class must define a countLines method.'
      }
    ],
    testCases: [
      { id: 'file_sample_output', input: '', expectedOutput: '3', isHidden: false },
      { id: 'file_hidden_count', input: '', expectedOutput: '3', isHidden: true, matcher: 'countLines' }
    ]
  },
  {
    id: 'practice_11',
    topicId: 'mini-oop-project',
    topicTitle: 'Mini OOP Project',
    lessonId: 'oop_lesson_11',
    assessmentId: 'oop_assessment_11',
    title: 'Mini library checkout',
    description: 'Combine classes, encapsulation, inheritance, and collections in a small library model.',
    starterCode: `public class Main {
    public static void main(String[] args) {
        Library library = new Library();
        library.add(new BookItem("OOP Basics"));
        library.checkout("OOP Basics");
        System.out.println(library.availableCount());
    }
}

// Add BookItem and Library classes below.
`,
    sampleInput: '',
    sampleOutput: '0',
    passingScore: 70,
    rubric: {
      compilation: 10,
      oopStructure: 40,
      behavioral: 30,
      hidden: 20
    },
    oopRequirements: [
      {
        id: 'req_library_classes',
        name: 'Library and BookItem Classes',
        description: 'Define Library and BookItem classes.',
        check: (ast) => ast.classes.some(c => c.name === 'Library') && ast.classes.some(c => c.name === 'BookItem'),
        failureMessage: 'Mini project requires both Library and BookItem classes.'
      },
      {
        id: 'req_library_methods',
        name: 'Library Methods (add, checkout, availableCount)',
        description: 'Library must provide add, checkout, and availableCount methods.',
        check: (ast) => {
          const lib = ast.classes.find(c => c.name === 'Library');
          return lib && lib.methods.some(m => m.name === 'add') && lib.methods.some(m => m.name === 'checkout') && lib.methods.some(m => m.name === 'availableCount');
        },
        failureMessage: 'Library must define add(BookItem), checkout(String), and availableCount() methods.'
      }
    ],
    testCases: [
      { id: 'mini_sample_output', input: '', expectedOutput: '0', isHidden: false },
      { id: 'mini_hidden_checkout', input: '', expectedOutput: '0', isHidden: true, matcher: 'checkout' }
    ]
  }
];

const PRACTICE_CHALLENGES = baseChallenges.map((item) => {
  return {
    ...item,
    learningObjectives: [
      `Apply ${item.topicTitle} in a structured Java OOP program.`,
      'Follow object-oriented design principles including classes, encapsulation, and methods.',
      'Produce deterministic console output satisfying all test cases.'
    ],
    requirements: [
      `Use Java object-oriented syntax directly related to ${item.topicTitle}.`,
      `Print exactly: ${item.sampleOutput}`,
      'Keep the main class named Main and define required OOP classes/interfaces.'
    ],
    createdAt: '2026-07-15T00:00:00.000Z'
  };
});

const evaluateChallenge = (challenge, sourceCode, includeHidden = false) => {
  return evaluateAdvancedJavaPractice(challenge, sourceCode, includeHidden);
};

module.exports = {
  PRACTICE_CHALLENGES,
  evaluateChallenge
};
