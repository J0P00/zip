import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Code2, Lock, Play, RotateCcw, Send, Shield, Terminal } from 'lucide-react';
import { AdaptiveRecommendation, AuthenticatedUser, PracticeSubmission } from '../types';
import { getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS, setStoredJson } from '../data/oopCourse';
import { getPracticeChallengeForLesson, PRACTICE_CHALLENGES } from '../data/practiceChallenges';
import RecommendationCard from './RecommendationCard';
import SecureWatermark from './SecureWatermark';
import { practiceApi, progressApi } from '../services/api';

interface PracticeIDEProps {
  currentUser: AuthenticatedUser;
  onSubmitCompleted: (submission: PracticeSubmission) => void;
  theme?: 'light' | 'dark';
  activeRecommendation?: AdaptiveRecommendation | null;
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

const DRAFT_KEY = 'oophub_practice_drafts';

type WatchDb = Record<string, WatchRecord>;
type QuizDb = Record<string, QuizAttempt>;
type SubmissionDb = Record<string, PracticeSubmission>;
type DraftDb = Record<string, string>;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function PracticeIDE({ currentUser, onSubmitCompleted, theme, activeRecommendation }: PracticeIDEProps) {
  const isDark = theme === 'dark';
  const [watchDb, setWatchDb] = useState<WatchDb>({});
  const [quizDb, setQuizDb] = useState<QuizDb>({});
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>({});
  const [draftDb, setDraftDb] = useState<DraftDb>(() => getStoredJson(DRAFT_KEY, {}));
  const [activeChallengeId, setActiveChallengeId] = useState(() => PRACTICE_CHALLENGES[0].id);
  const activeChallenge = PRACTICE_CHALLENGES.find(challenge => challenge.id === activeChallengeId) || PRACTICE_CHALLENGES[0];
  const studentKey = currentUser.id || currentUser.userId || currentUser.email;
  const submissionKey = `${studentKey}:${activeChallenge.id}`;
  const currentSubmission = submissionDb[submissionKey];
  const submitted = currentSubmission?.isLocked ? currentSubmission : undefined;
  const [sourceCode, setSourceCode] = useState(() => currentSubmission?.sourceCode || draftDb[submissionKey] || activeChallenge.starterCode);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Console ready. Type your Java code solution below.',
    'Note: Secure Practice Mode is active. Direct pasting of external code is disabled to foster genuine coding practice.'
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pasteWarning, setPasteWarning] = useState<string | null>(null);

  const [lastResult, setLastResult] = useState<{
    compileStatus: 'success' | 'failed' | 'runtime_error' | 'not_run';
    score: number;
    runtime: number;
    memoryUsage?: number;
    programOutput: string;
    errorMessage?: string;
    testResults: Array<{ id: string; isHidden: boolean; passed: boolean; expectedOutput: string; actualOutput: string; message: string }>;
  } | null>(submitted ? {
    compileStatus: submitted.compileStatus,
    score: submitted.score,
    runtime: submitted.runtime,
    memoryUsage: submitted.memoryUsage,
    programOutput: submitted.programOutput,
    errorMessage: submitted.errorMessage || '',
    testResults: submitted.testResults || []
  } : null);

  const activeLesson = OOP_COURSE_LESSONS.find(lesson => lesson.id === activeChallenge.lessonId);

  const mapBackendSubmission = (row: any): PracticeSubmission => ({
    ...row,
    id: row.id,
    studentId: row.student_id || studentKey,
    studentName: currentUser.name,
    studentEmail: currentUser.email,
    section: currentUser.section || 'Unassigned',
    challengeId: row.challenge_id,
    challengeTitle: row.challenge_title || activeChallenge.title,
    topicId: row.topic_id || activeChallenge.topicId,
    topicTitle: row.lesson_id || row.topic_id || activeChallenge.topicId,
    sourceCode: row.source_code || '',
    compileStatus: row.compile_status,
    programOutput: row.program_output || '',
    memoryUsage: row.memory_usage === null || row.memory_usage === undefined ? undefined : Number(row.memory_usage),
    runtime: Number(row.runtime || 0),
    score: Number(row.score || 0),
    submittedAt: row.submitted_at,
    isLocked: Boolean(row.is_locked),
    errorMessage: row.error_message || '',
    testResults: row.test_results || [],
    teacherScore: row.teacher_score === null || row.teacher_score === undefined ? undefined : Number(row.teacher_score),
    feedback: row.teacher_feedback || '',
    gradedAt: row.graded_at,
    reviewStatus: row.review_status,
    remedialRequired: row.remedial_required === null || row.remedial_required === undefined ? undefined : Boolean(row.remedial_required)
  });

