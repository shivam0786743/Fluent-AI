import '../setup';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as adminController from '../../src/controllers/admin.controller';
import Admin from '../../src/models/admin.model';
import { AuthRequest } from '../../src/middleware/auth.middleware';

jest.mock('jsonwebtoken');

describe('Admin Controller', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('signup', () => {
    it('should create a new admin successfully', async () => {
      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'testPassword123',
          name: 'Super Admin',
        },
      } as Request;

      await adminController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Admin signed up successfully',
      });

      const admin = await Admin.findOne({ phoneNumber: '1234567890' });
      expect(admin).toBeDefined();
      expect(admin?.name).toBe('Super Admin');
    });

    it('should return 400 if admin already exists', async () => {
      await Admin.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
      });

      const mockReq = {
        body: {
          phoneNumber: '1234567890',
          password: 'anotherPassword123',
        },
      } as Request;

      await adminController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Admin already exists',
      });
    });

    it('should return 400 if phoneNumber or password is missing', async () => {
      const mockReq = {
        body: {
          phoneNumber: '',
          password: 'testPassword123',
        },
      } as Request;

      await adminController.signup(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Phone number and password are required',
      });
    });
  });

  describe('login', () => {
    let testAdmin: any;

    beforeEach(async () => {
      testAdmin = await Admin.create({
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

      await adminController.login(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: ' Admin Login successful',
        token: 'fake_token',
      });
    });

    it('should return 401 if admin not found', async () => {
      const mockReq = {
        body: {
          phoneNumber: '9999999999',
          password: 'anyPassword',
        },
      } as Request;

      await adminController.login(mockReq, mockRes as Response);

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

      await adminController.login(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });
  });

  describe('getProfile', () => {
    let testAdmin: any;

    beforeEach(async () => {
      testAdmin = await Admin.create({
        phoneNumber: '1234567890',
        password: 'testPassword123',
        name: 'Profile Admin',
      });
    });

    it('should return admin profile without password', async () => {
      const mockReq = {
        user: { id: testAdmin._id.toString() },
      } as unknown as AuthRequest;

      await adminController.getProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.phoneNumber).toBe('1234567890');
      expect(callArg.name).toBe('Profile Admin');
      expect(callArg.password).toBeUndefined();
    });

    it('should return 404 if admin not found', async () => {
      const mockReq = {
        user: { id: '507f1f77bcf86cd799439011' },
      } as unknown as AuthRequest;

      await adminController.getProfile(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Admin not found',
      });
    });
  });
});
