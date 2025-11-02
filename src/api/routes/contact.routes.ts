import { Router } from 'express';
import { contactController } from '@/api/controllers/contact.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';
import { validate } from '@/api/middlewares/validation.middleware';
import { createContactSchema } from '@/api/validators/contact.validator';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/env';

const contactLimiter = rateLimit({
  windowMs: config.contactRateLimit.windowMs,
  max: config.contactRateLimit.maxRequests,
  message: 'Too many contact submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const router: Router = Router();

// Public route - rate limited
router.post('/', contactLimiter, validate(createContactSchema), contactController.submit);

// Admin routes - all require authentication and admin role
router.get('/', authenticate, requireAdmin, contactController.getAll);
router.get('/stats', authenticate, requireAdmin, contactController.getStats);
router.get('/:id', authenticate, requireAdmin, contactController.getById);

router.patch('/:id/read', authenticate, requireAdmin, contactController.markAsRead);
router.patch('/:id/replied', authenticate, requireAdmin, contactController.markAsReplied);
router.patch('/:id/notes', authenticate, requireAdmin, contactController.updateNotes);

router.delete('/:id', authenticate, requireAdmin, contactController.delete);

export default router;
