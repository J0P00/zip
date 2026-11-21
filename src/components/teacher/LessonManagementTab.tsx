import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Eye,
  Archive,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  X,
  Play,
  Link2,
  FileQuestion,
  Code2,
  Video,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Code,
  FileText,
  PauseCircle,
  Send,
  RotateCcw,
  Save,
  UploadCloud
} from 'lucide-react';
import { LessonStatus, ManagedLesson } from '../../types';
import { assessmentApi, lessonApi, practiceApi, validateVideoUrl, videoApi } from '../../services/api';
import { OOP_COURSE_LESSONS, OOP_ASSESSMENTS } from '../../data/oopCourse';
import { PRACTICE_CHALLENGES } from '../../data/practiceChallenges';
import {
  JAVA_SWING_LESSONS,
  JAVA_SWING_VIDEOS,
  JAVA_SWING_ASSESSMENTS,
  JAVA_SWING_EXERCISES,
  SWING_PASSING_PERCENTAGE
} from '../../data/javaSwingCourse';
import { ASSESSMENT_PASSING_SCORE } from '../../config/assessment';

interface LessonManagementTabProps {
  theme?: 'light' | 'dark';
}

export interface AssessmentQuestionDraft {
  id: string;
  question: string;
  codeSnippet?: string;
  options: {
    id: string;
    text: string;
    rationale?: string;
  }[];
  correctOptionId: string;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: string;
}

const DEFAULT_STARTER_CODE = `public class Main {
    public static void main(String[] args) {
        // Implement your solution here
        System.out.println("Hello, World!");
    }
}
`;

const createDefaultQuestion = (index = 1): AssessmentQuestionDraft => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${index}`,
  question: 'What is the primary role of this concept in Java OOP?',
  codeSnippet: '',
  options: [
    { id: 'opt_a', text: 'Enforces data encapsulation and access control', rationale: 'Correct encapsulation principle.' },
    { id: 'opt_b', text: 'Increases CPU cache miss rate', rationale: 'Incorrect, does not relate to hardware cache.' },
    { id: 'opt_c', text: 'Replaces bytecode with native assembly', rationale: 'Incorrect, JVM manages bytecode execution.' },
    { id: 'opt_d', text: 'Disables garbage collection permanently', rationale: 'Incorrect, GC remains active.' }
  ],
  correctOptionId: 'opt_a'
});

type ModalTab = 'lesson' | 'video' | 'assessment' | 'practice';

const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const isYouTubeUrl = (url: string): boolean => {
  const lower = String(url || '').toLowerCase();
  return lower.includes('youtube.com') || lower.includes('youtu.be');
};

const validateDeviceVideoFile = (file: File): string | null => {
  const nameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some(ext => nameLower.endsWith(ext));
  const hasValidMime = !file.type || ALLOWED_VIDEO_MIME_TYPES.includes(file.type.toLowerCase());
  if (!hasValidExt || !hasValidMime) {
    return 'Unsupported file format. Please upload an .mp4, .webm, or .mov video file.';
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum allowed video size is 100 MB.`;
  }
  return null;
};

const normalizeLessonStatus = (status?: string): LessonStatus => {
  const normalized = String(status || 'draft').trim().toLowerCase();
  if (normalized === 'published' || normalized === 'archived' || normalized === 'draft') {
    return normalized;
  }
  return 'draft';
};

const isSwingLessonItem = (lesson: { id?: string; courseId?: string; module?: string; track?: string }): boolean => {
  if (lesson.track === 'swing') return true;
  if (lesson.track === 'oop') return false;
  const id = String(lesson.id || '').toLowerCase();
  const courseId = String(lesson.courseId || '').toLowerCase();
  const mod = String(lesson.module || '').toLowerCase();
  return id.startsWith('swing_lesson_') || courseId === 'java_swing' || mod.includes('swing');
};

const sortManagedLessons = (items: ManagedLesson[]): ManagedLesson[] => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const aSwing = isSwingLessonItem(a);
    const bSwing = isSwingLessonItem(b);
    if (aSwing !== bSwing) return aSwing ? 1 : -1;
    if ((a.sequence || 0) !== (b.sequence || 0)) return (a.sequence || 0) - (b.sequence || 0);
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
};

