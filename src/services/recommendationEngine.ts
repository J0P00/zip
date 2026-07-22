import { AdaptiveRecommendation, RecommendationTrigger, RecommendationType, StudentSubView } from '../types';
import { OOP_COURSE_LESSONS } from '../data/oopCourse';

export const RECOMMENDATION_HISTORY_KEY = 'oophub_adaptive_recommendation_history';

export type RecommendationInput = {
  studentId: string;
  studentName?: string;
  lessonId: string;
  currentTopic: string;
  trigger: RecommendationTrigger;
  videoCompleted: boolean;
  lessonCompleted?: boolean;
  quizScore?: number;
  codingScore?: number;
  quizAttempts?: number;
  codingAttempts?: number;
  progressPercentage?: number;
};

const toId = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const lessonTitleFor = (lessonId: string) =>
  OOP_COURSE_LESSONS.find(lesson => lesson.id === lessonId)?.title || 'Current OOP Lesson';

const buildRecommendation = (
  input: RecommendationInput,
  type: RecommendationType,
  reason: string,
  title: string,
  summary: string,
  actions: string[],
  primaryActionLabel: string,
  targetView: StudentSubView
): AdaptiveRecommendation => ({
  id: toId(),
  studentId: input.studentId,
  studentName: input.studentName,
  lessonId: input.lessonId,
  lessonTitle: lessonTitleFor(input.lessonId),
  currentTopic: input.currentTopic,
  type,
  trigger: input.trigger,
  reason,
  generatedDate: new Date().toISOString(),
  status: 'Pending',
  title,
  summary,
  actions,
  primaryActionLabel,
  targetView,
  quizScore: input.quizScore,
  codingScore: input.codingScore,
  videoCompleted: input.videoCompleted,
  lessonCompleted: input.lessonCompleted,
  quizAttempts: input.quizAttempts,
  codingAttempts: input.codingAttempts,
  progressPercentage: input.progressPercentage
});

export const generateRuleBasedRecommendation = (input: RecommendationInput): AdaptiveRecommendation => {
  if (!input.videoCompleted) {
    return buildRecommendation(
      input,
      'Remedial',
      'Video lesson is not completed',
      'Please finish the lesson first',
      'The quiz remains locked until the lesson video is completed.',
      ['Finish watching the lesson video', 'Review the lesson notes', 'Return to the assessment after completion'],
      'Watch Lesson',
      'videos'
    );
  }

  if ((input.quizAttempts || 0) >= 3 && (input.quizScore ?? 100) < 70) {
    return buildRecommendation(
      input,
      'Remedial',
      'Failed the same quiz 3 consecutive times',
      'Required Review',
      'Complete the lesson review and review exercise before taking the quiz again.',
      ['Review the lesson', 'Complete the review exercise', 'Read the lesson summary', 'Retake the quiz after review'],
      'Start Review',
      'videos'
    );
  }

  if (input.trigger === 'Quiz Score' && typeof input.quizScore === 'number') {
    if (input.quizScore < 70) {
      return buildRecommendation(
        input,
        'Remedial',
        `Quiz Score below 70% (${input.quizScore}%)`,
        'Recommended Next Step',
        'Strengthen the current topic before retaking the quiz.',
        [`Watch the ${input.currentTopic} lesson again`, 'Read the lesson notes', 'Solve an Easy Coding Challenge', 'Retake the quiz after review'],
        'Start Review',
        'videos'
      );
    }

    if (input.quizScore < 90) {
      return buildRecommendation(
        input,
        'Continue',
        `Quiz Score between 70% and 89% (${input.quizScore}%)`,
        'Good Progress',
        'Continue to practice while reviewing the quiz items you missed.',
        ['Continue to the Coding Exercise', 'Review incorrect quiz answers', 'Practice an Intermediate Challenge'],
        'Open Coding Exercise',
        'ide'
      );
    }

    return buildRecommendation(
      input,
      'Advanced',
      `Quiz Score at least 90% (${input.quizScore}%)`,
      'Excellent Work',
      'You are ready for enrichment and the next learning activity.',
      ['Great job', 'Try the Advanced Coding Challenge', 'Proceed to the next lesson'],
      'Start Advanced Challenge',
      'ide'
    );
  }

  if (input.trigger === 'Coding Score' && typeof input.codingScore === 'number') {
    if (input.codingScore < 60) {
      return buildRecommendation(
        input,
        'Remedial',
        `Coding Score below 60% (${input.codingScore}%)`,
        'Coding Review Needed',
        'Review the previous lesson and rebuild confidence with a beginner activity.',
        ['Review the previous lesson', 'Practice a Beginner Challenge', 'Resubmit after correcting failed test cases'],
        'Practice Beginner Challenge',
        'ide'
      );
    }

    if (input.codingScore < 85) {
      return buildRecommendation(
        input,
        'Continue',
        `Coding Score between 60% and 84% (${input.codingScore}%)`,
        'Keep Practicing',
        'You are close to mastery. Practice at the intermediate level before moving ahead.',
        ['Practice an Intermediate Challenge', 'Review failed test cases', 'Continue after improving your solution'],
        'Practice Intermediate',
        'ide'
      );
    }

    return buildRecommendation(
      input,
      'Advanced',
      `Coding Score at least 85% (${input.codingScore}%)`,
      'Advanced Challenge Unlocked',
      'Your coding performance shows mastery for this activity.',
      ['Unlock the Advanced Challenge', 'Continue to the next module', 'Apply the concept in a harder scenario'],
      'Continue to Next Module',
      'videos'
    );
  }

  if (input.lessonCompleted) {
    return buildRecommendation(
      input,
      'Advanced',
      'Video, quiz, and coding activities completed successfully',
      'Lesson Mastered',
      'This lesson is mastered and the next lesson is unlocked.',
      ['Mark lesson as mastered', 'Unlock the next lesson', 'Continue self-paced progression'],
      'Proceed to Next Lesson',
      'videos'
    );
  }

  return buildRecommendation(
    input,
    'Continue',
    'Activity saved and minimum progression rules satisfied',
    'Continue Learning',
    'Proceed to the next appropriate learning activity.',
    ['Continue your current OOP activity', 'Track your progress after each submission'],
    'Continue',
    'dashboard'
  );
};

export const getRecommendationHistory = (): AdaptiveRecommendation[] => {
  try {
    const saved = localStorage.getItem(RECOMMENDATION_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveRecommendationHistory = (history: AdaptiveRecommendation[]) => {
  localStorage.setItem(RECOMMENDATION_HISTORY_KEY, JSON.stringify(history));
};

export const storeRecommendation = (recommendation: AdaptiveRecommendation): AdaptiveRecommendation[] => {
  const next = [recommendation, ...getRecommendationHistory()].slice(0, 100);
  saveRecommendationHistory(next);
  return next;
};
