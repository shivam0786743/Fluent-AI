import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import TokenBlacklist from '../models/tokenBlacklist.model.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const signup = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ phoneNumber, password });
    await user.save();

    res.status(201).json({ message: 'User signed up successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = req.body;

    // Find user
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      native_language,
      daily_goal_minutes,
      notifications_enabled,
      dark_mode,
    } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      {
        $set: {
          native_language,
          daily_goal_minutes,
          notifications_enabled,
          dark_mode,
        },
      },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLevel = async (req: AuthRequest, res: Response) => {
  try {
    const { level } = req.body;
    if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
      return res.status(400).json({ message: 'Invalid level' });
    }

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { $set: { level } },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { avatar } = req.body; // Assuming avatar is sent as a base64 string in the body
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar data is required' });
    }

    // In a real app, you would upload the base64 image to a storage service (S3, Cloudinary)
    // and get a URL back. For now, we'll just mock the URL.
    const mockAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.id}`;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { $set: { avatar_url: mockAvatarUrl } },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Avatar updated successfully',
      avatar_url: user.avatar_url,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const addSelectedLanguage = async (req: AuthRequest, res: Response) => {
  try {
    const { language } = req.body;
    if (!language || typeof language !== 'string') {
      return res
        .status(400)
        .json({ message: 'Language is required and must be a string' });
    }

    const trimmedLanguage = language.trim();
    if (trimmedLanguage === '') {
      return res.status(400).json({ message: 'Language cannot be empty' });
    }

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { $addToSet: { selected_languages: trimmedLanguage } },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Decode to get expiry time, fall back to 1 day if missing
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await TokenBlacklist.create({ token, expiresAt });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
