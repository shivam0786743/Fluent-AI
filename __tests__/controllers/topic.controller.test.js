import '../setup';
import { Request, Response } from 'express';
import * as topicController from '../../src/controllers/topic.controller';
import Topic from '../../src/models/topic.model';
import User from '../../src/models/user.model';
import { AuthRequest } from '../../src/middleware/auth.middleware';
describe('Topic Controller', () => {
    let mockRes;
    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });
    describe('createTopic', () => {
        it('should create a topic successfully', async () => {
            const mockReq = {
                body: {
                    title: 'Present Perfect',
                    category: 'Grammar',
                    difficulty: 'medium',
                    is_premium: false,
                    icon_url: 'https://example.com/icon.png',
                },
            };
            await topicController.createTopic(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.message).toBe('Topic created successfully');
            expect(callArg.topic.title).toBe('Present Perfect');
            const topic = await Topic.findOne({ title: 'Present Perfect' });
            expect(topic).toBeDefined();
        });
        it('should create a premium topic', async () => {
            const mockReq = {
                body: {
                    title: 'Advanced Conversation',
                    category: 'Speaking',
                    difficulty: 'hard',
                    is_premium: true,
                    icon_url: 'https://example.com/icon.png',
                },
            };
            await topicController.createTopic(mockReq, mockRes);
            const topic = await Topic.findOne({
                title: 'Advanced Conversation',
            });
            expect(topic?.is_premium).toBe(true);
        });
        it('should return 500 on server error', async () => {
            const mockReq = {
                body: {
                    title: 'Test', // Missing required fields
                },
            };
            await topicController.createTopic(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
    describe('getTopicsGroupedByCategory', () => {
        beforeEach(async () => {
            await Topic.create({
                title: 'Present Tense',
                category: 'Grammar',
                difficulty: 'easy',
            });
            await Topic.create({
                title: 'Past Tense',
                category: 'Grammar',
                difficulty: 'medium',
            });
            await Topic.create({
                title: 'Daily Words',
                category: 'Vocabulary',
                difficulty: 'easy',
            });
            await Topic.create({
                title: 'Business Words',
                category: 'Vocabulary',
                difficulty: 'hard',
            });
        });
        it('should return topics grouped by category', async () => {
            const mockReq = {};
            await topicController.getTopicsGroupedByCategory(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toBeDefined();
            expect(Array.isArray(callArg.data)).toBe(true);
            const categories = callArg.data.map((g) => g.category);
            expect(categories).toContain('Grammar');
            expect(categories).toContain('Vocabulary');
        });
        it('should include all topics in groups', async () => {
            const mockReq = {};
            await topicController.getTopicsGroupedByCategory(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            const grammarGroup = callArg.data.find((g) => g.category === 'Grammar');
            expect(grammarGroup.topics.length).toBe(2);
            const vocabGroup = callArg.data.find((g) => g.category === 'Vocabulary');
            expect(vocabGroup.topics.length).toBe(2);
        });
        it('should return empty array if no topics', async () => {
            await Topic.deleteMany({});
            const mockReq = {};
            await topicController.getTopicsGroupedByCategory(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toEqual([]);
        });
    });
    describe('getRecommendedTopic', () => {
        beforeEach(async () => {
            await Topic.create({
                title: 'Easy Topic',
                category: 'Grammar',
                difficulty: 'easy',
            });
            await Topic.create({
                title: 'Medium Topic',
                category: 'Grammar',
                difficulty: 'medium',
            });
            await Topic.create({
                title: 'Hard Topic',
                category: 'Grammar',
                difficulty: 'hard',
            });
        });
        it('should return 401 if user not authenticated', async () => {
            const mockReq = {
                user: undefined,
            };
            await topicController.getRecommendedTopic(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized',
            });
        });
        it('should recommend easy topic for beginner user', async () => {
            const user = await User.create({
                phoneNumber: '1234567890',
                password: 'testPassword123',
                level: 'beginner',
            });
            const mockReq = {
                user: { id: user._id.toString() },
            };
            await topicController.getRecommendedTopic(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toBeDefined();
            expect(callArg.data.difficulty).toBe('easy');
        });
        it('should recommend medium topic for intermediate user', async () => {
            const user = await User.create({
                phoneNumber: '1111111111',
                password: 'testPassword123',
                level: 'intermediate',
            });
            const mockReq = {
                user: { id: user._id.toString() },
            };
            await topicController.getRecommendedTopic(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toBeDefined();
            expect(callArg.data.difficulty).toBe('medium');
        });
        it('should recommend hard topic for advanced user', async () => {
            const user = await User.create({
                phoneNumber: '2222222222',
                password: 'testPassword123',
                level: 'advanced',
            });
            const mockReq = {
                user: { id: user._id.toString() },
            };
            await topicController.getRecommendedTopic(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toBeDefined();
            expect(callArg.data.difficulty).toBe('hard');
        });
        it('should return 404 if user not found', async () => {
            const mockReq = {
                user: { id: '507f1f77bcf86cd799439011' },
            };
            await topicController.getRecommendedTopic(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User not found',
            });
        });
    });
    describe('getTopicById', () => {
        let testTopic;
        beforeEach(async () => {
            testTopic = await Topic.create({
                title: 'Test Topic',
                category: 'Grammar',
                difficulty: 'easy',
                icon_url: 'https://example.com/icon.png',
            });
        });
        it('should return topic by id', async () => {
            const mockReq = {
                params: { id: testTopic._id.toString() },
            };
            await topicController.getTopicById(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.data).toBeDefined();
            expect(callArg.data._id.toString()).toBe(testTopic._id.toString());
            expect(callArg.data.title).toBe('Test Topic');
            expect(callArg.exercises).toEqual([]);
        });
        it('should return 404 if topic not found', async () => {
            const mockReq = {
                params: { id: '507f1f77bcf86cd799439011' },
            };
            await topicController.getTopicById(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Topic not found',
            });
        });
        it('should include exercises array in response', async () => {
            const mockReq = {
                params: { id: testTopic._id.toString() },
            };
            await topicController.getTopicById(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            expect(callArg.exercises).toBeDefined();
            expect(Array.isArray(callArg.exercises)).toBe(true);
        });
        it('should return all topic details', async () => {
            const mockReq = {
                params: { id: testTopic._id.toString() },
            };
            await topicController.getTopicById(mockReq, mockRes);
            const callArg = mockRes.json.mock.calls[0][0];
            const topic = callArg.data;
            expect(topic.title).toBe('Test Topic');
            expect(topic.category).toBe('Grammar');
            expect(topic.difficulty).toBe('easy');
            expect(topic.icon_url).toBe('https://example.com/icon.png');
        });
    });
});
//# sourceMappingURL=topic.controller.test.js.map