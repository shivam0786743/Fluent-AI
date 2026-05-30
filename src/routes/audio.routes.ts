import { Router } from 'express';
import {
  textToSpeech,
  speechToText,
  voiceToVoice,
} from '../controllers/audio.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All audio routes require authentication
router.use(authMiddleware);

router.post('/text-to-speech', textToSpeech);
router.post('/speech-to-text', speechToText);
router.post('/voice-to-voice', voiceToVoice);

export default router;
