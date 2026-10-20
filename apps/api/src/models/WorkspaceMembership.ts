import mongoose, { Schema, Document } from 'mongoose';
import { WorkspaceRole } from '@intellmeet/shared';

export interface IWorkspaceMembershipDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'INVITED';
  invitedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMembershipSchema = new Schema<IWorkspaceMembershipDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: Object.values(WorkspaceRole),
      default: WorkspaceRole.MEMBER
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED'],
      default: 'ACTIVE'
    },
    invitedBy: {
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

// Unique compound index so a user cannot be added twice to the same workspace
WorkspaceMembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMembershipModel = mongoose.model<IWorkspaceMembershipDocument>(
  'WorkspaceMembership',
  WorkspaceMembershipSchema
);
