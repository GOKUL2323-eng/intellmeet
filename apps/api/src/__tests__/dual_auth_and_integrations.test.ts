import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { UserModel } from '../models/User';

let app: any;
let mongod: MongoMemoryServer;

describe('Dual Authentication & Integration Test Suite', () => {
  let authToken: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    app = createApp();
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('1. Google Authentication & Account Linking', () => {
    const testGoogleSub = 'google-sub-123456789';
    const testGoogleEmail = 'google.user@example.com';
    const testCredential = `test-token:${testGoogleSub}:${testGoogleEmail}:Google User`;

    it('POST /api/v1/auth/google creates a new user and auto-provisions workspace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: testCredential });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testGoogleEmail);
      expect(res.body.user.fullName).toBe('Google User');
      expect(res.body.user.authProvider).toBe('google');
      expect(res.body.workspace).toBeDefined();

      authToken = res.body.accessToken;
      const initialUserId = res.body.user.id;

      // Verify persistent single identity on subsequent Google login
      const subsequentRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: testCredential });

      expect(subsequentRes.status).toBe(200);
      expect(subsequentRes.body.user.id).toBe(initialUserId);

      // Verify database count is exactly 1 user
      const users = await UserModel.find({ email: testGoogleEmail });
      expect(users.length).toBe(1);
    });

    it('denies password login for accounts created exclusively via Google OAuth', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testGoogleEmail,
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Google Sign-In/i);
    });

    it('securely links Google identity to an existing email/password account', async () => {
      // 1. Create email/password user
      const standardEmail = 'john.doe@company.com';
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: standardEmail,
          password: 'SecurePassword123!',
          fullName: 'John Doe'
        });

      expect(registerRes.status).toBe(201);
      const originalUserId = registerRes.body.user.id;
      const originalWorkspaceId = registerRes.body.workspace.id;

      // 2. Perform Google Sign-In with the matching email
      const linkedCredential = `test-token:google-sub-john-999:${standardEmail}:John Doe Linked`;
      const googleLinkRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: linkedCredential });

      expect(googleLinkRes.status).toBe(200);
      expect(googleLinkRes.body.user.id).toBe(originalUserId);
      expect(googleLinkRes.body.workspace.id).toBe(originalWorkspaceId);

      // Verify user record in DB now has googleId and authProvider updated
      const dbUser = await UserModel.findById(originalUserId);
      expect(dbUser?.googleId).toBe('google-sub-john-999');
      expect(dbUser?.authProvider).toBe('both');

      // Verify user can STILL login via email/password
      const emailLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: standardEmail,
          password: 'SecurePassword123!'
        });
      expect(emailLoginRes.status).toBe(200);
      expect(emailLoginRes.body.user.id).toBe(originalUserId);
    });

    it('rejects invalid or empty Google credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('2. WebRTC ICE Servers Configuration Endpoint', () => {
    it('GET /api/v1/meetings/ice-servers returns STUN/TURN server configuration', async () => {
      const res = await request(app)
        .get('/api/v1/meetings/ice-servers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.iceServers).toBeDefined();
      expect(Array.isArray(res.body.iceServers)).toBe(true);
      expect(res.body.iceServers.length).toBeGreaterThan(0);
      expect(res.body.iceServers[0].urls).toBeDefined();
    });

    it('allows guest users to fetch ice-servers for meeting lobbies without auth token', async () => {
      const res = await request(app).get('/api/v1/meetings/ice-servers');
      expect(res.status).toBe(200);
      expect(res.body.iceServers).toBeDefined();
    });
  });

  describe('3. Google Meet Integration Endpoints', () => {
    it('GET /api/v1/integrations/google/status returns connection status', async () => {
      const res = await request(app)
        .get('/api/v1/integrations/google/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.configured).toBeDefined();
    });

    it('POST /api/v1/meetings/google-meet validates title and parameters', async () => {
      const res = await request(app)
        .post('/api/v1/meetings/google-meet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/meetings/google-meet reports unconfigured or unconnected account properly', async () => {
      const res = await request(app)
        .post('/api/v1/meetings/google-meet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Team Sync via Google Meet',
          scheduledStartTime: new Date(Date.now() + 3600000).toISOString()
        });

      // Should return 400 with a clear message that Google account is not connected or credentials not configured
      expect([400, 500]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });
  });
});
