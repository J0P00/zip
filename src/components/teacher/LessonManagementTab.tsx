import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
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
  Check,
  ChevronRight,
  ChevronLeft,
  Code,
  ListOrdered,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ManagedLesson } from '../../types';
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
  id: `q_${Date.now()}_${index}`,
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

const isSwingLessonItem = (lesson: { id?: string; courseId?: string; module?: string }): boolean => {
  const id = String(lesson.id || '').toLowerCase();
  const courseId = String(lesson.courseId || '').toLowerCase();
  const mod = String(lesson.module || '').toLowerCase();
  return id.startsWith('swing_lesson_') || courseId === 'java_swing' || mod.includes('swing');
};

const sortManagedLessons = (items: ManagedLesson[]): ManagedLesson[] => {
  return [...items].sort((a, b) => {
    const aSwing = isSwingLessonItem(a);
    const bSwing = isSwingLessonItem(b);
    if (aSwing !== bSwing) return aSwing ? 1 : -1;
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return String(a.id).localeCompare(String(b.id));
  });
};

const normalizeQuestionDraft = (q: any, index: number): AssessmentQuestionDraft => {
  const rawOptions = Array.isArray(q?.options) ? q.options : Array.isArray(q?.choices) ? q.choices : [];
  const normalizedOptions = rawOptions.map((opt: any, optIdx: number) => {
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
    id: q?.id || `q_${Date.now()}_${index + 1}`,
    question: q?.question || q?.prompt || '',
    codeSnippet: q?.codeSnippet || '',
    options: safeOptions,
    correctOptionId,
    correctAnswer: correctOption?.text || q?.correctAnswer || '',
    explanation: q?.explanation || correctOption?.rationale || '',
    difficulty: q?.difficulty || 'Easy'
  };
};

const buildBaselineLessons = (): ManagedLesson[] => {
  const oopLessons: ManagedLesson[] = OOP_COURSE_LESSONS.map((l, i) => {
    const assessment = OOP_ASSESSMENTS.find(a => a.lessonId === l.id);
    const practice = PRACTICE_CHALLENGES.find(c => c.lessonId === l.id);
    return {
      id: l.id,
      title: l.title,
      module: 'Object-Oriented Programming (Java)',
      courseId: 'oop_course_java',
      sequence: l.sequence || i + 1,
      videoUrl: l.videoUrl,
      description: l.description,
      learningObjectives: l.concepts || [],
      status: 'Published',
      citationText: l.citation_text || (l.creator_name ? `${l.creator_name}. ${l.video_title || l.title}. ${l.publisher_name || 'Oracle'}.` : ''),
      citationUrl: l.citation_url || l.source_url || '',
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
              questionsCount: assessment.questions.length,
              questions: assessment.questions,
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

  const swingLessons: ManagedLesson[] = JAVA_SWING_LESSONS.map((l, i) => {
    const video = JAVA_SWING_VIDEOS.find(v => v.lessonId === l.id);
    const assessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === l.id);
    const exercise = JAVA_SWING_EXERCISES.find(e => e.lessonId === l.id);
    return {
      id: l.id,
      title: l.title,
      module: 'Java Swing',
      courseId: 'java_swing',
      sequence: 12 + (l.sequence || i + 1),
      videoUrl: video?.embedUrl || '',
      description: l.introduction || l.summary || '',
      learningObjectives: l.objectives || l.topics || [],
      status: 'Published',
      citationText: 'Oracle. (n.d.). Trail: Creating a GUI With Swing (The Java Tutorials). Oracle Documentation.',
      citationUrl: 'https://docs.oracle.com/javase/tutorial/uiswing/',
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
              questionsCount: assessment.questions.length,
              questions: assessment.questions.map((q, idx) => normalizeQuestionDraft(q, idx)),
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
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ManagedLesson | null>(null);
  const [previewingLesson, setPreviewingLesson] = useState<ManagedLesson | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedLesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Consolidated Modal Tabs
  const [activeModalTab, setActiveModalTab] = useState<'lesson' | 'video' | 'assessment' | 'practice'>('lesson');
  const [jsonMode, setJsonMode] = useState(false);
  const [rawQuestionsJson, setRawQuestionsJson] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // 1. Basic Lesson Details
    title: '',
    module: 'Object-Oriented Programming (Java)',
    sequence: 1,
    status: 'Published' as 'Draft' | 'Published' | 'Archived',
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

  const [linkedContent, setLinkedContent] = useState<any>(null);

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500';

  // Load lessons from backend with fallback, ensuring all 17 lessons (12 OOP + 5 Swing) are present and ordered
  const fetchLessons = async () => {
    setIsLoading(true);
    const baseline = buildBaselineLessons();
    try {
      const res = await lessonApi.list();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: ManagedLesson[] = res.data.map((l: any) => {
          const swingVid = JAVA_SWING_VIDEOS.find(v => v.lessonId === l.id);
          const isSwing = isSwingLessonItem({ id: l.id, courseId: l.course_id || l.courseId, module: l.module });
          const rawSeq = Number(l.sequence || 1);
          const effectiveSeq = isSwing && rawSeq <= 5 ? 12 + rawSeq : rawSeq;
          return {
            id: l.id,
            title: l.title || '',
            module: l.module || (isSwing ? 'Java Swing' : 'Object-Oriented Programming (Java)'),
            courseId: l.course_id || l.courseId || (isSwing ? 'java_swing' : 'oop_course_java'),
            sequence: effectiveSeq,
            videoUrl: l.video_url || l.videoUrl || l.content?.video?.videoUrl || swingVid?.embedUrl || '',
            description: l.description || '',
            learningObjectives: Array.isArray(l.learningObjectives)
              ? l.learningObjectives
              : Array.isArray(l.learning_objectives)
              ? l.learning_objectives
              : Array.isArray(l.concepts)
              ? l.concepts
              : typeof l.learningObjectives === 'string'
              ? JSON.parse(l.learningObjectives || '[]')
              : typeof l.learning_objectives === 'string'
              ? JSON.parse(l.learning_objectives || '[]')
              : [],
            status: l.status || 'Published',
            citationText: l.citationText || l.citation_text || l.metadata?.citationText || l.metadata?.citation_text || '',
            citationUrl: l.citationUrl || l.citation_url || l.sourceUrl || l.source_url || l.metadata?.citationUrl || l.metadata?.citation_url || '',
            storageProvider: l.storageProvider || l.storage_provider || '',
            storageKey: l.storageKey || l.storage_key || '',
            content: l.content || null,
            createdBy: l.created_by || l.createdBy,
            createdAt: l.created_at || l.createdAt,
            updatedAt: l.updated_at || l.updatedAt
          };
        });

        const existingIds = new Set(mapped.map(item => item.id));
        for (const baseLesson of baseline) {
          if (!existingIds.has(baseLesson.id)) {
            mapped.push(baseLesson);
          }
        }

        setLessons(sortManagedLessons(mapped));
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

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => {
      const matchSearch =
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.module.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'All' ? true : l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [lessons, searchTerm, statusFilter]);

  const handleOpenCreate = () => {
    const nextSeq = lessons.length > 0 ? Math.max(...lessons.map(l => l.sequence)) + 1 : 1;
    const initialQuestion = createDefaultQuestion(1);
    setFormData({
      title: '',
      module: 'Object-Oriented Programming (Java)',
      sequence: nextSeq,
      status: 'Published',
      description: '',
      learningObjectives: '',
      citationText: '',
      citationUrl: '',
      videoUrl: '',
      enableAssessment: true,
      assessmentTitle: '',
      assessmentQuizType: 'Multiple Choice',
      assessmentPassingScore: ASSESSMENT_PASSING_SCORE,
      assessmentAttempts: 3,
      assessmentStatus: 'Published',
      assessmentQuestions: [initialQuestion],
      enablePractice: true,
      practiceTitle: '',
      practiceDescription: '',
      practiceStarterCode: DEFAULT_STARTER_CODE,
      practiceSampleInput: '',
      practiceSampleOutput: 'Hello, World!',
      practicePassingScore: 70,
      practiceStatus: 'Published'
    });
    setRawQuestionsJson(JSON.stringify([initialQuestion], null, 2));
    setJsonMode(false);
    setLinkedContent(null);
    setActiveModalTab('lesson');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (lesson: ManagedLesson) => {
    setEditingLesson(lesson);
    const content = (lesson as any).content || {};
    const existingAssessment = content.assessment;
    const existingPractice = content.practice;

    // Baseline from static OOP or Java Swing catalogs if not present in DB
    const staticOopAssessment = OOP_ASSESSMENTS.find(a => a.lessonId === lesson.id);
    const staticSwingAssessment = JAVA_SWING_ASSESSMENTS.find(a => a.lessonId === lesson.id);
    const staticAssessment: any = staticOopAssessment || staticSwingAssessment;

    const rawQuestions =
      Array.isArray(existingAssessment?.questions) && existingAssessment.questions.length > 0
        ? existingAssessment.questions
        : Array.isArray(staticAssessment?.questions) && staticAssessment.questions.length > 0
        ? staticAssessment.questions
        : [];

    const initialQuestions: AssessmentQuestionDraft[] =
      rawQuestions.length > 0
        ? rawQuestions.map((q: any, idx: number) => normalizeQuestionDraft(q, idx))
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

    setFormData({
      title: lesson.title,
      module: lesson.module || (isSwing ? 'Java Swing' : 'Object-Oriented Programming (Java)'),
      sequence: lesson.sequence,
      status: lesson.status,
      description: lesson.description || '',
      learningObjectives: Array.isArray(lesson.learningObjectives) ? lesson.learningObjectives.join('\n') : '',
      citationText: existingCitationText,
      citationUrl: existingCitationUrl,
      videoUrl: lesson.videoUrl || content.video?.videoUrl || staticSwingVideo?.embedUrl || staticOopLesson?.videoUrl || '',
      enableAssessment: true,
      assessmentTitle: existingAssessment?.title || staticAssessment?.title || `${lesson.title} Assessment`,
      assessmentQuizType: existingAssessment?.quizType || 'Multiple Choice',
      assessmentPassingScore: Number(existingAssessment?.passingScore ?? staticAssessment?.passingPercentage ?? ASSESSMENT_PASSING_SCORE),
      assessmentAttempts: Number(existingAssessment?.attempts ?? 3),
      assessmentStatus: (existingAssessment?.status as any) || 'Published',
      assessmentQuestions: initialQuestions,
      enablePractice: true,
      practiceTitle: existingPractice?.title || staticPractice?.title || `${lesson.title} Practice Challenge`,
      practiceDescription: existingPractice?.description || staticPractice?.description || '',
      practiceStarterCode: existingPractice?.starterCode || staticPractice?.starterCode || DEFAULT_STARTER_CODE,
      practiceSampleInput: existingPractice?.sampleInput || staticPractice?.sampleInput || '',
      practiceSampleOutput: existingPractice?.sampleOutput || staticPractice?.sampleOutput || 'Expected Program Output',
      practicePassingScore: Number(existingPractice?.passingScore ?? staticPractice?.passingScore ?? (isSwing ? SWING_PASSING_PERCENTAGE : 70)),
      practiceStatus: (existingPractice?.status as any) || 'Published'
    });

    setRawQuestionsJson(JSON.stringify(initialQuestions, null, 2));
    setJsonMode(false);
    setLinkedContent({
      ...content,
      assessment: existingAssessment || (staticAssessment ? { id: staticAssessment.id } : null),
      practice: existingPractice || (staticPractice ? { id: staticPractice.id } : null)
    });
    setActiveModalTab('lesson');
  };

  const persistLinkedVideo = async (lessonId: string, videoUrl: string) => {
    if (!videoUrl || !lessonId || lessonId === '0' || lessonId === 'NaN') return;
    try {
      const existing = (await videoApi.list(lessonId)).data?.[0];
      const videoPayload: any = {
        lessonId,
        title: formData.title.trim(),
        videoUrl,
        description: formData.description.trim(),
        status: formData.status,
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
    const updated = [...formData.assessmentQuestions, newQ];
    setFormData({ ...formData, assessmentQuestions: updated });
    setRawQuestionsJson(JSON.stringify(updated, null, 2));
  };

  const handleRemoveQuestion = (idx: number) => {
    const updated = formData.assessmentQuestions.filter((_, i) => i !== idx);
    setFormData({ ...formData, assessmentQuestions: updated });
    setRawQuestionsJson(JSON.stringify(updated, null, 2));
  };

  const handleUpdateQuestion = (idx: number, patch: Partial<AssessmentQuestionDraft>) => {
    const updated = formData.assessmentQuestions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    setFormData({ ...formData, assessmentQuestions: updated });
    setRawQuestionsJson(JSON.stringify(updated, null, 2));
  };

  const handleApplyQuestionsJson = () => {
    try {
      const parsed = JSON.parse(rawQuestionsJson);
      if (Array.isArray(parsed)) {
        setFormData({ ...formData, assessmentQuestions: parsed });
        setJsonMode(false);
        setFeedback({ type: 'success', message: `Successfully loaded ${parsed.length} assessment questions from JSON.` });
      } else {
        setFeedback({ type: 'error', message: 'JSON root must be an array of question objects.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Invalid JSON syntax: ${err.message}` });
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Lesson
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Lesson title is required.' });
      setActiveModalTab('lesson');
      return;
    }

    const seq = Number(formData.sequence);
    if (!Number.isFinite(seq) || Number.isNaN(seq) || seq < 0) {
      setFeedback({ type: 'error', message: 'Lesson sequence must be a valid non-negative number.' });
      setActiveModalTab('lesson');
      return;
    }

    // 2. Validate Video
    if (formData.videoUrl.trim()) {
      const urlError = validateVideoUrl(formData.videoUrl);
      if (urlError) {
        setFeedback({ type: 'error', message: urlError });
        setActiveModalTab('video');
        return;
      }
    }

    // 3. Validate Assessment
    if (formData.enableAssessment) {
      const passScore = Number(formData.assessmentPassingScore);
      if (!Number.isFinite(passScore) || Number.isNaN(passScore) || passScore < 0 || passScore > 100) {
        setFeedback({ type: 'error', message: 'Assessment passing score must be between 0 and 100.' });
        setActiveModalTab('assessment');
        return;
      }
      const attempts = Number(formData.assessmentAttempts);
      if (!Number.isFinite(attempts) || attempts < 1) {
        setFeedback({ type: 'error', message: 'Assessment attempts must be at least 1.' });
        setActiveModalTab('assessment');
        return;
      }
      for (let i = 0; i < formData.assessmentQuestions.length; i++) {
        const q = formData.assessmentQuestions[i];
        if (!q.question.trim()) {
          setFeedback({ type: 'error', message: `Question #${i + 1} requires a question prompt.` });
          setActiveModalTab('assessment');
          return;
        }
      }
    }

    // 4. Validate Practice IDE
    if (formData.enablePractice) {
      if (!formData.practiceTitle.trim()) {
        setFeedback({ type: 'error', message: 'Practice IDE challenge title is required when practice is enabled.' });
        setActiveModalTab('practice');
        return;
      }
      const passScore = Number(formData.practicePassingScore);
      if (!Number.isFinite(passScore) || Number.isNaN(passScore) || passScore < 0 || passScore > 100) {
        setFeedback({ type: 'error', message: 'Practice passing score must be between 0 and 100.' });
        setActiveModalTab('practice');
        return;
      }
    }

    const objectives = formData.learningObjectives
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean);

    setIsSaving(true);
    const lessonId = editingLesson?.id || `oop_lesson_${Date.now()}`;
    const lessonPayload = {
      id: lessonId,
      title: formData.title.trim(),
      module: formData.module.trim(),
      sequence: seq,
      videoUrl: formData.videoUrl.trim(),
      description: formData.description.trim(),
      learningObjectives: objectives,
      concepts: objectives,
      status: formData.status,
      citationText: formData.citationText.trim(),
      citationUrl: formData.citationUrl.trim(),
      metadata: {
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
      const isSwing = isSwingLessonItem({ id: lessonId, courseId: editingLesson?.courseId, module: formData.module });
      if (editingLesson) {
        const res = await lessonApi.update(editingLesson.id, lessonPayload);
        savedId = res.data?.id || editingLesson.id;
        setFeedback({ type: 'success', message: `Lesson "${formData.title}" updated successfully with consolidated content.` });
      } else {
        const res = await lessonApi.create({ courseId: isSwing ? 'java_swing' : 'oop_course_java', ...lessonPayload });
        savedId = res.data?.id || lessonId;
        setFeedback({ type: 'success', message: `Lesson "${formData.title}" created successfully with linked content.` });
      }

      // Persist Video
      if (formData.videoUrl.trim() && savedId) {
        await persistLinkedVideo(savedId, formData.videoUrl.trim());
      }

      // Persist Assessment
      if (formData.enableAssessment && savedId && savedId !== '0' && savedId !== 'NaN') {
        const assessmentTitle = formData.assessmentTitle.trim() || `${formData.title.trim()} Assessment`;
        const serializedQuestions = formData.assessmentQuestions.map(q => {
          const correctOpt = q.options.find(o => o.id === q.correctOptionId);
          return {
            ...q,
            correctAnswer: correctOpt?.text || q.correctAnswer || '',
            explanation: correctOpt?.rationale || q.explanation || ''
          };
        });
        const assessmentPayload = {
          lessonId: savedId,
          title: assessmentTitle,
          quizType: formData.assessmentQuizType,
          passingScore: Number(formData.assessmentPassingScore),
          attempts: Number(formData.assessmentAttempts),
          questions: serializedQuestions,
          status: formData.assessmentStatus
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
      if (formData.enablePractice && savedId && savedId !== '0' && savedId !== 'NaN') {
        const practiceTitle = formData.practiceTitle.trim() || `${formData.title.trim()} Practice Exercise`;
        const practicePayload = {
          lessonId: savedId,
          topicId: isSwing ? 'java_swing' : 'oop',
          title: practiceTitle,
          description: formData.practiceDescription.trim(),
          starterCode: formData.practiceStarterCode,
          sampleOutput: formData.practiceSampleOutput,
          sampleInput: formData.practiceSampleInput,
          passingScore: Number(formData.practicePassingScore),
          status: formData.practiceStatus
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

      setIsCreateOpen(false);
      setEditingLesson(null);
      fetchLessons();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save lesson and consolidated content.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (lesson: ManagedLesson) => {
    const nextStatus = lesson.status === 'Published' ? 'Draft' : 'Published';
    try {
      await lessonApi.update(lesson.id, { status: nextStatus });
      setFeedback({
        type: 'success',
        message: `Lesson "${lesson.title}" is now ${nextStatus.toLowerCase()}.`
      });
      fetchLessons();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update lesson status.' });
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await lessonApi.update(archiveTarget.id, { status: 'Archived' });
      setFeedback({ type: 'success', message: `Lesson "${archiveTarget.title}" has been archived.` });
      setArchiveTarget(null);
      fetchLessons();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to archive lesson.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await lessonApi.remove(deleteTarget.id);
      setFeedback({
        type: 'success',
        message: `Lesson "${deleteTarget.title}" and its linked content were deleted permanently.`
      });
      setDeleteTarget(null);
      if (editingLesson?.id === deleteTarget.id) {
        setEditingLesson(null);
      }
      fetchLessons();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete lesson.'
      });
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
                {lessons.length} Total Lessons ({lessons.filter(l => l.status === 'Published').length} Published)
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">Lesson & Content Management</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage complete pedagogical workflows in a single place: Lesson metadata, Video tutorials, Assessments, and Practice IDE exercises.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Lesson
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

        {/* Filters and Search Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons by title, topic, or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published Only</option>
              <option value="Draft">Drafts Only</option>
              <option value="Archived">Archived Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lesson List / Table */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="overflow-x-auto">
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
              ) : filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No lessons found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLessons.map((lesson, idx) => {
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

                  return (
                    <tr key={lesson.id} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                      {/* Sequence with Move Up/Down */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                            #{lesson.sequence}
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

                      {/* Consolidated Linked Content Badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Video Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                              hasVideo
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}
                            title={hasVideo ? 'Video tutorial linked' : 'No video linked'}
                          >
                            <Play className="h-2.5 w-2.5" />
                            Video
                          </span>

                          {/* Assessment Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                              hasAssessment
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}
                            title={hasAssessment ? 'Assessment configured' : 'No assessment'}
                          >
                            <FileQuestion className="h-2.5 w-2.5" />
                            Quiz ({lesson.content?.assessment?.passingScore || ASSESSMENT_PASSING_SCORE}%)
                          </span>

                          {/* Practice IDE Badge */}
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                              hasPractice
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            }`}
                            title={hasPractice ? 'Practice IDE challenge configured' : 'No IDE challenge'}
                          >
                            <Code2 className="h-2.5 w-2.5" />
                            Practice IDE
                          </span>
                        </div>
                      </td>

                      {/* Learning Objectives */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(lesson.learningObjectives || []).slice(0, 2).map((obj, i) => (
                            <span
                              key={i}
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {obj}
                            </span>
                          ))}
                          {(lesson.learningObjectives || []).length > 2 && (
                            <span className="text-[10px] text-slate-400 font-bold self-center">
                              +{lesson.learningObjectives.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(lesson)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider cursor-pointer transition ${
                            lesson.status === 'Published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                              : lesson.status === 'Draft'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                          title="Click to toggle publish status"
                        >
                          {lesson.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewingLesson(lesson)}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition cursor-pointer"
                            title="Preview Consolidated Lesson"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lesson)}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition cursor-pointer"
                            title="Edit Lesson & Content"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveTarget(lesson)}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 transition cursor-pointer"
                            title="Archive Lesson"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(lesson)}
                            className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Lesson"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl border p-6 shadow-2xl my-8 flex flex-col max-h-[90vh] ${cardClass}`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-600/10 p-2 text-emerald-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingLesson ? `Edit Lesson: ${editingLesson.title}` : 'Create New Lesson & Content Workflow'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Consolidated lesson, video tutorial, assessment quiz, and Practice IDE configuration.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingLesson(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
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
                  label: `3. Assessment (${formData.assessmentQuestions.length} Qs)`,
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
            <form onSubmit={handleSaveLesson} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* SECTION 1: LESSON DETAILS */}
              {activeModalTab === 'lesson' && (
                <div className="space-y-4">
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
                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                      >
                        <option value="Published">Published (Active & Visible)</option>
                        <option value="Draft">Draft (Hidden from students)</option>
                        <option value="Archived">Archived</option>
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
                          Students must complete at least <b>95%</b> of this video before the lesson Assessment unlocks. Supported formats include YouTube links and direct MP4 URLs.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                      Video Stream URL
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=... or direct MP4 stream URL"
                        value={formData.videoUrl}
                        onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                        className={`w-full rounded-xl border pl-10 pr-4 py-2 text-xs font-bold outline-none ${inputClass}`}
                      />
                    </div>
                  </div>

                  {formData.videoUrl ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center max-w-xl mx-auto">
                      {formData.videoUrl.includes('youtube.com') || formData.videoUrl.includes('youtu.be') ? (
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

              {/* SECTION 3: ASSESSMENT INTEGRATION */}
              {activeModalTab === 'assessment' && (
                <div className="space-y-4">
                  {/* Enable assessment toggle & summary */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enableAssessment"
                        checked={formData.enableAssessment}
                        onChange={e => setFormData({ ...formData, enableAssessment: e.target.checked })}
                        className="h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="enableAssessment" className="text-xs font-black cursor-pointer">
                          Enable Assessment for this Lesson
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Passing score threshold is {ASSESSMENT_PASSING_SCORE}%. Students must pass the assessment to unlock the Practice IDE.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setJsonMode(!jsonMode)}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Code className="mr-1 inline h-3 w-3" />
                        {jsonMode ? 'Visual Builder' : 'Raw JSON'}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-black text-white hover:bg-emerald-700 transition cursor-pointer"
                      >
                        <Plus className="mr-1 inline h-3 w-3" />
                        Add Question
                      </button>
                    </div>
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
                        /* Visual Question Builder */
                        <div className="space-y-4">
                          {formData.assessmentQuestions.map((q, qIndex) => (
                            <div
                              key={q.id || qIndex}
                              className={`rounded-2xl border p-4 space-y-3 transition ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'}`}
                            >
                              <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-600">
                                    Q{qIndex + 1}
                                  </span>
                                  <span className="text-xs font-black">Question Prompt</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuestion(qIndex)}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                                  title="Delete Question"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <input
                                type="text"
                                placeholder="Enter the assessment question..."
                                value={q.question}
                                onChange={e => handleUpdateQuestion(qIndex, { question: e.target.value })}
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
                                  onChange={e => handleUpdateQuestion(qIndex, { codeSnippet: e.target.value })}
                                  className={`w-full rounded-xl border p-2 font-mono text-xs outline-none ${inputClass}`}
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                                  Answer Choices (Select radio button for the correct answer)
                                </label>
                                <div className="space-y-2">
                                  {q.options.map((opt, optIndex) => (
                                    <div key={opt.id || optIndex} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct_${qIndex}`}
                                        checked={q.correctOptionId === opt.id}
                                        onChange={() => handleUpdateQuestion(qIndex, { correctOptionId: opt.id })}
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
                                          handleUpdateQuestion(qIndex, { options: newOpts });
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
                                          handleUpdateQuestion(qIndex, { options: newOpts });
                                        }}
                                        className={`w-1/3 rounded-lg border px-2.5 py-1.5 text-xs outline-none ${inputClass}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
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

                <div className="flex items-center gap-2">
                  {editingLesson && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(editingLesson)}
                      className="rounded-xl border border-rose-200 dark:border-rose-900/40 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Lesson
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingLesson(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      'Saving All Content...'
                    ) : editingLesson ? (
                      <>
                        <Check className="h-4 w-4" /> Save Lesson Content
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Create Lesson Content
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
                {(previewingLesson.learningObjectives || []).map((obj, i) => (
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="rounded-full bg-rose-500/10 p-2 text-rose-600">
                <Trash2 className="h-6 w-6 shrink-0" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Lesson Permanently?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>?
            </p>
            <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3 text-[11px] text-rose-800 dark:text-rose-300">
              <strong>Warning:</strong> This will permanently delete the lesson along with any associated video records, assessment quizzes, student progress, and practice challenges. This action cannot be undone.
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
