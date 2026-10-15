import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  ExternalLink,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  X,
  FolderOpen
} from 'lucide-react';
import { LearningResource, ManagedLesson } from '../../types';
import { resourceApi, lessonApi } from '../../services/api';
import { OOP_COURSE_LESSONS } from '../../data/oopCourse';

interface ResourceManagementTabProps {
  theme?: 'light' | 'dark';
}

export default function ResourceManagementTab({ theme = 'light' }: ResourceManagementTabProps) {
  const isDark = theme === 'dark';
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [lessonFilter, setLessonFilter] = useState('All');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<LearningResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LearningResource | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    lessonId: '',
    title: '',
    resourceType: 'pdf' as LearningResource['resourceType'],
    fileUrl: '',
    fileSize: '1.2 MB',
    description: '',
    status: 'Published' as 'Draft' | 'Published' | 'Archived'
  });

  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-emerald-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500';

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Lessons
      const lessonRes = await lessonApi.list();
      let lessonList: ManagedLesson[] = [];
      if (lessonRes.data && Array.isArray(lessonRes.data) && lessonRes.data.length > 0) {
        lessonList = lessonRes.data.map((l: any) => ({
          id: l.id,
          title: l.title || '',
          module: l.module || '',
          courseId: l.course_id || 'oop_course_java',
          sequence: Number(l.sequence || 1),
          duration: l.duration || '10:00',
          videoUrl: l.video_url || '',
          description: l.description || '',
          learningObjectives: [],
          status: l.status || 'Published'
        }));
      } else {
        lessonList = OOP_COURSE_LESSONS.map((l, i) => ({
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
      }
      setLessons(lessonList);

      // 2. Resources
      const res = await resourceApi.list();
      if (res.data && Array.isArray(res.data)) {
        setResources(res.data);
      } else {
        setResources([]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load learning resources.' });
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchSearch =
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.lessonTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'All' ? true : r.resourceType === typeFilter;
      const matchLesson = lessonFilter === 'All' ? true : r.lessonId === lessonFilter;
      return matchSearch && matchType && matchLesson;
    });
  }, [resources, searchTerm, typeFilter, lessonFilter]);

  const handleOpenCreate = () => {
    setFormData({
      lessonId: lessons[0]?.id || 'oop_lesson_1',
      title: '',
      resourceType: 'pdf',
      fileUrl: '',
      fileSize: '1.5 MB',
      description: '',
      status: 'Published'
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (res: LearningResource) => {
    setEditingResource(res);
    setFormData({
      lessonId: res.lessonId,
      title: res.title,
      resourceType: res.resourceType,
      fileUrl: res.fileUrl,
      fileSize: res.fileSize || '1.0 MB',
      description: res.description || '',
      status: res.status
    });
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.fileUrl.trim()) {
      setFeedback({ type: 'error', message: 'Resource title and file URL are required.' });
      return;
    }

    try {
      if (editingResource) {
        await resourceApi.update(editingResource.id, formData);
        setFeedback({ type: 'success', message: `Resource "${formData.title}" updated.` });
        setEditingResource(null);
      } else {
        await resourceApi.create(formData);
        setFeedback({ type: 'success', message: `Resource "${formData.title}" added.` });
        setIsCreateOpen(false);
      }
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save resource.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await resourceApi.remove(deleteTarget.id);
      setFeedback({ type: 'success', message: `Resource "${deleteTarget.title}" removed.` });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove resource.' });
    }
  };

  const handleTogglePublish = async (res: LearningResource) => {
    const nextStatus = res.status === 'Published' ? 'Draft' : 'Published';
    try {
      await resourceApi.update(res.id, { status: nextStatus });
      setFeedback({
        type: 'success',
        message: `Resource "${res.title}" is now ${nextStatus.toLowerCase()}.`
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update resource status.' });
    }
  };

  const getTypeIcon = (type: LearningResource['resourceType']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-rose-500" />;
      case 'code':
        return <FileCode className="h-4 w-4 text-emerald-500" />;
      case 'presentation':
        return <FileSpreadsheet className="h-4 w-4 text-amber-500" />;
      default:
        return <File className="h-4 w-4 text-sky-500" />;
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
                <FolderOpen className="h-3.5 w-3.5" />
                Resource Repository
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {resources.length} Learning Handouts, Code Examples, and Guides
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">Learning Resource Management</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide students with PDF guides, cheat sheets, code samples, and reference documentation attached to specific OOP lessons.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Resource
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources by title, description, or lesson..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            />
          </div>
          <div>
            <select
              value={lessonFilter}
              onChange={e => setLessonFilter(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            >
              <option value="All">All Lessons</option>
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  Lesson {l.sequence}: {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold transition outline-none ${inputClass}`}
            >
              <option value="All">All Resource Types</option>
              <option value="pdf">PDF Documents</option>
              <option value="code">Code Snippets / Projects</option>
              <option value="presentation">Presentations</option>
              <option value="handout">Learning Handouts</option>
              <option value="reference">Reference Guides</option>
              <option value="link">Web Links</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${cardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[10px] uppercase tracking-wider text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <tr>
                <th className="px-4 py-3.5 font-black">Type</th>
                <th className="px-4 py-3.5 font-black">Resource Title & Description</th>
                <th className="px-4 py-3.5 font-black">Associated Lesson</th>
                <th className="px-4 py-3.5 font-black">Size</th>
                <th className="px-4 py-3.5 font-black text-center">Status</th>
                <th className="px-4 py-3.5 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Loading learning materials...
                  </td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No resources found matching your search.
                  </td>
                </tr>
              ) : (
                filteredResources.map(res => (
                  <tr key={res.id} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/70'}`}>
                    {/* Type Badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-slate-500">
                        {getTypeIcon(res.resourceType)}
                        <span>{res.resourceType}</span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3">
                      <div>
                        <strong className="block text-xs font-black text-slate-900 dark:text-white">
                          {res.title}
                        </strong>
                        <span className="block text-[11px] text-slate-400 truncate max-w-sm">
                          {res.description || 'No description provided.'}
                        </span>
                      </div>
                    </td>

                    {/* Lesson */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {res.lessonTitle || res.lessonId}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {res.fileSize || 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(res)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase cursor-pointer ${
                          res.status === 'Published'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {res.status}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition"
                          title="Open/Download Resource"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(res)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition cursor-pointer"
                          title="Edit Resource"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(res)}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition cursor-pointer"
                          title="Remove Resource"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      {(isCreateOpen || editingResource) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black">
                  {editingResource ? `Edit Resource: ${editingResource.title}` : 'Add Learning Resource'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingResource(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Associated Lesson *
                </label>
                <select
                  required
                  value={formData.lessonId}
                  onChange={e => setFormData({ ...formData, lessonId: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                >
                  {lessons.map(l => (
                    <option key={l.id} value={l.id}>
                      Lesson {l.sequence}: {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Java OOP Class Diagram Reference PDF"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={formData.resourceType}
                    onChange={e => setFormData({ ...formData, resourceType: e.target.value as any })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="code">Code Snippet / Source</option>
                    <option value="presentation">Presentation</option>
                    <option value="handout">Handout / Worksheet</option>
                    <option value="reference">Reference Documentation</option>
                    <option value="link">Web Resource Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Estimated File Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2.4 MB"
                    value={formData.fileSize}
                    onChange={e => setFormData({ ...formData, fileSize: e.target.value })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  File URL / Path *
                </label>
                <input
                  type="text"
                  required
                  placeholder="/resources/java_oop_guide.pdf or https://..."
                  value={formData.fileUrl}
                  onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of this material and how students should use it..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingResource(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-sm transition cursor-pointer"
                >
                  {editingResource ? 'Save Changes' : 'Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Remove Resource?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteTarget.title}"</strong>?
              Students will no longer be able to download this file.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
