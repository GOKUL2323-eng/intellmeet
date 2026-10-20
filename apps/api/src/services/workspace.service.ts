import mongoose from 'mongoose';
import crypto from 'crypto';
import { WorkspaceModel, IWorkspaceDocument } from '../models/Workspace';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { InvitationModel } from '../models/Invitation';
import { UserModel } from '../models/User';
import { WorkspaceRole, AuditAction } from '@intellmeet/shared';
import { AuditService } from './audit.service';

export class WorkspaceService {
  static async createWorkspace(userId: string, name: string, description?: string): Promise<IWorkspaceDocument> {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

    const workspace = await WorkspaceModel.create({
      name,
      slug,
      description: description || '',
      ownerId: new mongoose.Types.ObjectId(userId)
    });

    await WorkspaceMembershipModel.create({
      workspaceId: workspace._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: WorkspaceRole.OWNER,
      status: 'ACTIVE'
    });

    await AuditService.log({
      userId,
      workspaceId: workspace._id.toString(),
      action: AuditAction.WORKSPACE_CREATED,
      entityType: 'Workspace',
      entityId: workspace._id.toString()
    });

    return workspace;
  }

  static async getUserWorkspaces(userId: string) {
    const memberships = await WorkspaceMembershipModel.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'ACTIVE'
    }).populate('workspaceId');

    return memberships.map(m => {
      const ws = m.workspaceId as any;
      return {
        id: ws._id.toString(),
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        role: m.role,
        createdAt: ws.createdAt
      };
    });
  }

  static async getWorkspaceMembers(workspaceId: string) {
    const memberships = await WorkspaceMembershipModel.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      status: 'ACTIVE'
    }).populate('userId', 'email fullName avatarUrl timezone role');

    return memberships.map(m => {
      const u = m.userId as any;
      return {
        id: m._id.toString(),
        workspaceId,
        userId: u?._id?.toString(),
        fullName: u?.fullName || 'Unknown User',
        email: u?.email || '',
        avatarUrl: u?.avatarUrl,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt
      };
    });
  }

  static async inviteMember(
    workspaceId: string,
    invitedByUserId: string,
    email: string,
    role: WorkspaceRole = WorkspaceRole.MEMBER
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Check if already a member
      const existingMembership = await WorkspaceMembershipModel.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        userId: existingUser._id
      });

      if (existingMembership) {
        throw { statusCode: 400, message: 'User is already a member of this workspace.' };
      }

      // Add directly as active member
      const membership = await WorkspaceMembershipModel.create({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        userId: existingUser._id,
        role,
        status: 'ACTIVE',
        invitedBy: new mongoose.Types.ObjectId(invitedByUserId)
      });

      await AuditService.log({
        userId: invitedByUserId,
        workspaceId,
        action: AuditAction.MEMBER_INVITED,
        entityType: 'WorkspaceMembership',
        entityId: membership._id.toString(),
        details: { email: normalizedEmail, role }
      });

      return {
        type: 'MEMBER_ADDED',
        member: {
          id: membership._id.toString(),
          userId: existingUser._id.toString(),
          email: existingUser.email,
          fullName: existingUser.fullName,
          role
        }
      };
    }

    // If user does not exist yet, generate an invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await InvitationModel.create({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      email: normalizedEmail,
      role,
      token,
      expiresAt,
      invitedBy: new mongoose.Types.ObjectId(invitedByUserId)
    });

    await AuditService.log({
      userId: invitedByUserId,
      workspaceId,
      action: AuditAction.MEMBER_INVITED,
      entityType: 'Invitation',
      entityId: invitation._id.toString(),
      details: { email: normalizedEmail, role }
    });

    return {
      type: 'INVITATION_SENT',
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    };
  }

  static async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: WorkspaceRole,
    operatorUserId: string
  ) {
    if (!mongoose.Types.ObjectId.isValid(workspaceId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw { statusCode: 400, message: 'Invalid workspace or member ID.' };
    }

    const operatorMembership = await WorkspaceMembershipModel.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(operatorUserId),
      status: 'ACTIVE'
    });

    if (!operatorMembership) {
      throw { statusCode: 403, message: 'Forbidden: You are not an active member of this workspace.' };
    }

    // Privilege escalation protection: only OWNER can grant the OWNER role
    if (newRole === WorkspaceRole.OWNER && operatorMembership.role !== WorkspaceRole.OWNER) {
      throw { statusCode: 403, message: 'Forbidden: Only the workspace Owner can promote members to Owner.' };
    }

    const membership = await WorkspaceMembershipModel.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: new mongoose.Types.ObjectId(targetUserId)
    });

    if (!membership) {
      throw { statusCode: 404, message: 'Member not found in this workspace.' };
    }

    if (membership.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      if (operatorMembership.role !== WorkspaceRole.OWNER) {
        throw { statusCode: 403, message: 'Forbidden: Only the Owner can modify the Owner role.' };
      }
    }

    membership.role = newRole;
    await membership.save();

    await AuditService.log({
      userId: operatorUserId,
      workspaceId,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      entityType: 'WorkspaceMembership',
      entityId: membership._id.toString(),
      details: { targetUserId, newRole }
    });

    return membership;
  }
}
