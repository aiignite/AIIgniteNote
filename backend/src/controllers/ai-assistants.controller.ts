import { Response } from 'express';
import { AuthRequest } from '../types';
import { assistantsService, conversationTagsService, favoriteMessagesService, customPromptsService } from '../services/ai-assistants.service';
import { success, error } from '../utils/response';
import { ApiErrorClass } from '../utils/response';

export const aiAssistantsController = {
  getAssistants: async (req: AuthRequest, res: Response) => {
    try {
      const result = await assistantsService.getAssistants(
        req.userId!,
        req.query.workspaceId as string | undefined
      );
      success(res, result);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch assistants';
      error(res, 'ASSISTANTS_FETCH_FAILED', message, statusCode);
    }
  },

  getAssistant: async (req: AuthRequest, res: Response) => {
    try {
      const assistant = await assistantsService.getAssistant(
        req.userId!,
        req.params.id as string
      );
      success(res, assistant);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch assistant';
      error(res, 'ASSISTANT_FETCH_FAILED', message, statusCode);
    }
  },

  createAssistant: async (req: AuthRequest, res: Response) => {
    try {
      const assistant = await assistantsService.createAssistant(
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: assistant });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to create assistant';
      error(res, 'ASSISTANT_CREATE_FAILED', message, statusCode);
    }
  },

  updateAssistant: async (req: AuthRequest, res: Response) => {
    try {
      const assistant = await assistantsService.updateAssistant(
        req.userId!,
        req.params.id as string,
        req.body
      );
      success(res, assistant);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to update assistant';
      error(res, 'ASSISTANT_UPDATE_FAILED', message, statusCode);
    }
  },

  deleteAssistant: async (req: AuthRequest, res: Response) => {
    try {
      await assistantsService.deleteAssistant(
        req.userId!,
        req.params.id as string
      );
      success(res, { message: 'Assistant deleted successfully' });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to delete assistant';
      error(res, 'ASSISTANT_DELETE_FAILED', message, statusCode);
    }
  },

  getConversationTags: async (req: AuthRequest, res: Response) => {
    try {
      const tags = await conversationTagsService.getConversationTags(
        req.userId!,
        req.params.conversationId as string
      );
      success(res, tags);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch conversation tags';
      error(res, 'CONVERSATION_TAGS_FETCH_FAILED', message, statusCode);
    }
  },

  addConversationTag: async (req: AuthRequest, res: Response) => {
    try {
      const tag = await conversationTagsService.addTagToConversation(
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: tag });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to add conversation tag';
      error(res, 'CONVERSATION_TAG_ADD_FAILED', message, statusCode);
    }
  },

  removeConversationTag: async (req: AuthRequest, res: Response) => {
    try {
      await conversationTagsService.removeTagFromConversation(
        req.userId!,
        req.params.tagId as string
      );
      success(res, { message: 'Tag removed successfully' });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to remove conversation tag';
      error(res, 'CONVERSATION_TAG_REMOVE_FAILED', message, statusCode);
    }
  },

  getFavoriteMessages: async (req: AuthRequest, res: Response) => {
    try {
      const favorites = await favoriteMessagesService.getFavoriteMessages(req.userId!);
      success(res, favorites);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch favorite messages';
      error(res, 'FAVORITES_FETCH_FAILED', message, statusCode);
    }
  },

  isMessageFavorited: async (req: AuthRequest, res: Response) => {
    try {
      const isFavorited = await favoriteMessagesService.isMessageFavorited(
        req.userId!,
        req.params.messageId as string
      );
      success(res, { isFavorited });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to check favorite status';
      error(res, 'FAVORITE_CHECK_FAILED', message, statusCode);
    }
  },

  addToFavorites: async (req: AuthRequest, res: Response) => {
    try {
      const favorite = await favoriteMessagesService.addToFavorites(
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: favorite });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to add to favorites';
      error(res, 'FAVORITE_ADD_FAILED', message, statusCode);
    }
  },

  removeFromFavorites: async (req: AuthRequest, res: Response) => {
    try {
      await favoriteMessagesService.removeFromFavorites(
        req.userId!,
        req.params.messageId as string
      );
      success(res, { message: 'Removed from favorites' });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to remove from favorites';
      error(res, 'FAVORITE_REMOVE_FAILED', message, statusCode);
    }
  },

  getCustomPrompts: async (req: AuthRequest, res: Response) => {
    try {
      const prompts = await customPromptsService.getCustomPrompts(req.userId!);
      success(res, prompts);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch custom prompts';
      error(res, 'PROMPTS_FETCH_FAILED', message, statusCode);
    }
  },

  getCustomPrompt: async (req: AuthRequest, res: Response) => {
    try {
      const prompt = await customPromptsService.getCustomPrompt(
        req.userId!,
        req.params.id as string
      );
      success(res, prompt);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to fetch custom prompt';
      error(res, 'PROMPT_FETCH_FAILED', message, statusCode);
    }
  },

  createCustomPrompt: async (req: AuthRequest, res: Response) => {
    try {
      const prompt = await customPromptsService.createCustomPrompt(
        req.userId!,
        req.body
      );
      res.status(201).json({ success: true, data: prompt });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to create custom prompt';
      error(res, 'PROMPT_CREATE_FAILED', message, statusCode);
    }
  },

  updateCustomPrompt: async (req: AuthRequest, res: Response) => {
    try {
      const prompt = await customPromptsService.updateCustomPrompt(
        req.userId!,
        req.params.id as string,
        req.body
      );
      success(res, prompt);
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to update custom prompt';
      error(res, 'PROMPT_UPDATE_FAILED', message, statusCode);
    }
  },

  deleteCustomPrompt: async (req: AuthRequest, res: Response) => {
    try {
      await customPromptsService.deleteCustomPrompt(
        req.userId!,
        req.params.id as string
      );
      success(res, { message: 'Custom prompt deleted successfully' });
    } catch (err) {
      const statusCode = err instanceof ApiErrorClass ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Failed to delete custom prompt';
      error(res, 'PROMPT_DELETE_FAILED', message, statusCode);
    }
  },
};
