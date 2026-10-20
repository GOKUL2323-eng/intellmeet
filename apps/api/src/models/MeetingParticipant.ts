import mongoose, { Schema, Document } from 'mongoose';
import { ParticipantRole } from '@intellmeet/shared';

export interface IMeetingParticipantDocument extends Document {
  meetingId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  guestName?: string;
  socketId?: string;
  role: ParticipantRole;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isInWaitingRoom: boolean;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingParticipantSchema = new Schema<IMeetingParticipantDocument>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    guestName: {
      type: String
    },
    socketId: {
      type: String
    },
    role: {
      type: String,
      enum: Object.values(ParticipantRole),
      default: ParticipantRole.ATTENDEE
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    isCameraOff: {
      type: Boolean,
      default: false
    },
    isScreenSharing: {
      type: Boolean,
      default: false
    },
    isHandRaised: {
      type: Boolean,
      default: false
    },
    isInWaitingRoom: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

MeetingParticipantSchema.index({ meetingId: 1, userId: 1 });

export const MeetingParticipantModel = mongoose.model<IMeetingParticipantDocument>(
  'MeetingParticipant',
  MeetingParticipantSchema
);
