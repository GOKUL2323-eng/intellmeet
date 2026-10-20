import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema } from '@intellmeet/shared';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getMe);
router.patch('/me', validateBody(updateProfileSchema), UserController.updateMe);

export default router;
