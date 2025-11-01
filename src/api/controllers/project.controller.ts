import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { analyticsService } from '@/services/analytics.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';

export class ProjectController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = getPaginationParams(
        req.query.page as string,
        req.query.limit as string
      );
      const featured = req.query.featured === 'true';

      const cacheKey = `projects:list:${page}:${limit}:${featured}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const where = featured ? { featured: true } : {};

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ featured: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.project.count({ where }),
      ]);

      const response = {
        success: true,
        data: projects,
        pagination: calculatePagination(total, page, limit),
      };

      await cacheService.set(cacheKey, response, 600);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const cacheKey = `project:${id}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        // Track view
        const ip = req.ip || req.socket.remoteAddress;
        await analyticsService.trackView(
          'project',
          id,
          ip,
          req.get('user-agent'),
          req.get('referer')
        );
        return res.json(cached);
      }

      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const response = { success: true, data: project };
      await cacheService.set(cacheKey, response, 600);

      // Track view
      const ip = req.ip || req.socket.remoteAddress;
      await analyticsService.trackView(
        'project',
        id,
        ip,
        req.get('user-agent'),
        req.get('referer')
      );

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        imageUrl = await cloudinaryService.uploadImage(req.file, 'projects');
      }

      const project = await prisma.project.create({
        data: {
          ...req.body,
          imageUrl,
        },
      });

      await cacheService.invalidatePattern('projects:*');

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        imageUrl = await cloudinaryService.uploadImage(req.file, 'projects');
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...req.body,
          imageUrl,
        },
      });

      await cacheService.invalidatePattern('projects:*');
      await cacheService.del(`project:${id}`);

      res.json({
        success: true,
        data: project,
        message: 'Project updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await prisma.project.delete({ where: { id } });

      await cacheService.invalidatePattern('projects:*');
      await cacheService.del(`project:${id}`);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
