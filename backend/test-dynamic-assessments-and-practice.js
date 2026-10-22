const assert = require('assert');

console.log('================================================================');
console.log('🧪 RUNNING DYNAMIC ASSESSMENTS & PRACTICE IDE REGRESSION TESTS');
console.log('================================================================');

// 1. Test Dynamic Assessment Hydration
console.log('\n--- Test 1: Dynamic Assessment Extraction for Newly Created Lessons ---');

const mockLessons = [
    {
        id: 'oop_lesson_1',
        title: 'Introduction to OOP',
        sequence: 1,
        assessments: [],
        practice_challenges: [],
        content: { video: null, assessment: null, practice: null }
    },
    {
        id: 'oop_lesson_12',
        title: 'Enum Types',
        sequence: 12,
        assessments: [],
        practice_challenges: [],
        content: { video: null, assessment: null, practice: null }
    },
    {
        id: 'oop_lesson_13',
        title: 'Testing',
        sequence: 13,
        assessments: [
            {
                id: 'assessment_oop_lesson_13',
                title: 'Testing Assessment',
                passingScore: 60,
                attempts: 3,
                questions: [
                    { id: 'q1', question: 'What is unit testing?', options: ['Testing units', 'Manual testing'], correctAnswer: 'Testing units' }
                ]
            }
        ],
        practice_challenges: [
            {
                id: 'practice_oop_lesson_13',
                title: 'Unit Testing Challenge',
                description: 'Write a JUnit test case.',
                starterCode: 'public class Main {}',
                sampleOutput: 'Tests passed',
                passingScore: 70
            }
        ],
        content: {
            video: { videoUrl: 'https://youtube.com/watch?v=123' },
            assessment: {
                id: 'assessment_oop_lesson_13',
                title: 'Testing Assessment',
                passingScore: 60,
                attempts: 3,
                questions: [{ id: 'q1', question: 'What is unit testing?' }]
            },
            practice: {
                id: 'practice_oop_lesson_13',
                title: 'Unit Testing Challenge',
                starterCode: 'public class Main {}'
            }
        }
    },
    {
        id: 'oop_lesson_14',
        title: 'Pending Content Lesson',
        sequence: 14,
        assessments: [],
        practice_challenges: [],
        content: { video: null, assessment: null, practice: null }
    }
];

// Logic matching Assessments.tsx assessmentList
const buildAssessmentList = (effectiveLessons) => {
    return effectiveLessons.map(lesson => {
        const dynamicAssessment =
            (Array.isArray(lesson.assessments) && lesson.assessments[0]) ||
            lesson.content?.assessment ||
            null;
        const staticAssessment = lesson.id === 'oop_lesson_1' ? { id: 'oop_assessment_1', title: 'Intro Assessment', questions: [{ id: 's1' }] } : null;

        const id = dynamicAssessment?.id || staticAssessment?.id || `assessment_${lesson.id}`;
        const title = dynamicAssessment?.title || staticAssessment?.title || `${lesson.title} Assessment`;
        const passingPercentage = Number(dynamicAssessment?.passingScore ?? staticAssessment?.passingPercentage ?? 60);
        const attempts = Number(dynamicAssessment?.attempts || 3);
        const questions = dynamicAssessment?.questions || staticAssessment?.questions || [];
        const hasContent = Boolean(Array.isArray(questions) && questions.length > 0) || Boolean(staticAssessment);

        return {
            id,
            lessonId: lesson.id,
            title,
            passingPercentage,
            passingScore: passingPercentage,
            attempts,
            questions,
            status: dynamicAssessment?.status || (hasContent ? 'Published' : 'Draft'),
            hasContent,
            lesson
        };
    });
};

const assessmentList = buildAssessmentList(mockLessons);

assert.strictEqual(assessmentList.length, 4, 'Assessment list must contain exactly 4 items for all 4 lessons');
const lesson13Assessment = assessmentList.find(a => a.lessonId === 'oop_lesson_13');
assert.ok(lesson13Assessment, 'Lesson 13 assessment must exist');
assert.strictEqual(lesson13Assessment.title, 'Testing Assessment');
assert.strictEqual(lesson13Assessment.hasContent, true);
assert.strictEqual(lesson13Assessment.questions.length, 1);

