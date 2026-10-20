import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, requireWorkspaceMember } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireWorkspaceMember);

router.get('/overview', AnalyticsController.getOverview);
router.get('/export', AnalyticsController.exportCSV);

export default router;
