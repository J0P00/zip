// Auto-generated canonical Java Swing course catalog for backend seeding and APIs
const SWING_PASSING_SCORE = 80;

const JAVA_SWING_LESSONS = [
  {
    "id": "swing_lesson_1",
    "sequence": 1,
    "title": "Creating a Simple Window (JFrame)",
    "topics": [
      "JFrame",
      "Importing Swing",
      "extends JFrame",
      "setTitle()",
      "setSize()",
      "setVisible()",
      "setDefaultCloseOperation()"
    ],
    "objectives": [
      "Understand what GUI and Java Swing are.",
      "Import the javax.swing package.",
      "Create and configure a basic JFrame window with a title, size, and close operation."
    ],
    "introduction": "JFrame is the fundamental component in Java Swing used to create a main application window.",
    "content": [
      "A graphical user interface (GUI) allows users to interact with programs visually.",
      "To build a window in Swing, we import javax.swing.JFrame and write a class that extends JFrame.",
      "Inside the class constructor, we configure the window properties like setTitle(), setSize(), setDefaultCloseOperation(EXIT_ON_CLOSE), and setVisible(true)."
    ],
    "diagram": [
      {
        "label": "Import",
        "detail": "import javax.swing.JFrame"
      },
      {
        "label": "Inherit",
        "detail": "extends JFrame"
      },
      {
        "label": "Configure",
        "detail": "setSize(), setTitle()"
      },
      {
        "label": "Show",
        "detail": "setVisible(true)"
      }
    ],
    "codeExample": "import javax.swing.JFrame;\n\npublic class Tutorial extends JFrame {\n    public Tutorial() {\n        setTitle(\"My First Window\");\n        setSize(400, 400);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n    public static void main(String[] args) {\n        new Tutorial();\n    }\n}",
    "bestPractices": [
      "Always set setDefaultCloseOperation(EXIT_ON_CLOSE) so the program terminates fully when closed.",
      "Set the visibility of the window at the very end of the configuration steps.",
      "Use a constructor to initialize and set up your GUI window."
    ],
    "summary": "Building a simple window involves extending JFrame, setting properties in a constructor, and calling setVisible(true).",
    "keyTakeaways": [
      "JFrame creates windows.",
      "setSize() configures dimensions.",
      "setVisible(true) makes the window appear."
    ]
  },
  {
    "id": "swing_lesson_2",
    "sequence": 2,
    "title": "JLabel, JTextField, & JTextArea",
    "topics": [
      "JLabel",
      "JTextField",
      "JTextArea",
      "JPanel",
      "add() method"
    ],
    "objectives": [
      "Display non-editable text using JLabel.",
      "Accept single-line input using JTextField.",
      "Accept multi-line input using JTextArea.",
      "Organize text components using a JPanel container."
    ],
    "introduction": "Swing provides components to display text and accept text input from the user.",
    "content": [
      "JLabel is used to display static, non-editable text or messages on the screen.",
      "JTextField is a single-line input field, and JTextArea is a multi-line input box suitable for paragraphs.",
      "These components are typically grouped in a JPanel container using the add() method before being added to the main JFrame."
    ],
    "diagram": [
      {
        "label": "JLabel",
        "detail": "Displays text/messages"
      },
      {
        "label": "JTextField",
        "detail": "Single-line text input"
      },
      {
        "label": "JTextArea",
        "detail": "Multi-line text input"
      },
      {
        "label": "JPanel",
        "detail": "Holds and groups them"
      }
    ],
    "codeExample": "import javax.swing.*;\n\npublic class TextDemo extends JFrame {\n    public TextDemo() {\n        JPanel panel = new JPanel();\n        JLabel label = new JLabel(\"Enter name:\");\n        JTextField textField = new JTextField(20);\n        JTextArea textArea = new JTextArea(5, 20);\n        \n        panel.add(label);\n        panel.add(textField);\n        panel.add(textArea);\n        add(panel);\n        \n        setSize(300, 200);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}",
    "bestPractices": [
      "Use JTextField for short single-line inputs like names or emails.",
      "Use JTextArea for long inputs and specify the rows and columns (e.g., 5 rows, 20 columns).",
      "Always add controls to a panel first to organize the layout."
    ],
    "summary": "Displaying and inputting text is accomplished using JLabel, JTextField, JTextArea, and JPanel.",
    "keyTakeaways": [
      "JLabel shows text.",
      "JTextField is for single-line input.",
      "JTextArea is for multi-line paragraphs."
    ]
  },
  {
    "id": "swing_lesson_3",
    "sequence": 3,
    "title": "JButton & ActionListener",
    "topics": [
      "JButton",
      "ActionListener",
      "addActionListener()",
      "actionPerformed",
      "Event Handling"
    ],
    "objectives": [
      "Create interactive buttons with JButton.",
      "Register event listeners using addActionListener().",
      "Implement response logic when a button is clicked using lambdas."
    ],
    "introduction": "JButton and ActionListener are used to make Java Swing applications interactive by responding to clicks.",
    "content": [
      "JButton creates a clickable button that triggers a command when clicked.",
      "An ActionListener is registered using addActionListener() to detect and respond to these click events.",
      "We write the response code inside the action handler, often using a Java lambda expression for concise code."
    ],
    "diagram": [
      {
        "label": "JButton",
        "detail": "Creates clickable button"
      },
      {
        "label": "Listener",
        "detail": "addActionListener()"
      },
      {
        "label": "Event",
        "detail": "Triggered on button click"
      },
      {
        "label": "Action",
        "detail": "Runs inside lambda callback"
      }
    ],
    "codeExample": "import javax.swing.*;\n\npublic class ClickDemo extends JFrame {\n    public ClickDemo() {\n        JPanel panel = new JPanel();\n        JButton button = new JButton(\"Click Me\");\n        JLabel label = new JLabel(\"Waiting...\");\n        \n        button.addActionListener(e -> {\n            label.setText(\"Button was clicked!\");\n            System.out.println(\"Button clicked!\");\n        });\n        \n        panel.add(button);\n        panel.add(label);\n        add(panel);\n        \n        setSize(300, 150);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}",
    "bestPractices": [
      "Provide clear, action-oriented text labels on your buttons.",
      "Use lambda expressions `e -> { ... }` for concise and readable event handlers.",
      "Keep event handler methods short by delegating heavy tasks."
    ],
    "summary": "Make interfaces interactive by creating JButtons, attaching ActionListeners, and implementing click logic.",
    "keyTakeaways": [
      "JButton represents commands.",
      "ActionListener detects click events.",
      "Lambdas implement action logic."
    ]
  },
  {
    "id": "swing_lesson_4",
    "sequence": 4,
    "title": "JPanel & Layout Managers",
    "topics": [
      "JPanel",
      "Layout Managers",
      "FlowLayout",
      "BorderLayout",
      "GridLayout"
    ],
    "objectives": [
      "Group GUI components together using JPanel.",
      "Arrange components in left-to-right rows using FlowLayout.",
      "Arrange components in five specific regions using BorderLayout.",
      "Arrange components in rows and columns using GridLayout."
    ],
    "introduction": "Layout managers control the positioning and resizing behavior of components inside panels and frames.",
    "content": [
      "JPanel is a lightweight container used to group components. It uses FlowLayout by default.",
      "BorderLayout divides a panel into five areas: North, South, East, West, and Center. Center usually holds the main expanding component.",
      "GridLayout places components in a table-like grid of equal-sized rows and columns."
    ],
    "diagram": [
      {
        "label": "FlowLayout",
        "detail": "Left-to-right rows"
      },
      {
        "label": "BorderLayout",
        "detail": "5 areas (N, S, E, W, C)"
      },
      {
        "label": "GridLayout",
        "detail": "Rows and columns grid"
      },
      {
        "label": "Nesting",
        "detail": "Combine panels for complex designs"
      }
    ],
    "codeExample": "import javax.swing.*;\nimport java.awt.*;\n\npublic class LayoutDemo extends JFrame {\n    public LayoutDemo() {\n        JPanel mainPanel = new JPanel(new BorderLayout());\n        JPanel topPanel = new JPanel(new FlowLayout());\n        JPanel gridPanel = new JPanel(new GridLayout(2, 2));\n        \n        gridPanel.add(new JButton(\"1\"));\n        gridPanel.add(new JButton(\"2\"));\n        gridPanel.add(new JButton(\"3\"));\n        gridPanel.add(new JButton(\"4\"));\n        \n        topPanel.add(new JLabel(\"Control Panel\"));\n        \n        mainPanel.add(topPanel, BorderLayout.NORTH);\n        mainPanel.add(gridPanel, BorderLayout.CENTER);\n        add(mainPanel);\n        \n        setSize(400, 300);\n        setDefaultCloseOperation(EXIT_ON_CLOSE);\n        setVisible(true);\n    }\n}",
    "bestPractices": [
      "Avoid hardcoding component positions; let Layout Managers handle responsiveness.",
      "Nest multiple JPanels with different layouts to build complex screen layouts.",
      "Remember that JPanel uses FlowLayout by default, while JFrame uses BorderLayout."
    ],
    "summary": "JPanel and Layout Managers (FlowLayout, BorderLayout, GridLayout) handle responsive arrangement of controls.",
    "keyTakeaways": [
      "FlowLayout arranges left-to-right.",
      "BorderLayout utilizes five regions.",
      "GridLayout structures uniform cells."
    ]
  },
  {
    "id": "swing_lesson_5",
    "sequence": 5,
    "title": "JOptionPane Dialogs",
    "topics": [
      "JOptionPane",
      "showMessageDialog()",
      "showInputDialog()",
      "showConfirmDialog()",
      "Integer.parseInt()",
      "\\n Escape Sequence"
    ],
    "objectives": [
      "Show informational dialogs with showMessageDialog().",
      "Prompt user inputs with showInputDialog().",
      "Collect confirmation selections with showConfirmDialog().",
      "Convert and parse dialog text inputs into integers.",
      "Format multi-line dialog content with the newline escape sequence."
    ],
    "introduction": "JOptionPane provides simple, pre-built dialog boxes for displaying messages, prompting inputs, and getting confirmations.",
    "content": [
      "JOptionPane is a helper class for quickly opening small popup windows.",
      "showMessageDialog() displays information, showInputDialog() prompts for a text input (returning a String), and showConfirmDialog() asks for confirmation.",
      "To use inputs for arithmetic, convert the string using Integer.parseInt(). Use the \\n escape sequence to print text on a new line."
    ],
    "diagram": [
      {
        "label": "Message Dialog",
        "detail": "Displays an alert or info"
      },
      {
        "label": "Input Dialog",
        "detail": "Prompts input string"
      },
      {
        "label": "Confirm Dialog",
        "detail": "Collects Yes/No choice"
      },
      {
        "label": "String parsing",
        "detail": "Integer.parseInt()"
      }
    ],
    "codeExample": "import javax.swing.JOptionPane;\n\npublic class DialogDemo {\n    public static void main(String[] args) {\n        JOptionPane.showMessageDialog(null, \"Welcome to Java Swing!\");\n        String name = JOptionPane.showInputDialog(null, \"Enter your name:\");\n        String ageStr = JOptionPane.showInputDialog(null, \"Enter age:\");\n        \n        int age = Integer.parseInt(ageStr);\n        int confirm = JOptionPane.showConfirmDialog(null, \"Save information?\", \"Confirm\", JOptionPane.YES_NO_OPTION);\n        \n        if (confirm == JOptionPane.YES_OPTION) {\n            JOptionPane.showMessageDialog(null, \"Name: \" + name + \"\\nAge: \" + age, \"Saved\", JOptionPane.INFORMATION_MESSAGE);\n        }\n    }\n}",
    "bestPractices": [
      "Pass null as the first argument to center the dialog on the computer screen.",
      "Validate dialog inputs before trying to parse them to prevent runtime NumberFormatExceptions.",
      "Use YES_NO_OPTION in confirmation dialogs to explicitly ask for simple user confirmation."
    ],
    "summary": "JOptionPane is used to show popups: showMessageDialog() for notifications, showInputDialog() for text inputs, and showConfirmDialog() for questions.",
    "keyTakeaways": [
      "JOptionPane displays simple popups.",
      "showInputDialog() returns text input.",
      "Integer.parseInt() converts text to numbers."
    ]
  }
];

