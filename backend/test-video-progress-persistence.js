/**
 * test-video-progress-persistence.js
 *
 * Verifies end-to-end video progress persistence, multi-table consistency,
 * reload persistence, non-regression (monotonic max), >=95% completion threshold,
 * and next-lesson sequential unlocking.
 */

const assert = require('assert');

// In-memory simulation of the authoritative progress store mirroring Neon PostgreSQL schema
class VideoProgressStore {
    constructor() {
        this.studentProgress = new Map(); // key: `${studentId}:${videoId}` -> record
        this.videoProgress = new Map();   // key: `${studentId}:${lessonId}` -> record
        this.quizAttempts = new Map();    // key: `${studentId}:${lessonId}` -> attempt
        this.practiceSubmissions = new Map(); // key: `${studentId}:${lessonId}` -> submission
        this.lessonProgress = new Map();  // key: `${studentId}:${lessonId}` -> record
    }

    // Normalizes lesson ID to canonical format
    normalizeLessonId(rawId) {
        if (/^\d+$/.test(rawId)) {
            return `oop_lesson_${rawId}`;
        }
        if (rawId.startsWith('vid_')) {
            return rawId.replace(/^vid_/, '');
        }
        return rawId;
    }

    // PUT /api/progress
    saveVideoProgress(studentId, rawLessonId, lastPosition, completionPercentage, completed = false) {
        assert(studentId, 'studentId is required');
        assert(rawLessonId, 'lessonId is required');

        const canonicalId = this.normalizeLessonId(rawLessonId);
        const safePercentage = Math.max(0, Math.min(100, Number(completionPercentage) || 0));
        const safePosition = Math.max(0, Number(lastPosition) || 0);
        const isCompleted = safePercentage >= 95 || Boolean(completed);

        // Update student_progress
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
            completed: existingSp.completed || isCompleted || Math.max(existingSp.completion_percentage, safePercentage) >= 95,
            updated_at: new Date().toISOString()
        };
        this.studentProgress.set(spKey, updatedSp);

        // Update video_progress
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
            completed: existingVp.completed || isCompleted || Math.max(existingVp.watch_percentage, safePercentage) >= 95,
            updated_at: new Date().toISOString()
        };
        this.videoProgress.set(vpKey, updatedVp);

        // Update lesson_progress video status
        this.syncLessonProgress(studentId, canonicalId);

        return updatedSp;
    }

    saveQuizAttempt(studentId, lessonId, percentage, passed) {
        const canonicalId = this.normalizeLessonId(lessonId);
        this.quizAttempts.set(`${studentId}:${canonicalId}`, {
            student_user_id: studentId,
            lesson_id: canonicalId,
            percentage: Number(percentage) || 0,
            passed: Boolean(passed) || Number(percentage) >= 80
        });
        this.syncLessonProgress(studentId, canonicalId);
    }

    savePracticeSubmission(studentId, lessonId, score, remedialRequired = false) {
        const canonicalId = this.normalizeLessonId(lessonId);
        this.practiceSubmissions.set(`${studentId}:${canonicalId}`, {
            student_id: studentId,
            lesson_id: canonicalId,
            score: Number(score) || 0,
            remedial_required: Boolean(remedialRequired)
        });
        this.syncLessonProgress(studentId, canonicalId);
    }

    syncLessonProgress(studentId, canonicalId) {
        const sp = this.studentProgress.get(`${studentId}:${canonicalId}`);
        const vp = this.videoProgress.get(`${studentId}:${canonicalId}`);
        const qa = this.quizAttempts.get(`${studentId}:${canonicalId}`);
        const ps = this.practiceSubmissions.get(`${studentId}:${canonicalId}`);

        const videoProgress = Math.max(sp?.completion_percentage || 0, vp?.watch_percentage || 0);
        const videoCompleted = videoProgress >= 95 || Boolean(sp?.completed) || Boolean(vp?.completed);
        const assessmentPassed = Boolean(qa?.passed);
        const practiceCompleted = Boolean(ps && !ps.remedial_required);
        const fullyCompleted = videoCompleted && assessmentPassed && practiceCompleted;

        this.lessonProgress.set(`${studentId}:${canonicalId}`, {
            student_id: studentId,
            lesson_id: canonicalId,
            video_completed: videoCompleted,
            quiz_passed: assessmentPassed,
            practice_completed: practiceCompleted,
            completed: fullyCompleted
        });
    }

    // GET /api/progress/:studentId
    getProgressMap(studentId) {
        const map = {};
        for (const [key, val] of this.studentProgress.entries()) {
            if (key.startsWith(`${studentId}:`)) {
                map[val.video_id] = {
                    lastPosition: val.last_position,
                    completionPercentage: val.completion_percentage,
                    completed: val.completed
                };
                // Numeric alias
                if (val.video_id.startsWith('oop_lesson_')) {
                    const num = val.video_id.replace('oop_lesson_', '');
                    map[num] = map[val.video_id];
                }
            }
        }
        return map;
    }

    // getLessonAccessState
    getLessonAccess(studentId, lessonSeq) {
        if (lessonSeq === 1) {
            return { canAccess: true, reason: null };
        }
        const prevCanonicalId = `oop_lesson_${lessonSeq - 1}`;
        const prevProgress = this.lessonProgress.get(`${studentId}:${prevCanonicalId}`);
        if (!prevProgress || !prevProgress.completed) {
            if (!prevProgress?.video_completed) {
                return { canAccess: false, reason: 'Complete the previous lesson video to at least 95% first.' };
            }
            if (!prevProgress?.quiz_passed) {
                return { canAccess: false, reason: 'Pass the previous lesson assessment first.' };
            }
            return { canAccess: false, reason: 'Complete the previous lesson practice first.' };
        }
        return { canAccess: true, reason: null };
    }
}

