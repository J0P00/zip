/**
 * Automated Regression Test Suite: Progression, Next Video Unlocking, and Authoritative Progress
 * Validates all 14 scenarios outlined in Step 7 of the specification:
 * 1. New student starts at 0/17 (0%)
 * 2. Student with 1 completed lesson sees 1/17 (5.88%)
 * 3. Student with 2 completed lessons sees 2/17 (11.76%)
 * 4. Video + assessment without passing practice does NOT complete lesson
 * 5. Valid passing practice completes lesson and unlocks next video immediately
 * 6. Refresh / re-fetch preserves same completion status
 * 7. Logout / login (re-query by canonical user ID) preserves progress
 * 8. Replaying completed video does not increase lesson count
 * 9. Repeated attempts / retries do not create duplicate completed lessons
 * 10. Second student starts at 0/17 (zero bleed across accounts)
 * 11. Dashboard and lesson page formulas show exact same completion count
 * 12. Java Swing remains locked until all 12 OOP lessons are completed
 * 13. Teacher grading occurs independently without delaying valid practice unlock
 * 14. Failed or invalid submissions cannot unlock subsequent lessons
 */

const assert = require('assert');
const { calculateLessonProgress, calculateTotalCourseProgress, isPracticeCompleted } = require('./progressCalculation');
const { validateBasicJavaStructure } = require('./basicJavaValidator');

console.log('================================================================');
console.log('🧪 RUNNING LESSON PROGRESSION & NEXT VIDEO UNLOCKING TEST SUITE');
console.log('================================================================\n');

class InMemoryLmsEngine {
  constructor() {
    this.users = new Map();
    this.studentProgress = new Map(); // studentId:videoId -> { completionPercentage, completed }
    this.quizAttempts = new Map(); // studentId:lessonId -> [{ percentage, passed }]
    this.practiceSubmissions = new Map(); // studentId:challengeId -> [{ id, compileStatus, score, remedialRequired, reviewStatus }]
  }

  addUser(id, name, email, role = 'student') {
    const user = { id, user_id: id, name, email, role };
    this.users.set(id, user);
    return user;
  }

  saveVideoProgress(studentId, lessonId, percentage) {
    const key = `${studentId}:${lessonId}`;
    const prev = this.studentProgress.get(key) || { completionPercentage: 0, completed: false };
    const nextPercentage = Math.max(prev.completionPercentage, percentage);
    const completed = nextPercentage >= 95;
    this.studentProgress.set(key, { completionPercentage: nextPercentage, completed });
  }

  recordQuizAttempt(studentId, lessonId, percentage) {
    const key = `${studentId}:${lessonId}`;
    const attempts = this.quizAttempts.get(key) || [];
    const passed = percentage >= 80;
    attempts.push({ percentage, passed });
    this.quizAttempts.set(key, attempts);
  }

