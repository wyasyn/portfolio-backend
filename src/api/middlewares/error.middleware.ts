import { Request, Response, NextFunction } from 'express';
import { AppError, ConflictError, NotFoundError, BadRequestError } from '@/utils/errors';
import { Prisma } from '@prisma/client';
import { logger } from '@/config/logger';

/**
 * Handle Prisma-specific errors
 */
const handlePrismaError = (error: Error): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';
        return new ConflictError(`A record with this ${field} already exists`);
      }

      case 'P2025':
        // Record not found
        return new NotFoundError('Record not found');

      case 'P2003':
        // Foreign key constraint failed
        return new BadRequestError('Related record not found');

      case 'P2014':
        // Invalid ID
        return new BadRequestError('Invalid ID provided');

      default:
        logger.error({ code: error.code, meta: error.meta }, 'Unhandled Prisma error');
        return new BadRequestError('Database operation failed');
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError('Invalid data provided');
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({ error }, 'Database connection failed');
    return new AppError(503, 'Database connection failed', false);
  }

  return new BadRequestError('Database error');
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log all errors
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    },
    'Error occurred'
  );

  // Handle operational errors (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError
  ) {
    const appError = handlePrismaError(err);
    res.status(appError.statusCode).json({
      success: false,
      error: appError.message,
    });
    return;
  }

  // Handle unexpected errors
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
};

/**
 * Handle 404 - Not Found routes
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/users', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