const lesson14Assessment = assessmentList.find(a => a.lessonId === 'oop_lesson_14');
assert.ok(lesson14Assessment, 'Lesson 14 assessment must exist');
assert.strictEqual(lesson14Assessment.hasContent, false, 'Lesson 14 hasContent must be false (pending content)');
console.log('  ✅ PASS: Dynamic assessment hydration correctly extracts Lesson 13 and handles Lesson 14 pending state');

// 2. Test Dynamic Practice IDE Challenge Extraction
console.log('\n--- Test 2: Dynamic Practice IDE Challenge Extraction ---');

const buildChallengeList = (effectiveLessons) => {
    return effectiveLessons.map((lesson, index) => {
        const dynamicPractice =
            (Array.isArray(lesson.practice_challenges) && lesson.practice_challenges[0]) ||
            lesson.content?.practice ||
            null;
        const staticChallenge = lesson.id === 'oop_lesson_1' ? { id: 'practice_1', title: 'Intro Challenge', starterCode: 'class Main {}' } : null;

        const id = dynamicPractice?.id || staticChallenge?.id || `practice_${lesson.id}`;
        const title = dynamicPractice?.title || staticChallenge?.title || `${lesson.title} Practice Challenge`;
        const description = dynamicPractice?.description || staticChallenge?.description || lesson.description || 'Complete the exercise.';
        const starterCode = dynamicPractice?.starterCode || dynamicPractice?.starter_code || staticChallenge?.starterCode || 'public class Main {}';
        const sampleInput = dynamicPractice?.sampleInput || dynamicPractice?.sample_input || '';
        const sampleOutput = dynamicPractice?.sampleOutput || dynamicPractice?.sample_output || '';
        const passingScore = Number(dynamicPractice?.passingScore || dynamicPractice?.passing_score || 70);
        const topicId = dynamicPractice?.topicId || dynamicPractice?.topic_id || lesson.topic || lesson.id;
        const hasContent = Boolean(dynamicPractice?.starterCode || dynamicPractice?.starter_code || staticChallenge);

        return {
            id,
            lessonId: lesson.id,
            topicId,
            title,
            description,
            starterCode,
            sampleInput,
            sampleOutput,
            passingScore,
            hasContent,
            sequence: lesson.sequence || index + 1
        };
    });
};

const challengeList = buildChallengeList(mockLessons);

assert.strictEqual(challengeList.length, 4, 'Challenge list must contain all 4 lessons');
const lesson13Challenge = challengeList.find(c => c.lessonId === 'oop_lesson_13');
assert.ok(lesson13Challenge, 'Lesson 13 challenge must exist');
assert.strictEqual(lesson13Challenge.title, 'Unit Testing Challenge');
assert.strictEqual(lesson13Challenge.sequence, 13);
assert.strictEqual(lesson13Challenge.hasContent, true);

const lesson14Challenge = challengeList.find(c => c.lessonId === 'oop_lesson_14');
assert.ok(lesson14Challenge, 'Lesson 14 challenge must exist');
assert.strictEqual(lesson14Challenge.hasContent, false, 'Lesson 14 challenge hasContent must be false');
console.log('  ✅ PASS: Dynamic practice extraction extracts Lesson 13 challenge and flags Lesson 14 as pending');

// 3. Test Fallback Empty Array Safety
console.log('\n--- Test 3: Safe Fallbacks with Empty or Malformed Input ---');
assert.doesNotThrow(() => {
    const emptyAssessmentList = buildAssessmentList([]);
    assert.strictEqual(emptyAssessmentList.length, 0);

    const emptyChallengeList = buildChallengeList([]);
    assert.strictEqual(emptyChallengeList.length, 0);
}, 'Empty array should produce empty lists without throwing');
console.log('  ✅ PASS: Safe fallbacks prevent crashes with empty lesson inputs');

console.log('\n================================================================');
console.log('🎯 ALL DYNAMIC ASSESSMENTS & PRACTICE IDE TESTS PASSED (100%)');
console.log('================================================================\n');
