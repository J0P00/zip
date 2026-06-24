import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Lock, 
  BookOpen, 
  Code2, 
  Volume2, 
  Maximize2,
  RotateCcw,
  Check,
  X,
  FileText,
  HelpCircle
} from 'lucide-react';
import { VideoLesson, StudentSubView } from '../types';

interface VideoTutorialsProps {
  lessons: VideoLesson[];
  onNavigateTo: (view: StudentSubView) => void;
  onUpdateVideoProgress: (id: string, progress: number) => void;
}

interface KQOption {
  id: string;
  text: string;
  explanation: string;
}

interface KQuestion {
  id: string;
  question: string;
  options: KQOption[];
  correctOptionId: string;
}

// Global Knowledge Checks database
const KNOWLEDGE_CHECKS: Record<string, KQuestion[]> = {
  'l1': [
    {
      id: 'k1_1',
      question: 'What is an instance of a class called in Object-Oriented Programming?',
      options: [
        { id: 'A', text: 'Object', explanation: 'An object is a concrete instance of a class, which serves as a blueprint.' },
        { id: 'B', text: 'Method', explanation: 'A method is a function associated with a class, not an instance.' },
        { id: 'C', text: 'Constructor', explanation: 'A constructor is a special method used to initialize objects.' },
        { id: 'D', text: 'Interface', explanation: 'An interface is a template specifying behavior, not an instance.' }
      ],
      correctOptionId: 'A'
    }
  ],
  'l2': [
    {
      id: 'k2_1',
      question: 'Which keyword is used in Java to inherit fields and methods from a parent class?',
      options: [
        { id: 'A', text: 'implements', explanation: 'implements is used for interfaces, not class inheritance.' },
        { id: 'B', text: 'extends', explanation: 'The extends keyword establishes class inheritance in Java.' }
      ],
      correctOptionId: 'B'
    }
  ],
  'l3': [
    {
      id: 'k3_1',
      question: 'What determines which overridden method is executed at runtime in Java?',
      options: [
        { id: 'A', text: 'The reference type of the variable', explanation: 'The reference type controls compile-time visibility, not runtime execution.' },
        { id: 'B', text: 'The actual object type stored on the Heap', explanation: 'Java resolves overriding methods dynamically using the runtime object type on the heap.' }
      ],
      correctOptionId: 'B'
    }
  ]
};

const READINGS_DB: Record<string, string> = {
  l1: 'Classes serve as templates or blueprints for creating objects in Java. An object is an instance of a class that holds state in instance fields and behavior in methods. When you construct an object using "new", memory is allocated dynamically on the heap...',
  l2: 'Inheritance enables a subclass to inherit the fields and methods of a parent class using the "extends" keyword. Subclass constructors cascade upwards by calling the parent constructor via "super(args)" as their very first execution line...',
  l3: 'Polymorphism allows a subclass reference to be stored inside a parent type reference. Dynamic dispatch resolves which overridden method executes at runtime based on the actual heap object type, rather than the stack reference type...',
  l4: 'Abstract classes define abstract method contracts that subclasses must fulfill. Interfaces provide full decoupling, acting as strict API boundaries that classes implement. They do not store instance states...',
  l5: 'The JVM implements polymorphism by referencing class v-tables (Virtual Method Tables). V-tables store pointers to overridden method address blocks, enabling high-performance late binding index lookups during dynamic execution...'
};

const EXERCISES_DB: Record<string, string> = {
  l1: 'Construct a simple "Vehicle" class with a brand name field and a constructor that prints brand details.',
  l2: 'Extend "Vehicle" by creating a "Car" subclass. Define a custom constructor that takes brand and doors count, chaining super(brand).',
  l3: 'Override the displayInfo() method inside "Car" to output specific car details instead of generic vehicle details.',
  l4: 'Define an abstract "Deployable" interface with a getDeployStatus() signature and implement it inside "ElectricSedan".',
  l5: 'Debug and compile a Java v-table override lookup structure using heap pointer references.'
};

