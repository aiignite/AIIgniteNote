import { Router } from 'express';
import { tagsController, createTagSchema, updateTagSchema } from '../controllers/tags.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   GET /api/tags
 * @desc    Get all tags
 * @access  Private
 */
router.get('/', authenticate, tagsController.list);

/**
 * @route   GET /api/tags/:id
 * @desc    Get single tag
 * @access  Private
 */
router.get('/:id', authenticate, tagsController.getById);

/**
 * @route   POST /api/tags
 * @desc    Create tag
 * @access  Private
 */
router.post('/', authenticate, validate(createTagSchema), tagsController.create);

/**
 * @route   PUT /api/tags/:id
 * @desc    Update tag
 * @access  Private
 */
router.put('/:id', authenticate, validate(updateTagSchema), tagsController.update);

/**
 * @route   DELETE /api/tags/:id
 * @desc    Delete tag
 * @access  Private
 */
router.delete('/:id', authenticate, tagsController.delete);

/**
 * @route   POST /api/tags/:tagId/notes/:noteId
 * @desc    Add tag to note
 * @access  Private
 */
router.post('/:tagId/notes/:noteId', authenticate, tagsController.addToNote);

/**
 * @route   DELETE /api/tags/:tagId/notes/:noteId
 * @desc    Remove tag from note
 * @access  Private
 */
router.delete('/:tagId/notes/:noteId', authenticate, tagsController.removeFromNote);

/**
 * @route   GET /api/tags/:id/notes
 * @desc    Get notes by tag
 * @access  Private
 */
router.get('/:id/notes', authenticate, tagsController.getNotes);

export default router;
