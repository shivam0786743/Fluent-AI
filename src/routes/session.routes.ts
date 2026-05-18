import { Router } from 'express';
import {
  startSession,
  completeSession,
  getSessionHistory,
} from '../controllers/session.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All session routes require authentication
router.use(authMiddleware);

router.post('/start', startSession);
router.get('/history', getSessionHistory);
router.post('/:id/complete', completeSession);

export default router;
