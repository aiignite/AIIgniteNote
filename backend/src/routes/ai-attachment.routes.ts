import { Router } from 'express';
import { aiAttachmentController } from '../controllers/ai-attachment.controller';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = Router();

/**
 * @route   POST /api/ai/attachments/upload
 * @desc    Upload file for AI chat
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), aiAttachmentController.uploadAttachment);

/**
 * @route   GET /api/ai/attachments/:id
 * @desc    Get attachment by ID
 * @access  Private
 */
router.get('/:id', authenticate, aiAttachmentController.getAttachment);

/**
 * @route   DELETE /api/ai/attachments/:id
 * @desc    Delete attachment by ID
 * @access  Private
 */
router.delete('/:id', authenticate, aiAttachmentController.deleteAttachment);

export default router;
