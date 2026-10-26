import mongoose, { Schema, Document } from 'mongoose';
import { MeetingStatus, AIProcessingStatus } from '@intellmeet/shared';

export interface IMeetingDocument extends Document {
  meetingCode: string;
  title: string;
  description?: string;
  workspaceId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  coHostIds?: mongoose.Types.ObjectId[];
  isLocked?: boolean;
  bannedUserIds?: mongoose.Types.ObjectId[];
  bannedGuestNames?: string[];
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: MeetingStatus;
  accessSettings: {
    allowGuests: boolean;
    waitingRoom: boolean;
    defaultMute: boolean;
    allowScreenShare: boolean;
    allowChat: boolean;
    allowUnmute: boolean;
    allowCamera: boolean;
    requirePassword?: boolean;
    passwordHash?: string;
  };
  recordingUrl?: string;
  aiProcessingStatus: AIProcessingStatus;
  summaryId?: mongoose.Types.ObjectId;
  provider?: 'native' | 'google_meet';
  googleMeetUrl?: string;
  googleMeetSpaceId?: string;
  googleCalendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeetingDocument>(
  {
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    coHostIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isLocked: {
      type: Boolean,
      default: false,
      index: true
    },
    bannedUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    bannedGuestNames: [
      {
        type: String
      }
    ],
    scheduledStartTime: {
      type: Date,
      required: true,
      index: true
    },
    scheduledEndTime: {
      type: Date,
      required: true
    },
    actualStartTime: {
      type: Date
    },
    actualEndTime: {
      type: Date
    },
    status: {
      type: String,
      enum: Object.values(MeetingStatus),
      default: MeetingStatus.SCHEDULED,
      index: true
    },
    accessSettings: {
      allowGuests: { type: Boolean, default: true },
      waitingRoom: { type: Boolean, default: false },
      defaultMute: { type: Boolean, default: false },
      allowScreenShare: { type: Boolean, default: true },
      allowChat: { type: Boolean, default: true },
      allowUnmute: { type: Boolean, default: true },
      allowCamera: { type: Boolean, default: true },
      requirePassword: { type: Boolean, default: false },
      passwordHash: { type: String }
    },
    recordingUrl: {
      type: String
    },
    aiProcessingStatus: {
      type: String,
      enum: Object.values(AIProcessingStatus),
      default: AIProcessingStatus.IDLE,
      index: true
    },
    summaryId: {
      type: Schema.Types.ObjectId,
      ref: 'MeetingSummary'
    },
    provider: {
      type: String,
      enum: ['native', 'google_meet'],
      default: 'native',
      index: true
    },
    googleMeetUrl: {
      type: String
    },
    googleMeetSpaceId: {
      type: String
    },
    googleCalendarEventId: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.accessSettings) {
          delete ret.accessSettings.passwordHash;
        }
        return ret;
      }
    }
  }
);

MeetingSchema.index({ workspaceId: 1, scheduledStartTime: -1 });

export const MeetingModel = mongoose.model<IMeetingDocument>('Meeting', MeetingSchema);
