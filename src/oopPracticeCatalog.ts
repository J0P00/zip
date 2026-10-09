import { ProgrammingChallenge } from './types';
import { OOP_COURSE_LESSONS } from './data/oopCourse';
import { PRACTICE_CHALLENGES as legacyChallenges, gradePracticeSource } from './data/practiceChallenges';

const overrides: Record<string, Partial<ProgrammingChallenge>> = {
  practice_10: { topicId: 'arrays-objects-10', lessonId: 'oop_lesson_10', assessmentId: 'oop_assessment_10', title: 'Process an array of objects', description: 'Create and traverse an array of Student objects, then print the number of initialized objects.', starterCode: `public class Main {
    public static void main(String[] args) {
        Student[] students = { new Student("Mia"), new Student("Luis") };
        System.out.println(students.length);
    }
}

// Add the Student class below.
`, sampleOutput: '2', testCases: [{ id: 'arrays10_sample', input: '', expectedOutput: '2', isHidden: false, matcher: 'Student\\s*\\[\\]' }, { id: 'arrays10_new', input: '', expectedOutput: '2', isHidden: true, matcher: 'new\\s+Student' }] },
  practice_11: { topicId: 'arrays-objects-11', lessonId: 'oop_lesson_11', assessmentId: 'oop_assessment_11', title: 'Find an object in an array', description: 'Search an array of Book objects and print the title of the matching object.', starterCode: `public class Main {
    public static void main(String[] args) {
        Book[] books = { new Book("OOP Basics"), new Book("Java Design") };
        System.out.println(books[0].title);
    }
}

// Add the Book class below.
`, sampleOutput: 'OOP Basics', testCases: [{ id: 'arrays11_sample', input: '', expectedOutput: 'OOP Basics', isHidden: false, matcher: 'Book\\s*\\[\\]' }, { id: 'arrays11_index', input: '', expectedOutput: 'OOP Basics', isHidden: true, matcher: '\\[[0-9]+\\]' }] },
  practice_12: { topicId: 'enum', lessonId: 'oop_lesson_12', assessmentId: 'oop_assessment_12', title: 'Use an enum for course status', description: 'Define a CourseStatus enum and use it to print the current course status.', starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println(CourseStatus.ACTIVE);
    }
}

// Add the CourseStatus enum below.
`, sampleOutput: 'ACTIVE', testCases: [{ id: 'enum_sample', input: '', expectedOutput: 'ACTIVE', isHidden: false, matcher: 'enum\\s+CourseStatus' }, { id: 'enum_constant', input: '', expectedOutput: 'ACTIVE', isHidden: true, matcher: 'ACTIVE' }] }
};

export const PRACTICE_CHALLENGES: ProgrammingChallenge[] = Array.from({ length: 12 }, (_, index) => {
  const id = `practice_${index + 1}`;
  const source = legacyChallenges.find(challenge => challenge.id === id);
  if (!source) throw new Error(`Missing OOP practice challenge: ${id}`);
  return { ...source, ...overrides[id] } as ProgrammingChallenge;
});

export const getPracticeChallengeForLesson = (lessonId: string) =>
  PRACTICE_CHALLENGES.find(challenge => challenge.lessonId === lessonId) || PRACTICE_CHALLENGES[0];

export const getCurrentPracticeChallenge = () => {
  const activeLesson = OOP_COURSE_LESSONS.find(lesson => lesson.status === 'active') || OOP_COURSE_LESSONS[0];
  return getPracticeChallengeForLesson(activeLesson.id);
};

export { gradePracticeSource };
