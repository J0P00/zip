const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    SWING_PASSING_SCORE,
    JAVA_SWING_LESSONS,
    JAVA_SWING_VIDEOS,
    JAVA_SWING_ASSESSMENTS,
    JAVA_SWING_EXERCISES,
    SWING_QUESTIONS_BY_LESSON
} = require("./javaSwingCatalog");
const { seedLessons } = require("./server");

class FakeLessonRestoreDb {
    constructor() {
        this.lessons = new Map();
        this.swingLessons = new Map();
        this.swingVideos = new Map();
        this.swingQuizzes = new Map();
        this.swingQuestions = new Map();
        this.swingExercises = new Map();
        this.lessonVideos = new Map();
        this.assessments = new Map();
        this.challenges = new Map();
        this.testCases = new Map();
        this.resources = new Map();
    }

    async query(sql, params = []) {
        const text = String(sql).replace(/\s+/g, " ").trim();

        if (text.startsWith("INSERT INTO lessons")) {
            const [id, title, module, sequence, duration, videoUrl, description, learningObjectives, status, courseId] = params;
            const existing = this.lessons.get(id);
            if (!existing) {
                this.lessons.set(id, {
                    id,
                    title,
                    module,
                    sequence,
                    duration,
                    video_url: videoUrl,
                    description,
                    learning_objectives: JSON.parse(learningObjectives),
                    status,
                    course_id: courseId
                });
            } else {
                existing.sequence = sequence;
                existing.module = existing.module || module;
                existing.duration = existing.duration || duration;
                existing.video_url = existing.video_url || videoUrl;
                existing.description = existing.description || description;
                existing.course_id = courseId;
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO swing_lessons")) {
            const [id, sequence, title, topics, objectives, content, codeExample] = params;
            this.swingLessons.set(id, {
                id,
                sequence,
                title,
                topics: JSON.parse(topics),
                objectives: JSON.parse(objectives),
                content: JSON.parse(content),
                code_example: codeExample
            });
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO swing_videos")) {
            const [id, lessonId, title, duration, description, embedUrl] = params;
            this.swingVideos.set(id, { id, lesson_id: lessonId, title, duration, description, embed_url: embedUrl });
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO swing_quizzes")) {
            const [id, lessonId, title, passingPercentage, questionCount] = params;
            this.swingQuizzes.set(id, {
                id,
                lesson_id: lessonId,
                title,
                passing_percentage: passingPercentage,
                question_count: questionCount
            });
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO swing_questions")) {
            const [id, quizId, prompt, choices, correctAnswer, explanation] = params;
            if (!this.swingQuestions.has(id)) {
                this.swingQuestions.set(id, {
                    id,
                    quiz_id: quizId,
                    prompt,
                    choices: JSON.parse(choices),
                    correct_answer: correctAnswer,
                    explanation
                });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO swing_programming_exercises")) {
            const [id, lessonId, title, instructions, starterCode, testCases] = params;
            if (!this.swingExercises.has(id)) {
                this.swingExercises.set(id, {
                    id,
                    lesson_id: lessonId,
                    title,
                    instructions,
                    starter_code: starterCode,
                    test_cases: JSON.parse(testCases)
                });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO programming_challenges")) {
            const [id, topicId, lessonId, title, description, learningObjectives, requirements, starterCode, sampleInput, sampleOutput, passingScore] = params;
            if (!this.challenges.has(id)) {
                this.challenges.set(id, {
                    id,
                    topic_id: topicId,
                    lesson_id: lessonId,
                    title,
                    description,
                    learning_objectives: JSON.parse(learningObjectives),
                    requirements: JSON.parse(requirements),
                    starter_code: starterCode,
                    sample_input: sampleInput,
                    sample_output: sampleOutput,
                    passing_score: passingScore,
                    status: "Published"
                });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO challenge_test_cases")) {
            const [id, challengeId, input, expectedOutput, isHidden, matcher] = params;
            if (!this.testCases.has(id)) {
                this.testCases.set(id, { id, challenge_id: challengeId, input, expected_output: expectedOutput, is_hidden: isHidden, matcher });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO lesson_videos")) {
            const [id, lessonId, title, videoUrl, duration, description] = params;
            const hasForLesson = [...this.lessonVideos.values()].some(v => v.lesson_id === lessonId);
            if (!hasForLesson && !this.lessonVideos.has(id)) {
                this.lessonVideos.set(id, {
                    id,
                    lesson_id: lessonId,
                    title,
                    video_url: videoUrl,
                    duration,
                    description,
                    sequence: 1,
                    status: "Published"
                });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO assessments")) {
            const [id, lessonId, title, passingScore, attempts, questions] = params;
            const hasForLesson = [...this.assessments.values()].some(a => a.lesson_id === lessonId);
            if (!hasForLesson && !this.assessments.has(id)) {
                this.assessments.set(id, {
                    id,
                    lesson_id: lessonId,
                    title,
                    quiz_type: "Multiple Choice",
                    passing_score: passingScore,
                    attempts,
                    questions: JSON.parse(questions),
                    status: "Published"
                });
            }
            return { rows: [], rowCount: 1 };
        }

        if (text === "SELECT COUNT(*)::int AS count FROM learning_resources") {
            return { rows: [{ count: this.resources.size }], rowCount: 1 };
        }

        if (text.startsWith("INSERT INTO learning_resources")) {
            const [id, lessonId, title, resourceType, fileUrl, fileSize, description] = params;
            if (!this.resources.has(id)) {
                this.resources.set(id, { id, lesson_id: lessonId, title, resource_type: resourceType, file_url: fileUrl, file_size: fileSize, description });
            }
            return { rows: [], rowCount: 1 };
        }

        throw new Error(`Unexpected SQL in FakeLessonRestoreDb: ${text}`);
    }
}

async function runTests() {
    console.log("================================================================");
    console.log("🧪 RUNNING 17-LESSON RESTORATION & JAVA SWING VERIFICATION SUITE");
    console.log("================================================================\n");

    // 1. Verify Java Swing Catalog Integrity
    assert.strictEqual(SWING_PASSING_SCORE, 80, "Swing passing score must be 80%");
    assert.strictEqual(JAVA_SWING_LESSONS.length, 5, "Must have 5 Java Swing lessons");
    assert.strictEqual(JAVA_SWING_VIDEOS.length, 5, "Must have 5 Java Swing videos");
    assert.strictEqual(JAVA_SWING_ASSESSMENTS.length, 5, "Must have 5 Java Swing assessments");
    assert.strictEqual(JAVA_SWING_EXERCISES.length, 5, "Must have 5 Java Swing coding exercises");

    for (let i = 1; i <= 5; i++) {
        const lessonId = `swing_lesson_${i}`;
        const video = JAVA_SWING_VIDEOS.find(v => v.lessonId === lessonId);
        const assessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === lessonId);
        const exercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === lessonId);

        assert.ok(video, `Missing video for ${lessonId}`);
        assert.ok(video.embedUrl.startsWith("https://res.cloudinary.com/"), `Invalid Cloudinary URL for ${lessonId}: ${video.embedUrl}`);
        assert.ok(assessment, `Missing assessment for ${lessonId}`);
        assert.strictEqual(assessment.id, `swing_assessment_${i}`);
        assert.strictEqual(assessment.passingScore, 80);
        assert.strictEqual(assessment.questions.length, 20, `Expected 20 questions for ${lessonId}`);
        assert.strictEqual(SWING_QUESTIONS_BY_LESSON[lessonId].length, 20);
        assert.ok(exercise, `Missing practice exercise for ${lessonId}`);
        assert.strictEqual(exercise.id, `swing_exercise_${i}`);
        assert.strictEqual(exercise.passingScore, 80);
    }
    console.log("  ✅ PASS: All 5 Java Swing lessons, Cloudinary video URLs, 20-question assessments (80%), and Practice IDE exercises verified.");

    // 2. Verify seedLessons() idempotently populates all 17 lessons without duplicates
    const db = new FakeLessonRestoreDb();
    // Simulate a database that already had the 12 OOP videos (the bug that previously skipped inserting Swing videos)
    db.lessonVideos.set("vid_oop_lesson_1", {
        id: "vid_oop_lesson_1",
        lesson_id: "oop_lesson_1",
        title: "Custom Teacher Title",
        video_url: "https://res.cloudinary.com/demo/video/upload/custom.mp4",
        duration: "13:50",
        description: "Custom description",
        sequence: 1,
        status: "Published"
    });

    await seedLessons(db);
    await seedLessons(db); // Run twice to verify idempotency and zero duplicates

    assert.strictEqual(db.lessons.size, 17, `Expected 17 lessons in lessons table, got ${db.lessons.size}`);
    assert.strictEqual(db.lessonVideos.size, 17, `Expected 17 videos in lesson_videos table, got ${db.lessonVideos.size}`);
    assert.strictEqual(db.assessments.size, 17, `Expected 17 assessments in assessments table, got ${db.assessments.size}`);
    assert.strictEqual(db.swingLessons.size, 5, "Expected 5 swing_lessons rows");
    assert.strictEqual(db.swingVideos.size, 5, "Expected 5 swing_videos rows");
    assert.strictEqual(db.swingQuizzes.size, 5, "Expected 5 swing_quizzes rows");
    assert.strictEqual(db.swingQuestions.size, 100, "Expected 100 swing_questions rows (5 * 20)");
    assert.strictEqual(db.swingExercises.size, 5, "Expected 5 swing_programming_exercises rows");
    assert.strictEqual(db.challenges.size, 5, "Expected 5 Swing programming_challenges rows seeded by seedLessons");

    // Confirm existing teacher customization on vid_oop_lesson_1 was preserved
    assert.strictEqual(db.lessonVideos.get("vid_oop_lesson_1").title, "Custom Teacher Title");

    // 3. Verify lesson ordering: 12 OOP lessons first (1..12), followed by 5 Java Swing lessons (13..17)
    const orderedLessons = [...db.lessons.values()].sort((a, b) => {
        const aSwing = a.id.startsWith("swing_lesson_") || a.course_id === "java_swing";
        const bSwing = b.id.startsWith("swing_lesson_") || b.course_id === "java_swing";
        if (aSwing !== bSwing) return aSwing ? 1 : -1;
        return a.sequence - b.sequence;
    });
    const expectedIds = [
        "oop_lesson_1", "oop_lesson_2", "oop_lesson_3", "oop_lesson_4",
        "oop_lesson_5", "oop_lesson_6", "oop_lesson_7", "oop_lesson_8",
        "oop_lesson_9", "oop_lesson_10", "oop_lesson_11", "oop_lesson_12",
        "swing_lesson_1", "swing_lesson_2", "swing_lesson_3", "swing_lesson_4", "swing_lesson_5"
    ];
    assert.deepStrictEqual(orderedLessons.map(l => l.id), expectedIds);
    assert.deepStrictEqual(orderedLessons.map(l => l.sequence), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    console.log("  ✅ PASS: All 17 lessons seeded idempotently with zero duplicates and ordered 1..12 (OOP) then 13..17 (Java Swing).");

    // 4. Verify Frontend LessonManagementTab.tsx and JavaSwingModule.tsx integration
    const lessonMgmtSource = fs.readFileSync(path.join(__dirname, "../src/components/teacher/LessonManagementTab.tsx"), "utf8");
    assert.ok(lessonMgmtSource.includes("JAVA_SWING_LESSONS"), "LessonManagementTab must import JAVA_SWING_LESSONS");
    assert.ok(lessonMgmtSource.includes("JAVA_SWING_VIDEOS"), "LessonManagementTab must import JAVA_SWING_VIDEOS");
    assert.ok(lessonMgmtSource.includes("JAVA_SWING_ASSESSMENTS"), "LessonManagementTab must import JAVA_SWING_ASSESSMENTS");
    assert.ok(lessonMgmtSource.includes("JAVA_SWING_EXERCISES"), "LessonManagementTab must import JAVA_SWING_EXERCISES");
    assert.ok(lessonMgmtSource.includes("ASSESSMENT_PASSING_SCORE"), "LessonManagementTab must use ASSESSMENT_PASSING_SCORE");

    const swingModSource = fs.readFileSync(path.join(__dirname, "../src/components/JavaSwingModule.tsx"), "utf8");
    assert.ok(swingModSource.includes("SWING_PASSING_PERCENTAGE"), "JavaSwingModule.tsx must use SWING_PASSING_PERCENTAGE");
    console.log("  ✅ PASS: Frontend Teacher Lesson Management and Java Swing Module verified.");

    console.log("\n================================================================");
    console.log("🎯 ALL 17-LESSON RESTORATION VERIFICATION TESTS PASSED (100%)");
    console.log("================================================================");
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
