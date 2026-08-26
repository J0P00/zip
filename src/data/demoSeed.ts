import { AuthenticatedUser, MonitoringRequest, PendingSubmission, PracticeSubmission } from '../types';
import { CourseQuestion, OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from './oopCourse';
import { JAVA_SWING_ASSESSMENTS, JAVA_SWING_EXERCISES, JAVA_SWING_LESSONS, SwingLessonProgress, SwingQuizAttempt } from './javaSwingCourse';
import { PRACTICE_CHALLENGES } from './practiceChallenges';
import { LessonProgressSummary, StudentOopProgress, STUDENT_PROGRESS_KEY } from './studentProgress';

export const DEMO_STUDENT_EMAIL = 'dmitry@oophub.edu';
export const DEMO_STUDENT_ALT_EMAIL = 'student@oophub.edu';
export const DEMO_STUDENT_ID = 'STU-0001';
export const DEMO_STUDENT_NAME = 'Dmitry Vance (Alex Mercer)';

export const DEMO_TEACHER_EMAIL = 'elena@oophub.edu';
export const DEMO_TEACHER_ALT_EMAIL = 'teacher@oophub.edu';
export const DEMO_TEACHER_ID = 'TEA-0001';
export const DEMO_TEACHER_NAME = 'Dr. Elena Vance';

export const DEMO_ADMIN_EMAIL = 'jericokunn@gmail.com';
export const DEMO_ADMIN_ALT_EMAIL = 'admin@oophub.edu';
export const DEMO_ADMIN_ID = 'ADM-0001';
export const DEMO_ADMIN_NAME = 'Jerico Vance (Admin)';

export const DEMO_PASSWORD = 'password123';

const OOP_SAMPLE_SOLUTIONS: Record<string, string> = {
  practice_1: `public class Main {
    public static void main(String[] args) {
        Student student = new Student("Mia", 20);
        student.introduce();
    }
}

class Student {
    private String name;
    private int age;

    public Student(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void introduce() {
        System.out.println(name + " is " + age + " years old");
    }
}`,
  practice_2: `public class Main {
    public static void main(String[] args) {
        Book book = new Book("Clean Code", "Robert Martin");
        book.printInfo();
    }
}

class Book {
    private String title;
    private String author;

    public Book(String title, String author) {
        this.title = title;
        this.author = author;
    }

    public void printInfo() {
        System.out.println(title + " by " + author);
    }
}`,
  practice_3: `public class Main {
    public static void main(String[] args) {
        BankAccount account = new BankAccount(100);
        account.deposit(50);
        System.out.println(account.getBalance());
    }
}

class BankAccount {
    private double balance;

    public BankAccount(double initial) {
        this.balance = initial;
    }

    public void deposit(double amount) {
        if (amount > 0) {
            this.balance += amount;
        }
    }

    public double getBalance() {
        return this.balance;
    }
}`,
  practice_4: `public class Main {
    public static void main(String[] args) {
        Manager manager = new Manager("Nina", "Engineering");
        manager.printInfo();
    }
}

class Employee {
    protected String name;

    public Employee(String name) {
        this.name = name;
    }
}

class Manager extends Employee {
    private String department;

    public Manager(String name, String department) {
        super(name);
        this.department = department;
    }

    public void printInfo() {
        System.out.println(name + " manages " + department);
    }
}`,
  practice_5: `public class Main {
    public static void main(String[] args) {
        Notification n = new EmailNotification();
        n.send();
    }
}

class Notification {
    public void send() {
        System.out.println("Sending notification");
    }
}

class EmailNotification extends Notification {
    @Override
    public void send() {
        System.out.println("Sending email notification");
    }
}`,
  practice_6: `public class Main {
    public static void main(String[] args) {
        Shape shape = new Circle(3);
        System.out.printf("%.2f", shape.area());
    }
}

abstract class Shape {
    public abstract double area();
}

class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}`,
  practice_7: `public class Main {
    public static void main(String[] args) {
        Payable payable = new Invoice(750);
        System.out.println(payable.computePay());
    }
}

interface Payable {
    double computePay();
}

class Invoice implements Payable {
    private double amount;

    public Invoice(double amount) {
        this.amount = amount;
    }

    @Override
    public double computePay() {
        return this.amount;
    }
}`,
  practice_8: `public class Main {
    public static void main(String[] args) {
        SafeDivider.divide(10, 0);
    }
}

class SafeDivider {
    public static void divide(int a, int b) {
        try {
            int result = a / b;
            System.out.println(result);
        } catch (ArithmeticException e) {
            System.out.println("Cannot divide by zero");
        }
    }
}`,
  practice_9: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        NameRegistry registry = new NameRegistry();
        registry.add("Ana");
        registry.add("Ana");
        registry.add("Luis");
        System.out.println(registry.count());
    }
}

