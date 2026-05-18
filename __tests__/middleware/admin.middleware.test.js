import { Response, NextFunction } from 'express';
import { isAdminMiddleware } from '../../src/middleware/admin.middleware';
import User from '../../src/models/user.model';
jest.mock('../../src/models/user.model');
describe('isAdminMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            user: { id: 'user123' },
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });
    it('should return 401 if user is not authenticated', async () => {
        mockReq.user = undefined;
        await isAdminMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Unauthorized',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should call next if user is admin', async () => {
        User.findById.mockResolvedValue({
            role: 'admin',
        });
        await isAdminMiddleware(mockReq, mockRes, mockNext);
        expect(User.findById).toHaveBeenCalledWith('user123');
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });
    it('should return 403 if user is not admin', async () => {
        User.findById.mockResolvedValue({
            role: 'user',
        });
        await isAdminMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Access denied: Admins only',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should return 403 if user not found', async () => {
        User.findById.mockResolvedValue(null);
        await isAdminMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should return 500 on server error', async () => {
        User.findById.mockRejectedValue(new Error('Database error'));
        await isAdminMiddleware(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Server error',
        });
    });
});
//# sourceMappingURL=admin.middleware.test.js.map