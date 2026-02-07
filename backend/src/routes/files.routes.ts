import { Router } from 'express';
import { filesController } from '../controllers/files.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/files
 * @desc    List files for current user
 * @access  Private
 */
router.get('/', authenticate, filesController.list);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a file by source
 * @access  Private
 */
router.delete('/:id', authenticate, filesController.delete);

export default router;
