import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';

// Import configuration and setup
import { getConfig } from './config';
import { prisma } from './config/database';

// Import middleware
import {
  securityMiddleware,
  correlationIdMiddleware,
  requestLoggingMiddleware,
  globalErrorHandler,
  notFoundHandler,
  requestTimeout
} from './middleware';

// Import routes
import apiRoutes from './routes';

// Import utilities
import { logger } from './utils/logger';
import { GracefulShutdown } from './utils/gracefulShutdown';
import { HealthChecker } from './utils/healthChecker';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // Security middleware (should be first)
  app.use(securityMiddleware);

  // CORS configuration
  const corsOrigins = process.env.NODE_ENV === 'production' 
    ? [config.BASE_URL, 'https://yourdomain.com'].filter((url): url is string => Boolean(url))
    : true;
    
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID']
  }));

  // Request parsing middleware
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // Store raw body for webhook signature verification if needed
      (req as any).rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // Request middleware
  app.use(correlationIdMiddleware);
  app.use(requestLoggingMiddleware);
  
  // Add performance monitoring middleware from logging module
  const { performanceMonitoringMiddleware, rateLimitLoggingMiddleware, debugRequestMiddleware } = require('./middleware/logging.middleware');
  app.use(performanceMonitoringMiddleware);
  app.use(rateLimitLoggingMiddleware);
  
  // Add debug request middleware for development
  if (process.env.NODE_ENV === 'development') {
    app.use(debugRequestMiddleware);
  }
  
  app.use(requestTimeout(30000)); // 30 second timeout

  // Health check endpoints
  const healthChecker = new HealthChecker();
  
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const simpleHealth = await healthChecker.simpleHealthCheck();
      res.json({
        success: true,
        data: {
          ...simpleHealth,
          version: 'v1'
        }
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        success: false,
        error: 'Health check failed'
      });
    }
  });

  app.get('/health/detailed', async (req: Request, res: Response) => {
    try {
      const detailedHealth = await healthChecker.performHealthCheck();
      const statusCode = detailedHealth.status === 'healthy' ? 200 : 
                        detailedHealth.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        success: detailedHealth.status !== 'unhealthy',
        data: detailedHealth
      });
    } catch (error) {
      logger.error('Detailed health check failed', { error });
      res.status(503).json({
        success: false,
        error: 'Detailed health check failed'
      });
    }
  });

  app.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check if the application is ready to accept traffic
      const healthResult = await healthChecker.performHealthCheck();
      const isReady = healthResult.checks.database.status === 'pass' &&
                     healthResult.checks.server.status !== 'fail';

      if (isReady) {
        res.json({
          success: true,
          data: {
            status: 'ready',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(503).json({
          success: false,
          error: 'Application not ready',
          data: healthResult
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        success: false,
        error: 'Readiness check failed'
      });
    }
  });

  // API routes
  app.use('/api', apiRoutes);

  // Error handling middleware (should be last)
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

/**
 * Start the server with graceful shutdown handling
 */
export async function startServer(): Promise<{ server: Server; shutdown: GracefulShutdown }> {
  const config = getConfig();
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server = app.listen(config.PORT, () => {
      logger.info('Server started successfully', {
        port: config.PORT,
        environment: config.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });

      // Setup graceful shutdown
      const gracefulShutdown = new GracefulShutdown(server, prisma, {
        timeout: 30000, // 30 seconds
        signals: ['SIGTERM', 'SIGINT']
      });

      resolve({ server, shutdown: gracefulShutdown });
    });

    server.on('error', (error) => {
      logger.error('Server startup error', { error });
      reject(error);
    });
  });
}

/**
 * Application initialization
 */
export async function initializeApp(): Promise<void> {
  try {
    logger.info('Initializing application...');
    
    // Validate configuration
    const config = getConfig();
    logger.info('Configuration validated', {
      nodeEnv: config.NODE_ENV,
      port: config.PORT
    });

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');

    // Any other initialization logic can go here
    logger.info('Application initialization complete');
    
  } catch (error) {
    logger.error('Application initialization failed', { error });
    throw error;
  }
}