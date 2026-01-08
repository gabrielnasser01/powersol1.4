import { Response, NextFunction } from 'express';
import { supabase } from '@config/supabase.js';
import { UnauthorizedError, ForbiddenError } from '@utils/errors.js';
import { logger } from '@utils/logger.js';
import type { AuthenticatedRequest } from '../types/api.types.js';

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      logger.warn({ userId: req.user.userId, error }, 'User not found during admin check');
      throw new ForbiddenError('User not found');
    }

    if (!user.is_admin) {
      logger.warn(
        { userId: req.user.userId, wallet: req.user.wallet },
        'Non-admin user attempted to access admin endpoint'
      );
      throw new ForbiddenError('Admin access required');
    }

    req.user.isAdmin = true;

    logger.debug({ userId: req.user.userId }, 'Admin access granted');

    next();
  } catch (error) {
    next(error);
  }
}
