import { Request, Response, NextFunction } from 'express';
import {
  AuthRequest,
  CreateUserInput,
  LoginInput,
  ApiResponse,
  UserResponse,
  LoginResponse,
} from '@/types';
import { authService } from '@/services/auth.service';
import { UnauthorizedError, BadRequestError } from '@/utils/errors';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body as CreateUserInput;

      if (!name?.trim()) {
        throw new BadRequestError('Name is required');
      }

      if (!email?.trim()) {
        throw new BadRequestError('Email is required');
      }

      if (!password || password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters');
      }

      const user = await authService.createUser(email, password, name);

      const response: ApiResponse<UserResponse> = {
        success: true,
        data: user,
        message: 'User registered successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginInput;

      if (!email?.trim() || !password) {
        throw new BadRequestError('Email and password are required');
      }

      const result = await authService.login(email, password);

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: result,
        message: 'Login successful',
      };

      res.json(response);
    } catch (error) {
      // Log the actual error for debugging
      console.error('Login error:', error);
      next(new UnauthorizedError('Invalid credentials'));
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.headers);

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      // No need to remove password - it's not in the User model anymore
      const response: ApiResponse<UserResponse> = {
        success: true,
        data: req.user,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
