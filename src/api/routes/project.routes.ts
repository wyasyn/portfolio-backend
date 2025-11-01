import { Router } from 'express';
import { projectController } from '@/api/controllers/project.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';
import { validate } from '@/api/middlewares/validation.middleware';
import { upload } from '@/api/middlewares/upload.middleware';
import { createProjectSchema, updateProjectSchema } from '@/api/validators/project.validator';

const router: Router = Router();

router.get('/', projectController.getAll);
router.get('/:id', projectController.getById);

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

router.delete('/:id', authenticate, requireAdmin, projectController.delete);

export default router;
