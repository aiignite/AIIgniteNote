import { Response } from 'express';
import { attachmentsService } from '../services/attachments.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';

export class AttachmentsController {
  /**
   * POST /api/attachments
   * Upload file to note
   */
  upload = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      if (!req.file) {
        error(res, 'NO_FILE', 'No file uploaded', 400);
        return;
      }

      const noteId = req.body.noteId || req.params.noteId;
      if (!noteId) {
        error(res, 'MISSING_NOTE_ID', 'Note ID is required', 400);
        return;
      }

      const attachment = await attachmentsService.upload(req.userId, noteId, req.file);
      success(res, attachment, { total: 1 });
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
   * POST /api/notes/:noteId/attachments
   * Upload file to specific note
   */
  uploadToNote = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      if (!req.file) {
        error(res, 'NO_FILE', 'No file uploaded', 400);
        return;
      }

      const attachment = await attachmentsService.upload(req.userId, String(req.params.noteId), req.file);
      success(res, attachment);
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
   * GET /api/attachments/:id
   * Get attachment info
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const attachment = await attachmentsService.getById(req.userId, String(req.params.id));
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
   * GET /api/notes/:noteId/attachments
   * Get all attachments for a note
   */
  getByNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const attachments = await attachmentsService.getByNote(req.userId, String(req.params.noteId));
      success(res, attachments, { total: attachments.length });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'ATTACHMENTS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch attachments',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'ATTACHMENTS_FETCH_FAILED', 'Failed to fetch attachments', 500);
      }
    }
  };

  /**
   * DELETE /api/attachments/:id
   * Delete attachment
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await attachmentsService.delete(req.userId, String(req.params.id));
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

  /**
   * GET /api/attachments/file/:id
   * Serve file
   */
  serveFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const attachment = await attachmentsService.getById(req.userId, String(req.params.id));

      if (!attachmentsService.fileExists(attachment.fileUrl)) {
        error(res, 'FILE_NOT_FOUND', 'File not found on server', 404);
        return;
      }

      const filePath = attachmentsService.getFilePath(attachment.fileUrl);
      res.sendFile(filePath);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FILE_SERVE_FAILED',
          apiErr.message || 'Failed to serve file',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FILE_SERVE_FAILED', 'Failed to serve file', 500);
      }
    }
  };
}

export const attachmentsController = new AttachmentsController();
