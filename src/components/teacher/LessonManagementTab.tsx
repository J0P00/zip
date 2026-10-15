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
  ExternalLink,
  Layers,
  Clock,
  Sparkles,
  X,
  Play
} from 'lucide-react';
import { ManagedLesson } from '../../types';
import { lessonApi } from '../../services/api';
import { OOP_COURSE_LESSONS } from '../../data/oopCourse';

interface LessonManagementTabProps {
  theme?: 'light' | 'dark';
}

export default function LessonManagementTab({ theme = 'light' }: LessonManagementTabProps) {
  const isDark = theme === 'dark';
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<ManagedLesson | null>(null);
  const [previewingLesson, setPreviewingLesson] = useState<ManagedLesson | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ManagedLesson | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    module: 'Object-Oriented Programming (Java)',
    sequence: 1,
    duration: '10:00',
    videoUrl: '',
    description: '',
    learningObjectives: '',
    status: 'Published' as 'Draft' | 'Published' | 'Archived'
  });

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500';

  // Load lessons from backend with fallback
  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const res = await lessonApi.list();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: ManagedLesson[] = res.data.map((l: any) => ({
          id: l.id,
          title: l.title || '',
          module: l.module || 'Object-Oriented Programming (Java)',
          courseId: l.course_id || l.courseId || 'oop_course_java',
          sequence: Number(l.sequence || 1),
          duration: l.duration || '10:00',
          videoUrl: l.video_url || l.videoUrl || '',
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
          createdBy: l.created_by || l.createdBy,
          createdAt: l.created_at || l.createdAt,
          updatedAt: l.updated_at || l.updatedAt
        }));
        mapped.sort((a, b) => a.sequence - b.sequence);
        setLessons(mapped);
      } else {
        // Fallback to static OOP lessons
        const fallback: ManagedLesson[] = OOP_COURSE_LESSONS.map((l, i) => ({
          id: l.id,
          title: l.title,
          module: 'Object-Oriented Programming (Java)',
          courseId: 'oop_course_java',
          sequence: l.sequence || i + 1,
          duration: l.duration || '10:00',
          videoUrl: l.videoUrl,
          description: l.description,
          learningObjectives: l.concepts || [],
          status: 'Published'
        }));
        setLessons(fallback);
      }
    } catch {
      // Offline fallback
      const fallback: ManagedLesson[] = OOP_COURSE_LESSONS.map((l, i) => ({
        id: l.id,
        title: l.title,
        module: 'Object-Oriented Programming (Java)',
        courseId: 'oop_course_java',
        sequence: l.sequence || i + 1,
        duration: l.duration || '10:00',
        videoUrl: l.videoUrl,
        description: l.description,
        learningObjectives: l.concepts || [],
        status: 'Published'
      }));
      setLessons(fallback);
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
    setFormData({
      title: '',
      module: 'Object-Oriented Programming (Java)',
      sequence: lessons.length + 1,
      duration: '10:00',
      videoUrl: '',
      description: '',
      learningObjectives: '',
      status: 'Published'
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (lesson: ManagedLesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      module: lesson.module,
      sequence: lesson.sequence,
      duration: lesson.duration,
      videoUrl: lesson.videoUrl,
      description: lesson.description,
      learningObjectives: lesson.learningObjectives.join('\n'),
      status: lesson.status
    });
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Lesson title is required.' });
      return;
    }

    const objectives = formData.learningObjectives
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title.trim(),
      module: formData.module.trim(),
      sequence: Number(formData.sequence),
      duration: formData.duration.trim(),
      videoUrl: formData.videoUrl.trim(),
      description: formData.description.trim(),
      learningObjectives: objectives,
      concepts: objectives,
      status: formData.status
    };

    try {
      if (editingLesson) {
        await lessonApi.update(editingLesson.id, payload);
        setFeedback({ type: 'success', message: `Lesson "${formData.title}" updated successfully.` });
        setEditingLesson(null);
      } else {
        await lessonApi.create({
          id: `oop_lesson_${Date.now()}`,
          courseId: 'oop_course_java',
          ...payload
        });
        setFeedback({ type: 'success', message: `Lesson "${formData.title}" created successfully.` });
        setIsCreateOpen(false);
      }
      fetchLessons();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save lesson.' });
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
                Curriculum Control
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {lessons.length} Total Lessons ({lessons.filter(l => l.status === 'Published').length} Published)
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">Lesson Management</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create, sequence, edit, publish, and preview course lessons. Student progress and unlocks automatically align with the active sequence.
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
                <th className="px-4 py-3.5 font-black">Duration</th>
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
                filteredLessons.map((lesson, idx) => (
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

                    {/* Duration */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {lesson.duration}
                      </span>
                    </td>

                    {/* Learning Objectives */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(lesson.learningObjectives || []).slice(0, 3).map((obj, i) => (
                          <span
                            key={i}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {obj}
                          </span>
                        ))}
                        {(lesson.learningObjectives || []).length > 3 && (
                          <span className="text-[10px] text-slate-400 font-bold self-center">
                            +{lesson.learningObjectives.length - 3} more
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
                          title="Preview Lesson"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(lesson)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition cursor-pointer"
                          title="Edit Lesson"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(lesson)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition cursor-pointer"
                          title="Archive Lesson"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isCreateOpen || editingLesson) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black">
                  {editingLesson ? `Edit Lesson: ${editingLesson.title}` : 'Create New Lesson'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingLesson(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Encapsulation & Data Hiding"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Sequence #
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
                    Duration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12:45"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: e.target.value })}
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
                    <option value="Published">Published (Active)</option>
                    <option value="Draft">Draft (Hidden from students)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Video URL
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or /videos/lesson1.mp4"
                  value={formData.videoUrl}
                  onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide a clear description of the pedagogical purpose of this lesson..."
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
                  placeholder="Understand private access modifier&#10;Implement getter and setter methods&#10;Protect class invariant"
                  value={formData.learningObjectives}
                  onChange={e => setFormData({ ...formData, learningObjectives: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
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
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  {editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
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
                    <div className="text-center p-6 text-slate-400">
                      <Play className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                      <p className="text-xs font-bold">Direct Video Link: {previewingLesson.videoUrl}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-400 text-xs font-bold">
                  No video associated with this lesson yet.
                </div>
              )}

              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Description</h4>
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

              <div className="flex items-center justify-between border-t pt-4 text-xs font-bold text-slate-400 dark:border-slate-800">
                <span>Duration: {previewingLesson.duration}</span>
                <span className="capitalize">Status: {previewingLesson.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
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
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
