import { type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.middleware.js';
import Session from '../models/session.model.js';

// POST /api/sessions/start
export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const { topic_id, mode } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = new Session({
      topic_id,
      user_id: req.user.id,
      mode,
      status: 'in_progress',
    });

    await session.save();
    res
      .status(201)
      .json({ message: 'Session started successfully', data: session });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// POST /api/sessions/:id/complete
export const completeSession = async (req: AuthRequest, res: Response) => {
  try {
    const {
      grammar_score,
      vocabulary_score,
      pronunciation_score,
      fluency_score,
      duration_minutes,
    } = req.body;
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.grammar_score = grammar_score;
    session.vocabulary_score = vocabulary_score;
    session.pronunciation_score = pronunciation_score;
    session.fluency_score = fluency_score;
    session.duration_minutes = duration_minutes;
    session.status = 'completed';

    await session.save();
    res.json({ message: 'Session completed', data: session });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/sessions/history
export const getSessionHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const from_date = req.query.from_date as string;
    const to_date = req.query.to_date as string;

    const query: any = { user_id: req.user.id, status: 'completed' };

    if (from_date || to_date) {
      query.createdAt = {};
      if (from_date) {
        query.createdAt.$gte = new Date(from_date);
      }
      if (to_date) {
        query.createdAt.$lte = new Date(to_date);
      }
    }

    const sessions = await Session.find(query)
      .populate('topic_id')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Session.countDocuments(query);

    res.json({
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
