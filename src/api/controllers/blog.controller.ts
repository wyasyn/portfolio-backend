import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { analyticsService } from '@/services/analytics.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';
import { generateSlug, ensureUniqueSlug } from '@/utils/slugify';

export class BlogController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = getPaginationParams(
        req.query.page as string,
        req.query.limit as string
      );
      const published = req.user?.role !== 'ADMIN' ? true : req.query.published === 'true';

      const cacheKey = `blogs:list:${page}:${limit}:${published}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const where = published ? { published: true } : {};

      const [blogs, total] = await Promise.all([
        prisma.blog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            tags: true,
            imageUrl: true,
            published: true,
            publishedAt: true,
            views: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.blog.count({ where }),
      ]);

      const response = {
        success: true,
        data: blogs,
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

      const cacheKey = `blog:${slug}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        const ip = req.ip || req.socket.remoteAddress;
        await analyticsService.trackView(
          'blog',
          cached.data.id,
          ip,
          req.get('user-agent'),
          req.get('referer')
        );
        return res.json(cached);
      }

      const blog = await prisma.blog.findUnique({ where: { slug } });
      if (!blog || (!blog.published && req.user?.role !== 'ADMIN')) {
        throw new NotFoundError('Blog post not found');
      }

      const response = { success: true, data: blog };
      await cacheService.set(cacheKey, response, 600);

      const ip = req.ip || req.socket.remoteAddress;
      await analyticsService.trackView(
        'blog',
        blog.id,
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
        imageUrl = await cloudinaryService.uploadImage(req.file, 'blogs');
      }

      let slug = req.body.slug || generateSlug(req.body.title);
      slug = await ensureUniqueSlug(
        slug,
        async (s) => !!(await prisma.blog.findUnique({ where: { slug: s } }))
      );

      const blog = await prisma.blog.create({
        data: {
          ...req.body,
          slug,
          imageUrl,
          publishedAt: req.body.published ? new Date() : null,
        },
      });

      await cacheService.invalidatePattern('blogs:*');

      res.status(201).json({
        success: true,
        data: blog,
        message: 'Blog post created successfully',
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
        imageUrl = await cloudinaryService.uploadImage(req.file, 'blogs');
      }

      const existing = await prisma.blog.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Blog post not found');
      }

      let slug = existing.slug;
      if (req.body.title && req.body.title !== existing.title) {
        slug = await ensureUniqueSlug(generateSlug(req.body.title), async (s) => {
          const found = await prisma.blog.findUnique({ where: { slug: s } });
          return !!found && found.id !== id;
        });
      }

      const blog = await prisma.blog.update({
        where: { id },
        data: {
          ...req.body,
          slug,
          imageUrl,
          publishedAt:
            req.body.published && !existing.published ? new Date() : existing.publishedAt,
        },
      });

      await cacheService.invalidatePattern('blogs:*');
      await cacheService.del(`blog:${existing.slug}`);

      res.json({
        success: true,
        data: blog,
        message: 'Blog post updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const blog = await prisma.blog.findUnique({ where: { id } });
      if (!blog) {
        throw new NotFoundError('Blog post not found');
      }

      await prisma.blog.delete({ where: { id } });

      await cacheService.invalidatePattern('blogs:*');
      await cacheService.del(`blog:${blog.slug}`);

      res.json({
        success: true,
        message: 'Blog post deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const blogController = new BlogController();
