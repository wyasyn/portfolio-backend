import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { fromNodeHeaders } from 'better-auth/node';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors';
import { Role } from '@prisma/client';
import { auth } from '@/utils/auth';
import { prisma } from '@/db/prisma';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Use Better Auth's getSession API
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user || !session?.session) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Get full user data from database with proper types
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is banned
    if (user.banned) {
      // Check if ban has expired
      if (user.banExpires && user.banExpires < new Date()) {
        // Unban user automatically using Prisma
        const unbannedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            banned: false,
            banReason: null,
            banExpires: null,
          },
        });
        req.user = unbannedUser;
      } else {
        const message = user.banReason
          ? `Account banned: ${user.banReason}`
          : 'Your account has been banned';
        throw new ForbiddenError(message);
      }
    } else {
      // Check if user is active
      if (!user.isActive) {
        throw new ForbiddenError('Account is inactive');
      }

      req.user = user;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== Role.ADMIN) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
};

export const requireActiveUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.isActive) {
    return next(new ForbiddenError('Active account required'));
  }

  next();
};

/**
 * Optional middleware to check if user has email verified
 */
export const requireEmailVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.emailVerified) {
    return next(new ForbiddenError('Email verification required'));
  }

  next();
};

/**
 * Middleware to check if user has specific role(s)
 */
export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};
