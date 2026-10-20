import mongoose from 'mongoose';
import { NotificationModel, INotificationDocument } from '../models/Notification';
import { NotificationType } from '@intellmeet/shared';

// Forward reference for socket server
let ioInstance: any = null;
export function setNotificationSocketIO(io: any) {
  ioInstance = io;
}

export class NotificationService {
  static async createNotification(data: {
    userId: string;
    workspaceId?: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
  }): Promise<INotificationDocument> {
    const notification = await NotificationModel.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      workspaceId: data.workspaceId ? new mongoose.Types.ObjectId(data.workspaceId) : undefined,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link,
      isRead: false
    });

    // Real-time delivery via Socket.io if connected
    if (ioInstance) {
      ioInstance.to(`user:${data.userId}`).emit('notification:new', {
        id: notification._id.toString(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        createdAt: notification.createdAt
      });
    }

    return notification;
  }

  static async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { userId: new mongoose.Types.ObjectId(userId) };

    const [notifications, unreadCount, total] = await Promise.all([
      NotificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationModel.countDocuments({ ...query, isRead: false }),
      NotificationModel.countDocuments(query)
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async markAsRead(notificationId: string, userId: string) {
    return NotificationModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        userId: new mongoose.Types.ObjectId(userId)
      },
      { isRead: true },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string) {
    await NotificationModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
