import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingSummaryDocument extends Document {
  meetingId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  overview: string;
  decisions: string[];
  discussionHighlights: string[];
  unresolvedQuestions: string[];
  nextSteps: string[];
  isEdited: boolean;
  editedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSummarySchema = new Schema<IMeetingSummaryDocument>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      unique: true,
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    overview: {
      type: String,
      required: true
    },
    decisions: {
      type: [String],
      default: []
    },
    discussionHighlights: {
      type: [String],
      default: []
    },
    unresolvedQuestions: {
      type: [String],
      default: []
    },
    nextSteps: {
      type: [String],
      default: []
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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

export const MeetingSummaryModel = mongoose.model<IMeetingSummaryDocument>(
  'MeetingSummary',
  MeetingSummarySchema
);
