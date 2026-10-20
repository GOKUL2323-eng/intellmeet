import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate, requireWorkspaceMember } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  addTaskCommentSchema,
  convertActionItemSchema
} from '@intellmeet/shared';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceMember);

router.get('/', TaskController.list);
router.post('/', validateBody(createTaskSchema), TaskController.create);
router.post('/convert-action-item', validateBody(convertActionItemSchema), TaskController.convertActionItem);

router.get('/:taskId', TaskController.getById);
router.patch('/:taskId', validateBody(updateTaskSchema), TaskController.update);
router.delete('/:taskId', TaskController.delete);
router.post('/:taskId/comments', validateBody(addTaskCommentSchema), TaskController.addComment);

export default router;
