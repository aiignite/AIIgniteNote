import { Response } from 'express';
import { filesService, FileSource } from '../services/files.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';

export class FilesController {
  /**
   * GET /api/files
   * List files for current user
   */
  list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const sourceParam = typeof req.query.source === 'string' ? req.query.source : undefined;
      const source = sourceParam === 'note' || sourceParam === 'ai' || sourceParam === 'chat'
        ? sourceParam
        : sourceParam === 'all'
          ? 'all'
          : undefined;

      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;

      const result = await filesService.listFiles(req.userId, {
        source: source || 'all',
        limit,
        cursor,
        query,
      });

      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FILES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch files',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FILES_FETCH_FAILED', 'Failed to fetch files', 500);
      }
    }
  };

  /**
   * DELETE /api/files/:id
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const sourceParam = typeof req.query.source === 'string' ? req.query.source : undefined;
      const source = sourceParam === 'note' || sourceParam === 'ai' || sourceParam === 'chat'
        ? (sourceParam as FileSource)
        : null;

      if (!source) {
        error(res, 'INVALID_SOURCE', 'source must be note|ai|chat', 400);
        return;
      }

      await filesService.deleteFile(req.userId, source, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FILE_DELETE_FAILED',
          apiErr.message || 'Failed to delete file',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FILE_DELETE_FAILED', 'Failed to delete file', 500);
      }
    }
  };
}

export const filesController = new FilesController();
