import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  HelpCircle, 
  GitBranch, 
  Trash2, 
  Database,
  Cpu,
  AlertCircle,
  FolderOpen,
  Code
} from 'lucide-react';
import { AdaptiveRule } from '../types';

interface AdminEngineProps {
  rules: AdaptiveRule[];
  onAddRule: (rule: AdaptiveRule) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
}

export default function AdminEngine({
  rules,
  onAddRule,
  onDeleteRule,
  onToggleRule
}: AdminEngineProps) {
  const [newTrigger, setNewTrigger] = useState<string>('Quiz Failed (< 75%)');
  const [newCond, setNewCond] = useState<string>('');
  const [newAction, setNewAction] = useState<string>('');

  // Challenges Blueprint database (Static list)
  const [challenges, setChallenges] = useState([
    { title: 'Abstract Factory Blueprint', topic: 'Design Patterns', diff: 'Advanced', active: true },
    { title: 'Memory Leak Detective', topic: 'Virtual Memory V-Tables', diff: 'Intermediate', active: true },
    { title: 'Interface Segregations', topic: 'Solid Principles', diff: 'Intermediate', active: false },
  ]);
  const [newChalTitle, setNewChalTitle] = useState<string>('');
  const [newChalTopic, setNewChalTopic] = useState<string>('Core OOP');
  const [newChalDiff, setNewChalDiff] = useState<string>('Intermediate');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCond.trim() || !newAction.trim()) {
      alert('Please fill out conditions and resulting actions for the adaptive trigger rules.');
      return;
    }

    const item: AdaptiveRule = {
      id: `r_${Date.now()}`,
      trigger: newTrigger,
      condition: newCond,
      action: newAction,
      isActive: true
    };

    onAddRule(item);
    setNewCond('');
    setNewAction('');
    alert(`✔ Adaptive Rule successfully registered and compiled under Recommendation Engine controllers!`);
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChalTitle.trim()) {
      alert('Please enter a challenge title.');
      return;
    }

    setChallenges(prev => [
      ...prev,
      {
        title: newChalTitle,
        topic: newChalTopic,
        diff: newChalDiff,
        active: true
      }
    ]);
    setNewChalTitle('');
    alert(`✔ Sandbox Challenge "${newChalTitle}" registered in developer challenge catalog blueprint!`);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 text-slate-800" id="recommendations-engine-settings">
      
      {/* Rules parameters lists on the left */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Main active rules list */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md uppercase">SYSTEM ADJUSTMENTS</span>
            <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5"><GitBranch className="w-5 h-5 text-indigo-500" /> Recommendation Loop Engine Config</h2>
            <p className="text-xs text-slate-500 mt-1">Configure regulatory triggers. Triggers observe actions, conditions compute weights, and active pipelines recommend remedial exercises.</p>
          </div>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`p-4 rounded-xl border flex justify-between gap-4 items-start transition-all ${rule.isActive ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-indigo-600 text-white font-bold px-2 py-0.5 rounded uppercase">{rule.trigger}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-medium">ID: {rule.id}</span>
                  </div>
                  
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="text-xs text-slate-500"><strong className="text-slate-800 font-bold text-xs font-sans">Condition check:</strong> {rule.condition}</p>
                    <p className="text-xs text-slate-500"><strong className="text-indigo-600 font-bold text-xs font-sans">Responsive Action:</strong> {rule.action}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 mt-1">
                  
                  {/* Switch Toggle */}
                  <div 
                    onClick={() => onToggleRule(rule.id)}
                    className={`w-10 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors duration-300 ${rule.isActive ? 'bg-indigo-600' : 'bg-slate-350 bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${rule.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>

                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-200 transition cursor-pointer"
                    title="Delete rule blueprint"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create rule form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between" id="engine-rule-creator">
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="border-b border-slate-100 pb-2 mb-2">
              <span className="text-[9.5px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md uppercase">Add Adaptive rule</span>
              <h3 className="font-bold text-slate-900 text-sm mt-1">Setup Adaptive Triggers</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Trigger Events</label>
                <select
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="Quiz Failed (< 75%)">Quiz Failed (&lt; 75%)</option>
                  <option value="Lab Submission Incomplete">Lab Incomplete</option>
                  <option value="Streak Reached > 5 Days">Streak &gt; 5 Days</option>
                  <option value="Submodule Idle Timeout">Syllabus Activity Idle</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Algorithmic Conditions</label>
                <input 
                  type="text" 
                  placeholder="e.g. Failed polymorphic overrides dispatch checklists"
                  value={newCond}
                  onChange={(e) => setNewCond(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Adaptive Recommendations (Resulting Action)</label>
              <input 
                type="text" 
                placeholder="e.g. recommend Lesson 3 video + auto-inject compiler warnings into Vehicle challenge"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
            >
              <Cpu className="w-4 h-4" /> Save Recommendation Trigger
            </button>
          </form>
        </div>

      </div>

      {/* Challenge database lists on the right */}
      <div className="lg:col-span-4 space-y-6" id="engine-challenges-database">
        
        {/* Active challenges panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5"><Database className="w-4.5 h-4.5 text-indigo-500" /> Challenge Blueprints</h3>
            <span className="text-[10px] font-mono font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded">{challenges.length} active</span>
          </div>

          <div className="space-y-3">
            {challenges.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs font-sans">{item.title}</h4>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">{item.topic}</span>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${item.diff === 'Advanced' ? 'bg-[#3b82f6]/10 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>{item.diff}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Blueprint registration form */}
        <div className="bg-white border border-slate-300 rounded-2xl p-5 shadow-sm space-y-4" id="challenge-architect-register">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Register Challenge Blueprint</h3>
            <p className="text-[10px] text-slate-500 mt-1 leading-normal">Setup code templates and checklists for student sandboxes.</p>
          </div>

          <form onSubmit={handleCreateChallenge} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Challenge Name</label>
              <input 
                type="text" 
                placeholder="e.g. Abstract Factory Pattern"
                value={newChalTitle}
                onChange={(e) => setNewChalTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Syllabus Topic</label>
              <input 
                type="text" 
                placeholder="e.g. Design Patterns"
                value={newChalTopic}
                onChange={(e) => setNewChalTopic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              Add Challenge Blueprint
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