const JAVA_SWING_VIDEOS = [
  {
    "id": "swing_video_1",
    "lessonId": "swing_lesson_1",
    "title": "Topic 1 JFrame Video Lesson",
    "duration": "05:54",
    "description": "Learn how to create and configure a simple window using JFrame.",
    "embedUrl": "https://res.cloudinary.com/jaudkms2/video/upload/v1791200208/Topic_1_JFRAME.mp4"
  },
  {
    "id": "swing_video_2",
    "lessonId": "swing_lesson_2",
    "title": "Topic 2 JLabel, JTextField, & JTextArea Video Lesson",
    "duration": "24:33",
    "description": "Learn how to add static labels, single-line text fields, and multi-line text areas.",
    "embedUrl": "https://res.cloudinary.com/jaudkms2/video/upload/v1791200212/Topic_2_Jlabel_JTextField_JtextArea.mp4"
  },
  {
    "id": "swing_video_3",
    "lessonId": "swing_lesson_3",
    "title": "Topic 3 JButton & ActionListener Video Lesson",
    "duration": "06:07",
    "description": "Learn how to create buttons and handle click events with ActionListeners.",
    "embedUrl": "https://res.cloudinary.com/jaudkms2/video/upload/v1791200207/Topic_3_JButton_ActionListener.mp4"
  },
  {
    "id": "swing_video_4",
    "lessonId": "swing_lesson_4",
    "title": "Topic 4 JPanel & Layout Managers Video Lesson",
    "duration": "07:08",
    "description": "Learn how to arrange controls using FlowLayout, BorderLayout, and GridLayout.",
    "embedUrl": "https://res.cloudinary.com/jaudkms2/video/upload/v1791200209/Topic_4_JPanel_LayoutManagers.mp4"
  },
  {
    "id": "swing_video_5",
    "lessonId": "swing_lesson_5",
    "title": "Topic 5 JOptionPane Video Lesson",
    "duration": "04:39",
    "description": "Learn how to display dialog popups, collect input, and handle confirmation boxes.",
    "embedUrl": "https://res.cloudinary.com/jaudkms2/video/upload/v1791200214/Topic_5_JOptionPane.mp4"
  }
];

