import '../setup';
import Topic from '../../src/models/topic.model';
describe('Topic Model', () => {
    describe('Topic Creation', () => {
        it('should create a topic with valid data', async () => {
            const topicData = {
                title: 'Present Tense',
                category: 'Grammar',
                difficulty: 'easy',
                is_premium: false,
                icon_url: 'https://example.com/icon.png',
            };
            const topic = await Topic.create(topicData);
            expect(topic.title).toBe('Present Tense');
            expect(topic.category).toBe('Grammar');
            expect(topic.difficulty).toBe('easy');
            expect(topic.is_premium).toBe(false);
            expect(topic.icon_url).toBe('https://example.com/icon.png');
        });
        it('should require title, category, and difficulty', async () => {
            const invalidData = {
                title: 'Grammar Topic',
                category: 'Grammar',
            };
            await expect(Topic.create(invalidData)).rejects.toThrow();
        });
        it('should trim whitespace from title and category', async () => {
            const topicData = {
                title: '  Present Tense  ',
                category: '  Grammar  ',
                difficulty: 'easy',
            };
            const topic = await Topic.create(topicData);
            expect(topic.title).toBe('Present Tense');
            expect(topic.category).toBe('Grammar');
        });
    });
    describe('Topic Difficulty', () => {
        const difficulties = ['easy', 'medium', 'hard'];
        difficulties.forEach((difficulty) => {
            it(`should accept ${difficulty} difficulty`, async () => {
                const topic = await Topic.create({
                    title: 'Test Topic',
                    category: 'Grammar',
                    difficulty,
                });
                expect(topic.difficulty).toBe(difficulty);
            });
        });
        it('should reject invalid difficulty', async () => {
            const topicData = {
                title: 'Test Topic',
                category: 'Grammar',
                difficulty: 'ultra-hard',
            };
            await expect(Topic.create(topicData)).rejects.toThrow();
        });
    });
    describe('Topic Defaults', () => {
        it('should default is_premium to false', async () => {
            const topic = await Topic.create({
                title: 'Free Topic',
                category: 'Vocabulary',
                difficulty: 'medium',
            });
            expect(topic.is_premium).toBe(false);
        });
        it('should allow is_premium to be true', async () => {
            const topic = await Topic.create({
                title: 'Premium Topic',
                category: 'Grammar',
                difficulty: 'hard',
                is_premium: true,
            });
            expect(topic.is_premium).toBe(true);
        });
    });
    describe('Topic Categories', () => {
        it('should create topics with different categories', async () => {
            const categories = ['Grammar', 'Vocabulary', 'Pronunciation', 'Reading'];
            for (const category of categories) {
                const topic = await Topic.create({
                    title: `Test ${category}`,
                    category,
                    difficulty: 'easy',
                });
                expect(topic.category).toBe(category);
            }
        });
    });
    describe('Topic Queries', () => {
        beforeEach(async () => {
            await Topic.create({
                title: 'Easy Grammar',
                category: 'Grammar',
                difficulty: 'easy',
            });
            await Topic.create({
                title: 'Medium Grammar',
                category: 'Grammar',
                difficulty: 'medium',
            });
            await Topic.create({
                title: 'Easy Vocabulary',
                category: 'Vocabulary',
                difficulty: 'easy',
            });
            await Topic.create({
                title: 'Premium Hard Grammar',
                category: 'Grammar',
                difficulty: 'hard',
                is_premium: true,
            });
        });
        it('should find topics by difficulty', async () => {
            const easyTopics = await Topic.find({ difficulty: 'easy' });
            expect(easyTopics.length).toBe(2);
            expect(easyTopics.every((t) => t.difficulty === 'easy')).toBe(true);
        });
        it('should find topics by category', async () => {
            const grammarTopics = await Topic.find({ category: 'Grammar' });
            expect(grammarTopics.length).toBe(3);
            expect(grammarTopics.every((t) => t.category === 'Grammar')).toBe(true);
        });
        it('should find premium topics', async () => {
            const premiumTopics = await Topic.find({ is_premium: true });
            expect(premiumTopics.length).toBe(1);
            expect(premiumTopics[0].title).toBe('Premium Hard Grammar');
        });
        it('should find topics with combined filters', async () => {
            const topics = await Topic.find({
                category: 'Grammar',
                difficulty: 'easy',
            });
            expect(topics.length).toBe(1);
            expect(topics[0].title).toBe('Easy Grammar');
        });
    });
    describe('Topic Updates', () => {
        let topic;
        beforeEach(async () => {
            topic = await Topic.create({
                title: 'Original Title',
                category: 'Grammar',
                difficulty: 'easy',
            });
        });
        it('should update topic fields', async () => {
            const updated = await Topic.findByIdAndUpdate(topic._id, {
                title: 'Updated Title',
                is_premium: true,
            }, { new: true });
            expect(updated.title).toBe('Updated Title');
            expect(updated.is_premium).toBe(true);
            expect(updated.category).toBe('Grammar');
        });
    });
    describe('Topic Timestamps', () => {
        it('should have createdAt and updatedAt timestamps', async () => {
            const topic = await Topic.create({
                title: 'Test Topic',
                category: 'Grammar',
                difficulty: 'easy',
            });
            expect(topic.createdAt).toBeDefined();
            expect(topic.updatedAt).toBeDefined();
            expect(topic.createdAt instanceof Date).toBe(true);
            expect(topic.updatedAt instanceof Date).toBe(true);
        });
    });
});
//# sourceMappingURL=topic.model.test.js.map