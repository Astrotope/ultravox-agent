import winston from 'winston';
import path from 'path';
import { getConfig } from '../config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for different log levels
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create log format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create log format for files
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject: any = {
      timestamp,
      level,
      message,
      service: 'restaurant-voice-agent',
      environment: process.env.NODE_ENV || 'development'
    };
    
    if (stack) {
      logObject.stack = stack;
    }
    
    Object.assign(logObject, meta);
    
    return JSON.stringify(logObject);
  })
);

// Create logger instance
export class Logger {
  private static instance: winston.Logger;

  static getInstance(): winston.Logger {
    if (!Logger.instance) {
      const config = getConfig();
      
      // Ensure logs directory exists
      const logsDir = path.join(process.cwd(), 'logs');
      
      const transports: winston.transport[] = [];

      // Console transport (always enabled for visibility)
      const productionConsoleFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
          const prefix = correlationId ? `[${correlationId}]` : '';
          const metaStr = Object.keys(meta).length && config.LOG_LEVEL === 'debug' 
            ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level.toUpperCase()}] ${prefix} ${message}${metaStr}`;
        })
      );
      
      transports.push(
        new winston.transports.Console({
          level: config.LOG_LEVEL,
          format: process.env.NODE_ENV === 'production' ? productionConsoleFormat : consoleFormat
        })
      );

      // File transports for all environments
      transports.push(
        // Error log file
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Combined log file
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          tailable: true
        }),
        
        // HTTP requests log
        new winston.transports.File({
          filename: path.join(logsDir, 'http.log'),
          level: 'http',
          format: fileFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 3,
          tailable: true
        })
      );

      Logger.instance = winston.createLogger({
        level: config.LOG_LEVEL,
        levels: logLevels,
        transports,
        // Handle uncaught exceptions
        exceptionHandlers: [
          new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: fileFormat
          })
        ],
        // Handle unhandled promise rejections
        rejectionHandlers: [
          new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: fileFormat
          })
        ],
        exitOnError: false
      });
    }

    return Logger.instance;
  }

  // Utility methods for structured logging
  static logRequest(req: any, res: any, duration: number) {
    const logger = Logger.getInstance();
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('content-length')
    });
  }

  static logError(error: Error, context?: Record<string, any>) {
    const logger = Logger.getInstance();
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  static logSecurity(event: string, details: Record<string, any>) {
    const logger = Logger.getInstance();
    logger.warn('Security Event', {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  static logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    const logger = Logger.getInstance();
    logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  static logBooking(action: string, bookingData: Record<string, any>) {
    const logger = Logger.getInstance();
    logger.info('Booking Event', {
      action,
      timestamp: new Date().toISOString(),
      ...bookingData
    });
  }

  static logCall(action: string, callData: Record<string, any>) {
    const logger = Logger.getInstance();
    logger.info('Call Event', {
      action,
      timestamp: new Date().toISOString(),
      ...callData
    });
  }
}

// Export the singleton logger instance
export const logger = Logger.getInstance();

// Export individual log methods for convenience
export const logRequest = Logger.logRequest;
export const logError = Logger.logError;
export const logSecurity = Logger.logSecurity;
export const logPerformance = Logger.logPerformance;
export const logBooking = Logger.logBooking;
export const logCall = Logger.logCall;