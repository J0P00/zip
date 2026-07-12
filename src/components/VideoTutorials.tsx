import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  Gauge,
  Lock,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { StudentSubView, VideoLesson } from '../types';
import { getStoredJson, OOP_ASSESSMENTS, OOP_COURSE_LESSONS, setStoredJson } from '../data/oopCourse';
import { progressApi } from '../services/api';

interface VideoTutorialsProps {
  lessons: VideoLesson[];
  onNavigateTo: (view: StudentSubView) => void;
  onUpdateVideoProgress: (id: string, progress: number) => void;
}

interface WatchRecord {
  lessonId: string;
  lastPosition: number;
  completionPercentage: number;
  completed: boolean;
  dateCompleted?: string;
}

type WatchDb = Record<string, WatchRecord>;
type QuizDb = Record<string, { passed: boolean; percentage: number; score: number; total: number; attemptNumber: number; dateCompleted?: string }>;

const WATCH_KEY = 'oophub_oop_video_progress';
const QUIZ_KEY = 'oophub_oop_quiz_attempts';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getLessonAccess = (lesson: VideoLesson, watchDb: WatchDb, quizDb: QuizDb) => {
  if (lesson.sequence === 1) return 'active';
  const previous = OOP_COURSE_LESSONS.find(item => item.sequence === lesson.sequence - 1);
  if (!previous) return 'locked';

  const previousWatch = watchDb[previous.id];
  const previousAssessment = OOP_ASSESSMENTS.find(item => item.lessonId === previous.id);
  const previousQuiz = previousAssessment ? quizDb[previousAssessment.id] : undefined;

  return previousWatch?.completed && previousQuiz?.passed ? 'active' : 'locked';
};

