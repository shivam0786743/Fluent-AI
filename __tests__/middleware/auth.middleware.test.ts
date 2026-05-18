import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../../src/middleware/auth.middleware';

jest.mock('jsonwebtoken');

describe('authMiddleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should return 401 if no token is provided', () => {
    (mockReq.header as jest.Mock).mockReturnValue(undefined);

    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'No token, authorization denied',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    (mockReq.header as jest.Mock).mockReturnValue('Bearer invalid_token');
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Token is not valid',
    });
  });

  it('should set user on request and call next if token is valid', () => {
    const userId = '123456';
    (mockReq.header as jest.Mock).mockReturnValue(
      'Bearer valid_token'
    );
    (jwt.verify as jest.Mock).mockReturnValue({ id: userId });

    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockReq.user).toEqual({ id: userId });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should extract Bearer token correctly', () => {
    (mockReq.header as jest.Mock).mockReturnValue('Bearer mytoken123');
    (jwt.verify as jest.Mock).mockReturnValue({ id: 'user123' });

    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(jwt.verify).toHaveBeenCalledWith(
      'mytoken123',
      expect.any(String)
    );
  });
});
