import mongoose from 'mongoose';
import { ChatMessageModel } from '../models/ChatMessage';

export class ChatService {
  static async saveMessage(data: {
    meetingId: string;
    workspaceId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    messageType?: 'CHAT' | 'SYSTEM' | 'ACTION';
  }) {
    return ChatMessageModel.create({
      meetingId: new mongoose.Types.ObjectId(data.meetingId),
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      message: data.message.trim(),
      messageType: data.messageType || 'CHAT'
    });
  }

  static async getMeetingMessages(meetingId: string, workspaceId?: string) {
    const query: Record<string, unknown> = {
      meetingId: new mongoose.Types.ObjectId(meetingId)
    };
    if (workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
      query.workspaceId = new mongoose.Types.ObjectId(workspaceId);
    }
    return ChatMessageModel.find(query)
      .sort({ createdAt: 1 })
      .limit(200);
  }
}
