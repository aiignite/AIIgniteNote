import { Router } from 'express';
import { aiController, chatSchema } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   POST /api/ai/chat
 * @desc    Send AI chat request
 * @access  Private
 */
router.post('/chat', authenticate, validate(chatSchema), aiController.chat);

/**
 * @route   POST /api/ai/chat/stream
 * @desc    Stream AI chat response (SSE)
 * @access  Private
 */
router.post('/chat/stream', authenticate, validate(chatSchema), aiController.chatStream);

/**
 * @route   GET /api/ai/conversations
 * @desc    Get conversation history
 * @access  Private
 */
router.get('/conversations', authenticate, aiController.getConversations);

/**
 * @route   POST /api/ai/conversations
 * @desc    Create new conversation
 * @access  Private
 */
router.post('/conversations', authenticate, aiController.createConversation);

/**
 * @route   GET /api/ai/conversations/:id
 * @desc    Get single conversation
 * @access  Private
 */
router.get('/conversations/:id', authenticate, aiController.getConversation);

/**
 * @route   DELETE /api/ai/conversations/:id
 * @desc    Delete conversation
 * @access  Private
 */
router.delete('/conversations/:id', authenticate, aiController.deleteConversation);

/**
 * @route   PATCH /api/ai/conversations/:id/rename
 * @desc    Rename conversation
 * @access  Private
 */
router.patch('/conversations/:id/rename', authenticate, aiController.renameConversation);

/**
 * @route   PATCH /api/ai/conversations/:id/archive
 * @desc    Archive/unarchive conversation
 * @access  Private
 */
router.patch('/conversations/:id/archive', authenticate, aiController.toggleArchiveConversation);

/**
 * @route   GET /api/ai/conversations/search
 * @desc    Search conversations
 * @access  Private
 */
router.get('/conversations/search', authenticate, aiController.searchConversations);

/**
 * @route   GET /api/ai/providers
 * @desc    Get available AI providers
 * @access  Private
 */
router.get('/providers', authenticate, aiController.getProviders);

/**
 * @route   GET /api/ai/models
 * @desc    Get all AI models
 * @access  Private
 */
router.get('/models', authenticate, aiController.getModels);

/**
 * @route   POST /api/ai/models
 * @desc    Create a new AI model
 * @access  Private
 */
router.post('/models', authenticate, aiController.createModel);

/**
 * @route   PATCH /api/ai/models/:id
 * @desc    Update an AI model
 * @access  Private
 */
router.patch('/models/:id', authenticate, aiController.updateModel);

/**
 * @route   DELETE /api/ai/models/:id
 * @desc    Delete an AI model
 * @access  Private
 */
router.delete('/models/:id', authenticate, aiController.deleteModel);

export default router;
