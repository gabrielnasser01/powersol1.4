import rateLimit from 'express-rate-limit';
import { RateLimitError } from '@utils/errors.js';

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, _next, options) => {
    throw new RateLimitError(options.message as string);
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
  handler: (_req, _res, _next, options) => {
    throw new RateLimitError(options.message as string);
  },
});

export const purchaseRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many purchase requests, please slow down',
  handler: (_req, _res, _next, options) => {
    throw new RateLimitError(options.message as string);
  },
});

export const claimRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many claim requests, please try again later',
  handler: (_req, _res, _next, options) => {
    throw new RateLimitError(options.message as string);
  },
});
