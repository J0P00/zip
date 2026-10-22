import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  FileText,
  Gauge,
  Link2,
  Lock,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AuthenticatedUser, StudentSubView, VideoLesson } from '../types';
import { OOP_ASSESSMENTS } from '../data/oopCourse';
import { PRACTICE_CHALLENGES } from '../oopPracticeCatalog';
import { getYouTubeVideoId, practiceApi, progressApi } from '../services/api';
import type { StudentResultsData, StudentTopicResult } from '../services/interpretation';
import { ASSESSMENT_PASSING_SCORE } from '../config/assessment';

interface VideoTutorialsProps {
  currentUser: AuthenticatedUser;
  lessons: VideoLesson[];
  onNavigateTo: (view: StudentSubView) => void;
  onUpdateVideoProgress: (id: string, progress: number) => void;
  studentResults?: StudentResultsData | null;
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

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

type SubmissionDb = Record<string, { score?: number; compileStatus?: string }>;

const getTopic = (results: StudentResultsData | null | undefined, lessonId: string) =>
  results?.oopTopics?.find(topic => topic.id === lessonId) ||
  results?.swingTopics?.find(topic => topic.id === lessonId);

const lessonCompletedFromTopic = (topic?: StudentTopicResult) => Boolean(topic?.lessonCompleted);

const getPrerequisiteMessage = (lesson: VideoLesson, allLessons: VideoLesson[], studentResults?: StudentResultsData | null) => {
  if (lesson.sequence === 1) return '';
  const previous = allLessons.find(item => item.sequence === lesson.sequence - 1);
  if (!previous) return 'Complete the previous lesson requirements first.';
  const previousTopic = getTopic(studentResults, previous.id);
  if (!previousTopic?.lessonCompleted) {
    return previousTopic?.accessReason || `Complete the ${previous.title} lesson, including its practice, before continuing.`;
  }
  return '';
};

export default function VideoTutorials({ currentUser, lessons: sourceLessons, onNavigateTo, onUpdateVideoProgress, studentResults = null }: VideoTutorialsProps) {
  const [watchDb, setWatchDb] = useState<WatchDb>({});
  const [quizDb, setQuizDb] = useState<QuizDb>({});
  const [submissionDb, setSubmissionDb] = useState<SubmissionDb>({});
  const studentKey = currentUser.id;
  const lessons = useMemo(() => sourceLessons.map(lesson => {
    const watch = watchDb[lesson.id];
    const assessment = OOP_ASSESSMENTS.find(item => item.lessonId === lesson.id);
    const challenge = PRACTICE_CHALLENGES.find(item => item.lessonId === lesson.id);
    const submission = challenge ? submissionDb[`${studentKey}:${challenge.id}`] : undefined;
    const topic = getTopic(studentResults, lesson.id);
    const completed = Boolean(topic?.lessonCompleted);
    const access = topic
      ? (topic.lessonUnlocked ? 'active' : 'locked')
      : (lesson.sequence === 1 ? 'active' : 'locked');
    return {
      ...lesson,
      status: completed ? 'completed' as const : access as VideoLesson['status'],
      progressPercent: access === 'active' || completed ? Math.max(Number(topic?.videoPercentage || 0), Number(watch?.completionPercentage || 0)) : 0
    };
  }), [sourceLessons, watchDb, quizDb, submissionDb, studentKey, studentResults]);

  const firstAvailable = lessons.find(lesson => lesson.status === 'active') || lessons[0];
  const [activeLessonId, setActiveLessonId] = useState(firstAvailable?.id || '');
  const activeLesson = lessons.find(lesson => lesson.id === activeLessonId) || firstAvailable;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const previousLessonIdRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadedDurations, setLoadedDurations] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(activeLesson ? watchDb[activeLesson.id]?.lastPosition || 0 : 0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(activeLesson ? watchDb[activeLesson.id]?.lastPosition || 0 : 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoError, setVideoError] = useState(false);
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const youtubeVideoId = activeLesson ? getYouTubeVideoId(activeLesson.videoUrl) : '';
  const lastProgressPersistRef = useRef(0);
  const watchDbRef = useRef<WatchDb>({});
  const pendingProgressRef = useRef<Record<string, { lessonId: string; position: number; duration: number; percentage: number; completed: boolean }>>({});
  const progressSaveInFlightRef = useRef(false);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completedLessons = studentResults?.completedLessons ?? lessons.filter(lesson => lesson.status === 'completed').length;
  const passedAssessments = OOP_ASSESSMENTS.filter(assessment => quizDb[assessment.id]?.passed).length;
  const courseProgress = studentResults?.overallProgress ?? (lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0);

  useEffect(() => {
    if (!activeLesson && lessons[0]) setActiveLessonId(lessons[0].id);
  }, [activeLesson, lessons]);

  useEffect(() => {
    const selected = lessons.find(lesson => lesson.id === activeLessonId);
    if (selected?.status === 'locked') {
      setActiveLessonId(firstAvailable?.id || lessons[0]?.id || '');
    }
  }, [activeLessonId, firstAvailable?.id, lessons]);

  useEffect(() => {
    let isMounted = true;
    const token = currentUser.token;
    const user = currentUser.id;
    if (!token || !user) return;

    Promise.all([progressApi.getVideoProgress(user, token), progressApi.getQuizAttempts(user, token), practiceApi.listMine(token)])
      .then(([videoResponse, quizResponse, submissions]) => {
        if (!isMounted) return;
        const remoteDb = videoResponse.data.reduce((acc: WatchDb, row: any) => {
          const record = {
            lessonId: row.video_id,
            lastPosition: Number(row.last_position || 0),
            completionPercentage: Number(row.completion_percentage || 0),
            completed: Boolean(row.completed),
            dateCompleted: row.date_completed || undefined
          };
          acc[row.video_id] = {
            ...record
          };
          return acc;
        }, {});
        setWatchDb(remoteDb);
        setQuizDb(quizResponse.data.reduce((acc: QuizDb, row: any) => ({ ...acc, [row.assessment_id]: { assessmentId: row.assessment_id, lessonId: row.lesson_id || '', score: row.score, total: row.total, percentage: Number(row.percentage || 0), attemptNumber: row.attempt_number, passed: Boolean(row.passed) } }), {}));
        setSubmissionDb(submissions.data.reduce((acc: SubmissionDb, row: any) => ({ ...acc, [`${user}:${row.challenge_id}`]: { score: Number(row.score || 0), compileStatus: row.compile_status } }), {}));
      })
      .catch(error => console.warn('Unable to load video progress from backend:', error));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, currentUser.token]);

  useEffect(() => {
    if (!activeLesson) return;
    setVideoError(false);
    const watch = watchDb[activeLesson.id];
    const nextPosition = watch?.lastPosition || 0;
    setCurrentTime(nextPosition);
    setMaxWatchedTime(nextPosition);
    if (videoRef.current && nextPosition > 0 && Math.abs(videoRef.current.currentTime - nextPosition) > 2) {
      videoRef.current.currentTime = nextPosition;
    }

    if (previousLessonIdRef.current !== activeLesson.id) {
      setIsPlaying(false);
      previousLessonIdRef.current = activeLesson.id;
    }
  }, [activeLesson?.id, watchDb[activeLesson?.id]?.lastPosition]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
    videoRef.current.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate, activeLesson?.id]);

