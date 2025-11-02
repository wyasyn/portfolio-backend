import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { analyticsService } from '@/services/analytics.service';
import { cacheService } from '@/db/redis';
import { AnalyticsSummary } from '@/types';

// Define proper types for cached responses
interface CachedAnalyticsResponse {
  success: boolean;
  data: AnalyticsSummary;
}

export class AnalyticsController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cacheKey = 'analytics:summary';
      const cached = await cacheService.get<CachedAnalyticsResponse>(cacheKey);

      if (cached) {
        return res.json(cached);
      }

      const summary = await analyticsService.getSummary();

      const response: CachedAnalyticsResponse = {
        success: true,
        data: summary,
      };

      await cacheService.set(cacheKey, response, 300);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProjectViews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const views = await analyticsService.getProjectViews(id);

      res.json({
        success: true,
        data: { projectId: id, views },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBlogViews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const views = await analyticsService.getBlogViews(id);

      res.json({
        success: true,
        data: { blogId: id, views },
      });
    } catch (error) {
      next(error);
    }
  }

  async getViewsByDateRange(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, id } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      if (type !== 'project' && type !== 'blog') {
        return res.status(400).json({
          success: false,
          message: 'type must be either "project" or "blog"',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format',
        });
      }

      const views = await analyticsService.getViewsByDateRange(type, id, start, end);

      res.json({
        success: true,
        data: views,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopReferrers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const referrers = await analyticsService.getTopReferrers(limit);

      res.json({
        success: true,
        data: referrers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopCountries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const countries = await analyticsService.getTopCountries(limit);

      res.json({
        success: true,
        data: countries,
      });
    } catch (error) {
      next(error);
    }
  }

  async cleanOldViewEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const daysToKeep = req.query.days ? parseInt(req.query.days as string, 10) : 90;

      const deletedCount = await analyticsService.deleteOldViewEvents(daysToKeep);

      res.json({
        success: true,
        data: { deletedCount },
        message: `Deleted ${deletedCount} old view events`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
