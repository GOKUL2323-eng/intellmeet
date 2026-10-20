import mongoose, { Schema, Document } from 'mongoose';
import { TaskPriority } from '@intellmeet/shared';

export interface IActionItemDocument extends Document {
  meetingId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigneeId?: mongoose.Types.ObjectId;
  assigneeName?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: 'PROPOSED' | 'CONVERTED' | 'DISMISSED';
  taskId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema<IActionItemDocument>(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    assigneeName: {
      type: String
    },
    dueDate: {
      type: Date
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'CONVERTED', 'DISMISSED'],
      default: 'PROPOSED'
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task'
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

ActionItemSchema.index({ meetingId: 1, status: 1 });

export const ActionItemModel = mongoose.model<IActionItemDocument>('ActionItem', ActionItemSchema);
