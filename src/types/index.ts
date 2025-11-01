import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: User;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
