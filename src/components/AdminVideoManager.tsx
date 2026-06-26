import React, { useState, useMemo, useRef } from 'react';
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
  AlertCircle,
  UploadCloud,
  Check,
  FileText,
  FileVideo,
  Settings,
  HelpCircle,
  UserRound,
  Building2,
  Link2,
  CalendarDays,
  Copyright
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

// SHA-256 signature generator using Web Crypto API
async function generateSignature(paramsToSign: Record<string, any>, apiSecret: string): Promise<string> {
  const sortedKeys = Object.keys(paramsToSign).sort();
  const signatureString = sortedKeys
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&') + apiSecret;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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

  // Cloudinary credentials & options (persisted locally)
  const [cloudinaryConfig, setCloudinaryConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('oophub_cloudinary_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    
    // Fall back to environment variables or defaults
    return {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || import.meta.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY || import.meta.env.CLOUDINARY_API_KEY || '',
      apiSecret: import.meta.env.VITE_CLOUDINARY_API_SECRET || import.meta.env.CLOUDINARY_API_SECRET || '',
      maxFileSize: 100 // Default 100 MB
    };
  });

  const [showConfig, setShowConfig] = useState(false);
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

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
  const [formYearLevel, setFormYearLevel] = useState('1st Year');
  const [formCloudinaryPublicID, setFormCloudinaryPublicID] = useState('');
  const [formCreatorName, setFormCreatorName] = useState('');
  const [formPublisherName, setFormPublisherName] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formPublicationDate, setFormPublicationDate] = useState('');
  const [formLicenseType, setFormLicenseType] = useState('');

  // Drag-and-drop & upload progress states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(-1); // -1 = idle
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const isExternalEmbeddedVideo = (videoUrl: string, publicId: string) => {
    const normalizedUrl = videoUrl.trim().toLowerCase();
    const hasCloudinaryAsset = publicId.trim().length > 0 || normalizedUrl.includes('res.cloudinary.com/');

    return normalizedUrl.startsWith('http') && !hasCloudinaryAsset;
  };

  const handleOpenAddForm = () => {
    setEditingVideo(null);
    setFormTitle('');
    setFormDescription('');
    setFormVideoUrl('');
    setFormDuration('10:00');
    setFormTopic('');
    setFormDifficulty('Beginner');
    setFormThumbnail('');
    setFormCourseId('oop');
    setFormLanguage('Java');
    setFormModule('Intro to Java & Classes');
    setFormCategory('Basics');
    setFormConcepts('State and Behavior, Class blueprints');
    setFormUnlockedAssessmentId('');
    setFormYearLevel('1st Year');
    setFormCloudinaryPublicID('');
    setFormCreatorName('');
    setFormPublisherName('');
    setFormSourceUrl('');
    setFormPublicationDate('');
    setFormLicenseType('Educational Use');
    
    // Reset file states
    setSelectedFile(null);
    setUploadProgress(-1);
    setUploadStatus('idle');
    setUploadError(null);
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
    setFormYearLevel(video.yearLevel || '1st Year');
    setFormCloudinaryPublicID(video.cloudinaryPublicID || '');
    setFormCreatorName(video.creator_name || '');
    setFormPublisherName(video.publisher_name || '');
    setFormSourceUrl(video.source_url || video.videoUrl || '');
    setFormPublicationDate(video.publication_date || '');
    setFormLicenseType(video.license_type || 'Educational Use');
    
    // Reset file states
    setSelectedFile(null);
    setUploadProgress(-1);
    setUploadStatus('idle');
    setUploadError(null);
    setIsFormOpen(true);
  };

  const handleConfigSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('oophub_cloudinary_config', JSON.stringify(cloudinaryConfig));
    setConfigSuccessMsg('Cloudinary credentials updated successfully!');
    setTimeout(() => setConfigSuccessMsg(null), 3000);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const validExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setUploadError(`Unsupported file format. Supported: MP4, MOV, AVI, WebM`);
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > cloudinaryConfig.maxFileSize) {
      setUploadError(`File is too large (${fileSizeMB.toFixed(1)}MB). Limit is ${cloudinaryConfig.maxFileSize}MB.`);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadStatus('idle');
    
    // Autofill title if empty
    if (!formTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setFormTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  // Upload to Cloudinary action
  const performUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError(null);

    const isCloudNameValid = cloudinaryConfig.cloudName && cloudinaryConfig.cloudName.trim().length > 0;
    const isApiKeyValid = cloudinaryConfig.apiKey && cloudinaryConfig.apiKey.trim().length > 0;
    const isApiSecretValid = cloudinaryConfig.apiSecret && cloudinaryConfig.apiSecret.trim().length > 0;

    const useRealCloudinary = isCloudNameValid && isApiKeyValid && isApiSecretValid;

    if (!useRealCloudinary) {
      // Credentials not set - Execute simulation mode
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Generate mock Cloudinary response details
          const mockPublicId = `mock_tutorial_${Date.now()}`;
          const mockUrl = `https://res.cloudinary.com/demo/video/upload/tutorial-videos/${mockPublicId}.mp4`;
          const mockThumbnailUrl = `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=300&q=80`;
          
          setFormVideoUrl(mockUrl);
          setFormCloudinaryPublicID(mockPublicId);
          setFormThumbnail(mockThumbnailUrl);
          setFormDuration('12:45'); // Simulated duration
          setUploadStatus('success');
          setUploadProgress(100);
        } else {
          setUploadProgress(progress);
        }
      }, 300);
      return;
    }

    // Real signed upload to Cloudinary using XMLHttpRequest
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/video/upload`, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            const durationSecs = response.duration || 0;
            const mins = Math.floor(durationSecs / 60);
            const secs = Math.round(durationSecs % 60);
            const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            const secureUrl = response.secure_url;
            const publicId = response.public_id;
            
            // Build visual thumbnail URL from Cloudinary (image delivery of video)
            const thumbnailUrl = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/w_300,h_200,c_fill/${publicId}.jpg`;
            
            setFormVideoUrl(secureUrl);
            setFormCloudinaryPublicID(publicId);
            setFormThumbnail(thumbnailUrl);
            setFormDuration(durationStr);
            setUploadStatus('success');
          } catch (err) {
            setUploadStatus('error');
            setUploadError('Failed to parse Cloudinary response data.');
          }
        } else {
          try {
            const errResponse = JSON.parse(xhr.responseText);
            setUploadStatus('error');
            setUploadError(errResponse.error?.message || `Upload failed with status ${xhr.status}`);
          } catch {
            setUploadStatus('error');
            setUploadError(`Cloudinary upload failed: HTTP Status ${xhr.status}`);
          }
        }
      };
      
      xhr.onerror = () => {
        setUploadStatus('error');
        setUploadError('Network error connecting to Cloudinary. Check network status.');
      };
      
      const timestamp = Math.round(Date.now() / 1000).toString();
      const paramsToSign = {
        folder: 'tutorial-videos',
        timestamp: timestamp
      };
      
      const signature = await generateSignature(paramsToSign, cloudinaryConfig.apiSecret);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('api_key', cloudinaryConfig.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('folder', 'tutorial-videos');
      formData.append('signature', signature);
      
      xhr.send(formData);
    } catch (err: any) {
      setUploadStatus('error');
      setUploadError(err.message || 'An unexpected error occurred during signed signature generation.');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please provide a title');
      return;
    }
    if (!formCreatorName.trim()) {
      alert('Please provide the video creator or author for citation.');
      return;
    }
    if (!formVideoUrl) {
      alert('Please select and upload a video file first, or provide a URL.');
      return;
    }
    const requiresSourceUrl = isExternalEmbeddedVideo(formVideoUrl, formCloudinaryPublicID);
    if (requiresSourceUrl && !formSourceUrl.trim()) {
      alert('Original Source URL is required for embedded external videos.');
      return;
    }
    if (formSourceUrl.trim()) {
      try {
        new URL(formSourceUrl.trim());
      } catch {
        alert('Please enter a valid Original Source URL.');
        return;
      }
    }

    const conceptsArray = formConcepts.split(',').map(c => c.trim()).filter(Boolean);
    const citationTimestamp = new Date().toISOString();
    const resolvedSourceUrl = formSourceUrl.trim() || formVideoUrl.trim();

    const videoData: VideoLesson = {
      id: editingVideo ? editingVideo.id : `vl_${Date.now()}`,
      title: formTitle,
      description: formDescription,
      videoUrl: formVideoUrl,
      duration: formDuration,
      sequence: editingVideo ? editingVideo.sequence : (lessons.length + 1),
      status: editingVideo ? editingVideo.status : (lessons.length === 0 ? 'active' : 'locked'),
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
      progressPercent: editingVideo ? editingVideo.progressPercent : 0,
      
      // Cloudinary metadata
      cloudinaryPublicID: formCloudinaryPublicID,
      yearLevel: formYearLevel,
      createdAt: editingVideo ? editingVideo.createdAt : new Date().toISOString(),
      createdBy: editingVideo ? editingVideo.createdBy : 'Administrator',

      // Citation metadata
      video_title: formTitle.trim(),
      creator_name: formCreatorName.trim(),
      publisher_name: formPublisherName.trim() || 'OOP Pedagogical Hub',
      source_url: resolvedSourceUrl,
      publication_date: formPublicationDate || undefined,
      accessed_date: editingVideo?.accessed_date || citationTimestamp,
      license_type: formLicenseType.trim() || undefined,
      citation_created_at: editingVideo?.citation_created_at || citationTimestamp
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
      const rate = Math.round(((l.completedStudents?.length || 0) / totalStuds) * 105);
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

  // Cloudinary credentials configuration state checks
  const isCloudinaryConfigured = cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret;
  const isCitationSourceRequired = isExternalEmbeddedVideo(formVideoUrl, formCloudinaryPublicID);

  return (
    <div className="space-y-6 text-slate-800" id="video-tutorial-management-workspace">
      
      {/* Cloudinary Integration Configuration Collapsible widget */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full px-5 py-4 flex items-center justify-between font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings className={`w-4.5 h-4.5 text-indigo-650 ${showConfig ? 'animate-spin-slow' : ''}`} />
            Cloudinary Video Storage Configuration Setup
          </span>
          <span className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isCloudinaryConfigured ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
              ● {isCloudinaryConfigured ? 'Production Storage Mode' : 'Simulation Mode'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showConfig ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {showConfig && (
          <form onSubmit={handleConfigSave} className="p-5 border-t border-slate-200 space-y-4 animate-fade-in">
            <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed font-semibold">
              <span className="flex items-center gap-1.5"><HelpCircle className="w-4 h-4 shrink-0 text-indigo-605" /> Storage Notes:</span>
              <p className="mt-1">By default, if you don't input API credentials, video uploads will run in <strong>Simulation Mode</strong> (generating mock Cloudinary links for instantaneous testing). To sync with real storage, fill details below and credentials will save to your local browser storage.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Cloud Name</label>
                <input 
                  type="text" 
                  value={cloudinaryConfig.cloudName}
                  onChange={e => setCloudinaryConfig({...cloudinaryConfig, cloudName: e.target.value})}
                  placeholder="e.g. oophub-storage"
                  className="w-full bg-slate-50 border border-slate-205 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">API Key</label>
                <input 
                  type="text" 
                  value={cloudinaryConfig.apiKey}
                  onChange={e => setCloudinaryConfig({...cloudinaryConfig, apiKey: e.target.value})}
                  placeholder="Cloudinary API Key"
                  className="w-full bg-slate-50 border border-slate-205 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">API Secret</label>
                <input 
                  type="password" 
                  value={cloudinaryConfig.apiSecret}
                  onChange={e => setCloudinaryConfig({...cloudinaryConfig, apiSecret: e.target.value})}
                  placeholder="••••••••••••••••"
                  className="w-full bg-slate-50 border border-slate-205 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">Max Video File Size Limit (MB)</label>
                <input 
                  type="number" 
                  value={cloudinaryConfig.maxFileSize}
                  onChange={e => setCloudinaryConfig({...cloudinaryConfig, maxFileSize: Number(e.target.value)})}
                  placeholder="100"
                  className="w-full bg-slate-50 border border-slate-205 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-500 transition"
                />
              </div>
              <div className="flex items-end justify-between">
                {configSuccessMsg ? (
                  <span className="text-xs text-emerald-650 font-bold flex items-center gap-1"><Check className="w-4 h-4" /> {configSuccessMsg}</span>
                ) : <span />}
                <button
                  type="submit"
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow cursor-pointer active:scale-95 transition-all select-none"
                >
                  Save Connection Details
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

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
                          className={`p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-605 disabled:opacity-20`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] text-slate-800 font-black">{video.sequence}</span>
                        <button 
                          onClick={() => moveVideo(video, 'down')}
                          disabled={index === filteredVideos.length - 1}
                          className={`p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-605 disabled:opacity-20`}
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
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[8px] font-mono font-bold bg-slate-100 text-slate-500 border rounded px-1">
                              {video.cloudinaryPublicID ? 'Cloudinary' : 'External Link'}
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
                        Topic: {video.topic || 'General'} | {video.yearLevel || '1st Year'}
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
                          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg transition"
                          title="Track Student Progress"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleOpenEditForm(video)}
                          className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-slate-100 rounded-lg transition"
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
                          className="p-1.5 text-slate-400 hover:text-rose-605 hover:bg-rose-50 rounded-lg transition"
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
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 text-left">
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
                className="p-1.5 text-slate-405 hover:text-slate-605 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
              
              {/* Drag and Drop Zone or Status indicator */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Video File Upload</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                    dragOver ? 'border-indigo-505 bg-indigo-50/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700">
                      {selectedFile ? `Selected: ${selectedFile.name}` : 'Drag & drop video file here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {selectedFile ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Supported: MP4, MOV, AVI, WebM'}
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> {uploadError}
                  </p>
                )}

                {/* File Upload Actions & Progress Bar */}
                {selectedFile && (
                  <div className="p-3 border rounded-xl bg-slate-50 border-slate-200 flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-bold text-slate-700">Cloudinary Upload Status</span>
                      <span className={`font-mono font-black ${uploadStatus === 'success' ? 'text-emerald-650' : uploadStatus === 'error' ? 'text-rose-600' : 'text-indigo-650'}`}>
                        {uploadStatus === 'idle' && 'Ready to upload'}
                        {uploadStatus === 'uploading' && `Uploading (${uploadProgress}%)`}
                        {uploadStatus === 'success' && 'Upload Successful!'}
                        {uploadStatus === 'error' && 'Upload Failed'}
                      </span>
                    </div>

                    {uploadProgress >= 0 && (
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end mt-1">
                      {uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                        <button
                          type="button"
                          onClick={performUpload}
                          className="bg-indigo-600 hover:bg-indigo-705 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg active:scale-95 transition cursor-pointer"
                        >
                          {isCloudinaryConfigured ? 'Start Cloudinary Upload' : 'Start Simulated Upload'}
                        </button>
                      )}
                      {uploadStatus === 'success' && (
                        <span className="text-[10px] text-emerald-655 font-bold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Ready to Save</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Video Title</label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Mastering Upcasting and Downcasting"
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Description</label>
                <textarea 
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Provide a detailed outline of v-tables address pointer allocations..."
                  className="w-full h-16 bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition resize-none font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Video URL (Autofilled on Upload)</label>
                  <input 
                    type="text" 
                    value={formVideoUrl}
                    onChange={e => setFormVideoUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Duration (Autofilled)</label>
                  <input 
                    type="text" 
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    placeholder="e.g. 14:50"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#dfe8c5] bg-[#f8faf2] p-4 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-[#dfe8c5] pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-[#5f6f24]">
                      <FileText className="w-4 h-4" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider">Video Citation & Copyright</h3>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                      Required attribution details are saved with the video record and shown to students.
                    </p>
                  </div>
                  <span className="rounded-md border border-[#dfe8c5] bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#5f6f24]">
                    Required
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <UserRound className="w-3.5 h-3.5 text-[#6b7f2a]" />
                      Author / Creator
                    </label>
                    <input
                      type="text"
                      value={formCreatorName}
                      onChange={e => setFormCreatorName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none transition focus:border-[#6b7f2a] focus:ring-4 focus:ring-[#dfe8c5]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-[#6b7f2a]" />
                      Publisher / Channel
                    </label>
                    <input
                      type="text"
                      value={formPublisherName}
                      onChange={e => setFormPublisherName(e.target.value)}
                      placeholder="e.g. Programming Academy"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none transition focus:border-[#6b7f2a] focus:ring-4 focus:ring-[#dfe8c5]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Link2 className="w-3.5 h-3.5 text-[#6b7f2a]" />
                    Original Source URL {isCitationSourceRequired ? '(Required for external embed)' : '(Optional for original upload)'}
                  </label>
                  <input
                    type="url"
                    value={formSourceUrl}
                    onChange={e => setFormSourceUrl(e.target.value)}
                    placeholder="https://example.com/video"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none transition focus:border-[#6b7f2a] focus:ring-4 focus:ring-[#dfe8c5]"
                    required={isCitationSourceRequired}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <CalendarDays className="w-3.5 h-3.5 text-[#6b7f2a]" />
                      Publication Date
                    </label>
                    <input
                      type="date"
                      value={formPublicationDate}
                      onChange={e => setFormPublicationDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none transition focus:border-[#6b7f2a] focus:ring-4 focus:ring-[#dfe8c5]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Copyright className="w-3.5 h-3.5 text-[#6b7f2a]" />
                      Copyright / License
                    </label>
                    <input
                      type="text"
                      value={formLicenseType}
                      onChange={e => setFormLicenseType(e.target.value)}
                      placeholder="e.g. Creative Commons, Educational Use"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-700 outline-none transition focus:border-[#6b7f2a] focus:ring-4 focus:ring-[#dfe8c5]"
                    />
                  </div>
                </div>

                <p className="text-[10.5px] font-semibold leading-5 text-slate-500">
                  Accessed date is generated automatically when the citation is saved.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-505 transition cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Year Level</label>
                  <select
                    value={formYearLevel}
                    onChange={e => setFormYearLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-505 transition cursor-pointer"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Language</label>
                  <input 
                    type="text" 
                    value={formLanguage}
                    onChange={e => setFormLanguage(e.target.value)}
                    placeholder="Java"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Course</label>
                  <select
                    value={formCourseId}
                    onChange={e => setFormCourseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-505 transition cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Programming Topic</label>
                  <input 
                    type="text" 
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    placeholder="e.g. Polymorphic Overrides"
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Thumbnail URL (Autofilled)</label>
                  <input 
                    type="text" 
                    value={formThumbnail}
                    onChange={e => setFormThumbnail(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block font-sans">Prerequisite Lock (Unlocks Assessment)</label>
                  <select
                    value={formUnlockedAssessmentId}
                    onChange={e => setFormUnlockedAssessmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-750 text-xs focus:bg-white focus:border-indigo-505 transition cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-slate-700 text-xs focus:bg-white focus:border-indigo-505 transition"
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
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition cursor-pointer shadow-md shadow-indigo-150"
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
            <div className="flex justify-between items-center border-b pb-3 border-slate-100 text-left">
              <div>
                <span className="text-[9px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded uppercase">Progress tracker</span>
                <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                  Learners progress: {trackingVideo.title}
                </h3>
              </div>
              <button 
                onClick={() => setTrackingVideoId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-slate-50 rounded-lg transition"
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
                  <Clock className="w-3.5 h-3.5 text-amber-505" /> In Progress Students ({trackingVideo.inProgressStudents?.length || 0})
                </h4>
                <div className="bg-slate-55 p-2.5 rounded-xl border border-slate-100 space-y-1.5 max-h-24 overflow-y-auto">
                  {trackingVideo.inProgressStudents && trackingVideo.inProgressStudents.length > 0 ? (
                    trackingVideo.inProgressStudents.map(s => (
                      <div key={s} className="flex justify-between text-xs font-semibold py-0.5">
                        <span className="text-slate-700">{s}</span>
                        <span className="text-amber-605 font-mono font-bold">In Progress</span>
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
                      <div key={s} className="text-xs font-semibold py-0.5 text-slate-605">
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
