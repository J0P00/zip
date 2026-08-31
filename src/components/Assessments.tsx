import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Award, Check, CheckCircle, ChevronLeft, ChevronRight, Lock, RotateCcw, X } from 'lucide-react';
import { AdaptiveRecommendation, AuthenticatedUser, StudentSubView, VideoLesson } from '../types';
import { CourseQuestion, getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS, setStoredJson, shuffleArray } from '../data/oopCourse';
import { progressApi } from '../services/api';
import RecommendationCard from './RecommendationCard';

interface AssessmentsProps {
  onCorrectAnswerAdded: (xp: number, attempt: QuizAttempt) => void;
  onNavigateTo?: (view: StudentSubView) => void;
  lessons: VideoLesson[];
  currentUser: AuthenticatedUser;
  activeRecommendation?: AdaptiveRecommendation | null;
}

interface WatchRecord {
  lessonId: string;
  lastPosition: number;
  completionPercentage: number;
  completed: boolean;
  dateCompleted?: string;
}

interface QuizAttempt {
  assessmentId: string;
  lessonId: string;
  score: number;
  total: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  passed: boolean;
  attemptNumber: number;
  answers: Record<string, string>;
  dateCompleted: string;
}

type WatchDb = Record<string, WatchRecord>;
type QuizDb = Record<string, QuizAttempt>;

const WATCH_KEY = 'oophub_oop_video_progress';
const QUIZ_KEY = 'oophub_oop_quiz_attempts';
const getUserStorageKey = (key: string, user: AuthenticatedUser) =>
  `${key}:${user.id || user.userId || user.email}`;
const PASSING_PERCENTAGE = 70;

const getAssessmentLockedReason = (lessonId: string, watchDb: WatchDb, quizDb: QuizDb) => {
  const lesson = OOP_COURSE_LESSONS.find(item => item.id === lessonId);
  if (!lesson) return 'Lesson unavailable';

  if (lesson.sequence > 1) {
    const previous = OOP_COURSE_LESSONS.find(item => item.sequence === lesson.sequence - 1);
    const previousAssessment = previous ? OOP_ASSESSMENTS.find(item => item.lessonId === previous.id) : undefined;
    if (previous && !watchDb[previous.id]?.completed) return `Complete Lesson ${previous.sequence} video first.`;
    if (previousAssessment && !quizDb[previousAssessment.id]?.passed) return `Pass Assessment ${lesson.sequence - 1} first.`;
  }

  if (!watchDb[lessonId]?.completed) return 'Watch at least 95% of this lesson video first.';
  return '';
};

