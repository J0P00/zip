import React, { useState } from 'react';
import {
  BookOpen,
  PanelTop,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Award,
  Video
} from 'lucide-react';
import {
  AuthenticatedUser,
  PracticeSubmission,
  StudentSubView,
  VideoLesson
} from '../types';
import type { StudentResultsData } from '../services/interpretation';
import VideoTutorials from './VideoTutorials';
import JavaSwingModule from './JavaSwingModule';

interface LessonsPageProps {
  currentUser: AuthenticatedUser;
  lessons: VideoLesson[];
  onNavigateTo: (view: StudentSubView) => void;
  onUpdateVideoProgress: (id: string, progress: number) => void;
  studentResults?: StudentResultsData | null;
  onSubmitCompleted?: (submission: PracticeSubmission) => void;
  onUnlocked?: () => void;
  initialTab?: 'oop' | 'swing';
  theme?: 'light' | 'dark';
}

export default function LessonsPage({
  currentUser,
  lessons,
  onNavigateTo,
  onUpdateVideoProgress,
  studentResults = null,
  onSubmitCompleted = () => {},
  onUnlocked,
  initialTab = 'oop',
  theme = 'light'
}: LessonsPageProps) {
  const isDark = theme === 'dark';
  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';

  const [activeModule, setActiveModule] = useState<'oop' | 'swing'>(initialTab);

  // Stats calculation
  const totalLessonsCount = 17;
  const oopCount = 12;
  const swingCount = 5;

  const oopCompletedCount = (studentResults?.oopTopics || []).filter(t => t.lessonCompleted).length;
  const swingUnlocked = Boolean(studentResults?.swingUnlocked ?? (oopCompletedCount >= oopCount));
  const swingCompletedCount = Math.min(
    swingCount,
    (studentResults?.swingTopics || []).filter(t => t.lessonCompleted).length
  );

  const totalCompleted = studentResults?.completedLessons ?? (oopCompletedCount + swingCompletedCount);
  const overallCurriculumPct = studentResults?.overallProgress ?? Math.round((totalCompleted / totalLessonsCount) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto py-6 px-4" id="lessons-hub-container">
      {/* 17-Lesson Curriculum Header Banner */}
      <div className={`rounded-3xl border p-6 sm:p-7 shadow-xs ${cardClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BookOpen className="h-3.5 w-3.5 inline mr-1" />
                Comprehensive Curriculum
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-slate-500">
                All 17 Lessons
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Curriculum Lessons
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Master the full 17-lesson sequence: 12 fundamental Java Object-Oriented Programming topics followed by 5 interactive Java Swing GUI modules.
            </p>
          </div>

          {/* Quick Curriculum Progress Pill */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 shrink-0 sm:min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="font-bold text-slate-500 dark:text-slate-400">Total Progress:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                {totalCompleted} / {totalLessonsCount} Completed ({overallCurriculumPct}%)
              </strong>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${overallCurriculumPct}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Java OOP: {oopCompletedCount}/12</span>
              <span>Java Swing: {swingCompletedCount}/5</span>
            </div>
          </div>
        </div>

        {/* Module Switcher Segmented Control */}
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveModule('oop')}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition cursor-pointer ${
              activeModule === 'oop'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Java OOP Curriculum</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                activeModule === 'oop'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              12 Topics ({oopCompletedCount}/12)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModule('swing')}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition cursor-pointer ${
              activeModule === 'swing'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <PanelTop className="h-4 w-4" />
            <span>Java Swing Programming</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                activeModule === 'swing'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              5 Topics {swingUnlocked ? `(${swingCompletedCount}/5)` : '• Locked'}
            </span>
            {!swingUnlocked && (
              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Module Content Rendering */}
      <div>
        {activeModule === 'oop' && (
          <VideoTutorials
            key={`lessons-oop-${currentUser.id || currentUser.email}`}
            currentUser={currentUser}
            lessons={lessons}
            onNavigateTo={onNavigateTo}
            onUpdateVideoProgress={onUpdateVideoProgress}
            studentResults={studentResults}
          />
        )}

        {activeModule === 'swing' && (
          <JavaSwingModule
            currentUser={currentUser}
            oopUnlocked={swingUnlocked}
            studentResults={studentResults}
            onSubmitCompleted={onSubmitCompleted}
            onUnlocked={onUnlocked}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
