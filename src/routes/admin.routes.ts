import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Signup Route
router.post('/signup', adminController.signup);

// Login Route
router.post('/login', adminController.login);

// Profile Route (Requires Auth)
router.get('/profile', authMiddleware, adminController.getProfile);

export default router;
