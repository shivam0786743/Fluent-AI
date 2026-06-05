import { type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Session from '../models/session.model.js';
import TokenBlacklist from '../models/tokenBlacklist.model.js';
import { type AuthRequest } from '../middleware/auth.middleware.js';
import { sendOtpToPhone, verifyOtpCode } from '../utils/otp.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const signup = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be exactly 10 digits",
    });
  }
  try {
    const { phoneNumber, password, firstName, lastName, countryCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const verificationId = await sendOtpToPhone(phoneNumber);

      existingUser.password = password;
      if (firstName) existingUser.firstName = firstName;
      if (lastName) existingUser.lastName = lastName;
      if (countryCode) existingUser.countryCode = countryCode;
      await existingUser.save();

      return res.status(200).json({
        message: 'User already exists',
        verificationId
      });
    }

    const verificationId = await sendOtpToPhone(phoneNumber);

    const user = new User({ phoneNumber, password, firstName, lastName, countryCode });
    await user.save();

    res.status(201).json({
      message: 'User signed up successfully. OTP sent.',
      verificationId
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { verificationId, otp, phoneNumber } = req.body;

    if (!verificationId || !otp) {
      return res.status(400).json({ message: 'Verification ID and OTP are required' });
    }

    const { isValid, mobileNumber } = await verifyOtpCode(verificationId, otp);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const phone = mobileNumber || phoneNumber;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    let user = await User.findOne({ phoneNumber: phone });
    if (!user) {
      user = await User.findOne({ phoneNumber: { $regex: new RegExp(phone + '$') } });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
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

export const login = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = req.body;

    // Find user
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your OTP to login' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Fetch user profile without password
    const userProfile = await User.findById(user._id).select('-password');

    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      refresh_token: refreshToken,
      user: userProfile,
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
      firstName,
      lastName,
      countryCode,
      native_language,
      daily_goal_minutes,
      notifications_enabled,
      dark_mode,
    } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      {
        $set: {
          firstName,
          lastName,
          countryCode,
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

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationId = await sendOtpToPhone(phoneNumber);

    res.status(200).json({
      message: 'OTP resent successfully',
      verificationId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verificationId = await sendOtpToPhone(phoneNumber);

    res.status(200).json({
      message: 'OTP sent successfully. Please verify to reset password.',
      verificationId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyResetOtp = async (req: Request, res: Response) => {
  try {
    const { verificationId, otp, phoneNumber } = req.body;

    if (!verificationId || !otp || !phoneNumber) {
      return res.status(400).json({ message: 'Verification ID, OTP, and phone number are required' });
    }

    const { isValid, mobileNumber } = await verifyOtpCode(verificationId, otp);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const phone = mobileNumber || phoneNumber;
    let user = await User.findOne({ phoneNumber: phone });
    if (!user) {
      user = await User.findOne({ phoneNumber: { $regex: new RegExp(phone + '$') } });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a secure short-lived reset token
    const resetToken = jwt.sign(
      { id: user._id, type: 'reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    try {
      const decoded = jwt.verify(resetToken, JWT_SECRET) as { id: string; type: string };
      if (decoded.type !== 'reset') {
        return res.status(400).json({ message: 'Invalid reset token type' });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Old password, new password, and confirm new password are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cascade delete any related sessions/progress
    await Session.deleteMany({ user_id: userId });

    res.status(200).json({ message: 'User and all related data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

