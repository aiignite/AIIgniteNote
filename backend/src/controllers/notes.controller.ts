import { Response } from 'express';
import { notesService } from '../services/notes.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';
import { NoteType } from '../types';

// Validation schemas
const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string(),
    noteType: z.nativeEnum(NoteType).optional(),
    folderId: z.string().optional(),
    workspaceId: z.string().optional(),
    tags: z.array(z.union([
      z.string(),
      z.object({
        name: z.string(),
        color: z.string().optional(),
      })
    ])).optional(),
  }),
});

const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional(),
    noteType: z.nativeEnum(NoteType).optional(),
    folderId: z.string().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.union([
      z.string(),
      z.object({
        name: z.string(),
        color: z.string().optional(),
      })
    ])).optional(),
  }),
});

const listNotesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    folderId: z.string().optional(),
    workspaceId: z.string().optional(),
    isFavorite: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export class NotesController {
  /**
   * POST /api/notes
   * Create a new note
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const result = await notesService.create(req.userId, req.body);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'NOTE_CREATE_FAILED',
          apiErr.message || 'Failed to create note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'NOTE_CREATE_FAILED', 'Failed to create note', 500);
      }
    }
  };

  /**
   * GET /api/notes
   * Get notes list
   */
  list = async (req: AuthRequest, res: Response): Promise<void> => {
    console.log('[NotesController.list] Starting...', { userId: req.userId, query: req.query });

    try {
      if (!req.userId) {
        console.error('[NotesController.list] No userId found in request');
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const params = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        folderId: req.query.folderId as string | undefined,
        workspaceId: req.query.workspaceId as string | undefined,
        isFavorite: req.query.isFavorite === 'true',
        search: req.query.search as string | undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      console.log('[NotesController.list] Params:', params);

      const result = await notesService.list(req.userId, params);
      console.log('[NotesController.list] Result from service:', result);
      console.log('[NotesController.list] Notes count:', result.notes?.length);
      console.log('[NotesController.list] Pagination:', result.pagination);

      success(res, result.notes, { pagination: result.pagination });
      console.log('[NotesController.list] Response sent successfully');
    } catch (err) {
      console.error('[NotesController.list] Error:', err);
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'NOTES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch notes',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'NOTES_FETCH_FAILED', 'Failed to fetch notes', 500);
      }
    }
  };

  /**
   * GET /api/notes/:id
   * Get single note
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const note = await notesService.getById(req.userId, String(req.params.id));
      success(res, note);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'NOTE_FETCH_FAILED',
          apiErr.message || 'Failed to fetch note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'NOTE_FETCH_FAILED', 'Failed to fetch note', 500);
      }
    }
  };

  /**
   * PUT /api/notes/:id
   * Update note
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const note = await notesService.update(req.userId, String(req.params.id), req.body);
      success(res, note);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'NOTE_UPDATE_FAILED',
          apiErr.message || 'Failed to update note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'NOTE_UPDATE_FAILED', 'Failed to update note', 500);
      }
    }
  };

  /**
   * DELETE /api/notes/:id
   * Delete note (soft delete)
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await notesService.delete(req.userId, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'NOTE_DELETE_FAILED',
          apiErr.message || 'Failed to delete note',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'NOTE_DELETE_FAILED', 'Failed to delete note', 500);
      }
    }
  };

  /**
   * GET /api/notes/:id/versions
   * Get note versions
   */
  getVersions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const versions = await notesService.getVersions(req.userId, String(req.params.id));
      success(res, versions);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'VERSIONS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch versions',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'VERSIONS_FETCH_FAILED', 'Failed to fetch versions', 500);
      }
    }
  };

  /**
   * POST /api/notes/:id/favorite
   * Toggle favorite status
   */
  toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const result = await notesService.toggleFavorite(req.userId, String(req.params.id));
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'FAVORITE_TOGGLE_FAILED',
          apiErr.message || 'Failed to toggle favorite',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'FAVORITE_TOGGLE_FAILED', 'Failed to toggle favorite', 500);
      }
    }
  };
}

export const notesController = new NotesController();
export { createNoteSchema, updateNoteSchema, listNotesSchema };
