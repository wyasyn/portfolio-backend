import request from 'supertest';
import app from '../index';
import { prisma } from '../db/prisma';
import { Role } from '@prisma/client';

describe('Admin API', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admintest@example.com', 'usertest@example.com', 'targetuser@example.com'],
        },
      },
    });

    // Create admin user
    const adminResponse = await request(app).post('/api/v1/auth/register').send({
      email: 'admintest@example.com',
      password: 'adminpassword123',
      name: 'Admin Test User',
    });

    adminUserId = adminResponse.body.data.id;

    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: Role.ADMIN },
    });

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admintest@example.com',
      password: 'adminpassword123',
    });

    adminToken = adminLogin.body.data.session.token;

    // Create regular user
    const userResponse = await request(app).post('/api/v1/auth/register').send({
      email: 'usertest@example.com',
      password: 'userpassword123',
      name: 'User Test User',
    });

    testUserId = userResponse.body.data.id;

    const userLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'usertest@example.com',
      password: 'userpassword123',
    });

    userToken = userLogin.body.data.session.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admintest@example.com', 'usertest@example.com', 'targetuser@example.com'],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/admin/users', () => {
    it('should list all users when authenticated as admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?role=ADMIN')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user: any) => user.role === 'ADMIN')).toBe(true);
    });

    it('should filter by isActive', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user: any) => user.isActive === true)).toBe(true);
    });

    it('should filter by banned status', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?banned=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((user: any) => user.banned === false)).toBe(true);
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app).get('/api/v1/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('should get user by ID when authenticated as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe('usertest@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/admin/users/:userId/role', () => {
    it('should update user role when authenticated as admin', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('ADMIN');

      // Revert back to USER
      await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' });
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent demoting yourself', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${adminUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:userId/ban', () => {
    let targetUserId: string;

    beforeAll(async () => {
      // Create a target user to ban
      const targetResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'targetuser@example.com',
        password: 'targetpassword123',
        name: 'Target User',
      });
      targetUserId = targetResponse.body.data.id;
    });

    it('should ban user when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${targetUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Test ban reason',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.banned).toBe(true);
      expect(response.body.data.banReason).toBe('Test ban reason');
    });

    it('should ban user with expiration date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post(`/api/v1/admin/users/${targetUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Temporary ban',
          expiresAt: tomorrow.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.banned).toBe(true);
      expect(response.body.data.banExpires).toBeTruthy();
    });

    it('should prevent banning yourself', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${adminUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Self ban attempt',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${targetUserId}/ban`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Unauthorized ban attempt',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:userId/unban', () => {
    let bannedUserId: string;

    beforeAll(async () => {
      // Get the target user that was banned in previous tests
      const user = await prisma.user.findUnique({
        where: { email: 'targetuser@example.com' },
      });
      bannedUserId = user!.id;
    });

    it('should unban user when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${bannedUserId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.banned).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${bannedUserId}/unban`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:userId/deactivate', () => {
    it('should deactivate user when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should prevent deactivating yourself', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${adminUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${testUserId}/deactivate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/users/:userId/activate', () => {
    it('should activate user when authenticated as admin', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should fail when authenticated as regular user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${testUserId}/activate`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});
