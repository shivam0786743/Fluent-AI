import { type Response, type NextFunction } from 'express';
import Admin from '../models/admin.model.js';
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

    // Check if user is an Admin record
    const admin = await Admin.findById(req.user.id);
    if (admin) {
      return next();
    }

    res.status(403).json({ message: 'Access denied: Admins only' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
