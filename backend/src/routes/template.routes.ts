import { Router } from 'express';
import { templateController, createTemplateSchema, updateTemplateSchema, listTemplatesSchema, applyTemplateSchema } from '../controllers/template.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   GET /api/templates
 * @desc    Get templates list with pagination and filtering
 * @access  Public (未登录用户可查看系统模板，已登录用户可查看所有公开模板和个人模板)
 */
router.get('/', optionalAuth, validate(listTemplatesSchema), templateController.list);

/**
 * @route   GET /api/templates/system
 * @desc    Get system predefined templates
 * @access  Private
 */
router.get('/system', authenticate, templateController.getSystemTemplates);

/**
 * @route   GET /api/templates/:id
 * @desc    Get single template by ID
 * @access  Private
 */
router.get('/:id', authenticate, templateController.getById);

/**
 * @route   POST /api/templates
 * @desc    Create new template
 * @access  Private
 */
router.post('/', authenticate, validate(createTemplateSchema), templateController.create);

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template
 * @access  Private
 */
router.put('/:id', authenticate, validate(updateTemplateSchema), templateController.update);

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template
 * @access  Private
 */
router.delete('/:id', authenticate, templateController.delete);

/**
 * @route   POST /api/templates/:id/apply
 * @desc    Apply template to create new note
 * @access  Private
 */
router.post('/:id/apply', authenticate, validate(applyTemplateSchema), templateController.applyTemplate);

export default router;
