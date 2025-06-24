#!/usr/bin/env node

/**
 * Enhanced Restaurant Voice Agent Server
 * Production-ready server with graceful shutdown, health checks, and comprehensive error handling
 */

import { config } from 'dotenv';

// Load environment variables first
config();

import { initializeApp, startServer } from './app';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    // Initialize application components
    await initializeApp();

    // Start server with graceful shutdown
    const { server, shutdown } = await startServer();

    // Log startup completion with environment info
    const config = require('./config/env').getConfig();
    logger.info('Restaurant Voice Agent Server started successfully', {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      environment: process.env.NODE_ENV || 'development',
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
      maxConcurrentCalls: config.MAX_CONCURRENT_CALLS,
      databaseConnected: true,
      gracefulShutdown: true,
      startupTime: new Date().toISOString()
    });

    // Log important configuration in production
    if (process.env.NODE_ENV === 'production') {
      logger.info('Production configuration active', {
        cors: 'enabled',
        rateLimiting: 'enabled',
        requestTimeout: '30s',
        healthChecks: 'enabled',
        correlationTracking: 'enabled'
      });
    }

    // Log server metrics periodically
    const metricsInterval = process.env.NODE_ENV === 'production' ? 300000 : 60000; // 5 min prod, 1 min dev
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      logger.info('Server health metrics', {
        memory: {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000), // Convert to ms
          system: Math.round(cpuUsage.system / 1000)
        },
        uptime: `${Math.round(process.uptime())}s`,
        timestamp: new Date().toISOString()
      });
    }, metricsInterval);

  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Exit with error code
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections at the process level
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Process will exit', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection - Process will exit', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  });
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error('Application startup failed', {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});