/**
 * Enhanced health check system for the restaurant voice agent
 */

import http from 'http';
import { prisma } from '../config/database';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    server: HealthCheck;
    database: HealthCheck;
    memory: HealthCheck;
    disk?: HealthCheck;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    loadAverage: number[];
  };
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  duration?: number;
  message?: string;
  details?: any;
}

export class HealthChecker {
  private readonly healthThresholds = {
    memoryUsagePercent: 90, // Warn if memory usage > 90%
    responseTime: 5000, // Warn if response time > 5s
    dbResponseTime: 1000 // Warn if DB response > 1s
  };

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Initialize result structure
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: { status: 'fail' },
        database: { status: 'fail' },
        memory: { status: 'fail' }
      },
      metrics: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: (process as any).loadavg ? (process as any).loadavg() : [0, 0, 0]
      }
    };

    // Perform all health checks
    const checks = await Promise.allSettled([
      this.checkServer(),
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    // Process results
    result.checks.server = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'fail', message: 'Server check failed' };
    result.checks.database = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'fail', message: 'Database check failed' };
    result.checks.memory = checks[2].status === 'fulfilled' ? checks[2].value : { status: 'fail', message: 'Memory check failed' };
    
    if (checks[3].status === 'fulfilled') {
      result.checks.disk = checks[3].value;
    }

    // Determine overall status
    result.status = this.calculateOverallStatus(result.checks);

    return result;
  }

  private async checkServer(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    return new Promise<HealthCheck>((resolve) => {
      const options = {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: '/health',
        method: 'GET',
        timeout: this.healthThresholds.responseTime
      };

      const req = http.request(options, (res) => {
        const duration = Date.now() - startTime;
        const status = res.statusCode === 200 
          ? (duration > this.healthThresholds.responseTime ? 'warn' : 'pass')
          : 'fail';

        resolve({
          status,
          duration,
          message: `Server responded with ${res.statusCode} in ${duration}ms`,
          details: { statusCode: res.statusCode, responseTime: duration }
        });
      });

      req.on('error', (error) => {
        resolve({
          status: 'fail',
          duration: Date.now() - startTime,
          message: `Server connection failed: ${error.message}`,
          details: { error: error.message }
        });
      });

      req.on('timeout', () => {
        resolve({
          status: 'fail',
          duration: Date.now() - startTime,
          message: 'Server response timeout',
          details: { timeout: this.healthThresholds.responseTime }
        });
      });

      req.end();
    });
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1 as health_check`;
      const duration = Date.now() - startTime;
      
      const status = duration > this.healthThresholds.dbResponseTime ? 'warn' : 'pass';
      
      return {
        status,
        duration,
        message: `Database connected in ${duration}ms`,
        details: { responseTime: duration }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        duration,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { 
          error: error instanceof Error ? error.message : error,
          responseTime: duration
        }
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100;
    const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    let status: HealthCheck['status'] = 'pass';
    let message = `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent}%)`;

    if (usagePercent > this.healthThresholds.memoryUsagePercent) {
      status = 'warn';
      message += ' - High memory usage detected';
    }

    return {
      status,
      message,
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        usagePercent
      }
    };
  }

  private async checkDisk(): Promise<HealthCheck> {
    // Basic disk space check (simplified for cross-platform compatibility)
    try {
      const fs = await import('fs');
      const stats = fs.statSync('.');
      
      return {
        status: 'pass',
        message: 'Disk access successful',
        details: { accessible: true }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Disk access failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { accessible: false, error: error instanceof Error ? error.message : error }
      };
    }
  }

  private calculateOverallStatus(checks: HealthCheckResult['checks']): HealthCheckResult['status'] {
    const checkValues = Object.values(checks).filter((check): check is HealthCheck => check !== undefined);
    
    const hasFailed = checkValues.some(check => check.status === 'fail');
    const hasWarning = checkValues.some(check => check.status === 'warn');

    if (hasFailed) return 'unhealthy';
    if (hasWarning) return 'degraded';
    return 'healthy';
  }

  /**
   * Simple health check for basic endpoints
   */
  async simpleHealthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}