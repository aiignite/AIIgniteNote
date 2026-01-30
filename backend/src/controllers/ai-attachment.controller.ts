import { Response } from 'express';
import { attachmentService } from '../services/attachment.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';

export class AIAttachmentController {
  /**
   * POST /api/ai/attachments/upload
   * Upload file for AI chat
   */
  uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      if (!req.file) {
        error(res, 'NO_FILE', 'No file uploaded', 400);
        return;
      }

      const result = await attachmentService.saveFile(req.userId, req.file);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'UPLOAD_FAILED',
          apiErr.message || 'File upload failed',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'UPLOAD_FAILED', 'File upload failed', 500);
      }
    }
  };

  /**
   * GET /api/ai/attachments/:id
   * Get attachment by ID
   */
  getAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const attachment = await attachmentService.getAttachment(req.params.id as string, req.userId);
      success(res, attachment);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'ATTACHMENT_FETCH_FAILED',
          apiErr.message || 'Failed to fetch attachment',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'ATTACHMENT_FETCH_FAILED', 'Failed to fetch attachment', 500);
      }
    }
  };

  /**
   * DELETE /api/ai/attachments/:id
   * Delete attachment by ID
   */
  deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await attachmentService.deleteAttachment(req.params.id as string, req.userId);
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'ATTACHMENT_DELETE_FAILED',
          apiErr.message || 'Failed to delete attachment',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'ATTACHMENT_DELETE_FAILED', 'Failed to delete attachment', 500);
      }
    }
  };
}

export const aiAttachmentController = new AIAttachmentController();
