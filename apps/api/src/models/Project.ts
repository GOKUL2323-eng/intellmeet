import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  key: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    color: {
      type: String,
      default: '#3B82F6'
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

ProjectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export const ProjectModel = mongoose.model<IProjectDocument>('Project', ProjectSchema);
