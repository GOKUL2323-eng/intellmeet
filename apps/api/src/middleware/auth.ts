import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { UserModel, IUserDocument } from '../models/User';
import { WorkspaceMembershipModel, IWorkspaceMembershipDocument } from '../models/WorkspaceMembership';
import { UserRole, WorkspaceRole } from '@intellmeet/shared';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      workspaceId?: string;
      workspaceMembership?: IWorkspaceMembershipDocument;
    }
  }
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
      algorithms: ['HS256']
    }) as ITokenPayload;

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User account not found or has been removed.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Access token expired.', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid or malformed authentication token.' });
  }
}

export function requirePlatformRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient platform permissions.' });
      return;
    }

    next();
  };
}

export async function requireWorkspaceMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const headerWs = req.headers['x-workspace-id'] as string | undefined;
    const paramWs = req.params.workspaceId;
    const queryWs = req.query.workspaceId as string | undefined;
    const bodyWs = req.body?.workspaceId;

    const workspaceId = headerWs || paramWs || queryWs || bodyWs;

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID must be provided to access this resource.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace ID format.' });
      return;
    }

    // Cross-tenant pollution guard:
    // If client supplied multiple workspace IDs across header/query/body, ensure they match.
    if (headerWs && queryWs && headerWs !== queryWs) {
      res.status(400).json({ error: 'Conflicting workspace ID provided in headers and query parameters.' });
      return;
    }
    if (headerWs && bodyWs && headerWs !== bodyWs) {
      res.status(400).json({ error: 'Conflicting workspace ID provided in headers and body payload.' });
      return;
    }
    if (paramWs && queryWs && paramWs !== queryWs) {
      res.status(400).json({ error: 'Conflicting workspace ID provided in route and query parameters.' });
      return;
    }

    const membership = await WorkspaceMembershipModel.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: req.user._id,
      status: 'ACTIVE'
    });

    if (!membership) {
      res.status(403).json({
        error: 'Forbidden: You do not have access to this workspace or membership is inactive.'
      });
      return;
    }

    req.workspaceId = workspaceId;
    req.workspaceMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireWorkspaceRole(...allowedRoles: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership) {
      res.status(403).json({ error: 'Forbidden: Workspace membership required.' });
      return;
    }

    if (!allowedRoles.includes(req.workspaceMembership.role as WorkspaceRole)) {
      res.status(403).json({
        error: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}
