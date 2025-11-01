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

router.post('/', contactLimiter, validate(createContactSchema), contactController.submit);
router.get('/', authenticate, requireAdmin, contactController.getAll);
router.put('/:id/read', authenticate, requireAdmin, contactController.markAsRead);
router.delete('/:id', authenticate, requireAdmin, contactController.delete);

export default router;
