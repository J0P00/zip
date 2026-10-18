import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Award,
  TrendingUp,
  Settings,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  X,
  FileQuestion,
  Users
} from 'lucide-react';
import { PreTestConfig, PreTestAttempt } from '../../types';
import { preTestApi } from '../../services/api';
import { ALL_OOP_QUESTIONS, OOP_TOPIC_NAMES } from '../../data/oopQuestions';

const PRE_TEST_TIME_LIMIT_SECONDS = 10 * 60;

interface PreTestManagementTabProps {
  theme?: 'light' | 'dark';
}

export default function PreTestManagementTab({ theme = 'light' }: PreTestManagementTabProps) {
  const isDark = theme === 'dark';
  const [config, setConfig] = useState<PreTestConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<PreTestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Question preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [questionsPool, setQuestionsPool] = useState<any[]>(ALL_OOP_QUESTIONS);

  // Attempts search
  const [studentSearch, setStudentSearch] = useState('');

  // Edit config modal state
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    title: 'Java OOP Diagnostic Pre-Test',
    description: 'Prior-knowledge diagnostic exam randomly sampling 20 questions from the 240-question Java OOP Assessment Bank.',
    questionsPerAttempt: 20,
    timeLimitSeconds: PRE_TEST_TIME_LIMIT_SECONDS,
    passingScore: 70,
    maxAttempts: 3,
    status: 'Published' as 'Draft' | 'Published' | 'Archived',
    postTestAssessmentId: 'oop_assessment_12'
  });

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500';

  const loadData = async () => {
    setIsLoading(true);
    setConfigError(null);
    try {
      const [cfgRes, attRes, qRes] = await Promise.allSettled([
        preTestApi.getConfig(),
        preTestApi.getAttempts(),
        preTestApi.getQuestions()
      ]);

      if (cfgRes.status === 'fulfilled' && cfgRes.value.data) {
        setConfig(cfgRes.value.data);
        setConfigError(null);
        setConfigForm({
          title: cfgRes.value.data.title,
          description: cfgRes.value.data.description,
          questionsPerAttempt: cfgRes.value.data.questionsPerAttempt || 20,
          timeLimitSeconds: cfgRes.value.data.timeLimitSeconds || PRE_TEST_TIME_LIMIT_SECONDS,
          passingScore: cfgRes.value.data.passingScore || 70,
          maxAttempts: cfgRes.value.data.maxAttempts || 3,
          status: cfgRes.value.data.status || 'Published',
          postTestAssessmentId: cfgRes.value.data.postTestAssessmentId || 'oop_assessment_12'
        });
      } else {
        setConfig(null);
        const reason = cfgRes.status === 'rejected'
          ? (cfgRes.reason?.message || 'Failed to connect to pre-test configuration service.')
          : 'Pre-test configuration not found on server.';
        setConfigError(reason);
      }

      if (attRes.status === 'fulfilled' && attRes.value.data) {
        setAttempts(attRes.value.data);
      }

      if (qRes.status === 'fulfilled' && qRes.value.data) {
        setQuestionsPool(qRes.value.data);
      } else {
        setQuestionsPool(ALL_OOP_QUESTIONS);
      }
    } catch {
      setConfig(null);
      setConfigError('Failed to load pre-test configuration.');
      setQuestionsPool(ALL_OOP_QUESTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await preTestApi.updateConfig({
        ...configForm,
        questionsPerAttempt: 20 // Fixed by pedagogical requirement
      });
      setConfig(res.data);
      setFeedback({ type: 'success', message: 'Pre-test configuration updated successfully.' });
      setIsConfigOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update pre-test configuration.' });
    }
  };

  const filteredQuestions = useMemo(() => {
    return questionsPool.filter(q => {
      const matchSearch =
        q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
        q.explanation.toLowerCase().includes(questionSearch.toLowerCase()) ||
        q.options.some((opt: string) => opt.toLowerCase().includes(questionSearch.toLowerCase()));
      const matchTopic = selectedTopic === 'All' ? true : q.topic === selectedTopic;
      return matchSearch && matchTopic;
    });
  }, [questionsPool, questionSearch, selectedTopic]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter(a => {
      const name = a.studentName || '';
      const email = a.studentEmail || '';
      const num = a.studentNumber || '';
      const s = studentSearch.toLowerCase();
      return name.toLowerCase().includes(s) || email.toLowerCase().includes(s) || num.toLowerCase().includes(s);
    });
  }, [attempts, studentSearch]);

  const totalPoolCount = questionsPool.length || 240;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Configuration & Status Card */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Pre-Test
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Status: {config?.status || (configError ? 'Unavailable' : 'Published')}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">{config?.title || 'Java OOP Diagnostic Pre-Test'}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              {config?.description ||
                'Prior-knowledge diagnostic exam randomly sampling 20 questions from the 240-question Java OOP Assessment Bank.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Eye className="h-4 w-4 text-emerald-600" />
              Preview Question Bank ({totalPoolCount})
            </button>
            <button
              type="button"
              disabled={!config || Boolean(configError)}
              onClick={() => setIsConfigOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Settings className="h-4 w-4" />
              Configure Pre-Test
            </button>
          </div>
        </div>

        {/* Config Error Alert */}
        {configError && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{configError}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center justify-between rounded-xl border p-3 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 4 Feature Parameter Badges */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <Database className="h-3.5 w-3.5 text-indigo-500" />
              Question Pool
            </div>
            <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
              {totalPoolCount}
            </strong>
            <span className="text-[10px] text-slate-400">12 OOP Topics (20 each)</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <FileQuestion className="h-3.5 w-3.5 text-emerald-500" />
              Sampled Per Attempt
            </div>
            <strong className="mt-1 block font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
              {config?.questionsPerAttempt || 20}
            </strong>
            <span className="text-[10px] text-slate-400">Random without replacement</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Time Limit
            </div>
            <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
              {Math.floor((config?.timeLimitSeconds || PRE_TEST_TIME_LIMIT_SECONDS) / 60)} min
            </strong>
            <span className="text-[10px] text-slate-400">Auto-submit at expiry</span>
          </div>

          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <Award className="h-3.5 w-3.5 text-sky-500" />
              Passing Benchmark
            </div>
            <strong className="mt-1 block font-mono text-xl font-black text-slate-900 dark:text-white">
              {config?.passingScore || 70}%
            </strong>
            <span className="text-[10px] text-slate-400">Non-blocking prior check</span>
          </div>
        </div>
      </div>

      {/* Student Attempts & Learning Gain Section */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="p-5 border-b dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Student Pre-Test Attempts & Post-Test Gain
            </h3>
            <p className="text-xs text-slate-400">
              Historical student attempts and comparative learning improvement when post-test is taken.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or section..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className={`w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs font-bold transition outline-none ${inputClass}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase tracking-wider text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className="px-4 py-3 font-black">Student</th>
                <th className="px-4 py-3 font-black">Section / ID</th>
                <th className="px-4 py-3 font-black text-center">Attempt</th>
                <th className="px-4 py-3 font-black text-center">Pre-Test Score</th>
                <th className="px-4 py-3 font-black text-center">Status</th>
                <th className="px-4 py-3 font-black">Completed At</th>
                <th className="px-4 py-3 font-black text-center">Post-Test Score</th>
                <th className="px-4 py-3 font-black text-center">Score Delta (Gain)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                    Loading student attempts...
                  </td>
                </tr>
              ) : filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No student pre-test attempts recorded yet.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map(att => (
                  <tr key={att.id} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                      {att.studentName || 'Student'}
                      <span className="block text-[10px] font-normal text-slate-400">{att.studentEmail}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {att.section || 'BSCS 2A'} • {att.studentNumber || att.studentId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold">
                      #{att.attemptNumber}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-black text-xs">
                        {att.score}/{att.total} ({att.percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          att.passed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {att.passed ? 'Passed' : 'Baseline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {att.dateCompleted ? new Date(att.dateCompleted).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">
                      {att.postTestPercentage !== null && att.postTestPercentage !== undefined ? (
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          {att.postTestPercentage}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">In Progress</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {att.scoreImprovement !== null && att.scoreImprovement !== undefined ? (
                        <span
                          className={`font-mono font-black text-xs ${
                            att.scoreImprovement >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600'
                          }`}
                        >
                          {att.scoreImprovement >= 0 ? `+${att.scoreImprovement}%` : `${att.scoreImprovement}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUESTION BANK PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl border p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-black">
                    Java OOP Assessment Bank Browser ({questionsPool.length} Questions)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Source: <code className="font-mono text-emerald-500">public/JAVA OOP Assessment</code> (12 Topics, 20 Questions each)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="py-3 border-b dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions or keywords..."
                  value={questionSearch}
                  onChange={e => setQuestionSearch(e.target.value)}
                  className={`w-full rounded-xl border pl-9 pr-3 py-1.5 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold outline-none ${inputClass}`}
              >
                <option value="All">All 12 Topics ({questionsPool.length})</option>
                {Object.values(OOP_TOPIC_NAMES).map(topic => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions List */}
            <div className="overflow-y-auto flex-1 space-y-4 py-4 pr-1">
              {filteredQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  No questions match your query.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {q.topic}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        Question #{idx + 1} • {q.id}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                      {q.question}
                    </p>

                    {q.codeSnippet && (
                      <pre className="rounded-lg bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto border border-slate-800">
                        <code>{q.codeSnippet}</code>
                      </pre>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt: string, i: number) => {
                        const isCorrect = opt === q.correctAnswer;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-2.5 text-[11px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">Explanation: </strong>
                      {q.explanation}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 flex justify-between items-center text-xs font-bold text-slate-400 shrink-0 dark:border-slate-800">
              <span>Showing {filteredQuestions.length} of {questionsPool.length} questions</span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl bg-slate-200 dark:bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CONFIG MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black">Pre-Test Parameters</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Pre-Test Title
                </label>
                <input
                  type="text"
                  required
                  value={configForm.title}
                  onChange={e => setConfigForm({ ...configForm, title: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={configForm.description}
                  onChange={e => setConfigForm({ ...configForm, description: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Questions per Attempt (Requirement: 20)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={20}
                    className="w-full rounded-xl border px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Fixed at 20 randomly drawn questions</span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Time Limit (Seconds)
                  </label>
                  <input
                    type="number"
                    min={300}
                    step={60}
                    value={configForm.timeLimitSeconds}
                    onChange={e => setConfigForm({ ...configForm, timeLimitSeconds: Number(e.target.value) })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  />
                  <span className="text-[10px] text-slate-400">{Math.floor(configForm.timeLimitSeconds / 60)} minutes</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Passing Benchmark (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={configForm.passingScore}
                    onChange={e => setConfigForm({ ...configForm, passingScore: Number(e.target.value) })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={configForm.status}
                    onChange={e => setConfigForm({ ...configForm, status: e.target.value as any })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  >
                    <option value="Published">Published (Active)</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
