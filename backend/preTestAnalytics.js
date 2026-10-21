// ============================================================================
// Java OOP Pre-Test Diagnostics & Personalized Insights Engine
// ============================================================================
const { ALL_OOP_QUESTIONS } = require("./questionBank");
const { OOP_TOPIC_IDS, CANONICAL_OOP_LESSON_TITLES } = require("./oopTopicPerformance");

// Pre-Test Passing and Diagnostic Thresholds
const PRE_TEST_PASSING_SCORE = 60; // Baseline diagnostic benchmark

const TOPIC_DIAGNOSTIC_THRESHOLDS = {
    STRONG_MIN: 80,      // 80% - 100%
    DEVELOPING_MIN: 60,  // 60% - 79%
    // Below 60%: Needs Improvement
};

const CANONICAL_OOP_TOPIC_METADATA = {
    oop_lesson_1: {
        id: "oop_lesson_1",
        sequence: 1,
        name: "Classes & Objects",
        keyConcepts: ["Class blueprint", "Object instance", "Instance variables", "Object state and behavior"],
        pedagogicalAdvice: "Review how classes act as blueprints to instantiate objects with unique states and behaviors."
    },
    oop_lesson_2: {
        id: "oop_lesson_2",
        sequence: 2,
        name: "Constructors",
        keyConcepts: ["Object initialization", "Constructor parameters", "Default constructors", "Constructor naming"],
        pedagogicalAdvice: "Review object initialization, constructor naming rules, and default vs parameterized constructors."
    },
    oop_lesson_3: {
        id: "oop_lesson_3",
        sequence: 3,
        name: "Object Methods",
        keyConcepts: ["Invoking object methods", "Parameters and return values", "Instance field manipulation"],
        pedagogicalAdvice: "Review how to declare and invoke object methods, pass parameters, and manage return types."
    },
    oop_lesson_4: {
        id: "oop_lesson_4",
        sequence: 4,
        name: "Encapsulation",
        keyConcepts: ["Data hiding", "Private fields", "Getter and setter methods", "Input validation"],
        pedagogicalAdvice: "Review data hiding, using private fields, and writing robust getter and setter validation methods."
    },
    oop_lesson_5: {
        id: "oop_lesson_5",
        sequence: 5,
        name: "Constructor Overloading",
        keyConcepts: ["Multiple constructors", "Parameter list signatures", "this() constructor chaining"],
        pedagogicalAdvice: "Review defining multiple constructors with differing parameter lists and constructor chaining using this()."
    },
    oop_lesson_6: {
        id: "oop_lesson_6",
        sequence: 6,
        name: "Inheritance",
        keyConcepts: ["Parent-child relationships", "extends keyword", "Code reuse", "Inherited fields & methods"],
        pedagogicalAdvice: "Review parent-child relationships, using the extends keyword, and accessing inherited superclass members."
    },
    oop_lesson_7: {
        id: "oop_lesson_7",
        sequence: 7,
        name: "Polymorphism",
        keyConcepts: ["Method overriding", "Dynamic method dispatch", "Parent references to child instances"],
        pedagogicalAdvice: "Review dynamic method dispatch, method overriding, and runtime polymorphism."
    },
    oop_lesson_8: {
        id: "oop_lesson_8",
        sequence: 8,
        name: "Abstract Classes",
        keyConcepts: ["abstract keyword", "Abstract vs concrete methods", "Subclass implementation obligations"],
        pedagogicalAdvice: "Review declaring abstract classes and methods, preventing direct instantiation, and subclass contracts."
    },
    oop_lesson_9: {
        id: "oop_lesson_9",
        sequence: 9,
        name: "Interfaces / Abstraction",
        keyConcepts: ["Behavioral contracts", "implements keyword", "Separating specification from implementation"],
        pedagogicalAdvice: "Review interface contracts, separating specification from implementation, and multiple interface support."
    },
    oop_lesson_10: {
        id: "oop_lesson_10",
        sequence: 10,
        name: "Interfaces",
        keyConcepts: ["Interface inheritance", "Multiple interfaces", "Constants in interfaces", "Polymorphic reference"],
        pedagogicalAdvice: "Review implementing multiple interfaces, default methods, and using interface polymorphic references."
    },
    oop_lesson_11: {
        id: "oop_lesson_11",
        sequence: 11,
        name: "Array of Objects",
        keyConcepts: ["Object reference arrays", "Element instantiation", "Array traversal", "Null element checks"],
        pedagogicalAdvice: "Review declaring arrays of object references, initializing each array element, and iterating object collections."
    },
    oop_lesson_12: {
        id: "oop_lesson_12",
        sequence: 12,
        name: "Enum",
        keyConcepts: ["Type-safe constants", "enum keyword", "Switch statements with enums", "Enum fields and methods"],
        pedagogicalAdvice: "Review Java enums for fixed constant sets, type safety, and switch statement integration."
    }
};

