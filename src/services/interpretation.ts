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
}

export interface StudentResultsInterpretation {
  overallPerformance: string;
  learningProgressAnalysis: string;
  assessmentPerformance: string;
  programmingPracticePerformance: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendation: string;
}

const percent = (value: number) => Math.round(Math.max(0, Math.min(100, Number(value) || 0)));

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

  if (!data.hasActivity) {
    return {
      overallPerformance: 'No activity recorded',
      learningProgressAnalysis: 'No learning activity has been recorded yet. The student is recommended to begin the available lessons and assessments.',
      assessmentPerformance: 'No assessment attempts have been recorded yet.',
      programmingPracticePerformance: 'No programming practice activity has been recorded yet.',
      strengths: [],
      areasForImprovement: ['Begin the available video lessons', 'Attempt the assessments', 'Submit a Practice IDE activity'],
      recommendation: 'The student should begin with the first lesson, complete its assessment, and submit the related programming activity.'
    };
  }

  const overallPerformance =
    data.overallProgress >= 90
      ? 'Excellent Progress'
      : data.overallProgress >= 75
        ? 'Good Progress'
        : data.overallProgress >= 50
          ? 'Moderate Progress'
          : 'Low Progress';
  const overallText =
    data.overallProgress >= 90
      ? 'The student demonstrates strong engagement and mastery of the course materials.'
      : data.overallProgress >= 75
        ? 'The student is performing well but still has some remaining learning activities.'
        : data.overallProgress >= 50
          ? 'The student has completed several learning activities but needs improvement and more consistent participation.'
          : 'The student needs additional attention and is recommended to complete more lessons and learning activities.';
  const quizText =
    data.averageQuizScore >= 90
      ? 'Excellent assessment performance.'
      : data.averageQuizScore >= 75
        ? 'Good assessment performance.'
        : data.averageQuizScore >= 50
          ? 'Average assessment performance. Additional review is recommended.'
          : 'Low assessment performance. The student may need additional support and review of the lessons.';

  const strengths: string[] = [];
  if (data.videoPercentage >= 75) strengths.push('Strong participation in video lessons');
  if (data.averageQuizScore >= 75) strengths.push('Good assessment performance');
  if (data.practiceCompletionRate >= 75) strengths.push('Active Practice IDE participation');
  if (data.swingCompletedActivities > 0) strengths.push('Participation in Java Swing activities');

  const areasForImprovement: string[] = [];
  if (data.completedVideos < data.totalVideos) areasForImprovement.push(`Complete the ${data.totalVideos - data.completedVideos} remaining video lesson${data.totalVideos - data.completedVideos === 1 ? '' : 's'}`);
  if (data.averageQuizScore < 75 || data.quizAttempts === 0) areasForImprovement.push('Review topics with lower assessment scores');
  if (data.submittedPracticeActivities < data.totalPracticeActivities) areasForImprovement.push('Complete pending programming activities');
  if (data.swingPendingActivities > 0) areasForImprovement.push('Complete pending Java Swing activities');

  return {
    overallPerformance,
    learningProgressAnalysis: `The student has completed ${data.completedLessons} out of ${data.totalLessons} lessons, with ${Math.max(0, data.totalLessons - data.completedLessons)} incomplete, and currently has ${data.overallProgress}% overall progress. ${overallText}`,
    assessmentPerformance: data.quizAttempts
      ? `The student achieved an average quiz score of ${data.averageQuizScore}%, indicating ${quizText.toLowerCase().replace(/\.$/, '')}.`
      : 'No assessment attempts have been recorded yet. Additional review is recommended after the first assessment.',
    programmingPracticePerformance: `The student completed ${data.completedPracticeActivities} of ${data.totalPracticeActivities} programming activities and submitted ${data.submittedPracticeActivities}. Practice completion is ${data.practiceCompletionRate}%.`,
    strengths: strengths.length ? strengths : ['The student has started the learning path'],
    areasForImprovement: areasForImprovement.length ? areasForImprovement : ['Continue the current learning activities consistently'],
    recommendation: areasForImprovement.length
      ? `The student should ${areasForImprovement[0].toLowerCase()} and continue focusing on weaker OOP topics.`
      : 'The student should continue completing the remaining activities and attempt advanced OOP and Java Swing practice.'
  };
};
