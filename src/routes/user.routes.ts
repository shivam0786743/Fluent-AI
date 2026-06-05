import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Signup Route
router.post('/signup', userController.signup);

// Verify OTP Route
router.post('/verify-otp', userController.verifyOtp);

// Resend OTP Route
router.post('/resend-otp', userController.resendOtp);

// Forgot Password Flow Routes
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-reset-otp', userController.verifyResetOtp);
router.post('/reset-password', userController.resetPassword);

// Login Route
router.post('/login', userController.login);

// Get all users
router.get('/', userController.getAllUsers);

// Profile Routes
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.delete('/profile', authMiddleware, userController.deleteUser);
router.put('/level', authMiddleware, userController.updateLevel);
router.put('/avatar', authMiddleware, userController.updateAvatar);
router.post('/languages', authMiddleware, userController.addSelectedLanguage);

// Change Password Route
router.post('/change-password', authMiddleware, userController.changePassword);

// Logout Route
router.post('/logout', authMiddleware, userController.logout);

export default router;
