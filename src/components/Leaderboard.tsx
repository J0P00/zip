import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Search, UserRound } from 'lucide-react';
import { AuthenticatedUser, RankingEntry } from '../types';
import { rankingApi } from '../services/api';

interface LeaderboardProps {
  currentUser?: AuthenticatedUser | null;
  teacherMode?: boolean;
}

const getUserKey = (user?: AuthenticatedUser | null) => user?.id || user?.userId || user?.email || '';

const stateClass = (state: RankingEntry['learningState']) =>
  state === 'MASTERED'
    ? 'bg-emerald-100 text-emerald-700'
    : state === 'DEVELOPING'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-sky-100 text-sky-700';

const darkStateClass = (state: RankingEntry['learningState']) =>
  state === 'MASTERED'
    ? 'bg-emerald-900 text-emerald-300'
    : state === 'DEVELOPING'
      ? 'bg-amber-900 text-amber-300'
      : 'bg-sky-900 text-sky-300';

export default function Leaderboard({ currentUser, teacherMode = false }: LeaderboardProps) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const viewerId = getUserKey(currentUser);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await rankingApi.list(currentUser?.token);
        if (!cancelled) {
          setEntries(response.data);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Rankings are temporarily unavailable.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentUser?.token]);

  useEffect(() => {
    if (!entries.length) return;
    const current = entries.find(entry => entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase());
    setSelectedId(previous =>
      entries.some(entry => entry.studentId === previous) ? previous : current?.studentId || entries[0].studentId
    );
  }, [entries, viewerId]);

  const selected = entries.find(entry => entry.studentId === selectedId) || entries[0];
  const current = entries.find(entry => entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase());
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? entries.filter(entry => entry.name.toLowerCase().includes(query) || entry.email.toLowerCase().includes(query))
      : entries;
  }, [entries, search]);

  const movement = (entry: RankingEntry) =>
    entry.movement === 'new' ? 'NEW' : entry.movement === 'stable' ? '-' : `${entry.movement === 'up' ? '↑' : '↓'}${entry.movementAmount}`;
  const avatar = (entry: RankingEntry, size = 'h-9 w-9') =>
    entry.avatar ? (
      <img src={entry.avatar} alt="" className={`${size} rounded-full object-cover`} />
    ) : (
      <div className={`${size} flex items-center justify-center rounded-full bg-emerald-600 font-black uppercase text-white`}>
        {entry.name.charAt(0)}
      </div>
    );

  const panelClass = teacherMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const mutedPanelClass = teacherMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white';
  const primaryText = teacherMode ? 'text-slate-100' : 'text-slate-950';
  const secondaryText = teacherMode ? 'text-slate-400' : 'text-slate-500';
  const mutedText = teacherMode ? 'text-slate-500' : 'text-slate-400';
  const separators = teacherMode ? 'divide-slate-800 border-slate-800' : 'divide-slate-100 border-slate-100';

  return (
    <div className="space-y-5" id="leaderboard-workspace">
      <section className={`rounded-2xl border p-5 shadow-sm ${panelClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">Student Ranking</span>
            <h2 className={`mt-2 text-2xl font-black ${primaryText}`}>Learning performance</h2>
            <p className={`mt-1 max-w-2xl text-sm font-medium leading-6 ${secondaryText}`}>
              Rankings combine OOP progress, quiz performance, and Practice IDE results. Learning State reflects demonstrated understanding.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-[10px] font-black uppercase text-emerald-300">
            <Activity className="h-3.5 w-3.5" /> Live from database
          </span>
        </div>
      </section>

      {current && (
        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Your Rank</span>
            <strong className="mt-1 block text-3xl font-black">#{current.rank}</strong>
            <span className="text-xs font-semibold text-slate-400">of {entries.length} students</span>
          </div>
          <div className={`rounded-2xl border p-4 ${mutedPanelClass}`}>
            <span className={`text-[10px] font-black uppercase ${mutedText}`}>Learning Score</span>
            <strong className="mt-1 block text-2xl font-black text-emerald-400">{current.learningScore}%</strong>
            <span className={`text-xs font-semibold ${secondaryText}`}>{movement(current)} rank movement</span>
          </div>
          <div className={`rounded-2xl border p-4 ${mutedPanelClass}`}>
            <span className={`text-[10px] font-black uppercase ${mutedText}`}>OOP Progress</span>
            <strong className={`mt-1 block text-2xl font-black ${primaryText}`}>{current.oopProgress}%</strong>
            <span className={`text-xs font-semibold ${secondaryText}`}>{current.completedLessons}/{current.totalLessons} lessons</span>
          </div>
          <div className={`rounded-2xl border p-4 ${mutedPanelClass}`}>
            <span className={`text-[10px] font-black uppercase ${mutedText}`}>Learning State</span>
            <strong className={`mt-1 inline-block rounded-full px-2 py-1 text-sm font-black ${teacherMode ? darkStateClass(current.learningState) : stateClass(current.learningState)}`}>
              {current.learningState}
            </strong>
            <span className={`block text-xs font-semibold ${secondaryText}`}>Quiz {current.quizScore}% | IDE {current.practiceScore}%</span>
          </div>
        </section>
      )}

      {entries.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3">
          {(['MASTERED', 'DEVELOPING', 'BEGINNER'] as const).map(state => {
            const count = entries.filter(entry => entry.learningState === state).length;
            return (
              <div key={state} className={`rounded-xl border px-4 py-3 shadow-sm ${mutedPanelClass}`}>
                <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>Class Learning States</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${teacherMode ? darkStateClass(state) : stateClass(state)}`}>{state}</span>
                  <strong className={`text-xl font-black ${primaryText}`}>{count}</strong>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {error && <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm font-bold text-rose-300">{error}</div>}
      {loading && <div className={`rounded-2xl border p-8 text-center text-sm font-semibold ${panelClass} ${secondaryText}`}>Loading database rankings...</div>}

      {!loading && !error && entries.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Top performers</span>
                  <h3 className="mt-1 text-lg font-black">Learning performance</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">40% OOP + 30% Quiz + 30% IDE</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {entries.slice(0, 3).map(entry => (
                  <button
                    type="button"
                    key={entry.studentId}
                    onClick={() => setSelectedId(entry.studentId)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedId === entry.studentId
                        ? 'border-emerald-400 bg-emerald-950/50'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-emerald-300">#{entry.rank}</span>
                      <span className="text-xs font-black text-slate-300">{movement(entry)}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">{avatar(entry)}<span className="truncate text-sm font-black">{entry.name}</span></div>
                    <strong className="mt-4 block text-2xl font-black">{entry.learningScore}%</strong>
                    <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-black ${darkStateClass(entry.learningState)}`}>{entry.learningState}</span>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-400">
                      <span>OOP {entry.oopProgress}%</span><span>Quiz {entry.quizScore}%</span><span>IDE {entry.practiceScore}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className={`overflow-hidden rounded-2xl border shadow-sm ${panelClass}`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-5 ${separators}`}>
                <div>
                  <h3 className={`text-sm font-black ${primaryText}`}>Ranking table</h3>
                  <p className={`mt-1 text-xs font-medium ${secondaryText}`}>Rank and Learning State are calculated independently.</p>
                </div>
                <div className="relative w-full sm:w-52">
                  <Search className={`absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search students"
                    className={`w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 ${teacherMode ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50'}`}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className={`border-b text-[10px] uppercase tracking-wider ${separators} ${mutedText}`}>
                    <tr>
                      <th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Learning State</th><th className="px-4 py-3">OOP</th><th className="px-4 py-3">Quiz</th>
                      <th className="px-4 py-3">Practice IDE</th><th className="px-4 py-3">Movement</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${separators}`}>
                    {filtered.map(entry => {
                      const isYou = entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase();
                      const selectedRow = selectedId === entry.studentId;
                      return (
                        <tr
                          key={entry.studentId}
                          onClick={() => setSelectedId(entry.studentId)}
                          className={`cursor-pointer transition ${isYou ? 'bg-emerald-950/40' : selectedRow ? 'bg-slate-800/60' : 'hover:bg-slate-800/40'}`}
                        >
                          <td className={`px-4 py-3 font-black ${primaryText}`}>#{entry.rank}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {avatar(entry, 'h-8 w-8')}
                              <div>
                                <span className={`block font-black ${primaryText}`}>{entry.name}{isYou && <span className="ml-1 text-emerald-400">(You)</span>}</span>
                                <span className={`text-[10px] font-semibold ${mutedText}`}>{entry.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-lg font-black text-emerald-400">{entry.learningScore}%</td>
                          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${teacherMode ? darkStateClass(entry.learningState) : stateClass(entry.learningState)}`}>{entry.learningState}</span></td>
                          <td className={`px-4 py-3 font-bold ${secondaryText}`}>{entry.oopProgress}%</td>
                          <td className={`px-4 py-3 font-bold ${secondaryText}`}>{entry.quizScore}%</td>
                          <td className={`px-4 py-3 font-bold ${secondaryText}`}>{entry.practiceScore}%</td>
                          <td className={`px-4 py-3 font-black ${secondaryText}`}>{movement(entry)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4">
            {selected && (
              <section className={`space-y-5 rounded-2xl border p-5 shadow-sm ${panelClass}`}>
                <div className={`flex items-start justify-between border-b pb-4 ${separators.split(' ')[1] || 'border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    {avatar(selected, 'h-14 w-14')}
                    <div>
                      <h3 className={`text-base font-black ${primaryText}`}>{selected.name}</h3>
                      {(selected.studentId === viewerId || selected.email.toLowerCase() === viewerId.toLowerCase()) && <span className="text-[10px] font-black uppercase text-emerald-400">You</span>}
                      <p className={`mt-1 text-xs font-semibold ${secondaryText}`}>{selected.status}</p>
                    </div>
                  </div>
                  <UserRound className={`h-5 w-5 ${mutedText}`} />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>Learning State</span>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-1 text-sm font-black ${teacherMode ? darkStateClass(selected.learningState) : stateClass(selected.learningState)}`}>{selected.learningState}</span>
                    <span className={`text-xs font-bold ${secondaryText}`}>Rank #{selected.rank} of {entries.length}</span>
                  </div>
                  <p className={`mt-3 text-xs font-medium leading-5 ${secondaryText}`}>{selected.interpretation}</p>
                </div>
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-4">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Learning Score</span>
                  <strong className="mt-1 block text-3xl font-black text-emerald-300">{selected.learningScore}%</strong>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-400">Independent of rank. Based on real OOP evidence.</p>
                </div>
                <div className="space-y-3">
                  {[
                    ['OOP Progress', selected.oopProgress],
                    ['Quiz Performance', selected.quizScore],
                    ['Practice IDE', selected.practiceScore]
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className={`mb-1 flex justify-between text-xs font-bold ${secondaryText}`}><span>{label}</span><span>{value}%</span></div>
                      <div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className={`text-[10px] font-black uppercase tracking-wider ${mutedText}`}>Milestones</h4>
                  <div className="mt-2 space-y-2">
                    {['First Lesson', 'First Quiz', 'First Practice IDE'].map(milestone => (
                      <div key={milestone} className={`flex items-center gap-2 text-xs font-bold ${secondaryText}`}>
                        {selected.milestones.includes(milestone) ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <span className="h-4 w-4 rounded-full border border-slate-600" />}
                        {milestone}
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`rounded-xl border p-3 text-xs font-medium leading-5 ${teacherMode ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'}`}>
                  <Activity className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />
                  Strengths: {selected.strengths.join(', ') || 'None recorded'}. Areas to improve: {selected.weaknesses.join(', ') || 'None recorded'}.
                </div>
              </section>
            )}
          </aside>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className={`rounded-2xl border border-dashed p-10 text-center text-sm font-semibold ${panelClass} ${secondaryText}`}>
          No active students are available in the database rankings.
        </div>
      )}
    </div>
  );
}
