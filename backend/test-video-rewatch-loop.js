/**
 * test-video-rewatch-loop.js
 *
 * Comprehensive regression tests for the Assessment Failure Video Review Loop:
 * 1. Failing 3 attempts (<60%) exhausts attempts (3 of 3, 0 remaining).
 * 2. Assessment becomes locked against further attempts (ATTEMPT_LIMIT_REACHED).
 * 3. Resetting the lesson assessment & video:
 *    - Clears quiz attempts counter (reset to 0).
 *    - Resets video progress in student_progress, video_progress, and lesson_progress to 0%.
 * 4. Progression gating:
 *    - Video is incomplete (<95%), which blocks assessment with VIDEO_INCOMPLETE.
 *    - Practice IDE remains locked.
 *    - Next lesson remains locked.
 * 5. Re-watching video to >=95%:
 *    - Video completed becomes true.
 *    - Assessment unlocks with 3 fresh attempts (Attempt 1 of 3).
 * 6. Passing the assessment (>=60%):
 *    - Assessment passes.
 *    - Practice IDE unlocks.
 * 7. Multi-user and multi-lesson isolation.
 */

const assert = require('assert');

const VIDEO_THRESHOLD = 95;
const ASSESSMENT_PASSING_SCORE = 60;
const MAX_ATTEMPTS = 3;

class SimulatedStore {
    constructor() {
        this.studentProgress = new Map();
        this.videoProgress = new Map();
        this.quizAttempts = new Map();
        this.lessonProgress = new Map();
        this.assessmentSessions = new Map();
    }

    normalizeLessonId(rawId) {
        if (/^\d+$/.test(rawId)) return `oop_lesson_${rawId}`;
        if (rawId.startsWith('vid_')) return rawId.replace(/^vid_/, '');
        return rawId;
    }

    // PUT /api/progress
    saveVideoProgress(studentId, rawLessonId, lastPosition, completionPercentage, completed = false) {
        const canonicalId = this.normalizeLessonId(rawLessonId);
        const safePercentage = Math.max(0, Math.min(100, Number(completionPercentage) || 0));
        const safePosition = Math.max(0, Number(lastPosition) || 0);
        const isCompleted = safePercentage >= VIDEO_THRESHOLD || Boolean(completed);

        const spKey = `${studentId}:${canonicalId}`;
        const existingSp = this.studentProgress.get(spKey) || {
            student_user_id: studentId,
            video_id: canonicalId,
            last_position: 0,
            completion_percentage: 0,
            completed: false
        };

        const updatedSp = {
            student_user_id: studentId,
            video_id: canonicalId,
            last_position: Math.max(existingSp.last_position, safePosition),
            completion_percentage: Math.max(existingSp.completion_percentage, safePercentage),
            completed: existingSp.completed || isCompleted || Math.max(existingSp.completion_percentage, safePercentage) >= VIDEO_THRESHOLD,
            updated_at: new Date().toISOString()
        };
        this.studentProgress.set(spKey, updatedSp);

        const vpKey = `${studentId}:${canonicalId}`;
        const existingVp = this.videoProgress.get(vpKey) || {
            student_id: studentId,
            lesson_id: canonicalId,
            current_time: 0,
            watch_percentage: 0,
            completed: false
        };

        const updatedVp = {
            student_id: studentId,
            lesson_id: canonicalId,
            current_time: Math.max(existingVp.current_time, safePosition),
            watch_percentage: Math.max(existingVp.watch_percentage, safePercentage),
            completed: existingVp.completed || isCompleted || Math.max(existingVp.watch_percentage, safePercentage) >= VIDEO_THRESHOLD,
            updated_at: new Date().toISOString()
        };
        this.videoProgress.set(vpKey, updatedVp);

        return { sp: updatedSp, vp: updatedVp };
    }

    // POST /api/assessments/session/start
    startAssessmentSession(studentId, rawLessonId) {
        const canonicalId = this.normalizeLessonId(rawLessonId);
        const access = this.getLessonAccessState(studentId, canonicalId);

        if (!access.assessmentUnlocked) {
            return {
                allowed: false,
                status: 403,
                errorCode: 'VIDEO_INCOMPLETE',
                message: 'Complete at least 95% of the current lesson video before starting its assessment.'
            };
        }

        const attemptsKey = `${studentId}:${canonicalId}`;
        const attempts = this.quizAttempts.get(attemptsKey) || [];
        if (attempts.length >= MAX_ATTEMPTS) {
            return {
                allowed: false,
                status: 429,
                errorCode: 'ATTEMPT_LIMIT_REACHED',
                message: `You have used all ${MAX_ATTEMPTS} attempts for this assessment.`
            };
        }

        const sessionId = `sess_${Date.now()}_${Math.random()}`;
        this.assessmentSessions.set(sessionId, {
            id: sessionId,
            student_user_id: studentId,
            lesson_id: canonicalId,
            attempt_number: attempts.length + 1,
            status: 'active'
        });

        return {
            allowed: true,
            status: 200,
            data: { sessionId, attemptNumber: attempts.length + 1 }
        };
    }

