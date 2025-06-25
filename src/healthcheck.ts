#!/usr/bin/env node

/**
 * Health check script for Docker container
 * This script checks if the application is running and database is accessible
 */

import http from 'http';
import https from 'https';
import { prisma } from './config/database';

async function healthCheck(): Promise<void> {
  try {
    // Check if HTTP server is responding
    const httpCheck = new Promise<void>((resolve, reject) => {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const protocol = new URL(baseUrl).protocol; // 'http:' or 'https:'
      const port = process.env.PORT || 3000;
      const healthUrl = `${protocol}//localhost:${port}/health`;
      
      const isHttps = protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const req = httpModule.get(healthUrl, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`HTTP health check failed: ${res.statusCode}`));
        }
      });

      req.on('error', (err) => {
        reject(new Error(`HTTP health check error: ${err.message}`));
      });

      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('HTTP health check timeout'));
      });
    });

    // Check database connectivity
    const dbCheck = async (): Promise<void> => {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        throw new Error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Run both checks concurrently
    await Promise.all([httpCheck, dbCheck()]);
    
    console.log('✅ Health check passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  healthCheck().catch((error) => {
    console.error('❌ Health check error:', error);
    process.exit(1);
  });
}

export { healthCheck };