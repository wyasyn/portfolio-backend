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
import { errorHandler, notFoundHandler } from '@/api/middlewares/error.middleware';
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

// Health check endpoint (before rate limiting)
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis (non-blocking)
    let redisStatus = 'disconnected';
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisStatus,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

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
  app.get('/api/openapi.json', (_req: Request, res: Response) => {
    res.sendFile('openapi.json', { root: './src/docs' });
  });
}

// API Routes
app.use(`/api/${config.app.apiVersion}`, routes);

// 404 handler for unmatched routes (use the middleware version)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Global error handlers for uncaught errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error(
    {
      err: reason instanceof Error ? reason : new Error(String(reason)),
      promise,
    },
    'Unhandled Promise Rejection'
  );

  // Exit in non-production environments for faster debugging
  if (config.app.env !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ err: error }, 'Uncaught Exception - Critical Error');
  // Always exit on uncaught exceptions as the app state is unreliable
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Graceful shutdown handler
let isShuttingDown = false;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server');
    } else {
      logger.info('HTTP server closed');
    }

    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database disconnected');

      // Close Redis connection
      await redis.quit();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Error during shutdown'
      );
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const PORT = config.app.port;
let server: ReturnType<typeof app.listen>;

async function startServer(): Promise<void> {
  try {
    // Test database connection first
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connected');

    // Test Redis connection (non-fatal if it fails)
    try {
      await redis.ping();
      logger.info('✅ Redis connected');
    } catch (error) {
      logger.warn({ err: error }, '⚠️ Redis connection failed (non-fatal)');
      // Continue without Redis - your app should handle this gracefully
    }

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      logger.info(`🔧 Environment: ${config.app.env}`);
      logger.info(`📦 API Version: ${config.app.apiVersion}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        logger.error(`❌ Permission denied to bind to port ${PORT}`);
      } else {
        logger.error({ err: error }, '❌ Server error');
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      '❌ Failed to start server'
    );
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
