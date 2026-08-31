import { ChallengeTestResult, ProgrammingChallenge } from '../types';
import { CourseQuestion, getStoredJson, getUserStorageKey, OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from './oopCourse';
import { SWING_QUESTION_BANKS } from './javaSwingQuestions';

export const SWING_WATCH_KEY = 'oophub_swing_lesson_progress';
export const SWING_QUIZ_KEY = 'oophub_swing_quiz_attempts';
export const SWING_DRAFT_KEY = 'oophub_swing_practice_drafts';
export const SWING_SUBMISSION_KEY = 'oophub_swing_submissions';
export const SWING_PASSING_PERCENTAGE = 80;

export const getSwingStorageKeys = (user?: { id?: string; userId?: string; email?: string } | null) => ({
  watch: getUserStorageKey(SWING_WATCH_KEY, user),
  quiz: getUserStorageKey(SWING_QUIZ_KEY, user),
  draft: getUserStorageKey(SWING_DRAFT_KEY, user),
  submission: getUserStorageKey(SWING_SUBMISSION_KEY, user),
  quizHistory: getUserStorageKey('oophub_swing_quiz_history', user)
});

export interface SwingLesson {
  id: string;
  sequence: number;
  title: string;
  topics: string[];
  objectives: string[];
  introduction: string;
  content: string[];
  diagram: { label: string; detail: string }[];
  codeExample: string;
  bestPractices: string[];
  summary: string;
  keyTakeaways: string[];
}

export interface SwingVideo {
  id: string;
  lessonId: string;
  title: string;
  duration: string;
  description: string;
  embedUrl: string;
}

export interface SwingQuizAttempt {
  assessmentId: string;
  lessonId: string;
  score: number;
  total: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  passed: boolean;
  attemptNumber: number;
  answers: Record<string, string>;
  dateCompleted: string;
}

export interface SwingLessonProgress {
  lessonId: string;
  contentCompleted: boolean;
  videoCompleted: boolean;
  completedAt?: string;
}

export type SwingProgressDb = Record<string, SwingLessonProgress>;
export type SwingQuizDb = Record<string, SwingQuizAttempt>;

export const JAVA_SWING_LESSONS: SwingLesson[] = [
  {
    id: 'swing_lesson_1',
    sequence: 1,
    title: 'Creating a Simple Window (JFrame)',
    topics: ['JFrame', 'Importing Swing', 'extends JFrame', 'setTitle()', 'setSize()', 'setVisible()', 'setDefaultCloseOperation()'],
    objectives: [
      'Understand what GUI and Java Swing are.',
      'Import the javax.swing package.',
      'Create and configure a basic JFrame window with a title, size, and close operation.'
    ],
    introduction: 'JFrame is the fundamental component in Java Swing used to create a main application window.',
    content: [
      'A graphical user interface (GUI) allows users to interact with programs visually.',
      'To build a window in Swing, we import javax.swing.JFrame and write a class that extends JFrame.',
      'Inside the class constructor, we configure the window properties like setTitle(), setSize(), setDefaultCloseOperation(EXIT_ON_CLOSE), and setVisible(true).'
    ],
    diagram: [
      { label: 'Import', detail: 'import javax.swing.JFrame' },
      { label: 'Inherit', detail: 'extends JFrame' },
      { label: 'Configure', detail: 'setSize(), setTitle()' },
      { label: 'Show', detail: 'setVisible(true)' }
    ],
    codeExample: `import javax.swing.JFrame;

public class Tutorial extends JFrame {
    public Tutorial() {
        setTitle("My First Window");
        setSize(400, 400);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setVisible(true);
    }
    public static void main(String[] args) {
        new Tutorial();
    }
}`,
    bestPractices: [
      'Always set setDefaultCloseOperation(EXIT_ON_CLOSE) so the program terminates fully when closed.',
      'Set the visibility of the window at the very end of the configuration steps.',
      'Use a constructor to initialize and set up your GUI window.'
    ],
    summary: 'Building a simple window involves extending JFrame, setting properties in a constructor, and calling setVisible(true).',
    keyTakeaways: ['JFrame creates windows.', 'setSize() configures dimensions.', 'setVisible(true) makes the window appear.']
  },
  {
    id: 'swing_lesson_2',
    sequence: 2,
    title: 'JLabel, JTextField, & JTextArea',
    topics: ['JLabel', 'JTextField', 'JTextArea', 'JPanel', 'add() method'],
    objectives: [
      'Display non-editable text using JLabel.',
      'Accept single-line input using JTextField.',
      'Accept multi-line input using JTextArea.',
      'Organize text components using a JPanel container.'
    ],
    introduction: 'Swing provides components to display text and accept text input from the user.',
    content: [
      'JLabel is used to display static, non-editable text or messages on the screen.',
      'JTextField is a single-line input field, and JTextArea is a multi-line input box suitable for paragraphs.',
      'These components are typically grouped in a JPanel container using the add() method before being added to the main JFrame.'
    ],
    diagram: [
      { label: 'JLabel', detail: 'Displays text/messages' },
      { label: 'JTextField', detail: 'Single-line text input' },
      { label: 'JTextArea', detail: 'Multi-line text input' },
      { label: 'JPanel', detail: 'Holds and groups them' }
    ],
    codeExample: `import javax.swing.*;

public class TextDemo extends JFrame {
    public TextDemo() {
        JPanel panel = new JPanel();
        JLabel label = new JLabel("Enter name:");
        JTextField textField = new JTextField(20);
        JTextArea textArea = new JTextArea(5, 20);
        
        panel.add(label);
        panel.add(textField);
        panel.add(textArea);
        add(panel);
        
        setSize(300, 200);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setVisible(true);
    }
}`,
    bestPractices: [
      'Use JTextField for short single-line inputs like names or emails.',
      'Use JTextArea for long inputs and specify the rows and columns (e.g., 5 rows, 20 columns).',
      'Always add controls to a panel first to organize the layout.'
    ],
    summary: 'Displaying and inputting text is accomplished using JLabel, JTextField, JTextArea, and JPanel.',
    keyTakeaways: ['JLabel shows text.', 'JTextField is for single-line input.', 'JTextArea is for multi-line paragraphs.']
  },
  {
    id: 'swing_lesson_3',
    sequence: 3,
    title: 'JButton & ActionListener',
    topics: ['JButton', 'ActionListener', 'addActionListener()', 'actionPerformed', 'Event Handling'],
    objectives: [
      'Create interactive buttons with JButton.',
      'Register event listeners using addActionListener().',
      'Implement response logic when a button is clicked using lambdas.'
    ],
    introduction: 'JButton and ActionListener are used to make Java Swing applications interactive by responding to clicks.',
    content: [
      'JButton creates a clickable button that triggers a command when clicked.',
      'An ActionListener is registered using addActionListener() to detect and respond to these click events.',
      'We write the response code inside the action handler, often using a Java lambda expression for concise code.'
    ],
    diagram: [
      { label: 'JButton', detail: 'Creates clickable button' },
      { label: 'Listener', detail: 'addActionListener()' },
      { label: 'Event', detail: 'Triggered on button click' },
      { label: 'Action', detail: 'Runs inside lambda callback' }
    ],
    codeExample: `import javax.swing.*;

public class ClickDemo extends JFrame {
    public ClickDemo() {
        JPanel panel = new JPanel();
        JButton button = new JButton("Click Me");
        JLabel label = new JLabel("Waiting...");
        
        button.addActionListener(e -> {
            label.setText("Button was clicked!");
            System.out.println("Button clicked!");
        });
        
        panel.add(button);
        panel.add(label);
        add(panel);
        
        setSize(300, 150);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setVisible(true);
    }
}`,
    bestPractices: [
      'Provide clear, action-oriented text labels on your buttons.',
      'Use lambda expressions `e -> { ... }` for concise and readable event handlers.',
      'Keep event handler methods short by delegating heavy tasks.'
    ],
    summary: 'Make interfaces interactive by creating JButtons, attaching ActionListeners, and implementing click logic.',
    keyTakeaways: ['JButton represents commands.', 'ActionListener detects click events.', 'Lambdas implement action logic.']
  },
  {
    id: 'swing_lesson_4',
    sequence: 4,
    title: 'JPanel & Layout Managers',
    topics: ['JPanel', 'Layout Managers', 'FlowLayout', 'BorderLayout', 'GridLayout'],
    objectives: [
      'Group GUI components together using JPanel.',
      'Arrange components in left-to-right rows using FlowLayout.',
      'Arrange components in five specific regions using BorderLayout.',
      'Arrange components in rows and columns using GridLayout.'
    ],
    introduction: 'Layout managers control the positioning and resizing behavior of components inside panels and frames.',
    content: [
      'JPanel is a lightweight container used to group components. It uses FlowLayout by default.',
      'BorderLayout divides a panel into five areas: North, South, East, West, and Center. Center usually holds the main expanding component.',
      'GridLayout places components in a table-like grid of equal-sized rows and columns.'
    ],
    diagram: [
      { label: 'FlowLayout', detail: 'Left-to-right rows' },
      { label: 'BorderLayout', detail: '5 areas (N, S, E, W, C)' },
      { label: 'GridLayout', detail: 'Rows and columns grid' },
      { label: 'Nesting', detail: 'Combine panels for complex designs' }
    ],
    codeExample: `import javax.swing.*;
import java.awt.*;

public class LayoutDemo extends JFrame {
    public LayoutDemo() {
        JPanel mainPanel = new JPanel(new BorderLayout());
        JPanel topPanel = new JPanel(new FlowLayout());
        JPanel gridPanel = new JPanel(new GridLayout(2, 2));
        
        gridPanel.add(new JButton("1"));
        gridPanel.add(new JButton("2"));
        gridPanel.add(new JButton("3"));
        gridPanel.add(new JButton("4"));
        
        topPanel.add(new JLabel("Control Panel"));
        
        mainPanel.add(topPanel, BorderLayout.NORTH);
        mainPanel.add(gridPanel, BorderLayout.CENTER);
        add(mainPanel);
        
        setSize(400, 300);
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setVisible(true);
    }
}`,
    bestPractices: [
      'Avoid hardcoding component positions; let Layout Managers handle responsiveness.',
      'Nest multiple JPanels with different layouts to build complex screen layouts.',
      'Remember that JPanel uses FlowLayout by default, while JFrame uses BorderLayout.'
    ],
    summary: 'JPanel and Layout Managers (FlowLayout, BorderLayout, GridLayout) handle responsive arrangement of controls.',
    keyTakeaways: ['FlowLayout arranges left-to-right.', 'BorderLayout utilizes five regions.', 'GridLayout structures uniform cells.']
  },
  {
    id: 'swing_lesson_5',
    sequence: 5,
    title: 'JOptionPane Dialogs',
    topics: ['JOptionPane', 'showMessageDialog()', 'showInputDialog()', 'showConfirmDialog()', 'Integer.parseInt()', '\\n Escape Sequence'],
    objectives: [
      'Show informational dialogs with showMessageDialog().',
      'Prompt user inputs with showInputDialog().',
      'Collect confirmation selections with showConfirmDialog().',
      'Convert and parse dialog text inputs into integers.',
      'Format multi-line dialog content with the newline escape sequence.'
    ],
    introduction: 'JOptionPane provides simple, pre-built dialog boxes for displaying messages, prompting inputs, and getting confirmations.',
    content: [
      'JOptionPane is a helper class for quickly opening small popup windows.',
      'showMessageDialog() displays information, showInputDialog() prompts for a text input (returning a String), and showConfirmDialog() asks for confirmation.',
      'To use inputs for arithmetic, convert the string using Integer.parseInt(). Use the \\n escape sequence to print text on a new line.'
    ],
    diagram: [
      { label: 'Message Dialog', detail: 'Displays an alert or info' },
      { label: 'Input Dialog', detail: 'Prompts input string' },
      { label: 'Confirm Dialog', detail: 'Collects Yes/No choice' },
      { label: 'String parsing', detail: 'Integer.parseInt()' }
    ],
    codeExample: `import javax.swing.JOptionPane;
 
public class DialogDemo {
    public static void main(String[] args) {
        JOptionPane.showMessageDialog(null, "Welcome to Java Swing!");
        String name = JOptionPane.showInputDialog(null, "Enter your name:");
        String ageStr = JOptionPane.showInputDialog(null, "Enter age:");
         
        int age = Integer.parseInt(ageStr);
        int confirm = JOptionPane.showConfirmDialog(null, "Save information?", "Confirm", JOptionPane.YES_NO_OPTION);
         
        if (confirm == JOptionPane.YES_OPTION) {
            JOptionPane.showMessageDialog(null, "Name: " + name + "\\nAge: " + age, "Saved", JOptionPane.INFORMATION_MESSAGE);
        }
    }
}`,
    bestPractices: [
      'Pass null as the first argument to center the dialog on the computer screen.',
      'Validate dialog inputs before trying to parse them to prevent runtime NumberFormatExceptions.',
      'Use YES_NO_OPTION in confirmation dialogs to explicitly ask for simple user confirmation.'
    ],
    summary: 'JOptionPane is used to show popups: showMessageDialog() for notifications, showInputDialog() for text inputs, and showConfirmDialog() for questions.',
    keyTakeaways: ['JOptionPane displays simple popups.', 'showInputDialog() returns text input.', 'Integer.parseInt() converts text to numbers.']
 },
 {
   id: 'swing_lesson_6',
   sequence: 6,
   title: 'JComboBox and List Selection',
   topics: ['JComboBox', 'DefaultComboBoxModel', 'JList', 'Selection event', 'User choice'],
   objectives: ['Create dropdown selections with JComboBox.', 'Display options in a list with JList.', 'Handle user-selected values.'],
   introduction: 'Selection components help users choose one or more valid options from a predefined list.',
   content: ['Dropdown lists and list boxes are common in dashboards and forms.', 'JComboBox stores a list of options and exposes the selected value.', 'JList is useful when users need to view multiple entries and choose one or more.'],
   diagram: [{ label: 'Selection', detail: 'User chooses from a list' }, { label: 'Store', detail: 'Model contains values' }, { label: 'Respond', detail: 'Handle selected item' }],
   codeExample: `import javax.swing.*;\n\npublic class ComboDemo extends JFrame {\n    public ComboDemo() {\n        String[] fruits = {"Apple", "Banana", "Mango"};\n        JComboBox<String> combo = new JComboBox<>(fruits);\n        add(combo);\n        setSize(250, 150);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Populate combo boxes with real domain values.', 'Use item listeners when the selected option changes logic.', 'Keep options concise and readable.'],
   summary: 'Dropdown lists help capture user choices in a compact, organized form.',
   keyTakeaways: ['JComboBox is a dropdown.', 'JList supports multiple item display.', 'Selection events drive interactivity.']
 },
 {
   id: 'swing_lesson_7',
   sequence: 7,
   title: 'JTable and Data Display',
   topics: ['JTable', 'DefaultTableModel', 'rows', 'columns', 'table model'],
   objectives: ['Display data in rows and columns.', 'Build table models for data content.', 'Understand how tables represent structured information.'],
   introduction: 'Tables are used to present tabular data such as records, grades, or inventory items.',
   content: ['A JTable arranges data in rows and columns.', 'The DefaultTableModel provides a simple data model that can be edited and displayed.', 'Tables are often shown in forms or dashboard panels.'],
   diagram: [{ label: 'Table', detail: 'Rows and columns' }, { label: 'Model', detail: 'Stores data' }, { label: 'Display', detail: 'JTable renders content' }],
   codeExample: `import javax.swing.*;\n\npublic class TableDemo extends JFrame {\n    public TableDemo() {\n        String[] columns = {"Name", "Score"};\n        Object[][] data = {{"Ana", 90}, {"Jeric", 88}};\n        JTable table = new JTable(data, columns);\n        add(new JScrollPane(table));\n        setSize(300, 200);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Use scroll panes for larger tables.', 'Keep column names clear and consistent.', 'Use table models when data is dynamic.'],
   summary: 'JTable is the Swing component used for structured tabular data output.',
   keyTakeaways: ['JTable shows rows and columns.', 'DefaultTableModel stores table data.', 'JScrollPane makes tables scrollable.']
 },
 {
   id: 'swing_lesson_8',
   sequence: 8,
   title: 'Menus and Toolbar Actions',
   topics: ['JMenuBar', 'JMenu', 'JMenuItem', 'Action', 'toolbar'],
   objectives: ['Create menu bars and dropdown menus.', 'Add items that trigger actions.', 'Organize controls into a common navigation structure.'],
   introduction: 'Menus organize commands and actions in an application interface so users can access them quickly.',
   content: ['JMenuBar holds menus, and JMenu contains menu items.', 'JMenuItem represents a command the user can click.', 'These menu components are often part of desktop application interfaces.'],
   diagram: [{ label: 'Menu Bar', detail: 'Top-level container' }, { label: 'Menu', detail: 'Groups commands' }, { label: 'Item', detail: 'Command or action' }],
   codeExample: `import javax.swing.*;\n\npublic class MenuDemo extends JFrame {\n    public MenuDemo() {\n        JMenuBar menuBar = new JMenuBar();\n        JMenu fileMenu = new JMenu("File");\n        fileMenu.add(new JMenuItem("Open"));\n        menuBar.add(fileMenu);\n        setJMenuBar(menuBar);\n        setSize(300, 200);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Group commands by user task.', 'Use clear labels for menu items.', 'Keep menus shallow and easy to scan.'],
   summary: 'Menu bars structure common actions and improve usability.',
   keyTakeaways: ['JMenuBar groups menus.', 'JMenu contains related actions.', 'JMenuItem triggers commands.']
 },
 {
   id: 'swing_lesson_9',
   sequence: 9,
   title: 'Icons, Borders, and Decor',
   topics: ['ImageIcon', 'Border', 'setBorder()', 'padding', 'UI styling'],
   objectives: ['Add icons and visual polish with ImageIcon.', 'Decorate containers with borders.', 'Improve the appearance of Swing forms.'],
   introduction: 'Visual design in Swing helps communicate clarity and improves usability.',
   content: ['Borders and icons make components easier to understand.', 'ImageIcon loads icons for buttons or labels.', 'Borders help group and distinguish content sections in forms.'],
   diagram: [{ label: 'Icon', detail: 'Visual clue' }, { label: 'Border', detail: 'Decorates component' }, { label: 'Padding', detail: 'Spacing around content' }],
   codeExample: `import javax.swing.*;\nimport javax.swing.border.*;\n\npublic class DecorDemo extends JFrame {\n    public DecorDemo() {\n        JLabel label = new JLabel("Welcome");\n        label.setBorder(BorderFactory.createTitledBorder("Status"));\n        add(label);\n        setSize(220, 160);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Use icons sparingly and consistently.', 'Avoid visual clutter in forms.', 'Apply borders to group related fields.'],
   summary: 'Swing offers simple decoration tools to improve readability and interface polish.',
   keyTakeaways: ['ImageIcon adds pictures.', 'Borders group content.', 'Good visual styling improves usability.']
 },
 {
   id: 'swing_lesson_10',
   sequence: 10,
   title: 'Form Validation and Events',
   topics: ['validation', 'DocumentListener', 'focus', 'input checking', 'error handling'],
   objectives: ['Validate user input before submission.', 'Respond to focused events and value changes.', 'Prevent invalid form entries.'],
   introduction: 'User input should be checked before it is accepted by the system to avoid invalid or unsafe actions.',
   content: ['Swing forms often rely on event listeners to validate input values.', 'Checking for empty strings or invalid numbers prevents runtime errors.', 'Validation helps users understand what they need to correct.'],
   diagram: [{ label: 'Input', detail: 'User enters data' }, { label: 'Check', detail: 'Validate before continue' }, { label: 'Submit', detail: 'Only accept valid values' }],
   codeExample: `import javax.swing.*;\n\npublic class ValidationDemo extends JFrame {\n    public ValidationDemo() {\n        JTextField field = new JTextField(20);\n        JButton submit = new JButton("Submit");\n        submit.addActionListener(e -> {\n            if (field.getText().trim().isEmpty()) {\n                JOptionPane.showMessageDialog(this, "Field cannot be empty");\n            }\n        });\n        add(field);\n        add(submit);\n        setLayout(new BoxLayout(getContentPane(), BoxLayout.Y_AXIS));\n        setSize(260, 140);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Check for empty input before using it.', 'Show clear validation messages.', 'Validate both front-end and logic values.'],
   summary: 'Validation ensures the form data is usable before continuing the workflow.',
   keyTakeaways: ['Validation prevents bad input.', 'Events help respond to changes.', 'Clear feedback helps users correct mistakes.']
 },
 {
   id: 'swing_lesson_11',
   sequence: 11,
   title: 'Building a Complete Swing App',
   topics: ['app design', 'MVC thinking', 'components', 'flow', 'integration'],
   objectives: ['Combine multiple Swing components into one interface.', 'Plan a small application flow.', 'Recognize how GUI components work together.'],
   introduction: 'A complete Swing application combines multiple components into one consistent user interface.',
   content: ['Applications often involve labels, fields, buttons, lists, menus, and actions working together.', 'A clear layout and consistent events make the application easier to maintain.', 'A strong desktop interface follows a readable information flow.'],
   diagram: [{ label: 'Input', detail: 'Form components' }, { label: 'Action', detail: 'Buttons and menu items' }, { label: 'Output', detail: 'Tables, dialogs, and labels' }],
   codeExample: `import javax.swing.*;\n\npublic class AppDemo extends JFrame {\n    public AppDemo() {\n        JLabel title = new JLabel("Student Portal");\n        JTextField field = new JTextField("Name");\n        JButton button = new JButton("Submit");\n        add(title);\n        add(field);\n        add(button);\n        setLayout(new BoxLayout(getContentPane(), BoxLayout.Y_AXIS));\n        setSize(300, 180);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}`,
   bestPractices: ['Keep screens focused on one task.', 'Arrange controls in a natural reading order.', 'Use consistent labels and spacing.'],
   summary: 'The best Swing applications combine simple components into a clear and useful user flow.',
   keyTakeaways: ['Good design is organized.', 'UI components work together.', 'User-facing clarity matters.']
 }
];

export const JAVA_SWING_VIDEOS: SwingVideo[] = [
  {
    id: 'swing_video_1',
    lessonId: 'swing_lesson_1',
    title: 'Topic 1 JFrame Video Lesson',
    duration: '15:00',
    description: 'Learn how to create and configure a simple window using JFrame.',
    embedUrl: '/Java Swing/Video Lesson/Topic 1 JFRAME.mp4'
  },
  {
    id: 'swing_video_2',
    lessonId: 'swing_lesson_2',
    title: 'Topic 2 JLabel, JTextField, & JTextArea Video Lesson',
    duration: '15:00',
    description: 'Learn how to add static labels, single-line text fields, and multi-line text areas.',
    embedUrl: '/Java Swing/Video Lesson/Topic 2 Jlabel,JTextField,JtextArea.mp4'
  },
  {
    id: 'swing_video_3',
    lessonId: 'swing_lesson_3',
    title: 'Topic 3 JButton & ActionListener Video Lesson',
    duration: '15:00',
    description: 'Learn how to create buttons and handle click events with ActionListeners.',
    embedUrl: '/Java Swing/Video Lesson/Topic 3 JButton&ActionListener.mp4'
  },
  {
    id: 'swing_video_4',
    lessonId: 'swing_lesson_4',
    title: 'Topic 4 JPanel & Layout Managers Video Lesson',
    duration: '15:00',
    description: 'Learn how to arrange controls using FlowLayout, BorderLayout, and GridLayout.',
    embedUrl: '/Java Swing/Video Lesson/Topic 4 JPanel&LayoutManagers.mp4'
  },
  {
    id: 'swing_video_5',
    lessonId: 'swing_lesson_5',
    title: 'Topic 5 JOptionPane Video Lesson',
    duration: '15:00',
    description: 'Learn how to display dialog popups, collect input, and handle confirmation boxes.',
    embedUrl: '/Java Swing/Video Lesson/Topic 5 JOptionPane.mp4'
  }
];

export const JAVA_SWING_ASSESSMENTS = JAVA_SWING_LESSONS.map(lesson => ({
  id: `swing_assessment_${lesson.sequence}`,
  lessonId: lesson.id,
  title: `${lesson.title} Quiz`,
  passingPercentage: SWING_PASSING_PERCENTAGE,
  questions: SWING_QUESTION_BANKS[lesson.sequence] || []
}));

const starter = (body: string) => `import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        ${body}
    }
}
`;

export const JAVA_SWING_EXERCISES: ProgrammingChallenge[] = [
  {
    id: 'swing_exercise_1',
    topicId: 'swing-introduction',
    lessonId: 'swing_lesson_1',
    assessmentId: 'swing_assessment_1',
    title: 'Create a JFrame containing a JLabel',
    description: 'Build a simple Swing window that displays a welcome label.',
    learningObjectives: ['Create a JFrame.', 'Add a JLabel.', 'Configure frame size and visibility.'],
    requirements: ['Use JFrame', 'Use JLabel', 'Call setVisible(true)'],
    starterCode: starter('JFrame frame = new JFrame("Swing Label");\n        // Add a JLabel and show the frame.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'A JFrame displays a JLabel',
    passingScore: 80,
    testCases: [
      { id: 'frame', input: '', expectedOutput: 'JFrame found', isHidden: false, matcher: 'new\\s+JFrame' },
      { id: 'label', input: '', expectedOutput: 'JLabel found', isHidden: true, matcher: 'new\\s+JLabel' },
      { id: 'visible', input: '', expectedOutput: 'Frame visible', isHidden: true, matcher: 'setVisible\\s*\\(\\s*true\\s*\\)' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_2',
    topicId: 'swing-text-fields',
    lessonId: 'swing_lesson_2',
    assessmentId: 'swing_assessment_2',
    title: 'Create a Text Input Form',
    description: 'Create an input interface containing a JTextField for a short input and a JTextArea for a long input, added to a JPanel.',
    learningObjectives: ['Use JTextField.', 'Use JTextArea.', 'Organize components on a JPanel.'],
    requirements: ['Use JTextField', 'Use JTextArea', 'Use JPanel'],
    starterCode: starter('JPanel panel = new JPanel();\n        // Create JTextField and JTextArea, then add them to the panel.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Text inputs form created',
    passingScore: 80,
    testCases: [
      { id: 'textfield', input: '', expectedOutput: 'JTextField found', isHidden: false, matcher: 'new\\s+JTextField' },
      { id: 'textarea', input: '', expectedOutput: 'JTextArea found', isHidden: true, matcher: 'new\\s+JTextArea' },
      { id: 'panel', input: '', expectedOutput: 'JPanel found', isHidden: true, matcher: 'new\\s+JPanel' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_3',
    topicId: 'swing-buttons',
    lessonId: 'swing_lesson_3',
    assessmentId: 'swing_assessment_3',
    title: 'Create a Click Counter Button',
    description: 'Design a button that increments a counter and displays the count when clicked.',
    learningObjectives: ['Create a JButton.', 'Attach an ActionListener.', 'Handle button click events.'],
    requirements: ['Use JButton', 'Use addActionListener'],
    starterCode: starter('JButton button = new JButton("Click Me");\n        // Register an ActionListener using a lambda expression to listen for clicks.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Interactive click button created',
    passingScore: 80,
    testCases: [
      { id: 'button', input: '', expectedOutput: 'JButton found', isHidden: false, matcher: 'new\\s+JButton' },
      { id: 'listener', input: '', expectedOutput: 'ActionListener found', isHidden: true, matcher: 'addActionListener' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_4',
    topicId: 'swing-layouts',
    lessonId: 'swing_lesson_4',
    assessmentId: 'swing_assessment_4',
    title: 'Create a Grid Layout Panel',
    description: 'Design a panel using GridLayout with 2 rows and 2 columns to arrange components.',
    learningObjectives: ['Use a layout manager.', 'Create a GridLayout.', 'Structure a grid panel.'],
    requirements: ['Use JPanel', 'Use GridLayout'],
    starterCode: starter('JPanel panel = new JPanel();\n        // Set layout to GridLayout and add components.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'GridLayout panel created',
    passingScore: 80,
    testCases: [
      { id: 'panel', input: '', expectedOutput: 'JPanel found', isHidden: false, matcher: 'new\\s+JPanel' },
      { id: 'layout', input: '', expectedOutput: 'GridLayout found', isHidden: true, matcher: 'new\\s+GridLayout|GridLayout\\s*\\(' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_5',
    topicId: 'swing-dialogs',
    lessonId: 'swing_lesson_5',
    assessmentId: 'swing_assessment_5',
    title: 'JOptionPane Input and Output',
    description: 'Build a popup workflow that asks the user for their name and age using showInputDialog, converts the age to an integer, and shows a welcome message using showMessageDialog.',
    learningObjectives: ['Prompt user inputs with JOptionPane.', 'Show messages using JOptionPane.', 'Convert string to integer.'],
    requirements: ['Use JOptionPane.showInputDialog', 'Use JOptionPane.showMessageDialog', 'Use Integer.parseInt'],
    starterCode: `import javax.swing.JOptionPane;

public class Main {
    public static void main(String[] args) {
        // Prompt for name and age, parse the age, and show message dialog.
    }
}
`,
    sampleInput: 'No stdin required',
    sampleOutput: 'JOptionPane popups created',
    passingScore: 80,
    testCases: [
      { id: 'input', input: '', expectedOutput: 'showInputDialog found', isHidden: false, matcher: 'JOptionPane\\s*\\.\\s*showInputDialog' },
      { id: 'message', input: '', expectedOutput: 'showMessageDialog found', isHidden: true, matcher: 'JOptionPane\\s*\\.\\s*showMessageDialog' },
      { id: 'parse', input: '', expectedOutput: 'Integer.parseInt found', isHidden: true, matcher: 'Integer\\s*\\.\\s*parseInt' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  }
];

export const isOopCourseComplete = (user?: { id?: string; userId?: string; email?: string } | null) => {
  const watchKey = getUserStorageKey('oophub_oop_video_progress', user);
  const quizKey = getUserStorageKey('oophub_oop_quiz_attempts', user);
  const watchDb = getStoredJson<Record<string, { completed?: boolean; completionPercentage?: number }>>(watchKey, {});
  const quizDb = getStoredJson<Record<string, { passed?: boolean; percentage?: number }>>(quizKey, {});

  const allLessonsCompleted = OOP_COURSE_LESSONS.every(lesson =>
    Boolean(watchDb[lesson.id]?.completed) || Number(watchDb[lesson.id]?.completionPercentage || 0) >= 95
  );
  const allAssessmentsPassed = OOP_ASSESSMENTS.every(assessment =>
    Boolean(quizDb[assessment.id]?.passed) && Number(quizDb[assessment.id]?.percentage || 0) >= 70
  );

  return allLessonsCompleted && allAssessmentsPassed;
};

export const getSwingCourseProgress = (user?: { id?: string; userId?: string; email?: string } | null) => {
  const storageKeys = getSwingStorageKeys(user);
  const progressDb = getStoredJson<SwingProgressDb>(storageKeys.watch, {});
  const quizDb = getStoredJson<SwingQuizDb>(storageKeys.quiz, {});
  const submissionDb = getStoredJson<Record<string, unknown>>(storageKeys.submission, {});
  const completedLessons = JAVA_SWING_LESSONS.filter(lesson =>
    progressDb[lesson.id]?.contentCompleted && progressDb[lesson.id]?.videoCompleted
  ).length;
  const passedQuizzes = JAVA_SWING_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
  const completedExercises = JAVA_SWING_EXERCISES.filter(exercise =>
    Object.keys(submissionDb).some(key => key.endsWith(`:${exercise.id}`))
  ).length;
  const totalUnits = JAVA_SWING_LESSONS.length + JAVA_SWING_ASSESSMENTS.length + JAVA_SWING_EXERCISES.length;

  return {
    unlocked: isOopCourseComplete(user),
    completedLessons,
    passedQuizzes,
    completedExercises,
    overall: totalUnits ? Math.round(((completedLessons + passedQuizzes + completedExercises) / totalUnits) * 100) : 0
  };
};

export const gradeSwingSource = (challenge: ProgrammingChallenge, sourceCode: string) => {
  const startedAt = performance.now();
  const hasSwingImport = /import\s+javax\.swing\.\*|javax\.swing\./.test(sourceCode);
  const hasMain = /public\s+class\s+Main/.test(sourceCode) && /public\s+static\s+void\s+main\s*\(/.test(sourceCode);
  const braceBalance = (sourceCode.match(/\{/g) || []).length - (sourceCode.match(/\}/g) || []).length;

  if (!hasSwingImport || !hasMain || braceBalance !== 0) {
    return {
      compileStatus: 'failed' as const,
      score: 0,
      runtime: Math.round(performance.now() - startedAt),
      memoryUsage: Math.max(24, Math.round(sourceCode.length / 48)),
      programOutput: '',
      errorMessage: !hasSwingImport
        ? 'Compilation failed: javax.swing import or fully qualified Swing usage was not found.'
        : !hasMain
          ? 'Compilation failed: Main class or main method was not found.'
          : 'Compilation failed: braces are not balanced.',
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
      actualOutput: passed ? testCase.expectedOutput : 'Required Swing structure was not detected.',
      message: passed ? 'Requirement satisfied.' : `Expected code pattern: ${testCase.matcher}`
    };
  });
  const passedCount = testResults.filter(result => result.passed).length;
  const score = Math.round((passedCount / challenge.testCases.length) * 100);

  return {
    compileStatus: score >= challenge.passingScore ? 'success' as const : 'runtime_error' as const,
    score,
    runtime: Math.max(18, Math.round(performance.now() - startedAt) + sourceCode.length % 90),
    memoryUsage: Math.max(28, Math.round(sourceCode.length / 42)),
    programOutput: score >= challenge.passingScore ? challenge.sampleOutput : 'Swing UI structure is incomplete.',
    errorMessage: score >= challenge.passingScore ? '' : 'Program compiled, but not all Swing requirements were detected.',
    testResults
  };
};
