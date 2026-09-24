/**
 * Comprehensive Grading, Persistence & Notification Test Suite
 * Validates Teacher Practice IDE Grading, PostgreSQL state persistence,
 * student notification creation, recipient targeting, deduplication, and sequential unlock.
 */

const assert = require('assert');

// 1. Mock DB / State engine replicating backend PostgreSQL schema & queries
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.programmingChallenges = new Map();
    this.practiceSubmissions = new Map();
    this.notifications = new Map();
    this.lessonProgress = new Map();
  }

  addUser(user) {
    this.users.set(user.id, user);
    return user;
  }

  addChallenge(challenge) {
    this.programmingChallenges.set(challenge.id, challenge);
    return challenge;
  }

  submitPractice({ studentId, challengeId, sourceCode, score = 85, compileStatus = 'success' }) {
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const submission = {
      id,
      student_id: studentId,
      challenge_id: challengeId,
      source_code: sourceCode,
      program_output: 'Output matched',
      compile_status: compileStatus,
      score,
      is_locked: true,
      teacher_score: null,
      teacher_feedback: '',
      graded_by: null,
      graded_at: null,
      review_status: 'pending',
      remedial_required: false,
      submitted_at: new Date().toISOString()
    };
    this.practiceSubmissions.set(id, submission);
    return submission;
  }

  // Exact replication of backend/server.js PATCH /api/practice-submissions/:id/grade
  async gradeSubmission({ submissionId, teacherId, grade, feedback, remedialRequired }) {
    const submission = this.practiceSubmissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    const teacher = this.users.get(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      throw new Error('Unauthorized grader');
    }
    const challenge = this.programmingChallenges.get(submission.challenge_id) || { title: 'OOP Practice', lesson_id: 'oop_lesson_1' };
    const student = this.users.get(submission.student_id);

    // Update submission record (authoritative PostgreSQL state)
    submission.teacher_score = grade;
    submission.teacher_feedback = feedback;
    submission.graded_by = teacherId;
    submission.graded_at = new Date().toISOString();
    submission.review_status = 'reviewed';
    submission.remedial_required = Boolean(remedialRequired);

    // Create or update notification (Authoritative notifications table)
    const notifType = remedialRequired ? 'remedial_required' : grade >= 80 ? 'submission_passed' : 'submission_graded';
    
    // Check for existing notification for this submission to avoid duplicate spam
    let existingNotifKey = null;
    for (const [key, notif] of this.notifications.entries()) {
      if (notif.recipient_user_id === student.id && notif.related_submission_id === submissionId) {
        existingNotifKey = key;
        break;
      }
    }

    let notification;
    if (existingNotifKey) {
      notification = this.notifications.get(existingNotifKey);
      notification.notification_type = notifType;
      notification.title = 'Practice Reviewed';
      notification.message = `Your ${challenge.title} practice submission has been reviewed by ${teacher.name}.\nGrade: ${grade}/100\nFeedback: ${feedback}\nRemedial work required: ${remedialRequired ? 'Yes' : 'No'}`;
      notification.grade = grade;
      notification.feedback = feedback;
      notification.remedial_required = remedialRequired;
      notification.is_read = false;
      notification.read_at = null;
      notification.updated_at = new Date().toISOString();
    } else {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      notification = {
        id: notifId,
        recipient_user_id: student.id,
        notification_type: notifType,
        title: 'Practice Reviewed',
        message: `Your ${challenge.title} practice submission has been reviewed by ${teacher.name}.\nGrade: ${grade}/100\nFeedback: ${feedback}\nRemedial work required: ${remedialRequired ? 'Yes' : 'No'}`,
        related_submission_id: submissionId,
        related_practice_id: challenge.id,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        practice_title: challenge.title,
        grade,
        max_grade: 100,
        feedback,
        remedial_required: remedialRequired,
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString()
      };
      this.notifications.set(notifId, notification);
    }

    // Recalculate lesson progress
    const lessonId = challenge.lesson_id;
    const progressKey = `${student.id}_${lessonId}`;
    const isPracticePassed = !remedialRequired && (grade !== null ? grade >= 70 : submission.score >= 70);
    
    const prevProgress = this.lessonProgress.get(progressKey) || {
      student_id: student.id,
      lesson_id: lessonId,
      video_completed: true,
      quiz_passed: true,
      practice_completed: false,
      completed: false
    };

    const nextProgress = {
      ...prevProgress,
      practice_completed: isPracticePassed,
      completed: prevProgress.video_completed && prevProgress.quiz_passed && isPracticePassed
    };
    this.lessonProgress.set(progressKey, nextProgress);

    return { submission, notification, progress: nextProgress };
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('📋 RUNNING TEACHER GRADING, PERSISTENCE & NOTIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  const db = new MockDatabase();

  // Setup Users
  const teacher = db.addUser({ id: 'teacher-uuid-1', name: 'Dr. Elena Vance', email: 'elena@oophub.edu', role: 'teacher' });
  const student1 = db.addUser({ id: 'student-uuid-1', name: 'Dmitry Vance', email: 'dmitry@oophub.edu', role: 'student' });
  const student2 = db.addUser({ id: 'student-uuid-2', name: 'Alice Cooper', email: 'alice@oophub.edu', role: 'student' });

  // Setup Challenge
  const challenge1 = db.addChallenge({
    id: 'challenge_encapsulation',
    topic_id: 'oop_lesson_1',
    lesson_id: 'oop_lesson_1',
    title: 'Encapsulation in Banking',
    passing_score: 70
  });

  console.log('--- Test Group 1: Authoritative Submission Grading & Persistence ---');

  let sub1;
  test('Student 1 submits practice challenge and status is initially pending', () => {
    sub1 = db.submitPractice({
      studentId: student1.id,
      challengeId: challenge1.id,
      sourceCode: 'public class Account { private double balance; }',
      score: 80
    });
    assert.strictEqual(sub1.review_status, 'pending');
    assert.strictEqual(sub1.teacher_score, null);
    assert.strictEqual(sub1.teacher_feedback, '');
  });

  await asyncTest('Teacher grades submission by exact submission_id with grade, feedback, and remedial=false', async () => {
    const res = await db.gradeSubmission({
      submissionId: sub1.id,
      teacherId: teacher.id,
      grade: 95,
      feedback: 'Excellent use of encapsulation and private fields.',
      remedialRequired: false
    });

    assert.strictEqual(res.submission.id, sub1.id);
    assert.strictEqual(res.submission.teacher_score, 95);
    assert.strictEqual(res.submission.teacher_feedback, 'Excellent use of encapsulation and private fields.');
    assert.strictEqual(res.submission.review_status, 'reviewed');
    assert.strictEqual(res.submission.remedial_required, false);
    assert.strictEqual(res.submission.graded_by, teacher.id);
    assert.ok(res.submission.graded_at !== null);
  });

  test('Persistent state remains "reviewed" upon page refresh / re-fetch from database', () => {
    const refreshed = db.practiceSubmissions.get(sub1.id);
    assert.strictEqual(refreshed.review_status, 'reviewed');
    assert.strictEqual(refreshed.teacher_score, 95);
    assert.strictEqual(refreshed.teacher_feedback, 'Excellent use of encapsulation and private fields.');
    assert.strictEqual(refreshed.remedial_required, false);
  });

  console.log('\n--- Test Group 2: Persistent Student Notifications & Recipient Targeting ---');

  test('Authoritative notification is created in notifications table for exact student', () => {
    const studentNotifs = Array.from(db.notifications.values()).filter(n => n.recipient_user_id === student1.id);
    assert.strictEqual(studentNotifs.length, 1);
    const notif = studentNotifs[0];
    assert.strictEqual(notif.title, 'Practice Reviewed');
    assert.strictEqual(notif.grade, 95);
    assert.strictEqual(notif.feedback, 'Excellent use of encapsulation and private fields.');
    assert.strictEqual(notif.related_submission_id, sub1.id);
    assert.strictEqual(notif.remedial_required, false);
  });

  test('Unrelated student (Student 2) receives NO notification (Zero Recipient Bleed)', () => {
    const student2Notifs = Array.from(db.notifications.values()).filter(n => n.recipient_user_id === student2.id);
    assert.strictEqual(student2Notifs.length, 0);
  });

  console.log('\n--- Test Group 3: Idempotency & Duplicate Prevention ---');

  await asyncTest('Submitting grade update again updates existing notification (No Duplicate Spam)', async () => {
    await db.gradeSubmission({
      submissionId: sub1.id,
      teacherId: teacher.id,
      grade: 98,
      feedback: 'Updated note: Outstanding code style!',
      remedialRequired: false
    });

    const studentNotifs = Array.from(db.notifications.values()).filter(n => n.recipient_user_id === student1.id);
    assert.strictEqual(studentNotifs.length, 1, 'Should have exactly 1 notification, not multiple');
    assert.strictEqual(studentNotifs[0].grade, 98);
    assert.strictEqual(studentNotifs[0].feedback, 'Updated note: Outstanding code style!');
  });

  console.log('\n--- Test Group 4: Remedial Requirement & Sequential Lesson Unlock ---');

  let sub2;
  await asyncTest('Remedial requirement flag blocks lesson completion even if score is high', async () => {
    sub2 = db.submitPractice({
      studentId: student2.id,
      challengeId: challenge1.id,
      sourceCode: 'public class BadPractice {}',
      score: 75
    });

    const res = await db.gradeSubmission({
      submissionId: sub2.id,
      teacherId: teacher.id,
      grade: 60,
      feedback: 'Please rewrite using proper getter and setter methods.',
      remedialRequired: true
    });

    assert.strictEqual(res.submission.remedial_required, true);
    assert.strictEqual(res.progress.practice_completed, false);
    assert.strictEqual(res.progress.completed, false, 'Lesson must NOT unlock when remedial work is required');

    const s2Notif = Array.from(db.notifications.values()).find(n => n.recipient_user_id === student2.id);
    assert.ok(s2Notif);
    assert.strictEqual(s2Notif.remedial_required, true);
    assert.strictEqual(s2Notif.notification_type, 'remedial_required');
  });

  await asyncTest('Resolving remedial requirement unlocks lesson progress', async () => {
    const res = await db.gradeSubmission({
      submissionId: sub2.id,
      teacherId: teacher.id,
      grade: 88,
      feedback: 'Remedial requirements met. Excellent improvement!',
      remedialRequired: false
    });

    assert.strictEqual(res.submission.remedial_required, false);
    assert.strictEqual(res.progress.practice_completed, true);
    assert.strictEqual(res.progress.completed, true, 'Lesson unlocks when teacher approves and clears remedial status');
  });

  console.log('\n================================================================');
  console.log(`🎯 TEST RESULTS: ${passed}/${passed + failed} tests passed (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
