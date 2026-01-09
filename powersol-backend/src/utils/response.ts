import type { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(response);
}

export function sendError(res: Response, error: string, statusCode: number = 500, details?: unknown): void {
  const response: ErrorResponse = {
    success: false,
    error,
    ...(details && { details }),
  };
  res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendNotFound(res: Response, message: string = 'Resource not found'): void {
  sendError(res, message, 404);
}

export function sendBadRequest(res: Response, message: string = 'Bad request', details?: unknown): void {
  sendError(res, message, 400, details);
}

export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  sendError(res, message, 401);
}

export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
  sendError(res, message, 403);
}

export function sendConflict(res: Response, message: string = 'Resource already exists'): void {
  sendError(res, message, 409);
}

export function sendValidationError(res: Response, errors: Record<string, string[]>): void {
  sendError(res, 'Validation failed', 422, errors);
}
