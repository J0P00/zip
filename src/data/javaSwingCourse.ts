import { ChallengeTestResult, ProgrammingChallenge } from '../types';
import { CourseQuestion, getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS } from './oopCourse';

export const SWING_WATCH_KEY = 'oophub_swing_lesson_progress';
export const SWING_QUIZ_KEY = 'oophub_swing_quiz_attempts';
export const SWING_DRAFT_KEY = 'oophub_swing_practice_drafts';
export const SWING_SUBMISSION_KEY = 'oophub_swing_submissions';
export const SWING_PASSING_PERCENTAGE = 80;

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

const swingQuestion = (
  lessonId: string,
  number: number,
  questionText: string,
  correctAnswer: string,
  distractors: string[],
  explanation: string
): CourseQuestion => ({
  id: `${lessonId}_q${number.toString().padStart(2, '0')}`,
  lessonId,
  question: questionText,
  options: [correctAnswer, ...distractors].slice(0, 4),
  correctAnswer,
  explanation,
  difficulty: number <= 4 ? 'Easy' : number <= 8 ? 'Medium' : 'Hard'
});

export const JAVA_SWING_LESSONS: SwingLesson[] = [
  {
    id: 'swing_lesson_1',
    sequence: 1,
    title: 'Introduction to Java Swing',
    topics: ['What is Swing?', 'Difference between AWT and Swing', 'JFrame', 'JPanel', 'JLabel', 'JButton'],
    objectives: [
      'Explain what Swing is and why it is used for Java desktop interfaces.',
      'Compare AWT heavyweight components with Swing lightweight components.',
      'Build a basic JFrame with labels, panels, and buttons.'
    ],
    introduction: 'Swing is Java standard toolkit for building desktop graphical user interfaces using reusable components.',
    content: [
      'Swing is built on top of AWT but supplies richer, lightweight components rendered by Java.',
      'A JFrame is the top-level window. JPanel groups controls. JLabel displays text or images. JButton triggers actions.',
      'Most Swing work follows a pattern: create components, configure layout, add components, attach listeners, then show the frame.'
    ],
    diagram: [
      { label: 'JFrame', detail: 'Application window' },
      { label: 'JPanel', detail: 'Content container' },
      { label: 'JLabel', detail: 'Text display' },
      { label: 'JButton', detail: 'User command' }
    ],
    codeExample: `import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        JFrame frame = new JFrame("Hello Swing");
        JPanel panel = new JPanel();
        panel.add(new JLabel("Welcome to Java Swing"));
        panel.add(new JButton("Start"));
        frame.add(panel);
        frame.setSize(320, 160);
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setVisible(true);
    }
}`,
    bestPractices: [
      'Create and update Swing UI on the Event Dispatch Thread in production apps.',
      'Set an explicit close operation for top-level frames.',
      'Group related controls inside panels instead of adding everything directly to the frame.'
    ],
    summary: 'A Swing interface starts with a window, containers, visual components, and events.',
    keyTakeaways: ['JFrame owns the window.', 'JPanel organizes controls.', 'Swing components are lightweight and flexible.']
  },
  {
    id: 'swing_lesson_2',
    sequence: 2,
    title: 'Swing Components',
    topics: ['JTextField', 'JTextArea', 'JCheckBox', 'JRadioButton', 'JComboBox', 'JTable', 'JScrollPane'],
    objectives: [
      'Choose the correct input component for a user interaction.',
      'Use JScrollPane for components that can overflow.',
      'Represent tabular data with JTable.'
    ],
    introduction: 'Swing components convert user intent into structured values that your program can read and process.',
    content: [
      'JTextField captures one-line input, while JTextArea supports multiple lines.',
      'JCheckBox represents independent yes/no choices. JRadioButton is best used in a ButtonGroup for one-of-many choices.',
      'JComboBox presents a compact option list. JTable displays rows and columns, usually inside JScrollPane.'
    ],
    diagram: [
      { label: 'Input', detail: 'JTextField / JTextArea' },
      { label: 'Choice', detail: 'JCheckBox / JRadioButton' },
      { label: 'List', detail: 'JComboBox' },
      { label: 'Data', detail: 'JTable + JScrollPane' }
    ],
    codeExample: `JPanel form = new JPanel();
JTextField nameField = new JTextField(16);
JCheckBox active = new JCheckBox("Active");
JComboBox<String> course = new JComboBox<>(new String[] {"CS", "IT"});
form.add(new JLabel("Name"));
form.add(nameField);
form.add(active);
form.add(course);`,
    bestPractices: [
      'Use labels beside inputs so users understand what each field expects.',
      'Use ButtonGroup when radio buttons are mutually exclusive.',
      'Wrap tables and long text areas in JScrollPane.'
    ],
    summary: 'Swing supplies specialized components for text, choices, lists, and tabular data.',
    keyTakeaways: ['Pick components by user task.', 'Group radio buttons.', 'Scrollable content needs JScrollPane.']
  },
  {
    id: 'swing_lesson_3',
    sequence: 3,
    title: 'Layout Managers',
    topics: ['FlowLayout', 'BorderLayout', 'GridLayout', 'BoxLayout', 'Absolute Layout'],
    objectives: [
      'Explain why layout managers are preferred over fixed positions.',
      'Select an appropriate layout for common UI structures.',
      'Combine panels to build responsive desktop screens.'
    ],
    introduction: 'Layout managers decide how components resize and arrange themselves inside containers.',
    content: [
      'FlowLayout places components left to right and wraps as needed.',
      'BorderLayout divides a container into North, South, East, West, and Center regions.',
      'GridLayout creates equal-size cells. BoxLayout stacks components on one axis. Absolute layout uses fixed bounds and is brittle.'
    ],
    diagram: [
      { label: 'FlowLayout', detail: 'Simple rows' },
      { label: 'BorderLayout', detail: 'App shell' },
      { label: 'GridLayout', detail: 'Uniform cells' },
      { label: 'BoxLayout', detail: 'Vertical or horizontal stack' }
    ],
    codeExample: `JFrame frame = new JFrame("Layouts");
frame.setLayout(new BorderLayout());
frame.add(new JLabel("Header"), BorderLayout.NORTH);
frame.add(new JTextArea(), BorderLayout.CENTER);
frame.add(new JButton("Save"), BorderLayout.SOUTH);`,
    bestPractices: [
      'Compose complex screens using multiple nested panels.',
      'Avoid absolute layout unless building a controlled prototype.',
      'Let layouts handle resizing instead of hard-coding positions.'
    ],
    summary: 'Good Swing interfaces rely on layout managers to stay usable as windows resize.',
    keyTakeaways: ['BorderLayout is useful for app shells.', 'GridLayout creates uniform controls.', 'Absolute layout is fragile.']
  },
  {
    id: 'swing_lesson_4',
    sequence: 4,
    title: 'Event Handling',
    topics: ['ActionListener', 'MouseListener', 'KeyListener', 'WindowListener'],
    objectives: [
      'Attach listeners to Swing components.',
      'Choose the correct listener for click, key, mouse, and window events.',
      'Update UI state in response to user actions.'
    ],
    introduction: 'Event handling lets Swing programs react to what the user does.',
    content: [
      'ActionListener handles button clicks and command-style actions.',
      'MouseListener handles mouse enter, exit, press, release, and click events.',
      'KeyListener observes keyboard input. WindowListener observes frame lifecycle events.'
    ],
    diagram: [
      { label: 'User Action', detail: 'Click / key / window close' },
      { label: 'Listener', detail: 'Receives event object' },
      { label: 'Handler', detail: 'Updates app state' },
      { label: 'UI Refresh', detail: 'User sees feedback' }
    ],
    codeExample: `JButton button = new JButton("Greet");
JLabel label = new JLabel("Waiting...");
button.addActionListener(event -> {
    label.setText("Hello, Swing!");
});`,
    bestPractices: [
      'Keep listener code short and delegate larger tasks to helper methods.',
      'Validate input before updating state.',
      'Give immediate visual feedback after a user action.'
    ],
    summary: 'Listeners connect UI events to application behavior.',
    keyTakeaways: ['ActionListener is the common button handler.', 'Listeners receive event objects.', 'Handlers should stay focused.']
  },
  {
    id: 'swing_lesson_5',
    sequence: 5,
    title: 'Mini Swing Application',
    topics: ['JFrame', 'JLabel', 'JButton', 'JTextField', 'Event Handling'],
    objectives: [
      'Plan a complete Swing screen from requirements.',
      'Combine layout, components, and listeners in one mini application.',
      'Submit maintainable Swing code for review.'
    ],
    introduction: 'A complete Swing app combines windows, layout, inputs, commands, validation, and feedback.',
    content: [
      'Start by sketching the data the user must enter and the action they need to perform.',
      'Create labels and input fields, place them with a layout manager, and attach listeners to buttons.',
      'A mini app should validate input, update labels or tables, and keep code readable.'
    ],
    diagram: [
      { label: 'Requirements', detail: 'Fields and actions' },
      { label: 'UI Layout', detail: 'Frame and panels' },
      { label: 'Events', detail: 'Button listeners' },
      { label: 'Feedback', detail: 'Result label or table' }
    ],
    codeExample: `JTextField nameField = new JTextField(12);
JButton saveButton = new JButton("Save");
JLabel status = new JLabel("Enter a name");
saveButton.addActionListener(e -> {
    status.setText("Saved: " + nameField.getText());
});`,
    bestPractices: [
      'Name variables after their UI purpose.',
      'Validate required fields before saving.',
      'Separate UI construction from event behavior as the app grows.'
    ],
    summary: 'The final Swing lesson turns individual components into a small working interface.',
    keyTakeaways: ['Combine components intentionally.', 'Events drive behavior.', 'Readable code matters in UI projects.']
  }
];