  useEffect(() => {
    if (!youtubeVideoId || !youtubeContainerRef.current || !activeLesson) return;
    let cancelled = false;
    const createPlayer = () => {
      if (cancelled || !youtubeContainerRef.current || !(window as any).YT?.Player) return;
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = new (window as any).YT.Player(youtubeContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: (event: any) => {
            const nextDuration = Number(event.target.getDuration() || 0);
            setDuration(nextDuration);
            if (nextDuration > 0 && activeLesson) {
              const formatted = formatTime(nextDuration);
              setLoadedDurations(prev => (prev[activeLesson.id] === formatted ? prev : { ...prev, [activeLesson.id]: formatted }));
            }
            const resumeAt = watchDb[activeLesson.id]?.lastPosition || 0;
            if (resumeAt > 0) event.target.seekTo(resumeAt, true);
          },
          onStateChange: (event: any) => {
            const playing = (window as any).YT.PlayerState.PLAYING;
            const ended = (window as any).YT.PlayerState.ENDED;
            setIsPlaying(event.data === playing);
            if (event.data === ended) {
              const total = Number(event.target.getDuration() || 0);
              persistProgress(total, total, true);
            }
          },
          onError: () => { setIsPlaying(false); setVideoError(true); }
        }
      });
    };
    if ((window as any).YT?.Player) createPlayer();
    else {
      const prior = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!prior) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(script);
      }
      const poll = window.setInterval(() => { if ((window as any).YT?.Player) { window.clearInterval(poll); createPlayer(); } }, 100);
      window.setTimeout(() => window.clearInterval(poll), 10000);
    }
    return () => { cancelled = true; youtubePlayerRef.current?.destroy?.(); youtubePlayerRef.current = null; };
  }, [youtubeVideoId, activeLesson?.id]);

  useEffect(() => {
    if (!youtubePlayerRef.current || !youtubeVideoId) return;
    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      const position = Number(player.getCurrentTime() || 0);
      const nextDuration = Number(player.getDuration() || duration || 0);
      setCurrentTime(position);
      setDuration(nextDuration);
      setMaxWatchedTime(value => Math.max(value, position));
      if (player.getPlayerState?.() === (window as any).YT?.PlayerState?.PLAYING) {
        const now = Date.now();
        if (now - lastProgressPersistRef.current >= 2000) {
          lastProgressPersistRef.current = now;
          persistProgress(position, nextDuration);
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [youtubeVideoId, duration, activeLesson?.id]);

  const handleTogglePlay = () => {
    if (youtubePlayerRef.current && youtubeVideoId) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        youtubePlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setVideoError(false);
        }).catch(err => {
          console.warn('Playback prevented or interrupted:', err);
          setIsPlaying(false);
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleVideoError = () => {
    setIsPlaying(false);
    setIsBuffering(false);
    const err = videoRef.current?.error;
    let message = "Video unavailable. Please check your connection and tap retry.";
    if (err) {
      switch (err.code) {
        case 1:
          message = "Playback interrupted. Tap retry to reload.";
          break;
        case 2:
          message = "Network connection problem. Please check your internet connection.";
          break;
        case 3:
          message = "Playback decoding error. Tap retry to restart.";
          break;
        case 4:
          message = "Video source unavailable or format not supported on this device.";
          break;
      }
    } else if (!activeLesson?.videoUrl) {
      message = "Video URL is unavailable for this lesson.";
    }
    setVideoErrorMessage(message);
    setVideoError(true);
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    setVideoErrorMessage(null);
    setIsBuffering(true);
    const video = videoRef.current;
    if (video) {
      video.load();
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }).catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
      }
    }
  };

  useEffect(() => {
    watchDbRef.current = watchDb;
  }, [watchDb]);

  const flushPendingProgress = async () => {
    if (progressSaveInFlightRef.current) return;
    const next = Object.values(pendingProgressRef.current)[0];
    if (!next) return;

    progressSaveInFlightRef.current = true;
    try {
      await progressApi.saveVideoProgress({
        videoId: next.lessonId,
        lastPosition: next.position,
        completionPercentage: next.percentage,
        completed: next.completed
      }, currentUser.token);

      delete pendingProgressRef.current[next.lessonId];
      onUpdateVideoProgress(next.lessonId, next.percentage);
    } catch (error) {
      console.warn('Unable to sync video progress with backend:', error);
      // Retain in pending queue to retry automatically
    } finally {
      progressSaveInFlightRef.current = false;
      if (Object.keys(pendingProgressRef.current).length > 0) {
        void flushPendingProgress();
      }
    }
  };

  const parseDurationString = (durStr?: string) => {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const persistProgress = (position: number, nextDuration = duration, flush = false) => {
    if (!activeLesson) return;
    const lessonId = activeLesson.id;
    const existing = watchDbRef.current[lessonId];
    const fallbackDuration = parseDurationString(activeLesson.duration);
    const validDuration = (Number.isFinite(nextDuration) && nextDuration > 0)
      ? nextDuration
      : (Number.isFinite(duration) && duration > 0)
        ? duration
        : fallbackDuration;

    const measuredPercentage = validDuration > 0 ? Math.min(100, Math.round((position / validDuration) * 100)) : 0;
    if (existing?.completionPercentage >= 95 && measuredPercentage < existing.completionPercentage) return;

    const percentage = Math.max(existing?.completionPercentage || 0, measuredPercentage);
    const completed = percentage >= 95;
    const record = {
      lessonId,
      lastPosition: Math.max(existing?.lastPosition || 0, position),
      completionPercentage: percentage,
      completed,
      dateCompleted: completed ? existing?.dateCompleted || new Date().toISOString() : undefined
    };

    const nextDb = { ...watchDbRef.current, [lessonId]: record };
    watchDbRef.current = nextDb;
    setWatchDb(nextDb);

    const queued = pendingProgressRef.current[lessonId];
    pendingProgressRef.current[lessonId] = {
      lessonId,
      position: Math.max(queued?.position || 0, position),
      duration: validDuration,
      percentage: Math.max(queued?.percentage || 0, percentage),
      completed: Boolean(queued?.completed || completed)
    };

    if (completed || flush) {
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
        progressSaveTimerRef.current = null;
      }
      void flushPendingProgress();
    } else if (!progressSaveTimerRef.current) {
      progressSaveTimerRef.current = setTimeout(() => {
        progressSaveTimerRef.current = null;
        void flushPendingProgress();
      }, 2000);
    }
  };

  useEffect(() => () => {
    if (progressSaveTimerRef.current) clearTimeout(progressSaveTimerRef.current);
    void flushPendingProgress();
  }, [currentUser.id]);
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !activeLesson) return;
    const dur = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(dur);
    if (dur > 0) {
      const formatted = formatTime(dur);
      setLoadedDurations(prev => (prev[activeLesson.id] === formatted ? prev : { ...prev, [activeLesson.id]: formatted }));
    }
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
    const now = Date.now();
    if (now - lastProgressPersistRef.current >= 2000) {
      lastProgressPersistRef.current = now;
      persistProgress(video.currentTime, video.duration);
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const requestedTime = Number(event.target.value);
    const allowedTime = Math.min(requestedTime, maxWatchedTime + 5, duration || requestedTime);
    if (youtubePlayerRef.current && youtubeVideoId) youtubePlayerRef.current.seekTo(allowedTime, true);
    else if (videoRef.current) videoRef.current.currentTime = allowedTime;
    setCurrentTime(allowedTime);
  };

  const handleSeeking = () => {
    const video = videoRef.current;
    if (!video) return;
    const allowedTime = Math.min(video.currentTime, maxWatchedTime + 5, duration || video.currentTime);
    if (video.currentTime > allowedTime) {
      video.currentTime = allowedTime;
      setCurrentTime(allowedTime);
    }
  };

  const handleFullscreen = () => {
    void shellRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  useEffect(() => {
    const probes: HTMLVideoElement[] = [];
    lessons.forEach(l => {
      if (!l.videoUrl || l.videoUrl.startsWith('/videos/') || l.videoUrl.startsWith('/OOP%20Lesson/')) return;
      if (loadedDurations[l.id]) return;

      try {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.src = l.videoUrl;
        probe.onloadedmetadata = () => {
          if (Number.isFinite(probe.duration) && probe.duration > 0) {
            const formatted = formatTime(probe.duration);
            setLoadedDurations(prev => (prev[l.id] === formatted ? prev : { ...prev, [l.id]: formatted }));
          }
        };
        probes.push(probe);
      } catch {
        // Fall back to configured duration string
      }
    });

    return () => {
      probes.forEach(probe => {
        probe.onloadedmetadata = null;
        probe.src = '';
      });
    };
  }, [lessons]);

  const selectLesson = (lesson: VideoLesson) => {
    if (lesson.status === 'locked') return;
    if (activeLesson && activeLesson.id !== lesson.id && videoRef.current) {
      persistProgress(videoRef.current.currentTime, videoRef.current.duration, true);
    }
    setActiveLessonId(lesson.id);
  };

  if (!activeLesson) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
        No lectures are available from the database yet.
      </div>
    );
  }

  const assessment = OOP_ASSESSMENTS.find(item => item.lessonId === activeLesson.id);
  const activeQuiz = assessment ? quizDb[assessment.id] : undefined;
  const citationText = activeLesson.citation_text || (activeLesson as any).citationText || (activeLesson as any).metadata?.citationText || (
    activeLesson.creator_name && activeLesson.source_url
      ? `${activeLesson.creator_name}. ${activeLesson.video_title || activeLesson.title}. ${activeLesson.publisher_name || 'Video source'}.${activeLesson.accessed_date ? ` Accessed ${activeLesson.accessed_date}.` : ''}`
      : ''
  );
  const citationUrl = activeLesson.citation_url || (activeLesson as any).citationUrl || (activeLesson as any).metadata?.citationUrl || activeLesson.source_url;

  return (
    <div className="space-y-4 overflow-x-hidden sm:space-y-6 animate-fade-in" id="oop-course-syllabus">
      <section className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-md sm:rounded-2xl sm:p-5 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              Course Syllabus
            </span>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">OOP Fundamentals</h2>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              {lessons.length} Java OOP lectures loaded from the shared database. Lessons unlock after video completion and a passed assessment; practice remains available for mastery.
            </p>
          </div>
          <div className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 sm:min-w-[220px] lg:w-auto">
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
          <div ref={shellRef} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm sm:rounded-2xl">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {youtubeVideoId ? (
                <div ref={youtubeContainerRef} className="h-full w-full" aria-label="YouTube video player" />
              ) : (
                <video
                  key={activeLesson.id}
                  ref={videoRef}
                  controls
                  playsInline
                  // @ts-ignore
                  webkit-playsinline="true"
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onLoadedMetadata={() => {
                    setVideoError(false);
                    setVideoErrorMessage(null);
                    handleLoadedMetadata();
                  }}
                  onCanPlay={() => {
                    setIsBuffering(false);
                    setVideoError(false);
                  }}
                  onWaiting={() => setIsBuffering(true)}
                  onPlay={() => {
                    setIsPlaying(true);
                    setVideoError(false);
                  }}
                  onPlaying={() => {
                    setIsBuffering(false);
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    if (videoRef.current && !videoRef.current.ended) {
                      persistProgress(videoRef.current.currentTime, videoRef.current.duration, true);
                    }
                  }}
                  onSeeking={handleSeeking}
                  onTimeUpdate={handleTimeUpdate}
                  onError={handleVideoError}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (videoRef.current) {
                      persistProgress(videoRef.current.duration, videoRef.current.duration, true);
                    }
                  }}
                >
                  <source src={activeLesson.videoUrl} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              )}

              {isBuffering && !videoError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-900/80 px-4 py-3 text-white backdrop-blur-sm">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    <span className="text-xs font-semibold">Loading video...</span>
                  </div>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
                  <AlertCircle className="h-10 w-10 text-amber-400" />
                  <p className="text-sm font-bold">{videoErrorMessage || 'Video unavailable. Please try again.'}</p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={handleRetryVideo}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-sm transition"
                    >
                      Retry video
                    </button>
                    {activeLesson.videoUrl && (
                      <a
                        href={activeLesson.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition"
                      >
                        Open direct video link
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2 text-white sm:px-4 sm:py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold transition"
                  title="Play or pause"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (youtubePlayerRef.current && youtubeVideoId) youtubePlayerRef.current.seekTo(Math.max(0, currentTime - 10), true);
                    else if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-xs font-semibold transition"
                  title="Rewind 10 seconds"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">10s</span>
                </button>
                <span className="min-w-0 font-mono text-[11px] font-bold text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <span className="hidden min-[380px]:inline">Speed:</span>
                  <select
                    value={playbackRate}
                    onChange={event => setPlaybackRate(Number(event.target.value))}
                    className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs font-bold text-white outline-none focus:border-emerald-500"
                  >
                    {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                      <option key={rate} value={rate} className="bg-slate-900 text-white">{rate}x</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setIsMuted(value => !value)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white transition"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={event => setVolume(Number(event.target.value))}
                  className="hidden w-16 accent-emerald-500 min-[480px]:block"
                  aria-label="Volume"
                />
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white transition"
                  title="Fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="border-t border-slate-800 bg-white p-4 sm:p-5 dark:bg-slate-950">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-black uppercase text-slate-400">Lesson {activeLesson.sequence}</span>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{activeLesson.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{activeLesson.description}</p>
                </div>
                <button
                  disabled={(watchDb[activeLesson.id]?.completionPercentage || 0) < 95}
                  onClick={() => onNavigateTo('assessments')}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
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
              {citationText && (
                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-900">
                        <FileText className="h-4 w-4 text-emerald-700" />
                        Citation
                      </h4>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                        {citationText}
                      </p>
                    </div>
                    {citationUrl && (
                      <a
                        href={citationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 sm:w-auto"
                      >
                        <Link2 className="h-4 w-4" />
                        Source
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:rounded-2xl sm:p-5 dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Lesson Queue
              </h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                {lessons.length} Lessons
              </span>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {lessons.map(lesson => {
                const isActive = lesson.id === activeLesson.id;
                const isLocked = lesson.status === 'locked';
                const progress = lesson.progressPercent || 0;
                const topic = getTopic(studentResults, lesson.id);
                const videoDone = Boolean(topic?.videoCompleted || (watchDb[lesson.id]?.completionPercentage || 0) >= 95);
                const quizPassed = Boolean(topic?.quizPassed);
                const statusLabel = isLocked
                  ? 'Locked'
                  : lesson.status === 'completed'
                    ? 'Lesson completed'
                    : quizPassed
                      ? 'Assessment passed'
                      : videoDone
                        ? 'Video completed'
                        : progress > 0 ? 'In progress' : 'Ready';
                const lockReason = getPrerequisiteMessage(lesson, lessons, studentResults);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson)}
                    className={`w-full rounded-2xl border p-3 text-left transition-all ${isActive ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'} ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="inline-flex min-w-[2.2rem] items-center justify-center rounded-md bg-slate-100 px-1.5 py-1 font-mono text-[10px] font-black uppercase text-slate-700">
                            {lesson.sequence}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{lesson.topic}</span>
                        </div>
                        <h4 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{lesson.title}</h4>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${isLocked ? 'bg-slate-100 text-slate-500' : lesson.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : videoDone || quizPassed ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                          {statusLabel}
                        </span>
                        {isLocked ? <Lock className="h-4 w-4 text-slate-400" /> : lesson.status === 'completed' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Play className="h-4 w-4 text-slate-500" />}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                      <span>{loadedDurations[lesson.id] || lesson.duration}</span>
                      <span>{isLocked ? lockReason : `${progress}% watched`}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${isLocked ? 0 : progress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-xs font-semibold leading-6 text-slate-500 shadow-sm backdrop-blur-md sm:rounded-2xl sm:p-5">
            <h3 className="mb-2 text-sm font-extrabold text-slate-900">Unlock Rule</h3>
            Complete at least 95% of the current video, pass its assessment with {ASSESSMENT_PASSING_SCORE}% or higher, and complete the practice to unlock the next lesson.
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
