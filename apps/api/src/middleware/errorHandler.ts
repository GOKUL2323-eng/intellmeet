import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const requestId = (req.headers['x-request-id'] as string) || 'none';

  console.error(`[Error] [RequestID: ${requestId}] ${req.method} ${req.url}:`, {
    message: err.message,
    stack: config.NODE_ENV !== 'production' ? err.stack : undefined,
    code: err.code
  });

  // Handle MongoDB Duplicate Key (E11000)
  if ((err as unknown as Record<string, unknown>).code === 11000) {
    res.status(409).json({
      error: 'Conflict: A resource with that unique value already exists.',
      code: 'DUPLICATE_KEY'
    });
    return;
  }

  // Safe response
  res.status(statusCode).json({
    error:
      statusCode === 500 && config.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message,
    code: err.code || 'INTERNAL_ERROR',
    details: err.details,
    requestId
  });
}
