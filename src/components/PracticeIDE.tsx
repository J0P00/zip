import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Code2, Lock, Play, RotateCcw, Send, Terminal } from 'lucide-react';
import { AuthenticatedUser, PracticeSubmission } from '../types';
import { getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS, setStoredJson } from '../data/oopCourse';
import { getPracticeChallengeForLesson, gradePracticeSource, PRACTICE_CHALLENGES } from '../data/practiceChallenges';

interface PracticeIDEProps {
  currentUser: AuthenticatedUser;
  onSubmitCompleted: (submission: PracticeSubmission) => void;
  theme?: 'light' | 'dark';
}

interface WatchRecord {
  lessonId: string;
  completionPercentage: number;
  completed: boolean;
}

interface QuizAttempt {
  assessmentId: string;
  lessonId: string;
  percentage: number;
  passed: boolean;
}

const WATCH_KEY = 'oophub_oop_video_progress';
const QUIZ_KEY = 'oophub_oop_quiz_attempts';
const SUBMISSIONS_KEY = 'oophub_practice_submissions';
const DRAFT_KEY = 'oophub_practice_drafts';

type WatchDb = Record<string, WatchRecord>;
type QuizDb = Record<string, QuizAttempt>;
type SubmissionDb = Record<string, PracticeSubmission>;
type DraftDb = Record<string, string>;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PracticeIDE({ currentUser, onSubmitCompleted, theme }: PracticeIDEProps) {
  const isDark = theme === 'dark';
  const [watchDb] = useState<WatchDb>(() => getStoredJson(WATCH_KEY, {}));
  const [quizDb] = useState<QuizDb>(() => getStoredJson(QUIZ_KEY, {}));
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>(() => getStoredJson(SUBMISSIONS_KEY, {}));
  const [draftDb, setDraftDb] = useState<DraftDb>(() => getStoredJson(DRAFT_KEY, {}));
  const [activeChallengeId, setActiveChallengeId] = useState(() => PRACTICE_CHALLENGES[0].id);
  const activeChallenge = PRACTICE_CHALLENGES.find(challenge => challenge.id === activeChallengeId) || PRACTICE_CHALLENGES[0];
  const submissionKey = `${currentUser.id || currentUser.userId || currentUser.email}:${activeChallenge.id}`;
  const submitted = submissionDb[submissionKey];
  const [sourceCode, setSourceCode] = useState(() => submitted?.sourceCode || draftDb[submissionKey] || activeChallenge.starterCode);
  const [consoleLogs, setConsoleLogs] = useState<string[]>(['Console ready. Run code as often as you need before final submission.']);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ReturnType<typeof gradePracticeSource> | null>(submitted ? {
    compileStatus: submitted.compileStatus,
    score: submitted.score,
    runtime: submitted.runtime,
    memoryUsage: submitted.memoryUsage,
    programOutput: submitted.programOutput,
    errorMessage: submitted.errorMessage || '',
    testResults: submitted.testResults
  } : null);

  const activeLesson = OOP_COURSE_LESSONS.find(lesson => lesson.id === activeChallenge.lessonId);
  const activeAssessment = OOP_ASSESSMENTS.find(assessment => assessment.id === activeChallenge.assessmentId);

  const lockReason = useMemo(() => {
    const watchRecord = watchDb[activeChallenge.lessonId];
    const quizAttempt = quizDb[activeChallenge.assessmentId];
    if (!watchRecord?.completed || watchRecord.completionPercentage < 95) return 'Practice IDE is locked until the lesson video is completed at 100%.';
    if (!quizAttempt) return 'Practice IDE is locked until the assessment is completed.';
    if (!quizAttempt.passed || quizAttempt.percentage < 70) return 'Practice IDE is locked until the quiz score is 70% or higher.';
    return '';
  }, [activeChallenge.assessmentId, activeChallenge.lessonId, quizDb, watchDb]);

  const isLocked = Boolean(lockReason) || Boolean(submitted?.isLocked);
  const passedRun = Boolean(lastResult && lastResult.score >= activeChallenge.passingScore && lastResult.compileStatus === 'success');

  const selectChallenge = (challengeId: string) => {
    const challenge = PRACTICE_CHALLENGES.find(item => item.id === challengeId) || PRACTICE_CHALLENGES[0];
    const key = `${currentUser.id || currentUser.userId || currentUser.email}:${challenge.id}`;
    setActiveChallengeId(challenge.id);
    setSourceCode(submissionDb[key]?.sourceCode || draftDb[key] || challenge.starterCode);
    setLastResult(submissionDb[key] ? {
      compileStatus: submissionDb[key].compileStatus,
      score: submissionDb[key].score,
      runtime: submissionDb[key].runtime,
      memoryUsage: submissionDb[key].memoryUsage,
      programOutput: submissionDb[key].programOutput,
      errorMessage: submissionDb[key].errorMessage || '',
      testResults: submissionDb[key].testResults
    } : null);
    setConsoleLogs([submissionDb[key] ? 'Already Submitted. Editor is locked for this challenge.' : 'Console ready. Run code as often as you need before final submission.']);
  };

  const updateSource = (value: string) => {
    setSourceCode(value);
    const next = { ...draftDb, [submissionKey]: value };
    setDraftDb(next);
    setStoredJson(DRAFT_KEY, next);
  };

  const runCode = () => {
    setIsRunning(true);
    setConsoleLogs(['javac Main.java', 'Compiling source in the Java sandbox...']);
    window.setTimeout(() => {
      const result = gradePracticeSource(activeChallenge, sourceCode);
      setLastResult(result);
      setConsoleLogs([
        ...consoleLogs.slice(0, 1),
        result.compileStatus === 'failed' ? 'Compilation failed.' : 'Compilation succeeded.',
        result.errorMessage || 'All visible checks completed.',
        `Score preview: ${result.score}%`,
        `Runtime: ${result.runtime} ms`,
        `Output: ${result.programOutput || '(none)'}`
      ]);
      setIsRunning(false);
    }, 650);
  };

  const resetCode = () => {
    if (isLocked) return;
    updateSource(activeChallenge.starterCode);
    setLastResult(null);
    setConsoleLogs(['Editor reset to starter code.']);
  };

  const submitCode = () => {
    if (submitted) return;
    setIsSubmitting(true);
    const result = gradePracticeSource(activeChallenge, sourceCode);
    const now = new Date().toISOString();
    const practiceSubmission: PracticeSubmission = {
      id: `practice_sub_${Date.now()}`,
      studentId: currentUser.id || currentUser.userId || currentUser.email,
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      section: currentUser.section || 'Unassigned',
      challengeId: activeChallenge.id,
      challengeTitle: activeChallenge.title,
      topicId: activeChallenge.topicId,
      topicTitle: activeChallenge.topicId.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' '),
      sourceCode,
      programOutput: result.programOutput,
      compileStatus: result.compileStatus,
      runtime: result.runtime,
      memoryUsage: result.memoryUsage,
      score: result.score,
      submittedAt: now,
      isLocked: true,
      errorMessage: result.errorMessage,
      testResults: result.testResults
    };

    window.setTimeout(() => {
      const next = { ...submissionDb, [submissionKey]: practiceSubmission };
      setSubmissionDb(next);
      setStoredJson(SUBMISSIONS_KEY, next);
      setLastResult(result);
      setConsoleLogs([
        'Final submission saved.',
        `Compile status: ${result.compileStatus}`,
        `Final score: ${result.score}%`,
        `Submitted: ${formatDateTime(now)}`
      ]);
      onSubmitCompleted(practiceSubmission);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className={`grid gap-5 lg:grid-cols-12 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="practice-ide-workflow">
      <aside className="lg:col-span-3 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Practice Topics</h2>
          <div className="mt-3 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {PRACTICE_CHALLENGES.map((challenge, index) => {
              const lessonChallenge = getPracticeChallengeForLesson(challenge.lessonId);
              const challengeKey = `${currentUser.id || currentUser.userId || currentUser.email}:${challenge.id}`;
              const done = Boolean(submissionDb[challengeKey]);
              return (
                <button
                  key={challenge.id}
                  onClick={() => selectChallenge(lessonChallenge.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs font-bold transition ${activeChallenge.id === challenge.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'}`}
                >
                  <span className="block font-mono text-[10px] text-slate-400">Topic {index + 1}</span>
                  <span className="block truncate">{challenge.title}</span>
                  <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] uppercase ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {done ? 'Submitted' : 'Available when unlocked'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <main className="lg:col-span-6 rounded-lg border border-slate-200 bg-slate-950 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-slate-200">Main.java</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Auto-save</span>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCode} disabled={isLocked} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-300 disabled:opacity-40">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button onClick={runCode} disabled={isRunning || isSubmitting || Boolean(lockReason)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-900 disabled:opacity-40">
              <Play className="h-3.5 w-3.5 text-emerald-600" /> {isRunning ? 'Running' : 'Run'}
            </button>
          </div>
        </div>
        <textarea
          value={sourceCode}
          onChange={event => updateSource(event.target.value)}
          disabled={isLocked}
          spellCheck={false}
          className="h-[520px] w-full resize-none bg-slate-950 p-5 font-mono text-xs leading-6 text-emerald-100 outline-none disabled:cursor-not-allowed disabled:opacity-70"
        />
      </main>

      <aside className="lg:col-span-3 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-black uppercase text-emerald-600">{activeLesson?.title}</span>
              <h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{activeChallenge.title}</h2>
            </div>
            {isLocked ? <Lock className="h-5 w-5 text-slate-400" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{activeChallenge.description}</p>
          {lockReason && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
              <AlertCircle className="mb-1 h-4 w-4" />
              {lockReason}
            </div>
          )}
          {submitted && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              Already Submitted: {submitted.score}% on {formatDateTime(submitted.submittedAt)}
            </div>
          )}
          <div className="mt-4 space-y-3">
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400">Requirements</h3>
              <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {activeChallenge.requirements.map(item => <li key={item}>- {item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">
              <span className="block font-mono text-[10px] font-black uppercase text-slate-400">Sample Output</span>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-slate-800 dark:text-slate-200">{activeChallenge.sampleOutput}</pre>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase text-slate-400"><Terminal className="h-3.5 w-3.5" /> Console</span>
            {lastResult && <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300">{lastResult.score}%</span>}
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto font-mono text-[11px] leading-5 text-slate-300">
            {consoleLogs.map((line, index) => <pre key={`${line}-${index}`} className="whitespace-pre-wrap">{line}</pre>)}
          </div>
          {lastResult && (
            <div className="mt-3 space-y-1 border-t border-slate-800 pt-3">
              {lastResult.testResults.map(test => (
                <div key={test.id} className={`flex justify-between gap-2 text-[10px] font-bold ${test.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span>{test.isHidden ? 'Hidden test' : 'Sample test'}</span>
                  <span>{test.passed ? 'Passed' : 'Failed'}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={submitCode}
            disabled={Boolean(lockReason) || Boolean(submitted) || isRunning || isSubmitting}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${passedRun || !lastResult ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <Send className="h-4 w-4" /> {submitted ? 'Already Submitted' : isSubmitting ? 'Submitting' : 'Submit Final Solution'}
          </button>
          {!passedRun && lastResult && !submitted && <p className="mt-2 text-center text-[10px] font-bold text-amber-300">You may submit now, but failed tests will be recorded in the final grade.</p>}
        </section>
      </aside>
    </div>
  );
}