const formatSeconds = (totalSeconds) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return null;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
};

/**
 * Classifies a topic's diagnostic mastery level according to required rubric:
 * - Strong: 80%–100%
 * - Developing: 60%–79%
 * - Needs Improvement: below 60%
 * - Not Assessed: 0 questions tested
 */
const classifyDiagnosticTopic = (accuracyPercentage, questionCount) => {
    if (!questionCount || questionCount <= 0 || accuracyPercentage === null || accuracyPercentage === undefined) {
        return "Not Assessed";
    }
    if (accuracyPercentage >= TOPIC_DIAGNOSTIC_THRESHOLDS.STRONG_MIN) {
        return "Strong";
    }
    if (accuracyPercentage >= TOPIC_DIAGNOSTIC_THRESHOLDS.DEVELOPING_MIN) {
        return "Developing";
    }
    return "Needs Improvement";
};

/**
 * Computes deep diagnostic pre-test analysis from submitted answers.
 * Analyzes questions against the authoritative 240-question bank.
 */
const computePreTestInsights = ({
    questions = [],
    answers = {},
    score = null,
    total = null,
    percentage = null,
    passed = null,
    attemptNumber = 1,
    dateCompleted = null,
    startedAt = null,
    completedAt = null,
    timeSpentSeconds = null,
    passingScore = PRE_TEST_PASSING_SCORE
} = {}) => {
    const bankMap = new Map(ALL_OOP_QUESTIONS.map(q => [q.id, q]));

    // If questions was empty or only had IDs, reconstitute from bankMap or provided question objects
    let processedQuestions = questions;
    if (!Array.isArray(processedQuestions) || processedQuestions.length === 0) {
        // Reconstitute from answers keys if available
        const answerKeys = Object.keys(answers || {});
        processedQuestions = answerKeys.map(id => bankMap.get(id)).filter(Boolean);
    }

    // Evaluate each question deterministically
    let calculatedScore = 0;
    let answeredCount = 0;
    const reviewList = [];

    // Grouping container for the 12 canonical topics
    const topicBuckets = {};
    for (const topicId of OOP_TOPIC_IDS) {
        const meta = CANONICAL_OOP_TOPIC_METADATA[topicId] || {};
        topicBuckets[topicId] = {
            topicId,
            lessonId: topicId,
            sequence: meta.sequence || 1,
            topicName: meta.name || CANONICAL_OOP_LESSON_TITLES[topicId] || topicId,
            keyConcepts: meta.keyConcepts || [],
            pedagogicalAdvice: meta.pedagogicalAdvice || "Review core lesson material.",
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            incorrectQuestions: [],
            testedQuestionIds: []
        };
    }

    for (const q of processedQuestions) {
        if (!q || !q.id) continue;
        const master = bankMap.get(q.id) || q;
        const submitted = answers[q.id];
        const hasAnswered = submitted !== undefined && submitted !== null && String(submitted).trim() !== "";
        if (hasAnswered) answeredCount++;

        const isCorrect = Boolean(
            master.correctAnswer &&
            hasAnswered &&
            String(submitted).trim() === String(master.correctAnswer).trim()
        );

        if (isCorrect) {
            calculatedScore += 1;
        }

        const lessonId = q.lessonId || master.lessonId || "oop_lesson_1";
        const topicName = q.topicName || master.topicName || CANONICAL_OOP_LESSON_TITLES[lessonId] || "Classes & Objects";

        const reviewItem = {
            id: q.id,
            lessonId,
            topicName,
            question: q.question || master.question || "",
            options: Array.isArray(q.options) ? q.options : master.options || [],
            difficulty: q.difficulty || master.difficulty || "Medium",
            codeSnippet: q.codeSnippet || master.codeSnippet || "",
            selectedAnswer: hasAnswered ? String(submitted) : "",
            correctAnswer: master.correctAnswer || "",
            explanation: master.explanation || "",
            isCorrect
        };
        reviewList.push(reviewItem);

        // Map into canonical topic bucket
        if (topicBuckets[lessonId]) {
            const bucket = topicBuckets[lessonId];
            bucket.totalQuestions += 1;
            bucket.testedQuestionIds.push(q.id);
            if (isCorrect) {
                bucket.correctAnswers += 1;
            } else {
                bucket.incorrectAnswers += 1;
                bucket.incorrectQuestions.push({
                    id: q.id,
                    question: reviewItem.question,
                    selectedAnswer: reviewItem.selectedAnswer,
                    correctAnswer: reviewItem.correctAnswer,
                    explanation: reviewItem.explanation
                });
            }
        }
    }

    const calculatedTotal = processedQuestions.length || 20;
    const finalScore = score !== null && score !== undefined ? Number(score) : calculatedScore;
    const finalTotal = total !== null && total !== undefined ? Number(total) : calculatedTotal;
    const finalPercentage = percentage !== null && percentage !== undefined
        ? Number(percentage)
        : Math.round((finalScore / (finalTotal || 1)) * 100);
    const finalPassed = passed !== null && passed !== undefined
        ? Boolean(passed)
        : finalPercentage >= Number(passingScore || PRE_TEST_PASSING_SCORE);
    const incorrectCount = Math.max(0, finalTotal - finalScore);

    // Compute duration if timestamps available
    let calculatedDuration = timeSpentSeconds;
    if ((calculatedDuration === null || calculatedDuration === undefined) && startedAt && completedAt) {
        const startMs = new Date(startedAt).getTime();
        const endMs = new Date(completedAt).getTime();
        if (endMs > startMs) {
            calculatedDuration = Math.round((endMs - startMs) / 1000);
        }
    }

    // Build finalized 12 topic performance records
    const topicPerformance = OOP_TOPIC_IDS.map(topicId => {
        const bucket = topicBuckets[topicId];
        const totalQ = bucket.totalQuestions;
        const correctQ = bucket.correctAnswers;
        const incorrectQ = bucket.incorrectAnswers;
        const accuracyPercentage = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : null;
        const status = classifyDiagnosticTopic(accuracyPercentage, totalQ);

        // A topic with only 1 question has small sample size, label as preliminary
        const isPreliminary = totalQ > 0 && totalQ < 2;

        return {
            topicId,
            lessonId: topicId,
            sequence: bucket.sequence,
            topicName: bucket.topicName,
            keyConcepts: bucket.keyConcepts,
            pedagogicalAdvice: bucket.pedagogicalAdvice,
            totalQuestions: totalQ,
            correctAnswers: correctQ,
            incorrectAnswers: incorrectQ,
            accuracyPercentage,
            status,
            isPreliminary,
            incorrectQuestions: bucket.incorrectQuestions
        };
    }).sort((a, b) => a.sequence - b.sequence);

    // Filter categories
    const strengths = topicPerformance.filter(t => t.status === "Strong")
        .sort((a, b) => (b.accuracyPercentage || 0) - (a.accuracyPercentage || 0));

    const developing = topicPerformance.filter(t => t.status === "Developing")
        .sort((a, b) => (b.incorrectAnswers || 0) - (a.incorrectAnswers || 0));

    const weaknesses = topicPerformance.filter(t => t.status === "Needs Improvement")
        .sort((a, b) => (b.incorrectAnswers || 0) - (a.incorrectAnswers || 0));

    const notAssessed = topicPerformance.filter(t => t.status === "Not Assessed");

    // Prioritized topics for review: Weaknesses first (highest incorrect count), then Developing
    const prioritizedTopicsForReview = [...weaknesses, ...developing];

    // Generate personalized recommendations linking to existing lessons
    const recommendations = prioritizedTopicsForReview.map(topic => {
        const isHigh = topic.status === "Needs Improvement";
        return {
            topicId: topic.topicId,
            topicName: topic.topicName,
            lessonId: topic.lessonId,
            lessonSequence: topic.sequence,
            priority: isHigh ? "High" : "Medium",
            status: topic.status,
            accuracyPercentage: topic.accuracyPercentage,
            missedQuestionCount: topic.incorrectAnswers,
            actionText: topic.pedagogicalAdvice,
            concepts: topic.keyConcepts,
            sampleMissedConcepts: topic.incorrectQuestions.map(q => q.question).slice(0, 2)
        };
    });

    return {
        attemptNumber: Number(attemptNumber || 1),
        score: finalScore,
        total: finalTotal,
        totalAnswered: answeredCount,
        correctCount: finalScore,
        incorrectCount,
        percentage: finalPercentage,
        passed: finalPassed,
        passingScore: Number(passingScore || PRE_TEST_PASSING_SCORE),
        diagnosticStatus: "Prior-Knowledge Diagnostic Baseline",
        diagnosticNote: "The pre-test establishes your baseline prior knowledge before course instruction. It does not block Lesson 1 or reflect final mastery.",
        submissionDate: dateCompleted || completedAt || new Date().toISOString(),
        startedAt,
        completedAt,
        timeSpentSeconds: calculatedDuration,
        formattedTimeSpent: formatSeconds(calculatedDuration),
        topicPerformance,
        strengths,
        weaknesses,
        developing,
        notAssessed,
        prioritizedTopicsForReview,
        recommendations,
        review: reviewList
    };
};

module.exports = {
    PRE_TEST_PASSING_SCORE,
    TOPIC_DIAGNOSTIC_THRESHOLDS,
    CANONICAL_OOP_TOPIC_METADATA,
    classifyDiagnosticTopic,
    computePreTestInsights,
    formatSeconds
};