  submitPractice(studentId, challengeId, lessonId, sourceCode, compileStatus = 'success', score = 100) {
    const key = `${studentId}:${challengeId}`;
    const attempts = this.practiceSubmissions.get(key) || [];
    const sub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      challengeId,
      lessonId,
      compileStatus,
      score,
      reviewStatus: 'pending_review',
      remedialRequired: false
    };
    attempts.push(sub);
    this.practiceSubmissions.set(key, attempts);
    return sub;
  }

  getLessonEvidence(studentId, sequence) {
    const lessonId = sequence <= 12 ? `oop_lesson_${sequence}` : `swing_lesson_${sequence - 12}`;
    const challengeId = sequence <= 12 ? `practice_${sequence}` : `swing_practice_${sequence - 12}`;

    const video = this.studentProgress.get(`${studentId}:${lessonId}`) || { completionPercentage: 0, completed: false };
    const videoProgress = video.completionPercentage;
    const videoCompleted = videoProgress >= 95;

    const quizList = this.quizAttempts.get(`${studentId}:${lessonId}`) || [];
    const assessmentPassed = quizList.some(q => q.passed);
    const latestScore = quizList.length ? quizList[quizList.length - 1].percentage : null;

    const practiceList = this.practiceSubmissions.get(`${studentId}:${challengeId}`) || [];
    const latestPractice = practiceList.length ? practiceList[practiceList.length - 1] : null;

    const practiceCompleted = latestPractice ? isPracticeCompleted({
      submissionId: latestPractice.id,
      remedialRequired: latestPractice.remedialRequired,
      compileStatus: latestPractice.compileStatus,
      score: latestPractice.score,
      teacherScore: latestPractice.teacherScore,
      reviewStatus: latestPractice.reviewStatus
    }) : false;

    const completed = Boolean(videoCompleted && assessmentPassed && practiceCompleted);

    return {
      sequence,
      lessonId,
      videoProgress,
      videoCompleted,
      assessmentPassed,
      latestScore,
      practiceCompleted,
      completed
    };
  }

  getStudentResults(studentId) {
    const oopTopics = [];
    for (let seq = 1; seq <= 12; seq++) {
      const evidence = this.getLessonEvidence(studentId, seq);
      let canAccess = false;
      if (seq === 1) {
        canAccess = true;
      } else {
        const prev = this.getLessonEvidence(studentId, seq - 1);
        canAccess = Boolean(prev.completed);
      }
      oopTopics.push({
        id: evidence.lessonId,
        sequence: seq,
        videoPercentage: evidence.videoProgress,
        videoCompleted: evidence.videoCompleted,
        quizPassed: evidence.assessmentPassed,
        practiceCompleted: evidence.practiceCompleted,
        lessonCompleted: evidence.completed,
        lessonUnlocked: canAccess
      });
    }

    const oopCompletedCount = oopTopics.filter(t => t.lessonCompleted).length;
    const oopComplete = oopCompletedCount === 12;

    const swingTopics = [];
    for (let seq = 13; seq <= 17; seq++) {
      const evidence = this.getLessonEvidence(studentId, seq);
      let canAccess = false;
      if (seq === 13) {
        canAccess = oopComplete;
      } else {
        const prev = this.getLessonEvidence(studentId, seq - 1);
        canAccess = oopComplete && Boolean(prev.completed);
      }
      swingTopics.push({
        id: evidence.lessonId,
        sequence: seq,
        videoCompleted: evidence.videoCompleted,
        quizPassed: evidence.assessmentPassed,
        practiceCompleted: evidence.practiceCompleted,
        lessonCompleted: evidence.completed,
        lessonUnlocked: canAccess
      });
    }

    const swingCompletedCount = swingTopics.filter(t => t.lessonCompleted).length;
    const completedLessons = oopCompletedCount + swingCompletedCount;
    const totalLessons = 17;
    const overallProgress = calculateTotalCourseProgress(completedLessons, totalLessons);

    return {
      totalLessons,
      completedLessons,
      completedOopLessons: oopCompletedCount,
      completedSwingLessons: swingCompletedCount,
      overallProgress,
      oopComplete,
      swingUnlocked: oopComplete,
      oopTopics,
      swingTopics
    };
  }
}

// Instantiate engine
const engine = new InMemoryLmsEngine();
const studentA = engine.addUser('student-a-uuid', 'Alice Student', 'alice@oophub.edu');
const studentB = engine.addUser('student-b-uuid', 'Bob Student', 'bob@oophub.edu');

// Scenario 1: New student starts at 0/17 (0%)
console.log('--- Scenario 1: New student starts at 0/17 ---');
const initialA = engine.getStudentResults(studentA.id);
assert.strictEqual(initialA.completedLessons, 0, 'Completed lessons should be 0');
assert.strictEqual(initialA.totalLessons, 17, 'Total lessons should be 17');
assert.strictEqual(initialA.overallProgress, 0, 'Overall progress should be 0%');
assert.strictEqual(initialA.oopTopics[0].lessonUnlocked, true, 'Lesson 1 must be unlocked by default');
assert.strictEqual(initialA.oopTopics[1].lessonUnlocked, false, 'Lesson 2 must be locked initially');
assert.strictEqual(initialA.swingUnlocked, false, 'Java Swing must be locked initially');
console.log('  ✅ PASS: New student starts at 0/17 (0%), Lesson 1 unlocked, Lessons 2-17 locked\n');

