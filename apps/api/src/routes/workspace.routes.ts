import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticate, requireWorkspaceMember, requireWorkspaceRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createWorkspaceSchema, inviteMemberSchema, updateMemberRoleSchema, WorkspaceRole } from '@intellmeet/shared';

const router = Router();

router.use(authenticate);

router.get('/', WorkspaceController.list);
router.post('/', validateBody(createWorkspaceSchema), WorkspaceController.create);

router.get('/:workspaceId/members', requireWorkspaceMember, WorkspaceController.getMembers);
router.post(
  '/:workspaceId/invitations',
  requireWorkspaceMember,
  requireWorkspaceRole(WorkspaceRole.OWNER, WorkspaceRole.ADMIN),
  validateBody(inviteMemberSchema),
  WorkspaceController.inviteMember
);
router.patch(
  '/:workspaceId/members/:memberId',
  requireWorkspaceMember,
  requireWorkspaceRole(WorkspaceRole.OWNER, WorkspaceRole.ADMIN),
  validateBody(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole
);

export default router;
