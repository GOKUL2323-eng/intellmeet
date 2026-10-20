import mongoose from 'mongoose';
import crypto from 'crypto';
import { MeetingModel, IMeetingDocument } from '../models/Meeting';
import { MeetingParticipantModel } from '../models/MeetingParticipant';
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
        defaultMute: data.accessSettings?.defaultMute ?? false
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

    // Check guest policy
    if (!user && !meeting.accessSettings.allowGuests) {
      throw { statusCode: 403, message: 'This meeting does not allow guest participants.' };
    }

    // If meeting was scheduled, transition to LIVE on host start
    const isHost = user && meeting.hostId.toString() === user.id;
    if (meeting.status === MeetingStatus.SCHEDULED && isHost) {
      meeting.status = MeetingStatus.LIVE;
      meeting.actualStartTime = new Date();
      await meeting.save();
    }

    const role = isHost ? ParticipantRole.HOST : ParticipantRole.ATTENDEE;
    const isInWaitingRoom = meeting.accessSettings.waitingRoom && !isHost;

    // Record participant
    const participant = await MeetingParticipantModel.create({
      meetingId: meeting._id,
      userId: user ? new mongoose.Types.ObjectId(user.id) : undefined,
      guestName: guestName || (user ? user.fullName : 'Guest Participant'),
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
      isInWaitingRoom
    };
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

    if (meeting.hostId.toString() !== hostUserId) {
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
