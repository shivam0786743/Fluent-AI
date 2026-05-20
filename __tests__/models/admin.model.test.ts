import '../setup';
import Admin from '../../src/models/admin.model';

describe('Admin Model', () => {
  describe('Admin Creation', () => {
    it('should create an admin with valid data', async () => {
      const adminData = {
        phoneNumber: '1234567890',
        password: 'adminPassword123',
        name: 'Test Admin',
      };

      const admin = await Admin.create(adminData);

      expect(admin.phoneNumber).toBe('1234567890');
      expect(admin.name).toBe('Test Admin');
    });

    it('should hash password before saving', async () => {
      const adminData = {
        phoneNumber: '1234567891',
        password: 'plainPassword123',
      };

      const admin = await Admin.create(adminData);

      expect(admin.password).not.toBe('plainPassword123');
    });

    it('should have unique phoneNumber', async () => {
      const adminData = {
        phoneNumber: '1234567892',
        password: 'adminPassword123',
      };

      await Admin.create(adminData);

      await expect(Admin.create(adminData)).rejects.toThrow();
    });

    it('should trim phoneNumber', async () => {
      const adminData = {
        phoneNumber: '  1234567893  ',
        password: 'adminPassword123',
      };

      const admin = await Admin.create(adminData);

      expect(admin.phoneNumber).toBe('1234567893');
    });

    it('should require phoneNumber and password', async () => {
      const adminData = {
        name: 'No Phone Admin',
      };

      await expect(Admin.create(adminData)).rejects.toThrow();
    });
  });

  describe('comparePassword', () => {
    let admin: any;

    beforeEach(async () => {
      admin = await Admin.create({
        phoneNumber: '1234567894',
        password: 'correctPassword123',
      });
    });

    it('should return true for correct password', async () => {
      const isMatch = await admin.comparePassword('correctPassword123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isMatch = await admin.comparePassword('wrongPassword');
      expect(isMatch).toBe(false);
    });
  });
});
