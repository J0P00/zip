const { PRACTICE_CHALLENGES } = require('./challengeBank');

const OOP_PRACTICE_LESSON_IDS = Array.from({ length: 12 }, (_, index) => `oop_lesson_${index + 1}`);
const ACTIVE_OOP_PRACTICE_IDS = Array.from({ length: 12 }, (_, index) => `practice_${index + 1}`);

const lessonOverrides = {
    practice_10: {
        topicId: 'arrays-objects-10',
        topicTitle: 'Array of Objects',
        lessonId: 'oop_lesson_10',
        assessmentId: 'oop_assessment_10',
        title: 'Process an array of objects',
        description: 'Create and traverse an array of Student objects, then print the number of initialized objects.',
        starterCode: `public class Main {
    public static void main(String[] args) {
        Student[] students = { new Student("Mia"), new Student("Luis") };
        System.out.println(students.length);
    }
}

// Add the Student class below.
`,
        sampleOutput: '2',
        testCases: [
            { id: 'arrays10_sample', input: '', expectedOutput: '2', isHidden: false, matcher: 'Student\\s*\\[\\]' },
            { id: 'arrays10_new', input: '', expectedOutput: '2', isHidden: true, matcher: 'new\\s+Student' }
        ]
    },
    practice_11: {
        topicId: 'arrays-objects-11',
        topicTitle: 'Array of Objects',
        lessonId: 'oop_lesson_11',
        assessmentId: 'oop_assessment_11',
        title: 'Find an object in an array',
        description: 'Search an array of Book objects and print the title of the matching object.',
        starterCode: `public class Main {
    public static void main(String[] args) {
        Book[] books = { new Book("OOP Basics"), new Book("Java Design") };
        System.out.println(books[0].title);
    }
}

// Add the Book class below.
`,
        sampleOutput: 'OOP Basics',
        testCases: [
            { id: 'arrays11_sample', input: '', expectedOutput: 'OOP Basics', isHidden: false, matcher: 'Book\\s*\\[\\]' },
            { id: 'arrays11_index', input: '', expectedOutput: 'OOP Basics', isHidden: true, matcher: '\\[[0-9]+\\]' }
        ]
    },
    practice_12: {
        topicId: 'enum',
        topicTitle: 'Enum',
        lessonId: 'oop_lesson_12',
        assessmentId: 'oop_assessment_12',
        title: 'Use an enum for course status',
        description: 'Define a CourseStatus enum and use it to print the current course status.',
        starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println(CourseStatus.ACTIVE);
    }
}

// Add the CourseStatus enum below.
`,
        sampleOutput: 'ACTIVE',
        testCases: [
            { id: 'enum_sample', input: '', expectedOutput: 'ACTIVE', isHidden: false, matcher: 'enum\\s+CourseStatus' },
            { id: 'enum_constant', input: '', expectedOutput: 'ACTIVE', isHidden: true, matcher: 'ACTIVE' }
        ]
    }
};

const ACTIVE_OOP_PRACTICE_CHALLENGES = ACTIVE_OOP_PRACTICE_IDS.map(id => {
    const source = PRACTICE_CHALLENGES.find(challenge => challenge.id === id);
    if (!source) throw new Error(`Missing OOP practice challenge definition: ${id}`);
    const override = lessonOverrides[id] || {};
    const challenge = { ...source, ...override };
    return {
        ...challenge,
        learningObjectives: [
            `Apply ${challenge.topicTitle} in a short Java program.`,
            'Write code that compiles cleanly and produces deterministic console output.',
            'Practice reading requirements before submitting a final solution.'
        ],
        requirements: [
            `Use Java syntax directly related to ${challenge.topicTitle}.`,
            `Print exactly: ${challenge.sampleOutput}`,
            'Keep the main class named Main.'
        ]
    };
});

const challengeForId = id => ACTIVE_OOP_PRACTICE_CHALLENGES.find(challenge => challenge.id === id);

module.exports = {
    ACTIVE_OOP_PRACTICE_CHALLENGES,
    ACTIVE_OOP_PRACTICE_IDS,
    OOP_PRACTICE_LESSON_IDS,
    challengeForId
};
