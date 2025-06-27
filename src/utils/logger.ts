import winston from 'winston';
import path from 'path';
import chalk from 'chalk';
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

// Enhanced Logger Wrapper with backwards compatibility
class EnhancedLoggerWrapper {
  private winston: winston.Logger;

  constructor(winstonInstance: winston.Logger) {
    this.winston = winstonInstance;
  }

  // Backwards compatible Winston methods
  info(message: string, meta?: any) {
    this.winston.info(message, meta);
    this.enhanceConsoleOutput('info', message, meta);
  }

  error(message: string, meta?: any) {
    this.winston.error(message, meta);
    this.enhanceConsoleOutput('error', message, meta);
  }

  warn(message: string, meta?: any) {
    this.winston.warn(message, meta);
    this.enhanceConsoleOutput('warn', message, meta);
  }

  debug(message: string, meta?: any) {
    this.winston.debug(message, meta);
    this.enhanceConsoleOutput('debug', message, meta);
  }

  http(message: string, meta?: any) {
    this.winston.http(message, meta);
    this.enhanceConsoleOutput('http', message, meta);
  }

  log(level: string, message: string, meta?: any) {
    this.winston.log(level, message, meta);
    this.enhanceConsoleOutput(level, message, meta);
  }

  // Enhanced console output with emojis and colors
  private enhanceConsoleOutput(level: string, message: string, meta?: any) {
    if (!this.shouldEnhanceConsole()) return;

    try {
      // Call management events (actual patterns from callManagerService)
      if (message.includes('Call slot') || message.includes('capacity limit')) {
        const emoji = level === 'warn' ? '⚠️' : '📞';
        console.log(chalk.green(`${emoji} ${message}`));
        if (this.isDebugMode() && meta) {
          console.log(chalk.gray(`   📊 Metrics: ${JSON.stringify(meta, null, 2)}`));
        }
      }
      
      // Booking events (actual patterns from bookingService)
      else if (message.includes('Booking') && (message.includes('Event') || message.includes('operation') || message.includes('created') || message.includes('cancelled'))) {
        console.log(chalk.blue(`🏷️ ${message}`));
        if (this.isDebugMode() && meta) {
          console.log(chalk.gray(`   📝 Details: ${JSON.stringify(meta, null, 2)}`));
        }
      }
      
      // Tool Events
      else if ((message.includes('Tool:') || message.includes('Checking availability') || message.includes('Making reservation')) && meta) {
        const toolName = this.extractToolName(message, meta);
        const timestamp = chalk.gray(`[${new Date().toISOString()}]`);
        console.log(chalk.blue(`🔧 ${timestamp} ${toolName} called`));
        
        // Debug mode request details
        if (this.isDebugMode() && meta && Object.keys(meta).length > 1) {
          const sanitizedMeta = { ...meta };
          delete sanitizedMeta.correlationId;
          console.log(chalk.gray(`   📥 Request: ${JSON.stringify(sanitizedMeta, null, 2)}`));
        }
      }
      
      // Tool completion/results
      else if (message.includes('completed') && meta?.available !== undefined) {
        const resultMsg = `   ✅ Response: ${meta.available ? 'Available' : 'Not available'}`;
        console.log(chalk.green(resultMsg));
        
        if (this.isDebugMode() && meta) {
          const sanitizedMeta = { ...meta };
          delete sanitizedMeta.correlationId;
          console.log(chalk.gray(`   📤 Full Response: ${JSON.stringify(sanitizedMeta, null, 2)}`));
        }
      }
      
      // HTTP Requests
      else if (message.includes('Request Started') && meta?.method && meta?.url) {
        const emoji = this.getMethodEmoji(meta.method);
        const timestamp = chalk.gray(`[${meta.timestamp || new Date().toISOString()}]`);
        const method = chalk.yellow(meta.method);
        const url = chalk.cyan(meta.url);
        console.log(`${emoji} ${timestamp} ${method} ${url}`);
      }
      
      // Test Events
      else if (message.includes('Test') || message.includes('test')) {
        console.log(chalk.magenta(`🧪 ${message}`));
        if (this.isDebugMode() && meta) {
          console.log(chalk.gray(`   ${JSON.stringify(meta, null, 2)}`));
        }
      }
      
      // Webhook Events
      else if (message.includes('webhook') || message.includes('Webhook')) {
        console.log(chalk.magenta(`🔗 Webhook: ${meta?.event || message}`));
        if (this.isDebugMode() && meta) {
          console.log(chalk.gray(`   📡 Payload: ${JSON.stringify(meta, null, 2)}`));
        }
      }
      
      // Server startup and database events - order matters for pattern matching
      else if (message.includes('Migration') || message.includes('migration')) {
        console.log(chalk.cyan(`🔄 ${message}`));
      }
      else if (message.includes('shutdown') || message.includes('SIGTERM') || message.includes('Graceful')) {
        console.log(chalk.yellow(`🔄 ${message}`));
      }
      else if (message.includes('Starting') && message.includes('shutdown')) {
        console.log(chalk.yellow(`🔄 ${message}`));
      }
      else if (message.includes('Starting') || message.includes('Server started') || message.includes('started successfully')) {
        console.log(chalk.green(`🚀 ${message}`));
      }
      else if (message.includes('Database') || message.includes('database') || message.includes('Connecting to')) {
        console.log(chalk.blue(`🗄️ ${message}`));
      }
      else if (message.includes('Configuration') || message.includes('Application') || message.includes('initialization')) {
        console.log(chalk.yellow(`⚙️ ${message}`));
      }
      
      // Error Events
      else if (level === 'error' && message.includes('Error')) {
        console.log(chalk.red(`❌ ${message}`));
        if (meta?.stack && this.isDebugMode()) {
          console.log(chalk.red(`   ${meta.stack}`));
        }
      }
      
    } catch (enhanceError) {
      // If enhancement fails, don't break logging
      console.error('Logger enhancement error:', enhanceError);
    }
  }

