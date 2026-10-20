import mongoose, { Schema, Document } from 'mongoose';
import { TaskStatus, TaskPriority } from '@intellmeet/shared';

export interface ITaskCommentDocument {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
}

export interface ITaskDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  actionItemId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigneeId?: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
  comments: ITaskCommentDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskCommentSchema = new Schema<ITaskCommentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    text: { type: String, required: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const TaskSchema = new Schema<ITaskDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: 'Meeting',
      index: true
    },
    actionItemId: {
      type: Schema.Types.ObjectId,
      ref: 'ActionItem'
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    dueDate: {
      type: Date,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    comments: {
      type: [TaskCommentSchema],
      default: []
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

TaskSchema.index({ workspaceId: 1, status: 1 });
TaskSchema.index({ workspaceId: 1, assigneeId: 1 });

export const TaskModel = mongoose.model<ITaskDocument>('Task', TaskSchema);
