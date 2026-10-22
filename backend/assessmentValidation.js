const ASSESSMENT_PASSING_SCORE = 60;

const normalizeAssessmentPercentage = ({ percentage, score, total, correctAnswers } = {}) => {
  const rawPercentage = Number(percentage);
  const rawScore = Number(score ?? correctAnswers);
  const rawTotal = Number(total);
  if (Number.isFinite(rawScore) && Number.isFinite(rawTotal) && rawTotal > 0) {
    return (rawScore / rawTotal) * 100;
  }
  if (!Number.isFinite(rawPercentage) || rawPercentage < 0) return 0;
  return rawPercentage > 0 && rawPercentage <= 1 ? rawPercentage * 100 : rawPercentage;
};

const isPassingAssessment = result => normalizeAssessmentPercentage(result) >= ASSESSMENT_PASSING_SCORE;

module.exports = {
  ASSESSMENT_PASSING_SCORE,
  normalizeAssessmentPercentage,
  isPassingAssessment
};
