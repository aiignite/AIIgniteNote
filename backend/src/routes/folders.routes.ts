import { Router } from 'express';
import { foldersController, createFolderSchema, updateFolderSchema } from '../controllers/folders.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   GET /api/folders
 * @desc    Get folder tree
 * @access  Private
 */
router.get('/', authenticate, foldersController.getTree);

/**
 * @route   GET /api/folders/:id
 * @desc    Get single folder
 * @access  Private
 */
router.get('/:id', authenticate, foldersController.getById);

/**
 * @route   POST /api/folders
 * @desc    Create folder
 * @access  Private
 */
router.post('/', authenticate, validate(createFolderSchema), foldersController.create);

/**
 * @route   PUT /api/folders/:id
 * @desc    Update folder
 * @access  Private
 */
router.put('/:id', authenticate, validate(updateFolderSchema), foldersController.update);

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete folder
 * @access  Private
 */
router.delete('/:id', authenticate, foldersController.delete);

export default router;