export const JAVA_SWING_VIDEOS: SwingVideo[] = [
  {
    id: 'swing_video_1',
    lessonId: 'swing_lesson_1',
    title: 'Java Swing Tutorial for Beginners',
    duration: '28:46',
    description: 'A beginner-friendly overview of Swing windows, panels, labels, and buttons.',
    embedUrl: 'https://www.youtube.com/embed/5o3fMLPY7qY'
  },
  {
    id: 'swing_video_2',
    lessonId: 'swing_lesson_1',
    title: 'JFrame and JPanel Basics',
    duration: '17:22',
    description: 'Shows how top-level windows and containers work together in Swing.',
    embedUrl: 'https://www.youtube.com/embed/Kmgo00avvEw'
  },
  {
    id: 'swing_video_3',
    lessonId: 'swing_lesson_2',
    title: 'Swing Components Explained',
    duration: '31:10',
    description: 'Covers text fields, buttons, check boxes, combo boxes, and tables.',
    embedUrl: 'https://www.youtube.com/embed/HuTs8S0rLpw'
  },
  {
    id: 'swing_video_4',
    lessonId: 'swing_lesson_4',
    title: 'Java Swing Event Handling',
    duration: '24:18',
    description: 'Explains listeners and how buttons trigger application behavior.',
    embedUrl: 'https://www.youtube.com/embed/8ZcEYv2ezWc'
  },
  {
    id: 'swing_video_5',
    lessonId: 'swing_lesson_5',
    title: 'Build a Java Swing Login System',
    duration: '36:04',
    description: 'Walkthrough of a practical login interface using fields and event handling.',
    embedUrl: 'https://www.youtube.com/embed/iE8tZ0hn2Ws'
  }
];

