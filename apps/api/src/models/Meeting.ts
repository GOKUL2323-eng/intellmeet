import mongoose, { Schema, Document } from 'mongoose';
import { MeetingStatus, AIProcessingStatus } from '@intellmeet/shared';

export interface IMeetingDocument extends Document {
  meetingCode: string;
  title: string;
  description?: string;
  workspaceId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  scheduledStartTime: Date;
  scheduledEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: MeetingStatus;
  accessSettings: {
    allowGuests: boolean;
    waitingRoom: boolean;
    defaultMute: boolean;
    requirePassword?: boolean;
    passwordHash?: string;
  };
  recordingUrl?: string;
  aiProcessingStatus: AIProcessingStatus;
  summaryId?: mongoose.Types.ObjectId;
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