class NameRegistry {
    private Set<String> names = new HashSet<>();

    public void add(String name) {
        names.add(name);
    }

    public int count() {
        return names.size();
    }
}`,
  practice_10: `import java.io.*;

public class Main {
    public static void main(String[] args) {
        System.out.println(FileCounter.countLines("notes.txt"));
    }
}

class FileCounter {
    public static int countLines(String filename) {
        return 3;
    }
}`,
  practice_11: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Library library = new Library();
        library.add(new BookItem("OOP Basics"));
        library.checkout("OOP Basics");
        System.out.println(library.availableCount());
    }
}

class BookItem {
    private String title;
    private boolean checkedOut = false;

    public BookItem(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }

    public void setCheckedOut(boolean state) {
        this.checkedOut = state;
    }

    public boolean isCheckedOut() {
        return checkedOut;
    }
}

class Library {
    private List<BookItem> books = new ArrayList<>();

    public void add(BookItem book) {
        books.add(book);
    }

    public void checkout(String title) {
        for (BookItem book : books) {
            if (book.getTitle().equals(title)) {
                book.setCheckedOut(true);
            }
        }
    }

    public int availableCount() {
        int count = 0;
        for (BookItem book : books) {
            if (!book.isCheckedOut()) count++;
        }
        return count;
    }
}`
};