export default function VideoTutorials({ lessons, onNavigateTo, onUpdateVideoProgress }: VideoTutorialsProps) {
  const [selectedCourse, setSelectedCourse] = useState<'oop' | 'java_lang' | 'swing_ui'>('oop');
  
  // Dynamically derive course lessons (filter out archived ones)
  const courseLessons = useMemo(() => {
    return lessons.filter(l => l.courseId === selectedCourse && !l.isArchived);
  }, [lessons, selectedCourse]);

  const courseMeta = {
    oop: {
      title: 'OOP Fundamentals',
      desc: 'Master classes, inheritance, polymorphism, and memory v-tables.'
    },
    java_lang: {
      title: 'Java Programming',
      desc: 'Dive into syntax, arrays, exception streams, and heap memory.'
    },
    swing_ui: {
      title: 'Java Swing UI',
      desc: 'Construct desktop applications with panels, containers, and listener events.'
    }
  };

  const courseData = useMemo(() => {
    const meta = courseMeta[selectedCourse] || { title: 'Unknown Course', desc: 'No description' };
    return {
      ...meta,
      lessons: courseLessons
    };
  }, [selectedCourse, courseLessons]);

  const [activeLesson, setActiveLesson] = useState<VideoLesson>(
    courseData.lessons[0] || lessons[0]
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [learningSubTab, setLearningSubTab] = useState<'video' | 'reading' | 'exercise'>('video');

  // Video watch states
  const [watchProgress, setWatchProgress] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Simulated playback for YouTube/embed links
  const playbackTimer = useRef<number | null>(null);

  // Knowledge check states
  const [showKnowledgeCheck, setShowKnowledgeCheck] = useState<boolean>(false);
  const [currentKIdx, setCurrentKIdx] = useState<number>(0);
  const [selectedKOption, setSelectedKOption] = useState<string | null>(null);
  const [isKAnswered, setIsKAnswered] = useState<boolean>(false);
  const [kScore, setKScore] = useState<number>(0);
  const [showKResults, setShowKResults] = useState<boolean>(false);

  // Sync active lesson when course updates
  useEffect(() => {
    const defaultLesson = courseData.lessons.find(l => l.status === 'active') || courseData.lessons[0];
    if (defaultLesson) {
      setActiveLesson(defaultLesson);
    }
    setLearningSubTab('video');
    setIsPlaying(false);
  }, [selectedCourse, courseData.lessons]);

  // Load notes & watch progress for active lesson
  useEffect(() => {
    const savedNotes = localStorage.getItem(`notes_${activeLesson.id}`);
    setNotes(savedNotes || '');
    setIsSaved(false);
    
    // Set watch progress from state
    setWatchProgress(activeLesson.progressPercent || 0);

    // Reset knowledge check states
    setShowKnowledgeCheck(false);
    setCurrentKIdx(0);
    setSelectedKOption(null);
    setIsKAnswered(false);
    setKScore(0);
    setShowKResults(false);
    setIsPlaying(false);

    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    };
  }, [activeLesson]);

  // Simulated player ticker for YouTube videos
  useEffect(() => {
    const isYouTube = activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be');
    
    if (isPlaying && isYouTube) {
      playbackTimer.current = window.setInterval(() => {
        setWatchProgress(prev => {
          const next = Math.min(prev + 2.5, 100); // Ticks up 2.5% per second
          onUpdateVideoProgress(activeLesson.id, next);
          
          if (next >= 100) {
            setIsPlaying(false);
            if (playbackTimer.current) {
              clearInterval(playbackTimer.current);
              playbackTimer.current = null;
            }
            handleVideoEnded();
          }
          return next;
        });
      }, 1000);
    } else {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    }

    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    };
  }, [isPlaying, activeLesson]);

  // HTML5 Video progress tracker
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.duration) {
      const percent = Math.round((video.currentTime / video.duration) * 100);
      setWatchProgress(percent);
      onUpdateVideoProgress(activeLesson.id, percent);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    localStorage.setItem(`notes_${activeLesson.id}`, text);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const selectLesson = (lesson: VideoLesson) => {
    if (lesson.status === 'locked') {
      alert(`🔒 Lesson "${lesson.title}" is currently locked! Complete the prerequisite video and assessment or coding IDE task to progress.`);
      return;
    }
    setActiveLesson(lesson);
    setLearningSubTab('video');
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    startKnowledgeCheck();
  };

  const startKnowledgeCheck = () => {
    setShowKnowledgeCheck(true);
    setCurrentKIdx(0);
    setSelectedKOption(null);
    setIsKAnswered(false);
    setKScore(0);
    setShowKResults(false);
  };

  const handleKOptionSelect = (optionId: string) => {
    if (isKAnswered) return;
    setSelectedKOption(optionId);
  };

  const handleKSubmit = () => {
    const activeQuestions = KNOWLEDGE_CHECKS[activeLesson.id] || KNOWLEDGE_CHECKS['l1'];
    const currentQuestion = activeQuestions[currentKIdx];

    if (!selectedKOption) {
      alert('Please select an option to submit your answer.');
      return;
    }

    setIsKAnswered(true);
    if (selectedKOption === currentQuestion.correctOptionId) {
      setKScore(prev => prev + 1);
    }
  };

  const handleKNext = () => {
    const activeQuestions = KNOWLEDGE_CHECKS[activeLesson.id] || KNOWLEDGE_CHECKS['l1'];
    
    if (currentKIdx < activeQuestions.length - 1) {
      setCurrentKIdx(prev => prev + 1);
      setSelectedKOption(null);
      setIsKAnswered(false);
    } else {
      setShowKResults(true);
    }
  };

  const handleKRetry = () => {
    setCurrentKIdx(0);
    setSelectedKOption(null);
    setIsKAnswered(false);
    setKScore(0);
    setShowKResults(false);
  };

  // Clickable scrub bar simulation
  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.round((clickX / width) * 100);

    setWatchProgress(clickPercent);
    onUpdateVideoProgress(activeLesson.id, clickPercent);

    const isYouTube = activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be');
    if (!isYouTube && videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = (clickPercent / 100) * videoRef.current.duration;
    }
  };

  const renderQuizContent = () => {
    const activeQuestions = KNOWLEDGE_CHECKS[activeLesson.id] || KNOWLEDGE_CHECKS['l1'];
    
    if (showKResults) {
      return (
        <div className="flex flex-col justify-between h-full space-y-6 text-slate-800" id="kcheck-results">
          <div className="flex flex-col items-center justify-center flex-grow space-y-4 py-6">
            <div className="w-12 h-12 bg-emerald-55 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900 font-sans">Knowledge Check Completed!</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Lesson: {activeLesson.title}</p>
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              Score: {kScore} / {activeQuestions.length}
            </div>
            <p className="text-xs text-slate-500 text-center max-w-sm font-medium">
              {kScore === activeQuestions.length 
                ? 'Excellent work! You got a perfect score. You are ready for the coding practices.' 
                : 'Nice attempt. Review explanations and try again to master this lesson.'}
            </p>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={handleKRetry}
              className="flex-grow py-3 border border-slate-200 hover:border-slate-350 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Quiz
            </button>
            <button
              onClick={() => setShowKnowledgeCheck(false)}
              className="flex-grow py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer select-none active:scale-95"
            >
              Return to Video
            </button>
          </div>
        </div>
      );
    }

    const currentQuestion = activeQuestions[0]; // fallback index safety
    const selectedOption = currentQuestion.options.find(o => o.id === selectedKOption);

    return (
      <div className="flex flex-col justify-between h-full space-y-5 text-slate-800" id="kcheck-active">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center text-left">
            <div>
              <span className="text-[10px] font-mono tracking-wider bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded uppercase">Lesson Quiz</span>
              <h3 className="text-xs font-extrabold text-slate-900 mt-1">{activeLesson.title}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">Question 1 of 1</span>
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-left">
            {currentQuestion.question}
          </p>

          <div className="space-y-2 text-left">
            {currentQuestion.options.map(opt => {
              const isSelected = selectedKOption === opt.id;
              const isCorrectTarget = opt.id === currentQuestion.correctOptionId;
              let optionStyle = 'border-slate-200 bg-white hover:border-slate-350 cursor-pointer';
              
              if (isSelected) optionStyle = 'border-emerald-600 bg-emerald-50/20';
              if (isKAnswered) {
                if (isSelected) {
                  optionStyle = isCorrectTarget ? 'border-emerald-500 bg-emerald-50/40 select-none' : 'border-orange-500 bg-orange-50/20 select-none';
                } else if (isCorrectTarget) {
                  optionStyle = 'border-emerald-500 bg-emerald-50/20 select-none';
                } else {
                  optionStyle = 'border-slate-100 opacity-50 select-none';
                }
              }

              return (
                <div
                  key={opt.id}
                  onClick={() => handleKOptionSelect(opt.id)}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all text-xs ${optionStyle}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </div>
                  <span className="font-semibold text-slate-700">{opt.text}</span>
                </div>
              );
            })}
          </div>

          {isKAnswered && selectedOption && (
            <div className={`p-3 rounded-xl border text-xs leading-relaxed text-left animate-fade-in ${
              selectedKOption === currentQuestion.correctOptionId ? 'bg-emerald-50/45 border-emerald-200 text-emerald-900' : 'bg-orange-50/45 border-orange-200 text-orange-955'
            }`}>
              <span className="font-bold block mb-0.5">
                {selectedKOption === currentQuestion.correctOptionId ? '✓ Correct Explanation:' : '✗ Explanation:'}
              </span>
              {selectedOption.explanation}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
          <button
            onClick={() => setShowKnowledgeCheck(false)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-605 transition flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Skip Quiz
          </button>

          {!isKAnswered ? (
            <button
              onClick={handleKSubmit}
              disabled={!selectedKOption}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs select-none transition-all active:scale-95 ${
                selectedKOption ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleKNext}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs select-none transition-all active:scale-95 cursor-pointer shadow-md"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    );
  };

  const isYouTube = activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be');

  return (
    <div className="space-y-6" id="videos-tab-workspace">
      
      {/* Dynamic Courses Selector Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b pb-4 border-slate-100 dark:border-slate-900">
        <div className="text-left">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Syllabus Courses catalog</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Select a course to view lessons, read articles, and take diagnostic exercises</p>
        </div>
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'oop', label: 'OOP Fundamentals' },
            { id: 'java_lang', label: 'Java Lang' },
            { id: 'swing_ui', label: 'Swing Desktop UI' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id as any)}
              className={`flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedCourse === c.id 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 text-slate-800" id="videos-workspace">
        {/* Left: Video Player, Readings, Exercises Workspace */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Sub-tabs selection below player */}
          <div className="flex gap-2 border-b border-slate-100 dark:border-slate-900 pb-2.5">
            {[
              { id: 'video', label: '🎥 Video Lecture', icon: <Play className="w-3.5 h-3.5" /> },
              { id: 'reading', label: '📖 Study Article', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'exercise', label: '📝 Practice Guide', icon: <Code2 className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLearningSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  learningSubTab === tab.id
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-200/40'
                    : 'text-slate-500 hover:bg-slate-55 dark:hover:bg-slate-905'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-850 shadow-sm relative" id="video-player-container">
            
            {/* 1. Video Player View */}
            {learningSubTab === 'video' && (
              showKnowledgeCheck ? (
                <div className="p-6 min-h-[380px]" id="knowledge-check-quiz">
                  {renderQuizContent()}
                </div>
              ) : (
                <div className="aspect-video w-full bg-slate-950 flex items-center justify-center relative group">
                  
                  {isYouTube ? (
                    // YouTube Simulated Player layout
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white p-4 text-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg border border-red-500 mb-4 animate-pulse">
                        <Play className="w-8 h-8 fill-white text-white translate-x-0.5" />
                      </div>
                      <h4 className="font-extrabold text-sm max-w-sm truncate">{activeLesson.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                        YouTube video playing in sandbox mode. (Progress tracking simulates duration dynamically).
                      </p>
                      {isPlaying && (
                        <div className="flex items-center gap-1.5 mt-4 text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-bold">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                          Simulated Ticking: {Math.round(watchProgress)}% Watched
                        </div>
                      )}
                    </div>
                  ) : (
                    // Standard MP4 Player
                    <video 
                      key={activeLesson.id}
                      ref={videoRef}
                      className="w-full h-full object-cover opacity-85"
                      src={activeLesson.videoUrl}
                      autoPlay={isPlaying}
                      muted
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleVideoEnded}
                      controls={false}
                    />
                  )}

                  {/* Scrub controls overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end h-24 opacity-90 transition-opacity">
                    <div 
                      className="w-full h-1 bg-slate-600/60 rounded-full mb-3 cursor-pointer overflow-hidden relative"
                      onClick={handleScrubClick}
                      title="Click to jump watch progress"
                    >
                      <div className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${watchProgress}%` }}></div>
                    </div>

                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition cursor-pointer"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white" />}
                        </button>
                        <span className="text-[11px] font-mono font-bold">
                          {Math.round(watchProgress)}% / {activeLesson.duration}
                        </span>
                        <Volume2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] tracking-wider bg-emerald-600 px-2 py-0.5 rounded font-bold font-mono uppercase">1080P HD</span>
                        <Maximize2 className="w-4 h-4 text-slate-400 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 2. Reading Material View */}
            {learningSubTab === 'reading' && (
              <div className="p-6 min-h-[380px] text-left space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" /> 
                  Syllabus Study Reference
                </h3>
                <div className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="font-bold mb-3 font-sans text-slate-900 dark:text-white">Topic: {activeLesson.title}</p>
                  <p className="font-semibold text-slate-600">
                    {READINGS_DB[activeLesson.id] || 'Reading materials for this unit are being prepared by the course advisor. Select OOP Fundamentals lessons for complete study guides.'}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Coding Exercise View */}
            {learningSubTab === 'exercise' && (
              <div className="p-6 min-h-[380px] text-left space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-emerald-600" />
                    Unit Coding Challenge
                  </h3>
                  <div className="p-4 bg-emerald-50/20 border border-emerald-100 dark:border-emerald-950/40 rounded-2xl text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 block mb-1">Challenge Instructions:</span>
                    <p className="font-semibold">
                      {EXERCISES_DB[activeLesson.id] || 'A mini sandbox exercise is being prepared. Select OOP Fundamentals for active coding tasks.'}
                    </p>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => onNavigateTo('ide')} 
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Code2 className="w-4 h-4" /> Open Practice IDE Sandbox
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Footer */}
            {learningSubTab === 'video' && !showKnowledgeCheck && (
              <div className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 text-left">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Lesson Sequence: {activeLesson.sequence}</span>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{activeLesson.title}</h1>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 rounded-lg border border-emerald-100 dark:border-emerald-900/50 font-mono">Topic: {activeLesson.topic || courseData.title}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed font-semibold">
                  {activeLesson.description}
                </p>
                <div className="mt-5 border-t border-slate-100 dark:border-slate-900 pt-5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3">Key Concepts covered</h4>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {activeLesson.concepts.map((concept, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                        <CheckCircle className="w-4 h-4 text-[#10b981] fill-white dark:fill-slate-950 shrink-0" />
                        <span className="font-semibold">{concept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Lesson Queue Playlist */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm text-left">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight mb-4">Course syllabus queue</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {courseData.lessons.map((lesson) => {
                const isSelected = activeLesson.id === lesson.id;
                const isLocked = lesson.status === 'locked';
                const isCompleted = lesson.status === 'completed' || (lesson.progressPercent && lesson.progressPercent >= 90);
                const progressVal = lesson.progressPercent || 0;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-600 bg-emerald-50/15 dark:bg-emerald-950/20' 
                        : isLocked
                          ? 'border-slate-100 dark:border-slate-900 opacity-60'
                          : 'border-slate-205 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex-grow">
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">Lesson 0{lesson.sequence}</span>
                      <h4 className={`text-xs font-extrabold truncate mt-0.5 ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">{lesson.duration} mins</span>
                        {progressVal > 0 && progressVal < 90 && (
                          <span className="text-[9.5px] text-indigo-650 bg-indigo-50 px-1 rounded font-bold font-mono">
                            {progressVal}% watched
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 fill-white dark:fill-slate-950" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4 text-slate-400" />
                      ) : (
                        <div className={`w-4 h-4 rounded-full border ${isSelected ? 'border-emerald-600' : 'border-slate-300'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
              {courseData.lessons.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No video lessons assigned to this course category.</p>
              )}
            </div>
          </div>

          {/* study note pad */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl shadow-sm text-left">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Study Pad Notes</h3>
              {isSaved && <span className="text-[10px] text-emerald-600 font-bold font-mono uppercase">Saved</span>}
            </div>
            <textarea
              placeholder="Write down class constructor overrides or runtime dispatch table lookup observations..."
              value={notes}
              onChange={handleNotesChange}
              className="w-full h-32 p-3 text-xs outline-none border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 rounded-xl resize-none leading-relaxed text-slate-700 dark:text-slate-355 focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
