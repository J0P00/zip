import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Minus, Search, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { AuthenticatedUser, RankingEntry } from '../types';
import { rankingApi } from '../services/api';

interface LeaderboardProps {
  currentUser?: AuthenticatedUser | null;
}

const currentUserKey = (user?: AuthenticatedUser | null) => user?.id || user?.userId || user?.email || '';

const formatActivity = (value?: string) => {
  if (!value) return 'No activity recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recent activity' : `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

const movementText = (entry: RankingEntry) => {
  if (entry.movement === 'new') return 'NEW';
  if (entry.movement === 'stable') return '-';
  return `${entry.movement === 'up' ? '+' : '-'}${entry.movementAmount}`;
};

export default function Leaderboard({ currentUser }: LeaderboardProps) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const viewerId = currentUserKey(currentUser);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await rankingApi.list(currentUser?.token);
        if (cancelled) return;
        setEntries(response.data);
        setError('');
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Rankings are temporarily unavailable.');
      } finally {
        if (!cancelled) setIsLoading(false);
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
    const currentEntry = entries.find(entry => entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase());
    setSelectedStudentId(previous => entries.some(entry => entry.studentId === previous) ? previous : currentEntry?.studentId || entries[0].studentId);
  }, [entries, viewerId]);

  const selectedStudent = entries.find(entry => entry.studentId === selectedStudentId) || entries[0];
  const currentStudent = entries.find(entry => entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase());
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? entries.filter(entry => entry.name.toLowerCase().includes(query) || entry.email.toLowerCase().includes(query)) : entries;
  }, [entries, searchQuery]);

  const renderMovement = (entry: RankingEntry) => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black ${entry.movement === 'up' ? 'text-emerald-600' : entry.movement === 'down' ? 'text-rose-600' : 'text-slate-400'}`}>
      {entry.movement === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
      {entry.movement === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
      {entry.movement === 'stable' && <Minus className="h-3.5 w-3.5" />}
      {movementText(entry)}
    </span>
  );

  const renderAvatar = (entry: RankingEntry, size = 'h-9 w-9') => entry.avatar
    ? <img src={entry.avatar} alt="" className={`${size} rounded-full object-cover`} />
    : <div className={`${size} flex items-center justify-center rounded-full bg-emerald-600 font-black uppercase text-white`}>{entry.name.charAt(0)}</div>;

  return (
    <div className="space-y-5" id="leaderboard-workspace">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Academic Performance Index</span>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">OOP Student Rankings</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Rankings combine OOP progress, quiz performance, and Practice IDE results. Data refreshes automatically from the database.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[10px] font-black uppercase text-emerald-700"><Activity className="h-3.5 w-3.5" /> Live from database</div>
        </div>
      </section>

      {currentStudent && <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Your Rank</span><strong className="mt-1 block text-3xl font-black">#{currentStudent.rank}</strong><span className="text-xs font-semibold text-slate-400">of {entries.length} students</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Learning Score</span><strong className="mt-1 block text-2xl font-black text-emerald-700">{currentStudent.learningScore}%</strong><span className="text-xs font-semibold text-slate-500">{currentStudent.movement === 'new' ? 'Newly ranked' : `${currentStudent.movement === 'up' ? '↑' : currentStudent.movement === 'down' ? '↓' : '-'} ${currentStudent.movementAmount || ''}`}</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">OOP Progress</span><strong className="mt-1 block text-2xl font-black text-slate-900">{currentStudent.oopProgress}%</strong><span className="text-xs font-semibold text-slate-500">{currentStudent.completedLessons}/{currentStudent.totalLessons} lessons</span></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="text-[10px] font-black uppercase text-slate-400">Quiz / Practice</span><strong className="mt-1 block text-2xl font-black text-slate-900">{currentStudent.quizScore}% / {currentStudent.practiceScore}%</strong><span className="text-xs font-semibold text-slate-500">Assessment and coding performance</span></div>
      </section>}

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
      {isLoading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">Loading database rankings...</div>}

      {!isLoading && !error && entries.length > 0 && <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">Top performers</span><h3 className="mt-1 text-lg font-black">Why they lead</h3></div><span className="text-[10px] font-bold text-slate-400">Weighted Learning Score</span></div>
            <div className="grid gap-3 md:grid-cols-3">{entries.slice(0, 3).map(entry => <button type="button" key={entry.studentId} onClick={() => setSelectedStudentId(entry.studentId)} className={`rounded-xl border p-4 text-left transition ${selectedStudentId === entry.studentId ? 'border-emerald-400 bg-emerald-950/50' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}><div className="flex items-center justify-between"><span className="text-2xl font-black text-emerald-300">#{entry.rank}</span>{renderMovement(entry)}</div><div className="mt-3 flex items-center gap-2">{renderAvatar(entry)}<span className="truncate text-sm font-black">{entry.name}</span></div><strong className="mt-4 block text-2xl font-black">{entry.learningScore}%</strong><div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-400"><span>OOP {entry.oopProgress}%</span><span>Quiz {entry.quizScore}%</span><span>IDE {entry.practiceScore}%</span></div></button>)}</div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 className="text-sm font-black text-slate-950">Ranking table</h3><p className="mt-1 text-xs font-semibold text-slate-500">Select a student to inspect their learning profile.</p></div><div className="relative w-52"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search students" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-emerald-500" /></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">OOP</th><th className="px-4 py-3">Quiz</th><th className="px-4 py-3">Practice IDE</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Movement</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredEntries.map(entry => { const isYou = entry.studentId === viewerId || entry.email.toLowerCase() === viewerId.toLowerCase(); return <tr key={entry.studentId} onClick={() => setSelectedStudentId(entry.studentId)} className={`cursor-pointer transition ${isYou ? 'bg-emerald-50/70' : selectedStudentId === entry.studentId ? 'bg-slate-50' : 'hover:bg-slate-50'}`}><td className="px-4 py-3 font-black text-slate-700">#{entry.rank}</td><td className="px-4 py-3"><div className="flex items-center gap-2">{renderAvatar(entry, 'h-8 w-8')}<div><span className="block font-black text-slate-900">{entry.name}{isYou && <span className="ml-1 text-emerald-600">(You)</span>}</span><span className="text-[10px] font-semibold text-slate-400">{entry.email}</span></div></div></td><td className="px-4 py-3 font-black text-emerald-700">{entry.learningScore}%</td><td className="px-4 py-3 font-bold text-slate-600">{entry.oopProgress}%</td><td className="px-4 py-3 font-bold text-slate-600">{entry.quizScore}%</td><td className="px-4 py-3 font-bold text-slate-600">{entry.practiceScore}%</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${entry.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{entry.status}</span></td><td className="px-4 py-3">{renderMovement(entry)}</td></tr>; })}</tbody></table></div>
          </section>
        </div>

        <aside className="lg:col-span-4">{selectedStudent && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3">{renderAvatar(selectedStudent, 'h-14 w-14')}<div><h3 className="text-base font-black text-slate-950">{selectedStudent.name}</h3>{(selectedStudent.studentId === viewerId || selectedStudent.email.toLowerCase() === viewerId.toLowerCase()) && <span className="text-[10px] font-black uppercase text-emerald-600">You</span>}<p className="mt-1 text-xs font-semibold text-slate-500">{formatActivity(selectedStudent.recentActivity)}</p></div></div><UserRound className="h-5 w-5 text-slate-300" /></div><div><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Student Performance</span><div className="mt-1 flex items-end justify-between"><strong className="text-3xl font-black text-slate-950">#{selectedStudent.rank}</strong><span className="text-xs font-bold text-slate-500">of {entries.length}</span></div><div className="mt-1">{renderMovement(selectedStudent)}</div></div><div className="rounded-xl bg-emerald-50 p-4"><span className="text-[10px] font-black uppercase text-emerald-700">Learning Score</span><strong className="mt-1 block text-3xl font-black text-emerald-800">{selectedStudent.learningScore}%</strong><p className="mt-1 text-[10px] font-semibold text-emerald-700">40% OOP progress + 30% quiz + 30% Practice IDE</p></div><div className="space-y-3">{[['OOP Progress', selectedStudent.oopProgress], ['Quiz Performance', selectedStudent.quizScore], ['Practice IDE', selectedStudent.practiceScore]].map(([label, value]) => <div key={label as string}><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{label}</span><span>{value}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} /></div></div>)}</div><div><h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Milestones</h4><div className="mt-2 space-y-2">{['First Lesson', 'First Quiz', 'First Practice IDE'].map(milestone => <div key={milestone} className="flex items-center gap-2 text-xs font-bold text-slate-600">{selectedStudent.milestones.includes(milestone) ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}{milestone}</div>)}</div></div><div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600"><Activity className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />{selectedStudent.status}. {selectedStudent.completedLessons} of {selectedStudent.totalLessons} lessons completed.</div></section>}</aside>
      </div>}
      {!isLoading && !error && entries.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-semibold text-slate-500">No active students are available in the database rankings.</div>}
    </div>
  );
}
