import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';

let app: any;
let mongod: MongoMemoryServer;

describe('IntellMeet Full Stack API & Security Test Suite', () => {
  let authToken: string;
  let workspaceId: string;
  let otherAuthToken: string;
  let otherWorkspaceId: string;
  let meetingId: string;
  let taskId: string;

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

  describe('1. Health Check Endpoint', () => {
    it('GET /api/v1/health returns healthy system status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('intellmeet-api');
    });
  });

  describe('2. Authentication & Refresh Token Rotation', () => {
    it('POST /api/v1/auth/register registers user and auto-creates workspace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alex.chen@intellmeet.com',
          password: 'Password123!',
          fullName: 'Alex Chen'
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('alex.chen@intellmeet.com');
      expect(res.body.workspace).toBeDefined();

      authToken = res.body.accessToken;
      workspaceId = res.body.workspace.id;
    });

    it('POST /api/v1/auth/login validates credentials and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex.chen@intellmeet.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      authToken = res.body.accessToken;
    });

    it('POST /api/v1/auth/login rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alex.chen@intellmeet.com',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('3. Multi-Tenant Workspace Isolation Enforcement', () => {
    it('Creates a second isolated tenant user & workspace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'sarah.jenkins@othercorp.com',
          password: 'Password123!',
          fullName: 'Sarah Jenkins'
        });

      expect(res.status).toBe(201);
      otherAuthToken = res.body.accessToken;
      otherWorkspaceId = res.body.workspace.id;
      expect(otherWorkspaceId).not.toBe(workspaceId);
    });

    it('Tenant 2 cannot read Tenant 1 private meeting list', async () => {
      const res = await request(app)
        .get('/api/v1/meetings')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .set('x-workspace-id', workspaceId); // Attempting to read Tenant 1 workspace

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });

  describe('4. Meetings Lifecycle & AI Intelligence', () => {
    it('POST /api/v1/meetings schedules a new meeting', async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 45 * 60 * 1000);

      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          title: 'Sprint 24 Architecture Review',
          description: 'WebRTC mesh and AI pipeline evaluation',
          workspaceId,
          scheduledStartTime: now.toISOString(),
          scheduledEndTime: end.toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.meeting.meetingCode).toBeDefined();
      meetingId = res.body.meeting.id;
    });

    it('POST /api/v1/meetings/:id/ai/process extracts structured summary & action items', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/ai/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          meetingId,
          workspaceId,
          consentRecorded: true,
          transcriptText: 'Alex: We agreed to deploy coturn TURN servers. Elena: I will configure the credentials by Friday.'
        });

      expect(res.status).toBe(200);
      expect(res.body.summary.overview).toBeDefined();
      expect(res.body.summary.decisions.length).toBeGreaterThan(0);
      expect(res.body.actionItems.length).toBeGreaterThan(0);
    });

    it('Requires explicit user consent before processing meeting intelligence', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/ai/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          meetingId,
          workspaceId,
          consentRecorded: false // Consent missing
        });

      expect(res.status).toBe(400);
    });
  });

  describe('5. Tasks & Kanban Management', () => {
    it('POST /api/v1/tasks creates a task', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          title: 'Deploy Coturn TURN Server',
          description: 'Required for symmetric NAT peer traversal',
          workspaceId,
          priority: 'HIGH',
          status: 'TODO'
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('Deploy Coturn TURN Server');
      taskId = res.body.task.id;
    });

    it('PATCH /api/v1/tasks/:id updates status (moving across Kanban board)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          status: 'DONE'
        });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('DONE');
    });
  });

  describe('6. Analytics Overview', () => {
    it('GET /api/v1/analytics/overview returns aggregated metrics', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.overview.totalMeetings).toBeGreaterThanOrEqual(1);
      expect(res.body.overview.totalTasks).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/analytics/export returns CSV data stream', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('INTELLMEET WORKSPACE EXPORT');
    });
  });
});
