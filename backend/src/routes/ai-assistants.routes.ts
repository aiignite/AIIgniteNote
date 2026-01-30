import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { aiAssistantsController } from '../controllers/ai-assistants.controller';
import { z } from 'zod';

const router = Router();

const createAssistantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatar: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
  systemPrompt: z.string().optional(),
  isSystem: z.boolean().optional(),
  workspaceId: z.string().optional(),
});

const updateAssistantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  role: z.string().optional(),
  category: z.string().optional(),
  systemPrompt: z.string().optional(),
});

const createConversationTagSchema = z.object({
  conversationId: z.string(),
  tag: z.string().min(1).max(50),
});

const createFavoriteMessageSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
});

const createCustomPromptSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1),
  category: z.string().optional(),
});

const updateCustomPromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).optional(),
  category: z.string().optional(),
});

router.get('/', authenticate, aiAssistantsController.getAssistants);
router.post('/', authenticate, validate(createAssistantSchema), aiAssistantsController.createAssistant);

router.get('/conversations/:conversationId/tags', authenticate, aiAssistantsController.getConversationTags);
router.post('/conversations/tags', authenticate, validate(createConversationTagSchema), aiAssistantsController.addConversationTag);
router.delete('/conversations/tags/:tagId', authenticate, aiAssistantsController.removeConversationTag);

router.get('/favorites', authenticate, aiAssistantsController.getFavoriteMessages);
router.get('/favorites/messages/:messageId', authenticate, aiAssistantsController.isMessageFavorited);
router.post('/favorites', authenticate, validate(createFavoriteMessageSchema), aiAssistantsController.addToFavorites);
router.delete('/favorites/messages/:messageId', authenticate, aiAssistantsController.removeFromFavorites);

router.get('/prompts', authenticate, aiAssistantsController.getCustomPrompts);
router.get('/prompts/:id', authenticate, aiAssistantsController.getCustomPrompt);
router.post('/prompts', authenticate, validate(createCustomPromptSchema), aiAssistantsController.createCustomPrompt);
router.put('/prompts/:id', authenticate, validate(updateCustomPromptSchema), aiAssistantsController.updateCustomPrompt);
router.delete('/prompts/:id', authenticate, aiAssistantsController.deleteCustomPrompt);

router.get('/:id', authenticate, aiAssistantsController.getAssistant);
router.put('/:id', authenticate, validate(updateAssistantSchema), aiAssistantsController.updateAssistant);
router.delete('/:id', authenticate, aiAssistantsController.deleteAssistant);

export { router as aiAssistantsRoutes };