const normalizeQuestionDraft = (q: any, index: number): AssessmentQuestionDraft => {
  const rawOptions = Array.isArray(q?.options) ? q.options : Array.isArray(q?.choices) ? q.choices : [];
  const normalizedOptions = (rawOptions || []).map((opt: any, optIdx: number) => {
    const optId = `opt_${String.fromCharCode(97 + optIdx)}`;
    if (typeof opt === 'string') {
      return {
        id: optId,
        text: opt,
        rationale: opt === q?.correctAnswer ? (q?.explanation || '') : ''
      };
    }
    return {
      id: opt?.id || optId,
      text: opt?.text ?? String(opt ?? ''),
      rationale: opt?.rationale || ''
    };
  });

  const safeOptions = normalizedOptions.length > 0 ? normalizedOptions : createDefaultQuestion(index + 1).options;
  let correctOptionId = q?.correctOptionId || '';
  if (!correctOptionId && q?.correctAnswer) {
    const matched = safeOptions.find((o: any) => o.text === q.correctAnswer);
    if (matched) correctOptionId = matched.id;
  }
  if (!correctOptionId || !safeOptions.some((o: any) => o.id === correctOptionId)) {
    correctOptionId = safeOptions[0]?.id || 'opt_a';
  }
  const correctOption = safeOptions.find((o: any) => o.id === correctOptionId);

  return {
    id: q?.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${index + 1}`,
    question: q?.question || q?.prompt || '',
    codeSnippet: q?.codeSnippet || '',
    options: safeOptions,
    correctOptionId,
    correctAnswer: correctOption?.text || q?.correctAnswer || '',
    explanation: q?.explanation || correctOption?.rationale || '',
    difficulty: q?.difficulty || 'Easy'
  };
};

const normalizeObjectivesArray = (val: any): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return val.split('\n').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
};

const buildBaselineLessons = (): ManagedLesson[] => {
  const oopLessons: ManagedLesson[] = (OOP_COURSE_LESSONS || []).map((l, i) => {
    const assessment = OOP_ASSESSMENTS.find(a => a.lessonId === l.id);
    const practice = PRACTICE_CHALLENGES.find(c => c.lessonId === l.id);
    const assessmentQuestions = Array.isArray(assessment?.questions) ? assessment.questions : [];
    return {
      id: l.id,
      title: l.title,
      track: 'oop',
      module: 'Object-Oriented Programming (Java)',
      courseId: 'oop_course_java',
      sequence: l.sequence || i + 1,
      videoUrl: l.videoUrl,
      description: l.description,
      learningObjectives: Array.isArray(l.concepts) ? l.concepts : [],
      status: 'published',
      citationText: l.citation_text || (l.creator_name ? `${l.creator_name}. ${l.video_title || l.title}. ${l.publisher_name || 'Oracle'}.` : ''),
      citationUrl: l.citation_url || l.source_url || '',
      topics: [],
      assessments: assessment ? [assessment] : [],
      practice_challenges: practice ? [practice] : [],
      content: {
        video: {
          id: `vid_${l.id}`,
          title: `${l.title} Video Lecture`,
          videoUrl: l.videoUrl,
          duration: l.duration,
          status: 'Published'
        },
        assessment: assessment
          ? {
              id: assessment.id,
              title: assessment.title,
              quizType: 'Multiple Choice',
              passingScore: ASSESSMENT_PASSING_SCORE,
              attempts: 3,
              questionsCount: assessmentQuestions.length,
              questions: assessmentQuestions,
              status: 'Published'
            }
          : null,
        practice: practice
          ? {
              id: practice.id,
              title: practice.title,
              description: practice.description,
              starterCode: practice.starterCode,
              sampleInput: practice.sampleInput || '',
              sampleOutput: practice.sampleOutput || '',
              passingScore: practice.passingScore || 70,
              status: 'Published'
            }
          : null
      }
    };
  });

  const swingLessons: ManagedLesson[] = (JAVA_SWING_LESSONS || []).map((l, i) => {
    const video = JAVA_SWING_VIDEOS.find(v => v.lessonId === l.id);
    const assessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === l.id);
    const exercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === l.id);
    const assessmentQuestions = Array.isArray(assessment?.questions) ? assessment.questions : [];
    return {
      id: l.id,
      title: l.title,
      track: 'swing',
      module: 'Java Swing',
      courseId: 'java_swing',
      sequence: 12 + (l.sequence || i + 1),
      videoUrl: video?.embedUrl || '',
      description: l.introduction || l.summary || '',
      learningObjectives: Array.isArray(l.objectives) ? l.objectives : (Array.isArray(l.topics) ? l.topics : []),
      status: 'published',
      citationText: 'Oracle. (n.d.). Trail: Creating a GUI With Swing (The Java Tutorials). Oracle Documentation.',
      citationUrl: 'https://docs.oracle.com/javase/tutorial/uiswing/',
      topics: [],
      assessments: assessment ? [assessment] : [],
      practice_challenges: exercise ? [exercise] : [],
      content: {
        video: video
          ? {
              id: video.id,
              title: video.title,
              videoUrl: video.embedUrl,
              duration: video.duration,
              status: 'Published'
            }
          : null,
        assessment: assessment
          ? {
              id: assessment.id,
              title: assessment.title,
              quizType: 'Multiple Choice',
              passingScore: SWING_PASSING_PERCENTAGE,
              attempts: 3,
              questionsCount: assessmentQuestions.length,
              questions: (assessmentQuestions || []).map((q, idx) => normalizeQuestionDraft(q, idx)),
              status: 'Published'
            }
          : null,
        practice: exercise
          ? {
              id: exercise.id,
              title: exercise.title,
              description: exercise.description,
              starterCode: exercise.starterCode,
              sampleInput: exercise.sampleInput || 'No stdin required',
              sampleOutput: exercise.sampleOutput || '',
              passingScore: SWING_PASSING_PERCENTAGE,
              status: 'Published'
            }
          : null
      }
    };
  });

  return sortManagedLessons([...oopLessons, ...swingLessons]);
};

export default function LessonManagementTab({ theme = 'light' }: LessonManagementTabProps) {
  const isDark = theme === 'dark';
  const [activeTrack, setActiveTrack] = useState<'oop' | 'swing'>('oop');
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LessonStatus>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuLessonId, setOpenMenuLessonId] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ManagedLesson | null>(null);
  const [previewingLesson, setPreviewingLesson] = useState<ManagedLesson | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedLesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // Consolidated Modal Tabs
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>('lesson');
  const [jsonMode, setJsonMode] = useState(false);
  const [rawQuestionsJson, setRawQuestionsJson] = useState('');
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>('');
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const modalBodyRef = useRef<HTMLFormElement | null>(null);
  const questionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);

  // Video Uploader (Cloudinary Direct Upload)
  const [videoSourceMode, setVideoSourceMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [selectedVideoFile, setSelectedVideoFile] = useState<{ name: string; size: number } | null>(null);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setFeedback({ type, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuLessonId(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuLessonId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      if (uploadXhrRef.current) uploadXhrRef.current.abort();
    };
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    // Track identifier
    track: 'oop' as 'oop' | 'swing',

    // 1. Basic Lesson Details
    title: '',
    module: 'Object-Oriented Programming (Java)',
    sequence: 1,
    status: 'draft' as LessonStatus,
    description: '',
    learningObjectives: '',
    citationText: '',
    citationUrl: '',

    // 2. Video Integration
    videoUrl: '',

    // 3. Assessment Configuration
    enableAssessment: true,
    assessmentTitle: '',
    assessmentQuizType: 'Multiple Choice',
    assessmentPassingScore: ASSESSMENT_PASSING_SCORE,
    assessmentAttempts: 3,
    assessmentStatus: 'Published' as 'Draft' | 'Published',
    assessmentQuestions: [] as AssessmentQuestionDraft[],

    // 4. Practice IDE Configuration
    enablePractice: true,
    practiceTitle: '',
    practiceDescription: '',
    practiceStarterCode: DEFAULT_STARTER_CODE,
    practiceSampleInput: '',
    practiceSampleOutput: 'Hello, World!',
    practicePassingScore: 70,
    practiceStatus: 'Published' as 'Draft' | 'Published'
  });

  const isDirty = useMemo(() => {
    if (!isCreateOpen && !editingLesson) return false;
    if (!initialFormSnapshot) return false;
    return JSON.stringify(formData) !== initialFormSnapshot;
  }, [formData, initialFormSnapshot, isCreateOpen, editingLesson]);

  const resetVideoUploadState = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }
    setIsUploadingVideo(false);
    setVideoUploadProgress(0);
    setSelectedVideoFile(null);
    setVideoUploadError(null);
    setIsDraggingVideo(false);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  const forceCloseModal = () => {
    resetVideoUploadState();
    setShowUnsavedConfirm(false);
    setIsCreateOpen(false);
    setEditingLesson(null);
    setInitialFormSnapshot('');
  };

  const requestCloseModal = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
      return;
    }
    forceCloseModal();
  };

  const [linkedContent, setLinkedContent] = useState<any>(null);

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500';

  // Load lessons from backend with fallback, ensuring all lessons are present, safe, and ordered
  const fetchLessons = async () => {
    setIsLoading(true);
    const baseline = buildBaselineLessons();
    try {
      const res = await lessonApi.list();
      const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (rawList.length > 0) {
        const mapped: ManagedLesson[] = rawList.map((l: any) => {
          const swingVid = JAVA_SWING_VIDEOS.find(v => v.lessonId === l.id);
          const isSwing = isSwingLessonItem({ id: l.id, courseId: l.course_id || l.courseId, module: l.module, track: l.track || l.metadata?.track });
          const track = (l.track || l.metadata?.track || (isSwing ? 'swing' : 'oop')) as 'oop' | 'swing';
          const rawSeq = Number(l.sequence || 1);
          const effectiveSeq = isSwing && rawSeq <= 5 ? 12 + rawSeq : rawSeq;

          let parsedObjectives: string[] = [];
          if (Array.isArray(l.learningObjectives)) {
            parsedObjectives = l.learningObjectives;
          } else if (Array.isArray(l.learning_objectives)) {
            parsedObjectives = l.learning_objectives;
          } else if (Array.isArray(l.concepts)) {
            parsedObjectives = l.concepts;
          } else if (typeof l.learningObjectives === 'string') {
            try {
              const p = JSON.parse(l.learningObjectives);
              parsedObjectives = Array.isArray(p) ? p : [l.learningObjectives];
            } catch {
              parsedObjectives = l.learningObjectives.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          } else if (typeof l.learning_objectives === 'string') {
            try {
              const p = JSON.parse(l.learning_objectives);
              parsedObjectives = Array.isArray(p) ? p : [l.learning_objectives];
            } catch {
              parsedObjectives = l.learning_objectives.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }

          const content = l.content || {};
          const existingAssessment = content.assessment;
          const assessmentQuestions = Array.isArray(existingAssessment?.questions)
            ? existingAssessment.questions
            : (typeof existingAssessment?.questions === 'string'
              ? (function() { try { const p = JSON.parse(existingAssessment.questions); return Array.isArray(p) ? p : []; } catch { return []; } })()
              : []);

          const safeContent = {
            video: content.video || null,
            assessment: existingAssessment ? {
              ...existingAssessment,
              questions: assessmentQuestions
            } : null,
            practice: content.practice || null
          };

          return {
            id: l.id,
            title: l.title || '',
            track,
            module: l.module || (isSwing ? 'Java Swing' : 'Object-Oriented Programming (Java)'),
            courseId: l.course_id || l.courseId || (isSwing ? 'java_swing' : 'oop_course_java'),
            sequence: effectiveSeq,
            videoUrl: l.video_url || l.videoUrl || safeContent.video?.videoUrl || swingVid?.embedUrl || '',
            description: l.description || '',
            learningObjectives: parsedObjectives,
            status: normalizeLessonStatus(l.status),
            citationText: l.citationText || l.citation_text || l.metadata?.citationText || l.metadata?.citation_text || '',
            citationUrl: l.citationUrl || l.citation_url || l.sourceUrl || l.source_url || l.metadata?.citationUrl || l.metadata?.citation_url || '',
            storageProvider: l.storageProvider || l.storage_provider || '',
            storageKey: l.storageKey || l.storage_key || '',
            content: safeContent,
            topics: Array.isArray(l.topics) ? l.topics : [],
            assessments: Array.isArray(l.assessments) ? l.assessments : (safeContent.assessment ? [safeContent.assessment] : []),
            practice_challenges: Array.isArray(l.practice_challenges) ? l.practice_challenges : (safeContent.practice ? [safeContent.practice] : []),
            createdBy: l.created_by || l.createdBy,
            createdAt: l.created_at || l.createdAt,
            updatedAt: l.updated_at || l.updatedAt
          };
        });

        const existingIds = new Set((mapped || []).map(item => item.id));
        for (const baseLesson of baseline) {
          if (!existingIds.has(baseLesson.id)) {
            mapped.push(baseLesson);
          }
        }

        const sorted = sortManagedLessons(mapped);
        setLessons(Array.isArray(sorted) ? sorted : baseline);
      } else {
        setLessons(baseline);
      }
    } catch {
      setLessons(baseline);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const oopLessonsCount = useMemo(() => (lessons || []).filter(l => !isSwingLessonItem(l)).length, [lessons]);
  const swingLessonsCount = useMemo(() => (lessons || []).filter(l => isSwingLessonItem(l)).length, [lessons]);

  const trackLessons = useMemo(() => {
    if (!Array.isArray(lessons)) return [];
    return lessons.filter(l => {
      if (!l) return false;
      return activeTrack === 'swing' ? isSwingLessonItem(l) : !isSwingLessonItem(l);
    });
  }, [lessons, activeTrack]);

  const statusCounts = useMemo(() => {
    const counts = { all: trackLessons.length, published: 0, draft: 0, archived: 0 };
    for (const l of trackLessons) {
      const s = normalizeLessonStatus(l.status);
      counts[s] += 1;
    }
    return counts;
  }, [trackLessons]);

  const filteredLessons = useMemo(() => {
    return trackLessons.filter(l => {
      const matchSearch =
        String(l.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(l.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(l.module || '').toLowerCase().includes(searchTerm.toLowerCase());
      const normalizedStatus = normalizeLessonStatus(l.status);
      const matchStatus = statusFilter === 'all' ? true : normalizedStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trackLessons, searchTerm, statusFilter]);

  const handleOpenCreate = (initialTab: ModalTab = 'lesson') => {
    const isSwingTrack = activeTrack === 'swing';
    const currentTrackLessons = (lessons || []).filter(l => (isSwingTrack ? isSwingLessonItem(l) : !isSwingLessonItem(l)));
    const nextSeq = currentTrackLessons.length > 0
      ? Math.max(...(currentTrackLessons || []).map(l => (isSwingTrack && l.sequence > 12 ? l.sequence - 12 : l.sequence))) + 1
      : 1;
    const initialQuestion = createDefaultQuestion(1);
    const nextForm = {
      track: activeTrack,
      title: '',
      module: isSwingTrack ? 'Java Swing' : 'Object-Oriented Programming (Java)',
      sequence: nextSeq,
      status: 'draft' as LessonStatus,
      description: '',
      learningObjectives: '',
      citationText: '',
      citationUrl: '',
      videoUrl: '',
      enableAssessment: true,
      assessmentTitle: '',
      assessmentQuizType: 'Multiple Choice',
      assessmentPassingScore: isSwingTrack ? SWING_PASSING_PERCENTAGE : ASSESSMENT_PASSING_SCORE,
      assessmentAttempts: 3,
      assessmentStatus: 'Published' as 'Draft' | 'Published',
      assessmentQuestions: [initialQuestion],
      enablePractice: true,
      practiceTitle: '',
      practiceDescription: '',
      practiceStarterCode: DEFAULT_STARTER_CODE,
      practiceSampleInput: '',
      practiceSampleOutput: 'Hello, World!',
      practicePassingScore: isSwingTrack ? SWING_PASSING_PERCENTAGE : 70,
      practiceStatus: 'Published' as 'Draft' | 'Published'
    };
    setFormData(nextForm);
    setInitialFormSnapshot(JSON.stringify(nextForm));
    setRawQuestionsJson(JSON.stringify([initialQuestion], null, 2));
    setJsonMode(false);
    setLinkedContent(null);
    resetVideoUploadState();
    setVideoSourceMode('upload');
    setActiveModalTab(initialTab);
    setShowUnsavedConfirm(false);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (lesson: ManagedLesson, initialTab: ModalTab = 'lesson') => {
    if (!lesson) return;
    setEditingLesson(lesson);
    const content = (lesson as any).content || { video: null, assessment: null, practice: null };
    const existingAssessment = content.assessment;
    const existingPractice = content.practice;

    // Baseline from static OOP or Java Swing catalogs if not present in DB
    const staticOopAssessment = OOP_ASSESSMENTS.find(a => a.lessonId === lesson.id);
    const staticSwingAssessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === lesson.id);
    const staticAssessment: any = staticOopAssessment || staticSwingAssessment;

    let rawQuestions: any[] = [];
    if (Array.isArray(existingAssessment?.questions) && existingAssessment.questions.length > 0) {
      rawQuestions = existingAssessment.questions;
    } else if (typeof existingAssessment?.questions === 'string') {
      try {
        const p = JSON.parse(existingAssessment.questions);
        if (Array.isArray(p)) rawQuestions = p;
      } catch {}
    } else if (Array.isArray(staticAssessment?.questions) && staticAssessment.questions.length > 0) {
      rawQuestions = staticAssessment.questions;
    }

    const initialQuestions: AssessmentQuestionDraft[] =
      rawQuestions.length > 0
        ? rawQuestions.map((q: any, idx: number) => normalizeQuestionDraft(q, idx)).reverse()
        : [createDefaultQuestion(1)];

    const staticOopPractice = PRACTICE_CHALLENGES.find(c => c.lessonId === lesson.id);
    const staticSwingExercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === lesson.id);
    const staticPractice: any = staticOopPractice || (staticSwingExercise
      ? {
          id: staticSwingExercise.id,
          lessonId: staticSwingExercise.lessonId,
          title: staticSwingExercise.title,
          description: staticSwingExercise.description,
          starterCode: staticSwingExercise.starterCode,
          sampleInput: staticSwingExercise.sampleInput || 'No stdin required',
          sampleOutput: staticSwingExercise.sampleOutput || '',
          passingScore: SWING_PASSING_PERCENTAGE
        }
      : null);

    const staticOopLesson = OOP_COURSE_LESSONS.find(l => l.id === lesson.id);
    const staticSwingVideo = JAVA_SWING_VIDEOS.find(v => v.lessonId === lesson.id);
    const isSwing = isSwingLessonItem(lesson);

    const existingCitationText =
      lesson.citationText ||
      (lesson as any).citation_text ||
      (lesson as any).metadata?.citationText ||
      (lesson as any).metadata?.citation_text ||
      staticOopLesson?.citation_text ||
      (staticOopLesson?.creator_name ? `${staticOopLesson.creator_name}. ${staticOopLesson.video_title || staticOopLesson.title}. ${staticOopLesson.publisher_name || 'Oracle'}.` : '') ||
      (isSwing ? 'Oracle. (n.d.). Trail: Creating a GUI With Swing (The Java Tutorials). Oracle Documentation.' : '');
    const existingCitationUrl =
      lesson.citationUrl ||
      (lesson as any).citation_url ||
      (lesson as any).sourceUrl ||
      (lesson as any).source_url ||
      (lesson as any).metadata?.citationUrl ||
      (lesson as any).metadata?.citation_url ||
      staticOopLesson?.citation_url ||
      staticOopLesson?.source_url ||
      (isSwing ? 'https://docs.oracle.com/javase/tutorial/uiswing/' : '');

    const track = (lesson.track || (isSwing ? 'swing' : 'oop')) as 'oop' | 'swing';
    const displaySeq = isSwing && lesson.sequence > 12 ? lesson.sequence - 12 : (lesson.sequence || 1);

    const nextForm = {
      track,
      title: lesson.title || '',
      module: lesson.module || (isSwing ? 'Java Swing' : 'Object-Oriented Programming (Java)'),
      sequence: displaySeq,
      status: normalizeLessonStatus(lesson.status),
      description: lesson.description || '',
      learningObjectives: Array.isArray(lesson.learningObjectives)
        ? lesson.learningObjectives.join('\n')
        : typeof (lesson as any).learningObjectives === 'string'
        ? (lesson as any).learningObjectives
        : '',
      citationText: existingCitationText,
      citationUrl: existingCitationUrl,
      videoUrl: lesson.videoUrl || content.video?.videoUrl || staticSwingVideo?.embedUrl || staticOopLesson?.videoUrl || '',
      enableAssessment: true,
      assessmentTitle: existingAssessment?.title || staticAssessment?.title || `${lesson.title || 'Lesson'} Assessment`,
      assessmentQuizType: existingAssessment?.quizType || 'Multiple Choice',
      assessmentPassingScore: Number(existingAssessment?.passingScore ?? staticAssessment?.passingPercentage ?? (isSwing ? SWING_PASSING_PERCENTAGE : ASSESSMENT_PASSING_SCORE)),
      assessmentAttempts: Number(existingAssessment?.attempts ?? 3),
      assessmentStatus: (existingAssessment?.status as any) || 'Published',
      assessmentQuestions: initialQuestions,
      enablePractice: true,
      practiceTitle: existingPractice?.title || staticPractice?.title || `${lesson.title || 'Lesson'} Practice Challenge`,
      practiceDescription: existingPractice?.description || staticPractice?.description || '',
      practiceStarterCode: existingPractice?.starterCode || staticPractice?.starterCode || DEFAULT_STARTER_CODE,
      practiceSampleInput: existingPractice?.sampleInput || staticPractice?.sampleInput || '',
      practiceSampleOutput: existingPractice?.sampleOutput || staticPractice?.sampleOutput || 'Expected Program Output',
      practicePassingScore: Number(existingPractice?.passingScore ?? staticPractice?.passingScore ?? (isSwing ? SWING_PASSING_PERCENTAGE : 70)),
      practiceStatus: (existingPractice?.status as any) || 'Published'
    };

    setFormData(nextForm);
    setInitialFormSnapshot(JSON.stringify(nextForm));
    setRawQuestionsJson(JSON.stringify(initialQuestions, null, 2));
    setJsonMode(false);
    setLinkedContent({
      video: content.video || null,
      assessment: existingAssessment || (staticAssessment ? { id: staticAssessment.id } : null),
      practice: existingPractice || (staticPractice ? { id: staticPractice.id } : null)
    });
    resetVideoUploadState();
    setVideoSourceMode(nextForm.videoUrl && isYouTubeUrl(nextForm.videoUrl) ? 'url' : 'upload');
    setShowUnsavedConfirm(false);
    setActiveModalTab(initialTab);
  };

  const uploadVideoToCloudinary = (file: File) => {
    const validationError = validateDeviceVideoFile(file);
    if (validationError) {
      setVideoUploadError(validationError);
      showToast('error', validationError);
      return;
    }

    const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
    if (!cloudName || !uploadPreset) {
      const msg =
        'Cloudinary video upload is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your environment variables, or switch to "Paste Video URL".';
      setVideoUploadError(msg);
      showToast('error', 'Cloudinary environment variables are missing.');
      return;
    }

    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
    }

    setVideoUploadError(null);
    setSelectedVideoFile({ name: file.name, size: file.size });
    setIsUploadingVideo(true);
    setVideoUploadProgress(0);

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`;
    const payload = new FormData();
    payload.append('file', file);
    payload.append('upload_preset', uploadPreset);

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
        setVideoUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      uploadXhrRef.current = null;
      setIsUploadingVideo(false);
      let parsed: any = null;
      try {
        parsed = JSON.parse(xhr.responseText || '{}');
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed?.secure_url) {
        setVideoUploadProgress(100);
        setFormData(prev => ({ ...prev, videoUrl: parsed.secure_url }));
        showToast('success', 'Video uploaded successfully! Preview it below and save when ready.');
      } else {
        const errMsg =
          parsed?.error?.message ||
          `Video upload failed (status ${xhr.status}). Please check your Cloudinary upload preset and try again.`;
        setVideoUploadError(errMsg);
        showToast('error', errMsg);
      }
    };

    xhr.onerror = () => {
      uploadXhrRef.current = null;
      setIsUploadingVideo(false);
      const errMsg = 'Network error while uploading video to Cloudinary. Please check your connection and try again.';
      setVideoUploadError(errMsg);
      showToast('error', errMsg);
    };

    xhr.onabort = () => {
      uploadXhrRef.current = null;
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
    };

    xhr.open('POST', endpoint, true);
    xhr.send(payload);
  };

  const handleVideoFileSelect = (file?: File | null) => {
    if (!file) return;
    uploadVideoToCloudinary(file);
  };

  const handleCancelVideoUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      uploadXhrRef.current = null;
    }
    setIsUploadingVideo(false);
    setVideoUploadProgress(0);
    setSelectedVideoFile(null);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    showToast('success', 'Video upload cancelled.');
  };

  const handleRemoveVideo = () => {
    setFormData(prev => ({ ...prev, videoUrl: '' }));
    setSelectedVideoFile(null);
    setVideoUploadProgress(0);
    setVideoUploadError(null);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  };

  const persistLinkedVideo = async (lessonId: string, videoUrl: string, targetStatus: LessonStatus) => {
    if (!videoUrl || !lessonId || lessonId === '0' || lessonId === 'NaN') return;
    try {
      const existing = (await videoApi.list(lessonId)).data?.[0];
      const titleCaseStatus = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1);
      const videoPayload: any = {
        lessonId,
        title: formData.title.trim(),
        videoUrl,
        description: formData.description.trim(),
        status: titleCaseStatus,
        storageProvider: '',
        storageKey: '',
        storageContentType: '',
        storageSize: null
      };
      if (existing) await videoApi.update(existing.id, videoPayload);
      else await videoApi.create(videoPayload);
    } catch (err: any) {
      console.warn('Persist linked video warning:', err.message);
    }
  };

  // Question manipulation helpers
  const handleAddQuestion = () => {
    const newQ = createDefaultQuestion(formData.assessmentQuestions.length + 1);
    setFormData(prev => {
      const updated = [newQ, ...prev.assessmentQuestions];
      setRawQuestionsJson(JSON.stringify(updated, null, 2));
      return { ...prev, enableAssessment: true, assessmentQuestions: updated };
    });

    setHighlightedQuestionId(newQ.id);
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedQuestionId(curr => (curr === newQ.id ? null : curr));
    }, 1800);

    requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      const promptInput = questionInputRefs.current[newQ.id];
      if (promptInput) {
        promptInput.focus();
        promptInput.select();
      }
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setFormData(prev => {
      const updated = prev.assessmentQuestions.filter(q => q.id !== questionId);
      setRawQuestionsJson(JSON.stringify(updated, null, 2));
      return { ...prev, assessmentQuestions: updated };
    });
    delete questionInputRefs.current[questionId];
  };

  const handleUpdateQuestion = (questionId: string, patch: Partial<AssessmentQuestionDraft>) => {
    setFormData(prev => {
      const updated = prev.assessmentQuestions.map(q => (q.id === questionId ? { ...q, ...patch } : q));
      setRawQuestionsJson(JSON.stringify(updated, null, 2));
      return { ...prev, assessmentQuestions: updated };
    });
  };

  const handleApplyQuestionsJson = () => {
    try {
      const parsed = JSON.parse(rawQuestionsJson);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((q, idx) => normalizeQuestionDraft(q, idx));
        setFormData(prev => ({ ...prev, assessmentQuestions: normalized }));
        setRawQuestionsJson(JSON.stringify(normalized, null, 2));
        setJsonMode(false);
        showToast('success', `Successfully loaded ${normalized.length} assessment questions from JSON.`);
      } else {
        showToast('error', 'JSON root must be an array of question objects.');
      }
    } catch (err: any) {
      showToast('error', `Invalid JSON syntax: ${err.message}`);
    }
  };

  const saveLessonWithStatus = async (targetStatus: LessonStatus) => {
    if (isUploadingVideo) {
      showToast('error', 'Please wait for the video upload to finish before saving.');
      setActiveModalTab('video');
      return;
    }

    const isDraftSave = targetStatus === 'draft';

    // 1. Validate Lesson (draft only requires title and curriculum_track)
    if (!formData.title.trim()) {
      showToast('error', 'Lesson title is required.');
      setActiveModalTab('lesson');
      return;
    }

    const rawSeq = Number(formData.sequence);
    const seq = Number.isFinite(rawSeq) && !Number.isNaN(rawSeq) && rawSeq >= 0 ? rawSeq : 0;

    if (!isDraftSave) {
      if (!Number.isFinite(rawSeq) || Number.isNaN(rawSeq) || rawSeq < 0) {
        showToast('error', 'Lesson sequence must be a valid non-negative number.');
        setActiveModalTab('lesson');
        return;
      }

      // 2. Validate Video
      if (formData.videoUrl.trim()) {
        const urlError = validateVideoUrl(formData.videoUrl);
        if (urlError) {
          showToast('error', urlError);
          setActiveModalTab('video');
          return;
        }
      }

      // 3. Validate Assessment
      if (formData.enableAssessment) {
        const passScore = Number(formData.assessmentPassingScore);
        if (!Number.isFinite(passScore) || Number.isNaN(passScore) || passScore < 0 || passScore > 100) {
          showToast('error', 'Assessment passing score must be between 0 and 100.');
          setActiveModalTab('assessment');
          return;
        }
        const attempts = Number(formData.assessmentAttempts);
        if (!Number.isFinite(attempts) || attempts < 1) {
          showToast('error', 'Assessment attempts must be at least 1.');
          setActiveModalTab('assessment');
          return;
        }
        for (let i = 0; i < formData.assessmentQuestions.length; i++) {
          const q = formData.assessmentQuestions[i];
          if (!q.question.trim()) {
            const displayNumber = formData.assessmentQuestions.length - i;
            showToast('error', `Question Q${displayNumber} requires a question prompt.`);
            setActiveModalTab('assessment');
            return;
          }
        }
      }

      // 4. Validate Practice IDE
      if (formData.enablePractice) {
        if (!formData.practiceTitle.trim()) {
          showToast('error', 'Practice IDE challenge title is required when practice is enabled.');
          setActiveModalTab('practice');
          return;
        }
        const passScore = Number(formData.practicePassingScore);
        if (!Number.isFinite(passScore) || Number.isNaN(passScore) || passScore < 0 || passScore > 100) {
          showToast('error', 'Practice passing score must be between 0 and 100.');
          setActiveModalTab('practice');
          return;
        }
      }
    }

    const objectives = formData.learningObjectives
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean);

    setIsSaving(true);
    const isSwingTrack = formData.track === 'swing';
    const effectiveSeq = isSwingTrack && seq <= 5 ? 12 + seq : seq;
    const lessonId = editingLesson?.id || (isSwingTrack ? `swing_lesson_${Date.now()}` : `oop_lesson_${Date.now()}`);
    const lessonPayload = {
      id: lessonId,
      track: formData.track,
      curriculum_track: formData.track,
      title: formData.title.trim(),
      module: formData.module.trim(),
      sequence: effectiveSeq,
      videoUrl: formData.videoUrl.trim(),
      description: formData.description.trim(),
      learningObjectives: objectives,
      concepts: objectives,
      status: targetStatus,
      citationText: formData.citationText.trim(),
      citationUrl: formData.citationUrl.trim(),
      metadata: {
        track: formData.track,
        citationText: formData.citationText.trim(),
        citationUrl: formData.citationUrl.trim(),
        sourceUrl: formData.citationUrl.trim()
      },
      storageProvider: '',
      storageKey: '',
      storageContentType: '',
      storageSize: null
    };

    try {
      let savedId = lessonId;
      const isSwing = isSwingTrack || isSwingLessonItem({ id: lessonId, courseId: editingLesson?.courseId, module: formData.module, track: formData.track });
      if (editingLesson) {
        const res = await lessonApi.update(editingLesson.id, lessonPayload);
        savedId = res?.data?.id || editingLesson.id;
      } else {
        const res = await lessonApi.create({ courseId: isSwing ? 'java_swing' : 'oop_course_java', ...lessonPayload });
        savedId = res?.data?.id || lessonId;
      }

      // Persist Video if a valid URL is provided
      const trimmedVideoUrl = formData.videoUrl.trim();
      if (trimmedVideoUrl && savedId && (!isDraftSave || !validateVideoUrl(trimmedVideoUrl))) {
        await persistLinkedVideo(savedId, trimmedVideoUrl, targetStatus);
      }

      // Persist Assessment
      const hasDraftAssessmentContent =
        Boolean(formData.assessmentTitle.trim()) ||
        (formData.assessmentQuestions || []).some(q => q.question.trim());
      if (formData.enableAssessment && savedId && savedId !== '0' && savedId !== 'NaN' && (!isDraftSave || hasDraftAssessmentContent)) {
        const assessmentTitle = formData.assessmentTitle.trim() || `${formData.title.trim()} Assessment`;
        // Save questions in chronological order (Q1 -> QN) so students always take the quiz starting from Q1
        const serializedQuestions = [...(formData.assessmentQuestions || [])].reverse().map(q => {
          const correctOpt = (q.options || []).find(o => o.id === q.correctOptionId);
          return {
            ...q,
            options: (q.options || []).map(opt => ({ ...opt })),
            correctAnswer: correctOpt?.text || q.correctAnswer || '',
            explanation: correctOpt?.rationale || q.explanation || ''
          };
        });
        const safePassScore = Number.isFinite(Number(formData.assessmentPassingScore))
          ? Math.min(100, Math.max(0, Number(formData.assessmentPassingScore)))
          : ASSESSMENT_PASSING_SCORE;
        const safeAttempts = Number.isFinite(Number(formData.assessmentAttempts)) && Number(formData.assessmentAttempts) >= 1
          ? Number(formData.assessmentAttempts)
          : 3;
        const assessmentPayload = {
          lessonId: savedId,
          title: assessmentTitle,
          quizType: formData.assessmentQuizType,
          passingScore: safePassScore,
          attempts: safeAttempts,
          questions: serializedQuestions,
          status: targetStatus === 'published' ? 'Published' : 'Draft'
        };

        if (linkedContent?.assessment?.id) {
          await assessmentApi.update(linkedContent.assessment.id, assessmentPayload);
        } else {
          await assessmentApi.create({
            id: `quiz_${savedId}_${Date.now()}`,
            ...assessmentPayload
          });
        }
      }

      // Persist Practice IDE Challenge
      const hasDraftPracticeContent =
        Boolean(formData.practiceTitle.trim()) || Boolean(formData.practiceDescription.trim());
      if (formData.enablePractice && savedId && savedId !== '0' && savedId !== 'NaN' && (!isDraftSave || hasDraftPracticeContent)) {
        const practiceTitle = formData.practiceTitle.trim() || `${formData.title.trim()} Practice Exercise`;
        const safePracticeScore = Number.isFinite(Number(formData.practicePassingScore))
          ? Math.min(100, Math.max(0, Number(formData.practicePassingScore)))
          : 70;
        const practicePayload = {
          lessonId: savedId,
          topicId: isSwing ? 'java_swing' : 'oop',
          title: practiceTitle,
          description: formData.practiceDescription.trim(),
          starterCode: formData.practiceStarterCode,
          sampleOutput: formData.practiceSampleOutput,
          sampleInput: formData.practiceSampleInput,
          passingScore: safePracticeScore,
          status: targetStatus === 'published' ? 'Published' : 'Draft'
        };

        if (linkedContent?.practice?.id) {
          await practiceApi.updateChallenge(linkedContent.practice.id, practicePayload);
        } else {
          await practiceApi.createChallenge({
            id: `practice_${savedId}_${Date.now()}`,
            ...practicePayload
          });
        }
      }

      if (isDraftSave) {
        showToast('success', 'Lesson saved as draft — you can resume anytime.');
      } else {
        showToast(
          'success',
          editingLesson
            ? `Lesson "${formData.title.trim()}" published and updated successfully.`
            : `Lesson "${formData.title.trim()}" created and published successfully.`
        );
      }

      forceCloseModal();
      await fetchLessons();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save lesson and consolidated content.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveLessonWithStatus('published');
  };

  const handleStatusChange = async (lesson: ManagedLesson, nextStatus: LessonStatus) => {
    setOpenMenuLessonId(null);
    try {
      await lessonApi.updateStatus(lesson.id, nextStatus);
      const statusMessages: Record<LessonStatus, string> = {
        published: `Lesson "${lesson.title}" is now published and visible to students.`,
        draft: `Lesson "${lesson.title}" moved to Draft (Paused).`,
        archived: `Lesson "${lesson.title}" has been archived.`
      };
      showToast('success', statusMessages[nextStatus]);
      fetchLessons();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update lesson status.');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await lessonApi.updateStatus(archiveTarget.id, 'archived');
      showToast('success', `Lesson "${archiveTarget.title}" has been archived.`);
      setArchiveTarget(null);
      fetchLessons();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to archive lesson.');
    }
  };

  const handleArchiveInsteadOfDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await lessonApi.updateStatus(deleteTarget.id, 'archived');
      showToast('success', `Lesson "${deleteTarget.title}" archived — student records preserved.`);
      setDeleteTarget(null);
      fetchLessons();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to archive lesson.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await lessonApi.remove(deleteTarget.id);
      showToast('success', `Lesson "${deleteTarget.title}" and its linked content were deleted permanently.`);
      setDeleteTarget(null);
      if (editingLesson?.id === deleteTarget.id) {
        forceCloseModal();
      }
      fetchLessons();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete lesson.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveSequence = async (lesson: ManagedLesson, direction: 'up' | 'down') => {
    const currentIndex = filteredLessons.findIndex(l => l.id === lesson.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredLessons.length) return;

    const targetLesson = filteredLessons[targetIndex];
    try {
      await Promise.all([
        lessonApi.update(lesson.id, { sequence: targetLesson.sequence }),
        lessonApi.update(targetLesson.id, { sequence: lesson.sequence })
      ]);
      fetchLessons();
    } catch {
      fetchLessons();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Action Header */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <BookOpen className="h-3.5 w-3.5" />
                Consolidated Curriculum Hub
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {activeTrack === 'oop' ? `${oopLessonsCount} OOP Lessons` : `${swingLessonsCount} Swing Lessons`} ({statusCounts.published} Published in Track)
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">Lesson & Content Management</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage complete pedagogical workflows in a single place: Lesson metadata, Video tutorials, Assessments, and Practice IDE exercises.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenCreate('lesson')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Lesson
          </button>
        </div>

        {/* Track Separation Tabs */}
        <div className="mt-5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTrack('oop')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              activeTrack === 'oop'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Java OOP Curriculum</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTrack === 'oop'
                  ? 'bg-emerald-700/80 text-white'
                  : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {oopLessonsCount} Lessons
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTrack('swing')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              activeTrack === 'swing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Java Swing Curriculum</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTrack === 'swing'
                  ? 'bg-emerald-700/80 text-white'
                  : isDark
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {swingLessonsCount} Lessons
            </span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center justify-between rounded-xl border p-3 text-xs font-bold ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Status Filter Pill Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'published', label: 'Published', count: statusCounts.published },
              { id: 'draft', label: 'Drafts (Paused)', count: statusCounts.draft },
              { id: 'archived', label: 'Archived', count: statusCounts.archived }
            ] as const
          ).map(tab => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black transition cursor-pointer border ${
                  isSelected
                    ? tab.id === 'draft'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : tab.id === 'archived'
                      ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons by title, topic, or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            />
          </div>
        </div>
      </div>

      {/* Lesson List / Table */}
      <div className={`rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase tracking-wider text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className="px-4 py-3.5 font-black text-center w-16">Seq</th>
                <th className="px-4 py-3.5 font-black">Lesson Title & Module</th>
                <th className="px-4 py-3.5 font-black">Linked Workflow Content</th>
                <th className="px-4 py-3.5 font-black">Objectives</th>
                <th className="px-4 py-3.5 font-black text-center">Status</th>
                <th className="px-4 py-3.5 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Loading lesson directory...
                  </td>
                </tr>
              ) : (filteredLessons || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No lessons found matching your filters.
                  </td>
                </tr>
              ) : (
                (filteredLessons || []).map((lesson, idx) => {
                  const hasVideo = Boolean(
                    lesson.videoUrl ||
                    lesson.content?.video?.id ||
                    JAVA_SWING_VIDEOS.some(v => v.lessonId === lesson.id)
                  );
                  const hasAssessment = Boolean(
                    lesson.content?.assessment?.id ||
                    OOP_ASSESSMENTS.some(a => a.lessonId === lesson.id) ||
                    JAVA_SWING_ASSESSMENTS.some(a => a.lessonId === lesson.id)
                  );
                  const hasPractice = Boolean(
                    lesson.content?.practice?.id ||
                    PRACTICE_CHALLENGES.some(c => c.lessonId === lesson.id) ||
                    JAVA_SWING_EXERCISES.some(e => e.lessonId === lesson.id)
                  );

                  const isSwing = isSwingLessonItem(lesson);
                  const displaySeq = isSwing && lesson.sequence > 12 ? lesson.sequence - 12 : lesson.sequence;

                  return (
                    <tr key={lesson.id} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                      {/* Sequence with Move Up/Down */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            #{displaySeq}
                          </span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveSequence(lesson, 'up')}
                              className="p-0.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === filteredLessons.length - 1}
                              onClick={() => handleMoveSequence(lesson, 'down')}
                              className="p-0.5 text-slate-400 hover:text-emerald-600 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="px-4 py-3">
                        <div>
                          <strong className="block text-xs font-black text-slate-900 dark:text-white">
                            {lesson.title}
                          </strong>
                          <span className="block text-[11px] text-slate-400 truncate max-w-sm">
                            {lesson.description || 'No description provided.'}
                          </span>
                          <span className="mt-0.5 inline-block text-[10px] font-bold text-slate-400">
                            {lesson.module}
                          </span>
                        </div>
                      </td>

                      {/* Consolidated Linked Content Badges (Interactive Buttons) */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Video Badge */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lesson, 'video')}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black transition cursor-pointer ${
                              hasVideo
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60'
                                : 'border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400'
                            }`}
                            title={hasVideo ? 'Edit Video Tutorial (Tab 2)' : 'Add Video Tutorial (Tab 2)'}
                          >
                            {hasVideo ? <Play className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                            {hasVideo ? 'Video' : 'Add Video'}
                          </button>

                          {/* Assessment Badge */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lesson, 'assessment')}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black transition cursor-pointer ${
                              hasAssessment
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                                : 'border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                            title={hasAssessment ? 'Edit Assessment Quiz (Tab 3)' : 'Add Assessment Quiz (Tab 3)'}
                          >
                            {hasAssessment ? <FileQuestion className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                            {hasAssessment
                              ? `Quiz (${lesson.content?.assessment?.passingScore || ASSESSMENT_PASSING_SCORE}%)`
                              : 'Add Quiz'}
                          </button>

                          {/* Practice IDE Badge */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lesson, 'practice')}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black transition cursor-pointer ${
                              hasPractice
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                : 'border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}
                            title={hasPractice ? 'Edit Practice IDE Challenge (Tab 4)' : 'Add Practice IDE Challenge (Tab 4)'}
                          >
                            {hasPractice ? <Code2 className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                            {hasPractice ? 'Practice IDE' : 'Add IDE'}
                          </button>
                        </div>
                      </td>

                      {/* Learning Objectives */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(() => {
                            const objs = normalizeObjectivesArray(lesson?.learningObjectives);
                            return (
                              <>
                                {objs.slice(0, 2).map((obj, i) => (
                                  <span
                                    key={i}
                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {obj}
                                  </span>
                                ))}
                                {objs.length > 2 && (
                                  <span className="text-[10px] text-slate-400 font-bold self-center">
                                    +{objs.length - 2} more
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const lessonStatus = normalizeLessonStatus(lesson.status);
                          const badgeStyles =
                            lessonStatus === 'published'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : lessonStatus === 'draft'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
                          const badgeLabel =
                            lessonStatus === 'published'
                              ? 'PUBLISHED'
                              : lessonStatus === 'draft'
                              ? 'DRAFT (PAUSED)'
                              : 'ARCHIVED';
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${badgeStyles}`}
                            >
                              {badgeLabel}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const lessonStatus = normalizeLessonStatus(lesson.status);
                          const isMenuOpen = openMenuLessonId === lesson.id;
                          const openUpward = idx >= filteredLessons.length - 2 && filteredLessons.length > 2;
                          return (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(lesson, 'lesson')}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-xs ${
                                  lessonStatus === 'draft'
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                {lessonStatus === 'draft' ? 'Resume' : 'Edit'}
                              </button>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setOpenMenuLessonId(isMenuOpen ? null : lesson.id);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                    isDark
                                      ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                  }`}
                                >
                                  <span>More</span>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className={`absolute right-0 z-30 w-52 rounded-xl border py-1.5 shadow-xl text-left ${
                                      openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                    } ${
                                      isDark
                                        ? 'border-slate-700 bg-slate-900 text-slate-200'
                                        : 'border-slate-200 bg-white text-slate-700'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuLessonId(null);
                                        setPreviewingLesson(lesson);
                                      }}
                                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Preview</span>
                                    </button>

                                    {lessonStatus === 'published' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(lesson, 'draft')}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                          isDark ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-amber-50 text-amber-700'
                                        }`}
                                      >
                                        <PauseCircle className="h-3.5 w-3.5" />
                                        <span>Pause (Move to Draft)</span>
                                      </button>
                                    )}

                                    {lessonStatus === 'draft' && (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(lesson, 'published')}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                          isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-700'
                                        }`}
                                      >
                                        <Send className="h-3.5 w-3.5" />
                                        <span>Publish Now</span>
                                      </button>
                                    )}

                                    {lessonStatus === 'archived' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(lesson, 'draft')}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                          isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-700'
                                        }`}
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Restore to Draft</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuLessonId(null);
                                          setArchiveTarget(lesson);
                                        }}
                                        className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                                          isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                                        }`}
                                      >
                                        <Archive className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Archive Lesson</span>
                                      </button>
                                    )}

                                    <div className={`my-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuLessonId(null);
                                        setDeleteTarget(lesson);
                                      }}
                                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-black text-rose-600 transition cursor-pointer ${
                                        isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-50'
                                      }`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete Permanently</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONSOLIDATED CREATE / EDIT MODAL */}
      {(isCreateOpen || editingLesson) && (
        <div
          onClick={requestCloseModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-5xl rounded-2xl border p-6 shadow-2xl my-8 flex flex-col max-h-[90vh] ${cardClass}`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-600/10 p-2 text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black">
                      {editingLesson ? `Edit Lesson: ${editingLesson.title}` : 'Create New Lesson & Content Workflow'}
                    </h3>
                    {isDirty && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Consolidated lesson, video tutorial, assessment quiz, and Practice IDE configuration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseModal}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs Bar inside Modal */}
            <div className="flex items-center gap-2 border-b py-3 dark:border-slate-800 shrink-0 overflow-x-auto">
              {[
                { id: 'lesson', label: '1. Lesson Details', icon: BookOpen },
                { id: 'video', label: '2. Video Tutorial', icon: Video, active: Boolean(formData.videoUrl) },
                {
                  id: 'assessment',
                  label: `3. Assessment (${(formData.assessmentQuestions || []).length} Qs)`,
                  icon: FileQuestion,
                  active: formData.enableAssessment
                },
                {
                  id: 'practice',
                  label: '4. Practice IDE Coding',
                  icon: Code2,
                  active: formData.enablePractice
                }
              ].map(tab => {
                const TabIcon = tab.icon;
                const isSelected = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isDark
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.active && !isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Body / Scrollable Form */}
            <form ref={modalBodyRef} onSubmit={handleSaveLesson} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* SECTION 1: LESSON DETAILS */}
              {activeModalTab === 'lesson' && (
                <div className="space-y-4">
                  {/* Curriculum Track Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      Curriculum Track *
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          formData.track === 'oop'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="curriculumTrack"
                          value="oop"
                          checked={formData.track === 'oop'}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              track: 'oop',
                              module: prev.module === 'Java Swing' ? 'Object-Oriented Programming (Java)' : prev.module,
                              assessmentPassingScore: ASSESSMENT_PASSING_SCORE,
                              practicePassingScore: 70
                            }));
                          }}
                          className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-black">Java OOP Curriculum</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Core OOP concepts, classes, inheritance, polymorphism, and encapsulation.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                          formData.track === 'swing'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="curriculumTrack"
                          value="swing"
                          checked={formData.track === 'swing'}
                          onChange={() => {
                            setFormData(prev => ({
                              ...prev,
                              track: 'swing',
                              module: prev.module === 'Object-Oriented Programming (Java)' ? 'Java Swing' : prev.module,
                              assessmentPassingScore: SWING_PASSING_PERCENTAGE,
                              practicePassingScore: SWING_PASSING_PERCENTAGE
                            }));
                          }}
                          className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-black">Java Swing Curriculum</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Desktop GUI, event handling, components, layout managers, and custom dialogs.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        Lesson Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Encapsulation & Data Hiding in Java"
                        value={formData.title}
                        onChange={e => {
                          const newTitle = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            title: newTitle,
                            assessmentTitle: prev.assessmentTitle || `${newTitle} Assessment`,
                            practiceTitle: prev.practiceTitle || `${newTitle} Practice Challenge`
                          }));
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        Sequence Order #
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.sequence}
                        onChange={e => setFormData({ ...formData, sequence: Number(e.target.value) })}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        Course Module
                      </label>
                      <input
                        type="text"
                        value={formData.module}
                        onChange={e => setFormData({ ...formData, module: e.target.value })}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                        Publication Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as LessonStatus })}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                      >
                        <option value="draft">Draft (Paused — Hidden from students)</option>
                        <option value="published">Published (Active & Visible)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                      Pedagogical Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain the conceptual foundation and learning objectives of this lesson..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                      Learning Objectives (one per line)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain private access modifier&#10;Implement getter and setter methods&#10;Protect class invariants through validation"
                      value={formData.learningObjectives}
                      onChange={e => setFormData({ ...formData, learningObjectives: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                    />
                  </div>

                  {/* CITATION & ACADEMIC REFERENCES */}
                  <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black">Pedagogical Citation & Academic References</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Document textbook sources, Oracle Java documentation, or authoritative academic citations associated with this lesson.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Citation Text (APA / Academic format)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Classes (The Java Tutorials > Learning the Java Language > Classes and Objects). (n.d.). Oracle."
                          value={formData.citationText}
                          onChange={e => setFormData({ ...formData, citationText: e.target.value })}
                          className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Citation Source URL
                        </label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="url"
                            placeholder="https://docs.oracle.com/..."
                            value={formData.citationUrl}
                            onChange={e => setFormData({ ...formData, citationUrl: e.target.value })}
                            className={`w-full rounded-xl border pl-8 pr-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: VIDEO TUTORIAL */}
              {activeModalTab === 'video' && (
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 ${isDark ? 'border-sky-900/50 bg-sky-950/20' : 'border-sky-100 bg-sky-50'}`}>
                    <div className="flex items-start gap-2.5">
                      <Video className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-sky-900 dark:text-sky-200">
                          Pedagogical Progression Requirement
                        </h4>
                        <p className="mt-1 text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                          Students must complete at least <b>95%</b> of this video before the lesson Assessment unlocks. Upload a video directly from your device (MP4, WebM, MOV up to 100 MB) or paste a YouTube / direct MP4 URL.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2-Option Video Source Toggle */}
                  <div className={`inline-flex rounded-xl border p-1 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'}`}>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => {
                        setVideoSourceMode('upload');
                        setVideoUploadError(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition cursor-pointer disabled:opacity-60 ${
                        videoSourceMode === 'upload'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Upload from Device
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingVideo}
                      onClick={() => {
                        setVideoSourceMode('url');
                        setVideoUploadError(null);
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition cursor-pointer disabled:opacity-60 ${
                        videoSourceMode === 'url'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Paste Video URL
                    </button>
                  </div>

                  {/* Hidden file input shared by Dropzone and Replace Video */}
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      handleVideoFileSelect(file);
                      e.target.value = '';
                    }}
                  />

                  {videoSourceMode === 'upload' ? (
                    <div className="space-y-4">
                      {/* Error Message */}
                      {videoUploadError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="flex-1 leading-relaxed">{videoUploadError}</span>
                          <button
                            type="button"
                            onClick={() => setVideoUploadError(null)}
                            className="text-rose-400 hover:text-rose-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Live Upload Progress Bar */}
                      {isUploadingVideo ? (
                        <div className={`rounded-2xl border p-6 space-y-3 ${isDark ? 'border-emerald-900/50 bg-slate-950/60' : 'border-emerald-200 bg-emerald-50/40'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="rounded-lg bg-emerald-600/15 p-2 text-emerald-600 shrink-0">
                                <UploadCloud className="h-5 w-5 animate-pulse" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate">
                                  Uploading {selectedVideoFile?.name || 'video'}...
                                </p>
                                <p className="text-[11px] text-slate-400 font-bold">
                                  {selectedVideoFile ? formatFileSize(selectedVideoFile.size) : ''} • Direct upload to Cloudinary
                                </p>
                              </div>
                            </div>
                            <span className="font-mono text-sm font-black text-emerald-600 shrink-0">
                              {videoUploadProgress}%
                            </span>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                              style={{ width: `${videoUploadProgress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Saving and publishing are paused until the upload finishes.</span>
                            <button
                              type="button"
                              onClick={handleCancelVideoUpload}
                              className="font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                              Cancel Upload
                            </button>
                          </div>
                        </div>
                      ) : formData.videoUrl && !isYouTubeUrl(formData.videoUrl) ? (
                        /* Uploaded / Direct Video Preview with Replace & Remove */
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center max-w-2xl mx-auto shadow-sm">
                            <video
                              key={formData.videoUrl}
                              src={formData.videoUrl}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 max-w-2xl mx-auto ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                  {selectedVideoFile
                                    ? `${selectedVideoFile.name} (${formatFileSize(selectedVideoFile.size)})`
                                    : 'Video Attached & Ready'}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[10px] font-mono text-slate-400">
                                {formData.videoUrl}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => videoFileInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                              >
                                <UploadCloud className="h-3.5 w-3.5" />
                                Replace Video
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveVideo}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove Video
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Drag & Drop / Click-to-Browse Dropzone */
                        <div
                          onClick={() => videoFileInputRef.current?.click()}
                          onDragOver={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingVideo(true);
                          }}
                          onDragLeave={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingVideo(false);
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingVideo(false);
                            const file = e.dataTransfer.files?.[0];
                            handleVideoFileSelect(file);
                          }}
                          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer ${
                            isDraggingVideo
                              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                              : isDark
                              ? 'border-slate-700 bg-slate-950/40 hover:border-emerald-500/70 hover:bg-slate-900'
                              : 'border-slate-300 bg-slate-50/70 hover:border-emerald-500 hover:bg-emerald-50/30'
                          }`}
                        >
                          <div className="rounded-2xl bg-emerald-600/10 p-3.5 text-emerald-600 mb-3">
                            <UploadCloud className="h-7 w-7" />
                          </div>
                          <p className="text-sm font-black">
                            Drag & drop your video here, or <span className="text-emerald-600 underline">browse device</span>
                          </p>
                          <p className="mt-1.5 text-xs text-slate-400 font-semibold">
                            Accepted formats: <span className="font-mono font-bold">.mp4</span>,{' '}
                            <span className="font-mono font-bold">.webm</span>,{' '}
                            <span className="font-mono font-bold">.mov</span> • Maximum size: <b>100 MB</b>
                          </p>
                          {formData.videoUrl && isYouTubeUrl(formData.videoUrl) && (
                            <p className="mt-3 rounded-lg bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                              This lesson currently uses a YouTube link. Upload a file here to replace it, or switch to &ldquo;Paste Video URL&rdquo;.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Paste Video URL Mode (YouTube or Direct MP4) */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                          Video Stream URL
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Link2 className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                              type="url"
                              placeholder="https://www.youtube.com/watch?v=... or direct MP4 stream URL"
                              value={formData.videoUrl}
                              onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                              className={`w-full rounded-xl border pl-10 pr-4 py-2 text-xs font-bold outline-none ${inputClass}`}
                            />
                          </div>
                          {formData.videoUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveVideo}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {formData.videoUrl ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center max-w-2xl mx-auto">
                          {isYouTubeUrl(formData.videoUrl) ? (
                            <iframe
                              src={
                                formData.videoUrl.includes('embed')
                                  ? formData.videoUrl
                                  : formData.videoUrl.replace('watch?v=', 'embed/').split('&')[0]
                              }
                              title="Video Preview"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <video
                              key={formData.videoUrl}
                              src={formData.videoUrl}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-slate-400 text-xs font-bold">
                          No video URL entered yet. You can paste a YouTube link or direct MP4 URL above.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: ASSESSMENT INTEGRATION */}
              {activeModalTab === 'assessment' && (
                <div className="space-y-4">
                  {/* Sticky Top Header: Enable toggle, Question count, JSON toggle & + Add Question */}
                  <div
                    className={`sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 shadow-sm backdrop-blur-md ${
                      isDark
                        ? 'border-slate-800 bg-slate-900/95'
                        : 'border-slate-200 bg-white/95'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enableAssessment"
                        checked={formData.enableAssessment}
                        onChange={e => setFormData({ ...formData, enableAssessment: e.target.checked })}
                        className="h-4 w-4 rounded accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label htmlFor="enableAssessment" className="text-xs font-black cursor-pointer">
                            Enable Assessment for this Lesson
                          </label>
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                            {(formData.assessmentQuestions || []).length}{' '}
                            {(formData.assessmentQuestions || []).length === 1 ? 'Question' : 'Questions'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Passing threshold: {ASSESSMENT_PASSING_SCORE}%. Newest questions appear at the top and save chronologically (Q1 → Q{(formData.assessmentQuestions || []).length || 1}).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setJsonMode(!jsonMode)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Code className="mr-1 inline h-3 w-3" />
                        {jsonMode ? 'Visual Builder' : 'Raw JSON'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Question
                      </button>
                    </div>
                  </div>

                  {/* Pre-Test Pool Sync Info Badge */}
                  <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-bold ${
                    isDark
                      ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300'
                      : 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                  }`}>
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Questions in published lessons are automatically included in the randomized Pre-Test pool.</span>
                  </div>

                  {formData.enableAssessment && (
                    <>
                      {/* Assessment Parameters */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Assessment Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Encapsulation Quiz"
                            value={formData.assessmentTitle}
                            onChange={e => setFormData({ ...formData, assessmentTitle: e.target.value })}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={formData.assessmentPassingScore}
                            onChange={e => setFormData({ ...formData, assessmentPassingScore: Number(e.target.value) })}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Max Attempts
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={formData.assessmentAttempts}
                            onChange={e => setFormData({ ...formData, assessmentAttempts: Number(e.target.value) })}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                      </div>

                      {/* Raw JSON Mode */}
                      {jsonMode ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                              Assessment Questions (JSON Array)
                            </label>
                            <button
                              type="button"
                              onClick={handleApplyQuestionsJson}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              Apply JSON
                            </button>
                          </div>
                          <textarea
                            rows={10}
                            value={rawQuestionsJson}
                            onChange={e => setRawQuestionsJson(e.target.value)}
                            className={`w-full rounded-xl border p-3 font-mono text-xs outline-none ${inputClass}`}
                          />
                        </div>
                      ) : (
                        /* Visual Question Builder (Newest at Top: QN -> Q1) */
                        <div className="space-y-4">
                          {(formData.assessmentQuestions || []).map((q, qIndex) => {
                            const questionNumber = (formData.assessmentQuestions || []).length - qIndex;
                            const isNewlyAdded = highlightedQuestionId === q.id;
                            return (
                              <div
                                key={q.id}
                                className={`rounded-2xl border p-4 space-y-3 transition-all duration-700 ${
                                  isNewlyAdded
                                    ? isDark
                                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/30'
                                      : 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/60'
                                    : isDark
                                    ? 'border-slate-800 bg-slate-950/40'
                                    : 'border-slate-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                      Q{questionNumber}
                                    </span>
                                    <span className="text-xs font-black">Question Prompt</span>
                                    {isNewlyAdded && (
                                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestion(q.id)}
                                    className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <input
                                  ref={el => {
                                    questionInputRefs.current[q.id] = el;
                                  }}
                                  type="text"
                                  placeholder="Enter the assessment question..."
                                  value={q.question}
                                  onChange={e => handleUpdateQuestion(q.id, { question: e.target.value })}
                                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                                />

                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                    Optional Code Snippet
                                  </label>
                                  <textarea
                                    rows={2}
                                    placeholder="// Optional Java snippet for student analysis..."
                                    value={q.codeSnippet || ''}
                                    onChange={e => handleUpdateQuestion(q.id, { codeSnippet: e.target.value })}
                                    className={`w-full rounded-xl border p-2 font-mono text-xs outline-none ${inputClass}`}
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                    Answer Choices (Select radio button for the correct answer)
                                  </label>
                                  <div className="space-y-2">
                                    {(q.options || []).map((opt, optIndex) => (
                                      <div key={`${q.id}_${opt.id}`} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`correct_${q.id}`}
                                          checked={q.correctOptionId === opt.id}
                                          onChange={() => handleUpdateQuestion(q.id, { correctOptionId: opt.id })}
                                          className="h-4 w-4 accent-emerald-600 cursor-pointer"
                                          title="Mark as correct answer"
                                        />
                                        <span className="font-mono text-xs font-bold text-slate-400 w-4">
                                          {String.fromCharCode(65 + optIndex)}
                                        </span>
                                        <input
                                          type="text"
                                          placeholder={`Option ${String.fromCharCode(65 + optIndex)} text`}
                                          value={opt.text}
                                          onChange={e => {
                                            const newOpts = [...q.options];
                                            newOpts[optIndex] = { ...opt, text: e.target.value };
                                            handleUpdateQuestion(q.id, { options: newOpts });
                                          }}
                                          className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none ${inputClass}`}
                                        />
                                        <input
                                          type="text"
                                          placeholder="Explanation / rationale"
                                          value={opt.rationale || ''}
                                          onChange={e => {
                                            const newOpts = [...q.options];
                                            newOpts[optIndex] = { ...opt, rationale: e.target.value };
                                            handleUpdateQuestion(q.id, { options: newOpts });
                                          }}
                                          className={`w-1/3 rounded-lg border px-2.5 py-1.5 text-xs outline-none ${inputClass}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* SECTION 4: PRACTICE IDE CONFIGURATION */}
              {activeModalTab === 'practice' && (
                <div className="space-y-4">
                  {/* Enable Practice IDE toggle */}
                  <div className={`flex items-center justify-between rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enablePractice"
                        checked={formData.enablePractice}
                        onChange={e => setFormData({ ...formData, enablePractice: e.target.checked })}
                        className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enablePractice" className="text-xs font-black cursor-pointer">
                          Enable Practice IDE Coding Challenge
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Students solve interactive Java programming challenges directly in the web IDE.
                        </p>
                      </div>
                    </div>
                  </div>

                  {formData.enablePractice && (
                    <>
                      <div className={`rounded-xl border p-3.5 ${isDark ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-emerald-100 bg-emerald-50'}`}>
                        <div className="flex items-start gap-2">
                          <Code2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-bold">
                            Pedagogical Progression Rule: The Practice IDE unlocks only after passing the assessment (score ≥ {ASSESSMENT_PASSING_SCORE}%).
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Challenge Activity Title *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Encapsulation & Banking Account Challenge"
                            value={formData.practiceTitle}
                            onChange={e => setFormData({ ...formData, practiceTitle: e.target.value })}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Passing Score (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={formData.practicePassingScore}
                            onChange={e => setFormData({ ...formData, practicePassingScore: Number(e.target.value) })}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                          Challenge Instructions & Requirements
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide explicit instructions for students: specify class structure, method signatures, and expected console output..."
                          value={formData.practiceDescription}
                          onChange={e => setFormData({ ...formData, practiceDescription: e.target.value })}
                          className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                          Java Starter Code Template
                        </label>
                        <textarea
                          rows={7}
                          value={formData.practiceStarterCode}
                          onChange={e => setFormData({ ...formData, practiceStarterCode: e.target.value })}
                          className={`w-full rounded-xl border p-3 font-mono text-xs outline-none bg-slate-950 text-emerald-400 border-slate-800`}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Expected Console Output (Sample Output)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Exact console text output expected upon running student solution..."
                            value={formData.practiceSampleOutput}
                            onChange={e => setFormData({ ...formData, practiceSampleOutput: e.target.value })}
                            className={`w-full rounded-xl border p-2.5 font-mono text-xs outline-none ${inputClass}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                            Sample Standard Input (Optional)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Optional stdin simulated inputs (if any)..."
                            value={formData.practiceSampleInput}
                            onChange={e => setFormData({ ...formData, practiceSampleInput: e.target.value })}
                            className={`w-full rounded-xl border p-2.5 font-mono text-xs outline-none ${inputClass}`}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between border-t pt-4 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  {activeModalTab !== 'lesson' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeModalTab === 'practice') setActiveModalTab('assessment');
                        else if (activeModalTab === 'assessment') setActiveModalTab('video');
                        else if (activeModalTab === 'video') setActiveModalTab('lesson');
                      }}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <ChevronLeft className="mr-1 inline h-3.5 w-3.5" />
                      Back
                    </button>
                  )}
                  {activeModalTab !== 'practice' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeModalTab === 'lesson') setActiveModalTab('video');
                        else if (activeModalTab === 'video') setActiveModalTab('assessment');
                        else if (activeModalTab === 'assessment') setActiveModalTab('practice');
                      }}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Next Section
                      <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={requestCloseModal}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || isUploadingVideo}
                    onClick={() => saveLessonWithStatus('draft')}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={isUploadingVideo ? 'Wait for video upload to finish' : 'Save current progress as draft'}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isUploadingVideo ? `Uploading (${videoUploadProgress}%)...` : isSaving ? 'Saving...' : 'Save as Draft (Pause)'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploadingVideo}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title={isUploadingVideo ? 'Wait for video upload to finish' : 'Publish lesson to students'}
                  >
                    {isSaving ? (
                      'Publishing...'
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Publish Lesson
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl my-8 space-y-4 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-black text-emerald-600">
                  Lesson #{previewingLesson.sequence}
                </span>
                <h3 className="text-base font-black">{previewingLesson.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingLesson(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Player Preview */}
            {previewingLesson.videoUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center">
                {previewingLesson.videoUrl.includes('youtube.com') || previewingLesson.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={
                      previewingLesson.videoUrl.includes('embed')
                        ? previewingLesson.videoUrl
                        : previewingLesson.videoUrl.replace('watch?v=', 'embed/').split('&')[0]
                    }
                    title={previewingLesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={previewingLesson.videoUrl}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-slate-400 text-xs font-bold">
                No video associated with this lesson yet.
              </div>
            )}

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Pedagogical Description</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {previewingLesson.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Learning Objectives</h4>
              <ul className="mt-2 space-y-1">
                {normalizeObjectivesArray(previewingLesson.learningObjectives).map((obj, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consolidated Workflow Summary Card */}
            <div className={`rounded-xl border p-3.5 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Consolidated Workflow Details
              </h5>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs font-bold">
                <div>
                  <span className="text-slate-400">Video: </span>
                  <span className={previewingLesson.videoUrl ? 'text-emerald-600' : 'text-slate-500'}>
                    {previewingLesson.videoUrl ? 'Configured (≥95% required)' : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Assessment: </span>
                  <span className={previewingLesson.content?.assessment || OOP_ASSESSMENTS.some(a => a.lessonId === previewingLesson.id) || JAVA_SWING_ASSESSMENTS.some(a => a.lessonId === previewingLesson.id) ? 'text-indigo-600' : 'text-slate-500'}>
                    {previewingLesson.content?.assessment?.title ||
                      JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === previewingLesson.id)?.title ||
                      OOP_ASSESSMENTS.find(a => a.lessonId === previewingLesson.id)?.title ||
                      `Configured (Pass: ${ASSESSMENT_PASSING_SCORE}%)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Practice IDE: </span>
                  <span className={previewingLesson.content?.practice || PRACTICE_CHALLENGES.some(c => c.lessonId === previewingLesson.id) || JAVA_SWING_EXERCISES.some(e => e.lessonId === previewingLesson.id) ? 'text-emerald-600' : 'text-slate-500'}>
                    {previewingLesson.content?.practice?.title ||
                      JAVA_SWING_EXERCISES.find(e => e.lessonId === previewingLesson.id)?.title ||
                      PRACTICE_CHALLENGES.find(c => c.lessonId === previewingLesson.id)?.title ||
                      'Interactive Challenge'}
                  </span>
                </div>
              </div>
            </div>

            {/* Citation Card in Preview */}
            {(previewingLesson.citationText || previewingLesson.citation_text || previewingLesson.citationUrl || previewingLesson.citation_url) && (
              <div className={`rounded-xl border p-4 ${isDark ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-emerald-100 bg-emerald-50/60'}`}>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Pedagogical Citation & Reference
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                      {previewingLesson.citationText || previewingLesson.citation_text || 'No citation text specified.'}
                    </p>
                  </div>
                  {(previewingLesson.citationUrl || previewingLesson.citation_url) && (
                    <a
                      href={previewingLesson.citationUrl || previewingLesson.citation_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-50 shrink-0 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 transition"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Source Link
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4 text-xs font-bold text-slate-400 dark:border-slate-800">
              <span>Module: {previewingLesson.module}</span>
              <span className="capitalize">Status: {previewingLesson.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Archive Lesson?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to archive <strong>"{archiveTarget.title}"</strong>?
              Archiving hides the lesson from student enrollment but preserves all existing student progress and historical assessment records.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveConfirm}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition cursor-pointer"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES CONFIRMATION MODAL */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                <AlertCircle className="h-6 w-6 shrink-0" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Unsaved Changes</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              You have unsaved changes. Save as Draft or discard?
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={forceCloseModal}
                className="rounded-xl border border-rose-200 dark:border-rose-900/50 px-3.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  saveLessonWithStatus('draft');
                }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white hover:bg-amber-600 transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-600">
                <Trash2 className="h-6 w-6 shrink-0" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Lesson Permanently?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>?
            </p>
            <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3 text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
              <strong>Permanent Action Warning:</strong> Deleting removes this lesson and its linked videos, assessments, and Practice IDE challenges permanently and cannot be undone. Consider archiving instead to safely preserve student progress records.
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleArchiveInsteadOfDelete}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                Archive Instead (Recommended)
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[70] max-w-sm animate-fade-in">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-bold shadow-xl ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
