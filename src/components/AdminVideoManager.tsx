import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Archive, 
  CheckCircle, 
  Eye, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Film, 
  BookOpen, 
  Users, 
  BarChart2, 
  ArrowRight, 
  Lock, 
  Unlock,
  AlertCircle
} from 'lucide-react';
import { VideoLesson } from '../types';

interface AdminVideoManagerProps {
  lessons: VideoLesson[];
  onAddVideo: (video: VideoLesson) => void;
  onEditVideo: (video: VideoLesson) => void;
  onArchiveVideo: (id: string) => void;
  onDeleteVideo: (id: string) => void;
  onUpdateSequence: (id: string, newSeq: number) => void;
}

export default function AdminVideoManager({
  lessons,
  onAddVideo,
  onEditVideo,
  onArchiveVideo,
  onDeleteVideo,
  onUpdateSequence
}: AdminVideoManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('active'); // active, archived, all
  
  // Tracking modal / detail view
  const [trackingVideoId, setTrackingVideoId] = useState<string | null>(null);
  
  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoLesson | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDuration, setFormDuration] = useState('10:00');
  const [formTopic, setFormTopic] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formCourseId, setFormCourseId] = useState('oop');
  const [formLanguage, setFormLanguage] = useState('Java');
  const [formModule, setFormModule] = useState('Intro to Java & Classes');
  const [formCategory, setFormCategory] = useState('Basics');
  const [formConcepts, setFormConcepts] = useState('');
  const [formUnlockedAssessmentId, setFormUnlockedAssessmentId] = useState('');

  // Course Options
  const courseOptions = [
    { id: 'oop', name: 'OOP Fundamentals' },
    { id: 'java_lang', name: 'Java Programming' },
    { id: 'swing_ui', name: 'Java Swing UI' }
  ];

  // Assessment Options
  const assessmentOptions = [
    { id: 'a2', name: 'Encapsulation & Access Quiz' },
    { id: 'a1', name: 'Inheritance & super Quiz' }
  ];

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setFormTitle('');
    setFormDescription('');
    setFormVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    setFormDuration('10:00');
    setFormTopic('');
    setFormDifficulty('Beginner');
    setFormThumbnail('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80');
    setFormCourseId('oop');
    setFormLanguage('Java');
    setFormModule('Intro to Java & Classes');
    setFormCategory('Basics');
    setFormConcepts('State and Behavior, Class blueprints');
    setFormUnlockedAssessmentId('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (video: VideoLesson) => {
    setEditingVideo(video);
    setFormTitle(video.title);
    setFormDescription(video.description);
    setFormVideoUrl(video.videoUrl);
    setFormDuration(video.duration);
    setFormTopic(video.topic || '');
    setFormDifficulty(video.difficulty || 'Beginner');
    setFormThumbnail(video.thumbnailUrl || '');
    setFormCourseId(video.courseId || 'oop');
    setFormLanguage(video.language || 'Java');
    setFormModule(video.module || 'Intro to Java & Classes');
    setFormCategory(video.category || 'Basics');
    setFormConcepts(video.concepts.join(', '));
    setFormUnlockedAssessmentId(video.unlockedAssessmentId || '');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please provide a title');
      return;
    }

    const conceptsArray = formConcepts.split(',').map(c => c.trim()).filter(Boolean);

    const videoData: VideoLesson = {
      id: editingVideo ? editingVideo.id : `vl_${Date.now()}`,
      title: formTitle,
      description: formDescription,
      videoUrl: formVideoUrl,
      duration: formDuration,
      sequence: editingVideo ? editingVideo.sequence : (lessons.length + 1),
      status: editingVideo ? editingVideo.status : 'active',
      concepts: conceptsArray,
      thumbnailUrl: formThumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80',
      topic: formTopic,
      difficulty: formDifficulty,
      courseId: formCourseId,
      language: formLanguage,
      module: formModule,
      category: formCategory,
      isArchived: editingVideo ? editingVideo.isArchived : false,
      unlockedAssessmentId: formUnlockedAssessmentId || undefined,
      views: editingVideo ? editingVideo.views : 0,
      avgWatchTime: editingVideo ? editingVideo.avgWatchTime : 0,
      completedStudents: editingVideo ? editingVideo.completedStudents : [],
      inProgressStudents: editingVideo ? editingVideo.inProgressStudents : [],
      notStartedStudents: editingVideo ? editingVideo.notStartedStudents : ['rodriguez@oophub.edu', 'volkov@oophub.edu', 'chen@oophub.edu', 'hughes@oophub.edu'],
      progressPercent: editingVideo ? editingVideo.progressPercent : 0
    };

    if (editingVideo) {
      onEditVideo(videoData);
      alert('Video tutorial updated successfully.');
    } else {
      onAddVideo(videoData);
      alert('New video tutorial uploaded successfully.');
    }
    setIsFormOpen(false);
  };

  // Resequence operations
  const moveVideo = (video: VideoLesson, direction: 'up' | 'down') => {
    const list = [...lessons].sort((a, b) => a.sequence - b.sequence);
    const index = list.findIndex(l => l.id === video.id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const prev = list[index - 1];
      onUpdateSequence(video.id, prev.sequence);
      onUpdateSequence(prev.id, video.sequence);
    } else if (direction === 'down' && index < list.length - 1) {
      const next = list[index + 1];
      onUpdateSequence(video.id, next.sequence);
      onUpdateSequence(next.id, video.sequence);
    }
  };

  // Filter & Search logic
  const filteredVideos = useMemo(() => {
    return lessons.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.topic && v.topic.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCourse = courseFilter === 'all' || v.courseId === courseFilter;
      const matchesDiff = difficultyFilter === 'all' || v.difficulty === difficultyFilter;
      
      const isArchived = v.isArchived || false;
      const matchesArchive = archiveFilter === 'all' ||
        (archiveFilter === 'active' && !isArchived) ||
        (archiveFilter === 'archived' && isArchived);

      return matchesSearch && matchesCourse && matchesDiff && matchesArchive;
    }).sort((a, b) => a.sequence - b.sequence);
  }, [lessons, searchQuery, courseFilter, difficultyFilter, archiveFilter]);

  // Analytics derivations
  const analytics = useMemo(() => {
    const activeLessons = lessons.filter(l => !l.isArchived);
    const totalVideos = activeLessons.length;
    
    const sortedByViews = [...activeLessons].sort((a, b) => (b.views || 0) - (a.views || 0));
    const mostViewed = sortedByViews[0]?.title || 'None';
    
    // Completion rates calculations
    const withCompletionRates = activeLessons.map(l => {
      const totalStuds = (l.completedStudents?.length || 0) + (l.inProgressStudents?.length || 0) + (l.notStartedStudents?.length || 0) || 1;
      const rate = Math.round(((l.completedStudents?.length || 0) / totalStuds) * 100);
      return { title: l.title, rate, views: l.views || 0 };
    });

    const sortedByCompletion = [...withCompletionRates].sort((a, b) => b.rate - a.rate);
    const highestComp = sortedByCompletion.length > 0 && sortedByCompletion[0].rate > 0 ? `${sortedByCompletion[0].title} (${sortedByCompletion[0].rate}%)` : 'None';
    const lowestComp = sortedByCompletion.length > 0 && sortedByCompletion[sortedByCompletion.length - 1].rate < 100 ? `${sortedByCompletion[sortedByCompletion.length - 1].title} (${sortedByCompletion[sortedByCompletion.length - 1].rate}%)` : 'None';
    
    const totalViews = activeLessons.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const avgWatchTimeSeconds = activeLessons.length > 0 
      ? Math.round(activeLessons.reduce((acc, curr) => acc + (curr.avgWatchTime || 0), 0) / activeLessons.length) 
      : 0;

    return {
      totalVideos,
      mostViewed,
      highestComp,
      lowestComp,
      totalViews,
      avgWatchTime: `${Math.floor(avgWatchTimeSeconds / 60)}m ${avgWatchTimeSeconds % 60}s`
    };
  }, [lessons]);

  const trackingVideo = lessons.find(l => l.id === trackingVideoId);

  return (
    <div className="space-y-6 text-slate-800" id="video-tutorial-management-workspace">
      
      {/* 1. Analytics Dashboard Header Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 animate-fade-in" id="video-analytics-cards">
        {[
          { label: 'Total Active Videos', value: analytics.totalVideos, color: 'text-indigo-600', icon: <Film className="w-4 h-4" /> },
          { label: 'Total Video Views', value: analytics.totalViews, color: 'text-emerald-600', icon: <Eye className="w-4 h-4" /> },
          { label: 'Most Viewed Video', value: analytics.mostViewed, color: 'text-amber-600', icon: <Eye className="w-4 h-4" />, fullWidth: true },
          { label: 'Avg Watch Time', value: analytics.avgWatchTime, color: 'text-teal-600', icon: <Clock className="w-4 h-4" /> },
          { label: 'Highest Completion', value: analytics.highestComp, color: 'text-emerald-700', icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, fullWidth: true },
          { label: 'Lowest Completion', value: analytics.lowestComp, color: 'text-rose-600', icon: <AlertCircle className="w-4 h-4 text-rose-500" />, fullWidth: true }
        ].map((item, idx) => (
          <div 
            key={idx} 
            className={`bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between border border-slate-100 hover:shadow-md transition-shadow ${
              item.fullWidth ? 'col-span-2 lg:col-span-2' : ''
            }`}
          >
            <div className="flex justify-between items-center text-slate-405 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
              <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">{item.icon}</div>
            </div>
            <p className={`text-xs lg:text-sm font-extrabold tracking-tight truncate ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* 2. List Controllers, Filter, Sort and Search */}
      <div className="bg-white border border-slate-205 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between" id="video-catalog-filters">
        <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search video tutorials..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-55 pl-9 pr-3 text-xs outline-none focus:bg-white focus:border-indigo-500 transition"
            />
          </div>

          {/* Filter Course */}
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white text-xs px-2.5 font-bold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="all">All Courses</option>
            {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Filter Difficulty */}
          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white text-xs px-2.5 font-bold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          {/* Filter Archived */}
          <select
            value={archiveFilter}
            onChange={e => setArchiveFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white text-xs px-2.5 font-bold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="active">Active Videos Only</option>
            <option value="archived">Archived Videos Only</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Upload Video
        </button>
      </div>

      {/* 3. Main Videos Playlist List Table */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden" id="video-catalog-list">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Video Tutorial Library ({filteredVideos.length})</h3>
          <span className="text-[10px] font-mono text-slate-400">Order controls: use Sequence Arrows to change ordering</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4 w-12 text-center">Seq</th>
                <th className="py-3 px-4">Thumbnail & Title</th>
                <th className="py-3 px-4">Course & Module</th>
                <th className="py-3 px-4">Difficulty & Topic</th>
                <th className="py-3 px-4">Prerequisite Unlock</th>
                <th className="py-3 px-4 text-center">Views / Completed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredVideos.map((video, index) => {
                const totalStuds = (video.completedStudents?.length || 0) + (video.inProgressStudents?.length || 0) + (video.notStartedStudents?.length || 0) || 1;
                const completionPercent = Math.round(((video.completedStudents?.length || 0) / totalStuds) * 100);
                const assessmentName = assessmentOptions.find(a => a.id === video.unlockedAssessmentId)?.name || 'None';
                
                return (
                  <tr key={video.id} className={`hover:bg-slate-50/50 transition-colors ${video.isArchived ? 'opacity-65 bg-slate-50/20' : ''}`}>
                    
                    {/* Sequence column with up/down sorting controls */}
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      <div className="flex flex-col items-center gap-0.5">
                        <button 
                          onClick={() => moveVideo(video, 'up')}
                          disabled={index === 0}
                          className={`p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-slate-800 font-black">{video.sequence}</span>
                        <button 
                          onClick={() => moveVideo(video, 'down')}
                          disabled={index === filteredVideos.length - 1}
                          className={`p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-20`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Title and Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-3 max-w-sm">
                        <div className="relative w-16 h-10 bg-slate-900 border border-slate-200 rounded overflow-hidden shadow-sm shrink-0">
                          <img 
                            src={video.thumbnailUrl} 
                            alt={video.title} 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute bottom-0.5 right-0.5 bg-black/75 px-1 rounded text-[8px] text-white font-mono font-bold">
                            {video.duration}
                          </div>
                          {video.videoUrl.includes('youtube.com') && (
                            <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center bg-black/20">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-900 text-xs truncate" title={video.title}>
                            {video.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                            {video.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[8px] font-mono font-bold bg-slate-100 text-slate-500 border rounded px-1">
                              {video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be') ? 'YouTube' : 'Direct File'}
                            </span>
                            {video.isArchived && (
                              <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Course & Module */}
                    <td className="py-3 px-4">
                      <span className="text-slate-900 font-bold block">
                        {courseOptions.find(c => c.id === video.courseId)?.name || video.courseId}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[150px]">
                        {video.module || 'General Module'}
                      </span>
                    </td>

                    {/* Difficulty & Topic */}
                    <td className="py-3 px-4">
                      <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono ${
                        video.difficulty === 'Beginner' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                        video.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-violet-50 text-violet-700 border border-violet-100'
                      }`}>
                        {video.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1.5 font-bold font-sans">
                        Topic: {video.topic || 'General'}
                      </span>
                    </td>

                    {/* Prerequisites locks */}
                    <td className="py-3 px-4">
                      {video.unlockedAssessmentId ? (
                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-1.5 max-w-max">
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          <div className="text-[9.5px]">
                            <span className="font-extrabold block">Unlocks Quiz</span>
                            <span className="text-slate-500 block font-medium truncate max-w-[120px]">{assessmentName}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 p-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-[10px] italic">No Quiz Lock</span>
                        </div>
                      )}
                    </td>

                    {/* Views & Completion Rates */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 block font-mono text-[11px]">
                        {video.views || 0} views
                      </span>
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 font-mono">
                        <span className={completionPercent > 70 ? 'text-emerald-650' : completionPercent > 30 ? 'text-amber-500' : 'text-slate-405'}>
                          {completionPercent}% completed
                        </span>
                      </div>
                    </td>

                    {/* Edit, delete, archive actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setTrackingVideoId(video.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Track Student Progress"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleOpenEditForm(video)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Video"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onArchiveVideo(video.id)}
                          className={`p-1.5 rounded-lg transition ${
                            video.isArchived 
                              ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                              : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                          }`}
                          title={video.isArchived ? 'Restore Video' : 'Archive Video'}
                        >
                          <Archive className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete "${video.title}"?`)) {
                              onDeleteVideo(video.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
              {filteredVideos.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No video tutorials match the search filters. Click "Upload Video" to add a new tutorial.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Upload/Edit Video Dialog Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-xl w-full mx-4 space-y-4 max-h-[85vh] overflow-y-auto animate-scale-in text-slate-850">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">
                  {editingVideo ? 'Edit tutorial' : 'New upload'}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  {editingVideo ? `Edit Video: ${editingVideo.title}` : 'Upload Video Tutorial'}
                </h3>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-405 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Video Title</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Mastering Upcasting and Downcasting"
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Description</label>
                <textarea 
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Provide a detailed outline of v-tables address pointer allocations..."
                  className="w-full h-16 bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Video Link (MP4 / YouTube)</label>
                  <input 
                    type="text" 
                    value={formVideoUrl}
                    onChange={e => setFormVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Duration (MM:SS)</label>
                  <input 
                    type="text" 
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    placeholder="e.g. 14:50"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Programming Language</label>
                  <input 
                    type="text" 
                    value={formLanguage}
                    onChange={e => setFormLanguage(e.target.value)}
                    placeholder="e.g. Java"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Course Assignment</label>
                  <select
                    value={formCourseId}
                    onChange={e => setFormCourseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                  >
                    {courseOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Module Group</label>
                  <input 
                    type="text" 
                    value={formModule}
                    onChange={e => setFormModule(e.target.value)}
                    placeholder="e.g. Inheritance vs Composition"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Programming Topic</label>
                  <input 
                    type="text" 
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="e.g. Polymorphic Overrides"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Thumbnail Image Link</label>
                  <input 
                    type="text" 
                    value={formThumbnail}
                    onChange={e => setFormThumbnail(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Prerequisite Lock (Unlocks Assessment)</label>
                  <select
                    value={formUnlockedAssessmentId}
                    onChange={e => setFormUnlockedAssessmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="">No Associated Assessment Lock</option>
                    {assessmentOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Key Concepts (Comma separated)</label>
                <input 
                  type="text" 
                  value={formConcepts}
                  onChange={e => setFormConcepts(e.target.value)}
                  placeholder="e.g. Upcasting, Late Binding, Address Resolution"
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition cursor-pointer shadow-md shadow-indigo-150"
                >
                  {editingVideo ? 'Save Changes' : 'Upload Tutorial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Student Progress Tracking Modal Drawer Overlay */}
      {trackingVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in" id="student-tracking-modal">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-lg w-full mx-4 space-y-5 animate-scale-in text-slate-800">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div className="text-left">
                <span className="text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase">Progress tracker</span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Learners progress: {trackingVideo.title}
                </h3>
              </div>
              <button 
                onClick={() => setTrackingVideoId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              {/* Completed list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Completed Students ({trackingVideo.completedStudents?.length || 0})
                </h4>
                <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-100 space-y-1.5 max-h-24 overflow-y-auto">
                  {trackingVideo.completedStudents && trackingVideo.completedStudents.length > 0 ? (
                    trackingVideo.completedStudents.map(s => (
                      <div key={s} className="flex justify-between text-xs font-semibold py-0.5">
                        <span className="text-slate-700">{s}</span>
                        <span className="text-emerald-650 font-mono font-bold">100% Watched</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-405 italic">No students have completed this video yet.</span>
                  )}
                </div>
              </div>

              {/* In Progress list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> In Progress Students ({trackingVideo.inProgressStudents?.length || 0})
                </h4>
                <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-100 space-y-1.5 max-h-24 overflow-y-auto">
                  {trackingVideo.inProgressStudents && trackingVideo.inProgressStudents.length > 0 ? (
                    trackingVideo.inProgressStudents.map(s => (
                      <div key={s} className="flex justify-between text-xs font-semibold py-0.5">
                        <span className="text-slate-700">{s}</span>
                        <span className="text-amber-600 font-mono font-bold">In Progress</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-405 italic">No students are currently watching this video.</span>
                  )}
                </div>
              </div>

              {/* Not Started list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Not Started Students ({trackingVideo.notStartedStudents?.length || 0})
                </h4>
                <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-100 space-y-1 max-h-28 overflow-y-auto">
                  {trackingVideo.notStartedStudents && trackingVideo.notStartedStudents.length > 0 ? (
                    trackingVideo.notStartedStudents.map(s => (
                      <div key={s} className="text-xs font-semibold py-0.5 text-slate-600">
                        {s}
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-405 italic">All students have started watching this video.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTrackingVideoId(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer select-none active:scale-95 transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
