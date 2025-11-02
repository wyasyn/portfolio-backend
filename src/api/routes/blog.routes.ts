import { Router } from 'express';
import { blogController } from '@/api/controllers/blog.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';
import { validate } from '@/api/middlewares/validation.middleware';
import { upload } from '@/api/middlewares/upload.middleware';
import { createBlogSchema, updateBlogSchema } from '@/api/validators/blog.validator';

const router: Router = Router();

// Public routes
router.get('/', blogController.getAll);
router.get('/:slug', blogController.getBySlug);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(createBlogSchema),
  blogController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(updateBlogSchema),
  blogController.update
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(updateBlogSchema),
  blogController.update
);

router.delete('/:id', authenticate, requireAdmin, blogController.delete);

export default router;
