import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { ENV } from '@config/env.js';
import { AuthenticationError } from '@utils/errors.js';
import { logger } from '@utils/logger.js';
import type { JWTPayload } from '../types/user.types.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

const jwtSecret = new TextEncoder().encode(ENV.JWT_SECRET);

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    const { payload } = await jwtVerify(token, jwtSecret);

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      userId: payload.userId as string,
      wallet: payload.wallet as string,
    };

    logger.debug({ userId: payload.userId, wallet: payload.wallet }, 'User authenticated');

    next();
  } catch (error) {
    logger.warn({ error }, 'Authentication failed');
    next(new AuthenticationError('Invalid or expired token'));
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  authenticate(req, res, next);
}
