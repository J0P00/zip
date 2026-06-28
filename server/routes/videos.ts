import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured, logAudit } from '../database';
import { verifySessionToken, optionalSession, requireRole } from '../middleware/auth';
import { VideoLesson, APIResponse } from '../types';
import {
  mockGetAllVideos,
  mockGetVideoById,
  mockCreateVideo,
  mockUpdateVideo,
  mockDeleteVideo
} from '../mock-db';

const router = Router();

/**
 * Helper: Format video for response
 */
function formatVideoResponse(video: any): VideoLesson {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    instructor: video.instructor,
    duration: video.duration,
    video_url: video.video_url,
    thumbnail_url: video.thumbnail_url,
    lesson_number: video.lesson_number,
    curriculum_id: video.curriculum_id,
    created_by: video.created_by,
    is_available: video.is_available,
    created_at: video.created_at,
    updated_at: video.updated_at
  };
}

/**
 * GET /api/videos
 * Get all available videos for authenticated students
 */
router.get('/', optionalSession, async (req: Request, res: Response) => {
  try {
    let videos: any[] = [];
    let error: any = null;

    if (isSupabaseConfigured) {
      // Query Supabase
      const result = await supabase
        .from('video_lessons')
        .select('*')
        .eq('is_available', true)
        .order('lesson_number', { ascending: true });

      videos = result.data || [];
      error = result.error;
    } else {
      // Use mock database
      const result = await mockGetAllVideos();
      videos = result.data || [];
      error = result.error;
    }

    if (error) {
      console.error('Error fetching videos:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch videos',
        error: typeof error === 'string' ? error : error.message
      } as APIResponse<null>);
    }

    // Log video access for authenticated users
    if (req.user) {
      await logAudit(req.user.user_id, 'VIDEO_LIST_ACCESS', 'video', 'all', {
        count: videos?.length || 0
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      data: videos ? videos.map(formatVideoResponse) : []
    } as APIResponse<VideoLesson[]>);

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/videos/:id
 * Get specific video by ID
 */
router.get('/:id', optionalSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Query video by ID
    const { data: videos, error } = await supabase
      .from('video_lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      console.error('Error fetching video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch video',
        error: error.message
      });
    }

    if (!videos || !videos.is_available) {
      return res.status(404).json({
        success: false,
        message: 'Video not available'
      });
    }

    // Log video access
    if (req.user) {
      await logAudit(req.user.user_id, 'VIDEO_ACCESS', 'video', id, {});
    }

    return res.status(200).json({
      success: true,
      message: 'Video retrieved successfully',
      data: formatVideoResponse(videos)
    });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/videos
 * Create new video (Admin only)
 */
router.post('/', verifySessionToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const {
      title,
      description,
      instructor,
      duration,
      video_url,
      thumbnail_url,
      lesson_number,
      curriculum_id
    } = req.body;

    // Validate required fields
    if (!title || !video_url) {
      return res.status(400).json({
        success: false,
        message: 'Title and video_url are required'
      });
    }

    // Insert video
    const { data: newVideo, error } = await supabase
      .from('video_lessons')
      .insert({
        title,
        description,
        instructor,
        duration,
        video_url,
        thumbnail_url,
        lesson_number,
        curriculum_id,
        created_by: req.user.user_id,
        is_available: true
      })
      .select();

    if (error) {
      console.error('Error creating video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create video',
        error: error.message
      });
    }

    // Log video creation
    await logAudit(req.user.user_id, 'VIDEO_CREATE', 'video', newVideo![0].id, {
      title
    });

    return res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: formatVideoResponse(newVideo![0])
    });

  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * PUT /api/videos/:id
 * Update video (Admin only)
 */
router.put('/:id', verifySessionToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating created_by or creation timestamp
    delete updates.created_by;
    delete updates.created_at;

    // Update video
    const { data: updatedVideo, error } = await supabase
      .from('video_lessons')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      console.error('Error updating video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update video',
        error: error.message
      });
    }

    // Log video update
    await logAudit(req.user.user_id, 'VIDEO_UPDATE', 'video', id, {
      updates
    });

    return res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: formatVideoResponse(updatedVideo)
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete/Archive video (Admin only)
 */
router.delete('/:id', verifySessionToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { id } = req.params;

    // Mark as unavailable instead of deleting
    const { error } = await supabase
      .from('video_lessons')
      .update({
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }
      console.error('Error deleting video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete video',
        error: error.message
      });
    }

    // Log video deletion
    await logAudit(req.user.user_id, 'VIDEO_DELETE', 'video', id, {});

    return res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
