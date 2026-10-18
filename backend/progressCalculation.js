const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * Calculate progress only from recorded evidence. Missing evidence is never
 * treated as completion, including lessons without a configured challenge.
 */
const calculateLessonProgress = ({ videoCompleted = false, assessmentPassed = false, practiceCompleted = false }) => {
    const completedParts = [videoCompleted, assessmentPassed, practiceCompleted].filter(Boolean).length;
    return Math.round((completedParts / 3) * 10000) / 100;
};

const isPracticeCompleted = ({ id, score = 0, teacherScore = null, compileStatus = '', passingScore = 70, remedialRequired = false }) => {
    const recordedScore = Number(teacherScore ?? score ?? 0);
    const hasValidResult = teacherScore !== null && teacherScore !== undefined || compileStatus === 'success';
    return Boolean(id) && recordedScore >= Number(passingScore || 70) && hasValidResult && remedialRequired !== true;
};

const calculateCourseProgress = (lessonProgresses) => {
    const lessons = Array.isArray(lessonProgresses) ? lessonProgresses : [];
    if (!lessons.length) return 0;
    return Math.round((lessons.reduce((sum, progress) => sum + clampPercent(progress), 0) / lessons.length) * 100) / 100;
};

module.exports = { calculateLessonProgress, calculateCourseProgress, isPracticeCompleted };
