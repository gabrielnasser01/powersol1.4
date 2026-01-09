export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class BlockchainError extends AppError {
  public readonly cause?: unknown;

  constructor(message: string = 'Blockchain operation failed', cause?: unknown) {
    super(message, 503);
    this.cause = cause;
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly cause?: unknown;

  constructor(service: string, message: string = 'External service error', cause?: unknown) {
    super(`${service}: ${message}`, 502);
    this.service = service;
    this.cause = cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export interface FormattedError {
  message: string;
  statusCode: number;
  code?: string;
  details?: unknown;
  stack?: string;
}

export function formatError(error: unknown): FormattedError {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.constructor.name,
      details: (error as ValidationError).errors || (error as BlockchainError).cause,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  return {
    message: 'Internal server error',
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
  };
}