export default function Assessments({ onCorrectAnswerAdded, onNavigateTo, activeRecommendation, currentUser }: AssessmentsProps) {
  const watchStorageKey = getUserStorageKey(WATCH_KEY, currentUser);
  const quizStorageKey = getUserStorageKey(QUIZ_KEY, currentUser);
  const [watchDb] = useState<WatchDb>(() => getStoredJson(`${watchStorageKey}`, {}));
  const [quizDb, setQuizDb] = useState<QuizDb>(() => getStoredJson(quizStorageKey, {}));
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<'dashboard' | 'active' | 'result' | 'review'>('dashboard');
  const [latestAttempt, setLatestAttempt] = useState<QuizAttempt | null>(null);

  const activeAssessment = OOP_ASSESSMENTS.find(item => item.id === activeAssessmentId) || null;
  const activeLesson = activeAssessment ? OOP_COURSE_LESSONS.find(item => item.id === activeAssessment.lessonId) : null;
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('oophub_auth_token');
    const user = currentUser.id || currentUser.userId || currentUser.email;
    if (!token || !user) return;

    progressApi.getQuizAttempts(user, token)
      .then(response => {
        if (!isMounted) return;
        const remoteDb = response.data.reduce((acc: QuizDb, row: any) => {
          acc[row.assessment_id] = {
            assessmentId: row.assessment_id,
            lessonId: row.lesson_id || '',
            score: row.score,
            total: row.total,
            percentage: Number(row.percentage || 0),
            correctAnswers: row.correct_answers,
            incorrectAnswers: row.incorrect_answers,
            passed: Boolean(row.passed),
            attemptNumber: row.attempt_number,
            answers: row.answers || {},
            dateCompleted: row.date_completed
          };
          return acc;
        }, {});
        setQuizDb(prev => {
          const next = { ...prev, ...remoteDb };
          setStoredJson(quizStorageKey, next);
          return next;
        });
      })
      .catch(error => console.warn('Unable to load assessment attempts from backend:', error));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, currentUser.userId, currentUser.email, quizStorageKey]);

  const courseStats = useMemo(() => {
    const completedLessons = OOP_COURSE_LESSONS.filter(lesson => watchDb[lesson.id]?.completed).length;
    const passedAssessments = OOP_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
    return {
      completedLessons,
      lockedLessons: OOP_COURSE_LESSONS.length - completedLessons,
      passedAssessments,
      overall: Math.round(((completedLessons + passedAssessments) / (OOP_COURSE_LESSONS.length * 2)) * 100)
    };
  }, [watchDb, quizDb]);

  const startAssessment = (assessmentId: string) => {
    const assessment = OOP_ASSESSMENTS.find(item => item.id === assessmentId);
    if (!assessment) return;
    const reason = getAssessmentLockedReason(assessment.lessonId, watchDb, quizDb);
    if (reason) return;

    const seed = Date.now();
    setActiveAssessmentId(assessment.id);
    setQuestions(shuffleArray(assessment.questions, seed).map((item, index) => ({
      ...item,
      options: shuffleArray(item.options, seed + index + 1)
    })));
    setCurrentIndex(0);
    setAnswers({});
    setLatestAttempt(null);
    setView('active');
  };

  const submitAssessment = () => {
    if (!activeAssessment) return;

    let score = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) score += 1;
    });

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const previousAttempt = quizDb[activeAssessment.id]?.attemptNumber || 0;
    const attempt: QuizAttempt = {
      assessmentId: activeAssessment.id,
      lessonId: activeAssessment.lessonId,
      score,
      total,
      percentage,
      correctAnswers: score,
      incorrectAnswers: total - score,
      passed: percentage >= PASSING_PERCENTAGE,
      attemptNumber: previousAttempt + 1,
      answers,
      dateCompleted: new Date().toISOString()
    };

    const nextDb = { ...quizDb, [activeAssessment.id]: attempt };
    setQuizDb(nextDb);
    setStoredJson(quizStorageKey, nextDb);
    progressApi.saveQuizAttempt(attempt as any).catch(error => {
      console.warn('Unable to sync assessment attempt with backend:', error);
    });
    setLatestAttempt(attempt);
    setView('result');

    onCorrectAnswerAdded(attempt.passed ? 150 : 0, attempt);
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in" id="oop-assessments-dashboard">
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              OOP Fundamentals
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900">Lesson Assessments</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Each lesson has exactly 20 randomized MCQs. Passing score is 70%, and lessons unlock sequentially.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              ['Progress', `${courseStats.overall}%`],
              ['Completed', `${courseStats.completedLessons}/${OOP_COURSE_LESSONS.length}`],
              ['Locked', `${courseStats.lockedLessons}`],
              ['Passed', `${courseStats.passedAssessments}/${OOP_ASSESSMENTS.length}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="block text-[10px] font-black uppercase text-slate-400">{label}</span>
                <span className="mt-1 block font-mono text-lg font-black text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        {OOP_ASSESSMENTS.map(assessment => {
          const lesson = OOP_COURSE_LESSONS.find(item => item.id === assessment.lessonId);
          const reason = getAssessmentLockedReason(assessment.lessonId, watchDb, quizDb);
          const attempt = quizDb[assessment.id];
          const passed = attempt?.passed;

          return (
            <article key={assessment.id} className={`rounded-2xl border bg-white/80 p-5 shadow-sm backdrop-blur-md ${reason ? 'border-slate-200 opacity-75' : 'border-emerald-200'}`}>
              <div className="flex min-h-[190px] flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {lesson?.sequence}</span>
                    {reason ? <Lock className="h-4 w-4 text-slate-400" /> : passed ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Award className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-slate-900">{assessment.title}</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                    20 questions from the lesson assessment file.
                  </p>
                  {attempt && (
                    <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-black ${attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                      Latest: {attempt.score}/{attempt.total} ({attempt.percentage}%) - Attempt {attempt.attemptNumber}
                    </p>
                  )}
                  {reason && <p className="mt-3 text-[11px] font-bold leading-5 text-slate-400">{reason}</p>}
                </div>
                <button
                  disabled={Boolean(reason)}
                  onClick={() => startAssessment(assessment.id)}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {attempt?.passed ? 'Retake Assessment' : 'Start Assessment'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const renderActive = () => {
    if (!activeAssessment || !currentQuestion) return null;
    const selected = answers[currentQuestion.id];
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="grid gap-6 lg:grid-cols-12 animate-fade-in" id="oop-assessment-active">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
          <div className="border-b border-slate-100 pb-4">
            <span className="font-mono text-[10px] font-black uppercase text-slate-400">{activeAssessment.title}</span>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-slate-900">Question {currentIndex + 1} of {questions.length}</h2>
              <span className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{currentQuestion.difficulty}</span>
            </div>
          </div>

          <p className="mt-5 text-sm font-bold leading-7 text-slate-800">{currentQuestion.question}</p>
          {currentQuestion.codeSnippet && (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-sky-300">{currentQuestion.codeSnippet}</pre>
          )}

          <div className="mt-5 space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selected === option;
              const letter = ['A', 'B', 'C', 'D'][index];
              return (
                <button
                  key={option}
                  onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition ${isSelected ? 'border-emerald-600 bg-emerald-50/60 text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{letter}</span>
                  <span className={option.includes('\n') || option.includes(';') || option.includes('{') ? "font-mono text-xs whitespace-pre-wrap leading-relaxed" : ""}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(value => value - 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            {currentIndex === questions.length - 1 ? (
              <button onClick={submitAssessment} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700">
                Submit Assessment
              </button>
            ) : (
              <button onClick={() => setCurrentIndex(value => value + 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">Quiz Progress</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-8 w-8 rounded-lg text-[10px] font-black ${index === currentIndex ? 'bg-emerald-600 text-white' : answers[question.id] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-slate-500">{answeredCount} of {questions.length} answered</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs font-semibold leading-6 text-amber-800">
            <AlertCircle className="mb-2 h-4 w-4" />
            Passing requires 70%. If you score below 70%, the next lesson remains locked and the system recommends rewatching the current video.
          </div>
        </aside>
      </div>
    );
  };

  const renderResult = () => {
    if (!activeAssessment || !latestAttempt || !activeLesson) return null;

    return (
      <div className="mx-auto max-w-3xl space-y-5 animate-scale-in" id="oop-assessment-result">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${latestAttempt.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
            {latestAttempt.passed ? <CheckCircle className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">{latestAttempt.passed ? 'Assessment Passed' : 'Assessment Not Passed'}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {latestAttempt.passed ? `Lesson ${activeLesson.sequence + 1} is now unlocked when available.` : `Rewatch ${activeLesson.title}, then retake the assessment.`}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-y border-slate-100 py-5">
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Score</span><strong className="font-mono text-xl">{latestAttempt.score}/{latestAttempt.total}</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Percentage</span><strong className="font-mono text-xl">{latestAttempt.percentage}%</strong></div>
            <div><span className="block text-[10px] font-black uppercase text-slate-400">Attempt</span><strong className="font-mono text-xl">{latestAttempt.attemptNumber}</strong></div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => setView('review')} className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-700">Review Answers</button>
            <button onClick={() => startAssessment(activeAssessment.id)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-700"><RotateCcw className="h-4 w-4" /> Retake</button>
            <button onClick={() => onNavigateTo?.('videos')} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white">Continue Learning</button>
          </div>
        </section>
        <RecommendationCard recommendation={activeRecommendation || null} onNavigateTo={onNavigateTo} />
      </div>
    );
  };

  const renderReview = () => {
    if (!activeAssessment || !latestAttempt) return null;

    return (
      <div className="mx-auto max-w-4xl space-y-5 animate-fade-in" id="oop-assessment-review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] font-black uppercase text-slate-400">{activeAssessment.title}</span>
            <h2 className="text-xl font-extrabold text-slate-900">Correct and Incorrect Answers</h2>
          </div>
          <button onClick={() => setView('result')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Back to Result</button>
        </div>
        {questions.map((question, index) => {
          const selected = latestAttempt.answers[question.id];
          const isCorrect = selected === question.correctAnswer;

          return (
            <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-extrabold leading-6 text-slate-900">{index + 1}. {question.question}</h3>
                <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                  {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              {question.codeSnippet && <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-sky-300">{question.codeSnippet}</pre>}
              <div className="mt-4 space-y-2">
                {question.options.map(option => {
                  const correct = option === question.correctAnswer;
                  const chosen = option === selected;
                  return (
                    <div key={option} className={`rounded-xl border px-4 py-3 text-xs font-bold ${correct ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800' : chosen ? 'border-orange-300 bg-orange-50/50 text-orange-800' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                      {option}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
                <strong>Explanation:</strong> {question.explanation}
              </p>
              <p className="mt-2 font-mono text-[10px] font-black uppercase text-slate-400">Difficulty: {question.difficulty}</p>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full" id="assessments-workspace">
      {view === 'dashboard' && renderDashboard()}
      {view === 'active' && renderActive()}
      {view === 'result' && renderResult()}
      {view === 'review' && renderReview()}
    </div>
  );
}