  private shouldEnhanceConsole(): boolean {
    return process.env.RICH_CONSOLE_LOGGING !== 'false' && 
           process.env.NODE_ENV !== 'test';
  }

  private isDebugMode(): boolean {
    const config = getConfig();
    return config.LOG_LEVEL === 'debug';
  }

  private getMethodEmoji(method: string): string {
    const emojis: Record<string, string> = {
      'GET': '🌐',
      'POST': '📝', 
      'PUT': '🔄',
      'DELETE': '🗑️',
      'PATCH': '✏️'
    };
    return emojis[method.toUpperCase()] || '📡';
  }

  private extractToolName(message: string, meta?: any): string {
    if (meta?.toolName) return meta.toolName;
    if (message.includes('check-availability') || message.includes('Checking availability')) return 'check-availability';
    if (message.includes('make-reservation') || message.includes('Making reservation')) return 'make-reservation';
    if (message.includes('modify-reservation')) return 'modify-reservation';
    if (message.includes('cancel-reservation')) return 'cancel-reservation';
    if (message.includes('get-booking-details') || message.includes('check-booking')) return 'get-booking-details';
    if (message.includes('daily-specials')) return 'daily-specials';
    if (message.includes('opening-hours')) return 'opening-hours';
    if (message.includes('transfer-call')) return 'transfer-call';
    return 'unknown-tool';
  }
}

// Export the enhanced logger instance (backwards compatible)
export const logger = new EnhancedLoggerWrapper(Logger.getInstance());

// Export individual log methods for convenience
export const logRequest = Logger.logRequest;
export const logError = Logger.logError;
export const logSecurity = Logger.logSecurity;
export const logPerformance = Logger.logPerformance;
export const logBooking = Logger.logBooking;
export const logCall = Logger.logCall;