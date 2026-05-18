import '../setup';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as userController from '../../src/controllers/user.controller';
import User from '../../src/models/user.model';
import { AuthRequest } from '../../src/middleware/auth.middleware';

jest.mock('jsonwebtoken');

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
        message: 'User signed up successfully',
      });

      const user = await User.findOne({ phoneNumber: '1234567890' });
      expect(user).toBeDefined();
    });

    it('should return 400 if user already exists', async () => {
      await User.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
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
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'fake_token',
      });
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
});
