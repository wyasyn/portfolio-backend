import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { authService } from '@/services/auth.service';
import { Role } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/utils/errors';

export class AdminController {
  /**
   * List all users with pagination and filters
   */
  async listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));

      // Type-safe role validation
      const role = req.query.role as string;
      const validatedRole =
        role && Object.values(Role).includes(role as Role) ? (role as Role) : undefined;

      const isActive =
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const banned =
        req.query.banned === 'true' ? true : req.query.banned === 'false' ? false : undefined;

      const result = await authService.listUsers(page, limit, {
        role: validatedRole,
        isActive,
        banned,
      });

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const user = await authService.getUserById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      if (!role || !Object.values(Role).includes(role)) {
        throw new BadRequestError(
          `Invalid role. Must be one of: ${Object.values(Role).join(', ')}`
        );
      }

      // Prevent demoting yourself
      if (userId === req.user?.id && role !== Role.ADMIN) {
        throw new BadRequestError('Cannot demote yourself from admin role');
      }

      const user = await authService.updateUserRole(userId, role as Role);

      res.json({
        success: true,
        data: user,
        message: 'User role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ban user
   */
  async banUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason, expiresAt } = req.body;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Prevent banning yourself
      if (userId === req.user?.id) {
        throw new BadRequestError('Cannot ban yourself');
      }

      // Validate expiresAt date if provided
      let expiresDate: Date | undefined;
      if (expiresAt) {
        expiresDate = new Date(expiresAt);
        if (isNaN(expiresDate.getTime())) {
          throw new BadRequestError('Invalid expiration date');
        }
        if (expiresDate <= new Date()) {
          throw new BadRequestError('Expiration date must be in the future');
        }
      }

      const user = await authService.banUser(userId, reason, expiresDate);

      res.json({
        success: true,
        data: user,
        message: 'User banned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unban user
   */
  async unbanUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const user = await authService.unbanUser(userId);

      res.json({
        success: true,
        data: user,
        message: 'User unbanned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Prevent deactivating yourself
      if (userId === req.user?.id) {
        throw new BadRequestError('Cannot deactivate your own account');
      }

      const user = await authService.deactivateUser(userId);

      res.json({
        success: true,
        data: user,
        message: 'User account deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate user account
   */
  async activateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const user = await authService.activateUser(userId);

      res.json({
        success: true,
        data: user,
        message: 'User account activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
