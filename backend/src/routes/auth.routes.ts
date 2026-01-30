import { Router } from 'express';
import { authController, registerSchema, loginSchema } from '../controllers/auth.controller';
import { authenticate, authenticateRefresh } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify user's email address
 * @access  Public
 */
router.get('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Private (requires valid refresh token)
 */
router.post('/refresh', authenticateRefresh, authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

export default router;