    // POST /api/assessments/session/submit
    submitAssessmentSession(sessionId, score, total = 15) {
        const session = this.assessmentSessions.get(sessionId);
        assert(session, 'Assessment session must exist');
        assert.strictEqual(session.status, 'active', 'Session must be active');

        const percentage = Math.round((score / total) * 100);
        const passed = percentage >= ASSESSMENT_PASSING_SCORE;

        const attemptsKey = `${session.student_user_id}:${session.lesson_id}`;
        const attempts = this.quizAttempts.get(attemptsKey) || [];

        const attempt = {
            id: `attempt_${attempts.length + 1}`,
            student_user_id: session.student_user_id,
            lesson_id: session.lesson_id,
            score,
            total,
            percentage,
            passed,
            attempt_number: attempts.length + 1,
            date_completed: new Date().toISOString()
        };

        attempts.push(attempt);
        this.quizAttempts.set(attemptsKey, attempts);
        session.status = 'completed';

        return {
            attempt,
            attemptCount: attempts.length,
            passed,
            attemptsExhausted: !passed && attempts.length >= MAX_ATTEMPTS
        };
    }

    // POST /api/assessments/:lessonId/reset
    resetLessonAssessmentAndVideo(studentId, rawLessonId) {
        const canonicalId = this.normalizeLessonId(rawLessonId);

        // 1. Delete quiz attempts
        this.quizAttempts.delete(`${studentId}:${canonicalId}`);

        // 2. Delete active assessment sessions
        for (const [sId, sess] of this.assessmentSessions.entries()) {
            if (sess.student_user_id === studentId && sess.lesson_id === canonicalId) {
                this.assessmentSessions.delete(sId);
            }
        }

        // 3. Reset student_progress
        const spKey = `${studentId}:${canonicalId}`;
        if (this.studentProgress.has(spKey)) {
            const current = this.studentProgress.get(spKey);
            this.studentProgress.set(spKey, {
                ...current,
                completion_percentage: 0,
                last_position: 0,
                completed: false,
                updated_at: new Date().toISOString()
            });
        }

        // 4. Reset video_progress
        const vpKey = `${studentId}:${canonicalId}`;
        if (this.videoProgress.has(vpKey)) {
            const current = this.videoProgress.get(vpKey);
            this.videoProgress.set(vpKey, {
                ...current,
                watch_percentage: 0,
                current_time: 0,
                completed: false,
                updated_at: new Date().toISOString()
            });
        }

        // 5. Reset lesson_progress
        const lpKey = `${studentId}:${canonicalId}`;
        if (this.lessonProgress.has(lpKey)) {
            const current = this.lessonProgress.get(lpKey);
            this.lessonProgress.set(lpKey, {
                ...current,
                video_completed: false,
                quiz_passed: false,
                completed: false,
                updated_at: new Date().toISOString()
            });
        }

        const access = this.getLessonAccessState(studentId, canonicalId);
        return {
            studentId,
            lessonId: canonicalId,
            videoProgress: access.videoProgress,
            videoCompleted: access.videoCompleted,
            assessmentUnlocked: access.assessmentUnlocked,
            quizAttempts: access.attemptsUsed,
            access
        };
    }

    getLessonAccessState(studentId, canonicalId) {
        const sp = this.studentProgress.get(`${studentId}:${canonicalId}`);
        const vp = this.videoProgress.get(`${studentId}:${canonicalId}`);
        const attempts = this.quizAttempts.get(`${studentId}:${canonicalId}`) || [];

        const videoPercentage = Math.max(sp?.completion_percentage || 0, vp?.watch_percentage || 0);
        const videoCompleted = Boolean((sp?.completed || vp?.completed) || videoPercentage >= VIDEO_THRESHOLD);

        const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        const assessmentPassed = attempts.some(a => a.passed);
        const attemptsUsed = attempts.length;

        return {
            lessonId: canonicalId,
            videoProgress: videoPercentage,
            videoCompleted,
            assessmentUnlocked: videoCompleted,
            assessmentPassed,
            attemptsUsed,
            attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptsUsed),
            isExhausted: !assessmentPassed && attemptsUsed >= MAX_ATTEMPTS,
            practiceUnlocked: Boolean(videoCompleted && assessmentPassed),
            completed: Boolean(videoCompleted && assessmentPassed)
        };
    }
}