  useEffect(() => {
    let mounted = true;
    Promise.all([
      progressApi.getVideoProgress(currentUser.id || '', currentUser.token),
      progressApi.getQuizAttempts(currentUser.id || '', currentUser.token),
      practiceApi.listMine()
    ]).then(([videoResponse, quizResponse, submissionResponse]) => {
      if (!mounted) return;
      setWatchDb(videoResponse.data.reduce((acc: WatchDb, row: any) => ({ ...acc, [row.video_id]: { lessonId: row.video_id, completionPercentage: Number(row.completion_percentage || 0), completed: Boolean(row.completed) } }), {}));
      setQuizDb(quizResponse.data.reduce((acc: QuizDb, row: any) => ({ ...acc, [row.assessment_id]: { assessmentId: row.assessment_id, lessonId: row.lesson_id || '', percentage: Number(row.percentage || 0), passed: Boolean(row.passed) } }), {}));
      const remote = submissionResponse.data.reduce((acc: SubmissionDb, row: any) => {
        const mapped = mapBackendSubmission(row);
        return { ...acc, [`${studentKey}:${mapped.challengeId}`]: mapped };
      }, {});
      setSubmissionDb(remote);
      const current = remote[`${studentKey}:${activeChallenge.id}`];
      if (current) {
        setSourceCode(current.isLocked ? current.sourceCode : draftDb[submissionKey] || current.sourceCode || activeChallenge.starterCode);
        setLastResult(current.isLocked ? { compileStatus: current.compileStatus, score: current.score, runtime: current.runtime, memoryUsage: current.memoryUsage || 0, programOutput: current.programOutput, errorMessage: current.errorMessage || '', testResults: current.testResults || [] } : null);
        setConsoleLogs([current.isLocked ? 'Already Submitted. Editor is locked for this challenge.' : 'Submission reopened. You can submit another final solution.']);
      }
    }).catch(error => console.warn('Unable to load practice progress from backend:', error));
    return () => { mounted = false; };
  }, [activeChallenge.id, currentUser.email, currentUser.id, currentUser.name, currentUser.section, currentUser.token, currentUser.userId]);

  const lockReason = useMemo(() => {
    const currentLessonSequence = activeLesson?.sequence || 1;
    if (currentLessonSequence > 1) {
      const previousLesson = OOP_COURSE_LESSONS.find(lesson => lesson.sequence === currentLessonSequence - 1);
      const previousAssessment = previousLesson && OOP_ASSESSMENTS.find(assessment => assessment.lessonId === previousLesson.id);
      if (!previousLesson || !watchDb[previousLesson.id]?.completed || watchDb[previousLesson.id].completionPercentage < 95 || !previousAssessment || !quizDb[previousAssessment.id]?.passed) {
        return 'Practice IDE is locked until the previous lesson video is completed and its assessment is passed.';
      }
    }
    const watchRecord = watchDb[activeChallenge.lessonId];
    const quizAttempt = quizDb[activeChallenge.assessmentId];
    if (!watchRecord?.completed || watchRecord.completionPercentage < 95) return 'Practice IDE is locked until the lesson video is completed at 95% or higher.';
    if (!quizAttempt) return 'Practice IDE is locked until the assessment is completed.';
    if (!quizAttempt.passed || quizAttempt.percentage < 80) return 'Practice IDE is locked until the quiz score is 80% or higher.';
    return '';
  }, [activeChallenge.assessmentId, activeChallenge.lessonId, quizDb, watchDb, activeLesson]);