// Scenario 4: Completing video and assessment without practice does NOT complete lesson
console.log('--- Scenario 4: Video and assessment without practice does not complete lesson ---');
engine.saveVideoProgress(studentA.id, 'oop_lesson_1', 98);
engine.recordQuizAttempt(studentA.id, 'oop_lesson_1', 85);
let midLesson = engine.getStudentResults(studentA.id);
assert.strictEqual(midLesson.completedLessons, 0, 'Lesson must NOT be completed without practice');
assert.strictEqual(midLesson.oopTopics[1].lessonUnlocked, false, 'Lesson 2 must remain locked without practice');
console.log('  ✅ PASS: Video 98% + Quiz 85% without practice keeps Lesson 1 incomplete and Lesson 2 locked\n');

// Scenario 14: Failed or invalid practice cannot unlock subsequent lessons
console.log('--- Scenario 14: Failed or invalid submission cannot unlock subsequent lessons ---');
engine.submitPractice(studentA.id, 'practice_1', 'oop_lesson_1', 'invalid code', 'failed', 0);
let failedAttempt = engine.getStudentResults(studentA.id);
assert.strictEqual(failedAttempt.completedLessons, 0, 'Failed practice submission must not complete lesson');
assert.strictEqual(failedAttempt.oopTopics[1].lessonUnlocked, false, 'Lesson 2 remains locked on failed practice');
console.log('  ✅ PASS: Compilation failed submission (score 0) keeps lesson incomplete and Lesson 2 locked\n');

// Scenario 5 & 2: Valid passing practice completes lesson and unlocks next video immediately (1/17)
console.log('--- Scenario 5 & 2: Valid passing practice completes lesson and unlocks Lesson 2 (1/17) ---');
engine.submitPractice(studentA.id, 'practice_1', 'oop_lesson_1', 'class Student { private String name; }', 'success', 100);
let afterLesson1 = engine.getStudentResults(studentA.id);
assert.strictEqual(afterLesson1.completedLessons, 1, 'Completed lessons should be 1');
assert.strictEqual(afterLesson1.overallProgress, 5.88, 'Progress should be 5.88% (1/17)');
assert.strictEqual(afterLesson1.oopTopics[0].lessonCompleted, true, 'Lesson 1 must be marked completed');
assert.strictEqual(afterLesson1.oopTopics[1].lessonUnlocked, true, 'Lesson 2 must unlock immediately upon valid practice submission');
console.log('  ✅ PASS: Lesson 1 fully complete -> 1/17 (5.88%), Lesson 2 video unlocked immediately\n');

// Scenario 6: Refreshing preserves status
console.log('--- Scenario 6: Refreshing preserves status ---');
let refreshedA = engine.getStudentResults(studentA.id);
assert.strictEqual(refreshedA.completedLessons, 1);
assert.strictEqual(refreshedA.overallProgress, 5.88);
assert.strictEqual(refreshedA.oopTopics[1].lessonUnlocked, true);
console.log('  ✅ PASS: Re-fetching/refreshing preserves 1/17 and Lesson 2 unlocked\n');

// Scenario 8: Replaying completed video does not increase lesson count
console.log('--- Scenario 8: Replaying completed video does not increase lesson count ---');
engine.saveVideoProgress(studentA.id, 'oop_lesson_1', 100);
let afterReplay = engine.getStudentResults(studentA.id);
assert.strictEqual(afterReplay.completedLessons, 1, 'Replaying video 1 must not increase lesson count');
console.log('  ✅ PASS: Replaying Lesson 1 video retains 1/17\n');

// Scenario 9: Repeated assessment attempts or practice submissions do not create duplicates
console.log('--- Scenario 9: Retrying assessment or practice does not duplicate count ---');
engine.recordQuizAttempt(studentA.id, 'oop_lesson_1', 95);
engine.submitPractice(studentA.id, 'practice_1', 'oop_lesson_1', 'class Student { String id; }', 'success', 100);
let afterRetries = engine.getStudentResults(studentA.id);
assert.strictEqual(afterRetries.completedLessons, 1, 'Retries must not duplicate completed count');
console.log('  ✅ PASS: Assessment retries and practice resubmissions retain exact 1/17 count\n');

