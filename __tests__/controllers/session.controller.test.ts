import '../setup';
import { Response } from 'express';
import * as sessionController from '../../src/controllers/session.controller';
import Session from '../../src/models/session.model';
import User from '../../src/models/user.model';
import Topic from '../../src/models/topic.model';
import { AuthRequest } from '../../src/middleware/auth.middleware';

describe('Session Controller', () => {
  let mockRes: Partial<Response>;
  let testUser: any;
  let testTopic: any;

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    testUser = await User.create({
      phoneNumber: '1234567890',
      password: 'testPassword123',
    });

    testTopic = await Topic.create({
      title: 'Test Topic',
      category: 'Grammar',
      difficulty: 'easy',
    });
  });

  describe('startSession', () => {
    it('should start a session successfully', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          topic_id: testTopic._id.toString(),
          mode: 'vocabulary',
        },
      } as unknown as AuthRequest;

      await sessionController.startSession(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.message).toBe('Session started successfully');
      expect(callArg.data).toBeDefined();
      expect(callArg.data.status).toBe('in_progress');
    });

    it('should return 401 if user not authenticated', async () => {
      const mockReq = {
        user: undefined,
        body: {
          topic_id: testTopic._id.toString(),
          mode: 'vocabulary',
        },
      } as unknown as AuthRequest;

      await sessionController.startSession(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
    });

    it('should save session to database', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        body: {
          topic_id: testTopic._id.toString(),
          mode: 'speaking',
        },
      } as unknown as AuthRequest;

      await sessionController.startSession(mockReq, mockRes as Response);

      const session = await Session.findOne({
        user_id: testUser._id,
      });
      expect(session).toBeDefined();
      expect(session?.mode).toBe('speaking');
      expect(session?.status).toBe('in_progress');
    });
  });

  describe('completeSession', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        status: 'in_progress',
      });
    });

    it('should complete session successfully', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        params: { id: testSession._id.toString() },
        body: {
          grammar_score: 85,
          vocabulary_score: 90,
          pronunciation_score: 80,
          fluency_score: 88,
          duration_minutes: 30,
        },
      } as unknown as AuthRequest;

      await sessionController.completeSession(mockReq, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalled();
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.message).toBe('Session completed');
      expect(callArg.data.status).toBe('completed');
      expect(callArg.data.grammar_score).toBe(85);
    });

    it('should return 401 if user not authenticated', async () => {
      const mockReq = {
        user: undefined,
        params: { id: testSession._id.toString() },
        body: {},
      } as unknown as AuthRequest;

      await sessionController.completeSession(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
    });

    it('should return 404 if session not found', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        params: { id: '507f1f77bcf86cd799439011' },
        body: {
          grammar_score: 85,
          vocabulary_score: 90,
          pronunciation_score: 80,
          fluency_score: 88,
          duration_minutes: 30,
        },
      } as unknown as AuthRequest;

      await sessionController.completeSession(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Session not found',
      });
    });

    it('should not allow user to complete another user session', async () => {
      const anotherUser = await User.create({
        phoneNumber: '9999999999',
        password: 'testPassword123',
      });

      const mockReq = {
        user: { id: anotherUser._id.toString() },
        params: { id: testSession._id.toString() },
        body: {
          grammar_score: 85,
          vocabulary_score: 90,
          pronunciation_score: 80,
          fluency_score: 88,
          duration_minutes: 30,
        },
      } as unknown as AuthRequest;

      await sessionController.completeSession(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should update session scores correctly', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        params: { id: testSession._id.toString() },
        body: {
          grammar_score: 95,
          vocabulary_score: 92,
          pronunciation_score: 88,
          fluency_score: 91,
          duration_minutes: 45,
        },
      } as unknown as AuthRequest;

      await sessionController.completeSession(mockReq, mockRes as Response);

      const updatedSession = await Session.findById(testSession._id);
      expect(updatedSession?.grammar_score).toBe(95);
      expect(updatedSession?.duration_minutes).toBe(45);
    });
  });

  describe('getSessionHistory', () => {
    beforeEach(async () => {
      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        await Session.create({
          topic_id: testTopic._id,
          user_id: testUser._id,
          mode: i % 2 === 0 ? 'vocabulary' : 'speaking',
          status: 'completed',
          grammar_score: 80 + i,
          duration_minutes: 20 + i,
        });
      }
    });

    it('should return session history', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        query: {},
      } as unknown as AuthRequest;

      await sessionController.getSessionHistory(mockReq, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalled();
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.data).toBeDefined();
      expect(Array.isArray(callArg.data)).toBe(true);
      expect(callArg.pagination).toBeDefined();
    });

    it('should return 401 if user not authenticated', async () => {
      const mockReq = {
        user: undefined,
        query: {},
      } as unknown as AuthRequest;

      await sessionController.getSessionHistory(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized',
      });
    });

    it('should support pagination', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        query: { page: '1', limit: '2' },
      } as unknown as AuthRequest;

      await sessionController.getSessionHistory(mockReq, mockRes as Response);

      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.data.length).toBeLessThanOrEqual(2);
      expect(callArg.pagination.page).toBe(1);
      expect(callArg.pagination.limit).toBe(2);
    });

    it('should filter by date range', async () => {
      const from_date = new Date();
      from_date.setDate(from_date.getDate() - 1);

      const mockReq = {
        user: { id: testUser._id.toString() },
        query: {
          from_date: from_date.toISOString(),
          to_date: new Date().toISOString(),
        },
      } as unknown as AuthRequest;

      await sessionController.getSessionHistory(mockReq, mockRes as Response);

      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.data).toBeDefined();
    });

    it('should return only completed sessions', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
        query: {},
      } as unknown as AuthRequest;

      await sessionController.getSessionHistory(mockReq, mockRes as Response);

      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.data.every((s: any) => s.status === 'completed')).toBe(
        true
      );
    });
  });
});
