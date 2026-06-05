import '../setup';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as userController from '../../src/controllers/user.controller';
import User from '../../src/models/user.model';
import Session from '../../src/models/session.model';
import { AuthRequest } from '../../src/middleware/auth.middleware';

jest.mock('jsonwebtoken');
jest.mock('../../src/utils/otp.js', () => ({
  sendOtpToPhone: jest.fn().mockResolvedValue('mock_verification_id'),
  verifyOtpCode: jest.fn().mockResolvedValue({ isValid: true, mobileNumber: '1234567890' }),
}));

describe('User Controller', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'testPassword123',
        },
      } as Request;

      await userController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User signed up successfully. OTP sent.',
        verificationId: 'mock_verification_id',
      });

      const user = await User.findOne({ phoneNumber: '1234567890' });
      expect(user).toBeDefined();
    });

    it('should return 400 if verified user already exists', async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
        isVerified: true,
      });

      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'anotherPassword123',
        },
      } as Request;

      await userController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User already exists',
      });
    });

    it('should return 200 if unverified user already exists', async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
        isVerified: false,
      });

      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'anotherPassword123',
        },
      } as Request;

      await userController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User already exists',
        verificationId: 'mock_verification_id',
      });
    });

    it('should return 400 on validation error', async () => {
      const mockReq = {
        body: {
          phoneNumber: '', // Invalid
          password: 'testPassword123',
        },
      } as Request;

      await userController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'correctPassword123',
        isVerified: true,
      });
    });

    it('should login successfully with correct credentials', async () => {
      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'correctPassword123',
        },
      } as Request;

      (jwt.sign as jest.Mock).mockReturnValue('fake_token');

      await userController.login(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'fake_token',
        })
      );
    });

    it('should return 401 if user not found', async () => {
      const mockReq = {
        body: {
          phoneNumber: '9999999999',
          password: 'anyPassword',
        },
      } as Request;

      await userController.login(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    it('should return 401 if password is incorrect', async () => {
      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'wrongPassword',
        },
      } as Request;

      await userController.login(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await User.create({
        phoneNumber: '1111111111',
        password: 'password1',
      });
      await User.create({
        phoneNumber: '2222222222',
        password: 'password2',
      });
    });

    it('should return all users without passwords', async () => {
      const mockReq = {} as Request;

      await userController.getAllUsers(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(Array.isArray(callArg)).toBe(true);
      expect(callArg.length).toBe(2);
      expect(callArg[0].password).toBeUndefined();
    });

    it('should return empty array if no users', async () => {
      await User.deleteMany({});

      const mockReq = {} as Request;

      await userController.getAllUsers(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg).toEqual([]);
    });
  });

  describe('getProfile', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
        native_language: 'English',
      });
    });

    it('should return user profile without password', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await userController.getProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.phoneNumber).toBe('1234567890');
      expect(callArg.password).toBeUndefined();
    });

    it('should return 404 if user not found', async () => {
      const mockReq = {
        user: { id: '507f1f77bcf86cd799439011' },
      } as unknown as AuthRequest;

      await userController.getProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('should return 404 on server error when user is not found', async () => {
      const mockReq = {
        user: { id: '507f1f77bcf86cd799439011' },
      } as unknown as AuthRequest;

      await userController.getProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProfile', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });
    });

    it('should update user profile successfully', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          native_language: 'Spanish',
          daily_goal_minutes: 30,
          notifications_enabled: false,
          dark_mode: true,
        },
      } as unknown as AuthRequest;

      await userController.updateProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.native_language).toBe('Spanish');
      expect(callArg.daily_goal_minutes).toBe(30);
      expect(callArg.dark_mode).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      const mockReq = {
        user: { id: '507f1f77bcf86cd799439011' },
        body: {
          native_language: 'French',
        },
      } as unknown as AuthRequest;

      await userController.updateProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('should return 400 on validation error', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          daily_goal_minutes: 'invalid', // Should be a number
        },
      } as unknown as AuthRequest;

      await userController.updateProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('addSelectedLanguage', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });
    });

    it('should add a language to selected_languages successfully', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          language: 'English',
        },
      } as unknown as AuthRequest;

      await userController.addSelectedLanguage(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.selected_languages).toContain('English');
    });

    it('should add multiple languages sequentially without duplicates', async () => {
      // Add English first
      const mockReq1 = {
        user: { id: testUser._id.toString() },
        body: {
          language: 'English',
        },
      } as unknown as AuthRequest;

      await userController.addSelectedLanguage(mockReq1, mockRes as Response);
      
      let callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.selected_languages).toEqual(['English']);

      // Add Hindi next
      const mockReq2 = {
        user: { id: testUser._id.toString() },
        body: {
          language: 'Hindi',
        },
      } as unknown as AuthRequest;

      mockRes.json = jest.fn().mockReturnThis(); // Reset mock json
      await userController.addSelectedLanguage(mockReq2, mockRes as Response);
      
      callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.selected_languages).toEqual(['English', 'Hindi']);

      // Try adding English again (should not duplicate)
      const mockReq3 = {
        user: { id: testUser._id.toString() },
        body: {
          language: 'English',
        },
      } as unknown as AuthRequest;

      mockRes.json = jest.fn().mockReturnThis(); // Reset mock json
      await userController.addSelectedLanguage(mockReq3, mockRes as Response);
      
      callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.selected_languages).toEqual(['English', 'Hindi']);
    });

    it('should return 400 if language is not provided or not a string', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {},
      } as unknown as AuthRequest;

      await userController.addSelectedLanguage(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if language is empty string', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          language: '   ',
        },
      } as unknown as AuthRequest;

      await userController.addSelectedLanguage(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user not found', async () => {
      const mockReq = {
        user: { id: '507f1f77bcf86cd799439011' },
        body: {
          language: 'Spanish',
        },
      } as unknown as AuthRequest;

      await userController.addSelectedLanguage(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('resendOtp', () => {
    beforeEach(async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });
    });

    it('should resend OTP successfully if user exists', async () => {
      const mockReq = {
        body: { phoneNumber: '1234567890' },
      } as Request;

      await userController.resendOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'OTP resent successfully',
        verificationId: 'mock_verification_id',
      });
    });

    it('should return 400 if phoneNumber is missing', async () => {
      const mockReq = {
        body: {},
      } as Request;

      await userController.resendOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user does not exist', async () => {
      const mockReq = {
        body: { phoneNumber: '9999999999' },
      } as Request;

      await userController.resendOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('forgotPassword', () => {
    beforeEach(async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });
    });

    it('should send OTP successfully if user exists', async () => {
      const mockReq = {
        body: { phoneNumber: '1234567890' },
      } as Request;

      await userController.forgotPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'OTP sent successfully. Please verify to reset password.',
        verificationId: 'mock_verification_id',
      });
    });

    it('should return 400 if phoneNumber is missing', async () => {
      const mockReq = {
        body: {},
      } as Request;

      await userController.forgotPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if user does not exist', async () => {
      const mockReq = {
        body: { phoneNumber: '9999999999' },
      } as Request;

      await userController.forgotPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('verifyResetOtp', () => {
    beforeEach(async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });
    });

    it('should verify OTP successfully and return resetToken', async () => {
      const mockReq = {
        body: {
          verificationId: 'mock_verification_id',
          otp: '12345',
          phoneNumber: '1234567890',
        },
      } as Request;

      (jwt.sign as jest.Mock).mockReturnValue('mock_reset_token');

      await userController.verifyResetOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'OTP verified successfully',
        resetToken: 'mock_reset_token',
      });
    });

    it('should return 400 if inputs are missing', async () => {
      const mockReq = {
        body: {
          otp: '12345',
        },
      } as Request;

      await userController.verifyResetOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if OTP verification fails', async () => {
      const mockReq = {
        body: {
          verificationId: 'mock_verification_id',
          otp: 'wrong_otp',
          phoneNumber: '1234567890',
        },
      } as Request;

      const otpUtil = require('../../src/utils/otp.js');
      jest.spyOn(otpUtil, 'verifyOtpCode').mockResolvedValueOnce({ isValid: false });

      await userController.verifyResetOtp(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid OTP' });
    });
  });

  describe('resetPassword', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'oldPassword123',
      });
    });

    it('should reset password successfully with a valid reset token', async () => {
      const mockReq = {
        body: {
          resetToken: 'valid_reset_token',
          newPassword: 'newPassword123',
        },
      } as Request;

      (jwt.verify as jest.Mock).mockReturnValue({ id: testUser._id.toString(), type: 'reset' });

      await userController.resetPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Password reset successfully' });

      // Verify password changed
      const updatedUser = await User.findById(testUser._id);
      expect(await updatedUser?.comparePassword('newPassword123')).toBe(true);
    });

    it('should return 400 if fields are missing', async () => {
      const mockReq = {
        body: {
          newPassword: 'newPassword123',
        },
      } as Request;

      await userController.resetPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if token type is not reset', async () => {
      const mockReq = {
        body: {
          resetToken: 'invalid_reset_token',
          newPassword: 'newPassword123',
        },
      } as Request;

      (jwt.verify as jest.Mock).mockReturnValue({ id: testUser._id.toString(), type: 'login' });

      await userController.resetPassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('changePassword', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'correctOldPassword',
      });
    });

    it('should change password successfully', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          oldPassword: 'correctOldPassword',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        },
      } as unknown as AuthRequest;

      await userController.changePassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });

      const updatedUser = await User.findById(testUser._id);
      expect(await updatedUser?.comparePassword('newPassword123')).toBe(true);
    });

    it('should return 400 if passwords do not match', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          oldPassword: 'correctOldPassword',
          newPassword: 'newPassword123',
          confirmPassword: 'differentPassword',
        },
      } as unknown as AuthRequest;

      await userController.changePassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if old password is wrong', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          oldPassword: 'wrongOldPassword',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        },
      } as unknown as AuthRequest;

      await userController.changePassword(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteUser', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await User.create({
        phoneNumber: '1234567890',
        password: 'correctOldPassword',
      });
    });

    it('should delete user and cascade delete sessions successfully', async () => {
      // Create a mock session for the user
      await Session.create({
        user_id: testUser._id,
        topic_id: new mongoose.Types.ObjectId(),
        mode: 'vocabulary',
        duration_minutes: 10,
        status: 'completed',
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await userController.deleteUser(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User and all related data deleted successfully',
      });

      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();

      const userSessions = await Session.find({ user_id: testUser._id });
      expect(userSessions.length).toBe(0);
    });

    it('should return 401 if user id is missing in request', async () => {
      const mockReq = {} as unknown as AuthRequest;

      await userController.deleteUser(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('should return 404 if user is not found in database', async () => {
      const mockReq = {
        user: { id: '64d5f8c8a3b2c9f5e9f3a1b2' }, // non-existent ID
      } as unknown as AuthRequest;

      await userController.deleteUser(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});
