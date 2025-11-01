import { Router } from 'express';
import { skillController } from '@/api/controllers/skill.controller';
import { authenticate, requireAdmin } from '@/api/middlewares/auth.middleware';
import { validate } from '@/api/middlewares/validation.middleware';
import { upload } from '@/api/middlewares/upload.middleware';
import { createSkillSchema, updateSkillSchema } from '@/api/validators/skill.validator';

const router: Router = Router();

router.get('/', skillController.getAll);
router.get('/:id', skillController.getById);

router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.single('icon'),
  validate(createSkillSchema),
  skillController.create
);

router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.single('icon'),
  validate(updateSkillSchema),
  skillController.update
);

router.delete('/:id', authenticate, requireAdmin, skillController.delete);

export default router;
