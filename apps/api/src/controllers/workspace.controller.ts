import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { WorkspaceRole } from '@intellmeet/shared';

export class WorkspaceController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaces = await WorkspaceService.getUserWorkspaces(req.user!._id.toString());
      res.json({ workspaces });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspace = await WorkspaceService.createWorkspace(
        req.user!._id.toString(),
        req.body.name,
        req.body.description
      );
      res.status(201).json({
        message: 'Workspace created successfully.',
        workspace: {
          id: workspace._id.toString(),
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          role: WorkspaceRole.OWNER
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || req.workspaceId!;
      const members = await WorkspaceService.getWorkspaceMembers(workspaceId);
      res.json({ members });
    } catch (err) {
      next(err);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || req.workspaceId!;
      const result = await WorkspaceService.inviteMember(
        workspaceId,
        req.user!._id.toString(),
        req.body.email,
        req.body.role
      );
      res.status(201).json({
        message: result.type === 'MEMBER_ADDED' ? 'Member added to workspace.' : 'Invitation dispatched.',
        result
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || req.workspaceId!;
      const targetUserId = req.params.memberId;
      const updated = await WorkspaceService.updateMemberRole(
        workspaceId,
        targetUserId,
        req.body.role,
        req.user!._id.toString()
      );
      res.json({ message: 'Role updated successfully.', membership: updated });
    } catch (err) {
      next(err);
    }
  }
}
