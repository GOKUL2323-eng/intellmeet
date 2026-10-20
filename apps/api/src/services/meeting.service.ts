import mongoose from 'mongoose';
import crypto from 'crypto';
import { MeetingModel, IMeetingDocument } from '../models/Meeting';
import { MeetingParticipantModel } from '../models/MeetingParticipant';
import { AuditLogModel } from '../models/AuditLog';
import { MeetingStatus, ParticipantRole, AuditAction } from '@intellmeet/shared';
import { AuditService } from './audit.service';

export class MeetingService {
  private static generateMeetingCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segment = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${segment(3)}-${segment(4)}-${segment(3)}`;
  }

  static async createMeeting(data: {
    workspaceId: string;
    hostId: string;
    title: string;
    description?: string;
    scheduledStartTime: string | Date;
    scheduledEndTime: string | Date;
    accessSettings?: {
      allowGuests?: boolean;
      waitingRoom?: boolean;
      defaultMute?: boolean;
    };
  }): Promise<IMeetingDocument> {
    const meetingCode = this.generateMeetingCode();

    const meeting = await MeetingModel.create({
      meetingCode,
      title: data.title,
      description: data.description || '',
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      hostId: new mongoose.Types.ObjectId(data.hostId),
      scheduledStartTime: new Date(data.scheduledStartTime),
      scheduledEndTime: new Date(data.scheduledEndTime),
      status: MeetingStatus.SCHEDULED,
      accessSettings: {
        allowGuests: data.accessSettings?.allowGuests ?? true,
        waitingRoom: data.accessSettings?.waitingRoom ?? false,
        defaultMute: data.accessSettings?.defaultMute ?? false,
        allowScreenShare: (data.accessSettings as any)?.allowScreenShare ?? true,
        allowChat: (data.accessSettings as any)?.allowChat ?? true,
        allowUnmute: (data.accessSettings as any)?.allowUnmute ?? true,
        allowCamera: (data.accessSettings as any)?.allowCamera ?? true
      }
    });

    await AuditService.log({
      userId: data.hostId,
      workspaceId: data.workspaceId,
      action: AuditAction.MEETING_CREATED,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
      details: { meetingCode, title: data.title }
    });

    return meeting;
  }

  static async getMeetingByIdOrCode(
    idOrCode: string,
    workspaceId?: string
  ): Promise<IMeetingDocument | null> {
    const query: Record<string, unknown> = {};

    if (mongoose.Types.ObjectId.isValid(idOrCode)) {
      query._id = new mongoose.Types.ObjectId(idOrCode);
    } else {
      query.meetingCode = idOrCode;
    }

    if (workspaceId) {
      query.workspaceId = new mongoose.Types.ObjectId(workspaceId);
    }

    return MeetingModel.findOne(query)
      .populate('hostId', 'fullName email avatarUrl')
      .populate('summaryId');
  }

  static async listMeetings(params: {
    workspaceId: string;
    status?: MeetingStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      workspaceId: new mongoose.Types.ObjectId(params.workspaceId)
    };

    if (params.status) {
      query.status = params.status;
    }

    if (params.search) {
      const safeSearch = params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { meetingCode: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const [meetings, total] = await Promise.all([
      MeetingModel.find(query)
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limit)
        .populate('hostId', 'fullName email avatarUrl'),
      MeetingModel.countDocuments(query)
    ]);

    return {
      meetings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async updateMeeting(
    meetingId: string,
    workspaceId: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      scheduledStartTime: string | Date;
      scheduledEndTime: string | Date;
      status: MeetingStatus;
      accessSettings: any;
    }>
  ) {
    if (!mongoose.Types.ObjectId.isValid(meetingId) || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw { statusCode: 400, message: 'Invalid meeting or workspace ID.' };
    }

    const meeting = await MeetingModel.findOne({
      _id: new mongoose.Types.ObjectId(meetingId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId)
    });

    if (!meeting) {
      throw { statusCode: 404, message: 'Meeting not found.' };
    }

    if (updates.title) meeting.title = updates.title;
    if (updates.description !== undefined) meeting.description = updates.description;
    if (updates.scheduledStartTime) meeting.scheduledStartTime = new Date(updates.scheduledStartTime);
    if (updates.scheduledEndTime) meeting.scheduledEndTime = new Date(updates.scheduledEndTime);
    if (updates.status) meeting.status = updates.status;
    if (updates.accessSettings) {
      meeting.accessSettings = {
        ...meeting.accessSettings,
        ...updates.accessSettings
      };
    }

    await meeting.save();
    return meeting;
  }

  private static getHostIdString(meeting: IMeetingDocument): string {
    return (meeting.hostId as any)?._id
      ? (meeting.hostId as any)._id.toString()
      : meeting.hostId.toString();
  }

  static getUserMeetingRole(meeting: IMeetingDocument, userId?: string): ParticipantRole {
    if (!userId) return ParticipantRole.GUEST;
    const hostId = this.getHostIdString(meeting);
    if (hostId === userId) return ParticipantRole.HOST;
    if (meeting.coHostIds?.some(id => id.toString() === userId)) return ParticipantRole.CO_HOST;
    return ParticipantRole.ATTENDEE;
  }

  static verifyHostOrCoHost(meeting: IMeetingDocument, userId: string): { isHost: boolean; isCoHost: boolean } {
    const hostId = this.getHostIdString(meeting);
    const isHost = hostId === userId;
    const isCoHost = Boolean(meeting.coHostIds?.some(id => id.toString() === userId));
    if (!isHost && !isCoHost) {
      throw { statusCode: 403, message: 'Forbidden: Host or Co-Host permissions required for this action.' };
    }
    return { isHost, isCoHost };
  }

  static async joinMeeting(
    idOrCode: string,
    user?: { id: string; fullName: string },
    guestName?: string
  ) {
    const meeting = await this.getMeetingByIdOrCode(idOrCode);
    if (!meeting) {
      throw { statusCode: 404, message: 'Meeting not found.' };
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw { statusCode: 400, message: 'This meeting has been cancelled.' };
    }

    // Determine user role
    const hostId = this.getHostIdString(meeting);
    const isHost = Boolean(user && hostId === user.id);
    const isCoHost = Boolean(user && meeting.coHostIds?.some(id => id.toString() === user.id));

    // Check banned users / guests first
    if (user && meeting.bannedUserIds?.some(id => id.toString() === user.id)) {
      throw { statusCode: 403, message: 'You have been removed from this meeting and cannot rejoin.' };
    }
    const cleanGuestName = guestName?.trim();
    if (!user && cleanGuestName && meeting.bannedGuestNames?.includes(cleanGuestName)) {
      throw { statusCode: 403, message: 'You have been removed from this meeting and cannot rejoin.' };
    }

    // Check if meeting is locked (only Host/Co-Host can bypass lock)
    if (meeting.isLocked && !isHost && !isCoHost) {
      throw { statusCode: 403, message: 'This meeting is locked by the host.' };
    }

    // Check guest policy
    if (!user && !meeting.accessSettings.allowGuests) {
      throw { statusCode: 403, message: 'This meeting does not allow guest participants.' };
    }

    // If meeting was scheduled, transition to LIVE on host start
    if (meeting.status === MeetingStatus.SCHEDULED && isHost) {
      meeting.status = MeetingStatus.LIVE;
      meeting.actualStartTime = new Date();
      await meeting.save();
    }

    const role = isHost
      ? ParticipantRole.HOST
      : isCoHost
      ? ParticipantRole.CO_HOST
      : user
      ? ParticipantRole.ATTENDEE
      : ParticipantRole.GUEST;

    const isInWaitingRoom = Boolean(meeting.accessSettings.waitingRoom && !isHost && !isCoHost);

    // Record participant
    const participant = await MeetingParticipantModel.create({
      meetingId: meeting._id,
      userId: user ? new mongoose.Types.ObjectId(user.id) : undefined,
      guestName: cleanGuestName || (user ? user.fullName : 'Guest Participant'),
      role,
      isMuted: meeting.accessSettings.defaultMute,
      isCameraOff: false,
      isScreenSharing: false,
      isInWaitingRoom,
      joinedAt: new Date()
    });

    return {
      meeting,
      participant,
      isHost,
      isCoHost,
      isInWaitingRoom
    };
  }

  static async updateHostSettings(
    meetingId: string,
    userId: string,
    settings: {
      isLocked?: boolean;
      waitingRoom?: boolean;
      defaultMute?: boolean;
      allowScreenShare?: boolean;
      allowChat?: boolean;
      allowUnmute?: boolean;
      allowCamera?: boolean;
    }
  ) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    if (settings.isLocked !== undefined) {
      meeting.isLocked = settings.isLocked;
    }

    if (!meeting.accessSettings) {
      meeting.accessSettings = {
        allowGuests: true,
        waitingRoom: false,
        defaultMute: false,
        allowScreenShare: true,
        allowChat: true,
        allowUnmute: true,
        allowCamera: true
      };
    }

    if (settings.waitingRoom !== undefined) meeting.accessSettings.waitingRoom = settings.waitingRoom;
    if (settings.defaultMute !== undefined) meeting.accessSettings.defaultMute = settings.defaultMute;
    if (settings.allowScreenShare !== undefined) meeting.accessSettings.allowScreenShare = settings.allowScreenShare;
    if (settings.allowChat !== undefined) meeting.accessSettings.allowChat = settings.allowChat;
    if (settings.allowUnmute !== undefined) meeting.accessSettings.allowUnmute = settings.allowUnmute;
    if (settings.allowCamera !== undefined) meeting.accessSettings.allowCamera = settings.allowCamera;

    await meeting.save();

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.MEETING_SETTINGS_UPDATED,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
      details: settings
    });

    return meeting;
  }

  static async lockMeeting(meetingId: string, userId: string, isLocked: boolean) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    meeting.isLocked = isLocked;
    await meeting.save();

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: isLocked ? AuditAction.MEETING_LOCKED : AuditAction.MEETING_UNLOCKED,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
      details: { isLocked }
    });

    return meeting;
  }

  static async muteAllParticipants(meetingId: string, userId: string, allowUnmute = true) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    // Mute all non-host participants in DB
    await MeetingParticipantModel.updateMany(
      {
        meetingId: meeting._id,
        role: { $ne: ParticipantRole.HOST },
        leftAt: { $exists: false }
      },
      {
        isMuted: true,
        isAudioBlocked: !allowUnmute
      }
    );

    if (!allowUnmute) {
      meeting.accessSettings.allowUnmute = false;
      await meeting.save();
    }

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.MUTE_ALL_TRIGGERED,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
      details: { allowUnmute }
    });

    return { success: true, allowUnmute };
  }

  static async moderateParticipant(
    meetingId: string,
    userId: string,
    targetParticipantId: string,
    action: string,
    details?: { blockRejoin?: boolean; reason?: string }
  ) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    const { isHost, isCoHost } = this.verifyHostOrCoHost(meeting, userId);

    const participant = await MeetingParticipantModel.findOne({
      _id: new mongoose.Types.ObjectId(targetParticipantId),
      meetingId: meeting._id
    });

    if (!participant) {
      throw { statusCode: 404, message: 'Participant record not found.' };
    }

    // Safety: Cannot moderate meeting owner/host!
    if (participant.role === ParticipantRole.HOST) {
      throw { statusCode: 403, message: 'Cannot moderate the meeting host.' };
    }

    // Safety: Co-Host cannot remove or moderate another Co-Host
    if (isCoHost && !isHost && participant.role === ParticipantRole.CO_HOST) {
      throw { statusCode: 403, message: 'Co-hosts cannot moderate fellow co-hosts.' };
    }

    let auditAction = AuditAction.PARTICIPANT_MUTED;

    switch (action) {
      case 'mute':
        participant.isMuted = true;
        auditAction = AuditAction.PARTICIPANT_MUTED;
        break;

      case 'stopVideo':
        participant.isCameraOff = true;
        participant.isVideoBlocked = true;
        auditAction = AuditAction.PARTICIPANT_CAMERA_STOPPED;
        break;

      case 'stopScreenShare':
        participant.isScreenSharing = false;
        participant.isScreenShareBlocked = true;
        auditAction = AuditAction.SCREEN_SHARE_REVOKED;
        break;

      case 'lowerHand':
        participant.isHandRaised = false;
        break;

      case 'remove':
        participant.leftAt = new Date();
        auditAction = AuditAction.PARTICIPANT_REMOVED;

        if (details?.blockRejoin) {
          participant.isBanned = true;
          if (participant.userId) {
            if (!meeting.bannedUserIds) meeting.bannedUserIds = [];
            if (!meeting.bannedUserIds.some(id => id.toString() === participant.userId!.toString())) {
              meeting.bannedUserIds.push(participant.userId);
            }
          }
          if (participant.guestName) {
            if (!meeting.bannedGuestNames) meeting.bannedGuestNames = [];
            if (!meeting.bannedGuestNames.includes(participant.guestName)) {
              meeting.bannedGuestNames.push(participant.guestName);
            }
          }
          await meeting.save();
        }
        break;

      case 'promoteCoHost':
        if (!isHost) {
          throw { statusCode: 403, message: 'Only the meeting host can assign co-hosts.' };
        }
        if (!participant.userId) {
          throw { statusCode: 400, message: 'Only authenticated registered users can be promoted to co-host.' };
        }
        participant.role = ParticipantRole.CO_HOST;
        if (!meeting.coHostIds) meeting.coHostIds = [];
        if (!meeting.coHostIds.some(id => id.toString() === participant.userId!.toString())) {
          meeting.coHostIds.push(participant.userId);
        }
        await meeting.save();
        auditAction = AuditAction.PARTICIPANT_ROLE_CHANGED;
        break;

      case 'demoteCoHost':
        if (!isHost) {
          throw { statusCode: 403, message: 'Only the meeting host can revoke co-hosts.' };
        }
        participant.role = ParticipantRole.ATTENDEE;
        if (meeting.coHostIds && participant.userId) {
          meeting.coHostIds = meeting.coHostIds.filter(id => id.toString() !== participant.userId!.toString());
          await meeting.save();
        }
        auditAction = AuditAction.PARTICIPANT_ROLE_CHANGED;
        break;

      default:
        throw { statusCode: 400, message: `Invalid moderation action: ${action}` };
    }

    await participant.save();

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: auditAction,
      entityType: 'MeetingParticipant',
      entityId: participant._id.toString(),
      details: { action, targetParticipantId, ...details }
    });

    return { participant, meeting };
  }

  static async admitParticipant(meetingId: string, userId: string, participantId: string) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    const participant = await MeetingParticipantModel.findOne({
      _id: new mongoose.Types.ObjectId(participantId),
      meetingId: meeting._id
    });

    if (!participant) throw { statusCode: 404, message: 'Participant not found.' };

    participant.isInWaitingRoom = false;
    await participant.save();

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.PARTICIPANT_ADMITTED,
      entityType: 'MeetingParticipant',
      entityId: participant._id.toString()
    });

    return participant;
  }

  static async rejectParticipant(meetingId: string, userId: string, participantId: string, reason?: string) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    const participant = await MeetingParticipantModel.findOne({
      _id: new mongoose.Types.ObjectId(participantId),
      meetingId: meeting._id
    });

    if (!participant) throw { statusCode: 404, message: 'Participant not found.' };

    participant.isInWaitingRoom = false;
    participant.leftAt = new Date();
    await participant.save();

    await AuditService.log({
      userId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.PARTICIPANT_REJECTED,
      entityType: 'MeetingParticipant',
      entityId: participant._id.toString(),
      details: { reason }
    });

    return participant;
  }

  static async assignCoHost(meetingId: string, hostUserId: string, targetUserId: string, assign: boolean) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    if (this.getHostIdString(meeting) !== hostUserId) {
      throw { statusCode: 403, message: 'Only the meeting host can assign or revoke co-host privileges.' };
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw { statusCode: 400, message: 'Invalid target user ID.' };
    }

    const targetObjId = new mongoose.Types.ObjectId(targetUserId);
    if (!meeting.coHostIds) meeting.coHostIds = [];

    if (assign) {
      if (!meeting.coHostIds.some(id => id.toString() === targetUserId)) {
        meeting.coHostIds.push(targetObjId);
      }
    } else {
      meeting.coHostIds = meeting.coHostIds.filter(id => id.toString() !== targetUserId);
    }

    await meeting.save();

    // Update participant record if exists
    await MeetingParticipantModel.updateMany(
      { meetingId: meeting._id, userId: targetObjId, leftAt: { $exists: false } },
      { role: assign ? ParticipantRole.CO_HOST : ParticipantRole.ATTENDEE }
    );

    await AuditService.log({
      userId: hostUserId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.PARTICIPANT_ROLE_CHANGED,
      entityType: 'Meeting',
      entityId: meeting._id.toString(),
      details: { targetUserId, assignedCoHost: assign }
    });

    return meeting;
  }

  static async getMeetingParticipants(meetingId: string, userId: string) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    const participants = await MeetingParticipantModel.find({
      meetingId: meeting._id
    })
      .sort({ joinedAt: 1 })
      .populate('userId', 'fullName email avatarUrl');

    return participants;
  }

  static async getModerationHistory(meetingId: string, userId: string) {
    const meeting = await this.getMeetingByIdOrCode(meetingId);
    if (!meeting) throw { statusCode: 404, message: 'Meeting not found.' };

    this.verifyHostOrCoHost(meeting, userId);

    const logs = await AuditLogModel.find({
      $or: [
        { entityType: 'Meeting', entityId: meeting._id.toString() },
        { entityType: 'MeetingParticipant', 'details.targetParticipantId': { $exists: true } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'fullName email avatarUrl');

    return logs;
  }

  static async endMeeting(meetingId: string, hostUserId: string, workspaceId?: string) {
    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      throw { statusCode: 404, message: 'Meeting not found.' };
    }

    const query: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(meetingId)
    };
    if (workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
      query.workspaceId = new mongoose.Types.ObjectId(workspaceId);
    }

    const meeting = await MeetingModel.findOne(query);
    if (!meeting) {
      throw { statusCode: 404, message: 'Meeting not found in this workspace.' };
    }

    if (this.getHostIdString(meeting) !== hostUserId) {
      throw { statusCode: 403, message: 'Only the meeting host can end the meeting for everyone.' };
    }

    meeting.status = MeetingStatus.ENDED;
    meeting.actualEndTime = new Date();
    await meeting.save();

    await AuditService.log({
      userId: hostUserId,
      workspaceId: meeting.workspaceId.toString(),
      action: AuditAction.MEETING_ENDED,
      entityType: 'Meeting',
      entityId: meeting._id.toString()
    });

    return meeting;
  }
}
