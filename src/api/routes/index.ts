import { Router, Request, Response } from 'express';
import projectRoutes from './project.routes';
import blogRoutes from './blog.routes';
import contactRoutes from './contact.routes';
import skillRoutes from './skill.routes';
import analyticsRoutes from './analytics.routes';
import authRoutes from './auth.routes';

const router: Router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/blogs', blogRoutes);
router.use('/contact', contactRoutes);
router.use('/skills', skillRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
