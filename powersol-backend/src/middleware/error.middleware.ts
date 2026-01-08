import { Request, Response, NextFunction } from 'express';
import { isAppError, formatError } from '@utils/errors.js';
import { logger } from '@utils/logger.js';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const formattedError = formatError(error);

  logger.error(
    {
      error: formattedError,
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
    },
    'Request error'
  );

  const statusCode = isAppError(error) ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    error: formattedError.message,
    code: formattedError.code,
    ...(process.env.NODE_ENV === 'development' && {
      details: formattedError.details,
      stack: formattedError.stack,
    }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({ method: req.method, path: req.path }, 'Route not found');

  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}
