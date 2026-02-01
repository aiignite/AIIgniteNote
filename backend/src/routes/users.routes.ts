import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { z } from 'zod';
import { validate } from '../middleware/validator';

const router = Router();

// Validation schema for profile update
const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    image: z.string().url().optional(),
  }),
});

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

/**
 * @route   POST /api/users/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);

/**
 * @route   DELETE /api/users/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/profile', authenticate, authController.deleteAccount);

/**
 * @route   GET /api/users/ai-settings
 * @desc    Get user AI settings
 * @access  Private
 */
router.get('/ai-settings', authenticate, authController.getAISettings);

/**
 * @route   PUT /api/users/ai-settings
 * @desc    Update user AI settings
 * @access  Private
 */
router.put('/ai-settings', authenticate, authController.updateAISettings);

/**
 * @route   GET /api/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', authenticate, authController.getUserSettings);

/**
 * @route   PUT /api/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', authenticate, authController.updateUserSettings);

export default router;
