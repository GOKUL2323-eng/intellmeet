import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingTranscriptDocument extends Document {
  meetingId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  segments: {
    speakerId: string;
    speakerName: string;
    text: string;
    startTime: number;
    endTime: number;
  }[];
  language: string;
  consentRecorded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingTranscriptSchema = new Schema<IMeetingTranscriptDocument>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    segments: [
      {
        speakerId: { type: String, required: true },
        speakerName: { type: String, required: true },
        text: { type: String, required: true },
        startTime: { type: Number, required: true },
        endTime: { type: Number, required: true }
      }
    ],
    language: {
      type: String,
      default: 'en'
    },
    consentRecorded: {
      type: Boolean,
      required: true,
      default: false
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

export const MeetingTranscriptModel = mongoose.model<IMeetingTranscriptDocument>(
  'MeetingTranscript',
  MeetingTranscriptSchema
);