const SWING_SAMPLE_SOLUTIONS: Record<string, string> = {
  swing_exercise_1: `import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        JFrame frame = new JFrame("Swing Label");
        JLabel label = new JLabel("Welcome to Java Swing");
        frame.add(label);
        frame.setSize(350, 200);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
  swing_exercise_2: `import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        JPanel panel = new JPanel();
        JLabel label = new JLabel("Feedback:");
        JTextField textField = new JTextField(20);
        JTextArea textArea = new JTextArea(5, 20);
        panel.add(label);
        panel.add(textField);
        panel.add(textArea);
        JFrame frame = new JFrame("Input Form");
        frame.add(panel);
        frame.setSize(400, 300);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
  swing_exercise_3: `import javax.swing.*;
import java.awt.event.*;

public class Main {
    public static void main(String[] args) {
        JButton button = new JButton("Click Me");
        button.addActionListener(e -> {
            System.out.println("Button was clicked!");
        });
        JFrame frame = new JFrame("Action Listener");
        frame.add(button);
        frame.setSize(300, 200);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
  swing_exercise_4: `import javax.swing.*;
import java.awt.*;

public class Main {
    public static void main(String[] args) {
        JPanel panel = new JPanel();
        panel.setLayout(new GridLayout(2, 2));
        panel.add(new JButton("1"));
        panel.add(new JButton("2"));
        panel.add(new JButton("3"));
        panel.add(new JButton("4"));
        JFrame frame = new JFrame("Grid Layout Demo");
        frame.add(panel);
        frame.setSize(350, 350);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
  swing_exercise_5: `import javax.swing.JOptionPane;

public class Main {
    public static void main(String[] args) {
        String name = JOptionPane.showInputDialog(null, "Enter your name:");
        String ageStr = JOptionPane.showInputDialog(null, "Enter your age:");
        int age = Integer.parseInt(ageStr != null ? ageStr : "21");
        JOptionPane.showMessageDialog(null, "Hello " + name + "! You are " + age + " years old.");
    }
}`
};

export const seedDemoStudentProgress = () => {
  try {
    const timestamp = '2026-08-26T18:00:00.000Z';

    // 1. OOP Video Watch Progress (11/11 Lessons Complete)
    const oopVideoProgress: Record<string, { completed: boolean; completionPercentage: number; lastPosition: number }> = {};
    OOP_COURSE_LESSONS.forEach(lesson => {
      oopVideoProgress[lesson.id] = {
        completed: true,
        completionPercentage: 100,
        lastPosition: 900
      };
    });
    localStorage.setItem('oophub_oop_video_progress', JSON.stringify(oopVideoProgress));

    // 2. OOP Quiz Attempts (11/11 Assessments Passed 100%)
    const oopQuizAttempts: Record<string, any> = {};
    OOP_ASSESSMENTS.forEach(assessment => {
      const correctAnswersMap: Record<string, string> = {};
      assessment.questions.forEach((q: CourseQuestion) => {
        correctAnswersMap[q.id] = q.correctAnswer;
      });
      oopQuizAttempts[assessment.id] = {
        assessmentId: assessment.id,
        lessonId: assessment.lessonId,
        score: assessment.questions.length || 25,
        total: assessment.questions.length || 25,
        percentage: 100,
        correctAnswers: assessment.questions.length || 25,
        incorrectAnswers: 0,
        passed: true,
        attemptNumber: 1,
        answers: correctAnswersMap,
        dateCompleted: timestamp
      };
    });
    localStorage.setItem('oophub_oop_quiz_attempts', JSON.stringify(oopQuizAttempts));

    // 3. OOP Practice Submissions (11/11 Challenges Passed 100%)
    let existingPractice: Record<string, PracticeSubmission> = {};
    try {
      existingPractice = JSON.parse(localStorage.getItem('oophub_practice_submissions') || '{}');
    } catch {}

    const studentKeys = [DEMO_STUDENT_ID, DEMO_STUDENT_EMAIL, DEMO_STUDENT_ALT_EMAIL];
    const newPracticeSubmissions: Record<string, PracticeSubmission> = { ...existingPractice };
    const pendingSubmissionsList: PendingSubmission[] = [];

    PRACTICE_CHALLENGES.forEach(challenge => {
      const solution = OOP_SAMPLE_SOLUTIONS[challenge.id] || challenge.starterCode;
      const submissionId = `sub_${challenge.id}_demo`;

      studentKeys.forEach(sKey => {
        const key = `${sKey}:${challenge.id}`;
        newPracticeSubmissions[key] = {
          id: submissionId,
          studentId: DEMO_STUDENT_ID,
          studentEmail: DEMO_STUDENT_EMAIL,
          studentName: DEMO_STUDENT_NAME,
          section: 'CS-3A',
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          topicId: challenge.topicId,
          topicTitle: challenge.title,
          sourceCode: solution,
          compileStatus: 'success',
          runtime: 24,
          memoryUsage: 36,
          score: 100,
          programOutput: challenge.sampleOutput,
          errorMessage: '',
          testResults: challenge.testCases.map(tc => ({
            id: tc.id,
            isHidden: tc.isHidden,
            passed: true,
            expectedOutput: tc.expectedOutput,
            actualOutput: tc.expectedOutput,
            message: 'All test requirements satisfied.'
          })),
          submittedAt: timestamp,
          isLocked: true
        };
      });

      pendingSubmissionsList.push({
        id: submissionId,
        studentId: DEMO_STUDENT_ID,
        studentEmail: DEMO_STUDENT_EMAIL,
        studentName: DEMO_STUDENT_NAME,
        section: 'CS-3A',
        challengeName: challenge.title,
        submittedAt: 'Today',
        status: 'reviewed',
        code: solution,
        grade: 100,
        score: 100,
        topicId: challenge.topicId,
        topicTitle: challenge.title,
        compileStatus: 'success',
        runtime: 24,
        memoryUsage: 36,
        programOutput: challenge.sampleOutput,
        errorMessage: '',
        isLocked: true,
        testResults: challenge.testCases.map(tc => ({
          id: tc.id,
          isHidden: tc.isHidden,
          passed: true,
          expectedOutput: tc.expectedOutput,
          actualOutput: tc.expectedOutput,
          message: 'All test requirements satisfied.'
        })),
        feedback: 'Excellent implementation! Clean code structure and all unit constraints passed.'
      });
    });

    localStorage.setItem('oophub_practice_submissions', JSON.stringify(newPracticeSubmissions));
    localStorage.setItem('oophub_pending_submissions', JSON.stringify(pendingSubmissionsList));

    // 4. Java Swing Progress (5/5 Lessons Completed)
    const swingWatchDb: Record<string, SwingLessonProgress> = {};
    JAVA_SWING_LESSONS.forEach(lesson => {
      swingWatchDb[lesson.id] = {
        lessonId: lesson.id,
        contentCompleted: true,
        videoCompleted: true,
        completedAt: timestamp
      };
    });
    localStorage.setItem('oophub_swing_lesson_progress', JSON.stringify(swingWatchDb));

    // 5. Java Swing Quiz Attempts (5/5 Quizzes Passed 100%)
    const swingQuizDb: Record<string, SwingQuizAttempt> = {};
    const swingQuizHistory: SwingQuizAttempt[] = [];
    JAVA_SWING_ASSESSMENTS.forEach(assessment => {
      const answersMap: Record<string, string> = {};
      assessment.questions.forEach(q => {
        answersMap[q.id] = q.correctAnswer;
      });
      const attempt: SwingQuizAttempt = {
        assessmentId: assessment.id,
        lessonId: assessment.lessonId,
        score: assessment.questions.length || 10,
        total: assessment.questions.length || 10,
        percentage: 100,
        correctAnswers: assessment.questions.length || 10,
        incorrectAnswers: 0,
        passed: true,
        attemptNumber: 1,
        answers: answersMap,
        dateCompleted: timestamp
      };
      swingQuizDb[assessment.id] = attempt;
      swingQuizHistory.push(attempt);
    });
    localStorage.setItem('oophub_swing_quiz_attempts', JSON.stringify(swingQuizDb));
    localStorage.setItem('oophub_swing_quiz_history', JSON.stringify(swingQuizHistory));

    // 6. Java Swing Submissions (5/5 Exercises Submitted & Passed 100%)
    let existingSwingSubmissions: Record<string, PracticeSubmission> = {};
    try {
      existingSwingSubmissions = JSON.parse(localStorage.getItem('oophub_swing_submissions') || '{}');
    } catch {}

    const newSwingSubmissions: Record<string, PracticeSubmission> = { ...existingSwingSubmissions };
    JAVA_SWING_EXERCISES.forEach(exercise => {
      const solution = SWING_SAMPLE_SOLUTIONS[exercise.id] || exercise.starterCode;
      const submissionId = `swing_sub_${exercise.id}_demo`;

      studentKeys.forEach(sKey => {
        const key = `${sKey}:${exercise.id}`;
        newSwingSubmissions[key] = {
          id: submissionId,
          studentId: DEMO_STUDENT_ID,
          studentEmail: DEMO_STUDENT_EMAIL,
          studentName: DEMO_STUDENT_NAME,
          section: 'CS-3A',
          challengeId: exercise.id,
          challengeTitle: exercise.title,
          topicId: 'swing',
          topicTitle: exercise.title,
          sourceCode: solution,
          compileStatus: 'success',
          runtime: 28,
          memoryUsage: 42,
          score: 100,
          programOutput: exercise.sampleOutput,
          errorMessage: '',
          testResults: exercise.testCases.map(tc => ({
            id: tc.id,
            isHidden: tc.isHidden,
            passed: true,
            expectedOutput: tc.expectedOutput,
            actualOutput: tc.expectedOutput,
            message: 'Swing GUI test passed.'
          })),
          submittedAt: timestamp,
          isLocked: true
        };
      });
    });
    localStorage.setItem('oophub_swing_submissions', JSON.stringify(newSwingSubmissions));

    // 7. Student OOP Progress Overall Store (`oophub_student_oop_progress`)
    let progressDb: Record<string, StudentOopProgress> = {};
    try {
      progressDb = JSON.parse(localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}');
    } catch {}

    const lessonSummaries: LessonProgressSummary[] = OOP_COURSE_LESSONS.map((lesson, idx) => ({
      lessonId: lesson.id,
      sequence: lesson.sequence,
      title: lesson.title,
      lessonProgress: 100,
      videoPercent: 100,
      videoStatus: 'completed',
      videoCompleted: true,
      videoCompletedAt: timestamp,
      quizPercent: 100,
      quizStatus: 'passed',
      quizPassed: true,
      quizCompletedAt: timestamp,
      practiceScore: 100,
      practiceStatus: 'passed',
      practicePassed: true,
      practiceSubmittedAt: timestamp,
      practiceTaskId: `practice_${idx + 1}`,
      submissionId: `sub_practice_${idx + 1}_demo`
    }));

    const completeProgress: StudentOopProgress = {
      studentId: DEMO_STUDENT_ID,
      studentEmail: DEMO_STUDENT_EMAIL,
      studentName: DEMO_STUDENT_NAME,
      videoProgress: 100,
      quizScore: 100,
      practiceScore: 100,
      overallProgress: 100,
      completedLessons: 11,
      completedVideos: 11,
      passedQuizzes: 11,
      passedPractices: 11,
      status: 'Mastered',
      lastActivityAt: timestamp,
      lessons: lessonSummaries,
      realtime: [
        { id: 'swing-5-practice', label: 'JOptionPane Dialogs Practice IDE', status: 'Submitted', occurredAt: timestamp },
        { id: 'swing-5-quiz', label: 'JOptionPane Dialogs assessment', status: 'Passed', occurredAt: timestamp },
        { id: 'oop-11-practice', label: 'Enum Practice IDE', status: 'Submitted', occurredAt: timestamp },
        { id: 'oop-11-quiz', label: 'Enum assessment', status: 'Passed', occurredAt: timestamp },
        { id: 'oop-11-video', label: 'Enum video', status: 'Completed', occurredAt: timestamp }
      ],
      updatedAt: timestamp
    };

    progressDb[DEMO_STUDENT_ID] = completeProgress;
    progressDb[DEMO_STUDENT_EMAIL] = completeProgress;
    progressDb[DEMO_STUDENT_ALT_EMAIL] = completeProgress;
    localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(progressDb));

    // 8. Teacher Monitoring Request Connection
    let monitoringList: MonitoringRequest[] = [];
    try {
      monitoringList = JSON.parse(localStorage.getItem('oophub_monitoring_requests') || '[]');
    } catch {}

    const hasDemoConn = monitoringList.some(
      r => r.teacherEmail.toLowerCase() === DEMO_TEACHER_EMAIL && r.studentEmail.toLowerCase() === DEMO_STUDENT_EMAIL && r.status === 'accepted'
    );
    if (!hasDemoConn) {
      monitoringList.push({
        id: 'req_demo_teacher_student',
        teacherEmail: DEMO_TEACHER_EMAIL,
        teacherName: DEMO_TEACHER_NAME,
        studentEmail: DEMO_STUDENT_EMAIL,
        studentName: DEMO_STUDENT_NAME,
        studentId: DEMO_STUDENT_ID,
        status: 'accepted'
      });
      localStorage.setItem('oophub_monitoring_requests', JSON.stringify(monitoringList));
    }
  } catch (error) {
    console.warn('Demo student progress seeding encountered non-fatal error:', error);
  }
};

export const DEMO_AUTHENTICATED_USERS: Record<string, AuthenticatedUser> = {
  student: {
    id: DEMO_STUDENT_ID,
    userId: DEMO_STUDENT_ID,
    name: DEMO_STUDENT_NAME,
    email: DEMO_STUDENT_EMAIL,
    role: 'student',
    accountSource: 'demo',
    registrationDate: '2026-06-01T00:00:00.000Z',
    contactNumber: '+1 (555) 019-2834',
    address: '123 Academic Way, University Hills',
    dateOfBirth: '2005-04-12',
    accountStatus: 'Active',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    studentNumber: '2026-0001',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    section: 'CS-3A',
    programStatus: 'Regular',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  },
  teacher: {
    id: DEMO_TEACHER_ID,
    userId: DEMO_TEACHER_ID,
    name: DEMO_TEACHER_NAME,
    email: DEMO_TEACHER_EMAIL,
    role: 'teacher',
    accountSource: 'demo',
    registrationDate: '2026-06-01T00:00:00.000Z',
    contactNumber: '+1 (555) 083-9921',
    address: '456 Faculty Lane, Green Hills',
    dateOfBirth: '1985-09-22',
    accountStatus: 'Active',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    employeeId: 'EMP-0001',
    department: 'College of Computer Studies',
    specialization: 'Object-Oriented Programming',
    assignedCourses: 'OOP 101, Advanced Java, Software Architecture',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  },
  admin: {
    id: DEMO_ADMIN_ID,
    userId: DEMO_ADMIN_ID,
    name: DEMO_ADMIN_NAME,
    email: DEMO_ADMIN_EMAIL,
    role: 'admin',
    accountSource: 'demo',
    registrationDate: '2026-06-01T00:00:00.000Z',
    contactNumber: '+1 (555) 091-7723',
    address: 'System Ops HQ, Tech Park',
    dateOfBirth: '1990-01-15',
    accountStatus: 'Active',
    onlineStatus: 'online',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    adminId: DEMO_ADMIN_ID,
    systemRole: 'Super Admin',
    accessLevel: 'Level 5 - Full Access',
    termsAgreementAccepted: true,
    termsAcceptedAt: '2026-06-01T00:00:00.000Z',
    termsVersion: '2026.06.26'
  }
};
