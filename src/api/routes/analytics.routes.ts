import { Router } from 'express';
import { analyticsController } from '@/api/controllers/analytics.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';

const router: Router = Router();

router.get('/summary', authenticate, requireAdmin, analyticsController.getSummary);

export default router;
