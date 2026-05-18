import { type Request, type Response } from 'express';
import Topic from '../models/topic.model.js';
import User from '../models/user.model.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';

// Admin: Create Topic
export const createTopic = async (req: Request, res: Response) => {
  try {
    const { title, category, difficulty, is_premium, icon_url } = req.body;
    const topic = new Topic({
      title,
      category,
      difficulty,
      is_premium,
      icon_url,
    });
    await topic.save();
    res.status(201).json({ message: 'Topic created successfully', topic });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/topics - Fetch all topics grouped by category
export const getTopicsGroupedByCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const topics = await Topic.aggregate([
      {
        $group: {
          _id: '$category',
          topics: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          category: '$_id',
          topics: 1,
          _id: 0,
        },
      },
      {
        $sort: { category: 1 },
      },
    ]);
    res.json({ data: topics });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/topics/recommended
export const getRecommendedTopic = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userLevel = user.level || 'beginner';

    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (userLevel === 'intermediate') difficulty = 'medium';
    else if (userLevel === 'advanced') difficulty = 'hard';

    // Simple recommendation: just pick one that matches difficulty
    const recommended = await Topic.findOne({ difficulty });

    if (recommended) {
      res.json({ data: recommended });
    } else {
      const fallback = await Topic.findOne();
      res.json({ data: fallback });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// GET /api/topics/:id - Fetch single topic details
export const getTopicById = async (req: Request, res: Response) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    // In the future, this might include an exercises list
    res.json({ data: topic, exercises: [] });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Admin: Get all topics (List)
export const getAllAdminTopics = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const topics = await Topic.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Topic.countDocuments();

    res.json({
      data: topics,
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

// Admin: Update Topic
export const updateTopic = async (req: Request, res: Response) => {
  try {
    const { title, category, difficulty, is_premium, icon_url } = req.body;

    const topic = await Topic.findByIdAndUpdate(
      req.params.id,
      { title, category, difficulty, is_premium, icon_url },
      { returnDocument: 'after', runValidators: true }
    );

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    res.json({ message: 'Topic updated successfully', data: topic });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Admin: Delete Topic
export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    res.json({ message: 'Topic deleted successfully', data: topic });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
