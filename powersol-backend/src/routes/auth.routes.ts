import { Router } from 'express';
import { authController } from '@controllers/auth.controller.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { validateQuery, validateBody } from '@middleware/validate.middleware.js';
import { authRateLimit } from '@middleware/rateLimit.middleware.js';
import { asyncHandler } from '@utils/helpers.js';
import { authNonceQuerySchema, authWalletBodySchema } from '@utils/validators.js';

const router = Router();

router.get(
  '/nonce',
  authRateLimit,
  validateQuery(authNonceQuerySchema),
  asyncHandler(authController.getNonce.bind(authController))
);

router.post(
  '/wallet',
  authRateLimit,
  validateBody(authWalletBodySchema),
  asyncHandler(authController.authenticateWallet.bind(authController))
);

router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getMe.bind(authController))
);

export default router;
