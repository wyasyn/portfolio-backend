import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { Role } from '@prisma/client';
import { auth } from '@/utils/auth';
import { prisma } from '@/db/prisma';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Fetch complete user data from database including custom attributes
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        lastLoginAt: true,
        isActive: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is banned
    if (user.banned) {
      // Check if ban has expired
      if (user.banExpires && user.banExpires < new Date()) {
        // Unban user automatically
        await prisma.user.update({
          where: { id: user.id },
          data: { banned: false, banReason: null, banExpires: null },
        });
      } else {
        const message = user.banReason
          ? `Account banned: ${user.banReason}`
          : 'Your account has been banned';
        throw new ForbiddenError(message);
      }
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenError('Account is inactive');
    }

    req.user = user;
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

export const requireActiveUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isActive) {
    return next(new ForbiddenError('Active account required'));
  }
  next();
};
