import { Router } from 'express';
import { projectController } from '@/api/controllers/project.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';
import { validate } from '@/api/middlewares/validation.middleware';
import { upload } from '@/api/middlewares/upload.middleware';
import { createProjectSchema, updateProjectSchema } from '@/api/validators/project.validator';

const router: Router = Router();

// Public routes
router.get('/', projectController.getAll);
router.get('/:slug', projectController.getBySlug);

// Admin routes
router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(createProjectSchema),
  projectController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(updateProjectSchema),
  projectController.update
);

router.patch(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('image'),
  validate(updateProjectSchema),
  projectController.update
);

router.delete('/:id', authenticate, requireAdmin, projectController.delete);

export default router;
