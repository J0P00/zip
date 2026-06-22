import React, { useState } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Layers, 
  Check, 
  UploadCloud, 
  BookOpen, 
  HelpCircle, 
  Settings2 
} from 'lucide-react';
import { CurriculumModule, LessonItem } from '../types';

interface AdminCurriculumProps {
  modules: CurriculumModule[];
  lessons: LessonItem[];
  onAddLesson: (lesson: LessonItem) => void;
  onDeleteLesson: (id: string) => void;
  onUpdateModule: (id: string, status: 'Published' | 'Draft' | 'Archived') => void;
}

export default function AdminCurriculum({
  modules,
  lessons,
  onAddLesson,
  onDeleteLesson,
  onUpdateModule
}: AdminCurriculumProps) {
  const [activeTab, setActiveTab] = useState<'modules' | 'lessons'>('modules');
  const [csvText, setCsvText] = useState<string>('');
  const [showCsvImporter, setShowCsvImporter] = useState<boolean>(false);
  
  // Lesson Creation states (Manual)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newModule, setNewModule] = useState<string>(modules[0]?.title || '');
  const [newType, setNewType] = useState<'Video' | 'Lab' | 'Quiz'>('Video');
  const [newDiff, setNewDiff] = useState<string>('Intermediate');

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter a lesson title.');
      return;
    }

    const newItem: LessonItem = {
      id: `li_${Date.now()}`,
      title: newTitle,
      module: newModule,
      type: newType,
      difficulty: newDiff
    };

    onAddLesson(newItem);
    setNewTitle('');
    alert(`✔ Lesson "${newTitle}" registered in active catalog library!`);
  };

  const loadPresetCSV = () => {
    // Inject a valid prefilled string
    setCsvText(`li_csv_1,Generics and Wildcards,Intro to Java & Classes,Lab,Intermediate
li_csv_2,The Decorator Pattern,Design Patterns Core,Video,Advanced
li_csv_3,Abstract Virtual Tables,Polymorphism & Dynamic Binding,Quiz,Advanced`);
  };

  const processCsvImport = () => {
    if (!csvText.trim()) {
      alert('Please paste or load CSV records first.');
      return;
    }

    const rows = csvText.split('\n');
    let importedCount = 0;

    rows.forEach(row => {
      const cols = row.split(',');
      if (cols.length >= 5) {
        onAddLesson({
          id: cols[0].trim(),
          title: cols[1].trim(),
          module: cols[2].trim(),
          type: cols[3].trim() as any,
          difficulty: cols[4].trim()
        });
        importedCount++;
      }
    });

    alert(`🏆 Bulk CSV Import Complete! Appended ${importedCount} clean pedagogical rows directly into active lesson matrices.`);
    setCsvText('');
    setShowCsvImporter(false);
  };

  return (
    <div className="space-y-6" id="curriculum-architecture-manager">
      
      {/* Top Controller Tabs */}
      <div className="flex border-b border-slate-200 justify-between items-center bg-white p-3 rounded-2xl border flex-wrap gap-4" id="admin-curriculum-bar">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('modules')}
            className={`px-4 py-2 font-bold text-xs rounded-xl transition ${activeTab === 'modules' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100 bg-transparent'}`}
          >
            📂 Curriculum Structure ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`px-4 py-2 font-bold text-xs rounded-xl transition ${activeTab === 'lessons' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-650 hover:bg-slate-100 bg-transparent'}`}
          >
            📋 Master Lesson Library ({lessons.length})
          </button>
        </div>

        <button
          id="csv-import-toggle"
          onClick={() => setShowCsvImporter(!showCsvImporter)}
          className="bg-slate-150 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {showCsvImporter ? 'Hide Importer' : 'Bulk CSV Import'}
        </button>
      </div>

      {/* CSV Bulk Importer Section (Toggleable) */}
      {showCsvImporter && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4" id="csv-importer-box">
          <div className="flex justify-between items-start border-b border-slate-850 pb-3 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5"><UploadCloud className="w-5 h-5 text-indigo-400" /> Bulk CSV Curriculum Importer</h3>
              <p className="text-xs text-slate-400">Insert spreadsheet rows formatting columns: ID, Title, Module, Type, Difficulty</p>
            </div>
            <button
              onClick={loadPresetCSV}
              className="text-[10.5px] font-semibold text-indigo-300 border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 rounded hover:bg-indigo-500/20 active:scale-95 transition cursor-pointer"
            >
              🚀 Pre-fill Sample CSV Rows
            </button>
          </div>

          <textarea
            className="w-full h-24 bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed outline-none p-4 rounded-xl border border-slate-850 focus:border-indigo-500"
            placeholder={`id_code,Title name,Module parent catalog,Activity type,Difficulty context...`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCsvImporter(false)}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={processCsvImport}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg active:scale-95 transition cursor-pointer"
            >
              Process Import Map
            </button>
          </div>
        </div>
      )}

      {/* Active Tab View Rendering */}
      {activeTab === 'modules' ? (
        <div className="grid md:grid-cols-2 gap-6" id="curriculum-structure-active">
          
          {modules.map((mod) => (
            <div key={mod.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between" id={`curriculum-mod-${mod.id}`}>
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold font-mono text-indigo-500 uppercase tracking-wide bg-indigo-50 px-2 py-0.5 rounded-md">{mod.category}</span>
                    <h3 className="font-bold text-slate-950 text-base mt-2">{mod.title}</h3>
                  </div>
                  
                  {/* Status Dropdowns selector */}
                  <select
                    className={`text-[10.5px] font-bold px-2 py-1 rounded-lg outline-none border cursor-pointer ${mod.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : mod.status === 'Draft' ? 'bg-amber-50 text-amber-500 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    value={mod.status}
                    onChange={(e) => onUpdateModule(mod.id, e.target.value as any)}
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-medium">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Last Updated</span>
                    <span className="text-slate-800">{mod.lastUpdated}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Included activities</span>
                    <span className="text-slate-800 font-mono font-bold text-indigo-600">{mod.lessonsCount} syllabus items</span>
                  </div>
                </div>
              </div>

              {/* Connected Lesson statistics checklist */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <span className="text-[9.5px] font-mono uppercase font-bold text-slate-400 tracking-wider">Lessons connected in this syllabus module</span>
                <div className="space-y-1.5 font-sans">
                  {lessons.filter(l => l.module === mod.title).slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-1.5 bg-slate-50/50 rounded-lg">
                      <span className="text-slate-700 truncate max-w-[200px]">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono italic">{item.type}</span>
                    </div>
                  ))}
                  {lessons.filter(l => l.module === mod.title).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No lessons connected yet. Create a new lesson below.</p>
                  )}
                </div>
              </div>

            </div>
          ))}

        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6" id="curriculum-lessons-list">
          
          {/* Create Lesson form panel */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full" id="admin-create-lesson">
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-2">
                <span className="text-[9.5px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md uppercase">Add Lesson item</span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">Connect Lessons</h3>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Lesson Title name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Memory Layout of polymorphism maps"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Module parent catalog</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.title}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Activity type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="Video">Video Playlist Lecture</option>
                  <option value="Lab">Hands-on Sandbox Lab</option>
                  <option value="Quiz">Scenario Diagnostic MCQ</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Difficulty context</label>
                <select
                  value={newDiff}
                  onChange={(e) => setNewDiff(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="Beginner">Beginner CS</option>
                  <option value="Intermediate">Intermediate CS</option>
                  <option value="Advanced">Advanced CS</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer shadow-md shadow-indigo-100"
              >
                <Plus className="w-4 h-4" /> Save Curriculum Lesson
              </button>
            </form>
          </div>

          {/* Table list lesson columns */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-150">Active Lesson catalogs</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Title name</th>
                    <th className="py-2.5 px-3">Module Category</th>
                    <th className="py-2.5 px-3">Activity Type</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lessons.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block font-sans">{item.title}</span>
                        <span className="text-[9.5px] font-mono text-slate-400 mt-0.5 block font-medium">Item ID: {item.id}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-600">{item.module}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${item.type === 'Video' ? 'bg-[#3b82f6]/10 text-indigo-700' : item.type === 'Lab' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {item.difficulty}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onDeleteLesson(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer inline-block"
                          title="Delete Lesson Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
