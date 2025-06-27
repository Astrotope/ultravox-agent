import pino from 'pino';
import chalk from 'chalk';
import { getConfig } from '../config';


// Winston-compatible log levels
const LOG_LEVELS = {
  silent: Infinity,
  error: 50,
  warn: 40,
  info: 30,
  http: 20,
  debug: 10
};

// Custom pretty formatter with emoji patterns
const createPrettyFormatter = () => {
  return (log: any) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const level = pino.levels.labels[log.level] || 'unknown';
    const message = log.msg || '';
    const meta = { ...log };
    delete meta.level;
    delete meta.time;
    delete meta.msg;
    delete meta.pid;
    delete meta.hostname;

    // Enhanced console output with emojis and colors
    const enhancedOutput = getEnhancedOutput(level, message, meta);
    if (enhancedOutput) {
      return enhancedOutput;
    }

    // Fallback to standard format if no pattern matches
    const correlationId = meta.correlationId ? `[${meta.correlationId}]` : '';
    const metaStr = Object.keys(meta).length && isDebugMode() ? ` ${safeStringify(meta)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${correlationId} ${message}${metaStr}`;
  };
};

function getEnhancedOutput(level: string, message: string, meta?: any): string | null {
  if (!shouldEnhanceConsole()) return null;

  try {
    // Server startup and database events - order matters for pattern matching
    if (message.includes('Migration') || message.includes('migration')) {
      return chalk.cyan(`🔄 ${message}`);
    }
    else if (message.includes('shutdown') || message.includes('SIGTERM') || message.includes('Graceful')) {
      return chalk.yellow(`🔄 ${message}`);
    }
    else if (message.includes('Starting') && message.includes('shutdown')) {
      return chalk.yellow(`🔄 ${message}`);
    }
    else if (message.includes('Starting') || message.includes('Server started') || message.includes('started successfully')) {
      return chalk.green(`🚀 ${message}`);
    }
    else if (message.includes('Database') || message.includes('database') || message.includes('Connecting to')) {
      return chalk.blue(`🗄️ ${message}`);
    }
    else if (message.includes('Configuration') || message.includes('Application') || message.includes('initialization')) {
      return chalk.yellow(`⚙️ ${message}`);
    }

    // Call management events
    else if (message.includes('Call slot') || message.includes('capacity limit')) {
      const emoji = level === 'warn' ? '⚠️' : '📞';
      let output = chalk.green(`${emoji} ${message}`);
      if (isDebugMode() && meta) {
        // Use single-line JSON for test compatibility
        output += '\n' + chalk.gray(`   📊 Metrics: ${safeStringify(meta)}`);
      }
      return output;
    }
    
    // Booking events
    else if (message.includes('Booking') && (message.includes('Event') || message.includes('operation') || message.includes('created') || message.includes('cancelled'))) {
      let output = chalk.blue(`🏷️ ${message}`);
      if (isDebugMode() && meta) {
        output += '\n' + chalk.gray(`   📝 Details: ${safeStringify(meta)}`);
      }
      return output;
    }
    
    // Tool Events
    else if ((message.includes('Tool:') || message.includes('Checking availability') || message.includes('Making reservation')) && meta) {
      const toolName = extractToolName(message, meta);
      const timestamp = chalk.gray(`[${new Date().toISOString()}]`);
      let output = chalk.blue(`🔧 ${timestamp} ${toolName} called`);
      
      // Debug mode request details
      if (isDebugMode() && meta && Object.keys(meta).length > 1) {
        const sanitizedMeta = { ...meta };
        delete sanitizedMeta.correlationId;
        output += '\n' + chalk.gray(`   📥 Request: ${safeStringify(sanitizedMeta)}`);
      }
      return output;
    }
    
    // Tool completion/results
    else if (message.includes('completed') && meta?.available !== undefined) {
      let output = chalk.green(`   ✅ Response: ${meta.available ? 'Available' : 'Not available'}`);
      
      if (isDebugMode() && meta) {
        const sanitizedMeta = { ...meta };
        delete sanitizedMeta.correlationId;
        output += '\n' + chalk.gray(`   📤 Full Response: ${safeStringify(sanitizedMeta)}`);
      }
      return output;
    }
    
    // HTTP Requests
    else if (message.includes('Request Started') && meta?.method && meta?.url) {
      const emoji = getMethodEmoji(meta.method);
      const timestamp = chalk.gray(`[${meta.timestamp || new Date().toISOString()}]`);
      const method = chalk.yellow(meta.method);
      const url = chalk.cyan(meta.url);
      return `${emoji} ${timestamp} ${method} ${url}`;
    }
    
    // Test Events
    else if (message.includes('Test') || message.includes('test')) {
      let output = chalk.magenta(`🧪 ${message}`);
      if (isDebugMode() && meta) {
        output += '\n' + chalk.gray(`   ${safeStringify(meta)}`);
      }
      return output;
    }
    
    // Additional patterns from the example logs - specific patterns first
    else if (message.includes('Restaurant booking server') || message.includes('running on port')) {
      return chalk.green(`🍝 ${message}`);
    }
    else if (message.includes('Webhook endpoint:') || message.includes('Stream status:')) {
      return chalk.blue(`📞 ${message}`);
    }
    
    // Webhook Events - more general pattern after specific ones
    else if (message.includes('webhook') || message.includes('Webhook')) {
      let output = chalk.magenta(`🔗 Webhook: ${meta?.event || message}`);
      if (isDebugMode() && meta) {
        output += '\n' + chalk.gray(`   📡 Payload: ${safeStringify(meta)}`);
      }
      return output;
    }
    
    // Error Events
    else if (level === 'error' && message.includes('Error')) {
      let output = chalk.red(`❌ ${message}`);
      if (meta?.stack && isDebugMode()) {
        output += '\n' + chalk.red(`   ${meta.stack}`);
      }
      return output;
    }
    else if (message.includes('Health check:')) {
      return chalk.green(`🏥 ${message}`);
    }
    else if (message.includes('Active calls:') || message.includes('Metrics:')) {
      return chalk.yellow(`📊 ${message}`);
    }
    else if (message.includes('Agent:')) {
      return chalk.cyan(`👤 ${message}`);
    }
    else if (message.includes('Voice:')) {
      return chalk.magenta(`🗣️ ${message}`);
    }
    else if (message.includes('Max Concurrent')) {
      return chalk.yellow(`🔢 ${message}`);
    }
    else if (message.includes('Debug mode')) {
      return chalk.magenta(`🧪 ${message}`);
    }
    else if (message.includes('Resources - Memory')) {
      return chalk.cyan(`📊 ${message}`);
    }
    else if (message.includes('Call registered') || message.includes('Call ended')) {
      return chalk.green(`📞 ${message}`);
    }
    else if (message.includes('Stream event')) {
      return chalk.blue(`📡 ${message}`);
    }
    else if (message.includes('BOOKING CREATED') || message.includes('Booking details')) {
      return chalk.green(`📝 ${message}`);
    }
    else if (message.includes('Generated booking ID')) {
      return chalk.yellow(`🎯 ${message}`);
    }
    else if (message.includes('Headers:') || message.includes('Body:') || message.includes('Sending response:')) {
      return chalk.gray(`🔧 ${message}`);
    }
    else if (message.includes('Date parsing:')) {
      return chalk.blue(`🔧 ${message}`);
    }
    else if (message.includes('Found') && message.includes('available')) {
      return chalk.green(`✅ ${message}`);
    }
    else if (message.includes('Reservation created')) {
      return chalk.green(`✅ ${message}`);
    }
    else if (message.includes('Looking for booking')) {
      return chalk.blue(`🔧 ${message}`);
    }
    
    return null;
  } catch (enhanceError) {
    // If enhancement fails, don't break logging
    console.error('Logger enhancement error:', enhanceError);
    return null;
  }
}

