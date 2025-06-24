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

    logger.info('🚀 Restaurant Voice Agent Server is ready!', {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch
    });

    // Log graceful shutdown capability
    logger.info('✅ Graceful shutdown handlers configured');

    // Optional: Log server metrics periodically
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        logger.debug('Server metrics', {
          memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024),
            total: Math.round(memUsage.heapTotal / 1024 / 1024)
          },
          uptime: Math.round(process.uptime())
        });
      }, 60000); // Every minute in development
    }

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