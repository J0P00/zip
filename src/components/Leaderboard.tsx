import React, { useState } from 'react';
import {
  Activity,
  Minus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy
} from 'lucide-react';
import { LeaderboardUser } from '../types';

interface LeaderboardProps {
  users: LeaderboardUser[];
}

export default function Leaderboard({ users }: LeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(
    users.find(u => u.isCurrentUser) || users[0]
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settle Top 3 podium nodes
  const top1 = users.find(u => u.rank === 1);
  const top2 = users.find(u => u.rank === 2);
  const top3 = users.find(u => u.rank === 3);

  // Filter remaining list
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedFirstName = selectedUser?.name.replace(/\s+\(You\)$/, '').split(/\s+/)[0] || 'This student';
  const getProgress = (user: LeaderboardUser) => user.progress ?? user.points ?? 0;
  const getStatus = (user: LeaderboardUser) => user.status || (getProgress(user) >= 70 ? 'Passed' : 'In Progress');
  const renderAvatar = (user: LeaderboardUser, className: string) => {
    if (user.avatar) {
      return <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" className={className} />;
    }

    const initial = user.name.replace(/\s+\(You\)$/, '').trim().charAt(0) || 'S';
    return (
      <div className={`${className} flex items-center justify-center bg-emerald-600 font-black uppercase text-white`}>
        {initial}
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 text-slate-800" id="leaderboard-workspace">
      
      {/* Top podium list & Table rankings */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Visual Podium Section */}
        <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl relative overflow-hidden" id="leaderboard-podium">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15)_0%,rgba(15,23,42,0)_60%)] pointer-events-none"></div>
          
          <div className="text-center max-w-md mx-auto mb-6 space-y-1">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-indigo-400">Student Standings</span>
            <h2 className="text-xl font-bold font-sans">OOP Course Hall of Fame</h2>
            <p className="text-xs text-slate-400">Students enrolled in the active OOP subject</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 items-end max-w-lg mx-auto min-h-[170px]" id="podium-cols">
            
            {/* #2 Silver Pod */}
            {top2 && (
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setSelectedUser(top2)}
              >
                <div className="relative">
                  <img 
                    src={top2.avatar} 
                    alt={top2.name} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-300 object-cover group-hover:scale-105 transition shadow-lg" 
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-slate-300 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center font-mono">2</span>
                </div>
                <div className="text-center mt-3 w-full bg-slate-800/60 p-2 rounded-t-xl border-t border-slate-700">
                  <span className="font-bold text-slate-200 text-xs truncate block">{top2.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold block mt-0.5">{getProgress(top2)}% progress</span>
                </div>
              </div>
            )}

            {/* #1 Gold Pod */}
            {top1 && (
              <div 
                className="flex flex-col items-center cursor-pointer group -translate-y-4"
                onClick={() => setSelectedUser(top1)}
              >
                <div className="relative">
                  <div className="absolute -top-6 -left-1 text-amber-400 animate-pulse"><Trophy className="w-5 h-5 fill-amber-400 text-amber-400 rotate-12" /></div>
                  <img 
                    src={top1.avatar} 
                    alt={top1.name} 
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-400 object-cover group-hover:scale-105 transition shadow-2xl shadow-indigo-500/20" 
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-amber-450 bg-amber-400 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center font-mono shadow-md">1</span>
                </div>
                <div className="text-center mt-3 w-full bg-slate-850 p-2.5 rounded-t-xl border-t-2 border-amber-400 shadow-md">
                  <span className="font-bold text-amber-300 text-xs sm:text-sm truncate block">{top1.name}</span>
                  <span className="text-[10.5px] text-amber-250 font-mono font-bold block mt-0.5">{getProgress(top1)}% progress</span>
                </div>
              </div>
            )}

            {/* #3 Bronze Pod */}
            {top3 && (
              <div 
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => setSelectedUser(top3)}
              >
                <div className="relative">
                  <img 
                    src={top3.avatar} 
                    alt={top3.name} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-600 object-cover group-hover:scale-105 transition shadow-lg" 
                  />
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono">3</span>
                </div>
                <div className="text-center mt-3 w-full bg-slate-800/60 p-2 rounded-t-xl border-t border-slate-700">
                  <span className="font-bold text-slate-200 text-xs truncate block">{top3.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold block mt-0.5">{getProgress(top3)}% progress</span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Global tabulations matrix lists */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-4 justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">OOP Subject Rankings</h3>
              <p className="text-xs text-slate-500">Search enrolled OOP students or click rows to examine progress</p>
            </div>
            
            {/* Search Input bar */}
            <div className="relative w-48 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 outline-none rounded-lg text-slate-600 text-xs focus:bg-white focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Matrix table representation */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">OOP Progress</th>
                  <th className="py-3 px-4">Quiz</th>
                  <th className="py-3 px-4">Practice IDE</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((item) => {
                  const isUser = item.isCurrentUser;
                  const isSelected = selectedUser?.name === item.name;

                  return (
                    <tr 
                      key={item.rank}
                      onClick={() => setSelectedUser(item)}
                      className={`cursor-pointer transition-all ${isUser ? 'bg-indigo-50/40 hover:bg-indigo-50' : isSelected ? 'bg-slate-100/80' : 'bg-white hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-4 py-3.5">
                        <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold ${item.rank <= 3 ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 bg-slate-100'}`}>
                          {item.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={item.avatar} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
                          />
                          <div>
                            <span className={`font-bold block text-slate-850 ${isUser && 'text-indigo-900'}`}>{item.name}</span>
                            {isUser && <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Current User</span>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {getProgress(item)}%
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.quizScore ?? 0}%
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.practiceScore ?? 0}%
                      </td>

                      <td className="py-3 px-4">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                          getProgress(item) >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {getStatus(item)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right pr-6 shrink-0">
                        <span className="inline-block">
                          {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-[#10b981]" />}
                          {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
                          {item.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Floating detail student profiling sidebar card */}
      <div className="lg:col-span-4" id="leaderboard-profile-panel">
        
        {selectedUser ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6 flex flex-col justify-between h-full">
            
            <div className="space-y-6">
              
              {/* Profile banner metadata */}
              <div className="text-center border-b border-slate-100 pb-4 space-y-3">
                <div className="relative inline-block">
                  <img 
                    src={selectedUser.avatar} 
                    alt={selectedUser.name} 
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-full mx-auto border-2 border-indigo-100 object-cover" 
                  />
                  {selectedUser.rank <= 3 && (
                    <span className="absolute bottom-0 right-1 w-6 h-6 bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold rounded-full flex items-center justify-center">🏆</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-base">{selectedUser.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono mt-0.5">OOP Subject Rank #{selectedUser.rank}</span>
                </div>
              </div>

              {/* Stats dashboard details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono tracking-wide">OOP Progress</span>
                  <div className="text-sm font-extrabold text-[#059669] font-mono leading-tight">{getProgress(selectedUser)}%</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono tracking-wide">Practice IDE</span>
                  <div className="text-sm font-extrabold text-amber-600 font-mono leading-tight">{selectedUser.practiceScore ?? 0}%</div>
                </div>
              </div>

              {/* Achievements collection */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">OOP Milestones</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedUser.badges.length ? selectedUser.badges : [getStatus(selectedUser)]).map((badge, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-semibold"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500 fill-indigo-100" /> {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* Academic activity milestones list */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#475569] font-mono">Realtime OOP Progress</h4>
                
                <div className="space-y-2.5 font-sans">
                  {[
                    { label: 'Inheritance Constraints with Base classes', time: 'Completed', success: true },
                    { label: 'Polymorphic Dynamic binding dispatch Quiz', time: 'Completed', success: true },
                    { label: 'Abstract Factories Advanced pattern exercise', time: 'In Progress', success: false },
                  ].map((act, id) => (
                    <div key={id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[190px]">{act.label}</span>
                      <span className={`text-[10.5px] font-mono font-bold shrink-0 ${act.success ? 'text-[#10b981] bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded animate-pulse'}`}>{act.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Side summary footer */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-100 flex gap-2.5 items-start mt-6 text-left">
              <Activity className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[11px] font-bold text-indigo-900">OOP Progress Monitor</h4>
                <p className="text-[10.5px] text-indigo-700/80 leading-normal mt-0.5">
                  {selectedFirstName} is ranked from enrolled-subject progress across video completion, assessment scores, and Practice IDE submissions.
                </p>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs italic py-20 shadow-sm col-span-4">
            <p>Select any student from the global rankings table to examine logs, activity histories, and milestone badges.</p>
          </div>
        )}

      </div>

    </div>
  );
}
