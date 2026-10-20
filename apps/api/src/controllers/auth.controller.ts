import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { config } from '../config/env';

const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: (config.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/'
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register({
        email: req.body.email,
        password: req.body.password,
        fullName: req.body.fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Set refresh token in HttpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.status(201).json({
        message: 'Account successfully registered.',
        accessToken: result.accessToken,
        user: result.user,
        workspace: result.workspace
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login({
        email: req.body.email,
        password: req.body.password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: 'Login successful.',
        accessToken: result.accessToken,
        user: result.user,
        workspace: result.workspace
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'Refresh token is required.' });
        return;
      }

      const result = await AuthService.refreshTokens(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        ...getRefreshTokenCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({
        accessToken: result.accessToken
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(refreshToken);
      res.clearCookie('refreshToken', getRefreshTokenCookieOptions());
      res.json({ message: 'Successfully logged out.' });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
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

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      res.json({
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        resetToken: config.NODE_ENV !== 'production' ? result.resetToken : undefined
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ message: 'Password has been reset successfully. You may now sign in with your new credentials.' });
    } catch (err) {
      next(err);
    }
  }
}
