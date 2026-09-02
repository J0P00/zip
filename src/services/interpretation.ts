export interface StudentResultsData {
  overallProgress: number;
  completedLessons: number;
  totalLessons: number;
  completedVideos: number;
  totalVideos: number;
  videoPercentage: number;
  averageQuizScore: number;
  quizAttempts: number;
  completedPracticeActivities: number;
  submittedPracticeActivities: number;
  totalPracticeActivities: number;
  practiceCompletionRate: number;
  swingSubmissions: number;
  swingCompletedActivities: number;
  swingPendingActivities: number;
  hasActivity: boolean;
  oopComplete?: boolean;
  swingUnlocked?: boolean;
  oopTopics?: StudentTopicResult[];
  swingTopics?: SwingTopicResult[];
}

export interface StudentTopicResult {
  id: string;
  title: string;
  sequence: number;
  attempted: boolean;
  videoPercentage: number | null;
  videoCompleted: boolean;
  quizPercentage: number | null;
  quizPassed: boolean | null;
  practiceScore: number | null;
  lessonCompleted: boolean;
}

export interface SwingTopicResult {
  id: string;
  title: string;
  sequence: number;
  attempted: boolean;
  overallPercentage: number | null;
  contentCompleted: boolean;
  videoCompleted: boolean;
  quizPassed: boolean;
  exerciseCompleted: boolean;
  submissionScore: number | null;
}

export interface StudentResultsInterpretation {
  currentLearningStage: string;
  oopResult: string;
  swingStatus: string;
  swingResult?: string;
  overallPerformance: string;
  learningProgressAnalysis: string;
  assessmentPerformance: string;
  programmingPracticePerformance: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendation: string;
}

const percent = (value: number) => Math.round(Math.max(0, Math.min(100, Number(value) || 0)));

const formatMetric = (label: string, value: number | null) => value === null ? `${label}: Insufficient data to evaluate this metric.` : `${label}: ${percent(value)}%`;

const topicPerformance = (topic: StudentTopicResult) => [topic.quizPercentage, topic.practiceScore, topic.videoPercentage].filter((value): value is number => value !== null);

const swingPerformance = (topic: SwingTopicResult) => [topic.overallPercentage, topic.submissionScore].filter((value): value is number => value !== null);

