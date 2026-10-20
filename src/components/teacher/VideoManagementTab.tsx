import React, { useState, useEffect, useMemo } from 'react';
import {
  PlayCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  Archive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Layers,
  X,
  Play,
  Trash2,
  Video
} from 'lucide-react';
import { ManagedVideo, ManagedLesson } from '../../types';
import { API_BASE_URL, validateVideoUrl, videoApi, lessonApi } from '../../services/api';
import { OOP_COURSE_LESSONS } from '../../data/oopCourse';

interface VideoManagementTabProps {
  theme?: 'light' | 'dark';
}

export default function VideoManagementTab({ theme = 'light' }: VideoManagementTabProps) {
  const isDark = theme === 'dark';
  const [videos, setVideos] = useState<ManagedVideo[]>([]);
  const [lessons, setLessons] = useState<ManagedLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lessonFilter, setLessonFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ManagedVideo | null>(null);
  const [previewingVideo, setPreviewingVideo] = useState<ManagedVideo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedVideo | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    lessonId: '',
    title: '',
    videoUrl: '',
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
      // 1. Load lessons for dropdown
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
          videoUrl: l.video_url || l.videoUrl || '',
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

      // 2. Load videos
      const videoRes = await videoApi.list();
      if (videoRes.data && Array.isArray(videoRes.data)) {
        setVideos(videoRes.data.map((video: ManagedVideo) => (
          video.storageProvider === 'local' && video.videoUrl.startsWith('/api/')
            ? { ...video, videoUrl: `${API_BASE_URL}${video.videoUrl}` }
            : video
        )));
      } else {
        setVideos([]);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to load video library.' });
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch =
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.lessonTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchLesson = lessonFilter === 'All' ? true : v.lessonId === lessonFilter;
      const matchStatus = statusFilter === 'All' ? true : v.status === statusFilter;
      return matchSearch && matchLesson && matchStatus;
    });
  }, [videos, searchTerm, lessonFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      lessonId: lessons[0]?.id || 'oop_lesson_1',
      title: '',
      videoUrl: '',
      description: '',
      status: 'Published'
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (v: ManagedVideo) => {
    setEditingVideo(v);
    setFormData({
      lessonId: v.lessonId,
      title: v.title,
      videoUrl: v.videoUrl,
      description: v.description,
      status: v.status
    });
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!formData.title.trim()) {
      setFeedback({ type: 'error', message: 'Video title is required.' });
      return;
    }

    setIsSaving(true);
    try {
      let videoUrl = formData.videoUrl.trim();
      const urlError = validateVideoUrl(videoUrl);
      if (urlError) throw new Error(urlError);

      const payload = {
        ...formData,
        videoUrl,
        storageProvider: '',
        storageKey: '',
        storageContentType: '',
        storageSize: null
      };
      if (editingVideo) {
        await videoApi.update(editingVideo.id, payload);
        setFeedback({ type: 'success', message: `Video "${formData.title}" updated successfully.` });
        setEditingVideo(null);
      } else {
        await videoApi.create(payload);
        setFeedback({ type: 'success', message: `Video "${formData.title}" added successfully.` });
        setIsCreateOpen(false);
      }
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save video.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await videoApi.remove(deleteTarget.id);
      setFeedback({ type: 'success', message: `Video "${deleteTarget.title}" removed.` });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove video.' });
    }
  };

  const handleTogglePublish = async (video: ManagedVideo) => {
    const nextStatus = video.status === 'Published' ? 'Draft' : 'Published';
    try {
      await videoApi.update(video.id, { status: nextStatus });
      setFeedback({
        type: 'success',
        message: `Video "${video.title}" set to ${nextStatus.toLowerCase()}.`
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update video status.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Action Header */}
      <div className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Video className="h-3.5 w-3.5" />
                Media Hub
              </span>
              <span className="text-xs text-slate-400 font-bold">
                {videos.length} Managed Videos ({videos.filter(v => v.status === 'Published').length} Published)
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black">Video Management</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Attach video tutorials to lessons, configure playback URLs, test embeds, and manage student video requirements.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Video
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
              placeholder="Search videos by title, lesson, or description..."
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

      {/* Videos Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-bold">
            Loading video library...
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className={`col-span-full rounded-2xl border p-12 text-center text-slate-400 font-bold ${cardClass}`}>
            No videos found matching your filters.
          </div>
        ) : (
          filteredVideos.map(video => (
            <div
              key={video.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${cardClass}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {video.lessonTitle || 'Lesson Material'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(video)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase cursor-pointer ${
                      video.status === 'Published'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {video.status}
                  </button>
                </div>

                <h3 className="mt-3 text-sm font-black line-clamp-1">{video.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {video.description || 'No description provided.'}
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {video.duration}
                  </span>
                  <span className="truncate max-w-[180px] text-[11px] underline">
                    {video.videoUrl}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewingVideo(video)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  Preview
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(video)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Edit Video"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(video)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Remove Video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isCreateOpen || editingVideo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black">
                  {editingVideo ? `Edit Video: ${editingVideo.title}` : 'Add New Video'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingVideo(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Target Lesson *
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
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Understanding Constructors in Java"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Video Source *
                </label>
                <div className={`rounded-xl border px-3 py-2 text-xs font-black ${isDark ? 'border-slate-800 bg-slate-950 text-indigo-300' : 'border-slate-200 bg-slate-50 text-indigo-700'}`}>Video Link</div>
              </div>

              <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Video URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or a supported video URL"
                    value={formData.videoUrl}
                    onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  />
                </div>
              {/* Local file upload UI intentionally removed; URL links are the only active source.
              {false && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Video File *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required={videoSource === 'upload' && !editingVideo}
                    accept="video/*"
                    onChange={e => handleFileChange(e.target.files?.[0])}
                    className="hidden"
                  />
                  <div
                    onDragEnter={e => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragOver={e => e.preventDefault()}
                    onDragLeave={e => { e.preventDefault(); setIsDraggingFile(false); }}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      handleFileChange(e.dataTransfer.files?.[0]);
                    }}
                    className={`rounded-xl border-2 border-dashed p-4 text-center transition ${isDraggingFile ? 'border-indigo-500 bg-indigo-500/10' : isDark ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Drag and drop a video here</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
                    >
                      Choose Video File
                    </button>
                    <p className="mt-2 text-[11px] text-slate-400">MP4 only · maximum 25 MB</p>
                  </div>
                  {selectedFile && (
                    <div className="mt-2 rounded-lg bg-indigo-500/10 px-3 py-2 text-xs text-indigo-600">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">{selectedFile.name}</p>
                          <p className="mt-0.5 text-[11px] font-bold">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · {selectedFile.type || 'video file'}{selectedDuration > 0 ? ` · ${formatDuration(selectedDuration)}` : ''}</p>
                        </div>
                        <button type="button" onClick={clearSelectedFile} className="shrink-0 font-black underline hover:text-indigo-800">Remove</button>
                      </div>
                      {previewUrl && (
                        <video src={previewUrl} controls preload="metadata" onLoadedMetadata={event => setSelectedDuration(event.currentTarget.duration)} className="mt-3 max-h-40 w-full rounded-lg bg-black" aria-label="Selected video preview" />
                      )}
                    </div>
                  )}
                  {isSaving && videoSource === 'upload' && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] font-black text-slate-400">
                        <span>Uploading to secure storage…</span><span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )} */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none ${inputClass}`}
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Key concepts covered in this video..."
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
                    setEditingVideo(null);
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : (editingVideo ? 'Save Changes' : 'Add Video')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW VIDEO MODAL */}
      {previewingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl my-8 ${cardClass}`}>
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-black">{previewingVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingVideo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center">
                {previewingVideo.videoUrl.includes('youtube.com') || previewingVideo.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={
                      previewingVideo.videoUrl.includes('embed')
                        ? previewingVideo.videoUrl
                        : previewingVideo.videoUrl.replace('watch?v=', 'embed/').split('&')[0]
                    }
                    title={previewingVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Play className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-xs font-bold">Direct Video Link: {previewingVideo.videoUrl}</p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                  Associated Lesson: {previewingVideo.lessonTitle || previewingVideo.lessonId}
                </span>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {previewingVideo.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-4 text-xs font-mono text-slate-400 dark:border-slate-800">
                <span>Duration: {previewingVideo.duration}</span>
                <span className="capitalize">Status: {previewingVideo.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${cardClass}`}>
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">Remove Video?</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteTarget.title}"</strong>?
              This video will no longer be linked to {deleteTarget.lessonTitle || 'its lesson'}.
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
