import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { analyticsService } from '@/services/analytics.service';
import { cacheService } from '@/db/redis';

export class AnalyticsController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cacheKey = 'analytics:summary';
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const summary = await analyticsService.getSummary();

      const response = {
        success: true,
        data: summary,
      };

      await cacheService.set(cacheKey, response, 300);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
