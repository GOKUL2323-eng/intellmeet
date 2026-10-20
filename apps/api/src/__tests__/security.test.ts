import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { config } from '../config/env';
import { MeetingModel } from '../models/Meeting';
import { TaskModel } from '../models/Task';
import { WorkspaceRole, MeetingStatus, AIProcessingStatus } from '@intellmeet/shared';

let app: any;
let mongod: MongoMemoryServer;

describe('IntellMeet Enterprise Security & Regression Test Suite', () => {
  let user1Token: string;
  let user1WorkspaceId: string;
  let user1Id: string;

  let user2Token: string;
  let user2WorkspaceId: string;
  let user2Id: string;

  let user1MeetingId: string;
  let user1TaskId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    app = createApp();

    // Register User 1 & Workspace 1
    const res1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'alice.security@enterprise.com',
        password: 'Password123!',
        fullName: 'Alice Security'
      });
    user1Token = res1.body.accessToken;
    user1WorkspaceId = res1.body.workspace.id;
    user1Id = res1.body.user.id;

    // Register User 2 & Workspace 2 (Different Tenant)
    const res2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'bob.attacker@competitor.com',
        password: 'Password123!',
        fullName: 'Bob Attacker'
      });
    user2Token = res2.body.accessToken;
    user2WorkspaceId = res2.body.workspace.id;
    user2Id = res2.body.user.id;

    // Create a meeting in Workspace 1
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const mRes = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${user1Token}`)
      .set('x-workspace-id', user1WorkspaceId)
      .send({
        title: 'Confidential Executive Roadmap',
        description: 'Classified merger details',
        scheduledStartTime: now.toISOString(),
        scheduledEndTime: end.toISOString(),
        accessSettings: {
          allowGuests: false,
          waitingRoom: true,
          defaultMute: true
        }
      });
    user1MeetingId = mRes.body.meeting.id;

    // Create a task in Workspace 1
    const tRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${user1Token}`)
      .set('x-workspace-id', user1WorkspaceId)
      .send({
        title: 'Prepare Confidential Financials',
        description: 'Q4 financial audit report'
      });
    user1TaskId = tRes.body.task.id;
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('1. Authentication Security & JWT Hardening', () => {
    it('Rejects requests missing Authorization headers on protected routes', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('Rejects malformed or corrupted JWT access tokens', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or malformed');
    });

    it('Rejects tokens signed with wrong secret key', async () => {
      const forgedToken = jwt.sign(
        { userId: user1Id, email: 'alice.security@enterprise.com', role: 'MEMBER' },
        'wrong-attacker-secret-key-that-does-not-match!'
      );
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${forgedToken}`);
      expect(res.status).toBe(401);
    });

    it('Enforces refresh token rotation and revokes used token', async () => {
      // Login to obtain a clean refresh token cookie
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice.security@enterprise.com',
          password: 'Password123!'
        });
      expect(loginRes.status).toBe(200);

      const cookieHeader = loginRes.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader);
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();

      // Replaying the old cookie should trigger token reuse protection and fail
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader);
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error).toContain('Compromised refresh session');
    });

    it('Revokes entire refresh family upon logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alice.security@enterprise.com',
          password: 'Password123!'
        });
      const cookieHeader = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader);
      expect(logoutRes.status).toBe(200);

      // Attempting to refresh with the logged out session must be rejected
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader);
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('2. Multi-Tenant Isolation & BOLA/IDOR Prevention', () => {
    it('Blocks cross-tenant meeting list access via conflicting query parameters', async () => {
      // Bob passes his own workspace in header, but victim workspace in query param
      const res = await request(app)
        .get(`/api/v1/meetings?workspaceId=${user1WorkspaceId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      // Should be rejected with 400 (conflicting workspace ID)
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Conflicting workspace ID');
    });

    it('Blocks cross-tenant direct meeting access (BOLA)', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${user1MeetingId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Meeting not found');
    });

    it('Blocks cross-tenant meeting summary reading (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${user1MeetingId}/summary`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Meeting not found in this workspace');
    });

    it('Blocks cross-tenant meeting chat message retrieval (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${user1MeetingId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Meeting not found in this workspace');
    });

    it('Blocks cross-tenant task retrieval (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Task not found');
    });

    it('Blocks cross-tenant task modification (IDOR)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${user1TaskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId)
        .send({ title: 'Hacked by Bob' });

      expect(res.status).toBe(404);
    });

    it('Prevents cross-tenant task creation by body override', async () => {
      // Bob attempts to create a task inside Alice's workspace
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId)
        .send({
          title: 'Malicious Task Injection',
          workspaceId: user1WorkspaceId
        });

      // Should be rejected due to parameter mismatch
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Conflicting workspace ID');
    });

    it('Blocks cross-tenant analytics data leakage', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/overview?workspaceId=${user1WorkspaceId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Conflicting workspace ID');
    });

    it('Blocks cross-tenant analytics CSV export leakage', async () => {
      const res = await request(app)
        .get(`/api/v1/analytics/export?workspaceId=${user1WorkspaceId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user2WorkspaceId);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Conflicting workspace ID');
    });
  });

  describe('3. Role-Based Access Control & Privilege Escalation Prevention', () => {
    it('Rejects unauthorized non-owners from promoting users to OWNER', async () => {
      // Invite user 2 to workspace 1 as a MEMBER
      const inviteRes = await request(app)
        .post(`/api/v1/workspaces/${user1WorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          email: 'bob.attacker@competitor.com',
          role: WorkspaceRole.MEMBER
        });
      expect(inviteRes.status).toBe(201);

      // User 2 (now MEMBER) attempts to escalate themselves to OWNER
      const escalateRes = await request(app)
        .patch(`/api/v1/workspaces/${user1WorkspaceId}/members/${user2Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({ role: WorkspaceRole.OWNER });

      expect(escalateRes.status).toBe(403);
      expect(escalateRes.body.error).toContain('Forbidden');
    });

    it('Rejects invalid roles with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/v1/workspaces/${user1WorkspaceId}/members/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({ role: 'SUPER_ROOT_ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('4. Injection & ReDoS Defenses', () => {
    it('Safely handles complex regex special characters in search without server crash', async () => {
      const complexRegex = '.*+?^${}()|[]\\\\';
      const res = await request(app)
        .get(`/api/v1/tasks?search=${encodeURIComponent(complexRegex)}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('Safely handles regex characters in meeting search', async () => {
      const regexPayload = '([a-z]+)*';
      const res = await request(app)
        .get(`/api/v1/meetings?search=${encodeURIComponent(regexPayload)}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.meetings)).toBe(true);
    });
  });

  describe('5. AI Processing Safety & Consent Enforcement', () => {
    it('Requires explicit participant consent before processing AI summaries', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${user1MeetingId}/ai/process`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          meetingId: user1MeetingId,
          consentRecorded: false,
          transcriptText: 'Team meeting discussion.'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('Blocks duplicate concurrent AI processing requests', async () => {
      // Set meeting to PROCESSING directly in DB to simulate active background task
      await MeetingModel.updateOne(
        { _id: new mongoose.Types.ObjectId(user1MeetingId) },
        { aiProcessingStatus: AIProcessingStatus.PROCESSING }
      );

      const res = await request(app)
        .post(`/api/v1/meetings/${user1MeetingId}/ai/process`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          meetingId: user1MeetingId,
          consentRecorded: true,
          transcriptText: 'Another discussion.'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already in progress');

      // Reset status back to IDLE
      await MeetingModel.updateOne(
        { _id: new mongoose.Types.ObjectId(user1MeetingId) },
        { aiProcessingStatus: AIProcessingStatus.IDLE }
      );
    });
  });

  describe('6. CORS Policy Enforcement', () => {
    it('Rejects untrusted cross-origin requests', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://malicious-phishing-site.com');

      // Express CORS returns 500 / error message when origin callback returns error
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('CORS');
    });

    it('Allows trusted origins defined in CORS_ORIGINS', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
