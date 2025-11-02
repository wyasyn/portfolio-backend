import express, { Application, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from '@/config/env';
import { logger } from '@/config/logger';
import { errorHandler } from '@/api/middlewares/error.middleware';
import routes from '@/api/routes';
import { prisma } from '@/db/prisma';
import { redis } from '@/db/redis';
import { auth } from './utils/auth';

const app: Application = express();

// Better Auth handler - must be before other middleware
app.all('/api/auth/*', toNodeHandler(auth));

// Security & Performance Middleware
app.use(
  helmet({
    contentSecurityPolicy: config.app.env === 'production' ? undefined : false,
  })
);
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});
app.use('/api', limiter);

// Swagger documentation
if (config.app.env !== 'production' || config.app.enableDocs) {
  app.use('/api/docs', swaggerUi.serve);
  app.get(
    '/api/docs',
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: '/api/openapi.json',
      },
    })
  );

  // Serve OpenAPI spec
  app.get('/api/openapi.json', (req: Request, res: Response) => {
    res.sendFile('openapi.json', { root: './src/docs' });
  });
}

// API Routes
app.use(`/api/${config.app.apiVersion}`, routes);

// 404 handler for unmatched routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database disconnected');

      redis.disconnect();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error({ err: reason, promise }, 'Unhandled Promise Rejection');
  // Don't exit in production, just log
  if (config.app.env !== 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

// Start server
const PORT = config.app.port;
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`🔧 Environment: ${config.app.env}`);
  logger.info(`📦 API Version: ${config.app.apiVersion}`);

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.error({ err: error }, '❌ Database connection failed');
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.ping();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.error({ err: error }, '⚠️ Redis connection failed (non-fatal)');
    // Don't exit - Redis failures shouldn't prevent app startup
  }
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error({ err: error }, 'Server error');
  }
  process.exit(1);
});

export default app;
