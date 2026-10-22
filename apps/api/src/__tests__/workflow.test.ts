import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { MeetingParticipantModel } from '../models/MeetingParticipant';
import { TaskModel } from '../models/Task';
import { ActionItemModel } from '../models/ActionItem';
import { NotificationModel } from '../models/Notification';
import { ChatMessageModel } from '../models/ChatMessage';
import { MeetingModel } from '../models/Meeting';
import { TaskService } from '../services/task.service';
import { NotificationService } from '../services/notification.service';
import { NotificationType, ParticipantRole } from '@intellmeet/shared';

let app: any;
let mongod: MongoMemoryServer;

describe('Complete Database Lifecycle & Security Workflow Tests', () => {
  let user1Token: string;
  let user1Id: string;
  let user1WorkspaceId: string;

  let user2Token: string;
  let user2Id: string;
  let user2WorkspaceId: string;

  let meetingId: string;
  let privateMeetingId: string;
  let actionItemId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    app = createApp();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('A & B. User Registration, Login & Session Lifecycle', () => {
    it('Registers User 1 and automatically creates personal workspace with OWNER role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice.founder@testcorp.com',
          password: 'Password123!',
          fullName: 'Alice Founder'
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.workspace.role).toBe('OWNER');

      user1Token = res.body.accessToken;
      user1Id = res.body.user.id;
      user1WorkspaceId = res.body.workspace.id;
    });

    it('Registers User 2 in a separate tenant workspace', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'bob.external@othercorp.com',
          password: 'Password123!',
          fullName: 'Bob External'
        });

      expect(res.status).toBe(201);
      user2Token = res.body.accessToken;
      user2Id = res.body.user.id;
      user2WorkspaceId = res.body.workspace.id;
      expect(user2WorkspaceId).not.toBe(user1WorkspaceId);
    });

    it('Prevents duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'alice.founder@testcorp.com',
          password: 'Password123!',
          fullName: 'Alice Founder Duplicate'
        });

      expect(res.status).toBe(409);
    });
  });

  describe('C. Meeting Creation & Initial Host Participant Record', () => {
    it('Creates a meeting and automatically persists initial host participant record', async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          title: 'Q4 Product Roadmap Sync',
          description: 'Strategic review of upcoming platform features',
          scheduledStartTime: now.toISOString(),
          scheduledEndTime: end.toISOString(),
          accessSettings: {
            allowGuests: true,
            waitingRoom: false,
            defaultMute: false
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.meeting.meetingCode).toBeDefined();
      meetingId = res.body.meeting.id;

      // Verify database record has initial host participant
      const hostParticipant = await MeetingParticipantModel.findOne({
        meetingId: new mongoose.Types.ObjectId(meetingId),
        userId: new mongoose.Types.ObjectId(user1Id)
      });

      expect(hostParticipant).toBeDefined();
      expect(hostParticipant?.role).toBe(ParticipantRole.HOST);
      expect(hostParticipant?.joinedAt).toBeDefined();
    });

    it('Creates a private meeting with allowGuests: false', async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          title: 'Confidential Board Meeting',
          scheduledStartTime: now.toISOString(),
          scheduledEndTime: end.toISOString(),
          accessSettings: {
            allowGuests: false,
            waitingRoom: false
          }
        });

      expect(res.status).toBe(201);
      privateMeetingId = res.body.meeting.id;
    });
  });

  describe('D. Participant Joining & Cross-Workspace Data Isolation', () => {
    it('Blocks external tenant (User 2) from joining private meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${privateMeetingId}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('Blocks unauthenticated guests from joining private meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${privateMeetingId}/join`)
        .send({ guestName: 'Anonymous Intruder' });

      expect(res.status).toBe(403);
    });

    it('Allows public/guest lobby info retrieval for public meeting', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}/lobby`);

      expect(res.status).toBe(200);
      expect(res.body.meeting.title).toBe('Q4 Product Roadmap Sync');
      expect(res.body.meeting.accessSettings.allowGuests).toBe(true);
      expect(res.body.meeting.host.fullName).toBe('Alice Founder');
    });

    it('Blocks unauthenticated lobby info for private meeting', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${privateMeetingId}/lobby`);

      expect(res.status).toBe(403);
    });

    it('Host joins meeting and updates participant record without duplication on refresh', async () => {
      const initialCount = await MeetingParticipantModel.countDocuments({ meetingId });

      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.isHost).toBe(true);

      const afterCount = await MeetingParticipantModel.countDocuments({ meetingId });
      expect(afterCount).toBe(initialCount); // Reused existing host participant record
    });
  });

  describe('F. Chat Workflow & Duplicate Message Prevention (Idempotency)', () => {
    it('Persists chat message and returns message document', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          meetingId,
          workspaceId: user1WorkspaceId,
          message: 'Hello team, let us review the sprint deliverables.',
          clientMessageId: 'msg-client-uuid-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.message.message).toBe('Hello team, let us review the sprint deliverables.');
    });

    it('Prevents duplicate message creation on network retry with identical clientMessageId', async () => {
      const countBefore = await ChatMessageModel.countDocuments({ meetingId });

      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          meetingId,
          workspaceId: user1WorkspaceId,
          message: 'Hello team, let us review the sprint deliverables.',
          clientMessageId: 'msg-client-uuid-001' // Retried request
        });

      expect(res.status).toBe(201);
      const countAfter = await ChatMessageModel.countDocuments({ meetingId });
      expect(countAfter).toBe(countBefore); // No duplicate message created!
    });

    it('Loads chat history with pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}/messages?page=1&limit=10`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('G & H. Task Assignment, Workspace Validation & Idempotency', () => {
    it('Rejects task assignment if assignee is not a member of the workspace', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          title: 'Configure Production Load Balancer',
          workspaceId: user1WorkspaceId,
          assigneeId: user2Id // User 2 is in a different workspace!
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Assignee is not an active member');
    });

    it('Creates task assigned to workspace member and dispatches notification', async () => {
      // Add User 2 to User 1's workspace first
      await request(app)
        .post(`/api/v1/workspaces/${user1WorkspaceId}/invitations`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          email: 'bob.external@othercorp.com',
          role: 'MEMBER'
        });

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId)
        .send({
          title: 'Review Coturn Firewall Rules',
          workspaceId: user1WorkspaceId,
          assigneeId: user2Id,
          priority: 'HIGH',
          status: 'TODO'
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('Review Coturn Firewall Rules');

      // Verify notification was persisted for User 2
      const notif = await NotificationModel.findOne({
        userId: new mongoose.Types.ObjectId(user2Id),
        type: NotificationType.TASK_ASSIGNED
      });
      expect(notif).toBeDefined();
      expect(notif?.isRead).toBe(false);
    });

    it('Converts action item to task idempotently without generating duplicates on retry', async () => {
      // Create mock action item from AI extraction
      const actionItem = await ActionItemModel.create({
        meetingId: new mongoose.Types.ObjectId(meetingId),
        workspaceId: new mongoose.Types.ObjectId(user1WorkspaceId),
        title: 'Draft API Security Whitepaper',
        description: 'Document zero-trust token exchange and session revocation',
        priority: 'MEDIUM',
        status: 'PROPOSED'
      });
      actionItemId = actionItem._id.toString();

      // First conversion
      const res1 = await TaskService.convertActionItemToTask(
        actionItemId,
        user1WorkspaceId,
        user1Id
      );
      expect(res1.task).toBeDefined();
      expect(res1.actionItem.status).toBe('CONVERTED');

      const taskCount1 = await TaskModel.countDocuments({ actionItemId });
      expect(taskCount1).toBe(1);

      // Second conversion (retry/double-click)
      const res2 = await TaskService.convertActionItemToTask(
        actionItemId,
        user1WorkspaceId,
        user1Id
      );
      expect(res2.task._id.toString()).toBe(res1.task._id.toString());

      const taskCount2 = await TaskModel.countDocuments({ actionItemId });
      expect(taskCount2).toBe(1); // Idempotent! Still 1 task
    });

    it('Notification deduplication prevents duplicate notifications on retry', async () => {
      const notif1 = await NotificationService.createNotification({
        userId: user1Id,
        workspaceId: user1WorkspaceId,
        title: 'Daily Meeting Reminder',
        message: 'Standup starts in 10 minutes',
        type: NotificationType.MEETING_STARTING,
        link: `/meetings/${meetingId}`,
        dedupKey: `reminder_${meetingId}_user1`
      });

      const notif2 = await NotificationService.createNotification({
        userId: user1Id,
        workspaceId: user1WorkspaceId,
        title: 'Daily Meeting Reminder',
        message: 'Standup starts in 10 minutes',
        type: NotificationType.MEETING_STARTING,
        link: `/meetings/${meetingId}`,
        dedupKey: `reminder_${meetingId}_user1`
      });

      expect(notif1._id.toString()).toBe(notif2._id.toString());
    });

    it('User can mark notifications as read and mark all as read', async () => {
      const notifRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.notifications.length).toBeGreaterThan(0);

      const notifId = notifRes.body.notifications[0].id;

      // Mark single notification as read
      const markRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(markRes.status).toBe(200);
      expect(markRes.body.notification.isRead).toBe(true);

      // Mark all read
      const markAllRes = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(markAllRes.status).toBe(200);
    });
  });

  describe('I. Meeting Termination & Timestamp Updates', () => {
    it('Host ends meeting, marks active participants leftAt and terminates access', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/end`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('x-workspace-id', user1WorkspaceId);

      expect(res.status).toBe(200);
      expect(res.body.meeting.status).toBe('ENDED');
      expect(res.body.meeting.actualEndTime).toBeDefined();

      // Verify all participants have leftAt timestamp set
      const unleftParticipants = await MeetingParticipantModel.countDocuments({
        meetingId: new mongoose.Types.ObjectId(meetingId),
        leftAt: { $exists: false }
      });

      expect(unleftParticipants).toBe(0);
    });

    it('Prevents rejoining an ended meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send();

      expect(res.status).toBe(400);
    });
  });
});
