import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { error } from '../utils/response';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      error(res, 'UNAUTHORIZED', 'Authentication token required', 401);
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      req.userId = decoded.userId;
      next();
    } catch (err) {
      error(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
    }
  } catch (err) {
    error(res, 'AUTH_ERROR', 'Authentication failed', 401);
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        req.userId = decoded.userId;
      } catch {
        // Token invalid, but we continue without authentication
      }
    }

    next();
  } catch (err) {
    next();
  }
}

/**
 * Authenticate using refresh token from request body
 * Used for token refresh endpoint
 */
export function authenticateRefresh(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      error(res, 'UNAUTHORIZED', 'Refresh token required', 401);
      return;
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { userId: string; type?: string };

      // Verify it's a refresh token
      if (decoded.type !== 'refresh') {
        error(res, 'INVALID_TOKEN', 'Invalid token type', 401);
        return;
      }

      req.userId = decoded.userId;
      next();
    } catch (err) {
      error(res, 'INVALID_TOKEN', 'Invalid or expired refresh token', 401);
    }
  } catch (err) {
    error(res, 'AUTH_ERROR', 'Authentication failed', 401);
  }
}
