import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessageDocument extends Document {
  meetingId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageType: 'CHAT' | 'SYSTEM' | 'ACTION';
  clientMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessageDocument>(
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
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderName: {
      type: String,
      required: true
    },
    senderAvatar: {
      type: String
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    messageType: {
      type: String,
      enum: ['CHAT', 'SYSTEM', 'ACTION'],
      default: 'CHAT'
    },
    clientMessageId: {
      type: String,
      sparse: true,
      index: true
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

ChatMessageSchema.index({ meetingId: 1, createdAt: 1 });
ChatMessageSchema.index({ meetingId: 1, clientMessageId: 1 }, { sparse: true, unique: true });

export const ChatMessageModel = mongoose.model<IChatMessageDocument>('ChatMessage', ChatMessageSchema);