export const JAVA_SWING_ASSESSMENTS = JAVA_SWING_LESSONS.map(lesson => ({
  id: `swing_assessment_${lesson.sequence}`,
  lessonId: lesson.id,
  title: `${lesson.title} Quiz`,
  passingPercentage: SWING_PASSING_PERCENTAGE,
  questions: buildSwingQuestions(lesson.id, lesson.sequence)
}));

function buildSwingQuestions(lessonId: string, sequence: number): CourseQuestion[] {
  const banks: Record<number, CourseQuestion[]> = {
    1: [
      swingQuestion(lessonId, 1, 'What is Java Swing primarily used for?', 'Building desktop graphical user interfaces', ['Managing database indexes', 'Compiling Java bytecode', 'Writing server routes'], 'Swing is a Java GUI toolkit for desktop applications.'),
      swingQuestion(lessonId, 2, 'Which Swing class represents a top-level window?', 'JFrame', ['JLabel', 'JButton', 'JTable'], 'JFrame is the main top-level window container.'),
      swingQuestion(lessonId, 3, 'Which component displays non-editable text?', 'JLabel', ['JTextField', 'JComboBox', 'JPanel'], 'JLabel displays text or images.'),
      swingQuestion(lessonId, 4, 'What is a JPanel commonly used for?', 'Grouping and organizing components', ['Encrypting passwords', 'Starting the JVM', 'Creating SQL tables'], 'JPanel is a general-purpose container.'),
      swingQuestion(lessonId, 5, 'How is Swing different from AWT in common teaching terms?', 'Swing components are lightweight and richer', ['Swing cannot create buttons', 'AWT requires no Java runtime', 'AWT is only for web apps'], 'Swing offers lightweight components built on AWT foundations.'),
      swingQuestion(lessonId, 6, 'Which method makes a JFrame visible?', 'setVisible(true)', ['showWindow(false)', 'displayFrame()', 'render(true)'], 'Calling setVisible(true) displays the frame.'),
      swingQuestion(lessonId, 7, 'Which component should trigger a command when clicked?', 'JButton', ['JLabel', 'JPanel', 'JScrollPane'], 'JButton is designed for click commands.'),
      swingQuestion(lessonId, 8, 'Why should controls be added to containers?', 'Containers organize and hold UI components', ['Containers delete events', 'Containers replace Java classes', 'Containers compile code'], 'Containers such as JPanel organize UI structure.'),
      swingQuestion(lessonId, 9, 'What package contains common Swing classes?', 'javax.swing', ['java.sql', 'java.net', 'java.time'], 'Swing classes live in javax.swing.'),
      swingQuestion(lessonId, 10, 'What should be set so closing a JFrame exits a simple app?', 'Default close operation', ['Database URL', 'Thread priority', 'Mouse speed'], 'setDefaultCloseOperation controls frame close behavior.')
    ],
    2: [
      swingQuestion(lessonId, 1, 'Which component captures one-line text input?', 'JTextField', ['JTextArea', 'JTable', 'JScrollPane'], 'JTextField is for single-line text.'),
      swingQuestion(lessonId, 2, 'Which component captures multi-line text?', 'JTextArea', ['JPasswordField', 'JButton', 'JLabel'], 'JTextArea supports multiple lines.'),
      swingQuestion(lessonId, 3, 'What should wrap a JTable for scrolling?', 'JScrollPane', ['ButtonGroup', 'JFrame only', 'ActionListener'], 'JScrollPane provides scrollbars for large content.'),
      swingQuestion(lessonId, 4, 'Which component represents an independent true/false choice?', 'JCheckBox', ['JRadioButton', 'JTable', 'JPanel'], 'JCheckBox is best for independent toggles.'),
      swingQuestion(lessonId, 5, 'Which component is commonly grouped for one-of-many selection?', 'JRadioButton', ['JTextArea', 'JLabel', 'JScrollPane'], 'Radio buttons are grouped for mutually exclusive choices.'),
      swingQuestion(lessonId, 6, 'Which component provides a dropdown list?', 'JComboBox', ['JTable', 'JLabel', 'JTextArea'], 'JComboBox shows selectable options in compact form.'),
      swingQuestion(lessonId, 7, 'Which component displays rows and columns?', 'JTable', ['JButton', 'JCheckBox', 'JFrame'], 'JTable is Swing tabular display component.'),
      swingQuestion(lessonId, 8, 'What does ButtonGroup do for radio buttons?', 'Ensures only one grouped option is selected', ['Adds scrollbars', 'Saves files', 'Changes window size'], 'ButtonGroup coordinates radio-button selection.'),
      swingQuestion(lessonId, 9, 'What should labels do in a form?', 'Clarify what each input means', ['Replace all buttons', 'Stop events', 'Remove validation'], 'Labels make inputs understandable.'),
      swingQuestion(lessonId, 10, 'Which field hides typed password characters?', 'JPasswordField', ['JTextArea', 'JComboBox', 'JTable'], 'JPasswordField masks password input.')
    ],
    3: [
      swingQuestion(lessonId, 1, 'Why use layout managers?', 'To arrange and resize components predictably', ['To hash passwords', 'To query PostgreSQL', 'To delete frames'], 'Layouts handle component positioning and resizing.'),
      swingQuestion(lessonId, 2, 'Which layout has North, South, East, West, and Center?', 'BorderLayout', ['FlowLayout', 'GridLayout', 'Absolute Layout'], 'BorderLayout divides a container into five regions.'),
      swingQuestion(lessonId, 3, 'Which layout places components left to right?', 'FlowLayout', ['BoxLayout only', 'BorderLayout', 'NoLayout'], 'FlowLayout flows controls in row order.'),
      swingQuestion(lessonId, 4, 'Which layout creates equal-sized rows and columns?', 'GridLayout', ['FlowLayout', 'BorderLayout', 'CardLayout'], 'GridLayout uses uniform cells.'),
      swingQuestion(lessonId, 5, 'Which layout stacks components along an axis?', 'BoxLayout', ['JTableLayout', 'SQLLayout', 'WindowLayout'], 'BoxLayout arranges along X or Y axis.'),
      swingQuestion(lessonId, 6, 'Why is absolute layout discouraged?', 'It breaks easily when size or platform changes', ['It makes buttons impossible', 'It requires no coordinates', 'It disables labels'], 'Fixed bounds are not responsive.'),
      swingQuestion(lessonId, 7, 'What is a good strategy for complex forms?', 'Nest panels with different layouts', ['Use one giant absolute panel', 'Avoid all containers', 'Put SQL in labels'], 'Nested panels keep layout manageable.'),
      swingQuestion(lessonId, 8, 'Where does BorderLayout.CENTER usually go?', 'The main expanding content area', ['Only a menu item', 'A database password', 'A hidden listener'], 'Center receives remaining available space.'),
      swingQuestion(lessonId, 9, 'What happens when a FlowLayout row is full?', 'Components wrap to the next line', ['The JVM exits', 'Labels are deleted', 'Events stop'], 'FlowLayout wraps components as space changes.'),
      swingQuestion(lessonId, 10, 'Which layout is useful for calculator-like buttons?', 'GridLayout', ['BorderLayout only', 'JLabel', 'MouseListener'], 'GridLayout works well for uniform calculator buttons.')
    ],
    4: [
      swingQuestion(lessonId, 1, 'Which listener handles JButton clicks?', 'ActionListener', ['MouseWheelOnly', 'WindowPainter', 'TableModel'], 'Buttons commonly use ActionListener.'),
      swingQuestion(lessonId, 2, 'What does MouseListener observe?', 'Mouse press, release, enter, exit, and click events', ['SQL inserts', 'Compilation phases', 'JVM startup only'], 'MouseListener receives mouse lifecycle events.'),
      swingQuestion(lessonId, 3, 'Which listener observes keyboard input?', 'KeyListener', ['ActionListener', 'GridListener', 'FrameLayout'], 'KeyListener handles key events.'),
      swingQuestion(lessonId, 4, 'Which listener observes a window closing?', 'WindowListener', ['JComboBox', 'JTable', 'ButtonGroup'], 'WindowListener handles frame lifecycle events.'),
      swingQuestion(lessonId, 5, 'What object is passed to an ActionListener callback?', 'An event object', ['A database table', 'A CSS file', 'A package lock'], 'Listeners receive event data.'),
      swingQuestion(lessonId, 6, 'Why keep listener code short?', 'It improves readability and maintainability', ['It removes all validation', 'It blocks UI updates', 'It prevents buttons'], 'Handlers should delegate complex work.'),
      swingQuestion(lessonId, 7, 'What should happen after a successful action?', 'The UI should give feedback', ['The frame should always crash', 'The code should delete labels', 'The app should ignore input'], 'Feedback confirms the action.'),
      swingQuestion(lessonId, 8, 'What is a lambda often used for in Swing?', 'Concise listener implementation', ['Storing video files', 'Creating database schemas', 'Replacing JFrame'], 'Lambdas make simple listeners compact.'),
      swingQuestion(lessonId, 9, 'What should be done before processing form input?', 'Validate the input', ['Hide every component', 'Disable the JVM', 'Delete the listener'], 'Validation protects behavior and user experience.'),
      swingQuestion(lessonId, 10, 'Which method registers a button action handler?', 'addActionListener', ['setSQLListener', 'onClickOnly', 'addFrameTable'], 'addActionListener attaches ActionListener to a button.')
    ],
    5: [
      swingQuestion(lessonId, 1, 'What should a mini Swing app start with?', 'A clear set of fields and actions', ['Random components only', 'A database backup', 'A package install'], 'UI work starts from requirements.'),
      swingQuestion(lessonId, 2, 'Which component is useful for entering a name?', 'JTextField', ['JLabel', 'JScrollPane only', 'JFrame'], 'JTextField captures short text.'),
      swingQuestion(lessonId, 3, 'Which component should show save status?', 'JLabel', ['JPasswordField', 'GridLayout', 'ButtonGroup'], 'A label can show feedback text.'),
      swingQuestion(lessonId, 4, 'Which component triggers save behavior?', 'JButton', ['JPanel', 'JTable header', 'JScrollPane'], 'Buttons trigger commands.'),
      swingQuestion(lessonId, 5, 'What should code do before accepting a submitted field?', 'Validate required input', ['Ignore empty values', 'Close every window', 'Remove event handling'], 'Validation is part of a complete UI.'),
      swingQuestion(lessonId, 6, 'Why separate UI construction from behavior?', 'The code is easier to maintain as it grows', ['It prevents compilation', 'It removes Swing components', 'It hides all listeners'], 'Separation keeps complex screens readable.'),
      swingQuestion(lessonId, 7, 'What combines components into one screen?', 'A container with a layout manager', ['A JWT token', 'A package lock', 'A SQL index'], 'Containers and layouts create screen structure.'),
      swingQuestion(lessonId, 8, 'What is an example of immediate feedback?', 'Changing a status label after clicking Save', ['Doing nothing', 'Deleting the field', 'Ignoring the action'], 'Feedback tells users the result.'),
      swingQuestion(lessonId, 9, 'What kind of app uses JFrame, JLabel, JButton, JTextField, and events together?', 'A complete interactive Swing application', ['A CSS stylesheet', 'A PostgreSQL function', 'A package manager'], 'Those elements form a desktop UI workflow.'),
      swingQuestion(lessonId, 10, 'What should teachers review in a submitted Swing exercise?', 'Source code, requirements, output, and completion status', ['Only the file name', 'Only the package version', 'Only the browser URL'], 'Teacher review needs code evidence and results.')
    ]
  };

  return banks[sequence] || [];
}

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
    topicId: 'swing-login-form',
    lessonId: 'swing_lesson_2',
    assessmentId: 'swing_assessment_2',
    title: 'Create a Login Form',
    description: 'Create a login interface using labels, username/password fields, and a button.',
    learningObjectives: ['Use text and password fields.', 'Add a submit button.', 'Organize form components.'],
    requirements: ['Use JLabel', 'Use JTextField', 'Use JPasswordField', 'Use JButton'],
    starterCode: starter('JFrame frame = new JFrame("Login");\n        // Build the login form controls here.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Login form UI created',
    passingScore: 80,
    testCases: [
      { id: 'textfield', input: '', expectedOutput: 'JTextField found', isHidden: false, matcher: 'new\\s+JTextField' },
      { id: 'password', input: '', expectedOutput: 'JPasswordField found', isHidden: true, matcher: 'new\\s+JPasswordField' },
      { id: 'button', input: '', expectedOutput: 'JButton found', isHidden: true, matcher: 'new\\s+JButton' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_3',
    topicId: 'swing-calculator-ui',
    lessonId: 'swing_lesson_3',
    assessmentId: 'swing_assessment_3',
    title: 'Create a Calculator UI',
    description: 'Design a calculator screen with a display field and grid-style buttons.',
    learningObjectives: ['Use a layout manager.', 'Create repeated buttons.', 'Structure a calculator interface.'],
    requirements: ['Use GridLayout', 'Use JTextField', 'Use multiple JButtons'],
    starterCode: starter('JFrame frame = new JFrame("Calculator");\n        // Create a display and calculator buttons.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Calculator UI created',
    passingScore: 80,
    testCases: [
      { id: 'grid', input: '', expectedOutput: 'GridLayout found', isHidden: false, matcher: 'new\\s+GridLayout|GridLayout\\s*\\(' },
      { id: 'display', input: '', expectedOutput: 'JTextField found', isHidden: true, matcher: 'new\\s+JTextField' },
      { id: 'buttons', input: '', expectedOutput: 'JButton found', isHidden: true, matcher: 'new\\s+JButton' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_4',
    topicId: 'swing-registration-form',
    lessonId: 'swing_lesson_4',
    assessmentId: 'swing_assessment_4',
    title: 'Create a Student Registration Form',
    description: 'Build a form with text fields, choices, and submit event handling.',
    learningObjectives: ['Create form controls.', 'Attach an ActionListener.', 'Display validation feedback.'],
    requirements: ['Use JTextField', 'Use JComboBox or JRadioButton', 'Use addActionListener'],
    starterCode: starter('JFrame frame = new JFrame("Student Registration");\n        // Add fields and handle the submit button.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Registration form created',
    passingScore: 80,
    testCases: [
      { id: 'field', input: '', expectedOutput: 'JTextField found', isHidden: false, matcher: 'new\\s+JTextField' },
      { id: 'choice', input: '', expectedOutput: 'Choice found', isHidden: true, matcher: 'new\\s+JComboBox|new\\s+JRadioButton|new\\s+JCheckBox' },
      { id: 'listener', input: '', expectedOutput: 'Listener found', isHidden: true, matcher: 'addActionListener' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  },
  {
    id: 'swing_exercise_5',
    topicId: 'swing-library-interface',
    lessonId: 'swing_lesson_5',
    assessmentId: 'swing_assessment_5',
    title: 'Build a Mini Library Management Interface',
    description: 'Create a small interface for entering books and displaying a library list.',
    learningObjectives: ['Combine fields, buttons, and tabular or list output.', 'Use event handling.', 'Create a complete mini UI.'],
    requirements: ['Use JFrame', 'Use JTextField', 'Use JButton', 'Use JTable or JTextArea', 'Use addActionListener'],
    starterCode: starter('JFrame frame = new JFrame("Mini Library");\n        // Build the library management interface.'),
    sampleInput: 'No stdin required',
    sampleOutput: 'Mini library interface created',
    passingScore: 80,
    testCases: [
      { id: 'frame', input: '', expectedOutput: 'JFrame found', isHidden: false, matcher: 'new\\s+JFrame' },
      { id: 'output', input: '', expectedOutput: 'Output component found', isHidden: true, matcher: 'new\\s+JTable|new\\s+JTextArea' },
      { id: 'listener', input: '', expectedOutput: 'Listener found', isHidden: true, matcher: 'addActionListener' }
    ],
    createdAt: '2026-07-28T00:00:00.000Z'
  }
];

export const isOopCourseComplete = () => {
  const watchDb = getStoredJson<Record<string, { completed?: boolean; completionPercentage?: number }>>('oophub_oop_video_progress', {});
  const quizDb = getStoredJson<Record<string, { passed?: boolean; percentage?: number }>>('oophub_oop_quiz_attempts', {});

  const allLessonsCompleted = OOP_COURSE_LESSONS.every(lesson =>
    Boolean(watchDb[lesson.id]?.completed) || Number(watchDb[lesson.id]?.completionPercentage || 0) >= 95
  );
  const allAssessmentsPassed = OOP_ASSESSMENTS.every(assessment =>
    Boolean(quizDb[assessment.id]?.passed) && Number(quizDb[assessment.id]?.percentage || 0) >= 70
  );

  return allLessonsCompleted && allAssessmentsPassed;
};

export const getSwingCourseProgress = () => {
  const progressDb = getStoredJson<SwingProgressDb>(SWING_WATCH_KEY, {});
  const quizDb = getStoredJson<SwingQuizDb>(SWING_QUIZ_KEY, {});
  const submissionDb = getStoredJson<Record<string, unknown>>(SWING_SUBMISSION_KEY, {});
  const completedLessons = JAVA_SWING_LESSONS.filter(lesson =>
    progressDb[lesson.id]?.contentCompleted && progressDb[lesson.id]?.videoCompleted
  ).length;
  const passedQuizzes = JAVA_SWING_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
  const completedExercises = JAVA_SWING_EXERCISES.filter(exercise =>
    Object.keys(submissionDb).some(key => key.endsWith(`:${exercise.id}`))
  ).length;
  const totalUnits = JAVA_SWING_LESSONS.length + JAVA_SWING_ASSESSMENTS.length + JAVA_SWING_EXERCISES.length;

  return {
    unlocked: isOopCourseComplete(),
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
