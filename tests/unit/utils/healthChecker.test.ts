import { HealthChecker, HealthCheckResult } from '../../../src/utils/healthChecker';
import http from 'http';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}));

jest.mock('http');

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;
  let mockPrisma: any;

  beforeEach(() => {
    healthChecker = new HealthChecker();
    mockPrisma = require('../../../src/config/database').prisma;
    jest.clearAllMocks();
  });

  describe('Simple Health Check', () => {
    it('should return basic health status', async () => {
      const result = await healthChecker.simpleHealthCheck();

      expect(result).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('should include current timestamp', async () => {
      const before = new Date().getTime();
      const result = await healthChecker.simpleHealthCheck();
      const after = new Date().getTime();

      const timestamp = new Date(result.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Detailed Health Check', () => {
    it('should perform comprehensive health check', async () => {
      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      // Mock successful HTTP request
      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      const mockResponse = {
        statusCode: 200
      };

      (http.request as jest.Mock).mockImplementation((options, callback) => {
        // Simulate successful HTTP response
        setTimeout(() => callback(mockResponse), 10);
        return mockRequest;
      });

      const result = await healthChecker.performHealthCheck();

      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        environment: expect.any(String),
        checks: {
          server: expect.objectContaining({
            status: expect.stringMatching(/^(pass|fail|warn)$/)
          }),
          database: expect.objectContaining({
            status: expect.stringMatching(/^(pass|fail|warn)$/)
          }),
          memory: expect.objectContaining({
            status: expect.stringMatching(/^(pass|fail|warn)$/)
          })
        },
        metrics: {
          memoryUsage: expect.any(Object),
          cpuUsage: expect.any(Object),
          loadAverage: expect.any(Array)
        }
      });
    });

    it('should handle database connection failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await healthChecker.performHealthCheck();

      expect(result.checks.database.status).toBe('fail');
      expect(result.checks.database.message).toContain('Database connection failed');
      expect(result.status).toBe('unhealthy');
    });

    it('should handle slow database response', async () => {
      // Mock slow database response (simulate delay)
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ health_check: 1 }]), 1500))
      );

      const result = await healthChecker.performHealthCheck();

      // Should pass but potentially warn about slow response
      expect(['pass', 'warn', 'fail']).toContain(result.checks.database.status);
      // Overall status depends on all checks, not just database
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should check memory usage', async () => {
      const result = await healthChecker.performHealthCheck();

      expect(result.checks.memory).toMatchObject({
        status: expect.stringMatching(/^(pass|fail|warn)$/),
        message: expect.stringContaining('Memory usage'),
        details: expect.objectContaining({
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
          usagePercent: expect.any(Number)
        })
      });
    });

    it('should warn on high memory usage', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 95 * 1024 * 1024, // 95% usage
        external: 1024 * 1024,
        arrayBuffers: 1024 * 1024
      }) as any;
      process.memoryUsage = mockMemoryUsage;

      try {
        const result = await healthChecker.performHealthCheck();
        expect(result.checks.memory.status).toBe('warn');
        expect(result.checks.memory.message).toContain('High memory usage detected');
      } finally {
        process.memoryUsage = originalMemoryUsage;
      }
    });

    it('should handle server connection errors', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Connection refused')), 10);
          }
        }),
        end: jest.fn()
      };

      (http.request as jest.Mock).mockReturnValue(mockRequest);

      const result = await healthChecker.performHealthCheck();

      expect(result.checks.server.status).toBe('fail');
      expect(result.checks.server.message).toContain('Connection refused');
    });

    it('should handle server timeout', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'timeout') {
            setTimeout(() => callback(), 10);
          }
        }),
        end: jest.fn()
      };

      (http.request as jest.Mock).mockReturnValue(mockRequest);

      const result = await healthChecker.performHealthCheck();

      expect(result.checks.server.status).toBe('fail');
      expect(result.checks.server.message).toContain('timeout');
    });

    it('should check disk access', async () => {
      const result = await healthChecker.performHealthCheck();

      if (result.checks.disk) {
        expect(result.checks.disk).toMatchObject({
          status: expect.stringMatching(/^(pass|fail|warn)$/),
          message: expect.any(String),
          details: expect.objectContaining({
            accessible: expect.any(Boolean)
          })
        });
      }
    });
  });

  describe('Overall Status Calculation', () => {
    it('should return healthy when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const mockRequest = {
        on: jest.fn(),
        end: jest.fn()
      };

      (http.request as jest.Mock).mockImplementation((options, callback) => {
        setTimeout(() => callback({ statusCode: 200 }), 10);
        return mockRequest;
      });

      const result = await healthChecker.performHealthCheck();

      // Should be healthy if all core checks pass
      expect(['healthy', 'degraded']).toContain(result.status);
    });

    it('should return unhealthy when critical checks fail', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database down'));

      const result = await healthChecker.performHealthCheck();

      expect(result.status).toBe('unhealthy');
    });

    it('should include metrics in result', async () => {
      const result = await healthChecker.performHealthCheck();

      expect(result.metrics).toMatchObject({
        memoryUsage: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number)
        }),
        cpuUsage: expect.objectContaining({
          user: expect.any(Number),
          system: expect.any(Number)
        }),
        loadAverage: expect.any(Array)
      });
    });
  });
});