  const isLocked = Boolean(lockReason) || Boolean(submitted?.isLocked);
  const passedRun = Boolean(lastResult && lastResult.score >= activeChallenge.passingScore && lastResult.compileStatus === 'success');

  const selectChallenge = (challengeId: string) => {
    const challenge = PRACTICE_CHALLENGES.find(item => item.id === challengeId) || PRACTICE_CHALLENGES[0];
    const key = `${studentKey}:${challenge.id}`;
    setActiveChallengeId(challenge.id);
    const record = submissionDb[key];
    setSourceCode(record?.isLocked ? record.sourceCode : draftDb[key] || record?.sourceCode || challenge.starterCode);
    setLastResult(record?.isLocked ? {
      compileStatus: record.compileStatus,
      score: record.score,
      runtime: record.runtime,
      memoryUsage: record.memoryUsage,
      programOutput: record.programOutput,
      errorMessage: record.errorMessage || '',
      testResults: record.testResults || []
    } : null);
    setConsoleLogs([record?.isLocked ? 'Already Submitted. Editor is locked for this challenge.' : record ? 'Submission reopened. You can submit another final solution.' : 'Console ready. Type your Java code solution below.']);
  };

  const updateSource = (value: string) => {
    setSourceCode(value);
    const next = { ...draftDb, [submissionKey]: value };
    setDraftDb(next);
    setStoredJson(DRAFT_KEY, next);
  };

  // Paste & Drag-and-Drop Blocking Security Handlers
  const handlePasteBlock = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteWarning('Pasting external code is blocked in Practice Mode. Please type your code manually.');
    setConsoleLogs(prev => [
      '[Security Notice] Pasting code into the editor is disabled. Type your solution to practice syntax mastery.',
      ...prev.slice(0, 5)
    ]);
    setTimeout(() => setPasteWarning(null), 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Intercept Ctrl+V / Cmd+V
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      setPasteWarning('Paste shortcut (Ctrl+V) is disabled in Practice Mode.');
      setTimeout(() => setPasteWarning(null), 4000);
      return;
    }

