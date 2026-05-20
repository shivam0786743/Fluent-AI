import '../setup.js';
import { Response } from 'express';
import * as progressController from '../../src/controllers/progress.controller.js';
import User from '../../src/models/user.model.js';
import Session from '../../src/models/session.model.js';
import Topic from '../../src/models/topic.model.js';
import { AuthRequest } from '../../src/middleware/auth.middleware.js';
import mongoose from 'mongoose';

describe('Progress Controller', () => {
  let mockRes: Partial<Response>;
  let testUser: any;
  let testTopic: any;

  beforeEach(async () => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Create a mock user
    testUser = await User.create({
      phoneNumber: '1122334455',
      password: 'password123',
      streak_days: 3,
    });

    // Create a mock topic
    testTopic = await Topic.create({
      title: 'Vocabulary Topic',
      category: 'Vocabulary',
      difficulty: 'easy',
      content: 'Sample content',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await Topic.deleteMany({});
  });

  describe('getSummary', () => {
    it('should return weekly summary correctly', async () => {
      const today = new Date();
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;

      // Create a completed session for today
      const todaySessionDate = new Date(today);
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        grammar_score: 80,
        vocabulary_score: 70,
        duration_minutes: 15,
        status: 'completed',
        createdAt: todaySessionDate,
      });

      // Create a completed session for Monday of this week
      const mondayDate = new Date(today);
      mondayDate.setDate(today.getDate() - distanceToMonday);
      mondayDate.setHours(12, 0, 0, 0);

      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'speaking',
        grammar_score: 90,
        fluency_score: 85,
        duration_minutes: 25,
        status: 'completed',
        createdAt: mondayDate,
      });

      // Create a session outside this week (e.g. 10 days ago)
      const oldDate = new Date(today);
      oldDate.setDate(today.getDate() - 10);
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        grammar_score: 100,
        duration_minutes: 30,
        status: 'completed',
        createdAt: oldDate,
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getSummary(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const data = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(data.week_minutes).toBe(40); // 15 + 25
      expect(data.week_sessions).toBe(2);
      expect(data.streak_days).toBe(3);
      expect(data.streak_map).toBeDefined();
    });

    it('should return 401 if user not authenticated', async () => {
      const mockReq = {} as unknown as AuthRequest;

      await progressController.getSummary(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('getFluencyTrend', () => {
    it('should return 7 days of fluency trends', async () => {
      const today = new Date();

      // Create a fluency session for today
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'speaking',
        fluency_score: 90,
        status: 'completed',
        createdAt: today,
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getFluencyTrend(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const data = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(data).toHaveLength(7);
      expect(data[6].score).toBe(90); // Today's score
    });
  });

  describe('getOverallScore', () => {
    it('should calculate overall score average', async () => {
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        grammar_score: 80, // Avg = 80
        status: 'completed',
      });

      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'reading',
        grammar_score: 90,
        vocabulary_score: 70, // Avg = 80
        status: 'completed',
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getOverallScore(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ overall_score: 80 });
    });

    it('should return 0 overall score if no sessions', async () => {
      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getOverallScore(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ overall_score: 0 });
    });
  });

  describe('getSkillsBreakdown', () => {
    it('should calculate skills averages', async () => {
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'speaking',
        grammar_score: 80,
        vocabulary_score: 90,
        pronunciation_score: 85,
        fluency_score: 95,
        status: 'completed',
      });

      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'speaking',
        grammar_score: 70,
        vocabulary_score: 80,
        pronunciation_score: 75,
        fluency_score: 85,
        status: 'completed',
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getSkillsBreakdown(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        grammar: 75,
        vocabulary: 85,
        pronunciation: 80,
        fluency: 90,
      });
    });
  });

  describe('getStreak', () => {
    it('should return correct current and longest streak', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(today.getDate() - 2);

      // Create session on consecutive days
      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        status: 'completed',
        createdAt: twoDaysAgo,
      });

      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        status: 'completed',
        createdAt: yesterday,
      });

      await Session.create({
        topic_id: testTopic._id,
        user_id: testUser._id,
        mode: 'vocabulary',
        status: 'completed',
        createdAt: today,
      });

      const mockReq = {
        user: { id: testUser._id.toString() },
      } as unknown as AuthRequest;

      await progressController.getStreak(mockReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const data = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(data.current_streak).toBe(3);
      expect(data.longest_streak).toBe(3);
      expect(data.daily_log).toHaveLength(3);
    });
  });
});
