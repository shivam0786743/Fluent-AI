import { type Response, type NextFunction } from 'express';
import User from '../models/user.model.js';
import { type AuthRequest } from './auth.middleware.js';

export const isAdminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.id);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied: Admins only' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
