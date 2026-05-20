import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as progressController from '../controllers/progress.controller.js';

const router = express.Router();

// GET /api/progress/summary
router.get('/summary', authMiddleware, progressController.getSummary);

// GET /api/progress/fluency-trend
router.get('/fluency-trend', authMiddleware, progressController.getFluencyTrend);

// GET /api/progress/overall-score
router.get('/overall-score', authMiddleware, progressController.getOverallScore);

// GET /api/progress/skills-breakdown
router.get('/skills-breakdown', authMiddleware, progressController.getSkillsBreakdown);

// GET /api/progress/streak
router.get('/streak', authMiddleware, progressController.getStreak);

export default router;
