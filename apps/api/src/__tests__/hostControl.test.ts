import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { ParticipantRole } from '@intellmeet/shared';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';

let app: any;
let mongod: MongoMemoryServer;

describe('Advanced Host Controls & Meeting Security Test Suite', () => {
  let hostToken: string;
  let hostUserId: string;
  let workspaceId: string;

  let coHostToken: string;
  let coHostUserId: string;

  let attendeeToken: string;
  let attendeeUserId: string;

  let outsideUserToken: string;

  let meetingId: string;
  let attendeeParticipantId: string;
  let coHostParticipantId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    app = createApp();

    // 1. Register Host User
    const hostRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'host@intellmeet.com',
        password: 'Password123!',
        fullName: 'Meeting Host'
      });
    hostToken = hostRes.body.accessToken;
    hostUserId = hostRes.body.user.id;
    workspaceId = hostRes.body.workspace.id;

    // 2. Register Co-Host Candidate User in same workspace
    const coHostRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'cohost@intellmeet.com',
        password: 'Password123!',
        fullName: 'Sarah CoHost'
      });
    coHostToken = coHostRes.body.accessToken;
    coHostUserId = coHostRes.body.user.id;

    // Add Sarah to Host's workspace
    await WorkspaceMembershipModel.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(coHostUserId),
      role: 'MEMBER',
      status: 'ACTIVE'
    });

    // 3. Register Attendee User in same workspace
    const attendeeRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'attendee@intellmeet.com',
        password: 'Password123!',
        fullName: 'John Attendee'
      });
    attendeeToken = attendeeRes.body.accessToken;
    attendeeUserId = attendeeRes.body.user.id;

    await WorkspaceMembershipModel.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(attendeeUserId),
      role: 'MEMBER',
      status: 'ACTIVE'
    });

    // 4. Register Outside User (no workspace membership)
    const outsideRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'outside@othercorp.com',
        password: 'Password123!',
        fullName: 'Outside Person'
      });
    outsideUserToken = outsideRes.body.accessToken;
  }, 300000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('1. Meeting Creation & Initial Settings', () => {
    it('Host can schedule a meeting with waiting room & permissions', async () => {
      const res = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          title: 'Product Strategy & Host Control Demo',
          description: 'Testing advanced host control features',
          scheduledStartTime: new Date().toISOString(),
          scheduledEndTime: new Date(Date.now() + 3600000).toISOString(),
          accessSettings: {
            allowGuests: true,
            waitingRoom: false,
            defaultMute: false,
            allowScreenShare: true,
            allowChat: true,
            allowUnmute: true,
            allowCamera: true
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.meeting).toBeDefined();
      expect(res.body.meeting.hostId).toBe(hostUserId);
      expect(res.body.meeting.isLocked).toBe(false);
      meetingId = res.body.meeting.id;
    });

    it('Non-member cannot access private workspace meeting', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${outsideUserToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Meeting Joining & Participant Role Verification', () => {
    it('Host joins meeting and is recognized as HOST', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.isHost).toBe(true);
      expect(res.body.participant.role).toBe(ParticipantRole.HOST);
    });

    it('Attendee joins meeting and is recognized as ATTENDEE', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.isHost).toBe(false);
      expect(res.body.participant.role).toBe(ParticipantRole.ATTENDEE);
      attendeeParticipantId = res.body.participant.id;
    });

    it('Host can retrieve full participant list', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}/participants`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.participants).toBeInstanceOf(Array);
      expect(res.body.participants.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Lock & Unlock Meeting Controls', () => {
    it('Attendee cannot lock the meeting (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/lock`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ isLocked: true });

      expect(res.status).toBe(403);
    });

    it('Host can lock the meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/lock`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ isLocked: true });

      expect(res.status).toBe(200);
      expect(res.body.isLocked).toBe(true);
    });

    it('New join attempt by non-host is blocked when meeting is locked', async () => {
      // CoHost candidate joins when meeting is locked and not yet a cohost
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error || res.body.message).toContain('locked');
    });

    it('Host can unlock the meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/lock`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ isLocked: false });

      expect(res.status).toBe(200);
      expect(res.body.isLocked).toBe(false);
    });

    it('Co-host candidate can now join once meeting is unlocked', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .send();

      expect(res.status).toBe(200);
      coHostParticipantId = res.body.participant.id;
    });
  });

  describe('4. Waiting Room Management', () => {
    it('Host can enable waiting room via settings endpoint', async () => {
      const res = await request(app)
        .patch(`/api/v1/meetings/${meetingId}/settings`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ waitingRoom: true });

      expect(res.status).toBe(200);
      expect(res.body.meeting.accessSettings.waitingRoom).toBe(true);
    });

    it('New attendee joining is placed in the waiting room', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.isInWaitingRoom).toBe(true);
      attendeeParticipantId = res.body.participant.id;
    });

    it('Host can admit participant from waiting room', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants/${attendeeParticipantId}/admit`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.participant.isInWaitingRoom).toBe(false);
    });
  });

  describe('5. Mute All & Individual Moderation', () => {
    it('Host can mute all participants with allowUnmute flag', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/mute-all`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ allowUnmute: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.allowUnmute).toBe(false);
    });

    it('Attendee cannot mute all participants (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/mute-all`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ allowUnmute: true });

      expect(res.status).toBe(403);
    });

    it('Host can mute an individual participant', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants/${attendeeParticipantId}/moderate`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ action: 'mute' });

      expect(res.status).toBe(200);
      expect(res.body.participant.isMuted).toBe(true);
    });

    it('Host can turn off participant camera (stopVideo)', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants/${attendeeParticipantId}/moderate`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ action: 'stopVideo' });

      expect(res.status).toBe(200);
      expect(res.body.participant.isCameraOff).toBe(true);
      expect(res.body.participant.isVideoBlocked).toBe(true);
    });

    it('Host can stop participant screen sharing', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants/${attendeeParticipantId}/moderate`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ action: 'stopScreenShare' });

      expect(res.status).toBe(200);
      expect(res.body.participant.isScreenSharing).toBe(false);
    });

    it('Cannot moderate the meeting owner/host', async () => {
      // Find host participant record
      const listRes = await request(app)
        .get(`/api/v1/meetings/${meetingId}/participants`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      const hostParticipant = listRes.body.participants.find((p: any) => p.role === ParticipantRole.HOST);

      if (hostParticipant) {
        const res = await request(app)
          .post(`/api/v1/meetings/${meetingId}/participants/${hostParticipant.id}/moderate`)
          .set('Authorization', `Bearer ${hostToken}`)
          .set('x-workspace-id', workspaceId)
          .send({ action: 'mute' });

        expect(res.status).toBe(403);
        expect(res.body.error || res.body.message).toContain('host');
      }
    });
  });

  describe('6. Co-Host Assignment & Permissions', () => {
    it('Host assigns co-host privileges to user', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/co-hosts`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ targetUserId: coHostUserId, assign: true });

      expect(res.status).toBe(200);
      expect(res.body.meeting.coHostIds).toContain(coHostUserId);
    });

    it('Co-host can lock the meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/lock`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ isLocked: true });

      expect(res.status).toBe(200);
      expect(res.body.isLocked).toBe(true);
    });

    it('Co-host CANNOT assign another co-host (Host-only)', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/co-hosts`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ targetUserId: attendeeUserId, assign: true });

      expect(res.status).toBe(403);
    });

    it('Co-host CANNOT end the meeting for everyone (Host-only)', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/end`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(403);
      expect(res.body.error || res.body.message).toContain('Only the meeting host');
    });

    it('Host can revoke co-host privileges', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/co-hosts`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({ targetUserId: coHostUserId, assign: false });

      expect(res.status).toBe(200);
      expect(res.body.meeting.coHostIds).not.toContain(coHostUserId);
    });
  });

  describe('7. Participant Removal & Rejoining Prevention (Ban)', () => {
    it('Host removes participant with blockRejoin: true', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/participants/${attendeeParticipantId}/moderate`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId)
        .send({
          action: 'remove',
          blockRejoin: true,
          reason: 'Violated meeting policy'
        });

      expect(res.status).toBe(200);
      expect(res.body.participant.leftAt).toBeDefined();
      expect(res.body.participant.isBanned).toBe(true);
    });

    it('Banned participant is blocked from rejoining the meeting', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/join`)
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.error || res.body.message).toContain('cannot rejoin');
    });
  });

  describe('8. Moderation Audit Logs & LiveKit Integration', () => {
    it('Host can retrieve moderation history for meeting', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}/moderation-logs`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeInstanceOf(Array);
      expect(res.body.logs.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/meetings/:id/livekit-token returns structured configuration status', async () => {
      const res = await request(app)
        .get(`/api/v1/meetings/${meetingId}/livekit-token`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.roomName).toBeDefined();
      expect(res.body.isHost).toBe(true);
      expect(typeof res.body.configured).toBe('boolean');
    });
  });

  describe('9. End Meeting For Everyone', () => {
    it('Host can terminate the meeting for everyone', async () => {
      const res = await request(app)
        .post(`/api/v1/meetings/${meetingId}/end`)
        .set('Authorization', `Bearer ${hostToken}`)
        .set('x-workspace-id', workspaceId);

      expect(res.status).toBe(200);
      expect(res.body.meeting.status).toBe('ENDED');
      expect(res.body.meeting.actualEndTime).toBeDefined();
    });
  });
});
