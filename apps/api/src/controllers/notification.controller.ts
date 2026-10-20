import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await NotificationService.getUserNotifications(
        req.user!._id.toString(),
        page,
        limit
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await NotificationService.markAsRead(
        req.params.notificationId,
        req.user!._id.toString()
      );

      if (!notification) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
      }

      res.json({ message: 'Marked as read.', notification });
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!._id.toString());
      res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  }
}
