import { Router } from 'express';
import { notesController, createNoteSchema, updateNoteSchema, listNotesSchema } from '../controllers/notes.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   POST /api/notes
 * @desc    Create a new note
 * @access  Private
 */
router.post('/', authenticate, validate(createNoteSchema), notesController.create);

/**
 * @route   GET /api/notes
 * @desc    Get notes list with pagination and filtering
 * @access  Private
 */
router.get('/', authenticate, validate(listNotesSchema), notesController.list);

/**
 * @route   GET /api/notes/:id
 * @desc    Get single note by ID
 * @access  Private
 */
router.get('/:id', authenticate, notesController.getById);

/**
 * @route   PUT /api/notes/:id
 * @desc    Update note
 * @access  Private
 */
router.put('/:id', authenticate, validate(updateNoteSchema), notesController.update);

/**
 * @route   DELETE /api/notes/:id
 * @desc    Delete note (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, notesController.delete);

/**
 * @route   POST /api/notes/:id/restore
 * @desc    Restore a soft-deleted note
 * @access  Private
 */
router.post('/:id/restore', authenticate, notesController.restore);

/**
 * @route   GET /api/notes/:id/versions
 * @desc    Get note version history
 * @access  Private
 */
router.get('/:id/versions', authenticate, notesController.getVersions);

/**
 * @route   POST /api/notes/:id/favorite
 * @desc    Toggle note favorite status
 * @access  Private
 */
router.post('/:id/favorite', authenticate, notesController.toggleFavorite);

export default router;
