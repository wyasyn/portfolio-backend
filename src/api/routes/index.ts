import { Router } from 'express';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import blogRoutes from './blog.routes';
import contactRoutes from './contact.routes';
import skillRoutes from './skill.routes';
import analyticsRoutes from './analytics.routes';

const router: Router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/blogs', blogRoutes);
router.use('/contact', contactRoutes);
router.use('/skills', skillRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