function shouldEnhanceConsole(): boolean {
  return process.env.RICH_CONSOLE_LOGGING !== 'false' && 
         process.env.NODE_ENV !== 'test';
}

function isDebugMode(): boolean {
  return process.env.LOG_LEVEL === 'debug';
}

// Simple circular reference handler
function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    // Handle circular references
    return JSON.stringify(obj, (key, value) => {
      if (value != null && typeof value === "object") {
        if (value.constructor === Object && value.self === value) {
          return "[Circular]";
        }
      }
      return value;
    });
  }
}

function getMethodEmoji(method: string): string {
  const emojis: Record<string, string> = {
    'GET': '🌐',
    'POST': '📝',
    'PUT': '🔄',
    'DELETE': '🗑️',
    'PATCH': '✏️'
  };
  return emojis[method.toUpperCase()] || '📡';
}

function extractToolName(message: string, meta?: any): string {
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

// Winston-compatible wrapper for Pino
class PinoWinstonWrapper {
  private pino: pino.Logger;

  constructor() {
    const config = getConfig();
    
    // Create Pino logger without transport for custom handling
    this.pino = pino({
      level: this.mapWinstonLevelToPino(config.LOG_LEVEL),
      // No transport - we'll handle console output ourselves
    });
  }

  private mapWinstonLevelToPino(winstonLevel: string): string {
    const mapping: Record<string, string> = {
      'silent': 'silent',
      'error': 'error',
      'warn': 'warn', 
      'info': 'info',
      'http': 'debug', // Map Winston's http to Pino's debug
      'debug': 'debug'
    };
    return mapping[winstonLevel] || 'info';
  }

  // Winston-compatible API methods with enhanced console output
  info(message: string, meta?: any) {
    // Log to Pino (for file output, etc.)
    if (meta) {
      this.pino.info(meta, message);
    } else {
      this.pino.info(message);
    }
    
    // Enhanced console output
    this.enhanceConsoleOutput('info', message, meta);
  }

  error(message: string, meta?: any) {
    if (meta) {
      this.pino.error(meta, message);
    } else {
      this.pino.error(message);
    }
    this.enhanceConsoleOutput('error', message, meta);
  }

  warn(message: string, meta?: any) {
    if (meta) {
      this.pino.warn(meta, message);
    } else {
      this.pino.warn(message);
    }
    this.enhanceConsoleOutput('warn', message, meta);
  }

  debug(message: string, meta?: any) {
    if (meta) {
      this.pino.debug(meta, message);
    } else {
      this.pino.debug(message);
    }
    this.enhanceConsoleOutput('debug', message, meta);
  }

  http(message: string, meta?: any) {
    // Map Winston's http level to Pino's debug
    if (meta) {
      this.pino.debug(meta, message);
    } else {
      this.pino.debug(message);
    }
    this.enhanceConsoleOutput('http', message, meta);
  }

  log(level: string, message: string, meta?: any) {
    const pinoLevel = this.mapWinstonLevelToPino(level);
    if (meta) {
      (this.pino as any)[pinoLevel](meta, message);
    } else {
      (this.pino as any)[pinoLevel](message);
    }
    this.enhanceConsoleOutput(level, message, meta);
  }

  // Enhanced console output method
  private enhanceConsoleOutput(level: string, message: string, meta?: any) {
    const enhanced = getEnhancedOutput(level, message, meta);
    if (enhanced) {
      // Split multi-line output and log each line separately
      const lines = enhanced.split('\n');
      lines.forEach(line => console.log(line));
    } else {
      // Fallback to standard format
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const correlationId = meta?.correlationId ? `[${meta.correlationId}]` : '';
      const metaStr = Object.keys(meta || {}).length && isDebugMode() ? ` ${safeStringify(meta)}` : '';
      console.log(`${timestamp} [${level.toUpperCase()}] ${correlationId} ${message}${metaStr}`);
    }
  }

  // Access to native Pino instance for advanced usage
  get native() {
    return this.pino;
  }

  // Child logger creation
  child(bindings: any) {
    const childPino = this.pino.child(bindings);
    const wrapper = new PinoWinstonWrapper();
    wrapper.pino = childPino;
    return wrapper;
  }
}

// Singleton instance
let loggerInstance: PinoWinstonWrapper;

export function createLogger(): PinoWinstonWrapper {
  if (!loggerInstance) {
    loggerInstance = new PinoWinstonWrapper();
  }
  return loggerInstance;
}


// Export logger instance
export const logger = createLogger();