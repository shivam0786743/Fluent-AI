import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) {
      return res.status(400).json({ message: 'refresh_token is required' });
    }

    try {
      const decoded = jwt.verify(refresh_token, JWT_SECRET) as { id: string };
      const accessToken = jwt.sign({ id: decoded.id }, JWT_SECRET, {
        expiresIn: '1d',
      });
      return res.status(200).json({ access_token: accessToken });
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export default { refresh };
