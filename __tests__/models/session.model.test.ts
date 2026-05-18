import '../setup';
import Session from '../../src/models/session.model';
import User from '../../src/models/user.model';
import Topic from '../../src/models/topic.model';

describe('Session Model', () => {
  let userId: string;
  let topicId: string;

  beforeEach(async () => {
    const user = await User.create({
      phoneNumber: '1234567890',
      password: 'testPassword123',
    });
    userId = user._id.toString();

    const topic = await Topic.create({
      title: 'Basic Grammar',
      category: 'Grammar',
      difficulty: 'easy',
    });
    topicId = topic._id.toString();
  });

  describe('Session Creation', () => {
    it('should create a session with valid data', async () => {
      const sessionData = {
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      };

      const session = await Session.create(sessionData);

      expect(session.topic_id.toString()).toBe(topicId);
      expect(session.user_id.toString()).toBe(userId);
      expect(session.mode).toBe('vocabulary');
      expect(session.status).toBe('in_progress');
    });

    it('should require topic_id, user_id, and mode', async () => {
      const invalidData = {
        user_id: userId,
        mode: 'vocabulary',
      };

      await expect(Session.create(invalidData)).rejects.toThrow();
    });
  });

  describe('Session Modes', () => {
    const modes = ['vocabulary', 'reading', 'speaking', 'interview'];

    modes.forEach((mode) => {
      it(`should accept ${mode} mode`, async () => {
        const session = await Session.create({
          topic_id: topicId,
          user_id: userId,
          mode,
        });

        expect(session.mode).toBe(mode);
      });
    });

    it('should reject invalid mode', async () => {
      const sessionData = {
        topic_id: topicId,
        user_id: userId,
        mode: 'invalid_mode',
      };

      await expect(Session.create(sessionData)).rejects.toThrow();
    });
  });

  describe('Session Status', () => {
    it('should default to in_progress status', async () => {
      const session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      });

      expect(session.status).toBe('in_progress');
    });

    it('should allow completed status', async () => {
      let session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      });

      session.status = 'completed';
      session = await session.save();

      expect(session.status).toBe('completed');
    });

    it('should reject invalid status', async () => {
      const session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      });

      session.status = 'invalid_status' as any;

      await expect(session.save()).rejects.toThrow();
    });
  });

  describe('Session Scores', () => {
    it('should store scores with valid range', async () => {
      const session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
        grammar_score: 85,
        vocabulary_score: 90,
        pronunciation_score: 80,
        fluency_score: 88,
        duration_minutes: 30,
      });

      expect(session.grammar_score).toBe(85);
      expect(session.vocabulary_score).toBe(90);
      expect(session.pronunciation_score).toBe(80);
      expect(session.fluency_score).toBe(88);
      expect(session.duration_minutes).toBe(30);
    });

    it('should reject scores outside 0-100 range', async () => {
      const sessionData = {
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
        grammar_score: 150,
      };

      await expect(Session.create(sessionData)).rejects.toThrow();
    });

    it('should allow negative values for scores outside range', async () => {
      const sessionData = {
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
        grammar_score: -10,
      };

      await expect(Session.create(sessionData)).rejects.toThrow();
    });
  });

  describe('Session Population', () => {
    it('should populate topic and user references', async () => {
      const session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      });

      const populatedSession = await Session.findById(session._id)
        .populate('topic_id')
        .populate('user_id');

      expect(populatedSession?.topic_id).toBeDefined();
      expect((populatedSession?.topic_id as any)?.title).toBe('Basic Grammar');
      expect((populatedSession?.user_id as any)?.phoneNumber).toBe(
        '1234567890'
      );
    });
  });

  describe('Session Timestamps', () => {
    it('should have createdAt and updatedAt timestamps', async () => {
      const session = await Session.create({
        topic_id: topicId,
        user_id: userId,
        mode: 'vocabulary',
      });

      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
      expect(session.createdAt instanceof Date).toBe(true);
      expect(session.updatedAt instanceof Date).toBe(true);
    });
  });
});
