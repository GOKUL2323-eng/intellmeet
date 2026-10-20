import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export class UserController {
  static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    res.json({
      user: {
        id: req.user._id.toString(),
        email: req.user.email,
        fullName: req.user.fullName,
        avatarUrl: req.user.avatarUrl,
        role: req.user.role,
        timezone: req.user.timezone,
        createdAt: req.user.createdAt
      }
    });
  }

  static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { fullName, timezone, avatarUrl } = req.body;
      const user = await UserModel.findById(req.user._id);

      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (fullName) user.fullName = fullName;
      if (timezone) user.timezone = timezone;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

      await user.save();

      res.json({
        message: 'Profile updated successfully.',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          timezone: user.timezone
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
