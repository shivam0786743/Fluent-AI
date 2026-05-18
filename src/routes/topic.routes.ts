import { Router } from 'express';
import {
  createTopic,
  getTopicsGroupedByCategory,
  getRecommendedTopic,
  getTopicById,
  getAllAdminTopics,
  updateTopic,
  deleteTopic,
} from '../controllers/topic.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { isAdminMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// Admin Routes
router.post('/', authMiddleware, isAdminMiddleware, createTopic);
router.get('/admin/all', authMiddleware, isAdminMiddleware, getAllAdminTopics);
router.put('/:id', authMiddleware, isAdminMiddleware, updateTopic);
router.delete('/:id', authMiddleware, isAdminMiddleware, deleteTopic);

// User Routes
router.get('/', getTopicsGroupedByCategory);
router.get('/recommended', authMiddleware, getRecommendedTopic);
router.get('/:id', getTopicById);

export default router;
