import { Router } from 'express';
import { analyticsController } from '@/api/controllers/analytics.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';

const router: Router = Router();

// All analytics routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Summary and stats
router.get('/summary', analyticsController.getSummary);
router.get('/referrers', analyticsController.getTopReferrers);
router.get('/countries', analyticsController.getTopCountries);

// Project analytics
router.get('/project/:id/views', analyticsController.getProjectViews);

// Blog analytics
router.get('/blog/:id/views', analyticsController.getBlogViews);

// Date range analytics
router.get('/:type/:id/date-range', analyticsController.getViewsByDateRange);

// Maintenance
router.delete('/cleanup', analyticsController.cleanOldViewEvents);

export default router;
