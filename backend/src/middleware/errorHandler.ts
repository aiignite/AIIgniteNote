import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { error } from '../utils/response';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    error(
      res,
      'VALIDATION_ERROR',
      'Invalid input data',
      400,
      err.errors
    );
    return;
  }

  // Handle known API errors
  if (err.name === 'ApiError') {
    const apiErr = err as any;
    error(
      res,
      apiErr.code,
      err.message,
      apiErr.statusCode || 500,
      apiErr.details
    );
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error(res, 'INVALID_TOKEN', 'Invalid authentication token', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    error(res, 'TOKEN_EXPIRED', 'Authentication token has expired', 401);
    return;
  }

  // Default internal server error
  error(
    res,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message,
    500,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  error(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`, 404);
}
