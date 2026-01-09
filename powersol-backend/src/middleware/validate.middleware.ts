import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@utils/errors.js';
import { loggers } from '@utils/logger.js';

const logger = loggers.default;

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        const errorRecord: Record<string, string[]> = {};
        error.errors.forEach((e) => {
          const key = e.path.join('.') || 'root';
          if (!errorRecord[key]) {
            errorRecord[key] = [];
          }
          errorRecord[key].push(e.message);
        });
        logger.warn({ errors: error.errors }, 'Validation failed');
        next(new ValidationError(messages.join(', '), errorRecord));
      } else {
        next(error);
      }
    }
  };
}

export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');
