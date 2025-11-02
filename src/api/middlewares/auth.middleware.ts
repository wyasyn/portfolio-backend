import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { fromNodeHeaders } from 'better-auth/node';

import { UnauthorizedError, ForbiddenError } from '@/utils/errors';

import { Role } from '@prisma/client';
import { auth } from '@/utils/auth';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
      ...session.user,
      password: '',
      role: Role.USER,
      lastLoginAt: null,
      isActive: true,
      banned: null,
      banReason: null,
      banExpires: null,
      image: session.user.image ?? null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== Role.ADMIN) {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
};
