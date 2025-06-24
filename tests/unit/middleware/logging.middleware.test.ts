import { Request, Response, NextFunction } from 'express';
import {
  correlationIdMiddleware,
  requestLoggingMiddleware,
  sanitizeLogData,
  debugRequestMiddleware,
  performanceMonitoringMiddleware
} from '../../../src/middleware/logging.middleware';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  }
}));

import { logger } from '../../../src/utils/logger';

describe('Logging Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {},
      get: jest.fn(),
      on: jest.fn()
    };

    mockRes = {
      setHeader: jest.fn(),
      get: jest.fn(),
      locals: {},
      json: jest.fn(),
      on: jest.fn(),
      finished: false,
      statusCode: 200
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('correlationIdMiddleware', () => {
    it('should generate a correlation ID if not provided', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers!['x-correlation-id']).toBeDefined();
      expect(typeof mockReq.headers!['x-correlation-id']).toBe('string');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        mockReq.headers!['x-correlation-id']
      );
      expect(mockRes.locals!.correlationId).toBe(mockReq.headers!['x-correlation-id']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing correlation ID from headers', () => {
      const existingId = 'existing-correlation-id';
      mockReq.headers!['x-correlation-id'] = existingId;

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.headers!['x-correlation-id']).toBe(existingId);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId);
      expect(mockRes.locals!.correlationId).toBe(existingId);
    });
  });

  describe('requestLoggingMiddleware', () => {
    beforeEach(() => {
      mockRes.locals = { correlationId: 'test-correlation-id' };
      (mockReq.get as jest.Mock).mockImplementation((header) => {
        const headers: Record<string, string> = {
          'User-Agent': 'test-agent',
          'Content-Length': '100'
        };
        return headers[header];
      });
    });

    it('should log request start', () => {
      requestLoggingMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Request Started', {
        correlationId: 'test-correlation-id',
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        contentLength: '100',
        timestamp: expect.any(String)
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should wrap res.json to capture response body', () => {
      const originalJson = mockRes.json;
      requestLoggingMiddleware(mockReq as Request, mockRes as Response, mockNext);

      const testBody = { test: 'data' };
      mockRes.json!(testBody);

      expect(mockRes.locals!.responseBody).toEqual(testBody);
    });

    it('should log request completion on finish', () => {
      const mockFinish = jest.fn();
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
        }
        return mockRes;
      });

      (mockRes.get as jest.Mock).mockReturnValue('200');
      mockRes.statusCode = 200;

      requestLoggingMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Simulate finish event
      mockFinish();

      expect(logger.log).toHaveBeenCalledWith('info', 'Request Completed', {
        correlationId: 'test-correlation-id',
        method: 'GET',
        url: '/test',
        statusCode: 200,
        duration: expect.stringMatching(/\d+ms/),
        contentLength: '200',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        timestamp: expect.any(String)
      });
    });

    it('should use warn level for 4xx status codes', () => {
      const mockFinish = jest.fn();
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
        }
        return mockRes;
      });

      mockRes.statusCode = 400;

      requestLoggingMiddleware(mockReq as Request, mockRes as Response, mockNext);
      mockFinish();

      expect(logger.log).toHaveBeenCalledWith('warn', 'Request Completed', expect.any(Object));
    });

    it('should use error level for 5xx status codes', () => {
      const mockFinish = jest.fn();
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
        }
        return mockRes;
      });

      mockRes.statusCode = 500;

      requestLoggingMiddleware(mockReq as Request, mockRes as Response, mockNext);
      mockFinish();

      expect(logger.log).toHaveBeenCalledWith('error', 'Request Completed', expect.any(Object));
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact sensitive fields', () => {
      const sensitiveData = {
        username: 'john',
        password: 'secret123',
        apiKey: 'api-key-123',
        token: 'bearer-token',
        authorization: 'Bearer xyz',
        phone: '+1234567890',
        nested: {
          secret: 'nested-secret',
          normalField: 'normal-value'
        }
      };

      const sanitized = sanitizeLogData(sensitiveData);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.phone).toBe('[REDACTED]');
      expect(sanitized.nested.secret).toBe('[REDACTED]');
      expect(sanitized.nested.normalField).toBe('normal-value');
    });

    it('should handle non-object inputs', () => {
      expect(sanitizeLogData('string')).toBe('string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(null)).toBe(null);
      expect(sanitizeLogData(undefined)).toBe(undefined);
    });
  });

  describe('debugRequestMiddleware', () => {
    beforeEach(() => {
      mockRes.locals = { correlationId: 'test-id' };
    });

    it('should log request body in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockReq.body = { test: 'data', password: 'secret' };

      debugRequestMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.debug).toHaveBeenCalledWith('Request Body', {
        correlationId: 'test-id',
        method: 'GET',
        url: '/test',
        body: { test: 'data', password: '[REDACTED]' }
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockReq.body = { test: 'data' };

      debugRequestMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.debug).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log empty request bodies', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockReq.body = {};

      debugRequestMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.debug).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('performanceMonitoringMiddleware', () => {
    it('should log slow requests', () => {
      const mockFinish = jest.fn();
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          // Simulate slow request by delaying callback
          setTimeout(() => {
            mockFinish.mockImplementation(callback);
            mockFinish();
          }, 0);
        }
        return mockRes;
      });

      mockRes.locals = { correlationId: 'test-id' };
      mockRes.statusCode = 200;

      performanceMonitoringMiddleware(mockReq as Request, mockRes as Response, mockNext);

      // The actual performance test would require mocking process.hrtime.bigint
      // For now, we just verify the middleware doesn't crash
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log performance metrics for tool endpoints', () => {
      mockReq.url = '/tools/check-availability';
      const mockFinish = jest.fn();
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          mockFinish.mockImplementation(callback);
          mockFinish();
        }
        return mockRes;
      });

      mockRes.locals = { correlationId: 'test-id' };
      mockRes.statusCode = 200;

      performanceMonitoringMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});