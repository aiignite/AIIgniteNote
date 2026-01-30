import { Response } from 'express';
import { tagsService } from '../services/tags.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';

// Validation schemas
const createTagSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Tag name is required'),
    color: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
});

const updateTagSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    color: z.string().optional(),
  }),
});

export class TagsController {
  /**
   * GET /api/tags
   * Get all tags
   */
  list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const workspaceId = req.query.workspaceId as string | undefined;
      const tags = await tagsService.list(req.userId, workspaceId);
      success(res, tags);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAGS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch tags',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAGS_FETCH_FAILED', 'Failed to fetch tags', 500);
      }
    }
  };

  /**
   * GET /api/tags/:id
   * Get single tag
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const tag = await tagsService.getById(req.userId, String(req.params.id));
      success(res, tag);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_FETCH_FAILED',
          apiErr.message || 'Failed to fetch tag',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_FETCH_FAILED', 'Failed to fetch tag', 500);
      }
    }
  };

  /**
   * POST /api/tags
   * Create tag
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const tag = await tagsService.create(req.userId, req.body);
      success(res, tag);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_CREATE_FAILED',
          apiErr.message || 'Failed to create tag',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_CREATE_FAILED', 'Failed to create tag', 500);
      }
    }
  };

  /**
   * PUT /api/tags/:id
   * Update tag
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const tag = await tagsService.update(req.userId, String(req.params.id), req.body);
      success(res, tag);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_UPDATE_FAILED',
          apiErr.message || 'Failed to update tag',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_UPDATE_FAILED', 'Failed to update tag', 500);
      }
    }
  };

  /**
   * DELETE /api/tags/:id
   * Delete tag
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await tagsService.delete(req.userId, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_DELETE_FAILED',
          apiErr.message || 'Failed to delete tag',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_DELETE_FAILED', 'Failed to delete tag', 500);
      }
    }
  };

  /**
   * POST /api/tags/:tagId/notes/:noteId
   * Add tag to note
   */
  addToNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await tagsService.addToNote(req.userId, String(req.params.noteId), String(req.params.tagId));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_ADD_FAILED',
          apiErr.message || 'Failed to add tag to note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_ADD_FAILED', 'Failed to add tag to note', 500);
      }
    }
  };

  /**
   * DELETE /api/tags/:tagId/notes/:noteId
   * Remove tag from note
   */
  removeFromNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await tagsService.removeFromNote(req.userId, String(req.params.noteId), String(req.params.tagId));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_REMOVE_FAILED',
          apiErr.message || 'Failed to remove tag from note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_REMOVE_FAILED', 'Failed to remove tag from note', 500);
      }
    }
  };

  /**
   * GET /api/tags/:id/notes
   * Get notes by tag
   */
  getNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const notes = await tagsService.getNotes(req.userId, String(req.params.id));
      success(res, notes);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TAG_NOTES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch notes',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TAG_NOTES_FETCH_FAILED', 'Failed to fetch notes', 500);
      }
    }
  };
}

export const tagsController = new TagsController();
export { createTagSchema, updateTagSchema };
