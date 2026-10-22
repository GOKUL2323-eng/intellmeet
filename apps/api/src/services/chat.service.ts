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
    clientMessageId?: string;
  }) {
    if (data.clientMessageId) {
      const existing = await ChatMessageModel.findOne({
        meetingId: new mongoose.Types.ObjectId(data.meetingId),
        clientMessageId: data.clientMessageId
      });
      if (existing) {
        return existing;
      }
    }

    return ChatMessageModel.create({
      meetingId: new mongoose.Types.ObjectId(data.meetingId),
      workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      message: data.message.trim(),
      messageType: data.messageType || 'CHAT',
      clientMessageId: data.clientMessageId
    });
  }

  static async getMeetingMessages(meetingId: string, workspaceId?: string, page = 1, limit = 50) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {
      meetingId: new mongoose.Types.ObjectId(meetingId)
    };
    if (workspaceId && mongoose.Types.ObjectId.isValid(workspaceId)) {
      query.workspaceId = new mongoose.Types.ObjectId(workspaceId);
    }

    const [messages, total] = await Promise.all([
      ChatMessageModel.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum),
      ChatMessageModel.countDocuments(query)
    ]);

    return {
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }
}
