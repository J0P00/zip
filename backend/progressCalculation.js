const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * Calculate progress only from recorded evidence. Missing evidence is never
 * treated as completion, including lessons without a configured challenge.
 */
const calculateLessonProgress = (options = {}) => {
    const { videoCompleted = false, assessmentPassed = false, practiceCompleted = false } = options || {};
    const completedParts = [videoCompleted, assessmentPassed, practiceCompleted].filter(Boolean).length;
    return Math.round((completedParts / 3) * 10000) / 100;
};

const isPracticeCompleted = (options = {}) => {
    const {
        id = null,
        submissionId = null,
        remedialRequired = false,
        validationFailed = false,
        compileStatus = null,
        score = null,
        teacherScore = null,
        reviewStatus = null
    } = options || {};
    const hasSubmission = Boolean(submissionId || id);
    if (!hasSubmission) return false;
    if (validationFailed === true || remedialRequired === true) return false;
    if (compileStatus === 'failed' || compileStatus === 'runtime_error') return false;
    if (reviewStatus === 'returned') return false;
    if (teacherScore !== null && teacherScore !== undefined) {
        return Number(teacherScore) >= 70;
    }
    return true;
};

const calculateTotalCourseProgress = (completedLessons, totalLessons = 17) => {
    const completed = Math.max(0, Number(completedLessons) || 0);
    const parsedTotal = totalLessons !== undefined && totalLessons !== null ? Number(totalLessons) : 17;
    const total = Math.max(1, isNaN(parsedTotal) ? 17 : parsedTotal);
    return Math.min(100, Math.max(0, Math.round((completed / total) * 10000) / 100));
};

const calculateCourseProgress = (lessonProgresses) => {
    const lessons = Array.isArray(lessonProgresses) ? lessonProgresses : [];
    if (!lessons.length) return 0;
    const avg = lessons.reduce((sum, progress) => sum + clampPercent(progress), 0) / lessons.length;
    return Math.min(100, Math.max(0, Math.round(avg * 100) / 100));
};

module.exports = { calculateLessonProgress, calculateCourseProgress, calculateTotalCourseProgress, isPracticeCompleted };