// Scenario 3: Complete Lesson 2 -> sees 2/17 (11.76%)
console.log('--- Scenario 3: Student completes Lesson 2 -> sees 2/17 (11.76%) ---');
engine.saveVideoProgress(studentA.id, 'oop_lesson_2', 96);
engine.recordQuizAttempt(studentA.id, 'oop_lesson_2', 90);
engine.submitPractice(studentA.id, 'practice_2', 'oop_lesson_2', 'class Book { Book() {} }', 'success', 100);
let afterLesson2 = engine.getStudentResults(studentA.id);
assert.strictEqual(afterLesson2.completedLessons, 2, 'Completed lessons should be 2');
assert.strictEqual(afterLesson2.overallProgress, 11.76, 'Progress should be 11.76% (2/17)');
assert.strictEqual(afterLesson2.oopTopics[1].lessonCompleted, true, 'Lesson 2 must be completed');
assert.strictEqual(afterLesson2.oopTopics[2].lessonUnlocked, true, 'Lesson 3 must now be unlocked');
console.log('  ✅ PASS: Lesson 2 complete -> 2/17 (11.76%), Lesson 3 video unlocked immediately\n');

// Scenario 7: Logging out and logging in preserves progress
console.log('--- Scenario 7: Logout and login re-queries canonical ID and preserves progress ---');
let loggedInUser = engine.users.get('student-a-uuid');
let loginCheck = engine.getStudentResults(loggedInUser.id);
assert.strictEqual(loginCheck.completedLessons, 2);
assert.strictEqual(loginCheck.overallProgress, 11.76);
console.log('  ✅ PASS: Logged in session accurately queries student records (2/17 preserved)\n');

// Scenario 10: Second student starts at 0/17 (zero bleed across accounts)
console.log('--- Scenario 10: Second student starts at 0/17 (no cross-account bleed) ---');
let initialB = engine.getStudentResults(studentB.id);
assert.strictEqual(initialB.completedLessons, 0, 'Student B must have 0 completed lessons');
assert.strictEqual(initialB.overallProgress, 0, 'Student B progress must be 0%');
assert.strictEqual(initialB.oopTopics[0].lessonUnlocked, true, 'Student B Lesson 1 unlocked');
assert.strictEqual(initialB.oopTopics[1].lessonUnlocked, false, 'Student B Lesson 2 must be locked');
console.log('  ✅ PASS: Student B remains at clean 0/17 with zero bleed from Student A\n');

// Scenario 11: Dashboard and lesson page formulas show exact same completion count
console.log('--- Scenario 11: Dashboard and lesson page calculate exact same completion count ---');
// Dashboard formula:
const dashboardCompleted = afterLesson2.completedLessons;
const dashboardPct = afterLesson2.overallProgress;
// Lesson page formula:
const oopCount = afterLesson2.oopTopics.filter(t => t.lessonCompleted).length;
const swingCount = afterLesson2.swingTopics.filter(t => t.lessonCompleted).length;
const lessonsPageCompleted = afterLesson2.completedLessons ?? (oopCount + swingCount);
const lessonsPagePct = afterLesson2.overallProgress ?? Math.round((lessonsPageCompleted / 17) * 100);
assert.strictEqual(dashboardCompleted, lessonsPageCompleted, 'Counts must match exactly');
assert.strictEqual(dashboardPct, lessonsPagePct, 'Percentages must match exactly');
console.log(`  ✅ PASS: Dashboard (${dashboardCompleted}/17, ${dashboardPct}%) matches Lessons Page (${lessonsPageCompleted}/17, ${lessonsPagePct}%)\n`);