export default function VideoTutorials({ onNavigateTo, onUpdateVideoProgress }: VideoTutorialsProps) {
  const [watchDb, setWatchDb] = useState<WatchDb>(() => getStoredJson(WATCH_KEY, {}));
  const [quizDb] = useState<QuizDb>(() => getStoredJson(QUIZ_KEY, {}));
  const lessons = useMemo(() => OOP_COURSE_LESSONS.map(lesson => {
    const watch = watchDb[lesson.id];
    const access = getLessonAccess(lesson, watchDb, quizDb);
    return {
      ...lesson,
      status: watch?.completed ? 'completed' as const : access as VideoLesson['status'],
      progressPercent: watch?.completionPercentage || 0
    };
  }), [watchDb, quizDb]);

  const firstAvailable = lessons.find(lesson => lesson.status === 'active') || lessons[0];
  const [activeLessonId, setActiveLessonId] = useState(firstAvailable.id);
  const activeLesson = lessons.find(lesson => lesson.id === activeLessonId) || firstAvailable;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(watchDb[activeLesson.id]?.lastPosition || 0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(watchDb[activeLesson.id]?.lastPosition || 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const completedLessons = lessons.filter(lesson => watchDb[lesson.id]?.completed).length;
  const passedAssessments = OOP_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
  const courseProgress = Math.round(((completedLessons + passedAssessments) / (lessons.length * 2)) * 100);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('oophub_auth_token');
    const user = localStorage.getItem('oophub_current_user_id');
    if (!token || !user) return;

    progressApi.getVideoProgress(user, token)
      .then(response => {
        if (!isMounted) return;
        const remoteDb = response.data.reduce((acc: WatchDb, row: any) => {
          acc[row.video_id] = {
            lessonId: row.video_id,
            lastPosition: Number(row.last_position || 0),
            completionPercentage: Number(row.completion_percentage || 0),
            completed: Boolean(row.completed),
            dateCompleted: row.date_completed || undefined
          };
          return acc;
        }, {});
        setWatchDb(prev => {
          const next = { ...prev, ...remoteDb };
          setStoredJson(WATCH_KEY, next);
          return next;
        });
      })
      .catch(error => console.warn('Unable to load video progress from backend:', error));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const watch = watchDb[activeLesson.id];
    setCurrentTime(watch?.lastPosition || 0);
    setMaxWatchedTime(watch?.lastPosition || 0);
    setIsPlaying(false);
  }, [activeLesson.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
    videoRef.current.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate, activeLesson.id]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const persistProgress = (position: number, nextDuration = duration) => {
    const percentage = nextDuration > 0 ? Math.min(100, Math.round((position / nextDuration) * 100)) : 0;
    const completed = percentage >= 95;
    const nextDb = {
      ...watchDb,
      [activeLesson.id]: {
        lessonId: activeLesson.id,
        lastPosition: position,
        completionPercentage: percentage,
        completed,
        dateCompleted: completed ? watchDb[activeLesson.id]?.dateCompleted || new Date().toISOString() : undefined
      }
    };

    setWatchDb(nextDb);
    setStoredJson(WATCH_KEY, nextDb);
    progressApi.saveVideoProgress({
      videoId: activeLesson.id,
      lastPosition: position,
      completionPercentage: percentage,
      completed
    }).catch(error => console.warn('Unable to sync video progress with backend:', error));
    onUpdateVideoProgress(activeLesson.id, percentage);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    const resumeAt = watchDb[activeLesson.id]?.lastPosition || 0;
    if (resumeAt > 0 && resumeAt < video.duration) {
      video.currentTime = resumeAt;
      setCurrentTime(resumeAt);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    setMaxWatchedTime(value => Math.max(value, video.currentTime));
    persistProgress(video.currentTime, video.duration);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const requestedTime = Number(event.target.value);
    const allowedTime = Math.min(requestedTime, maxWatchedTime + 5, duration || requestedTime);
    if (videoRef.current) videoRef.current.currentTime = allowedTime;
    setCurrentTime(allowedTime);
    persistProgress(allowedTime);
  };

  const handleFullscreen = () => {
    shellRef.current?.requestFullscreen?.();
  };

  const selectLesson = (lesson: VideoLesson) => {
    if (lesson.status === 'locked') return;
    setActiveLessonId(lesson.id);
  };

  const assessment = OOP_ASSESSMENTS.find(item => item.lessonId === activeLesson.id);
  const activeQuiz = assessment ? quizDb[assessment.id] : undefined;

  return (
    <div className="space-y-6 animate-fade-in" id="oop-course-syllabus">
      <section className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Course Syllabus
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">OOP Fundamentals</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              {OOP_COURSE_LESSONS.length} local Java OOP lessons using the MP4 files in <span className="font-mono">public/videos</span>. Lessons unlock only after video completion and a passed assessment.
            </p>
          </div>
          <div className="min-w-[220px] rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Overall Progress</span>
              <span className="font-mono text-emerald-700">{courseProgress}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${courseProgress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div ref={shellRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
            <div className="relative aspect-video bg-black">
              <video
                key={activeLesson.id}
                ref={videoRef}
                src={activeLesson.videoUrl}
                className="h-full w-full object-contain"
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                  if (videoRef.current) persistProgress(videoRef.current.duration, videoRef.current.duration);
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={Math.min(currentTime, duration || currentTime)}
                  onChange={handleSeek}
                  className="w-full accent-emerald-500"
                  aria-label="Video progress"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-white">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsPlaying(value => !value)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Play or pause">
                      {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
                    </button>
                    <button onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Rewind 10 seconds">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-xs font-bold">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={playbackRate} onChange={event => setPlaybackRate(Number(event.target.value))} className="rounded-lg bg-white/10 px-2 py-2 text-xs font-bold outline-none">
                      {[0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}x</option>)}
                    </select>
                    <button onClick={() => setIsMuted(value => !value)} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Mute or unmute">
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => setVolume(Number(event.target.value))} className="w-20 accent-emerald-500" aria-label="Volume" />
                    <button onClick={handleFullscreen} className="rounded-lg bg-white/10 p-2 hover:bg-white/20" title="Fullscreen">
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 bg-white p-5 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {activeLesson.sequence}</span>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{activeLesson.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{activeLesson.description}</p>
                </div>
                <button
                  disabled={!watchDb[activeLesson.id]?.completed}
                  onClick={() => onNavigateTo('assessments')}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Take Assessment
                </button>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {activeLesson.concepts.map(concept => (
                  <div key={concept} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    {concept}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              Lesson Queue
            </h3>
            <div className="space-y-2">
              {lessons.map(lesson => {
                const isActive = lesson.id === activeLesson.id;
                const isLocked = lesson.status === 'locked';
                const progress = lesson.progressPercent || 0;
                const quiz = OOP_ASSESSMENTS.find(item => item.lessonId === lesson.id);
                const quizPassed = quiz ? quizDb[quiz.id]?.passed : false;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson)}
                    className={`w-full rounded-xl border p-3 text-left transition ${isActive ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-100 bg-white hover:border-slate-300'} ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {lesson.sequence}</span>
                        <h4 className="truncate text-xs font-extrabold text-slate-900">{lesson.title}</h4>
                      </div>
                      {isLocked ? <Lock className="h-4 w-4 text-slate-400" /> : watchDb[lesson.id]?.completed && quizPassed ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Gauge className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>{progress}% watched</span>
                      <span>{quizPassed ? 'Assessment passed' : 'Assessment pending'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-xs font-semibold leading-6 text-slate-500 shadow-sm backdrop-blur-md">
            <h3 className="mb-2 text-sm font-extrabold text-slate-900">Unlock Rule</h3>
            Complete at least 95% of the current video and pass its assessment with 70% or higher. The next lesson unlocks automatically after both are done.
            {activeQuiz && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                Current assessment: {activeQuiz.score}/{activeQuiz.total} ({activeQuiz.percentage}%)
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