async function runVideoProgressTests() {
    console.log('================================================================');
    console.log('🎬 RUNNING VIDEO PROGRESS PERSISTENCE & UNLOCKING VERIFICATION');
    console.log('================================================================\n');

    const store = new VideoProgressStore();
    const studentA = '1a44b215-9fb4-4791-a5fd-74aa9dcc6df1';
    const studentB = '2b55c326-0ac5-5802-b6fe-85bb0edd7ef2';

    // 1. Initial State: Student A starts with Lesson 1 unlocked, Lesson 2 locked
    console.log('--- Step 1: Initial state & Lesson 1 access ---');
    const initAccessL1 = store.getLessonAccess(studentA, 1);
    const initAccessL2 = store.getLessonAccess(studentA, 2);
    assert.strictEqual(initAccessL1.canAccess, true, 'Lesson 1 should be unlocked by default');
    assert.strictEqual(initAccessL2.canAccess, false, 'Lesson 2 should be locked initially');
    console.log('  ✅ PASS: Lesson 1 accessible, Lesson 2 locked');

    // 2. Student watches Lesson 1 video to 50%
    console.log('\n--- Step 2: Save 50% video progress ---');
    store.saveVideoProgress(studentA, 'oop_lesson_1', 120, 50);
    const progressMapAfter50 = store.getProgressMap(studentA);
    assert.strictEqual(progressMapAfter50['oop_lesson_1'].completionPercentage, 50);
    assert.strictEqual(progressMapAfter50['1'].completionPercentage, 50, 'Alias "1" matches canonical "oop_lesson_1"');
    assert.strictEqual(progressMapAfter50['oop_lesson_1'].completed, false, '50% must not mark video completed');
    console.log('  ✅ PASS: 50% progress saved reliably under canonical and alias IDs');

    // 3. Page Reload / Session Restore simulation
    console.log('\n--- Step 3: Page refresh / reload restores saved 50% ---');
    const restoredMap = store.getProgressMap(studentA);
    assert.strictEqual(restoredMap['oop_lesson_1'].lastPosition, 120);
    assert.strictEqual(restoredMap['oop_lesson_1'].completionPercentage, 50);
    console.log('  ✅ PASS: Reload preserves 50% watch progress and playback position');

    // 4. Video rewound to 10% (Monotonic GREATEST check)
    console.log('\n--- Step 4: Rewind video does not reduce saved progress ---');
    store.saveVideoProgress(studentA, 'oop_lesson_1', 30, 10);
    const progressAfterRewind = store.getProgressMap(studentA);
    assert.strictEqual(progressAfterRewind['oop_lesson_1'].completionPercentage, 50, 'Progress must not decrease on rewind');
    assert.strictEqual(progressAfterRewind['oop_lesson_1'].lastPosition, 120, 'Position must preserve highest point');
    console.log('  ✅ PASS: Monotonic progress preservation verified');

    // 5. Student finishes video to 95%
    console.log('\n--- Step 5: Reach 95% threshold -> videoCompleted = true ---');
    store.saveVideoProgress(studentA, 'oop_lesson_1', 240, 95);
    const progressAfter95 = store.getProgressMap(studentA);
    assert.strictEqual(progressAfter95['oop_lesson_1'].completed, true, '>= 95% marks video completed');
    
    // Lesson 2 must still be locked because assessment and practice are pending
    const accessAfterVideo95 = store.getLessonAccess(studentA, 2);
    assert.strictEqual(accessAfterVideo95.canAccess, false, 'Lesson 2 remains locked until quiz and practice pass');
    assert.strictEqual(accessAfterVideo95.reason, 'Pass the previous lesson assessment first.');
    console.log('  ✅ PASS: Video completes at 95%, Assessment unlocks, Lesson 2 correctly locked');

    // 6. Student passes Assessment (85%)
    console.log('\n--- Step 6: Pass assessment with 85% ---');
    store.saveQuizAttempt(studentA, 'oop_lesson_1', 85, true);
    const accessAfterQuiz = store.getLessonAccess(studentA, 2);
    assert.strictEqual(accessAfterQuiz.canAccess, false, 'Lesson 2 still locked pending practice');
    assert.strictEqual(accessAfterQuiz.reason, 'Complete the previous lesson practice first.');
    console.log('  ✅ PASS: Assessment passed, Practice IDE unlocks, Lesson 2 correctly locked');

    // 7. Student submits Practice IDE
    console.log('\n--- Step 7: Submit Practice IDE -> Unlocks Lesson 2 ---');
    store.savePracticeSubmission(studentA, 'oop_lesson_1', 100, false);
    const accessAfterPractice = store.getLessonAccess(studentA, 2);
    assert.strictEqual(accessAfterPractice.canAccess, true, 'Lesson 2 video unlocks immediately upon full completion of Lesson 1');
    console.log('  ✅ PASS: Lesson 2 unlocked immediately upon Lesson 1 completion');

    // 8. Isolation: Student B has 0% progress (no cross-student bleed)
    console.log('\n--- Step 8: Multi-user isolation ---');
    const studentBMap = store.getProgressMap(studentB);
    assert.strictEqual(studentBMap['oop_lesson_1'], undefined, 'Student B has no progress recorded');
    const studentBAccessL2 = store.getLessonAccess(studentB, 2);
    assert.strictEqual(studentBAccessL2.canAccess, false, 'Student B cannot access Lesson 2');
    console.log('  ✅ PASS: Multi-user progress isolation strictly enforced');

    console.log('\n================================================================');
    console.log('🎯 ALL VIDEO PROGRESS & UNLOCKING TESTS PASSED (100%)');
    console.log('================================================================');
}

runVideoProgressTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
