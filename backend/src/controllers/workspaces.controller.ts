import { Response } from 'express';
import { workspacesService } from '../services/workspaces.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';

// Create workspace validation schema
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
});

// Update workspace validation schema
const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
});

// Invite member validation schema
const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(WorkspaceRole, {
    errorMap: () => ({ message: 'Invalid role. Must be OWNER, ADMIN, EDITOR, or VIEWER' }),
  }),
});

// Update member role validation schema
const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole, {
    errorMap: () => ({ message: 'Invalid role. Must be OWNER, ADMIN, EDITOR, or VIEWER' }),
  }),
});

export class WorkspacesController {
  /**
   * GET /api/workspaces
   * Get all workspaces for user
   */
  getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const workspaces = await workspacesService.getAll(req.userId);
      success(res, workspaces, { total: workspaces.length });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch workspaces',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACES_FETCH_FAILED', 'Failed to fetch workspaces', 500);
      }
    }
  };

  /**
   * GET /api/workspaces/:id
   * Get workspace by ID
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const workspace = await workspacesService.getById(req.userId, String(req.params.id));
      success(res, workspace);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACE_FETCH_FAILED',
          apiErr.message || 'Failed to fetch workspace',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACE_FETCH_FAILED', 'Failed to fetch workspace', 500);
      }
    }
  };

  /**
   * POST /api/workspaces
   * Create new workspace
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate request body
      const validationResult = createWorkspaceSchema.safeParse(req.body);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const workspace = await workspacesService.create(req.userId, validationResult.data);
      success(res, workspace);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACE_CREATE_FAILED',
          apiErr.message || 'Failed to create workspace',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACE_CREATE_FAILED', 'Failed to create workspace', 500);
      }
    }
  };

  /**
   * PUT /api/workspaces/:id
   * Update workspace
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate request body
      const validationResult = updateWorkspaceSchema.safeParse(req.body);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const workspace = await workspacesService.update(
        req.userId,
        String(req.params.id),
        validationResult.data
      );
      success(res, workspace);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACE_UPDATE_FAILED',
          apiErr.message || 'Failed to update workspace',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACE_UPDATE_FAILED', 'Failed to update workspace', 500);
      }
    }
  };

  /**
   * DELETE /api/workspaces/:id
   * Delete workspace
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await workspacesService.delete(req.userId, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACE_DELETE_FAILED',
          apiErr.message || 'Failed to delete workspace',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACE_DELETE_FAILED', 'Failed to delete workspace', 500);
      }
    }
  };

  /**
   * POST /api/workspaces/:id/members
   * Add member to workspace
   */
  addMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate request body
      const validationResult = inviteMemberSchema.safeParse(req.body);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const member = await workspacesService.addMember(
        req.userId,
        String(req.params.id),
        validationResult.data
      );
      success(res, member);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MEMBER_ADD_FAILED',
          apiErr.message || 'Failed to add member',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MEMBER_ADD_FAILED', 'Failed to add member', 500);
      }
    }
  };

  /**
   * PUT /api/workspaces/:id/members/:memberId
   * Update member role
   */
  updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // Validate request body
      const validationResult = updateMemberRoleSchema.safeParse(req.body);
      if (!validationResult.success) {
        error(
          res,
          'VALIDATION_ERROR',
          validationResult.error.errors[0].message,
          400
        );
        return;
      }

      const member = await workspacesService.updateMemberRole(
        req.userId,
        String(req.params.id),
        String(req.params.memberId),
        validationResult.data.role
      );
      success(res, member);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MEMBER_UPDATE_FAILED',
          apiErr.message || 'Failed to update member role',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MEMBER_UPDATE_FAILED', 'Failed to update member role', 500);
      }
    }
  };

  /**
   * DELETE /api/workspaces/:id/members/:memberId
   * Remove member from workspace
   */
  removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await workspacesService.removeMember(req.userId, String(req.params.id), String(req.params.memberId));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MEMBER_REMOVE_FAILED',
          apiErr.message || 'Failed to remove member',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MEMBER_REMOVE_FAILED', 'Failed to remove member', 500);
      }
    }
  };

  /**
   * POST /api/workspaces/:id/leave
   * Leave workspace
   */
  leaveWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await workspacesService.leaveWorkspace(req.userId, String(req.params.id));
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'WORKSPACE_LEAVE_FAILED',
          apiErr.message || 'Failed to leave workspace',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'WORKSPACE_LEAVE_FAILED', 'Failed to leave workspace', 500);
      }
    }
  };

  /**
   * GET /api/workspaces/:id/stats
   * Get workspace statistics
   */
  getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const stats = await workspacesService.getStats(req.userId, String(req.params.id));
      success(res, stats);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'STATS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch statistics',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'STATS_FETCH_FAILED', 'Failed to fetch statistics', 500);
      }
    }
  };
}

export const workspacesController = new WorkspacesController();
