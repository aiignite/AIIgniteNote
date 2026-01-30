import { Response } from 'express';
import { ApiSuccess, ApiError, PaginationMeta } from '../types';

export function success<T>(res: Response, data: T, meta?: { pagination?: PaginationMeta; total?: number }): void {
  const response: ApiSuccess<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  res.json(response);
}

export function error(res: Response, code: string, message: string, statusCode: number = 400, details?: any): void {
  const response: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

 export class ApiErrorClass extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(code: string, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const createError = {
  badRequest: (message: string, details?: any) => new ApiErrorClass('BAD_REQUEST', message, 400, details),
  unauthorized: (message: string = 'Unauthorized') => new ApiErrorClass('UNAUTHORIZED', message, 401),
  forbidden: (message: string = 'Forbidden') => new ApiErrorClass('FORBIDDEN', message, 403),
  notFound: (message: string = 'Resource not found') => new ApiErrorClass('NOT_FOUND', message, 404),
  conflict: (message: string) => new ApiErrorClass('CONFLICT', message, 409),
  internalError: (message: string = 'Internal server error') => new ApiErrorClass('INTERNAL_ERROR', message, 500),
};
