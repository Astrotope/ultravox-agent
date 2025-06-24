import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export interface ShutdownOptions {
  timeout?: number; // Maximum time to wait for graceful shutdown (ms)
  signals?: string[]; // Process signals to listen for
}

export class GracefulShutdown {
  private server: Server;
  private prisma: PrismaClient;
  private isShuttingDown = false;
  private timeout: number;
  private signals: string[];

  constructor(
    server: Server,
    prisma: PrismaClient,
    options: ShutdownOptions = {}
  ) {
    this.server = server;
    this.prisma = prisma;
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.signals = options.signals || ['SIGTERM', 'SIGINT'];

    this.setupSignalHandlers();
    this.setupExceptionHandlers();
  }

  private setupSignalHandlers(): void {
    this.signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, initiating graceful shutdown`);
        this.shutdown(signal);
      });
    });
  }

  private setupExceptionHandlers(): void {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString()
      });
      this.shutdown('unhandledRejection');
    });
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring additional signal');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Starting graceful shutdown sequence due to ${signal}`);

    // Set a timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.timeout);

    try {
      // 1. Stop accepting new requests
      logger.info('Stopping server from accepting new connections...');
      this.server.close(async (err) => {
        if (err) {
          logger.error('Error closing server', { error: err.message });
        } else {
          logger.info('Server stopped accepting new connections');
        }

        try {
          // 2. Close database connections
          await this.closeDatabaseConnections();

          // 3. Perform any other cleanup
          await this.performAdditionalCleanup();

          logger.info('Graceful shutdown completed successfully');
          clearTimeout(forceShutdownTimeout);
          process.exit(0);
        } catch (cleanupError) {
          logger.error('Error during cleanup', { 
            error: cleanupError instanceof Error ? cleanupError.message : cleanupError 
          });
          clearTimeout(forceShutdownTimeout);
          process.exit(1);
        }
      });
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : error
      });
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    logger.info('Closing database connections...');
    try {
      await this.prisma.$disconnect();
      logger.info('Database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  private async performAdditionalCleanup(): Promise<void> {
    logger.info('Performing additional cleanup...');
    
    // Close any file descriptors, streams, etc.
    // Cancel any pending timers
    // Clean up temporary files
    
    // Example: Close log streams if needed
    try {
      // Any additional cleanup logic can be added here
      logger.info('Additional cleanup completed');
    } catch (error) {
      logger.error('Error during additional cleanup', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Check if the shutdown process is in progress
   */
  public isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Manually trigger shutdown (useful for testing)
   */
  public async manualShutdown(): Promise<void> {
    return this.shutdown('manual');
  }
}