import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { authService } from '@/services/auth.service';
import { UnauthorizedError } from '@/utils/errors';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }

      const user = await authService.createUser(email, password, name);
      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch {
      next(new UnauthorizedError('Invalid credentials'));
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.headers);
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...user } = req.user;
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
