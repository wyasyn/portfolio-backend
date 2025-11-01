import { Router } from 'express';
import { authController } from '@/api/controllers/auth.controller';
import { validate } from '@/api/middlewares/validation.middleware';
import { authenticate } from '@/api/middlewares/auth.middleware';
import { registerSchema, loginSchema } from '@/api/validators/auth.validator';

const router: Router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, authController.me);

export default router;
