import { Router } from 'express';
import { globalRateLimit } from '@middleware/rateLimit.middleware.js';
import authRoutes from './auth.routes.js';
import lotteryRoutes from './lottery.routes.js';
import ticketRoutes from './ticket.routes.js';
import claimRoutes from './claim.routes.js';
import prizeRoutes from './prize.routes.js';
import missionRoutes from './mission.routes.js';
import affiliateRoutes from './affiliate.routes.js';
import affiliateApplicationRoutes from './affiliate-application.routes.js';
import auditRoutes from './audit.routes.js';
import transparencyRoutes from './transparency.routes.js';
import webhookRoutes from './webhook.routes.js';

const router = Router();

router.use(globalRateLimit);

router.use('/auth', authRoutes);
router.use('/lotteries', lotteryRoutes);
router.use('/tickets', ticketRoutes);
router.use('/claims', claimRoutes);
router.use('/api', prizeRoutes);
router.use('/missions', missionRoutes);
router.use('/affiliates', affiliateRoutes);
router.use('/affiliate-applications', affiliateApplicationRoutes);
router.use('/audit', auditRoutes);
router.use('/transparency', transparencyRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
