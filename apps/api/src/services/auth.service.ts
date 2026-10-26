import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { UserModel, IUserDocument } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import { WorkspaceModel } from '../models/Workspace';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { UserRole, WorkspaceRole, AuditAction } from '@intellmeet/shared';
import { AuditService } from './audit.service';

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    role: UserRole;
    timezone: string;
    authProvider?: string;
  };
  workspace?: {
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
  };
}

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateAccessToken(user: IUserDocument): string {
    return jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  }

  static async createRefreshToken(userId: mongoose.Types.ObjectId, family?: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const tokenFamily = family || crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshTokenModel.create({
      tokenHash,
      userId,
      family: tokenFamily,
      isRevoked: false,
      expiresAt
    });

    return `${rawToken}.${tokenFamily}`;
  }

  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    timezone?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IAuthTokens> {
    const existing = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw { statusCode: 409, message: 'An account with this email address already exists.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await UserModel.create({
      email: data.email.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      timezone: data.timezone || 'UTC',
      role: UserRole.MEMBER
    });

    // Create a default personal workspace for the new user
    const slug = `${data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace-${Date.now().toString().slice(-4)}`;
    const workspace = await WorkspaceModel.create({
      name: `${data.fullName}'s Workspace`,
      slug,
      ownerId: user._id,
      description: 'Default personal workspace'
    });

    await WorkspaceMembershipModel.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: WorkspaceRole.OWNER,
      status: 'ACTIVE'
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id as mongoose.Types.ObjectId);

    await AuditService.log({
      userId: user._id.toString(),
      workspaceId: workspace._id.toString(),
      action: AuditAction.USER_REGISTERED,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        timezone: user.timezone,
        authProvider: user.authProvider
      },
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        role: WorkspaceRole.OWNER
      }
    };
  }

  static async login(data: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IAuthTokens> {
    const user = await UserModel.findOne({ email: data.email.toLowerCase() });
    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    if (!user.passwordHash) {
      throw { statusCode: 401, message: 'This account was created with Google Sign-In. Please sign in with Google.' };
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    // Get user's primary/active workspace
    const membership = await WorkspaceMembershipModel.findOne({
      userId: user._id,
      status: 'ACTIVE'
    }).populate('workspaceId');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id as mongoose.Types.ObjectId);

    await AuditService.log({
      userId: user._id.toString(),
      workspaceId: membership?.workspaceId?._id?.toString(),
      action: AuditAction.USER_LOGGED_IN,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });

    const ws = membership?.workspaceId as any;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        timezone: user.timezone,
        authProvider: user.authProvider
      },
      workspace: ws
        ? {
            id: ws._id.toString(),
            name: ws.name,
            slug: ws.slug,
            role: (membership?.role || WorkspaceRole.MEMBER) as WorkspaceRole
          }
        : undefined
    };
  }

  static async verifyGoogleIdToken(token: string): Promise<{
    sub: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }> {
    // Testing & offline development fallback for automated test suites
    if ((token.startsWith('test-google-token-') || token.startsWith('test-token:')) && config.NODE_ENV !== 'production') {
      if (token.startsWith('test-token:')) {
        const [, sub, email, name, picture] = token.split(':');
        return {
          sub: sub || 'test-google-sub-12345',
          email: (email || 'google.user@example.com').toLowerCase(),
          fullName: name || 'Google User',
          avatarUrl: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${name || 'Google'}`
        };
      }
      const parts = token.replace('test-google-token-', '').split('-');
      const id = parts[0] || '12345';
      const email = parts[1] ? `${parts[1]}@intellmeet.com` : `google.user.${id}@intellmeet.com`;
      const name = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : `Google User ${id}`;
      return {
        sub: `google-sub-${id}`,
        email: email.toLowerCase(),
        fullName: name,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
      };
    }

    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error('Google token validation endpoint returned non-200');
      }
      const data: any = await response.json();

      if (!data.sub || !data.email) {
        throw new Error('Incomplete Google identity claims');
      }

      if (data.email_verified !== 'true' && data.email_verified !== true) {
        throw { statusCode: 401, message: 'Your Google email address is unverified.' };
      }

      // If GOOGLE_CLIENT_ID is configured, verify audience match
      if (config.GOOGLE_CLIENT_ID && data.aud && data.aud !== config.GOOGLE_CLIENT_ID) {
        throw { statusCode: 401, message: 'Google identity token was not issued for this application.' };
      }

      return {
        sub: data.sub,
        email: data.email.toLowerCase(),
        fullName: data.name || data.email.split('@')[0],
        avatarUrl: data.picture || ''
      };
    } catch (err: any) {
      if (err.statusCode) throw err;
      throw { statusCode: 401, message: 'Invalid or expired Google identity credential.' };
    }
  }

  static async googleLogin(data: {
    credential: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<IAuthTokens> {
    const googleProfile = await this.verifyGoogleIdToken(data.credential);

    // 1. Check if user already exists by stable Google Subject identifier
    let user = await UserModel.findOne({ googleId: googleProfile.sub });
    let isNewUser = false;

    if (!user) {
      // 2. Check if user exists by verified email (secure account linking)
      user = await UserModel.findOne({ email: googleProfile.email.toLowerCase() });

      if (user) {
        // Link Google identity to existing account
        user.googleId = googleProfile.sub;
        user.authProvider = user.passwordHash ? 'both' : 'google';
        if (!user.avatarUrl && googleProfile.avatarUrl) {
          user.avatarUrl = googleProfile.avatarUrl;
        }
        await user.save();
      } else {
        // 3. Create persistent new user
        isNewUser = true;
        user = await UserModel.create({
          email: googleProfile.email.toLowerCase(),
          fullName: googleProfile.fullName,
          avatarUrl: googleProfile.avatarUrl || '',
          googleId: googleProfile.sub,
          authProvider: 'google',
          role: UserRole.MEMBER,
          timezone: 'UTC'
        });

        // Auto-provision personal workspace for the Google-authenticated user
        const slug = `${googleProfile.fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace-${Date.now().toString().slice(-4)}`;
        const workspace = await WorkspaceModel.create({
          name: `${googleProfile.fullName}'s Workspace`,
          slug,
          ownerId: user._id,
          description: 'Default personal workspace'
        });

        await WorkspaceMembershipModel.create({
          workspaceId: workspace._id,
          userId: user._id,
          role: WorkspaceRole.OWNER,
          status: 'ACTIVE'
        });
      }
    } else {
      // Existing Google user: update avatar or name if needed
      if (!user.avatarUrl && googleProfile.avatarUrl) {
        user.avatarUrl = googleProfile.avatarUrl;
        await user.save();
      }
    }

    // Get active workspace membership
    const membership = await WorkspaceMembershipModel.findOne({
      userId: user._id,
      status: 'ACTIVE'
    }).populate('workspaceId');

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id as mongoose.Types.ObjectId);

    await AuditService.log({
      userId: user._id.toString(),
      workspaceId: membership?.workspaceId?._id?.toString(),
      action: isNewUser ? AuditAction.USER_REGISTERED : AuditAction.USER_LOGGED_IN,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });

    const ws = membership?.workspaceId as any;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        timezone: user.timezone,
        authProvider: user.authProvider
      },
      workspace: ws
        ? {
            id: ws._id.toString(),
            name: ws.name,
            slug: ws.slug,
            role: (membership?.role || WorkspaceRole.MEMBER) as WorkspaceRole
          }
        : undefined
    };
  }

  static async refreshTokens(rawTokenPayload: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawTokenPayload || !rawTokenPayload.includes('.')) {
      throw { statusCode: 401, message: 'Invalid refresh token format.' };
    }

    const [tokenPart, family] = rawTokenPayload.split('.');
    const tokenHash = this.hashToken(tokenPart);

    const tokenDoc = await RefreshTokenModel.findOne({ tokenHash, family });

    if (!tokenDoc) {
      // Possible reuse attack: someone is using a token that doesn't exist
      throw { statusCode: 401, message: 'Invalid refresh session.' };
    }

    if (tokenDoc.isRevoked) {
      // Token reuse detected! Revoke the entire family for security
      await RefreshTokenModel.updateMany({ family }, { isRevoked: true });
      throw { statusCode: 401, message: 'Compromised refresh session. Please sign in again.' };
    }

    // Revoke the current token (one-time use)
    tokenDoc.isRevoked = true;
    await tokenDoc.save();

    const user = await UserModel.findById(tokenDoc.userId);
    if (!user) {
      throw { statusCode: 401, message: 'User not found.' };
    }

    // Issue new access and refresh token under the same family
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(user._id as mongoose.Types.ObjectId, family);

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  static async logout(rawTokenPayload?: string): Promise<void> {
    if (rawTokenPayload && rawTokenPayload.includes('.')) {
      const [tokenPart, family] = rawTokenPayload.split('.');
      await RefreshTokenModel.updateMany({ family }, { isRevoked: true });
    }
  }

  static async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return a simulated response to prevent user enumeration
      return { resetToken: 'simulation-token' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = this.hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return { resetToken };
  }

  static async resetPassword(token: string, newPass: string): Promise<void> {
    const hashed = this.hashToken(token);
    const user = await UserModel.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw { statusCode: 400, message: 'Password reset token is invalid or has expired.' };
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPass, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Invalidate all active refresh sessions for this user
    await RefreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true });
  }
}
