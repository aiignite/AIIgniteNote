import { Response } from 'express';
import { templateService } from '../services/template.service';
import { notesService } from '../services/notes.service';
import { AuthRequest } from '../types';
import { NoteType } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';

// Validation schemas
const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name is required'),
    description: z.string().optional(),
    prompt: z.string().min(1, 'Prompt is required'),
    category: z.string().optional(),
    icon: z.string().optional(),
    noteType: z.enum(['MARKDOWN', 'RICHTEXT', 'MINDMAP', 'FLOWCHART']).optional(),
    workspaceId: z.string().optional(),
    isPublic: z.boolean().optional(),
  }),
});

const updateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    prompt: z.string().min(1).optional(),
    category: z.string().optional(),
    icon: z.string().optional(),
    noteType: z.enum(['MARKDOWN', 'RICHTEXT', 'MINDMAP', 'FLOWCHART']).optional(),
    isPublic: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const listTemplatesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    category: z.string().optional(),
    isPublic: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
  }),
});

const applyTemplateSchema = z.object({
  body: z.object({
    folderId: z.string().optional(),
    workspaceId: z.string().optional(),
  }),
});

export class TemplateController {
  /**
   * GET /api/templates
   * Get templates list with pagination and filtering
   */
  list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // 允许未登录用户查看系统模板
      const userId = req.userId; // 未登录时为 undefined

      const params = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        category: req.query.category as string | undefined,
        isPublic: req.query.isPublic === 'true',
        search: req.query.search as string | undefined,
      };

      const result = await templateService.list(userId, params);
      
      // 返回模板数组作为data，分页信息作为meta
      success(res, result.templates, { pagination: result.pagination });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch templates',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATES_FETCH_FAILED', 'Failed to fetch templates', 500);
      }
    }
  };

  /**
   * GET /api/templates/system
   * Get system predefined templates
   */
  getSystemTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const templates = await templateService.getSystemTemplates();
      success(res, templates);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'SYSTEM_TEMPLATES_FETCH_FAILED',
          apiErr.message || 'Failed to fetch system templates',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'SYSTEM_TEMPLATES_FETCH_FAILED', 'Failed to fetch system templates', 500);
      }
    }
  };

  /**
   * GET /api/templates/:id
   * Get single template by ID
   */
  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const template = await templateService.getById(req.userId, templateId);
      success(res, template);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATE_FETCH_FAILED',
          apiErr.message || 'Failed to fetch template',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATE_FETCH_FAILED', 'Failed to fetch template', 500);
      }
    }
  };

  /**
   * POST /api/templates
   * Create new template
   */
  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const template = await templateService.create(req.userId, req.body);
      success(res, template);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATE_CREATE_FAILED',
          apiErr.message || 'Failed to create template',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATE_CREATE_FAILED', 'Failed to create template', 500);
      }
    }
  };

  /**
   * PUT /api/templates/:id
   * Update template
   */
  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const template = await templateService.update(req.userId, templateId, req.body);
      success(res, template);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATE_UPDATE_FAILED',
          apiErr.message || 'Failed to update template',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATE_UPDATE_FAILED', 'Failed to update template', 500);
      }
    }
  };

  /**
   * DELETE /api/templates/:id
   * Delete template
   */
  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await templateService.delete(req.userId, templateId);
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATE_DELETE_FAILED',
          apiErr.message || 'Failed to delete template',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATE_DELETE_FAILED', 'Failed to delete template', 500);
      }
    }
  };

  /**
   * POST /api/templates/:id/apply
   * Apply template to create new note
   */
  applyTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      // Get template first
      const template = await templateService.getById(req.userId, templateId);

      // Create note using template prompt as content
      const templateNoteType = (template as any).noteType || NoteType.MARKDOWN;
      const note = await notesService.create(req.userId, {
        title: template.name,
        content: `# ${template.name}\n\n${template.prompt}`,
        noteType: templateNoteType as NoteType,
        folderId: req.body.folderId,
        workspaceId: req.body.workspaceId,
      });

      // Increment template usage count
      await templateService.incrementUsage(template.id);

      success(res, note);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'TEMPLATE_APPLY_FAILED',
          apiErr.message || 'Failed to apply template',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'TEMPLATE_APPLY_FAILED', 'Failed to apply template', 500);
      }
    }
  };
}

export const templateController = new TemplateController();
export { createTemplateSchema, updateTemplateSchema, listTemplatesSchema, applyTemplateSchema };
