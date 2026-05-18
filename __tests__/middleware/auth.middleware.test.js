import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../../src/middleware/auth.middleware';
jest.mock('jsonwebtoken');
describe('authMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
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
        mockReq.header.mockReturnValue(undefined);
        authMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'No token, authorization denied',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should return 401 if token is invalid', () => {
        mockReq.header.mockReturnValue('Bearer invalid_token');
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });
        authMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Token is not valid',
        });
    });
    it('should set user on request and call next if token is valid', () => {
        const userId = '123456';
        mockReq.header.mockReturnValue('Bearer valid_token');
        jwt.verify.mockReturnValue({ id: userId });
        authMiddleware(mockReq, mockRes, mockNext);
        expect(mockReq.user).toEqual({ id: userId });
        expect(mockNext).toHaveBeenCalled();
    });
    it('should extract Bearer token correctly', () => {
        mockReq.header.mockReturnValue('Bearer mytoken123');
        jwt.verify.mockReturnValue({ id: 'user123' });
        authMiddleware(mockReq, mockRes, mockNext);
        expect(jwt.verify).toHaveBeenCalledWith('mytoken123', expect.any(String));
    });
});
//# sourceMappingURL=auth.middleware.test.js.map