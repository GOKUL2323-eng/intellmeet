import mongoose from 'mongoose';
import { AuditLogModel } from '../models/AuditLog';
import { AuditAction } from '@intellmeet/shared';

export interface IAuditParams {
  workspaceId?: string | mongoose.Types.ObjectId;
  userId: string | mongoose.Types.ObjectId;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  static async log(params: IAuditParams): Promise<void> {
    try {
      await AuditLogModel.create({
        workspaceId: params.workspaceId ? new mongoose.Types.ObjectId(params.workspaceId) : undefined,
        userId: new mongoose.Types.ObjectId(params.userId),
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}
