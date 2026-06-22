import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  Send, 
  RotateCcw, 
  Terminal, 
  Sparkles, 
  Lightbulb, 
  CheckSquare, 
  HelpCircle 
} from 'lucide-react';
import { CodeFile } from '../types';

interface PracticeIDEProps {
  initialFiles: Record<string, string>;
  onSubmitCompleted: (code: string) => void;
}

export default function PracticeIDE({ initialFiles, onSubmitCompleted }: PracticeIDEProps) {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles);
  const [activeFile, setActiveFile] = useState<string>('src/main/java/Car.java');
  const [editorText, setEditorText] = useState<string>(initialFiles['src/main/java/Car.java'] || '');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Custom directory state
  const [isFolderOpen, setIsFolderOpen] = useState({
    src: true,
    main: true,
    java: true
  });

  // Track editor edits and sync with file system dictionary
  useEffect(() => {
    setEditorText(files[activeFile] || '');
  }, [activeFile, files]);

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorText(val);
    setFiles(prev => ({
      ...prev,
      [activeFile]: val
    }));
  };

  const handleFileClick = (path: string) => {
    setActiveFile(path);
  };

  const resetCode = () => {
    if (window.confirm('Reset changes to initial exercise code?')) {
      setFiles(initialFiles);
      setEditorText(initialFiles[activeFile] || '');
      setConsoleLogs(['Console cleared.', 'Click "Run Code" to compile and execute program.']);
      setTestSuccess(false);
    }
  };

  // Compiler Simulator Engine
  const runCodeCompileSimulation = () => {
    setIsRunning(true);
    setConsoleLogs([
      '➜ javac -d bin src/main/java/Vehicle.java src/main/java/Car.java src/main/java/Main.java',
      'Compiling files...'
    ]);

    setTimeout(() => {
      // Analyze current Car.java code to verify if the student completed the inheritance exercises correctly
      const carCode = files['src/main/java/Car.java'] || '';
      
      const containsSuperCall = carCode.includes('super(') && carCode.includes('super(brand);');
      const containsOverride = carCode.includes('displayInfo') && carCode.includes('@Override');
      const printsDoors = carCode.includes('doors') && (carCode.includes('System.out.println') || carCode.includes('System.out.print'));

      if (!containsSuperCall) {
        setConsoleLogs(prev => [
          ...prev,
          'src/main/java/Car.java:3: error: constructor Vehicle in class Vehicle cannot be applied to given types; \n    public Car(String brand, int doors) {\n                                        ^\n  required: java.lang.String\n  found: no arguments\n  reason: actual and formal argument lists differ in length. Subclasses must explicitly invoke the parent constructor using super(brand)!\n1 error',
          '❌ COMPILATION FAILED.'
        ]);
        setTestSuccess(false);
        setIsRunning(false);
        return;
      }

      if (!containsOverride) {
        setConsoleLogs(prev => [
          ...prev,
          'Compiling success.',
          '➜ java Main',
          '--- Booting OOP Vehicle Fleet Simulator ---',
          'Vehicle brand: Generic Hovercraft, speed: 40 km/h',
          '\n--- testing Customized Subclass Polymorphism ---',
          'Vehicle brand: Tesla Model S, speed: 110 km/h',
          '\n⚠️ WARNING: Car class compiled successfully, but you have not overridden displayInfo() to expose door parameters!',
          'Hint: Write an @Override method for displayInfo() to finalize the layout checklist.',
          '❌ CHALLENGE VERIFICATION FAILED.'
        ]);
        setTestSuccess(false);
        setIsRunning(false);
        return;
      }

      if (!printsDoors) {
        setConsoleLogs(prev => [
          ...prev,
          'Compiling success.',
          '➜ java Main',
          '--- Booting OOP Vehicle Fleet Simulator ---',
          'Vehicle brand: Generic Hovercraft, speed: 40 km/h',
          '\n--- testing Customized Subclass Polymorphism ---',
          'Car: Tesla Model S, speed: 110 km/h',
          '\n⚠️ WARNING: Your Overridden displayInfo() is called, but it does not print the private int "doors" parameter!',
          '❌ CHALLENGE VERIFICATION FAILED.'
        ]);
        setTestSuccess(false);
        setIsRunning(false);
        return;
      }

      // If they passed all regex checkpoints perfectly!
      setConsoleLogs(prev => [
        ...prev,
        'Compiling success.',
        '➜ java Main',
        '------------------------------------------------',
        '--- Booting OOP Vehicle Fleet Simulator ---',
        'Vehicle brand: Generic Hovercraft, speed: 40 km/h',
        '\n--- Testing Subclass Polymorphism ---',
        'Car: Tesla Model S, speed: 110 km/h, doors: 4',
        '------------------------------------------------',
        '✔ COMPILER CODE EVALUATION PASSED!',
        '✔ Sub-Constructors bind successfully.',
        '✔ Polymorphic overriden displays resolved correctly in dynamic heap.',
        '🏆 All JUnit verification tests green! ready to submit challenge.'
      ]);
      setTestSuccess(true);
      setIsRunning(false);
    }, 1100);
  };

  const submitToInstructor = () => {
    if (!testSuccess) {
      alert('Please run compile and pass all automated verification checks before submitting the challenge.');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitCompleted(files['src/main/java/Car.java']);
      setIsSubmitting(false);
      alert('🏆 Submission Successful! Your code has been uploaded to Dr. Elena Vance\'s Review Queue. Your score was updated (+150 XP). Check your Student Dashboard for reviews!');
    }, 1000);
  };

  // Helper code lines count representation
  const linesCount = editorText.split('\n').length;

  return (
    <div className="grid lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] min-h-[600px] text-slate-800" id="ide-workspace">
      
      {/* File Tree Panel & Center editor */}
      <div className="lg:col-span-8 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-full">
        
        {/* Workspace core navigation layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* File explorer panel */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-4 font-mono select-none overflow-y-auto flex-shrink-0" id="ide-explorer">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans block mb-3">Project Explorer</span>
            
            {/* Folder rows */}
            <div className="space-y-1.5 text-xs">
              <div 
                className="flex items-center gap-1 text-slate-600 cursor-pointer hover:text-indigo-600 select-none"
                onClick={() => setIsFolderOpen(prev => ({ ...prev, src: !prev.src }))}
              >
                {isFolderOpen.src ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                <Folder className="w-4 h-4 text-slate-400 fill-slate-200 shrink-0" />
                <span>src</span>
              </div>

              {isFolderOpen.src && (
                <div className="pl-4 space-y-1.5 border-l border-slate-200 ml-1.5">
                  <div 
                    className="flex items-center gap-1 text-slate-600 cursor-pointer hover:text-indigo-600"
                    onClick={() => setIsFolderOpen(prev => ({ ...prev, main: !prev.main }))}
                  >
                    {isFolderOpen.main ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <Folder className="w-4 h-4 text-slate-400 fill-slate-200 shrink-0" />
                    <span>main</span>
                  </div>

                  {isFolderOpen.main && (
                    <div className="pl-4 space-y-1.5 border-l border-slate-200 ml-1.5">
                      <div 
                        className="flex items-center gap-1 text-slate-600 cursor-pointer hover:text-indigo-600"
                        onClick={() => setIsFolderOpen(prev => ({ ...prev, java: !prev.java }))}
                      >
                        {isFolderOpen.java ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        <Folder className="w-4 h-4 text-slate-400 fill-slate-200 shrink-0" />
                        <span>java</span>
                      </div>

                      {isFolderOpen.java && (
                        <div className="pl-4 space-y-1 ml-1.5">
                          {[
                            { name: 'Vehicle.java', path: 'src/main/java/Vehicle.java' },
                            { name: 'Car.java', path: 'src/main/java/Car.java' },
                            { name: 'Main.java', path: 'src/main/java/Main.java' },
                          ].map((item, index) => (
                            <div 
                              key={index}
                              onClick={() => handleFileClick(item.path)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition ${activeFile === item.path ? 'bg-indigo-100/60 text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                            >
                              <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Central text code editor */}
          <div className="flex-1 flex flex-col bg-[#1e293b] text-slate-100 overflow-hidden" id="ide-editor-container">
            <div className="bg-[#0f172a] px-4 py-2 flex items-center justify-between border-b border-[#0f172a]/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-slate-300">{activeFile.split('/').pop()}</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Java Sandbox</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={resetCode}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition"
                  title="Reset exercises file parameters"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Code
                </button>
              </div>
            </div>

            {/* Editable panel element */}
            <div className="flex-grow flex font-mono text-xs overflow-auto relative p-2">
              {/* Line gutter numbers */}
              <div className="w-8 flex-shrink-0 text-right pr-2 select-none border-r border-[#334155]/40 text-[#475569] font-medium mr-2">
                {Array.from({ length: linesCount }).map((_, idx) => (
                  <div key={idx} className="h-5 leading-5">{idx + 1}</div>
                ))}
              </div>

              {/* Text editor block */}
              <textarea
                id="ide-textarea"
                className="flex-grow h-full bg-transparent outline-none border-none resize-none font-mono text-[12px] leading-5 text-indigo-200 selection:bg-indigo-600/40 selection:text-white max-w-full focus:ring-0 focus:border-transparent whitespace-pre"
                value={editorText}
                onChange={handleEditorChange}
                spellCheck="false"
              />
            </div>
          </div>

        </div>

        {/* Compiling Terminal console */}
        <div className="h-44 bg-[#090d16] text-[#94a3b8] font-mono text-xs flex flex-col border-t border-[#1e293b] flex-shrink-0" id="ide-console">
          <div className="bg-[#0f172a] px-4 py-1.5 flex items-center justify-between border-b border-[#1e293b]/50 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#64748b] flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> Output Console</span>
            <span className="text-[9px] text-[#475569]">JDK v21.0.2 compiler</span>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-1 block text-left" id="ide-console-logs">
            {consoleLogs.length === 0 ? (
              <p className="text-slate-500 italic">Console initialized. Edit class options in the tabs above and click "Run Code" in the challenge sidebar to evaluate.</p>
            ) : (
              consoleLogs.map((log, i) => (
                <pre key={i} className={`whitespace-pre-wrap ${log.includes('error') || log.includes('FAILED') ? 'text-rose-400' : log.includes('PASSED') || log.includes('🏆') || log.includes('✔') ? 'text-emerald-400' : log.includes('➜') ? 'text-indigo-400' : 'text-slate-300'}`}>{log}</pre>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Challenge Instruction Panel */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto h-full" id="ide-challenge-sidebar">
        
        <div className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">Active Sandbox</span>
            <h2 className="text-base font-bold text-slate-900 mt-1">Challenge: Inheritance Mastery</h2>
            <p className="text-xs text-slate-500 mt-1">Deconstruct class relationships by modeling and compiling active subclass blueprints.</p>
          </div>

          {/* Checklist boxes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Exercise Checkpoints</h3>
            
            <div className="space-y-2.5">
              {[
                { label: 'Inherit Car from base class Vehicle in Car.java (extends keyword)', sub: 'Code must establish Car subclassing structure.' },
                { label: 'Write subclass contractor accepting brand & doors', sub: 'Pass brand parameter upstream via super(brand).' },
                { label: 'Override displayInfo() method to detail vehicle parameters', sub: 'Construct print command printing speed & doors count.' }
              ].map((task, i) => {
                // Approximate dynamic determination based on code
                const carCode = files['src/main/java/Car.java'] || '';
                let checked = false;
                if (i === 0) checked = carCode.includes('extends Vehicle');
                if (i === 1) checked = carCode.includes('super(') && carCode.includes('super(brand);');
                if (i === 2) checked = carCode.includes('displayInfo') && carCode.includes('@Override') && carCode.includes('doors');

                return (
                  <div key={i} className="flex gap-2.5 items-start p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <input 
                      type="checkbox" 
                      checked={checked} 
                      disabled 
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-not-allowed" 
                    />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{task.label}</h4>
                      <p className="text-[10.5px] text-slate-400 font-medium leading-normal mt-0.5">{task.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick tips display */}
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-2.5 items-start">
            <Lightbulb className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-900">Pro-Tip Card</h4>
              <p className="text-[11px] text-indigo-700/80 leading-normal mt-0.5">
                Always include the <code>@Override</code> annotation above overridden subclasses. It forces the Java compiler to assert that the parent classes actually define matching function profiles, catching typing typos before runtime errors occur!
              </p>
            </div>
          </div>
        </div>

        {/* Action Triggers Footer */}
        <div className="border-t border-slate-200 pt-4 mt-6 space-y-3">
          <div className="flex gap-3">
            <button
              id="ide-run-btn"
              onClick={runCodeCompileSimulation}
              disabled={isRunning || isSubmitting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> {isRunning ? 'Compiling...' : 'Run Code'}
            </button>
            <button
              id="ide-submit-btn"
              onClick={submitToInstructor}
              disabled={!testSuccess || isSubmitting || isRunning}
              className={`flex-1 font-bold text-xs px-4 py-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${testSuccess ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
            >
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? 'Uploading...' : 'Submit Lab'}
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block text-center">
            {testSuccess ? '🏆 Code checks passed! Click Submit to receive grades.' : '⚡ Compiling errors will assist your debugging efforts.'}
          </span>
        </div>

      </div>

    </div>
  );
}
