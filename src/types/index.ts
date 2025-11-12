import { Request } from 'express';
import { User, Role } from '@prisma/client';

// Use Prisma's User type directly for AuthRequest
export interface AuthRequest extends Request {
  user?: User;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationMeta;
}

export interface AnalyticsSummary {
  topProjects: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  topBlogs: Array<{
    id: string;
    title: string;
    views: number;
  }>;
  totalViews: number;
  projectViews: number;
  blogViews: number;
}

// Specific DTOs for API responses (without sensitive fields)
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: boolean;
  image: string | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  user: UserResponse;
  token: string | null;
}

// Type helpers for stricter typing
export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateUserRoleInput = {
  userId: string;
  role: Role;
};

export type BanUserInput = {
  userId: string;
  reason?: string;
  expiresAt?: Date;
};
