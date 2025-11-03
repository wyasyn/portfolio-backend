import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { Role } from '@prisma/client';

describe('Auth API', () => {
  let testUserId: string;
  let testUserToken: string;
  let adminUserId: string;
  let adminToken: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'test@example.com',
            'admin@example.com',
            'banned@example.com',
            'inactive@example.com',
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'test@example.com',
            'admin@example.com',
            'banned@example.com',
            'inactive@example.com',
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with default USER role', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.role).toBe('USER');
      expect(response.body.data.isActive).toBe(true);

      testUserId = response.body.data.id;
    });

    it('should fail with invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: 'testpassword123',
        name: 'Invalid User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'short@example.com',
        password: 'short',
        name: 'Short Password User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Duplicate User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and return user with all attributes', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.role).toBe('USER');
      expect(response.body.data.user.isActive).toBe(true);
      expect(response.body.data.user.banned).toBe(false);

      // Store session token for authenticated requests
      testUserToken = response.body.data.session.token;
    });

    it('should fail with invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'testpassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail when user is banned', async () => {
      // Create a banned user
      const bannedUser = await request(app).post('/api/v1/auth/register').send({
        email: 'banned@example.com',
        password: 'testpassword123',
        name: 'Banned User',
      });

      await prisma.user.update({
        where: { id: bannedUser.body.data.id },
        data: { banned: true, banReason: 'Test ban' },
      });

      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'banned@example.com',
        password: 'testpassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail when user is inactive', async () => {
      // Create an inactive user
      const inactiveUser = await request(app).post('/api/v1/auth/register').send({
        email: 'inactive@example.com',
        password: 'testpassword123',
        name: 'Inactive User',
      });

      await prisma.user.update({
        where: { id: inactiveUser.body.data.id },
        data: { isActive: false },
      });

      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'inactive@example.com',
        password: 'testpassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile with all attributes', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.role).toBe('USER');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.banned).toBe(false);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authentication token', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should fail without authentication token', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Admin User Tests', () => {
    beforeAll(async () => {
      // Create an admin user
      const adminResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'admin@example.com',
        password: 'adminpassword123',
        name: 'Admin User',
      });

      adminUserId = adminResponse.body.data.id;

      // Update user to admin role
      await prisma.user.update({
        where: { id: adminUserId },
        data: { role: Role.ADMIN },
      });

      // Login as admin
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@example.com',
        password: 'adminpassword123',
      });

      adminToken = loginResponse.body.data.session.token;
    });

    it('should have admin role', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('ADMIN');
    });
  });

  describe('User Attributes Tests', () => {
    it('should update lastLoginAt on login', async () => {
      // Login again
      await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'testpassword123',
      });

      // Check lastLoginAt was updated
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { lastLoginAt: true },
      });

      expect(user?.lastLoginAt).not.toBeNull();
    });

    it('should automatically unban user when ban expires', async () => {
      // Create a user with expired ban
      const expiredBanUser = await request(app).post('/api/v1/auth/register').send({
        email: 'expiredban@example.com',
        password: 'testpassword123',
        name: 'Expired Ban User',
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.user.update({
        where: { id: expiredBanUser.body.data.id },
        data: {
          banned: true,
          banReason: 'Test ban',
          banExpires: yesterday,
        },
      });

      // Login should unban the user
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'expiredban@example.com',
        password: 'testpassword123',
      });

      // Get the user token and check status
      const token = loginResponse.body.data.session.token;
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.data.banned).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: expiredBanUser.body.data.id } });
    });
  });
});
