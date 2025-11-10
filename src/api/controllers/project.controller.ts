import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { analyticsService } from '@/services/analytics.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';
import { generateSlug, ensureUniqueSlug } from '@/utils/slugify';

// Define proper types for cached responses
interface ProjectData {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  imageUrl: string | null;
  githubUrl: string | null;
  liveUrl: string | null;
  stack: string[];
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CachedProjectResponse {
  success: boolean;
  data: ProjectData;
}

interface CachedProjectsListResponse {
  success: boolean;
  data: ProjectData[];
  pagination: PaginationData;
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

  async getBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const cacheKey = `project:${slug}`;
      const cached = await cacheService.get<CachedProjectResponse>(cacheKey);

      if (cached) {
        // Track view without blocking response
        analyticsService
          .trackView('project', cached.data.id, {
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
        where: { slug, deletedAt: null },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const response = { success: true, data: project };
      await cacheService.set(cacheKey, response, 600);

      // Track view without blocking response
      analyticsService
        .trackView('project', project.id, {
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

      // Generate slug from title or use provided slug
      let slug = req.body.slug || generateSlug(req.body.title);

      // Ensure slug is unique
      slug = await ensureUniqueSlug(slug, async (s) => {
        const found = await prisma.project.findUnique({
          where: { slug: s },
        });
        return !!found && found.deletedAt === null;
      });

      const project = await prisma.project.create({
        data: {
          title: req.body.title,
          slug,
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
      const { slug } = req.params;
      let imageUrl = req.body.imageUrl;

      const existing = await prisma.project.findUnique({
        where: { slug, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundError('Project not found');
      }

      if (req.file) {
        imageUrl = await cloudinaryService.uploadImage(req.file, 'projects');
      }

      interface UpdateData {
        slug?: string;
        title?: string;
        description?: string;
        tags?: string[];
        stack?: string[];
        imageUrl?: string;
        githubUrl?: string;
        liveUrl?: string;
        featured?: boolean;
        order?: number;
      }

      const updateData: UpdateData = {};

      // Handle slug update if title changes
      let newSlug = existing.slug;
      if (req.body.title && req.body.title !== existing.title) {
        newSlug = await ensureUniqueSlug(generateSlug(req.body.title), async (s) => {
          const found = await prisma.project.findUnique({ where: { slug: s } });
          return !!found && found.id !== existing.id && found.deletedAt === null;
        });
        updateData.slug = newSlug;
      }

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
        where: { slug },
        data: updateData,
      });

      await cacheService.invalidatePattern('projects:*');
      await cacheService.del(`project:${slug}`);
      // If slug changed, invalidate old slug cache too
      if (newSlug !== existing.slug) {
        await cacheService.del(`project:${newSlug}`);
      }

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
      const { slug } = req.params;

      const project = await prisma.project.findUnique({
        where: { slug, deletedAt: null },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Soft delete
      await prisma.project.update({
        where: { slug },
        data: { deletedAt: new Date() },
      });

      await cacheService.invalidatePattern('projects:*');
      await cacheService.del(`project:${slug}`);

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
