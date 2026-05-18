import '../setup';
import User from '../../src/models/user.model';
describe('User Model', () => {
    describe('User Creation', () => {
        it('should create a user with valid data', async () => {
            const userData = {
                phoneNumber: '1234567890',
                password: 'testPassword123',
                email: 'test@example.com',
            };
            const user = await User.create(userData);
            expect(user.phoneNumber).toBe('1234567890');
            expect(user.email).toBe('test@example.com');
            expect(user.level).toBe('beginner');
            expect(user.role).toBe('user');
            expect(user.is_premium).toBe(false);
            expect(user.notifications_enabled).toBe(true);
            expect(user.dark_mode).toBe(false);
            expect(user.streak_days).toBe(0);
            expect(user.daily_goal_minutes).toBe(10);
        });
        it('should hash password before saving', async () => {
            const userData = {
                phoneNumber: '9876543210',
                password: 'plainPassword123',
            };
            const user = await User.create(userData);
            expect(user.password).not.toBe('plainPassword123');
        });
        it('should have unique phoneNumber', async () => {
            const userData = {
                phoneNumber: '5555555555',
                password: 'testPassword123',
            };
            await User.create(userData);
            await expect(User.create(userData)).rejects.toThrow();
        });
        it('should trim phoneNumber and email', async () => {
            const userData = {
                phoneNumber: '  1111111111  ',
                email: '  TEST@EXAMPLE.COM  ',
                password: 'testPassword123',
            };
            const user = await User.create(userData);
            expect(user.phoneNumber).toBe('1111111111');
            expect(user.email).toBe('test@example.com');
        });
        it('should require phoneNumber and password', async () => {
            const userData = {
                email: 'test@example.com',
            };
            await expect(User.create(userData)).rejects.toThrow();
        });
    });
    describe('comparePassword', () => {
        let user;
        beforeEach(async () => {
            user = await User.create({
                phoneNumber: '1234567890',
                password: 'correctPassword123',
            });
        });
        it('should return true for correct password', async () => {
            const isMatch = await user.comparePassword('correctPassword123');
            expect(isMatch).toBe(true);
        });
        it('should return false for incorrect password', async () => {
            const isMatch = await user.comparePassword('wrongPassword');
            expect(isMatch).toBe(false);
        });
    });
    describe('User Defaults', () => {
        it('should set default values correctly', async () => {
            const user = await User.create({
                phoneNumber: '1234567890',
                password: 'testPassword123',
            });
            expect(user.level).toBe('beginner');
            expect(user.role).toBe('user');
            expect(user.is_premium).toBe(false);
            expect(user.notifications_enabled).toBe(true);
            expect(user.dark_mode).toBe(false);
            expect(user.streak_days).toBe(0);
            expect(user.daily_goal_minutes).toBe(10);
        });
    });
    describe('User Validation', () => {
        it('should validate level enum', async () => {
            const userData = {
                phoneNumber: '1234567890',
                password: 'testPassword123',
                level: 'invalid_level',
            };
            await expect(User.create(userData)).rejects.toThrow();
        });
        it('should validate role enum', async () => {
            const userData = {
                phoneNumber: '1234567890',
                password: 'testPassword123',
                role: 'superuser',
            };
            await expect(User.create(userData)).rejects.toThrow();
        });
    });
    describe('User Updates', () => {
        let user;
        beforeEach(async () => {
            user = await User.create({
                phoneNumber: '1234567890',
                password: 'testPassword123',
            });
        });
        it('should update user profile', async () => {
            const updated = await User.findByIdAndUpdate(user._id, {
                $set: {
                    native_language: 'English',
                    daily_goal_minutes: 30,
                    dark_mode: true,
                },
            }, { new: true });
            expect(updated.native_language).toBe('English');
            expect(updated.daily_goal_minutes).toBe(30);
            expect(updated.dark_mode).toBe(true);
        });
        it('should not modify password when updating other fields', async () => {
            const originalPassword = user.password;
            await User.findByIdAndUpdate(user._id, {
                $set: {
                    native_language: 'Spanish',
                },
            }, { new: true });
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.password).toBe(originalPassword);
        });
    });
});
//# sourceMappingURL=user.model.test.js.map