/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { prisma } from '@/db/prisma';
import { cacheService } from '@/db/redis';
import { cloudinaryService } from '@/services/cloudinary.service';
import { NotFoundError } from '@/utils/errors';

// Define proper types for cached responses
interface CachedSkillsResponse {
  success: boolean;
  data: any;
}

export class SkillController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const category = req.query.category as string | undefined;

      const cacheKey = `skills:list:${category || 'all'}`;
      const cached = await cacheService.get<CachedSkillsResponse>(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const where = category ? { category } : {};

      const skills = await prisma.skill.findMany({
        where,
        orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
      });

      // Group by category
      const grouped = skills.reduce((acc: any, skill) => {
        if (!acc[skill.category]) {
          acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
      }, {});

      const response = {
        success: true,
        data: category ? skills : grouped,
      };

      await cacheService.set(cacheKey, response, 1800);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const skill = await prisma.skill.findUnique({ where: { id } });
      if (!skill) {
        throw new NotFoundError('Skill not found');
      }

      res.json({
        success: true,
        data: skill,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      let iconUrl = req.body.iconUrl;

      if (req.file) {
        iconUrl = await cloudinaryService.uploadImage(req.file, 'skills');
      }

      const skill = await prisma.skill.create({
        data: {
          category: req.body.category,
          name: req.body.name,
          iconUrl,
          level: req.body.level || 0,
          order: req.body.order || 0,
        },
      });

      await cacheService.invalidatePattern('skills:*');

      res.status(201).json({
        success: true,
        data: skill,
        message: 'Skill created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      let iconUrl = req.body.iconUrl;

      const existing = await prisma.skill.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Skill not found');
      }

      if (req.file) {
        iconUrl = await cloudinaryService.uploadImage(req.file, 'skills');
      }

      const updateData: any = {};

      // Only update fields that are provided
      if (req.body.category !== undefined) updateData.category = req.body.category;
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (iconUrl !== undefined) updateData.iconUrl = iconUrl;
      if (req.body.level !== undefined) updateData.level = req.body.level;
      if (req.body.order !== undefined) updateData.order = req.body.order;

      const skill = await prisma.skill.update({
        where: { id },
        data: updateData,
      });

      await cacheService.invalidatePattern('skills:*');

      res.json({
        success: true,
        data: skill,
        message: 'Skill updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const skill = await prisma.skill.findUnique({ where: { id } });
      if (!skill) {
        throw new NotFoundError('Skill not found');
      }

      await prisma.skill.delete({ where: { id } });

      await cacheService.invalidatePattern('skills:*');

      res.json({
        success: true,
        message: 'Skill deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const skillController = new SkillController();
