import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logError, logger } from '../utils/logger';
import { ApiResponseUtil } from '../utils/apiResponse';

/**
 * Enhanced async error handling wrapper with logging
 */
export const asyncHandler = <T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the error with request context
      logError(error, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method !== 'GET' ? req.body : undefined
      });
      next(error);
    });
  };
};

/**
 * Application-specific error types
 */
export class ApplicationError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code || 'APPLICATION_ERROR';
    this.details = details;
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Enhanced global error handling middleware
 */
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Log error details
  logError(err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  if (err instanceof ApplicationError) {
    ApiResponseUtil.error(res, err.message, err.statusCode);
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(issue => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code
    }));
    
    ApiResponseUtil.validationError(res, formattedErrors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    ApiResponseUtil.error(res, 'Database validation error', 400);
    return;
  }

  // Handle specific HTTP errors
  if ('statusCode' in err || 'status' in err) {
    const statusCode = (err as any).statusCode || (err as any).status || 500;
    ApiResponseUtil.error(res, err.message, statusCode);
    return;
  }

  // Handle timeout errors
  if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
    ApiResponseUtil.error(res, 'Request timeout', 408);
    return;
  }

  // Handle rate limit errors
  if (err.message.includes('rate limit') || err.message.includes('Too Many Requests')) {
    ApiResponseUtil.error(res, 'Rate limit exceeded', 429);
    return;
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  ApiResponseUtil.error(
    res,
    isDevelopment ? err.message : 'Internal server error',
    500
  );
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case 'P2000':
      ApiResponseUtil.error(res, 'Input value too long', 400);
      break;
    case 'P2001':
      ApiResponseUtil.error(res, 'Record not found', 404);
      break;
    case 'P2002':
      const fields = (err.meta?.target as string[])?.join(', ') || 'field';
      ApiResponseUtil.error(res, `Duplicate value for ${fields}`, 409);
      break;
    case 'P2003':
      ApiResponseUtil.error(res, 'Foreign key constraint violation', 400);
      break;
    case 'P2004':
      ApiResponseUtil.error(res, 'Constraint violation', 400);
      break;
    case 'P2025':
      ApiResponseUtil.error(res, 'Record not found', 404);
      break;
    default:
      logger.error('Unhandled Prisma error', { code: err.code, message: err.message });
      ApiResponseUtil.error(res, 'Database operation failed', 500);
  }
}

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  ApiResponseUtil.notFound(res, `Route ${req.method} ${req.url} not found`);
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logError(new Error(`Request timeout: ${req.method} ${req.url}`), {
          method: req.method,
          url: req.url,
          ip: req.ip,
          timeout: timeoutMs
        });
        ApiResponseUtil.error(res, 'Request timeout', 408);
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};