const JAVA_SWING_ASSESSMENTS = [
  {
    "id": "swing_assessment_1",
    "lessonId": "swing_lesson_1",
    "title": "Creating a Simple Window (JFrame) Quiz",
    "quizType": "Multiple Choice",
    "passingScore": 80,
    "attempts": 3,
    "status": "Published",
    "questions": [
      {
        "id": "swing_lesson_1_q01",
        "lessonId": "swing_lesson_1",
        "question": "What does GUI stand for?",
        "options": [
          "Graphical User Interface",
          "General User Instruction",
          "Global Unified Interface",
          "Graphic Utility Index"
        ],
        "correctAnswer": "Graphical User Interface",
        "explanation": "\"Graphical User Interface\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q02",
        "lessonId": "swing_lesson_1",
        "question": "Which import statement is required to use the JFrame class, as shown in the video?",
        "options": [
          "import javax.swing.JFrame;",
          "import java.util.JFrame;",
          "import java.awt.JFrame;",
          "import javax.gui.JFrame;"
        ],
        "correctAnswer": "import javax.swing.JFrame;",
        "explanation": "\"import javax.swing.JFrame;\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q03",
        "lessonId": "swing_lesson_1",
        "question": "In the video, what must the class do in order to gain JFrame's window-creating abilities?",
        "options": [
          "extends JFrame",
          "implement JFrame",
          "import JFrame as a variable",
          "call JFrame.create()"
        ],
        "correctAnswer": "extends JFrame",
        "explanation": "\"extends JFrame\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q04",
        "lessonId": "swing_lesson_1",
        "question": "In the phrase 'public class Tutorial extends JFrame', what is JFrame considered in relation to Tutorial?",
        "options": [
          "JFrame is the superclass (parent class), Tutorial is the child class",
          "JFrame is the subclass, Tutorial is the superclass",
          "They are unrelated classes",
          "JFrame is an interface implemented by Tutorial"
        ],
        "correctAnswer": "JFrame is the superclass (parent class), Tutorial is the child class",
        "explanation": "\"JFrame is the superclass (parent class), Tutorial is the child class\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q05",
        "lessonId": "swing_lesson_1",
        "question": "What is the purpose of the constructor in the Tutorial class in this example?",
        "options": [
          "To hold and run the window setup code (title, size, visibility, close operation) when an object is created",
          "To destroy the JFrame window",
          "To import the Swing library",
          "To declare the main method"
        ],
        "correctAnswer": "To hold and run the window setup code (title, size, visibility, close operation) when an object is created",
        "explanation": "\"To hold and run the window setup code (title, size, visibility, close operation) when an object is created\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q06",
        "lessonId": "swing_lesson_1",
        "question": "What does the setTitle() method do?",
        "options": [
          "Sets the text that appears in the window's title bar",
          "Sets the size of the window",
          "Closes the program",
          "Changes the window's background color"
        ],
        "correctAnswer": "Sets the text that appears in the window's title bar",
        "explanation": "\"Sets the text that appears in the window's title bar\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q07",
        "lessonId": "swing_lesson_1",
        "question": "Is setTitle() required for the JFrame window to function?",
        "options": [
          "No, it's optional, but it makes the window look nicer by showing a title in the bar",
          "Yes, without it the program won't compile",
          "Yes, it is required to set the window size",
          "No, it is only used for closing the window"
        ],
        "correctAnswer": "No, it's optional, but it makes the window look nicer by showing a title in the bar",
        "explanation": "\"No, it's optional, but it makes the window look nicer by showing a title in the bar\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q08",
        "lessonId": "swing_lesson_1",
        "question": "Which method sets the window's dimensions, and what default size was used in the video?",
        "options": [
          "setSize(400, 400)",
          "setDimension(400, 400)",
          "setBounds(400)",
          "setWindow(400x400)"
        ],
        "correctAnswer": "setSize(400, 400)",
        "explanation": "\"setSize(400, 400)\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_1_q09",
        "lessonId": "swing_lesson_1",
        "question": "According to the video, can the user resize the window after it opens, even though a default size was set?",
        "options": [
          "Yes, the user can still drag the corners to resize it",
          "No, the size is permanently fixed",
          "Only the developer can resize it through code",
          "The window automatically resizes itself randomly"
        ],
        "correctAnswer": "Yes, the user can still drag the corners to resize it",
        "explanation": "\"Yes, the user can still drag the corners to resize it\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q10",
        "lessonId": "swing_lesson_1",
        "question": "What does setVisible(true) do?",
        "options": [
          "Makes the window appear/show on the screen",
          "Deletes the window",
          "Changes the window's title",
          "Minimizes the window automatically"
        ],
        "correctAnswer": "Makes the window appear/show on the screen",
        "explanation": "\"Makes the window appear/show on the screen\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q11",
        "lessonId": "swing_lesson_1",
        "question": "What would happen if setVisible(false) was used instead of setVisible(true)?",
        "options": [
          "The window would not appear at all",
          "The window would appear twice",
          "The window would appear but without a title",
          "The program would crash immediately"
        ],
        "correctAnswer": "The window would not appear at all",
        "explanation": "\"The window would not appear at all\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q12",
        "lessonId": "swing_lesson_1",
        "question": "Why does the video say a boolean value is needed for setVisible()?",
        "options": [
          "Because Java needs to know whether the value is true or false to decide if the window should show",
          "Because booleans make the code run faster",
          "Because JFrame requires exactly two parameters",
          "Because visibility is measured in numbers, not true/false"
        ],
        "correctAnswer": "Because Java needs to know whether the value is true or false to decide if the window should show",
        "explanation": "\"Because Java needs to know whether the value is true or false to decide if the window should show\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q13",
        "lessonId": "swing_lesson_1",
        "question": "What does setDefaultCloseOperation(EXIT_ON_CLOSE) do?",
        "options": [
          "It makes sure the program fully terminates when the user clicks the X button",
          "It prevents the user from closing the window",
          "It changes the size of the window when closed",
          "It hides the close button"
        ],
        "correctAnswer": "It makes sure the program fully terminates when the user clicks the X button",
        "explanation": "\"It makes sure the program fully terminates when the user clicks the X button\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q14",
        "lessonId": "swing_lesson_1",
        "question": "What problem occurs if setDefaultCloseOperation(EXIT_ON_CLOSE) is NOT included in the program?",
        "options": [
          "Clicking the X button will close the window visually, but the program will keep running in the background",
          "The program will not run at all",
          "The title bar will disappear",
          "The window will not be resizable"
        ],
        "correctAnswer": "Clicking the X button will close the window visually, but the program will keep running in the background",
        "explanation": "\"Clicking the X button will close the window visually, but the program will keep running in the background\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q15",
        "lessonId": "swing_lesson_1",
        "question": "In the main method, which line correctly creates an object of the Tutorial class to run the program, based on the video?",
        "options": [
          "Tutorial t = new Tutorial();",
          "new Tutorial.run();",
          "Tutorial.main(t);",
          "JFrame t = Tutorial();"
        ],
        "correctAnswer": "Tutorial t = new Tutorial();",
        "explanation": "\"Tutorial t = new Tutorial();\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_1_q16",
        "lessonId": "swing_lesson_1",
        "question": "According to the video, what is the advantage of using a constructor and creating an object, instead of writing all the setup code directly inside main()?",
        "options": [
          "It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.",
          "It is required by Java syntax and has no other benefit",
          "It prevents the window from closing",
          "It removes the need for the JFrame import"
        ],
        "correctAnswer": "It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.",
        "explanation": "\"It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_1_q17",
        "lessonId": "swing_lesson_1",
        "question": "What is the correct method signature for the main method shown in the video?",
        "options": [
          "public static void main(String[] args)",
          "public void main(String args)",
          "static main(String args[])",
          "public main(void args)"
        ],
        "correctAnswer": "public static void main(String[] args)",
        "explanation": "\"public static void main(String[] args)\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_1_q18",
        "lessonId": "swing_lesson_1",
        "question": "What happens in Java's execution order according to the video: which runs first, the main method or the constructor?",
        "options": [
          "Java reads the main method first; when the object is created there, it then runs the constructor",
          "The constructor always runs first, then main",
          "They run at exactly the same time",
          "Java randomly decides which runs first"
        ],
        "correctAnswer": "Java reads the main method first; when the object is created there, it then runs the constructor",
        "explanation": "\"Java reads the main method first; when the object is created there, it then runs the constructor\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_1_q19",
        "lessonId": "swing_lesson_1",
        "question": "Which of these best lists, in order, the setup steps performed inside the constructor in the video?",
        "options": [
          "setTitle → setSize → setVisible → setDefaultCloseOperation",
          "setVisible → setSize → setTitle → setDefaultCloseOperation",
          "setDefaultCloseOperation → setTitle → setSize → setVisible",
          "setSize → setDefaultCloseOperation → setTitle → setVisible"
        ],
        "correctAnswer": "setTitle → setSize → setVisible → setDefaultCloseOperation",
        "explanation": "\"setTitle → setSize → setVisible → setDefaultCloseOperation\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_1_q20",
        "lessonId": "swing_lesson_1",
        "question": "What is the overall purpose of this tutorial, as summarized at the end of the video?",
        "options": [
          "To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior",
          "To teach how to connect a Java program to a database",
          "To teach how to create console-based input programs only",
          "To teach advanced game development using Java"
        ],
        "correctAnswer": "To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior",
        "explanation": "\"To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      }
    ]
  },
  {
    "id": "swing_assessment_2",
    "lessonId": "swing_lesson_2",
    "title": "JLabel, JTextField, & JTextArea Quiz",
    "quizType": "Multiple Choice",
    "passingScore": 80,
    "attempts": 3,
    "status": "Published",
    "questions": [
      {
        "id": "swing_lesson_2_q01",
        "lessonId": "swing_lesson_2",
        "question": "What is the main purpose of a JLabel in a Java GUI program?",
        "options": [
          "To display text or a message on the screen (similar to System.out.println() but in GUI form)",
          "To let the user type in text",
          "To create a clickable button",
          "To close the program"
        ],
        "correctAnswer": "To display text or a message on the screen (similar to System.out.println() but in GUI form)",
        "explanation": "\"To display text or a message on the screen (similar to System.out.println() but in GUI form)\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q02",
        "lessonId": "swing_lesson_2",
        "question": "Which import statement is required to use JLabel?",
        "options": [
          "import javax.swing.JLabel;",
          "import java.awt.JLabel;",
          "import javax.gui.JLabel;",
          "import java.util.JLabel;"
        ],
        "correctAnswer": "import javax.swing.JLabel;",
        "explanation": "\"import javax.swing.JLabel;\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q03",
        "lessonId": "swing_lesson_2",
        "question": "What happens if a JLabel object is created but never added to the JFrame (or a panel added to the frame)?",
        "options": [
          "It becomes pointless, since it won't appear on the window",
          "It will still show up automatically",
          "It will replace the JFrame's title",
          "It will cause a compiler error"
        ],
        "correctAnswer": "It becomes pointless, since it won't appear on the window",
        "explanation": "\"It becomes pointless, since it won't appear on the window\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q04",
        "lessonId": "swing_lesson_2",
        "question": "Which method is used to update a JLabel's displayed text after it has already been created?",
        "options": [
          "jl.setText(\"new text\");",
          "jl.getText();",
          "jl.printText();",
          "jl.addText();"
        ],
        "correctAnswer": "jl.setText(\"new text\");",
        "explanation": "\"jl.setText(\"new text\");\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q05",
        "lessonId": "swing_lesson_2",
        "question": "What is the main purpose of a JTextField?",
        "options": [
          "To allow the user to type in and input a single line of text",
          "To display non-editable text only",
          "To organize other components",
          "To display images"
        ],
        "correctAnswer": "To allow the user to type in and input a single line of text",
        "explanation": "\"To allow the user to type in and input a single line of text\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q06",
        "lessonId": "swing_lesson_2",
        "question": "Which import statement is required to use JTextField?",
        "options": [
          "import javax.swing.JTextField;",
          "import java.awt.JTextField;",
          "import javax.text.JTextField;",
          "import java.util.JTextField;"
        ],
        "correctAnswer": "import javax.swing.JTextField;",
        "explanation": "\"import javax.swing.JTextField;\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q07",
        "lessonId": "swing_lesson_2",
        "question": "In a declaration like `new JTextField(30)`, what does the number 30 represent?",
        "options": [
          "The horizontal width/length of the text field",
          "The maximum number of characters allowed",
          "The font size",
          "The number of rows"
        ],
        "correctAnswer": "The horizontal width/length of the text field",
        "explanation": "\"The horizontal width/length of the text field\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q08",
        "lessonId": "swing_lesson_2",
        "question": "Which method retrieves the text a user has typed into a JTextField, as a String?",
        "options": [
          "jt.getText();",
          "jt.readText();",
          "jt.toText();",
          "jt.fetch();"
        ],
        "correctAnswer": "jt.getText();",
        "explanation": "\"jt.getText();\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_2_q09",
        "lessonId": "swing_lesson_2",
        "question": "Which listener/method is typically used to detect when the user presses Enter on a JTextField?",
        "options": [
          "ActionListener with actionPerformed(ActionEvent e)",
          "MouseListener with mouseClicked()",
          "WindowListener with windowClosed()",
          "Thread with run()"
        ],
        "correctAnswer": "ActionListener with actionPerformed(ActionEvent e)",
        "explanation": "\"ActionListener with actionPerformed(ActionEvent e)\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q10",
        "lessonId": "swing_lesson_2",
        "question": "How many rows can a standard JTextField display at once?",
        "options": [
          "Only one row",
          "Up to 5 rows",
          "Unlimited rows",
          "It depends on the screen size"
        ],
        "correctAnswer": "Only one row",
        "explanation": "\"Only one row\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q11",
        "lessonId": "swing_lesson_2",
        "question": "What is the key difference between JTextField and JTextArea?",
        "options": [
          "JTextField can only have one row, while JTextArea can have multiple rows",
          "JTextField can have multiple rows, JTextArea only one row",
          "JTextArea cannot accept any text input",
          "There is no difference"
        ],
        "correctAnswer": "JTextField can only have one row, while JTextArea can have multiple rows",
        "explanation": "\"JTextField can only have one row, while JTextArea can have multiple rows\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q12",
        "lessonId": "swing_lesson_2",
        "question": "Which import statement is required to use JTextArea?",
        "options": [
          "import javax.swing.JTextArea;",
          "import java.awt.JTextArea;",
          "import java.text.JTextArea;",
          "import java.util.JTextArea;"
        ],
        "correctAnswer": "import javax.swing.JTextArea;",
        "explanation": "\"import javax.swing.JTextArea;\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q13",
        "lessonId": "swing_lesson_2",
        "question": "In `new JTextArea(10, 40)`, what do the two arguments represent, in order?",
        "options": [
          "Rows, then columns",
          "Width, then height",
          "Columns, then rows",
          "X position, then Y position"
        ],
        "correctAnswer": "Rows, then columns",
        "explanation": "\"Rows, then columns\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q14",
        "lessonId": "swing_lesson_2",
        "question": "When is JTextArea the better choice compared to JTextField?",
        "options": [
          "When you want the user to type in paragraph form (multiple lines)",
          "When you want the user to type a single short word",
          "When you want to display a button",
          "When you want to display only numbers"
        ],
        "correctAnswer": "When you want the user to type in paragraph form (multiple lines)",
        "explanation": "\"When you want the user to type in paragraph form (multiple lines)\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q15",
        "lessonId": "swing_lesson_2",
        "question": "What generally happens when the user presses Enter while typing inside a JTextArea (unlike in a JTextField)?",
        "options": [
          "It simply creates a new line, since JTextArea supports multiple lines",
          "It submits/triggers an action automatically",
          "It clears all the typed text",
          "It closes the JFrame"
        ],
        "correctAnswer": "It simply creates a new line, since JTextArea supports multiple lines",
        "explanation": "\"It simply creates a new line, since JTextArea supports multiple lines\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_2_q16",
        "lessonId": "swing_lesson_2",
        "question": "Which container is typically used to hold and organize components like JLabel, JTextField, and JTextArea before adding them to the JFrame?",
        "options": [
          "JPanel",
          "JButton",
          "JScrollBar",
          "JMenu"
        ],
        "correctAnswer": "JPanel",
        "explanation": "\"JPanel\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_2_q17",
        "lessonId": "swing_lesson_2",
        "question": "Which method is used to attach a component (such as JLabel, JTextField, or JTextArea) onto a JPanel or JFrame?",
        "options": [
          "add()",
          "append()",
          "insert()",
          "place()"
        ],
        "correctAnswer": "add()",
        "explanation": "\"add()\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_2_q18",
        "lessonId": "swing_lesson_2",
        "question": "Which of these three components — JLabel, JTextField, JTextArea — allow the user to type input?",
        "options": [
          "JTextField and JTextArea",
          "Only JLabel",
          "Only JTextField",
          "All three allow typing"
        ],
        "correctAnswer": "JTextField and JTextArea",
        "explanation": "\"JTextField and JTextArea\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_2_q19",
        "lessonId": "swing_lesson_2",
        "question": "Which package must be imported to use JLabel, JTextField, and JTextArea, since they are all part of the same Swing library?",
        "options": [
          "javax.swing",
          "java.util",
          "java.io",
          "java.text"
        ],
        "correctAnswer": "javax.swing",
        "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_2_q20",
        "lessonId": "swing_lesson_2",
        "question": "A developer wants to build a simple feedback form: a label saying 'Enter your name:', a field for a short name, and a box for a longer comment. Which combination of components should be used?",
        "options": [
          "JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment",
          "JTextArea for everything, since it can handle all types of text",
          "JLabel for both name and comment, no text input components needed",
          "JTextField for everything, including the long comment"
        ],
        "correctAnswer": "JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment",
        "explanation": "\"JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      }
    ]
  },
  {
    "id": "swing_assessment_3",
    "lessonId": "swing_lesson_3",
    "title": "JButton & ActionListener Quiz",
    "quizType": "Multiple Choice",
    "passingScore": 80,
    "attempts": 3,
    "status": "Published",
    "questions": [
      {
        "id": "swing_lesson_3_q01",
        "lessonId": "swing_lesson_3",
        "question": "What is the main purpose of JButton in Java Swing?",
        "options": [
          "To create a clickable button",
          "To create a text field",
          "To create a window",
          "To create a layout"
        ],
        "correctAnswer": "To create a clickable button",
        "explanation": "\"To create a clickable button\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q02",
        "lessonId": "swing_lesson_3",
        "question": "Which package contains JButton?",
        "options": [
          "javax.swing",
          "java.io",
          "java.util",
          "java.awt.event"
        ],
        "correctAnswer": "javax.swing",
        "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q03",
        "lessonId": "swing_lesson_3",
        "question": "Which code correctly creates a button?",
        "options": [
          "JButton button = new JButton(\"Click Me\");",
          "Button button = new Button();",
          "JButton(\"Click Me\");",
          "new Button = JButton(\"Click Me\");"
        ],
        "correctAnswer": "JButton button = new JButton(\"Click Me\");",
        "explanation": "\"JButton button = new JButton(\"Click Me\");\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q04",
        "lessonId": "swing_lesson_3",
        "question": "What text will appear on this button? JButton button = new JButton(\"Submit\");",
        "options": [
          "Submit",
          "Button",
          "JButton",
          "Click"
        ],
        "correctAnswer": "Submit",
        "explanation": "\"Submit\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q05",
        "lessonId": "swing_lesson_3",
        "question": "What is the purpose of ActionListener?",
        "options": [
          "To detect and respond to user actions",
          "To create a window",
          "To change the window size",
          "To create a panel"
        ],
        "correctAnswer": "To detect and respond to user actions",
        "explanation": "\"To detect and respond to user actions\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q06",
        "lessonId": "swing_lesson_3",
        "question": "Which method is used to add an ActionListener to a button?",
        "options": [
          "addActionListener()",
          "addButton()",
          "setAction()",
          "actionButton()"
        ],
        "correctAnswer": "addActionListener()",
        "explanation": "\"addActionListener()\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q07",
        "lessonId": "swing_lesson_3",
        "question": "What action is commonly detected by an ActionListener attached to a JButton?",
        "options": [
          "Clicking",
          "Typing",
          "Scrolling",
          "Resizing"
        ],
        "correctAnswer": "Clicking",
        "explanation": "\"Clicking\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q08",
        "lessonId": "swing_lesson_3",
        "question": "What does button.addActionListener(e -> { System.out.println(\"Hello!\"); }); do?",
        "options": [
          "Prints \"Hello!\" when the button is clicked",
          "Creates a button",
          "Creates a window",
          "Deletes the button"
        ],
        "correctAnswer": "Prints \"Hello!\" when the button is clicked",
        "explanation": "\"Prints \"Hello!\" when the button is clicked\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_3_q09",
        "lessonId": "swing_lesson_3",
        "question": "What does System.out.println() do?",
        "options": [
          "Displays output in the console",
          "Creates a button",
          "Changes the GUI layout",
          "Creates a JFrame"
        ],
        "correctAnswer": "Displays output in the console",
        "explanation": "\"Displays output in the console\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q10",
        "lessonId": "swing_lesson_3",
        "question": "What does label.setText(\"Welcome!\"); do?",
        "options": [
          "Changes the label's displayed text",
          "Creates a label",
          "Deletes the label",
          "Creates a button"
        ],
        "correctAnswer": "Changes the label's displayed text",
        "explanation": "\"Changes the label's displayed text\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q11",
        "lessonId": "swing_lesson_3",
        "question": "What Swing component is used to display text?",
        "options": [
          "JLabel",
          "JButton",
          "JPanel",
          "JFrame"
        ],
        "correctAnswer": "JLabel",
        "explanation": "\"JLabel\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q12",
        "lessonId": "swing_lesson_3",
        "question": "What happens when setVisible(true) is called on a JFrame?",
        "options": [
          "The frame becomes visible",
          "The program closes",
          "The button disappears",
          "The console opens"
        ],
        "correctAnswer": "The frame becomes visible",
        "explanation": "\"The frame becomes visible\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q13",
        "lessonId": "swing_lesson_3",
        "question": "What is the purpose of JFrame?",
        "options": [
          "To create the main application window",
          "To listen for button clicks",
          "To display console messages",
          "To arrange buttons"
        ],
        "correctAnswer": "To create the main application window",
        "explanation": "\"To create the main application window\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q14",
        "lessonId": "swing_lesson_3",
        "question": "What does setSize(400, 250) do?",
        "options": [
          "Sets the window's width and height",
          "Sets the button text",
          "Sets the panel layout",
          "Sets the font size"
        ],
        "correctAnswer": "Sets the window's width and height",
        "explanation": "\"Sets the window's width and height\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q15",
        "lessonId": "swing_lesson_3",
        "question": "What does JFrame.EXIT_ON_CLOSE do?",
        "options": [
          "Ends the program when the window is closed",
          "Hides the window",
          "Restarts the program",
          "Changes the title"
        ],
        "correctAnswer": "Ends the program when the window is closed",
        "explanation": "\"Ends the program when the window is closed\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_3_q16",
        "lessonId": "swing_lesson_3",
        "question": "What happens after label.setText(\"Button was clicked!\");?",
        "options": [
          "The label text changes",
          "The button disappears",
          "The window closes",
          "Nothing happens"
        ],
        "correctAnswer": "The label text changes",
        "explanation": "\"The label text changes\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_3_q17",
        "lessonId": "swing_lesson_3",
        "question": "Which two components are mainly being demonstrated in Part 3?",
        "options": [
          "JButton and ActionListener",
          "JPanel and GridLayout",
          "JFrame and BorderLayout",
          "JLabel and FlowLayout"
        ],
        "correctAnswer": "JButton and ActionListener",
        "explanation": "\"JButton and ActionListener\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_3_q18",
        "lessonId": "swing_lesson_3",
        "question": "Why is ActionListener important?",
        "options": [
          "It makes the GUI interactive",
          "It changes the computer's settings",
          "It creates Java classes",
          "It imports Swing"
        ],
        "correctAnswer": "It makes the GUI interactive",
        "explanation": "\"It makes the GUI interactive\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_3_q19",
        "lessonId": "swing_lesson_3",
        "question": "What would happen if the JButton had no ActionListener?",
        "options": [
          "It could still appear, but clicking it would not perform the programmed action",
          "The JFrame would automatically close",
          "The button would not be created",
          "Java would always shut down"
        ],
        "correctAnswer": "It could still appear, but clicking it would not perform the programmed action",
        "explanation": "\"It could still appear, but clicking it would not perform the programmed action\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_3_q20",
        "lessonId": "swing_lesson_3",
        "question": "What is the expected result of clicking the Click Me button?",
        "options": [
          "The label changes to Button was clicked! and a message appears in the console",
          "The window closes",
          "A new JFrame opens",
          "The button changes into a text field"
        ],
        "correctAnswer": "The label changes to Button was clicked! and a message appears in the console",
        "explanation": "\"The label changes to Button was clicked! and a message appears in the console\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      }
    ]
  },
  {
    "id": "swing_assessment_4",
    "lessonId": "swing_lesson_4",
    "title": "JPanel & Layout Managers Quiz",
    "quizType": "Multiple Choice",
    "passingScore": 80,
    "attempts": 3,
    "status": "Published",
    "questions": [
      {
        "id": "swing_lesson_4_q01",
        "lessonId": "swing_lesson_4",
        "question": "What is the main purpose of JPanel?",
        "options": [
          "To group and organize GUI components",
          "To create a database",
          "To listen for button clicks",
          "To display console output"
        ],
        "correctAnswer": "To group and organize GUI components",
        "explanation": "\"To group and organize GUI components\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q02",
        "lessonId": "swing_lesson_4",
        "question": "Which package contains JPanel?",
        "options": [
          "javax.swing",
          "java.io",
          "java.sql",
          "java.util"
        ],
        "correctAnswer": "javax.swing",
        "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q03",
        "lessonId": "swing_lesson_4",
        "question": "What is a Layout Manager used for?",
        "options": [
          "To control the arrangement of components",
          "To create Java classes",
          "To print messages",
          "To close the application"
        ],
        "correctAnswer": "To control the arrangement of components",
        "explanation": "\"To control the arrangement of components\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q04",
        "lessonId": "swing_lesson_4",
        "question": "Which Layout Manager arranges components from left to right?",
        "options": [
          "FlowLayout",
          "BorderLayout",
          "GridLayout",
          "CardLayout"
        ],
        "correctAnswer": "FlowLayout",
        "explanation": "\"FlowLayout\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q05",
        "lessonId": "swing_lesson_4",
        "question": "Which code creates a JPanel using FlowLayout?",
        "options": [
          "JPanel panel = new JPanel(new FlowLayout());",
          "JPanel panel = FlowLayout();",
          "FlowLayout panel = new JPanel();",
          "new FlowPanel(FlowLayout);"
        ],
        "correctAnswer": "JPanel panel = new JPanel(new FlowLayout());",
        "explanation": "\"JPanel panel = new JPanel(new FlowLayout());\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q06",
        "lessonId": "swing_lesson_4",
        "question": "What is the default behavior of FlowLayout?",
        "options": [
          "Arranges components from left to right",
          "Arranges components in a grid",
          "Places everything in the center",
          "Places components only at the bottom"
        ],
        "correctAnswer": "Arranges components from left to right",
        "explanation": "\"Arranges components from left to right\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q07",
        "lessonId": "swing_lesson_4",
        "question": "Which Layout Manager divides a container into North, South, East, West, and Center?",
        "options": [
          "BorderLayout",
          "FlowLayout",
          "GridLayout",
          "BoxLayout"
        ],
        "correctAnswer": "BorderLayout",
        "explanation": "\"BorderLayout\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q08",
        "lessonId": "swing_lesson_4",
        "question": "How many main areas does BorderLayout have?",
        "options": [
          "5",
          "2",
          "3",
          "4"
        ],
        "correctAnswer": "5",
        "explanation": "\"5\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_4_q09",
        "lessonId": "swing_lesson_4",
        "question": "Which position represents the top area in BorderLayout?",
        "options": [
          "BorderLayout.NORTH",
          "BorderLayout.SOUTH",
          "BorderLayout.EAST",
          "BorderLayout.CENTER"
        ],
        "correctAnswer": "BorderLayout.NORTH",
        "explanation": "\"BorderLayout.NORTH\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q10",
        "lessonId": "swing_lesson_4",
        "question": "Which position represents the bottom area?",
        "options": [
          "BorderLayout.SOUTH",
          "BorderLayout.NORTH",
          "BorderLayout.WEST",
          "BorderLayout.EAST"
        ],
        "correctAnswer": "BorderLayout.SOUTH",
        "explanation": "\"BorderLayout.SOUTH\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q11",
        "lessonId": "swing_lesson_4",
        "question": "Which Layout Manager arranges components into rows and columns?",
        "options": [
          "GridLayout",
          "FlowLayout",
          "BorderLayout",
          "JFrame"
        ],
        "correctAnswer": "GridLayout",
        "explanation": "\"GridLayout\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q12",
        "lessonId": "swing_lesson_4",
        "question": "What does new GridLayout(2, 2) mean?",
        "options": [
          "2 rows and 2 columns",
          "2 buttons and 2 panels",
          "2 windows and 2 buttons",
          "2 columns and 4 rows"
        ],
        "correctAnswer": "2 rows and 2 columns",
        "explanation": "\"2 rows and 2 columns\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q13",
        "lessonId": "swing_lesson_4",
        "question": "How many spaces are available in a GridLayout(2, 2)?",
        "options": [
          "4",
          "2",
          "3",
          "6"
        ],
        "correctAnswer": "4",
        "explanation": "\"4\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q14",
        "lessonId": "swing_lesson_4",
        "question": "If four buttons are added to a GridLayout(2, 2), how will they be arranged?",
        "options": [
          "In two rows and two columns",
          "In one horizontal line",
          "All in the center",
          "Only at the bottom"
        ],
        "correctAnswer": "In two rows and two columns",
        "explanation": "\"In two rows and two columns\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q15",
        "lessonId": "swing_lesson_4",
        "question": "What does mainPanel.add(topPanel, BorderLayout.NORTH); do?",
        "options": [
          "Places the top panel in the North area",
          "Removes the top panel",
          "Places the top panel in the center",
          "Creates a new JFrame"
        ],
        "correctAnswer": "Places the top panel in the North area",
        "explanation": "\"Places the top panel in the North area\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_4_q16",
        "lessonId": "swing_lesson_4",
        "question": "What is the purpose of the mainPanel in our example?",
        "options": [
          "It organizes the different panels using BorderLayout",
          "It prints messages",
          "It listens for clicks",
          "It creates a database"
        ],
        "correctAnswer": "It organizes the different panels using BorderLayout",
        "explanation": "\"It organizes the different panels using BorderLayout\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_4_q17",
        "lessonId": "swing_lesson_4",
        "question": "In our example, where is the GridLayout panel placed?",
        "options": [
          "Center",
          "North",
          "South",
          "West"
        ],
        "correctAnswer": "Center",
        "explanation": "\"Center\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_4_q18",
        "lessonId": "swing_lesson_4",
        "question": "In our example, where is the FlowLayout panel placed?",
        "options": [
          "North",
          "South",
          "East",
          "Center"
        ],
        "correctAnswer": "North",
        "explanation": "\"North\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_4_q19",
        "lessonId": "swing_lesson_4",
        "question": "Why are Layout Managers useful?",
        "options": [
          "They automatically organize GUI components",
          "They remove all buttons",
          "They replace Java code",
          "They connect to the internet"
        ],
        "correctAnswer": "They automatically organize GUI components",
        "explanation": "\"They automatically organize GUI components\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_4_q20",
        "lessonId": "swing_lesson_4",
        "question": "Which statement correctly describes the three layouts discussed?",
        "options": [
          "FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns",
          "FlowLayout uses rows and columns, GridLayout uses five areas, BorderLayout uses left-to-right arrangement",
          "All three layouts work exactly the same way",
          "BorderLayout is only used for buttons"
        ],
        "correctAnswer": "FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns",
        "explanation": "\"FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      }
    ]
  },
  {
    "id": "swing_assessment_5",
    "lessonId": "swing_lesson_5",
    "title": "JOptionPane Dialogs Quiz",
    "quizType": "Multiple Choice",
    "passingScore": 80,
    "attempts": 3,
    "status": "Published",
    "questions": [
      {
        "id": "swing_lesson_5_q01",
        "lessonId": "swing_lesson_5",
        "question": "What is the main purpose of JOptionPane in Java Swing?",
        "options": [
          "Creating dialog boxes",
          "Creating database tables",
          "Managing network connections",
          "Compiling Java programs"
        ],
        "correctAnswer": "Creating dialog boxes",
        "explanation": "\"Creating dialog boxes\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q02",
        "lessonId": "swing_lesson_5",
        "question": "Which import statement is needed to use JOptionPane?",
        "options": [
          "import javax.swing.JOptionPane;",
          "import java.util.JOptionPane;",
          "import java.awt.JOptionPane;",
          "import javax.io.JOptionPane;"
        ],
        "correctAnswer": "import javax.swing.JOptionPane;",
        "explanation": "\"import javax.swing.JOptionPane;\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q03",
        "lessonId": "swing_lesson_5",
        "question": "Which JOptionPane method is used to display a message to the user?",
        "options": [
          "showMessageDialog()",
          "showInputDialog()",
          "showConfirmDialog()",
          "showTextDialog()"
        ],
        "correctAnswer": "showMessageDialog()",
        "explanation": "\"showMessageDialog()\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q04",
        "lessonId": "swing_lesson_5",
        "question": "Which JOptionPane method is used to ask the user to enter information?",
        "options": [
          "showInputDialog()",
          "showMessageDialog()",
          "showConfirmDialog()",
          "showEntryDialog()"
        ],
        "correctAnswer": "showInputDialog()",
        "explanation": "\"showInputDialog()\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q05",
        "lessonId": "swing_lesson_5",
        "question": "What type of value does showInputDialog() normally return?",
        "options": [
          "String",
          "int",
          "double",
          "boolean"
        ],
        "correctAnswer": "String",
        "explanation": "\"String\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q06",
        "lessonId": "swing_lesson_5",
        "question": "What does this statement do? String name = JOptionPane.showInputDialog( null, \"Enter your name:\" );",
        "options": [
          "Gets user input and stores it in name",
          "Displays a fixed message only",
          "Converts name into an integer",
          "Creates a JFrame window"
        ],
        "correctAnswer": "Gets user input and stores it in name",
        "explanation": "\"Gets user input and stores it in name\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q07",
        "lessonId": "swing_lesson_5",
        "question": "What does the null argument commonly represent in a simple JOptionPane dialog?",
        "options": [
          "No parent component",
          "An empty user input",
          "A hidden password",
          "A numerical zero"
        ],
        "correctAnswer": "No parent component",
        "explanation": "\"No parent component\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q08",
        "lessonId": "swing_lesson_5",
        "question": "Why is Integer.parseInt(ageInput) used after getting age with showInputDialog()?",
        "options": [
          "To convert text into an integer",
          "To convert an integer into text",
          "To display a message",
          "To create a confirmation box"
        ],
        "correctAnswer": "To convert text into an integer",
        "explanation": "\"To convert text into an integer\" is the correct answer according to the lesson material.",
        "difficulty": "Easy"
      },
      {
        "id": "swing_lesson_5_q09",
        "lessonId": "swing_lesson_5",
        "question": "What happens if the user enters 20 and the program executes: int age = Integer.parseInt(ageInput);",
        "options": [
          "The text \"20\" becomes integer 20",
          "The integer 20 becomes the text \"age\"",
          "The value becomes 2.0",
          "The value becomes true"
        ],
        "correctAnswer": "The text \"20\" becomes integer 20",
        "explanation": "\"The text \"20\" becomes integer 20\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q10",
        "lessonId": "swing_lesson_5",
        "question": "Which escape sequence is used to create a new line in a Java String?",
        "options": [
          "\\n",
          "\\t",
          "\\s",
          "\\b"
        ],
        "correctAnswer": "\\n",
        "explanation": "\"\\n\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q11",
        "lessonId": "swing_lesson_5",
        "question": "Which method is appropriate for asking the user a Yes or No confirmation?",
        "options": [
          "showConfirmDialog()",
          "showMessageDialog()",
          "showInputDialog()",
          "showOptionDialog()"
        ],
        "correctAnswer": "showConfirmDialog()",
        "explanation": "\"showConfirmDialog()\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q12",
        "lessonId": "swing_lesson_5",
        "question": "Which constant is commonly used to create Yes and No buttons with showConfirmDialog()?",
        "options": [
          "JOptionPane.YES_NO_OPTION",
          "JOptionPane.OK_CANCEL_OPTION",
          "JOptionPane.ERROR_MESSAGE",
          "JOptionPane.INFORMATION_MESSAGE"
        ],
        "correctAnswer": "JOptionPane.YES_NO_OPTION",
        "explanation": "\"JOptionPane.YES_NO_OPTION\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q13",
        "lessonId": "swing_lesson_5",
        "question": "Which constant represents an information message type in JOptionPane?",
        "options": [
          "JOptionPane.INFORMATION_MESSAGE",
          "JOptionPane.YES_NO_OPTION",
          "JOptionPane.ERROR_OPTION",
          "JOptionPane.INPUT_MESSAGE"
        ],
        "correctAnswer": "JOptionPane.INFORMATION_MESSAGE",
        "explanation": "\"JOptionPane.INFORMATION_MESSAGE\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q14",
        "lessonId": "swing_lesson_5",
        "question": "Which constant is used for an error message icon in JOptionPane?",
        "options": [
          "JOptionPane.ERROR_MESSAGE",
          "JOptionPane.WARNING_MESSAGE",
          "JOptionPane.INFORMATION_MESSAGE",
          "JOptionPane.QUESTION_MESSAGE"
        ],
        "correctAnswer": "JOptionPane.ERROR_MESSAGE",
        "explanation": "\"JOptionPane.ERROR_MESSAGE\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q15",
        "lessonId": "swing_lesson_5",
        "question": "Which constant represents a warning message type?",
        "options": [
          "JOptionPane.WARNING_MESSAGE",
          "JOptionPane.ERROR_MESSAGE",
          "JOptionPane.YES_NO_OPTION",
          "JOptionPane.INPUT_VALUE"
        ],
        "correctAnswer": "JOptionPane.WARNING_MESSAGE",
        "explanation": "\"JOptionPane.WARNING_MESSAGE\" is the correct answer according to the lesson material.",
        "difficulty": "Medium"
      },
      {
        "id": "swing_lesson_5_q16",
        "lessonId": "swing_lesson_5",
        "question": "What will the following code display if name contains \"Alex\"? JOptionPane.showMessageDialog( null, \"Hello, \" + name + \"!\" );",
        "options": [
          "Hello, Alex!",
          "Hello, name!",
          "Alex, Hello!",
          "Hello! Alex"
        ],
        "correctAnswer": "Hello, Alex!",
        "explanation": "\"Hello, Alex!\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_5_q17",
        "lessonId": "swing_lesson_5",
        "question": "Which statement correctly displays a student's name, age, and course on separate lines?",
        "options": [
          "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course",
          "\"Name: \" + name + \"\\t\" + \"Age: \" + age + \"\\t\" + \"Course: \" + course",
          "\"Name: \" + name + \" \" + \"Age: \" + age + \" \" + \"Course: \" + course",
          "\"Name: \" + name + \"\\b\" + \"Age: \" + age + \"\\b\" + \"Course: \" + course"
        ],
        "correctAnswer": "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course",
        "explanation": "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_5_q18",
        "lessonId": "swing_lesson_5",
        "question": "Which statement best describes showMessageDialog()?",
        "options": [
          "It displays information in a dialog box",
          "It collects text from the user",
          "It converts text into an integer",
          "It creates a package in Java"
        ],
        "correctAnswer": "It displays information in a dialog box",
        "explanation": "\"It displays information in a dialog box\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_5_q19",
        "lessonId": "swing_lesson_5",
        "question": "Which statement best describes showConfirmDialog()?",
        "options": [
          "It collects a confirmation choice",
          "It displays only informational text",
          "It converts String input to int",
          "It creates a Java class"
        ],
        "correctAnswer": "It collects a confirmation choice",
        "explanation": "\"It collects a confirmation choice\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      },
      {
        "id": "swing_lesson_5_q20",
        "lessonId": "swing_lesson_5",
        "question": "Which sequence correctly describes the Student Information example?",
        "options": [
          "Display welcome → get name → get age → convert age → get course → display information",
          "Convert age → display course → create JFrame → get name → display welcome",
          "Get course → display error → convert name → create button → display age",
          "Create database → get password → create JFrame → convert course → display information"
        ],
        "correctAnswer": "Display welcome → get name → get age → convert age → get course → display information",
        "explanation": "\"Display welcome → get name → get age → convert age → get course → display information\" is the correct answer according to the lesson material.",
        "difficulty": "Hard"
      }
    ]
  }
];

const JAVA_SWING_EXERCISES = [
  {
    "id": "swing_exercise_1",
    "topicId": "swing-introduction",
    "lessonId": "swing_lesson_1",
    "assessmentId": "swing_assessment_1",
    "title": "Create a JFrame containing a JLabel",
    "description": "Build a simple Swing window that displays a welcome label.",
    "learningObjectives": [
      "Create a JFrame.",
      "Add a JLabel.",
      "Configure frame size and visibility."
    ],
    "requirements": [
      "Use JFrame",
      "Use JLabel",
      "Call setVisible(true)"
    ],
    "starterCode": "import javax.swing.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        JFrame frame = new JFrame(\"Swing Label\");\n        // Add a JLabel and show the frame.\n    }\n}\n",
    "sampleInput": "No stdin required",
    "sampleOutput": "A JFrame displays a JLabel",
    "passingScore": 80,
    "testCases": [
      {
        "id": "frame",
        "input": "",
        "expectedOutput": "JFrame found",
        "isHidden": false,
        "matcher": "new\\s+JFrame"
      },
      {
        "id": "label",
        "input": "",
        "expectedOutput": "JLabel found",
        "isHidden": true,
        "matcher": "new\\s+JLabel"
      },
      {
        "id": "visible",
        "input": "",
        "expectedOutput": "Frame visible",
        "isHidden": true,
        "matcher": "setVisible\\s*\\(\\s*true\\s*\\)"
      }
    ],
    "createdAt": "2026-07-28T00:00:00.000Z"
  },
  {
    "id": "swing_exercise_2",
    "topicId": "swing-text-fields",
    "lessonId": "swing_lesson_2",
    "assessmentId": "swing_assessment_2",
    "title": "Create a Text Input Form",
    "description": "Create an input interface containing a JTextField for a short input and a JTextArea for a long input, added to a JPanel.",
    "learningObjectives": [
      "Use JTextField.",
      "Use JTextArea.",
      "Organize components on a JPanel."
    ],
    "requirements": [
      "Use JTextField",
      "Use JTextArea",
      "Use JPanel"
    ],
    "starterCode": "import javax.swing.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        JPanel panel = new JPanel();\n        // Create JTextField and JTextArea, then add them to the panel.\n    }\n}\n",
    "sampleInput": "No stdin required",
    "sampleOutput": "Text inputs form created",
    "passingScore": 80,
    "testCases": [
      {
        "id": "textfield",
        "input": "",
        "expectedOutput": "JTextField found",
        "isHidden": false,
        "matcher": "new\\s+JTextField"
      },
      {
        "id": "textarea",
        "input": "",
        "expectedOutput": "JTextArea found",
        "isHidden": true,
        "matcher": "new\\s+JTextArea"
      },
      {
        "id": "panel",
        "input": "",
        "expectedOutput": "JPanel found",
        "isHidden": true,
        "matcher": "new\\s+JPanel"
      }
    ],
    "createdAt": "2026-07-28T00:00:00.000Z"
  },
  {
    "id": "swing_exercise_3",
    "topicId": "swing-buttons",
    "lessonId": "swing_lesson_3",
    "assessmentId": "swing_assessment_3",
    "title": "Create a Click Counter Button",
    "description": "Design a button that increments a counter and displays the count when clicked.",
    "learningObjectives": [
      "Create a JButton.",
      "Attach an ActionListener.",
      "Handle button click events."
    ],
    "requirements": [
      "Use JButton",
      "Use addActionListener"
    ],
    "starterCode": "import javax.swing.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        JButton button = new JButton(\"Click Me\");\n        // Register an ActionListener using a lambda expression to listen for clicks.\n    }\n}\n",
    "sampleInput": "No stdin required",
    "sampleOutput": "Interactive click button created",
    "passingScore": 80,
    "testCases": [
      {
        "id": "button",
        "input": "",
        "expectedOutput": "JButton found",
        "isHidden": false,
        "matcher": "new\\s+JButton"
      },
      {
        "id": "listener",
        "input": "",
        "expectedOutput": "ActionListener found",
        "isHidden": true,
        "matcher": "addActionListener"
      }
    ],
    "createdAt": "2026-07-28T00:00:00.000Z"
  },
  {
    "id": "swing_exercise_4",
    "topicId": "swing-layouts",
    "lessonId": "swing_lesson_4",
    "assessmentId": "swing_assessment_4",
    "title": "Create a Grid Layout Panel",
    "description": "Design a panel using GridLayout with 2 rows and 2 columns to arrange components.",
    "learningObjectives": [
      "Use a layout manager.",
      "Create a GridLayout.",
      "Structure a grid panel."
    ],
    "requirements": [
      "Use JPanel",
      "Use GridLayout"
    ],
    "starterCode": "import javax.swing.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        JPanel panel = new JPanel();\n        // Set layout to GridLayout and add components.\n    }\n}\n",
    "sampleInput": "No stdin required",
    "sampleOutput": "GridLayout panel created",
    "passingScore": 80,
    "testCases": [
      {
        "id": "panel",
        "input": "",
        "expectedOutput": "JPanel found",
        "isHidden": false,
        "matcher": "new\\s+JPanel"
      },
      {
        "id": "layout",
        "input": "",
        "expectedOutput": "GridLayout found",
        "isHidden": true,
        "matcher": "new\\s+GridLayout|GridLayout\\s*\\("
      }
    ],
    "createdAt": "2026-07-28T00:00:00.000Z"
  },
  {
    "id": "swing_exercise_5",
    "topicId": "swing-dialogs",
    "lessonId": "swing_lesson_5",
    "assessmentId": "swing_assessment_5",
    "title": "JOptionPane Input and Output",
    "description": "Build a popup workflow that asks the user for their name and age using showInputDialog, converts the age to an integer, and shows a welcome message using showMessageDialog.",
    "learningObjectives": [
      "Prompt user inputs with JOptionPane.",
      "Show messages using JOptionPane.",
      "Convert string to integer."
    ],
    "requirements": [
      "Use JOptionPane.showInputDialog",
      "Use JOptionPane.showMessageDialog",
      "Use Integer.parseInt"
    ],
    "starterCode": "import javax.swing.JOptionPane;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Prompt for name and age, parse the age, and show message dialog.\n    }\n}\n",
    "sampleInput": "No stdin required",
    "sampleOutput": "JOptionPane popups created",
    "passingScore": 80,
    "testCases": [
      {
        "id": "input",
        "input": "",
        "expectedOutput": "showInputDialog found",
        "isHidden": false,
        "matcher": "JOptionPane\\s*\\.\\s*showInputDialog"
      },
      {
        "id": "message",
        "input": "",
        "expectedOutput": "showMessageDialog found",
        "isHidden": true,
        "matcher": "JOptionPane\\s*\\.\\s*showMessageDialog"
      },
      {
        "id": "parse",
        "input": "",
        "expectedOutput": "Integer.parseInt found",
        "isHidden": true,
        "matcher": "Integer\\s*\\.\\s*parseInt"
      }
    ],
    "createdAt": "2026-07-28T00:00:00.000Z"
  }
];

const SWING_QUESTIONS_BY_LESSON = {
  "swing_lesson_1": [
    {
      "id": "swing_lesson_1_q01",
      "lessonId": "swing_lesson_1",
      "question": "What does GUI stand for?",
      "options": [
        "Graphical User Interface",
        "General User Instruction",
        "Global Unified Interface",
        "Graphic Utility Index"
      ],
      "correctAnswer": "Graphical User Interface",
      "explanation": "\"Graphical User Interface\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q02",
      "lessonId": "swing_lesson_1",
      "question": "Which import statement is required to use the JFrame class, as shown in the video?",
      "options": [
        "import javax.swing.JFrame;",
        "import java.util.JFrame;",
        "import java.awt.JFrame;",
        "import javax.gui.JFrame;"
      ],
      "correctAnswer": "import javax.swing.JFrame;",
      "explanation": "\"import javax.swing.JFrame;\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q03",
      "lessonId": "swing_lesson_1",
      "question": "In the video, what must the class do in order to gain JFrame's window-creating abilities?",
      "options": [
        "extends JFrame",
        "implement JFrame",
        "import JFrame as a variable",
        "call JFrame.create()"
      ],
      "correctAnswer": "extends JFrame",
      "explanation": "\"extends JFrame\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q04",
      "lessonId": "swing_lesson_1",
      "question": "In the phrase 'public class Tutorial extends JFrame', what is JFrame considered in relation to Tutorial?",
      "options": [
        "JFrame is the superclass (parent class), Tutorial is the child class",
        "JFrame is the subclass, Tutorial is the superclass",
        "They are unrelated classes",
        "JFrame is an interface implemented by Tutorial"
      ],
      "correctAnswer": "JFrame is the superclass (parent class), Tutorial is the child class",
      "explanation": "\"JFrame is the superclass (parent class), Tutorial is the child class\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q05",
      "lessonId": "swing_lesson_1",
      "question": "What is the purpose of the constructor in the Tutorial class in this example?",
      "options": [
        "To hold and run the window setup code (title, size, visibility, close operation) when an object is created",
        "To destroy the JFrame window",
        "To import the Swing library",
        "To declare the main method"
      ],
      "correctAnswer": "To hold and run the window setup code (title, size, visibility, close operation) when an object is created",
      "explanation": "\"To hold and run the window setup code (title, size, visibility, close operation) when an object is created\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q06",
      "lessonId": "swing_lesson_1",
      "question": "What does the setTitle() method do?",
      "options": [
        "Sets the text that appears in the window's title bar",
        "Sets the size of the window",
        "Closes the program",
        "Changes the window's background color"
      ],
      "correctAnswer": "Sets the text that appears in the window's title bar",
      "explanation": "\"Sets the text that appears in the window's title bar\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q07",
      "lessonId": "swing_lesson_1",
      "question": "Is setTitle() required for the JFrame window to function?",
      "options": [
        "No, it's optional, but it makes the window look nicer by showing a title in the bar",
        "Yes, without it the program won't compile",
        "Yes, it is required to set the window size",
        "No, it is only used for closing the window"
      ],
      "correctAnswer": "No, it's optional, but it makes the window look nicer by showing a title in the bar",
      "explanation": "\"No, it's optional, but it makes the window look nicer by showing a title in the bar\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q08",
      "lessonId": "swing_lesson_1",
      "question": "Which method sets the window's dimensions, and what default size was used in the video?",
      "options": [
        "setSize(400, 400)",
        "setDimension(400, 400)",
        "setBounds(400)",
        "setWindow(400x400)"
      ],
      "correctAnswer": "setSize(400, 400)",
      "explanation": "\"setSize(400, 400)\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_1_q09",
      "lessonId": "swing_lesson_1",
      "question": "According to the video, can the user resize the window after it opens, even though a default size was set?",
      "options": [
        "Yes, the user can still drag the corners to resize it",
        "No, the size is permanently fixed",
        "Only the developer can resize it through code",
        "The window automatically resizes itself randomly"
      ],
      "correctAnswer": "Yes, the user can still drag the corners to resize it",
      "explanation": "\"Yes, the user can still drag the corners to resize it\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q10",
      "lessonId": "swing_lesson_1",
      "question": "What does setVisible(true) do?",
      "options": [
        "Makes the window appear/show on the screen",
        "Deletes the window",
        "Changes the window's title",
        "Minimizes the window automatically"
      ],
      "correctAnswer": "Makes the window appear/show on the screen",
      "explanation": "\"Makes the window appear/show on the screen\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q11",
      "lessonId": "swing_lesson_1",
      "question": "What would happen if setVisible(false) was used instead of setVisible(true)?",
      "options": [
        "The window would not appear at all",
        "The window would appear twice",
        "The window would appear but without a title",
        "The program would crash immediately"
      ],
      "correctAnswer": "The window would not appear at all",
      "explanation": "\"The window would not appear at all\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q12",
      "lessonId": "swing_lesson_1",
      "question": "Why does the video say a boolean value is needed for setVisible()?",
      "options": [
        "Because Java needs to know whether the value is true or false to decide if the window should show",
        "Because booleans make the code run faster",
        "Because JFrame requires exactly two parameters",
        "Because visibility is measured in numbers, not true/false"
      ],
      "correctAnswer": "Because Java needs to know whether the value is true or false to decide if the window should show",
      "explanation": "\"Because Java needs to know whether the value is true or false to decide if the window should show\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q13",
      "lessonId": "swing_lesson_1",
      "question": "What does setDefaultCloseOperation(EXIT_ON_CLOSE) do?",
      "options": [
        "It makes sure the program fully terminates when the user clicks the X button",
        "It prevents the user from closing the window",
        "It changes the size of the window when closed",
        "It hides the close button"
      ],
      "correctAnswer": "It makes sure the program fully terminates when the user clicks the X button",
      "explanation": "\"It makes sure the program fully terminates when the user clicks the X button\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q14",
      "lessonId": "swing_lesson_1",
      "question": "What problem occurs if setDefaultCloseOperation(EXIT_ON_CLOSE) is NOT included in the program?",
      "options": [
        "Clicking the X button will close the window visually, but the program will keep running in the background",
        "The program will not run at all",
        "The title bar will disappear",
        "The window will not be resizable"
      ],
      "correctAnswer": "Clicking the X button will close the window visually, but the program will keep running in the background",
      "explanation": "\"Clicking the X button will close the window visually, but the program will keep running in the background\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q15",
      "lessonId": "swing_lesson_1",
      "question": "In the main method, which line correctly creates an object of the Tutorial class to run the program, based on the video?",
      "options": [
        "Tutorial t = new Tutorial();",
        "new Tutorial.run();",
        "Tutorial.main(t);",
        "JFrame t = Tutorial();"
      ],
      "correctAnswer": "Tutorial t = new Tutorial();",
      "explanation": "\"Tutorial t = new Tutorial();\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_1_q16",
      "lessonId": "swing_lesson_1",
      "question": "According to the video, what is the advantage of using a constructor and creating an object, instead of writing all the setup code directly inside main()?",
      "options": [
        "It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.",
        "It is required by Java syntax and has no other benefit",
        "It prevents the window from closing",
        "It removes the need for the JFrame import"
      ],
      "correctAnswer": "It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.",
      "explanation": "\"It's faster and more organized, since creating one object automatically runs all the setup code in the constructor instead of repeatedly typing t.setTitle(), t.setSize(), etc.\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_1_q17",
      "lessonId": "swing_lesson_1",
      "question": "What is the correct method signature for the main method shown in the video?",
      "options": [
        "public static void main(String[] args)",
        "public void main(String args)",
        "static main(String args[])",
        "public main(void args)"
      ],
      "correctAnswer": "public static void main(String[] args)",
      "explanation": "\"public static void main(String[] args)\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_1_q18",
      "lessonId": "swing_lesson_1",
      "question": "What happens in Java's execution order according to the video: which runs first, the main method or the constructor?",
      "options": [
        "Java reads the main method first; when the object is created there, it then runs the constructor",
        "The constructor always runs first, then main",
        "They run at exactly the same time",
        "Java randomly decides which runs first"
      ],
      "correctAnswer": "Java reads the main method first; when the object is created there, it then runs the constructor",
      "explanation": "\"Java reads the main method first; when the object is created there, it then runs the constructor\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_1_q19",
      "lessonId": "swing_lesson_1",
      "question": "Which of these best lists, in order, the setup steps performed inside the constructor in the video?",
      "options": [
        "setTitle → setSize → setVisible → setDefaultCloseOperation",
        "setVisible → setSize → setTitle → setDefaultCloseOperation",
        "setDefaultCloseOperation → setTitle → setSize → setVisible",
        "setSize → setDefaultCloseOperation → setTitle → setVisible"
      ],
      "correctAnswer": "setTitle → setSize → setVisible → setDefaultCloseOperation",
      "explanation": "\"setTitle → setSize → setVisible → setDefaultCloseOperation\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_1_q20",
      "lessonId": "swing_lesson_1",
      "question": "What is the overall purpose of this tutorial, as summarized at the end of the video?",
      "options": [
        "To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior",
        "To teach how to connect a Java program to a database",
        "To teach how to create console-based input programs only",
        "To teach advanced game development using Java"
      ],
      "correctAnswer": "To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior",
      "explanation": "\"To teach how to create a simple GUI window using JFrame, covering title, size, visibility, and close behavior\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    }
  ],
  "swing_lesson_2": [
    {
      "id": "swing_lesson_2_q01",
      "lessonId": "swing_lesson_2",
      "question": "What is the main purpose of a JLabel in a Java GUI program?",
      "options": [
        "To display text or a message on the screen (similar to System.out.println() but in GUI form)",
        "To let the user type in text",
        "To create a clickable button",
        "To close the program"
      ],
      "correctAnswer": "To display text or a message on the screen (similar to System.out.println() but in GUI form)",
      "explanation": "\"To display text or a message on the screen (similar to System.out.println() but in GUI form)\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q02",
      "lessonId": "swing_lesson_2",
      "question": "Which import statement is required to use JLabel?",
      "options": [
        "import javax.swing.JLabel;",
        "import java.awt.JLabel;",
        "import javax.gui.JLabel;",
        "import java.util.JLabel;"
      ],
      "correctAnswer": "import javax.swing.JLabel;",
      "explanation": "\"import javax.swing.JLabel;\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q03",
      "lessonId": "swing_lesson_2",
      "question": "What happens if a JLabel object is created but never added to the JFrame (or a panel added to the frame)?",
      "options": [
        "It becomes pointless, since it won't appear on the window",
        "It will still show up automatically",
        "It will replace the JFrame's title",
        "It will cause a compiler error"
      ],
      "correctAnswer": "It becomes pointless, since it won't appear on the window",
      "explanation": "\"It becomes pointless, since it won't appear on the window\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q04",
      "lessonId": "swing_lesson_2",
      "question": "Which method is used to update a JLabel's displayed text after it has already been created?",
      "options": [
        "jl.setText(\"new text\");",
        "jl.getText();",
        "jl.printText();",
        "jl.addText();"
      ],
      "correctAnswer": "jl.setText(\"new text\");",
      "explanation": "\"jl.setText(\"new text\");\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q05",
      "lessonId": "swing_lesson_2",
      "question": "What is the main purpose of a JTextField?",
      "options": [
        "To allow the user to type in and input a single line of text",
        "To display non-editable text only",
        "To organize other components",
        "To display images"
      ],
      "correctAnswer": "To allow the user to type in and input a single line of text",
      "explanation": "\"To allow the user to type in and input a single line of text\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q06",
      "lessonId": "swing_lesson_2",
      "question": "Which import statement is required to use JTextField?",
      "options": [
        "import javax.swing.JTextField;",
        "import java.awt.JTextField;",
        "import javax.text.JTextField;",
        "import java.util.JTextField;"
      ],
      "correctAnswer": "import javax.swing.JTextField;",
      "explanation": "\"import javax.swing.JTextField;\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q07",
      "lessonId": "swing_lesson_2",
      "question": "In a declaration like `new JTextField(30)`, what does the number 30 represent?",
      "options": [
        "The horizontal width/length of the text field",
        "The maximum number of characters allowed",
        "The font size",
        "The number of rows"
      ],
      "correctAnswer": "The horizontal width/length of the text field",
      "explanation": "\"The horizontal width/length of the text field\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q08",
      "lessonId": "swing_lesson_2",
      "question": "Which method retrieves the text a user has typed into a JTextField, as a String?",
      "options": [
        "jt.getText();",
        "jt.readText();",
        "jt.toText();",
        "jt.fetch();"
      ],
      "correctAnswer": "jt.getText();",
      "explanation": "\"jt.getText();\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_2_q09",
      "lessonId": "swing_lesson_2",
      "question": "Which listener/method is typically used to detect when the user presses Enter on a JTextField?",
      "options": [
        "ActionListener with actionPerformed(ActionEvent e)",
        "MouseListener with mouseClicked()",
        "WindowListener with windowClosed()",
        "Thread with run()"
      ],
      "correctAnswer": "ActionListener with actionPerformed(ActionEvent e)",
      "explanation": "\"ActionListener with actionPerformed(ActionEvent e)\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q10",
      "lessonId": "swing_lesson_2",
      "question": "How many rows can a standard JTextField display at once?",
      "options": [
        "Only one row",
        "Up to 5 rows",
        "Unlimited rows",
        "It depends on the screen size"
      ],
      "correctAnswer": "Only one row",
      "explanation": "\"Only one row\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q11",
      "lessonId": "swing_lesson_2",
      "question": "What is the key difference between JTextField and JTextArea?",
      "options": [
        "JTextField can only have one row, while JTextArea can have multiple rows",
        "JTextField can have multiple rows, JTextArea only one row",
        "JTextArea cannot accept any text input",
        "There is no difference"
      ],
      "correctAnswer": "JTextField can only have one row, while JTextArea can have multiple rows",
      "explanation": "\"JTextField can only have one row, while JTextArea can have multiple rows\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q12",
      "lessonId": "swing_lesson_2",
      "question": "Which import statement is required to use JTextArea?",
      "options": [
        "import javax.swing.JTextArea;",
        "import java.awt.JTextArea;",
        "import java.text.JTextArea;",
        "import java.util.JTextArea;"
      ],
      "correctAnswer": "import javax.swing.JTextArea;",
      "explanation": "\"import javax.swing.JTextArea;\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q13",
      "lessonId": "swing_lesson_2",
      "question": "In `new JTextArea(10, 40)`, what do the two arguments represent, in order?",
      "options": [
        "Rows, then columns",
        "Width, then height",
        "Columns, then rows",
        "X position, then Y position"
      ],
      "correctAnswer": "Rows, then columns",
      "explanation": "\"Rows, then columns\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q14",
      "lessonId": "swing_lesson_2",
      "question": "When is JTextArea the better choice compared to JTextField?",
      "options": [
        "When you want the user to type in paragraph form (multiple lines)",
        "When you want the user to type a single short word",
        "When you want to display a button",
        "When you want to display only numbers"
      ],
      "correctAnswer": "When you want the user to type in paragraph form (multiple lines)",
      "explanation": "\"When you want the user to type in paragraph form (multiple lines)\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q15",
      "lessonId": "swing_lesson_2",
      "question": "What generally happens when the user presses Enter while typing inside a JTextArea (unlike in a JTextField)?",
      "options": [
        "It simply creates a new line, since JTextArea supports multiple lines",
        "It submits/triggers an action automatically",
        "It clears all the typed text",
        "It closes the JFrame"
      ],
      "correctAnswer": "It simply creates a new line, since JTextArea supports multiple lines",
      "explanation": "\"It simply creates a new line, since JTextArea supports multiple lines\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_2_q16",
      "lessonId": "swing_lesson_2",
      "question": "Which container is typically used to hold and organize components like JLabel, JTextField, and JTextArea before adding them to the JFrame?",
      "options": [
        "JPanel",
        "JButton",
        "JScrollBar",
        "JMenu"
      ],
      "correctAnswer": "JPanel",
      "explanation": "\"JPanel\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_2_q17",
      "lessonId": "swing_lesson_2",
      "question": "Which method is used to attach a component (such as JLabel, JTextField, or JTextArea) onto a JPanel or JFrame?",
      "options": [
        "add()",
        "append()",
        "insert()",
        "place()"
      ],
      "correctAnswer": "add()",
      "explanation": "\"add()\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_2_q18",
      "lessonId": "swing_lesson_2",
      "question": "Which of these three components — JLabel, JTextField, JTextArea — allow the user to type input?",
      "options": [
        "JTextField and JTextArea",
        "Only JLabel",
        "Only JTextField",
        "All three allow typing"
      ],
      "correctAnswer": "JTextField and JTextArea",
      "explanation": "\"JTextField and JTextArea\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_2_q19",
      "lessonId": "swing_lesson_2",
      "question": "Which package must be imported to use JLabel, JTextField, and JTextArea, since they are all part of the same Swing library?",
      "options": [
        "javax.swing",
        "java.util",
        "java.io",
        "java.text"
      ],
      "correctAnswer": "javax.swing",
      "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_2_q20",
      "lessonId": "swing_lesson_2",
      "question": "A developer wants to build a simple feedback form: a label saying 'Enter your name:', a field for a short name, and a box for a longer comment. Which combination of components should be used?",
      "options": [
        "JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment",
        "JTextArea for everything, since it can handle all types of text",
        "JLabel for both name and comment, no text input components needed",
        "JTextField for everything, including the long comment"
      ],
      "correctAnswer": "JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment",
      "explanation": "\"JLabel for the instruction text, JTextField for the short name, JTextArea for the longer comment\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    }
  ],
  "swing_lesson_3": [
    {
      "id": "swing_lesson_3_q01",
      "lessonId": "swing_lesson_3",
      "question": "What is the main purpose of JButton in Java Swing?",
      "options": [
        "To create a clickable button",
        "To create a text field",
        "To create a window",
        "To create a layout"
      ],
      "correctAnswer": "To create a clickable button",
      "explanation": "\"To create a clickable button\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q02",
      "lessonId": "swing_lesson_3",
      "question": "Which package contains JButton?",
      "options": [
        "javax.swing",
        "java.io",
        "java.util",
        "java.awt.event"
      ],
      "correctAnswer": "javax.swing",
      "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q03",
      "lessonId": "swing_lesson_3",
      "question": "Which code correctly creates a button?",
      "options": [
        "JButton button = new JButton(\"Click Me\");",
        "Button button = new Button();",
        "JButton(\"Click Me\");",
        "new Button = JButton(\"Click Me\");"
      ],
      "correctAnswer": "JButton button = new JButton(\"Click Me\");",
      "explanation": "\"JButton button = new JButton(\"Click Me\");\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q04",
      "lessonId": "swing_lesson_3",
      "question": "What text will appear on this button? JButton button = new JButton(\"Submit\");",
      "options": [
        "Submit",
        "Button",
        "JButton",
        "Click"
      ],
      "correctAnswer": "Submit",
      "explanation": "\"Submit\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q05",
      "lessonId": "swing_lesson_3",
      "question": "What is the purpose of ActionListener?",
      "options": [
        "To detect and respond to user actions",
        "To create a window",
        "To change the window size",
        "To create a panel"
      ],
      "correctAnswer": "To detect and respond to user actions",
      "explanation": "\"To detect and respond to user actions\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q06",
      "lessonId": "swing_lesson_3",
      "question": "Which method is used to add an ActionListener to a button?",
      "options": [
        "addActionListener()",
        "addButton()",
        "setAction()",
        "actionButton()"
      ],
      "correctAnswer": "addActionListener()",
      "explanation": "\"addActionListener()\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q07",
      "lessonId": "swing_lesson_3",
      "question": "What action is commonly detected by an ActionListener attached to a JButton?",
      "options": [
        "Clicking",
        "Typing",
        "Scrolling",
        "Resizing"
      ],
      "correctAnswer": "Clicking",
      "explanation": "\"Clicking\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q08",
      "lessonId": "swing_lesson_3",
      "question": "What does button.addActionListener(e -> { System.out.println(\"Hello!\"); }); do?",
      "options": [
        "Prints \"Hello!\" when the button is clicked",
        "Creates a button",
        "Creates a window",
        "Deletes the button"
      ],
      "correctAnswer": "Prints \"Hello!\" when the button is clicked",
      "explanation": "\"Prints \"Hello!\" when the button is clicked\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_3_q09",
      "lessonId": "swing_lesson_3",
      "question": "What does System.out.println() do?",
      "options": [
        "Displays output in the console",
        "Creates a button",
        "Changes the GUI layout",
        "Creates a JFrame"
      ],
      "correctAnswer": "Displays output in the console",
      "explanation": "\"Displays output in the console\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q10",
      "lessonId": "swing_lesson_3",
      "question": "What does label.setText(\"Welcome!\"); do?",
      "options": [
        "Changes the label's displayed text",
        "Creates a label",
        "Deletes the label",
        "Creates a button"
      ],
      "correctAnswer": "Changes the label's displayed text",
      "explanation": "\"Changes the label's displayed text\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q11",
      "lessonId": "swing_lesson_3",
      "question": "What Swing component is used to display text?",
      "options": [
        "JLabel",
        "JButton",
        "JPanel",
        "JFrame"
      ],
      "correctAnswer": "JLabel",
      "explanation": "\"JLabel\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q12",
      "lessonId": "swing_lesson_3",
      "question": "What happens when setVisible(true) is called on a JFrame?",
      "options": [
        "The frame becomes visible",
        "The program closes",
        "The button disappears",
        "The console opens"
      ],
      "correctAnswer": "The frame becomes visible",
      "explanation": "\"The frame becomes visible\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q13",
      "lessonId": "swing_lesson_3",
      "question": "What is the purpose of JFrame?",
      "options": [
        "To create the main application window",
        "To listen for button clicks",
        "To display console messages",
        "To arrange buttons"
      ],
      "correctAnswer": "To create the main application window",
      "explanation": "\"To create the main application window\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q14",
      "lessonId": "swing_lesson_3",
      "question": "What does setSize(400, 250) do?",
      "options": [
        "Sets the window's width and height",
        "Sets the button text",
        "Sets the panel layout",
        "Sets the font size"
      ],
      "correctAnswer": "Sets the window's width and height",
      "explanation": "\"Sets the window's width and height\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q15",
      "lessonId": "swing_lesson_3",
      "question": "What does JFrame.EXIT_ON_CLOSE do?",
      "options": [
        "Ends the program when the window is closed",
        "Hides the window",
        "Restarts the program",
        "Changes the title"
      ],
      "correctAnswer": "Ends the program when the window is closed",
      "explanation": "\"Ends the program when the window is closed\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_3_q16",
      "lessonId": "swing_lesson_3",
      "question": "What happens after label.setText(\"Button was clicked!\");?",
      "options": [
        "The label text changes",
        "The button disappears",
        "The window closes",
        "Nothing happens"
      ],
      "correctAnswer": "The label text changes",
      "explanation": "\"The label text changes\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_3_q17",
      "lessonId": "swing_lesson_3",
      "question": "Which two components are mainly being demonstrated in Part 3?",
      "options": [
        "JButton and ActionListener",
        "JPanel and GridLayout",
        "JFrame and BorderLayout",
        "JLabel and FlowLayout"
      ],
      "correctAnswer": "JButton and ActionListener",
      "explanation": "\"JButton and ActionListener\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_3_q18",
      "lessonId": "swing_lesson_3",
      "question": "Why is ActionListener important?",
      "options": [
        "It makes the GUI interactive",
        "It changes the computer's settings",
        "It creates Java classes",
        "It imports Swing"
      ],
      "correctAnswer": "It makes the GUI interactive",
      "explanation": "\"It makes the GUI interactive\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_3_q19",
      "lessonId": "swing_lesson_3",
      "question": "What would happen if the JButton had no ActionListener?",
      "options": [
        "It could still appear, but clicking it would not perform the programmed action",
        "The JFrame would automatically close",
        "The button would not be created",
        "Java would always shut down"
      ],
      "correctAnswer": "It could still appear, but clicking it would not perform the programmed action",
      "explanation": "\"It could still appear, but clicking it would not perform the programmed action\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_3_q20",
      "lessonId": "swing_lesson_3",
      "question": "What is the expected result of clicking the Click Me button?",
      "options": [
        "The label changes to Button was clicked! and a message appears in the console",
        "The window closes",
        "A new JFrame opens",
        "The button changes into a text field"
      ],
      "correctAnswer": "The label changes to Button was clicked! and a message appears in the console",
      "explanation": "\"The label changes to Button was clicked! and a message appears in the console\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    }
  ],
  "swing_lesson_4": [
    {
      "id": "swing_lesson_4_q01",
      "lessonId": "swing_lesson_4",
      "question": "What is the main purpose of JPanel?",
      "options": [
        "To group and organize GUI components",
        "To create a database",
        "To listen for button clicks",
        "To display console output"
      ],
      "correctAnswer": "To group and organize GUI components",
      "explanation": "\"To group and organize GUI components\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q02",
      "lessonId": "swing_lesson_4",
      "question": "Which package contains JPanel?",
      "options": [
        "javax.swing",
        "java.io",
        "java.sql",
        "java.util"
      ],
      "correctAnswer": "javax.swing",
      "explanation": "\"javax.swing\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q03",
      "lessonId": "swing_lesson_4",
      "question": "What is a Layout Manager used for?",
      "options": [
        "To control the arrangement of components",
        "To create Java classes",
        "To print messages",
        "To close the application"
      ],
      "correctAnswer": "To control the arrangement of components",
      "explanation": "\"To control the arrangement of components\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q04",
      "lessonId": "swing_lesson_4",
      "question": "Which Layout Manager arranges components from left to right?",
      "options": [
        "FlowLayout",
        "BorderLayout",
        "GridLayout",
        "CardLayout"
      ],
      "correctAnswer": "FlowLayout",
      "explanation": "\"FlowLayout\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q05",
      "lessonId": "swing_lesson_4",
      "question": "Which code creates a JPanel using FlowLayout?",
      "options": [
        "JPanel panel = new JPanel(new FlowLayout());",
        "JPanel panel = FlowLayout();",
        "FlowLayout panel = new JPanel();",
        "new FlowPanel(FlowLayout);"
      ],
      "correctAnswer": "JPanel panel = new JPanel(new FlowLayout());",
      "explanation": "\"JPanel panel = new JPanel(new FlowLayout());\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q06",
      "lessonId": "swing_lesson_4",
      "question": "What is the default behavior of FlowLayout?",
      "options": [
        "Arranges components from left to right",
        "Arranges components in a grid",
        "Places everything in the center",
        "Places components only at the bottom"
      ],
      "correctAnswer": "Arranges components from left to right",
      "explanation": "\"Arranges components from left to right\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q07",
      "lessonId": "swing_lesson_4",
      "question": "Which Layout Manager divides a container into North, South, East, West, and Center?",
      "options": [
        "BorderLayout",
        "FlowLayout",
        "GridLayout",
        "BoxLayout"
      ],
      "correctAnswer": "BorderLayout",
      "explanation": "\"BorderLayout\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q08",
      "lessonId": "swing_lesson_4",
      "question": "How many main areas does BorderLayout have?",
      "options": [
        "5",
        "2",
        "3",
        "4"
      ],
      "correctAnswer": "5",
      "explanation": "\"5\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_4_q09",
      "lessonId": "swing_lesson_4",
      "question": "Which position represents the top area in BorderLayout?",
      "options": [
        "BorderLayout.NORTH",
        "BorderLayout.SOUTH",
        "BorderLayout.EAST",
        "BorderLayout.CENTER"
      ],
      "correctAnswer": "BorderLayout.NORTH",
      "explanation": "\"BorderLayout.NORTH\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q10",
      "lessonId": "swing_lesson_4",
      "question": "Which position represents the bottom area?",
      "options": [
        "BorderLayout.SOUTH",
        "BorderLayout.NORTH",
        "BorderLayout.WEST",
        "BorderLayout.EAST"
      ],
      "correctAnswer": "BorderLayout.SOUTH",
      "explanation": "\"BorderLayout.SOUTH\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q11",
      "lessonId": "swing_lesson_4",
      "question": "Which Layout Manager arranges components into rows and columns?",
      "options": [
        "GridLayout",
        "FlowLayout",
        "BorderLayout",
        "JFrame"
      ],
      "correctAnswer": "GridLayout",
      "explanation": "\"GridLayout\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q12",
      "lessonId": "swing_lesson_4",
      "question": "What does new GridLayout(2, 2) mean?",
      "options": [
        "2 rows and 2 columns",
        "2 buttons and 2 panels",
        "2 windows and 2 buttons",
        "2 columns and 4 rows"
      ],
      "correctAnswer": "2 rows and 2 columns",
      "explanation": "\"2 rows and 2 columns\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q13",
      "lessonId": "swing_lesson_4",
      "question": "How many spaces are available in a GridLayout(2, 2)?",
      "options": [
        "4",
        "2",
        "3",
        "6"
      ],
      "correctAnswer": "4",
      "explanation": "\"4\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q14",
      "lessonId": "swing_lesson_4",
      "question": "If four buttons are added to a GridLayout(2, 2), how will they be arranged?",
      "options": [
        "In two rows and two columns",
        "In one horizontal line",
        "All in the center",
        "Only at the bottom"
      ],
      "correctAnswer": "In two rows and two columns",
      "explanation": "\"In two rows and two columns\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q15",
      "lessonId": "swing_lesson_4",
      "question": "What does mainPanel.add(topPanel, BorderLayout.NORTH); do?",
      "options": [
        "Places the top panel in the North area",
        "Removes the top panel",
        "Places the top panel in the center",
        "Creates a new JFrame"
      ],
      "correctAnswer": "Places the top panel in the North area",
      "explanation": "\"Places the top panel in the North area\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_4_q16",
      "lessonId": "swing_lesson_4",
      "question": "What is the purpose of the mainPanel in our example?",
      "options": [
        "It organizes the different panels using BorderLayout",
        "It prints messages",
        "It listens for clicks",
        "It creates a database"
      ],
      "correctAnswer": "It organizes the different panels using BorderLayout",
      "explanation": "\"It organizes the different panels using BorderLayout\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_4_q17",
      "lessonId": "swing_lesson_4",
      "question": "In our example, where is the GridLayout panel placed?",
      "options": [
        "Center",
        "North",
        "South",
        "West"
      ],
      "correctAnswer": "Center",
      "explanation": "\"Center\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_4_q18",
      "lessonId": "swing_lesson_4",
      "question": "In our example, where is the FlowLayout panel placed?",
      "options": [
        "North",
        "South",
        "East",
        "Center"
      ],
      "correctAnswer": "North",
      "explanation": "\"North\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_4_q19",
      "lessonId": "swing_lesson_4",
      "question": "Why are Layout Managers useful?",
      "options": [
        "They automatically organize GUI components",
        "They remove all buttons",
        "They replace Java code",
        "They connect to the internet"
      ],
      "correctAnswer": "They automatically organize GUI components",
      "explanation": "\"They automatically organize GUI components\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_4_q20",
      "lessonId": "swing_lesson_4",
      "question": "Which statement correctly describes the three layouts discussed?",
      "options": [
        "FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns",
        "FlowLayout uses rows and columns, GridLayout uses five areas, BorderLayout uses left-to-right arrangement",
        "All three layouts work exactly the same way",
        "BorderLayout is only used for buttons"
      ],
      "correctAnswer": "FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns",
      "explanation": "\"FlowLayout arranges left-to-right, BorderLayout uses five areas, and GridLayout uses rows and columns\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    }
  ],
  "swing_lesson_5": [
    {
      "id": "swing_lesson_5_q01",
      "lessonId": "swing_lesson_5",
      "question": "What is the main purpose of JOptionPane in Java Swing?",
      "options": [
        "Creating dialog boxes",
        "Creating database tables",
        "Managing network connections",
        "Compiling Java programs"
      ],
      "correctAnswer": "Creating dialog boxes",
      "explanation": "\"Creating dialog boxes\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q02",
      "lessonId": "swing_lesson_5",
      "question": "Which import statement is needed to use JOptionPane?",
      "options": [
        "import javax.swing.JOptionPane;",
        "import java.util.JOptionPane;",
        "import java.awt.JOptionPane;",
        "import javax.io.JOptionPane;"
      ],
      "correctAnswer": "import javax.swing.JOptionPane;",
      "explanation": "\"import javax.swing.JOptionPane;\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q03",
      "lessonId": "swing_lesson_5",
      "question": "Which JOptionPane method is used to display a message to the user?",
      "options": [
        "showMessageDialog()",
        "showInputDialog()",
        "showConfirmDialog()",
        "showTextDialog()"
      ],
      "correctAnswer": "showMessageDialog()",
      "explanation": "\"showMessageDialog()\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q04",
      "lessonId": "swing_lesson_5",
      "question": "Which JOptionPane method is used to ask the user to enter information?",
      "options": [
        "showInputDialog()",
        "showMessageDialog()",
        "showConfirmDialog()",
        "showEntryDialog()"
      ],
      "correctAnswer": "showInputDialog()",
      "explanation": "\"showInputDialog()\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q05",
      "lessonId": "swing_lesson_5",
      "question": "What type of value does showInputDialog() normally return?",
      "options": [
        "String",
        "int",
        "double",
        "boolean"
      ],
      "correctAnswer": "String",
      "explanation": "\"String\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q06",
      "lessonId": "swing_lesson_5",
      "question": "What does this statement do? String name = JOptionPane.showInputDialog( null, \"Enter your name:\" );",
      "options": [
        "Gets user input and stores it in name",
        "Displays a fixed message only",
        "Converts name into an integer",
        "Creates a JFrame window"
      ],
      "correctAnswer": "Gets user input and stores it in name",
      "explanation": "\"Gets user input and stores it in name\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q07",
      "lessonId": "swing_lesson_5",
      "question": "What does the null argument commonly represent in a simple JOptionPane dialog?",
      "options": [
        "No parent component",
        "An empty user input",
        "A hidden password",
        "A numerical zero"
      ],
      "correctAnswer": "No parent component",
      "explanation": "\"No parent component\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q08",
      "lessonId": "swing_lesson_5",
      "question": "Why is Integer.parseInt(ageInput) used after getting age with showInputDialog()?",
      "options": [
        "To convert text into an integer",
        "To convert an integer into text",
        "To display a message",
        "To create a confirmation box"
      ],
      "correctAnswer": "To convert text into an integer",
      "explanation": "\"To convert text into an integer\" is the correct answer according to the lesson material.",
      "difficulty": "Easy"
    },
    {
      "id": "swing_lesson_5_q09",
      "lessonId": "swing_lesson_5",
      "question": "What happens if the user enters 20 and the program executes: int age = Integer.parseInt(ageInput);",
      "options": [
        "The text \"20\" becomes integer 20",
        "The integer 20 becomes the text \"age\"",
        "The value becomes 2.0",
        "The value becomes true"
      ],
      "correctAnswer": "The text \"20\" becomes integer 20",
      "explanation": "\"The text \"20\" becomes integer 20\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q10",
      "lessonId": "swing_lesson_5",
      "question": "Which escape sequence is used to create a new line in a Java String?",
      "options": [
        "\\n",
        "\\t",
        "\\s",
        "\\b"
      ],
      "correctAnswer": "\\n",
      "explanation": "\"\\n\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q11",
      "lessonId": "swing_lesson_5",
      "question": "Which method is appropriate for asking the user a Yes or No confirmation?",
      "options": [
        "showConfirmDialog()",
        "showMessageDialog()",
        "showInputDialog()",
        "showOptionDialog()"
      ],
      "correctAnswer": "showConfirmDialog()",
      "explanation": "\"showConfirmDialog()\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q12",
      "lessonId": "swing_lesson_5",
      "question": "Which constant is commonly used to create Yes and No buttons with showConfirmDialog()?",
      "options": [
        "JOptionPane.YES_NO_OPTION",
        "JOptionPane.OK_CANCEL_OPTION",
        "JOptionPane.ERROR_MESSAGE",
        "JOptionPane.INFORMATION_MESSAGE"
      ],
      "correctAnswer": "JOptionPane.YES_NO_OPTION",
      "explanation": "\"JOptionPane.YES_NO_OPTION\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q13",
      "lessonId": "swing_lesson_5",
      "question": "Which constant represents an information message type in JOptionPane?",
      "options": [
        "JOptionPane.INFORMATION_MESSAGE",
        "JOptionPane.YES_NO_OPTION",
        "JOptionPane.ERROR_OPTION",
        "JOptionPane.INPUT_MESSAGE"
      ],
      "correctAnswer": "JOptionPane.INFORMATION_MESSAGE",
      "explanation": "\"JOptionPane.INFORMATION_MESSAGE\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q14",
      "lessonId": "swing_lesson_5",
      "question": "Which constant is used for an error message icon in JOptionPane?",
      "options": [
        "JOptionPane.ERROR_MESSAGE",
        "JOptionPane.WARNING_MESSAGE",
        "JOptionPane.INFORMATION_MESSAGE",
        "JOptionPane.QUESTION_MESSAGE"
      ],
      "correctAnswer": "JOptionPane.ERROR_MESSAGE",
      "explanation": "\"JOptionPane.ERROR_MESSAGE\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q15",
      "lessonId": "swing_lesson_5",
      "question": "Which constant represents a warning message type?",
      "options": [
        "JOptionPane.WARNING_MESSAGE",
        "JOptionPane.ERROR_MESSAGE",
        "JOptionPane.YES_NO_OPTION",
        "JOptionPane.INPUT_VALUE"
      ],
      "correctAnswer": "JOptionPane.WARNING_MESSAGE",
      "explanation": "\"JOptionPane.WARNING_MESSAGE\" is the correct answer according to the lesson material.",
      "difficulty": "Medium"
    },
    {
      "id": "swing_lesson_5_q16",
      "lessonId": "swing_lesson_5",
      "question": "What will the following code display if name contains \"Alex\"? JOptionPane.showMessageDialog( null, \"Hello, \" + name + \"!\" );",
      "options": [
        "Hello, Alex!",
        "Hello, name!",
        "Alex, Hello!",
        "Hello! Alex"
      ],
      "correctAnswer": "Hello, Alex!",
      "explanation": "\"Hello, Alex!\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_5_q17",
      "lessonId": "swing_lesson_5",
      "question": "Which statement correctly displays a student's name, age, and course on separate lines?",
      "options": [
        "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course",
        "\"Name: \" + name + \"\\t\" + \"Age: \" + age + \"\\t\" + \"Course: \" + course",
        "\"Name: \" + name + \" \" + \"Age: \" + age + \" \" + \"Course: \" + course",
        "\"Name: \" + name + \"\\b\" + \"Age: \" + age + \"\\b\" + \"Course: \" + course"
      ],
      "correctAnswer": "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course",
      "explanation": "\"Name: \" + name + \"\\n\" + \"Age: \" + age + \"\\n\" + \"Course: \" + course is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_5_q18",
      "lessonId": "swing_lesson_5",
      "question": "Which statement best describes showMessageDialog()?",
      "options": [
        "It displays information in a dialog box",
        "It collects text from the user",
        "It converts text into an integer",
        "It creates a package in Java"
      ],
      "correctAnswer": "It displays information in a dialog box",
      "explanation": "\"It displays information in a dialog box\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_5_q19",
      "lessonId": "swing_lesson_5",
      "question": "Which statement best describes showConfirmDialog()?",
      "options": [
        "It collects a confirmation choice",
        "It displays only informational text",
        "It converts String input to int",
        "It creates a Java class"
      ],
      "correctAnswer": "It collects a confirmation choice",
      "explanation": "\"It collects a confirmation choice\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    },
    {
      "id": "swing_lesson_5_q20",
      "lessonId": "swing_lesson_5",
      "question": "Which sequence correctly describes the Student Information example?",
      "options": [
        "Display welcome → get name → get age → convert age → get course → display information",
        "Convert age → display course → create JFrame → get name → display welcome",
        "Get course → display error → convert name → create button → display age",
        "Create database → get password → create JFrame → convert course → display information"
      ],
      "correctAnswer": "Display welcome → get name → get age → convert age → get course → display information",
      "explanation": "\"Display welcome → get name → get age → convert age → get course → display information\" is the correct answer according to the lesson material.",
      "difficulty": "Hard"
    }
  ]
};

module.exports = {
  SWING_PASSING_SCORE,
  JAVA_SWING_LESSONS,
  JAVA_SWING_VIDEOS,
  JAVA_SWING_ASSESSMENTS,
  JAVA_SWING_EXERCISES,
  SWING_QUESTIONS_BY_LESSON
};
