import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// POST /refresh - exchange refresh token for new access token
router.post('/refresh', authController.refresh);

export default router;
