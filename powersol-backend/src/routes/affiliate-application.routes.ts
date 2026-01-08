import { Router } from 'express';
import {
  submitApplication,
  getMyApplication,
  listApplications,
  updateApplicationStatus,
  deleteApplication,
} from '../controllers/affiliate-application.controller.js';

const router = Router();

router.post('/submit', submitApplication);

router.get('/my-application', getMyApplication);

router.get('/list', listApplications);

router.patch('/:id/status', updateApplicationStatus);

router.delete('/:id', deleteApplication);

export default router;
