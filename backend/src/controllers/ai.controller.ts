import { Response } from 'express';
import { aiService } from '../services/ai.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';
import { AIProvider } from '../types';

// Validation schemas
const chatSchema = z.object({
  body: z.object({
    provider: z.nativeEnum(AIProvider).optional(),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })),
    conversationId: z.string().optional(),
    attachmentIds: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(), // Base64 encoded images for vision models
    options: z.object({
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      temperature: z.number().optional(),
    }).optional(),
  }),
});

export class AIController {
  /**
   * POST /api/ai/chat
   * Send AI chat request
   */
  chat = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { provider, messages, conversationId, attachmentIds, images, options } = req.body;
      const result = await aiService.chat(req.userId, provider, messages, options, conversationId, attachmentIds, images);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'AI_CHAT_FAILED',
          apiErr.message || 'AI chat request failed',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'AI_CHAT_FAILED', 'AI chat request failed', 500);
      }
    }
  };

  /**
   * GET /api/ai/conversations
   * Get conversation history
   */
  getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await aiService.getConversations(req.userId, page, limit);
      success(res, result.conversations, { pagination: result.pagination });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATIONS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch conversations',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATIONS_FETCH_FAILED', 'Failed to fetch conversations', 500);
      }
    }
  };

  /**
   * POST /api/ai/conversations
   * Create new conversation
   */
  createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { assistantName } = req.body;
      const conversation = await aiService.createConversation(req.userId, assistantName);
      success(res, conversation);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_CREATE_FAILED',
          apiErr.message || 'Failed to create conversation',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_CREATE_FAILED', 'Failed to create conversation', 500);
      }
    }
  };

  /**
   * GET /api/ai/conversations/:id
   * Get single conversation
   */
  getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const conversation = await aiService.getConversation(req.userId, req.params.id as string);
      success(res, conversation);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_FETCH_FAILED',
          apiErr.message || 'Failed to fetch conversation',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_FETCH_FAILED', 'Failed to fetch conversation', 500);
      }
    }
  };

  /**
   * DELETE /api/ai/conversations/:id
   * Delete conversation
   */
  deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await aiService.deleteConversation(req.userId, req.params.id as string);
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_DELETE_FAILED',
          apiErr.message || 'Failed to delete conversation',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_DELETE_FAILED', 'Failed to delete conversation', 500);
      }
    }
  };

  /**
   * PATCH /api/ai/conversations/:id/rename
   * Rename conversation
   */
  renameConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { title } = req.body;
      if (!title) {
        error(res, 'INVALID_TITLE', 'Title is required', 400);
        return;
      }

      const updated = await aiService.renameConversation(req.userId, req.params.id as string, title);
      success(res, updated);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_RENAME_FAILED',
          apiErr.message || 'Failed to rename conversation',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_RENAME_FAILED', 'Failed to rename conversation', 500);
      }
    }
  };

  /**
   * PATCH /api/ai/conversations/:id/archive
   * Archive/unarchive conversation
   */
  toggleArchiveConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const updated = await aiService.toggleArchiveConversation(req.userId, req.params.id as string);
      success(res, updated);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_ARCHIVE_FAILED',
          apiErr.message || 'Failed to archive conversation',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_ARCHIVE_FAILED', 'Failed to archive conversation', 500);
      }
    }
  };

  /**
   * GET /api/ai/conversations/search
   * Search conversations
   */
  searchConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const query = req.query.q as string || '';
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await aiService.searchConversations(req.userId, query, page, limit);
      success(res, result.conversations, { pagination: result.pagination });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'CONVERSATION_SEARCH_FAILED',
          apiErr.message || 'Failed to search conversations',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'CONVERSATION_SEARCH_FAILED', 'Failed to search conversations', 500);
      }
    }
  };

  /**
   * GET /api/ai/providers
   * Get available AI providers
   */
  getProviders = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const providers = aiService.getProviders();
      success(res, providers);
    } catch (err) {
      error(res, 'PROVIDERS_FETCH_FAILED', 'Failed to fetch providers', 500);
    }
  };

  /**
   * GET /api/ai/models
   * Get all AI models
   */
  getModels = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const models = await aiService.getModels(req.userId);
      success(res, models);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MODELS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch models',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MODELS_FETCH_FAILED', 'Failed to fetch models', 500);
      }
    }
  };

  /**
   * POST /api/ai/models
   * Create a new AI model
   */
  createModel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const modelData = req.body;
      console.log('[AIController] createModel body:', JSON.stringify(modelData, null, 2));

      const model = await aiService.createModel(req.userId, modelData);
      success(res, model);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MODEL_CREATE_FAILED',
          apiErr.message || 'Failed to create model',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MODEL_CREATE_FAILED', 'Failed to create model', 500);
      }
    }
  };

  /**
   * PATCH /api/ai/models/:id
   * Update an AI model
   */
  updateModel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const modelData = req.body;
      console.log(`[AIController] updateModel id=${req.params.id} body:`, JSON.stringify(modelData, null, 2));

      const model = await aiService.updateModel(req.userId, req.params.id as string, modelData);
      success(res, model);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MODEL_UPDATE_FAILED',
          apiErr.message || 'Failed to update model',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MODEL_UPDATE_FAILED', 'Failed to update model', 500);
      }
    }
  };

  /**
   * DELETE /api/ai/models/:id
   * Delete an AI model
   */
  deleteModel = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await aiService.deleteModel(req.userId, req.params.id as string);
      success(res, { success: true });
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'MODEL_DELETE_FAILED',
          apiErr.message || 'Failed to delete model',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'MODEL_DELETE_FAILED', 'Failed to delete model', 500);
      }
    }
  };

  /**
   * POST /api/ai/chat/stream
   * Stream AI chat response using Server-Sent Events
   */
  chatStream = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const { provider, messages, conversationId, attachmentIds, images, options } = req.body;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Send stream response
      const stream = await aiService.chatStream(
        req.userId,
        provider || AIProvider.GEMINI,
        messages,
        options,
        conversationId,
        attachmentIds,
        images
      );

      // Stream the response
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('Stream chat error:', err);
      const apiErr = err as any;
      res.write(`data: ${JSON.stringify({ error: apiErr.code || 'STREAM_ERROR', message: apiErr.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  };
}

export const aiController = new AIController();
export { chatSchema };
