import express, { Express } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';

// Load test environment
config({ path: path.resolve(__dirname, '../../.env.test') });

import apiRoutes from '../../src/routes';
import {
  securityMiddleware,
  correlationIdMiddleware,
  requestLoggingMiddleware,
  globalErrorHandler,
  notFoundHandler,
  requestTimeout
} from '../../src/middleware';

/**
 * Create a test Express application with full middleware stack
 */
export async function createTestApp(): Promise<Express> {
  const app = express();

  // Security middleware
  app.use(securityMiddleware);

  // CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request middleware
  app.use(correlationIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(requestTimeout(5000)); // 5 second timeout for tests

  // Health check endpoint for testing
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: 'test'
      }
    });
  });

  // Mount API routes
  app.use('/api', apiRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

/**
 * Create a minimal test app without middleware for specific testing
 */
export async function createMinimalTestApp(): Promise<Express> {
  const app = express();
  
  app.use(express.json());
  app.use('/api', apiRoutes);
  
  return app;
}