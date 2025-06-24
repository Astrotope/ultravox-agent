import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest, logger } from '../utils/logger';

/**
 * Request correlation ID middleware
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate or use existing correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Add to request and response headers
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Store in res.locals for easy access
  res.locals.correlationId = correlationId;
  
  next();
};

/**
 * Enhanced request logging middleware
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const correlationId = res.locals.correlationId;
  
  // Log request start
  logger.info('Request Started', {
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString()
  });
  
  // Capture original json method to log response data
  const originalJson = res.json;
  res.json = function(body: any) {
    res.locals.responseBody = body;
    return originalJson.call(this, body);
  };
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const contentLength = res.get('Content-Length');
    
    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : 
                    statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'Request Completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration}ms`,
      contentLength,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Log response body for errors (excluding sensitive data)
    if (statusCode >= 400 && res.locals.responseBody) {
      logger.debug('Error Response Body', {
        correlationId,
        statusCode,
        body: res.locals.responseBody
      });
    }
  });
  
  // Log when request is closed/aborted
  req.on('close', () => {
    if (!res.finished) {
      logger.warn('Request Aborted', {
        correlationId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        duration: `${Date.now() - startTime}ms`
      });
    }
  });
  
  next();
};

/**
 * Sensitive data filtering for logs
 */
export const sanitizeLogData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'x-api-key',
    'creditCard',
    'ssn',
    'phone' // Might contain sensitive data
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    // Check for exact field name
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
    // Also check for lowercase version
    const lowerField = field.toLowerCase();
    if (lowerField in sanitized) {
      sanitized[lowerField] = '[REDACTED]';
    }
    // Check if any key matches (case-insensitive)
    for (const key in sanitized) {
      if (key.toLowerCase() === field.toLowerCase()) {
        sanitized[key] = '[REDACTED]';
      }
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
};

/**
 * Debug request body logging (development only)
 */
export const debugRequestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === 'development' && req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request Body', {
      correlationId: res.locals.correlationId,
      method: req.method,
      url: req.url,
      body: sanitizeLogData(req.body)
    });
  }
  
  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      logger.warn('Slow Request', {
        correlationId: res.locals.correlationId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }
    
    // Log performance metrics for specific endpoints
    if (req.url.startsWith('/tools/') || req.url.startsWith('/webhook/')) {
      logger.info('Performance Metric', {
        correlationId: res.locals.correlationId,
        endpoint: req.url,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        category: req.url.startsWith('/tools/') ? 'tool' : 'webhook'
      });
    }
  });
  
  next();
};

/**
 * Rate limit logging middleware
 */
export const rateLimitLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check for rate limit headers
  const rateLimitLimit = res.get('X-RateLimit-Limit');
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  const rateLimitReset = res.get('X-RateLimit-Reset');
  
  res.on('finish', () => {
    if (rateLimitLimit && rateLimitRemaining) {
      const remaining = parseInt(rateLimitRemaining, 10);
      const limit = parseInt(rateLimitLimit, 10);
      const usagePercentage = ((limit - remaining) / limit) * 100;
      
      // Log when rate limit usage is high
      if (usagePercentage > 80) {
        logger.warn('High Rate Limit Usage', {
          correlationId: res.locals.correlationId,
          ip: req.ip,
          endpoint: req.url,
          usage: `${usagePercentage.toFixed(1)}%`,
          remaining,
          limit,
          resetTime: rateLimitReset
        });
      }
    }
    
    // Log rate limit exceeded
    if (res.statusCode === 429) {
      logger.warn('Rate Limit Exceeded', {
        correlationId: res.locals.correlationId,
        ip: req.ip,
        url: req.url,
        userAgent: req.get('User-Agent'),
        resetTime: rateLimitReset
      });
    }
  });
  
  next();
};