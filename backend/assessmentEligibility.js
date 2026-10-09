const { normalizeAssessmentPercentage, isPassingAssessment } = require('./assessmentValidation');

const assessmentMatchesLesson = ({ assessmentId, attemptLessonId, lessonId, canonicalAssessmentId, databaseAssessmentIds = [] }) => {
    if (!lessonId) return false;
    if (attemptLessonId && attemptLessonId === lessonId) {
        return !canonicalAssessmentId
            || assessmentId === canonicalAssessmentId
            || databaseAssessmentIds.includes(assessmentId);
    }
    // Legacy attempts may have an empty lesson_id. They are still safe to use
    // when their assessment id is the canonical/database assessment for this lesson.
    return !attemptLessonId
        && (assessmentId === canonicalAssessmentId || databaseAssessmentIds.includes(assessmentId));
};

const hasPassingAssessment = ({ attempts = [], lessonId, canonicalAssessmentId, databaseAssessmentIds = [] }) => attempts.some(attempt => (
    assessmentMatchesLesson({
        assessmentId: attempt.assessment_id || attempt.assessmentId,
        attemptLessonId: attempt.lesson_id || attempt.lessonId || '',
        lessonId,
        canonicalAssessmentId,
        databaseAssessmentIds
    }) && isPassingAssessment(attempt)
));

module.exports = {
    assessmentMatchesLesson,
    hasPassingAssessment,
    normalizeAssessmentPercentage
};
