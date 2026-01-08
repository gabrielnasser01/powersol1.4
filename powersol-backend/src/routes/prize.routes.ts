import { Router } from 'express';
import { prizeController } from '../controllers/prize.controller.js';

const router = Router();

router.get('/prizes', prizeController.getUserPrizes.bind(prizeController));

router.get('/prizes/unclaimed', prizeController.getUnclaimedPrizes.bind(prizeController));

router.get('/prizes/claims', prizeController.getClaimHistory.bind(prizeController));

router.get('/prizes/:prizeId', prizeController.getPrizeById.bind(prizeController));

router.post('/prizes/:prizeId/claim', prizeController.initiateClaim.bind(prizeController));

export default router;
