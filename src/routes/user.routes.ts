import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Signup Route
router.post('/signup', userController.signup);

// Login Route
router.post('/login', userController.login);

// Get all users
router.get('/', userController.getAllUsers);

// Profile Routes
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/level', authMiddleware, userController.updateLevel);
router.put('/avatar', authMiddleware, userController.updateAvatar);
router.post('/languages', authMiddleware, userController.addSelectedLanguage);

export default router;
