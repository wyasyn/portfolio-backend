import express, { Application } from 'express';
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

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(pinoHttp({ logger }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Swagger documentation
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
app.get('/api/openapi.json', (req, res) => {
  res.sendFile('openapi.json', { root: './src/docs' });
});

// API Routes
app.use(`/api/${config.app.apiVersion}`, routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');

  await prisma.$disconnect();
  redis.disconnect();

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = config.app.port;

app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`🔧 Environment: ${config.app.env}`);

  // Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.error({ err: error }, '❌ Database connection failed');
    process.exit(1);
  }
});

export default app;
