/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { analyticsService } from '@/services/analytics.service';
import { NotFoundError } from '@/utils/errors';
import { getPaginationParams, calculatePagination } from '@/utils/pagination';
import { generateSlug, ensureUniqueSlug } from '@/utils/slugify';

// Helper function to calculate read time (average 200 words per minute)
const calculateReadTime = (content: string): number => {
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
};

// Define proper types for cached responses
interface CachedBlogResponse {
  success: boolean;
  data: {
    id: string;
    [key: string]: any;
  };
}

interface CachedBlogsListResponse {
  success: boolean;
  data: any[];
  pagination: any;
}

export class BlogController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = getPaginationParams(
        req.query.page as string,
        req.query.limit as string
      );
      const published = req.user?.role !== 'ADMIN' ? true : req.query.published === 'true';

      const cacheKey = `blogs:list:${page}:${limit}:${published}`;
      const cached = await cacheService.get<CachedBlogsListResponse>(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const where = published ? { published: true, deletedAt: null } : { deletedAt: null };

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
            readTime: true,
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
      const cached = await cacheService.get<CachedBlogResponse>(cacheKey);

      if (cached) {
        // Track view without blocking response
        analyticsService
          .trackView('blog', cached.data.id, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
            referrer: req.get('referer'),
          })
          .catch((err) => {
            console.error('Failed to track view:', err);
          });

        return res.json(cached);
      }

      const blog = await prisma.blog.findUnique({
        where: { slug, deletedAt: null },
      });

      if (!blog || (!blog.published && req.user?.role !== 'ADMIN')) {
        throw new NotFoundError('Blog post not found');
      }

      const response = { success: true, data: blog };
      await cacheService.set(cacheKey, response, 600);

      // Track view without blocking response
      analyticsService
        .trackView('blog', blog.id, {
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
        imageUrl = await cloudinaryService.uploadImage(req.file, 'blogs');
      }

      let slug = req.body.slug || generateSlug(req.body.title);
      slug = await ensureUniqueSlug(slug, async (s) => {
        const found = await prisma.blog.findUnique({
          where: { slug: s },
        });
        return !!found && found.deletedAt === null;
      });

      // Calculate read time from content
      const readTime = req.body.content ? calculateReadTime(req.body.content) : null;

      const blog = await prisma.blog.create({
        data: {
          title: req.body.title,
          content: req.body.content,
          excerpt: req.body.excerpt,
          tags: req.body.tags || [],
          published: req.body.published || false,
          slug,
          imageUrl,
          readTime,
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

      const existing = await prisma.blog.findUnique({
        where: { id, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundError('Blog post not found');
      }

      let slug = existing.slug;
      if (req.body.title && req.body.title !== existing.title) {
        slug = await ensureUniqueSlug(generateSlug(req.body.title), async (s) => {
          const found = await prisma.blog.findUnique({ where: { slug: s } });
          return !!found && found.id !== id && found.deletedAt === null;
        });
      }

      // Recalculate read time if content is updated
      const readTime = req.body.content ? calculateReadTime(req.body.content) : existing.readTime;

      const updateData: any = {
        slug,
        publishedAt: req.body.published && !existing.published ? new Date() : existing.publishedAt,
      };

      // Only update fields that are provided
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.content !== undefined) {
        updateData.content = req.body.content;
        updateData.readTime = readTime;
      }
      if (req.body.excerpt !== undefined) updateData.excerpt = req.body.excerpt;
      if (req.body.tags !== undefined) updateData.tags = req.body.tags;
      if (req.body.published !== undefined) updateData.published = req.body.published;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

      const blog = await prisma.blog.update({
        where: { id },
        data: updateData,
      });

      await cacheService.invalidatePattern('blogs:*');
      await cacheService.del(`blog:${existing.slug}`);
      if (slug !== existing.slug) {
        await cacheService.del(`blog:${slug}`);
      }

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

      const blog = await prisma.blog.findUnique({
        where: { id, deletedAt: null },
      });

      if (!blog) {
        throw new NotFoundError('Blog post not found');
      }

      // Soft delete
      await prisma.blog.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

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
