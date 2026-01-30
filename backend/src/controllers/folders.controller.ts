import { Response } from 'express';
import { foldersService } from '../services/folders.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';

// Validation schemas
const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Folder name is required'),
    parentId: z.string().optional(),
    workspaceId: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

const updateFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    parentId: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export class FoldersController {
  /**
   * GET /api/folders
   * Get folder tree
   */
  getTree = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const workspaceId = req.query.workspaceId as string | undefined;
      const folders = await foldersService.getTree(req.userId, workspaceId);
      success(res, folders);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FOLDERS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch folders',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FOLDERS_FETCH_FAILED', 'Failed to fetch folders', 500);
      }
    }
  };

  /**
   * GET /api/folders/:id
   * Get single folder
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const folder = await foldersService.getById(req.userId, String(req.params.id));
      success(res, folder);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FOLDER_FETCH_FAILED',
          apiErr.message || 'Failed to fetch folder',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FOLDER_FETCH_FAILED', 'Failed to fetch folder', 500);
      }
    }
  };

  /**
   * POST /api/folders
   * Create folder
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const folder = await foldersService.create(req.userId, req.body);
      success(res, folder);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FOLDER_CREATE_FAILED',
          apiErr.message || 'Failed to create folder',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FOLDER_CREATE_FAILED', 'Failed to create folder', 500);
      }
    }
  };

  /**
   * PUT /api/folders/:id
   * Update folder
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const folder = await foldersService.update(req.userId, String(req.params.id), req.body);
      success(res, folder);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FOLDER_UPDATE_FAILED',
          apiErr.message || 'Failed to update folder',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FOLDER_UPDATE_FAILED', 'Failed to update folder', 500);
      }
    }
  };

  /**
   * DELETE /api/folders/:id
   * Delete folder
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await foldersService.delete(req.userId, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FOLDER_DELETE_FAILED',
          apiErr.message || 'Failed to delete folder',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FOLDER_DELETE_FAILED', 'Failed to delete folder', 500);
      }
    }
  };
}

export const foldersController = new FoldersController();
export { createFolderSchema, updateFolderSchema };