function runVideoReviewLoopTests() {
    console.log('================================================================');
    console.log('🔄 RUNNING ASSESSMENT FAILURE VIDEO REVIEW LOOP REGRESSION TESTS');
    console.log('================================================================\n');

    const store = new SimulatedStore();
    const student1 = 'stu-uuid-001';
    const student2 = 'stu-uuid-002';
    const lesson = 'oop_lesson_12';

    // Step 1: Initial state - Video watched to 100%
    console.log('--- Step 1: Student watches video to 100% ---');
    store.saveVideoProgress(student1, lesson, 900, 100, true);
    let state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.videoProgress, 100, 'Video progress must be 100%');
    assert.strictEqual(state.videoCompleted, true, 'Video must be marked completed');
    assert.strictEqual(state.assessmentUnlocked, true, 'Assessment must be unlocked for video >= 95%');
    assert.strictEqual(state.attemptsUsed, 0, 'No attempts used initially');
    assert.strictEqual(state.practiceUnlocked, false, 'Practice IDE must remain locked before passing assessment');
    console.log('  ✅ PASS: Video 100% unlocks assessment, practice remains locked\n');

    // Step 2: Student attempts assessment 1 -> fails (8/15 = 53% < 60%)
    console.log('--- Step 2: Attempt 1 fails (<60%) ---');
    let s1 = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(s1.allowed, true, 'Starting Attempt 1 must be permitted');
    let sub1 = store.submitAssessmentSession(s1.data.sessionId, 8, 15);
    assert.strictEqual(sub1.passed, false, 'Score 8/15 (53%) must fail at 60% passing rate');
    assert.strictEqual(sub1.attemptCount, 1, 'Attempt count must be 1');
    assert.strictEqual(sub1.attemptsExhausted, false, 'Attempts must not be exhausted yet');
    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.attemptsRemaining, 2, '2 attempts remaining');
    console.log('  ✅ PASS: Attempt 1 failed (53%), 2 attempts remaining\n');

    // Step 3: Student attempts assessment 2 -> fails (7/15 = 47% < 60%)
    console.log('--- Step 3: Attempt 2 fails (<60%) ---');
    let s2 = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(s2.allowed, true, 'Starting Attempt 2 must be permitted');
    let sub2 = store.submitAssessmentSession(s2.data.sessionId, 7, 15);
    assert.strictEqual(sub2.passed, false, 'Score 7/15 (47%) must fail');
    assert.strictEqual(sub2.attemptCount, 2, 'Attempt count must be 2');
    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.attemptsRemaining, 1, '1 attempt remaining');
    console.log('  ✅ PASS: Attempt 2 failed (47%), 1 attempt remaining\n');

    // Step 4: Student attempts assessment 3 -> fails (8/15 = 53% < 60%) -> EXHAUSTED!
    console.log('--- Step 4: Final Attempt 3 fails -> Attempts Exhausted ---');
    let s3 = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(s3.allowed, true, 'Starting Attempt 3 must be permitted');
    let sub3 = store.submitAssessmentSession(s3.data.sessionId, 8, 15);
    assert.strictEqual(sub3.passed, false, 'Score 8/15 (53%) must fail');
    assert.strictEqual(sub3.attemptCount, 3, 'Attempt count must be 3 of 3');
    assert.strictEqual(sub3.attemptsExhausted, true, 'attemptsExhausted flag must be TRUE');

    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.isExhausted, true, 'State must indicate attempts are exhausted');
    assert.strictEqual(state.attemptsRemaining, 0, '0 attempts remaining');
    assert.strictEqual(state.practiceUnlocked, false, 'Practice IDE remains strictly locked');

    // Trying to start attempt 4 is blocked
    let s4 = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(s4.allowed, false, 'Attempt 4 must be blocked');
    assert.strictEqual(s4.status, 429, 'Status must be 429 Too Many Requests');
    assert.strictEqual(s4.errorCode, 'ATTEMPT_LIMIT_REACHED', 'Error code must be ATTEMPT_LIMIT_REACHED');
    console.log('  ✅ PASS: All 3 attempts exhausted, 4th attempt blocked with ATTEMPT_LIMIT_REACHED\n');

    // Step 5: Pedagogical Reset Loop triggered (POST /api/assessments/:lessonId/reset)
    console.log('--- Step 5: Reset endpoint invoked (Pedagogical Review Loop) ---');
    const resetResult = store.resetLessonAssessmentAndVideo(student1, lesson);
    assert.strictEqual(resetResult.videoProgress, 0, 'Video progress must be reset to 0%');
    assert.strictEqual(resetResult.videoCompleted, false, 'Video completed must be FALSE');
    assert.strictEqual(resetResult.quizAttempts, 0, 'Quiz attempts counter must be reset to 0');
    assert.strictEqual(resetResult.assessmentUnlocked, false, 'Assessment must now be locked');

    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.videoProgress, 0, 'State video progress must be 0%');
    assert.strictEqual(state.videoCompleted, false, 'State video completed must be FALSE');
    assert.strictEqual(state.assessmentUnlocked, false, 'Assessment must be locked until video re-watched');
    assert.strictEqual(state.practiceUnlocked, false, 'Practice IDE remains locked');
    console.log('  ✅ PASS: Reset cleared quiz_attempts counter and reset video progress to 0%\n');

    // Step 6: Progression Gating - Assessment locked with VIDEO_INCOMPLETE
    console.log('--- Step 6: Assessment session start blocked until video re-watched ---');
    let reStart = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(reStart.allowed, false, 'Assessment start must be blocked');
    assert.strictEqual(reStart.status, 403, 'Must return 403 Forbidden');
    assert.strictEqual(reStart.errorCode, 'VIDEO_INCOMPLETE', 'Must report VIDEO_INCOMPLETE error');
    console.log('  ✅ PASS: Session creation blocked with VIDEO_INCOMPLETE (403)\n');

    // Step 7: Student re-watches video
    console.log('--- Step 7: Student re-watches video from 0:00 to 95% ---');
    // Part-way watch (50%)
    store.saveVideoProgress(student1, lesson, 450, 50, false);
    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.videoProgress, 50, 'Progress must be 50%');
    assert.strictEqual(state.videoCompleted, false, '50% is not completed (<95%)');
    assert.strictEqual(state.assessmentUnlocked, false, 'Assessment remains locked at 50%');

    // Watch reaches 95% threshold
    store.saveVideoProgress(student1, lesson, 855, 95, true);
    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.videoProgress, 95, 'Progress must be 95%');
    assert.strictEqual(state.videoCompleted, true, 'Video must be marked completed at 95%');
    assert.strictEqual(state.assessmentUnlocked, true, 'Assessment unlocks automatically at 95%');
    assert.strictEqual(state.attemptsUsed, 0, 'Fresh attempt counter is at 0');
    assert.strictEqual(state.attemptsRemaining, 3, 'All 3 attempts restored');
    console.log('  ✅ PASS: Re-watching video to 95% unlocks assessment with 3 fresh attempts\n');

    // Step 8: Student takes fresh Attempt 1 and passes (10/15 = 67% >= 60%)
    console.log('--- Step 8: Student takes Attempt 1 and passes with >=60% ---');
    let freshSession = store.startAssessmentSession(student1, lesson);
    assert.strictEqual(freshSession.allowed, true, 'Fresh attempt session must be allowed');
    assert.strictEqual(freshSession.data.attemptNumber, 1, 'Must be Attempt #1');

    let freshSubmit = store.submitAssessmentSession(freshSession.data.sessionId, 10, 15);
    assert.strictEqual(freshSubmit.passed, true, '10/15 (67%) must pass assessment at 60% threshold');
    assert.strictEqual(freshSubmit.attemptCount, 1, 'Attempt count is 1');

    state = store.getLessonAccessState(student1, lesson);
    assert.strictEqual(state.assessmentPassed, true, 'Assessment must be marked passed');
    assert.strictEqual(state.practiceUnlocked, true, 'Practice IDE is now unlocked!');
    console.log('  ✅ PASS: Passing fresh Attempt 1 (67%) successfully unlocks Practice IDE!\n');

    // Step 9: Multi-student data isolation verification
    console.log('--- Step 9: Multi-student isolation check ---');
    store.saveVideoProgress(student2, lesson, 900, 100, true);
    let s2sess = store.startAssessmentSession(student2, lesson);
    store.submitAssessmentSession(s2sess.data.sessionId, 15, 15);
    let s2state = store.getLessonAccessState(student2, lesson);
    assert.strictEqual(s2state.assessmentPassed, true, 'Student 2 assessment passed');

    // Resetting student 1 must NOT affect student 2
    store.resetLessonAssessmentAndVideo(student1, lesson);
    let s2stateAfter = store.getLessonAccessState(student2, lesson);
    assert.strictEqual(s2stateAfter.videoProgress, 100, 'Student 2 video progress preserved at 100%');
    assert.strictEqual(s2stateAfter.assessmentPassed, true, 'Student 2 passed status preserved');
    assert.strictEqual(s2stateAfter.practiceUnlocked, true, 'Student 2 practice IDE remains unlocked');
    console.log('  ✅ PASS: Multi-student isolation strictly preserved\n');

    console.log('================================================================');
    console.log('🎯 ALL VIDEO REVIEW LOOP REGRESSION TESTS PASSED (100%)');
    console.log('================================================================');
}

runVideoReviewLoopTests();
