import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { success, error } from '../utils/response';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string(),
  }),
});

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().regex(/^\d{6}$/, '验证码必须为6位数字'),
});

const resendCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.register(req.body);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'REGISTRATION_FAILED',
          apiErr.message || 'Registration failed',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'REGISTRATION_FAILED', 'Registration failed', 500);
      }
    }
  };

  /**
   * GET /api/auth/verify-email
   * Verify user's email address
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        error(res, 'INVALID_TOKEN', 'Verification token is required', 400);
        return;
      }

      const result = await authService.verifyEmail(token);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'VERIFICATION_FAILED',
          apiErr.message || 'Email verification failed',
          apiErr.statusCode || 400
        );
      } else {
        error(res, 'VERIFICATION_FAILED', 'Email verification failed', 400);
      }
    }
  };

  /**
   * POST /api/auth/verify-code
   * Verify email with code
   */
  verifyCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = verifyCodeSchema.safeParse(req.body);
      if (!validation.success) {
        error(res, 'VALIDATION_ERROR', validation.error.errors[0].message, 400);
        return;
      }

      const { email, code } = validation.data;
      const result = await authService.verifyCode(email, code);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'VERIFICATION_FAILED',
          apiErr.message || 'Email verification failed',
          apiErr.statusCode || 400
        );
      } else {
        error(res, 'VERIFICATION_FAILED', 'Email verification failed', 400);
      }
    }
  };

  /**
   * POST /api/auth/resend-code
   * Resend verification code
   */
  resendCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = resendCodeSchema.safeParse(req.body);
      if (!validation.success) {
        error(res, 'VALIDATION_ERROR', validation.error.errors[0].message, 400);
        return;
      }

      const { email } = validation.data;
      const result = await authService.resendVerificationCode(email);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'RESEND_FAILED',
          apiErr.message || 'Failed to resend code',
          apiErr.statusCode || 400
        );
      } else {
        error(res, 'RESEND_FAILED', 'Failed to resend code', 400);
      }
    }
  };

  /**
   * POST /api/auth/login
   * Login user
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await authService.login(req.body);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'LOGIN_FAILED',
          apiErr.message || 'Login failed',
          apiErr.statusCode || 401
        );
      } else {
        error(res, 'LOGIN_FAILED', 'Login failed', 401);
      }
    }
  };

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  refresh = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const result = await authService.refreshToken(req.userId);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'REFRESH_FAILED',
          apiErr.message || 'Token refresh failed',
          apiErr.statusCode || 401
        );
      } else {
        error(res, 'REFRESH_FAILED', 'Token refresh failed', 401);
      }
    }
  };

  /**
   * POST /api/auth/logout
   * Logout user
   */
  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      await authService.logout(req.userId);
      success(res, { success: true });
    } catch (err) {
      error(res, 'LOGOUT_FAILED', 'Logout failed', 500);
    }
  };

  /**
   * GET /api/users/profile
   * Get user profile
   */
  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const profile = await authService.getProfile(req.userId);
      success(res, profile);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'PROFILE_FETCH_FAILED',
          apiErr.message || 'Failed to fetch profile',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'PROFILE_FETCH_FAILED', 'Failed to fetch profile', 500);
      }
    }
  };

  /**
   * PUT /api/users/profile
   * Update user profile
   */
  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const { name, image } = req.body;
      const profile = await authService.updateProfile(req.userId, { name, image });
      success(res, profile);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'PROFILE_UPDATE_FAILED',
          apiErr.message || 'Failed to update profile',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'PROFILE_UPDATE_FAILED', 'Failed to update profile', 500);
      }
    }
  };

  /**
   * DELETE /api/users/profile
   * Delete user account
   */
  deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const result = await authService.deleteAccount(req.userId);
      success(res, result);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'ACCOUNT_DELETE_FAILED',
          apiErr.message || 'Failed to delete account',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'ACCOUNT_DELETE_FAILED', 'Failed to delete account', 500);
      }
    }
  };

  /**
   * GET /api/users/ai-settings
   * Get user AI settings
   */
  getAISettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const settings = await authService.getAISettings(req.userId);
      success(res, settings);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'AI_SETTINGS_FETCH_FAILED',
          apiErr.message || 'Failed to fetch AI settings',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'AI_SETTINGS_FETCH_FAILED', 'Failed to fetch AI settings', 500);
      }
    }
  };

  /**
   * PUT /api/users/ai-settings
   * Update user AI settings
   */
  updateAISettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        error(res, 'UNAUTHORIZED', 'User ID required', 401);
        return;
      }

      const settings = await authService.updateAISettings(req.userId, req.body);
      success(res, settings);
    } catch (err) {
      if (err instanceof Error) {
        const apiErr = err as any;
        error(
          res,
          apiErr.code || 'AI_SETTINGS_UPDATE_FAILED',
          apiErr.message || 'Failed to update AI settings',
          apiErr.statusCode || 500
        );
      } else {
        error(res, 'AI_SETTINGS_UPDATE_FAILED', 'Failed to update AI settings', 500);
      }
    }
  };
}

export const authController = new AuthController();
export { registerSchema, loginSchema };