export const generateStudentResultsInterpretation = (
  input: StudentResultsData
): StudentResultsInterpretation => {
  const data = {
    ...input,
    overallProgress: percent(input.overallProgress),
    videoPercentage: percent(input.videoPercentage),
    averageQuizScore: percent(input.averageQuizScore),
    practiceCompletionRate: percent(input.practiceCompletionRate)
  };

  const oopTopics = (input.oopTopics || []).filter(topic => topic.attempted);
  const swingTopics = (input.swingTopics || []).filter(topic => topic.attempted);
  const averageAttemptedOop = oopTopics.length
    ? Math.round(oopTopics.flatMap(topicPerformance).reduce((sum, value) => sum + value, 0) / Math.max(1, oopTopics.flatMap(topicPerformance).length))
    : null;
  const oopResult = input.oopComplete
    ? 'COMPLETED'
    : oopTopics.length
      ? averageAttemptedOop !== null && averageAttemptedOop >= 75 ? 'Improving' : 'Needs Help'
      : 'Early Progress';
  const swingStatus = input.swingUnlocked ? (swingTopics.length ? 'UNLOCKED' : 'UNLOCKED - NOT STARTED') : 'LOCKED';
  const averageSwing = swingTopics.length
    ? Math.round(swingTopics.flatMap(swingPerformance).reduce((sum, value) => sum + value, 0) / Math.max(1, swingTopics.flatMap(swingPerformance).length))
    : null;
  const swingResult = input.swingUnlocked && swingTopics.length
    ? averageSwing !== null && averageSwing >= 75 ? 'Improving' : 'Needs Help'
    : undefined;
  const attemptedTopicText = oopTopics.length
    ? oopTopics.map(topic => {
        const metrics = [formatMetric('Video', topic.videoPercentage), formatMetric('Assessment', topic.quizPercentage), formatMetric('Practice IDE', topic.practiceScore)].join('; ');
        const state = topic.lessonCompleted ? 'completed' : 'in progress';
        return `${topic.title} is ${state} (${metrics}).`;
      }).join(' ')
    : 'No Java OOP topic has been attempted yet.';
  const strongTopics = oopTopics.filter(topic => {
    const metrics = topicPerformance(topic);
    return metrics.length > 0 && Math.round(metrics.reduce((sum, value) => sum + value, 0) / metrics.length) >= 75;
  });
  const weakTopics = oopTopics.filter(topic => {
    const metrics = topicPerformance(topic);
    return metrics.length > 0 && Math.round(metrics.reduce((sum, value) => sum + value, 0) / metrics.length) < 75;
  });

  if (!data.hasActivity) {
    return {
      currentLearningStage: 'Java OOP',
      oopResult,
      swingStatus,
      overallPerformance: 'No activity recorded',
      learningProgressAnalysis: 'No learning activity has been recorded yet. Java OOP has not been evaluated beyond the available starting point.',
      assessmentPerformance: 'No assessment attempts have been recorded yet.',
      programmingPracticePerformance: 'No programming practice activity has been recorded yet.',
      strengths: [],
      areasForImprovement: ['Begin the first available Java OOP lesson'],
      recommendation: 'The student should begin with the first lesson, complete its assessment, and submit the related programming activity.'
    };
  }

  const overallPerformance = oopResult;
  const overallText =
    input.oopComplete
      ? 'The student has satisfied the existing Java OOP completion requirement.'
      : oopTopics.length
        ? `The student has interacted with ${oopTopics.length} of ${input.oopTopics?.length || data.totalLessons} Java OOP topics. ${attemptedTopicText} Topics not yet attempted are excluded from performance weaknesses.`
        : 'The student has not attempted a Java OOP topic yet.';
  const quizText = data.quizAttempts ? `Latest available assessment evidence averages ${data.averageQuizScore}%.` : 'Assessment performance cannot yet be evaluated because no assessment has been attempted.';

  const strengths: string[] = [];
  if (strongTopics.length) strengths.push(`Strong evidence in ${strongTopics.map(topic => topic.title).join(', ')}`);
  if (data.quizAttempts > 0) strengths.push(`Assessment attempts recorded (${data.averageQuizScore}% latest average)`);
  if (data.submittedPracticeActivities > 0) strengths.push(`Practice IDE submissions recorded (${data.completedPracticeActivities} completed)`);

  const areasForImprovement: string[] = [];
  if (weakTopics.length) areasForImprovement.push(`Review attempted topics with lower evidence: ${weakTopics.map(topic => topic.title).join(', ')}`);
  if (!input.oopComplete && oopTopics.length < (input.oopTopics?.length || data.totalLessons)) areasForImprovement.push('Continue the next available Java OOP topic; unattempted topics are not yet evaluated.');
  if (input.swingUnlocked && !swingTopics.length) areasForImprovement.push('Begin Java Swing activities when ready.');

  return {
    currentLearningStage: input.swingUnlocked ? 'Java OOP and Java Swing' : 'Java OOP',
    oopResult,
    swingStatus,
    swingResult,
    overallPerformance,
    learningProgressAnalysis: `${overallText} ${attemptedTopicText}`,
    assessmentPerformance: quizText,
    programmingPracticePerformance: data.submittedPracticeActivities
      ? `Practice IDE evidence is available from ${data.submittedPracticeActivities} submission${data.submittedPracticeActivities === 1 ? '' : 's'}; completed activities: ${data.completedPracticeActivities}.`
      : 'Practice IDE performance cannot yet be evaluated because the student has not submitted a Practice IDE activity.',
    strengths: strengths.length ? strengths : ['The student has started the learning path'],
    areasForImprovement: areasForImprovement.length ? areasForImprovement : ['Continue the current learning activities consistently'],
    recommendation: !input.swingUnlocked
      ? areasForImprovement[0] || 'Continue the next available Java OOP activity.'
      : areasForImprovement[0] || 'Continue the current learning activities and use the latest evidence to guide the next topic.'
  };
};
