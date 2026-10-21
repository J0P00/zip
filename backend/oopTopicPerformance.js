const { ASSESSMENT_PASSING_SCORE, normalizeAssessmentPercentage } = require("./assessmentValidation");

// Stable identifiers for the 12 Java OOP lessons. Matrix rows are keyed by these
// IDs (which are also the quiz_attempts.lesson_id values), never by display name.
const OOP_TOPIC_IDS = Array.from({ length: 12 }, (_, index) => `oop_lesson_${index + 1}`);

// Fallback titles used only when the lessons table has no title for an ID.
// Mirrors the canonical lesson catalog seeded by seedLessons() and shown in
// Teacher Lesson Management.
const CANONICAL_OOP_LESSON_TITLES = {
    oop_lesson_1: "Classes & Objects",
    oop_lesson_2: "Constructors",
    oop_lesson_3: "Object Methods",
    oop_lesson_4: "Encapsulation",
    oop_lesson_5: "Constructor Overloading",
    oop_lesson_6: "Inheritance",
    oop_lesson_7: "Polymorphism",
    oop_lesson_8: "Abstract Classes",
    oop_lesson_9: "Interfaces / Abstraction",
    oop_lesson_10: "Interfaces",
    oop_lesson_11: "Array of Objects",
    oop_lesson_12: "Enum"
};

// Mastery thresholds (unchanged): Strong >= 75, Average 60-74, Struggling < 60.
// Topics without attempts are "Not Assessed" rather than "Struggling".
const classifyTopicMastery = (averageScore, attemptCount) => {
    if (!attemptCount) return "Not Assessed";
    if (averageScore >= 75) return "Strong";
    if (averageScore >= 60) return "Average";
    return "Struggling";
};

const buildOopTopicNameMap = (lessonRows = []) => {
    const titlesById = new Map(
        (lessonRows || [])
            .filter(row => row && OOP_TOPIC_IDS.includes(row.id) && String(row.title || "").trim())
            .map(row => [row.id, String(row.title).trim()])
    );
    return OOP_TOPIC_IDS.reduce((map, id) => {
        map[id] = titlesById.get(id) || CANONICAL_OOP_LESSON_TITLES[id];
        return map;
    }, {});
};

const extractAttemptPercentage = (attempt) => {
    if (!attempt) return 0;
    if (attempt.percentage !== undefined && attempt.percentage !== null) {
        const raw = Number(attempt.percentage);
        if (Number.isFinite(raw)) {
            return raw > 0 && raw <= 1 ? raw * 100 : raw;
        }
    }
    if (attempt.score !== undefined && attempt.score !== null) {
        const score = Number(attempt.score);
        const total = Number(attempt.total);
        if (Number.isFinite(score) && Number.isFinite(total) && total > 0) {
            return (score / total) * 100;
        }
        if (Number.isFinite(score)) {
            return score > 0 && score <= 1 ? score * 100 : score;
        }
    }
    return normalizeAssessmentPercentage(attempt);
};

const computeOopTopicPerformance = (quizAttempts = [], lessonRows = []) => {
    const topicNames = buildOopTopicNameMap(lessonRows);
    const sequenceById = new Map((lessonRows || []).map(row => [row.id, Number(row.sequence)]));

    return OOP_TOPIC_IDS
        .map((topicId, index) => {
            const attempts = (quizAttempts || []).filter(attempt => attempt && attempt.lesson_id === topicId);
            const attemptCount = attempts.length;
            const percentages = attempts.map(attempt => extractAttemptPercentage(attempt));
            const averageScore = attemptCount
                ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / attemptCount)
                : null;
            const passCount = attempts.filter((attempt, i) =>
                attempt.passed === true || percentages[i] >= ASSESSMENT_PASSING_SCORE
            ).length;
            const passRate = attemptCount ? Math.round((passCount / attemptCount) * 100) : null;
            return {
                topicId,
                lessonId: topicId,
                sequence: Number.isFinite(sequenceById.get(topicId)) ? sequenceById.get(topicId) : index + 1,
                topicName: topicNames[topicId],
                attemptCount,
                attempts: attemptCount,
                averageScore,
                avgScore: averageScore,
                passRate,
                status: classifyTopicMastery(averageScore, attemptCount)
            };
        })
        .sort((a, b) => a.sequence - b.sequence);
};

module.exports = {
    OOP_TOPIC_IDS,
    CANONICAL_OOP_LESSON_TITLES,
    classifyTopicMastery,
    buildOopTopicNameMap,
    computeOopTopicPerformance
};
