import { Router, Request, Response } from 'express';
import { logAudit } from '../database';
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

router.get('/', optionalSession, async (req: Request, res: Response) => {
  try {
    const { data, error } = await mockGetAllVideos();

    if (error) {
      console.error('Error fetching videos:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch videos',
        error: typeof error === 'string' ? error : error.message
      } as APIResponse<null>);
    }

    const videos = (data || []).filter(video => video.is_available !== false);

    if (req.user) {
      await logAudit(req.user.user_id, 'VIDEO_LIST_ACCESS', 'video', 'all', {
        count: videos.length
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      data: videos.map(formatVideoResponse)
    } as APIResponse<VideoLesson[]>);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/:id', optionalSession, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: video, error } = await mockGetVideoById(id);

    if (error === 'Video not found' || !video || video.is_available === false) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (error) {
      console.error('Error fetching video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch video',
        error: typeof error === 'string' ? error : error.message
      });
    }

    if (req.user) {
      await logAudit(req.user.user_id, 'VIDEO_ACCESS', 'video', id, {});
    }

    return res.status(200).json({
      success: true,
      message: 'Video retrieved successfully',
      data: formatVideoResponse(video)
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

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

    if (!title || !video_url) {
      return res.status(400).json({
        success: false,
        message: 'Title and video_url are required'
      });
    }

    const { data: newVideo, error } = await mockCreateVideo({
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
    });

    if (error || !newVideo) {
      console.error('Error creating video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create video',
        error: error ? (typeof error === 'string' ? error : error.message) : 'Unknown error'
      });
    }

    await logAudit(req.user.user_id, 'VIDEO_CREATE', 'video', newVideo.id, {
      title
    });

    return res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: formatVideoResponse(newVideo)
    });
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.put('/:id', verifySessionToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.created_by;
    delete updates.created_at;

    const { data: updatedVideo, error } = await mockUpdateVideo(id, updates);

    if (error === 'Video not found' || !updatedVideo) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (error) {
      console.error('Error updating video:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update video',
        error: typeof error === 'string' ? error : error.message
      });
    }

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

router.delete('/:id', verifySessionToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { id } = req.params;
    const result = await mockDeleteVideo(id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

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
