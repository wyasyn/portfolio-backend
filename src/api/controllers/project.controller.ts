/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { analyticsService } from '@/services/analytics.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';

// Define proper types for cached responses
interface CachedProjectResponse {
  success: boolean;
  data: {
    id: string;
    [key: string]: any;
  };
}

interface CachedProjectsListResponse {
  success: boolean;
  data: any[];
  pagination: any;
}

export class ProjectController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = getPaginationParams(
        req.query.page as string,
        req.query.limit as string
      );
      const featured = req.query.featured === 'true';

      const cacheKey = `projects:list:${page}:${limit}:${featured}`;
      const cached = await cacheService.get<CachedProjectsListResponse>(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const where = featured ? { featured: true, deletedAt: null } : { deletedAt: null };

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
      const cached = await cacheService.get<CachedProjectResponse>(cacheKey);

      if (cached) {
        // Track view without blocking response
        analyticsService
          .trackView('project', id, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
            referrer: req.get('referer'),
          })
          .catch((err) => {
            console.error('Failed to track view:', err);
          });

        return res.json(cached);
      }

      const project = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const response = { success: true, data: project };
      await cacheService.set(cacheKey, response, 600);

      // Track view without blocking response
      analyticsService
        .trackView('project', id, {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          referrer: req.get('referer'),
        })
        .catch((err) => {
          console.error('Failed to track view:', err);
        });

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
          title: req.body.title,
          description: req.body.description,
          tags: req.body.tags || [],
          stack: req.body.stack || [],
          imageUrl,
          githubUrl: req.body.githubUrl,
          liveUrl: req.body.liveUrl,
          featured: req.body.featured || false,
          order: req.body.order || 0,
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

      const existing = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundError('Project not found');
      }

      if (req.file) {
        imageUrl = await cloudinaryService.uploadImage(req.file, 'projects');
      }

      const updateData: any = {};

      // Only update fields that are provided
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      if (req.body.stack !== undefined) updateData.stack = req.body.stack;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (req.body.githubUrl !== undefined) updateData.githubUrl = req.body.githubUrl;
      if (req.body.liveUrl !== undefined) updateData.liveUrl = req.body.liveUrl;
      if (req.body.featured !== undefined) updateData.featured = req.body.featured;
      if (req.body.order !== undefined) updateData.order = req.body.order;

      const project = await prisma.project.update({
        where: { id },
        data: updateData,
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

      const project = await prisma.project.findUnique({
        where: { id, deletedAt: null },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Soft delete
      await prisma.project.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

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
