import { Router } from 'express';
import { attachmentsController } from '../controllers/attachments.controller';
import { authenticate } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();

/**
 * @route   POST /api/attachments
 * @desc    Upload file
 * @access  Private
 */
router.post('/', authenticate, uploadSingle, attachmentsController.upload);

/**
 * @route   POST /api/notes/:noteId/attachments
 * @desc    Upload file to specific note
 * @access  Private
 */
router.post('/notes/:noteId/attachments', authenticate, uploadSingle, attachmentsController.uploadToNote);

/**
 * @route   GET /api/attachments/:id
 * @desc    Get attachment info
 * @access  Private
 */
router.get('/:id', authenticate, attachmentsController.getById);

/**
 * @route   GET /api/notes/:noteId/attachments
 * @desc    Get all attachments for a note
 * @access  Private
 */
router.get('/notes/:noteId/attachments', authenticate, attachmentsController.getByNote);

/**
 * @route   GET /api/attachments/file/:id
 * @desc    Serve file
 * @access  Private
 */
router.get('/file/:id', authenticate, attachmentsController.serveFile);

/**
 * @route   DELETE /api/attachments/:id
 * @desc    Delete attachment
 * @access  Private
 */
router.delete('/:id', authenticate, attachmentsController.delete);

export default router;