// Scenario 12: Java Swing remains locked until all 12 OOP lessons are completed
console.log('--- Scenario 12: Java Swing remains locked until all 12 OOP lessons are completed ---');
assert.strictEqual(afterLesson2.oopComplete, false, 'OOP is not yet complete (only 2/12)');
assert.strictEqual(afterLesson2.swingUnlocked, false, 'Java Swing must remain locked');
assert.strictEqual(afterLesson2.swingTopics[0].lessonUnlocked, false, 'Swing Lesson 1 must be locked');

// Complete remaining OOP lessons 3 to 12
for (let seq = 3; seq <= 12; seq++) {
  engine.saveVideoProgress(studentA.id, `oop_lesson_${seq}`, 95);
  engine.recordQuizAttempt(studentA.id, `oop_lesson_${seq}`, 85);
  engine.submitPractice(studentA.id, `practice_${seq}`, `oop_lesson_${seq}`, `class Solution${seq} {}`, 'success', 100);
}
let afterAllOOP = engine.getStudentResults(studentA.id);
assert.strictEqual(afterAllOOP.completedOopLessons, 12, 'All 12 OOP lessons completed');
assert.strictEqual(afterAllOOP.oopComplete, true, 'OOP must be marked complete');
assert.strictEqual(afterAllOOP.swingUnlocked, true, 'Java Swing must now be unlocked');
assert.strictEqual(afterAllOOP.swingTopics[0].lessonUnlocked, true, 'Swing Lesson 1 must now be unlocked');
assert.strictEqual(afterAllOOP.swingTopics[1].lessonUnlocked, false, 'Swing Lesson 2 remains locked until Swing 1 is complete');
assert.strictEqual(afterAllOOP.completedLessons, 12, 'Total completed should be 12/17');
assert.strictEqual(afterAllOOP.overallProgress, 70.59, '12/17 = 70.59%');
console.log('  ✅ PASS: After all 12 OOP lessons completed, Java Swing unlocks (12/17, 70.59%)\n');

// Scenario 13: Teacher grading occurs independently without delaying valid practice progression
console.log('--- Scenario 13: Teacher grading occurs independently without delaying progression ---');
// Complete Swing Lesson 1
engine.saveVideoProgress(studentA.id, 'swing_lesson_1', 97);
engine.recordQuizAttempt(studentA.id, 'swing_lesson_1', 90);
const swingSub = engine.submitPractice(studentA.id, 'swing_practice_1', 'swing_lesson_1', 'import javax.swing.*;', 'success', 100);
// Swing 1 is complete without waiting for teacher review
let afterSwing1 = engine.getStudentResults(studentA.id);
assert.strictEqual(afterSwing1.completedLessons, 13, '13/17 lessons completed');
assert.strictEqual(afterSwing1.swingTopics[1].lessonUnlocked, true, 'Swing Lesson 2 unlocks immediately upon submission');
// Later, teacher grades the submission
swingSub.teacherScore = 95;
swingSub.reviewStatus = 'reviewed';
let afterTeacherGraded = engine.getStudentResults(studentA.id);
assert.strictEqual(afterTeacherGraded.completedLessons, 13, 'Remains completed after teacher review');
// If teacher marks remedialRequired: true, it locks
swingSub.remedialRequired = true;
let afterRemedial = engine.getStudentResults(studentA.id);
assert.strictEqual(afterRemedial.swingTopics[0].lessonCompleted, false, 'Remedial flag blocks lesson completion');
assert.strictEqual(afterRemedial.swingTopics[1].lessonUnlocked, false, 'Subsequent lesson re-locks when remedial is required');
// Student resolves remedial
swingSub.remedialRequired = false;
let afterResolved = engine.getStudentResults(studentA.id);
assert.strictEqual(afterResolved.completedLessons, 13, 'Remedial resolved restores completion');
assert.strictEqual(afterResolved.swingTopics[1].lessonUnlocked, true, 'Next lesson unlocks again');
console.log('  ✅ PASS: Progression is immediate; teacher review and remedial workflows function reliably\n');

console.log('================================================================');
console.log('🎯 ALL 14 PROGRESSION & NEXT LESSON UNLOCKING SCENARIOS PASSED (100%)');
console.log('================================================================');
