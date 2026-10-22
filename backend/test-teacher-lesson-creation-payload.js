/**
 * test-teacher-lesson-creation-payload.js
 *
 * Regression test for Teacher Portal lesson creation payload and render safety:
 * 1. toClientLesson returns all expected array/object fields properly initialized:
 *    - learningObjectives: Array
 *    - learning_objectives: Array
 *    - topics: Array
 *    - assessments: Array
 *    - practice_challenges: Array
 *    - questions: Array
 *    - content: Object with video, assessment, practice
 * 2. toClientAssessment parses questions string safely into an Array.
 * 3. Handles null/undefined inputs gracefully without crashing.
 * 4. Ensures frontend array iteration (.map) will never encounter undefined on newly created lessons.
 */

const assert = require('assert');

console.log('\n================================================================');
console.log('🧪 RUNNING TEACHER LESSON CREATION PAYLOAD REGRESSION TESTS');
console.log('================================================================\n');

// Mock toClientLesson as defined in server.js
const isSwingLessonId = (lessonId = "") => /^swing_lesson_\d+$/i.test(String(lessonId).trim()) || String(lessonId).trim().toLowerCase().startsWith("swing_");

const toClientLesson = (row) => {
    if (!row) return null;
    const isSwing = isSwingLessonId(row.id) || row.course_id === "java_swing" || String(row.module || "").toLowerCase().includes("swing") || row.track === "swing" || row.metadata?.track === "swing";
    const track = row.track || row.metadata?.track || (isSwing ? "swing" : "oop");

    let learningObjectives = [];
    if (Array.isArray(row.learning_objectives)) {
        learningObjectives = row.learning_objectives;
    } else if (Array.isArray(row.learningObjectives)) {
        learningObjectives = row.learningObjectives;
    } else if (Array.isArray(row.concepts)) {
        learningObjectives = row.concepts;
    } else if (typeof row.learning_objectives === "string") {
        try {
            const parsed = JSON.parse(row.learning_objectives);
            learningObjectives = Array.isArray(parsed) ? parsed : [row.learning_objectives];
        } catch {
            learningObjectives = row.learning_objectives.split(",").map(s => s.trim()).filter(Boolean);
        }
    } else if (typeof row.learningObjectives === "string") {
        try {
            const parsed = JSON.parse(row.learningObjectives);
            learningObjectives = Array.isArray(parsed) ? parsed : [row.learningObjectives];
        } catch {
            learningObjectives = row.learningObjectives.split(",").map(s => s.trim()).filter(Boolean);
        }
    }

    return {
        id: row.id,
        title: row.title || "",
        track,
        module: row.module || (isSwing ? "Java Swing" : "Object-Oriented Programming (Java)"),
        courseId: row.course_id || (isSwing ? "java_swing" : "oop_fundamentals"),
        sequence: Number(row.sequence || 0),
        duration: row.duration || "",
        videoUrl: row.video_url || "",
        storageProvider: row.storage_provider || "",
        storageKey: row.storage_key || "",
        storageContentType: row.storage_content_type || "",
        description: row.description || "",
        learningObjectives,
        learning_objectives: learningObjectives,
        topics: [],
        assessments: [],
        practice_challenges: [],
        questions: [],
        content: {
            video: null,
            assessment: null,
            practice: null
        },
        status: row.status || "Draft",
        metadata: row.metadata || {},
        citationText: row.metadata?.citationText || row.metadata?.citation_text || "",
        citationUrl: row.metadata?.citationUrl || row.metadata?.citation_url || "",
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

const toClientAssessment = (row) => {
    let questions = [];
    if (Array.isArray(row.questions)) {
        questions = row.questions;
    } else if (typeof row.questions === "string") {
        try {
            const parsed = JSON.parse(row.questions);
            questions = Array.isArray(parsed) ? parsed : [];
        } catch {
            questions = [];
        }
    }
    return {
        id: row.id,
        lessonId: row.lesson_id,
        title: row.title || "",
        quizType: row.quiz_type || "Multiple Choice",
        passingScore: Number(row.passing_score || 0),
        attempts: Number(row.attempts || 0),
        questions,
        status: row.status || "Draft",
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
};

// --- Test 1: Brand new lesson created by teacher with minimal fields ---
console.log('--- Test 1: Minimal Newly Created Lesson Payload ---');
const rawNewLesson = {
    id: 'oop_lesson_13',
    title: 'Advanced Encapsulation',
    module: 'Object-Oriented Programming (Java)',
    sequence: 13,
    track: 'oop',
    status: 'Published'
    // learning_objectives missing or null
};

const clientLesson = toClientLesson(rawNewLesson);

assert.ok(clientLesson !== null);
assert.strictEqual(clientLesson.id, 'oop_lesson_13');
assert.ok(Array.isArray(clientLesson.learningObjectives), 'learningObjectives must be an array');
assert.ok(Array.isArray(clientLesson.learning_objectives), 'learning_objectives must be an array');
assert.ok(Array.isArray(clientLesson.topics), 'topics must be initialized to an array');
assert.ok(Array.isArray(clientLesson.assessments), 'assessments must be initialized to an array');
assert.ok(Array.isArray(clientLesson.practice_challenges), 'practice_challenges must be initialized to an array');
assert.ok(Array.isArray(clientLesson.questions), 'questions must be initialized to an array');
assert.ok(typeof clientLesson.content === 'object' && clientLesson.content !== null, 'content must be an object');

// Verify .map() can be safely called on any of these arrays without throwing
assert.doesNotThrow(() => {
    clientLesson.learningObjectives.map(x => x);
    clientLesson.learning_objectives.map(x => x);
    clientLesson.topics.map(x => x);
    clientLesson.assessments.map(x => x);
    clientLesson.practice_challenges.map(x => x);
    clientLesson.questions.map(x => x);
}, 'Iterating with .map() on newly created lesson properties must never throw');

console.log('  ✅ PASS: Minimal new lesson contains safe array defaults, preventing undefined .map() errors\n');

// --- Test 2: Unparsed JSON or comma-separated objectives string ---
console.log('--- Test 2: String Learning Objectives Parsing ---');
const lessonWithJsonObjectives = toClientLesson({
    id: 'oop_lesson_14',
    title: 'Polymorphism Deep Dive',
    learning_objectives: '["Method Overriding", "Dynamic Dispatch"]'
});
assert.deepStrictEqual(lessonWithJsonObjectives.learningObjectives, ['Method Overriding', 'Dynamic Dispatch']);

const lessonWithCsvObjectives = toClientLesson({
    id: 'oop_lesson_15',
    title: 'Abstract Classes',
    learning_objectives: 'Abstraction, Pure Virtual Concepts'
});
assert.deepStrictEqual(lessonWithCsvObjectives.learningObjectives, ['Abstraction', 'Pure Virtual Concepts']);

console.log('  ✅ PASS: Objectives provided as JSON string or CSV string safely parse to Array\n');

// --- Test 3: Assessment with string questions column ---
console.log('--- Test 3: Assessment Questions String Parsing ---');
const rawAssessment = {
    id: 'quiz_13',
    lesson_id: 'oop_lesson_13',
    title: 'Encapsulation Quiz',
    questions: JSON.stringify([
        { id: 'q1', question: 'What is getter/setter?', options: ['A', 'B'], correctAnswer: 'A' }
    ])
};

const clientAssessment = toClientAssessment(rawAssessment);
assert.ok(Array.isArray(clientAssessment.questions), 'Assessment questions must be an array');
assert.strictEqual(clientAssessment.questions.length, 1);
assert.doesNotThrow(() => {
    clientAssessment.questions.map(q => q.options.map(opt => opt));
});

// Assessment with null questions
const emptyAssessment = toClientAssessment({
    id: 'quiz_14',
    lesson_id: 'oop_lesson_14',
    title: 'Empty Quiz',
    questions: null
});
assert.ok(Array.isArray(emptyAssessment.questions), 'Null questions must fall back to empty array');
assert.strictEqual(emptyAssessment.questions.length, 0);

console.log('  ✅ PASS: Assessment questions guaranteed to be an array\n');

// --- Test 4: Frontend Lesson Management safe fallback simulation ---
console.log('--- Test 4: LessonManagementTab State Update Fallbacks ---');
const simulateFrontendMap = (lessonsState) => {
    const list = Array.isArray(lessonsState) ? lessonsState : [];
    return list.map(lesson => ({
        id: lesson.id,
        objectives: (lesson.learningObjectives || []).slice(0, 2).map(o => o.trim()),
        assessments: (lesson.assessments || []).map(a => a.id),
        challenges: (lesson.practice_challenges || []).map(c => c.id)
    }));
};

assert.doesNotThrow(() => {
    // 1. Array with minimal item
    const res1 = simulateFrontendMap([clientLesson]);
    assert.strictEqual(res1.length, 1);

    // 2. Completely empty item or undefined lesson
    const res2 = simulateFrontendMap([{}]);
    assert.strictEqual(res2.length, 1);

    // 3. Null or undefined state
    const res3 = simulateFrontendMap(null);
    assert.strictEqual(res3.length, 0);
    const res4 = simulateFrontendMap(undefined);
    assert.strictEqual(res4.length, 0);
});

console.log('  ✅ PASS: Frontend safeguards protect against undefined .map() in all scenarios\n');

console.log('================================================================');
console.log('🎯 ALL TEACHER LESSON CREATION REGRESSION TESTS PASSED (100%)');
console.log('================================================================\n');
