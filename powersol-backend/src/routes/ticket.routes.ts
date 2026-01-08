import { Router } from 'express';
import { ticketController } from '@controllers/ticket.controller.js';
import { authenticate } from '@middleware/auth.middleware.js';
import { validateBody } from '@middleware/validate.middleware.js';
import { purchaseRateLimit } from '@middleware/rateLimit.middleware.js';
import { asyncHandler } from '@utils/helpers.js';
import { purchaseTicketSchema } from '@utils/validators.js';

const router = Router();

router.post(
  '/purchase',
  authenticate,
  purchaseRateLimit,
  validateBody(purchaseTicketSchema),
  asyncHandler(ticketController.purchaseTicket.bind(ticketController))
);

router.get(
  '/my-tickets',
  authenticate,
  asyncHandler(ticketController.getMyTickets.bind(ticketController))
);

router.get(
  '/:id',
  asyncHandler(ticketController.getTicketById.bind(ticketController))
);

router.post(
  '/:id/verify',
  asyncHandler(ticketController.verifyTicket.bind(ticketController))
);

export default router;