    // Support Tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const nextCode = sourceCode.substring(0, start) + '    ' + sourceCode.substring(end);
      updateSource(nextCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleDropBlock = (e: React.DragEvent) => {
    e.preventDefault();
    setPasteWarning('Drag-and-drop text is disabled in Practice Mode.');
    setTimeout(() => setPasteWarning(null), 4000);
  };

  const runCode = async () => {
    setIsRunning(true);
    setConsoleLogs(['javac Main.java', 'Compiling and executing public tests in server sandbox...']);
    try {
      const response = await practiceApi.runCode(activeChallenge.id, sourceCode);
      const result = response.data;
      setLastResult(result);
      setConsoleLogs([
        'javac Main.java',
        result.compileStatus === 'failed' ? '❌ Compilation failed.' : '✓ Compilation succeeded.',
        result.errorMessage || 'All visible test checks evaluated.',
        `Visible score preview: ${result.score}%`,
        `Execution time: ${result.runtime} ms`,
        `Output: ${result.programOutput || '(none)'}`
      ]);
    } catch (error: any) {
      setConsoleLogs([
        'Error during compilation/run:',
        error.message || 'Unable to connect to server sandbox.'
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    if (isLocked) return;
    updateSource(activeChallenge.starterCode);
    setLastResult(null);
    setConsoleLogs(['Editor reset to starter code.']);
  };

  const submitCode = async () => {
    if (submitted) return;
    setIsSubmitting(true);
    setConsoleLogs(['Submitting solution for authoritative server evaluation & hidden test grading...']);

    try {
      const response = await practiceApi.submit({
        challengeId: activeChallenge.id,
        sourceCode
      });
      const savedSubmission = mapBackendSubmission(response.data);
      const next = { ...submissionDb, [submissionKey]: savedSubmission };
      setSubmissionDb(next);
      setLastResult({
        compileStatus: savedSubmission.compileStatus,
        score: savedSubmission.score,
        runtime: savedSubmission.runtime,
        memoryUsage: savedSubmission.memoryUsage,
        programOutput: savedSubmission.programOutput,
        errorMessage: savedSubmission.errorMessage,
        testResults: savedSubmission.testResults || []
      });
      setConsoleLogs([
        '✓ Final submission evaluated and saved authoritatively by server.',
        `Compile status: ${savedSubmission.compileStatus}`,
        `Final score: ${savedSubmission.score}%`,
        `Submitted: ${formatDateTime(savedSubmission.submittedAt || new Date().toISOString())}`
      ]);
      onSubmitCompleted(savedSubmission);
    } catch (error: any) {
      setConsoleLogs([
        '❌ Final submission was not saved.',
        error.message || 'Unable to sync practice submission with backend.'
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative grid gap-5 lg:grid-cols-12 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} id="practice-ide-workflow">
      {/* Dynamic Traceable Watermark */}
      <SecureWatermark
        studentIdentifier={currentUser.studentNumber || currentUser.userId || currentUser.name}
        activityIdentifier={`PRACTICE: ${activeChallenge.title}`}
        sessionIdentifier={studentKey}
      />

      <aside className="lg:col-span-3 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Practice Topics</h2>
            <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Shield className="h-3 w-3" /> Secure IDE
            </span>
          </div>
          <div className="mt-3 space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {PRACTICE_CHALLENGES.map((challenge, index) => {
              const lessonChallenge = getPracticeChallengeForLesson(challenge.lessonId);
              const challengeKey = `${studentKey}:${challenge.id}`;
              const done = Boolean(submissionDb[challengeKey]?.isLocked);
              return (
                <button
                  key={challenge.id}
                  type="button"
                  onClick={() => selectChallenge(lessonChallenge.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs font-bold transition cursor-pointer ${activeChallenge.id === challenge.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}
                >
                  <span className="block font-mono text-[10px] text-slate-400">Topic {index + 1}</span>
                  <span className="block truncate">{challenge.title}</span>
                  <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] uppercase ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {done ? 'Submitted' : 'Available when unlocked'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </aside>

      <main className="lg:col-span-6 rounded-lg border border-slate-200 bg-slate-950 shadow-sm overflow-hidden flex flex-col relative">
        {pasteWarning && (
          <div className="absolute top-14 left-4 right-4 z-30 rounded-lg border border-amber-300 bg-amber-900/90 px-3 py-2 text-xs font-bold text-amber-200 shadow-md animate-fade-in flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{pasteWarning}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 bg-slate-900">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-slate-200">Main.java</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Secure Editor</span>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCode} disabled={isLocked} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button onClick={runCode} disabled={isRunning || isSubmitting || Boolean(lockReason)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-900 disabled:opacity-40 hover:bg-white transition cursor-pointer">
              <Play className="h-3.5 w-3.5 text-emerald-600" /> {isRunning ? 'Compiling...' : 'Run'}
            </button>
          </div>
        </div>

        <textarea
          value={sourceCode}
          onChange={event => updateSource(event.target.value)}
          onPaste={handlePasteBlock}
          onKeyDown={handleKeyDown}
          onDrop={handleDropBlock}
          onDragOver={e => e.preventDefault()}
          disabled={isLocked}
          spellCheck={false}
          className="h-[520px] w-full resize-none bg-slate-950 p-5 font-mono text-xs leading-6 text-emerald-100 outline-none disabled:cursor-not-allowed disabled:opacity-70 focus:ring-1 focus:ring-emerald-500"
          placeholder="// Type your Java code solution here..."
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
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{activeChallenge.description}</p>
          {lockReason && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="mb-1 h-4 w-4" />
              {lockReason}
            </div>
          )}
          {submitted && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                  <span>{test.passed ? 'Passed ✓' : 'Failed ✗'}</span>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={submitCode}
            disabled={Boolean(lockReason) || Boolean(submitted) || isRunning || isSubmitting}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${passedRun || !lastResult ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            <Send className="h-4 w-4" /> {submitted ? 'Already Submitted' : isSubmitting ? 'Evaluating on Server...' : 'Submit Final Solution'}
          </button>
        </section>

        <RecommendationCard recommendation={activeRecommendation || null} compact />
      </aside>
    </div>
  );
}
