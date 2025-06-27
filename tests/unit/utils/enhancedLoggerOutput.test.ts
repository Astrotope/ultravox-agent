import winston from 'winston';

// Create a capturable console logger instead of mocking
class TestableEnhancedLogger {
  private winston: winston.Logger;
  public capturedOutput: string[] = [];

  constructor(winstonInstance: winston.Logger) {
    this.winston = winstonInstance;
  }

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

  private enhanceConsoleOutput(level: string, message: string, meta?: any) {
    if (!this.shouldEnhanceConsole()) return;

    try {
      // Call management events
      if (message.includes('Call slot') || message.includes('capacity limit')) {
        const emoji = level === 'warn' ? '⚠️' : '📞';
        const output = `${emoji} ${message}`;
        this.captureOutput(output);
        if (this.isDebugMode() && meta) {
          this.captureOutput(`   📊 Metrics: ${JSON.stringify(meta, null, 2)}`);
        }
      }
      // Booking events
      else if (message.includes('Booking') && (message.includes('Event') || message.includes('operation') || message.includes('created') || message.includes('cancelled'))) {
        const output = `🏷️ ${message}`;
        this.captureOutput(output);
        if (this.isDebugMode() && meta) {
          this.captureOutput(`   📝 Details: ${JSON.stringify(meta, null, 2)}`);
        }
      }
      // Tool Events
      else if ((message.includes('Tool:') || message.includes('Checking availability') || message.includes('Making reservation')) && meta) {
        const toolName = this.extractToolName(message, meta);
        const timestamp = new Date().toISOString();
        const output = `🔧 [${timestamp}] ${toolName} called`;
        this.captureOutput(output);
        
        if (this.isDebugMode() && meta && Object.keys(meta).length > 1) {
          const sanitizedMeta = { ...meta };
          delete sanitizedMeta.correlationId;
          this.captureOutput(`   📥 Request: ${JSON.stringify(sanitizedMeta, null, 2)}`);
        }
      }
      // Tool completion/results
      else if (message.includes('completed') && meta?.available !== undefined) {
        const resultMsg = `   ✅ Response: ${meta.available ? 'Available' : 'Not available'}`;
        this.captureOutput(resultMsg);
        
        if (this.isDebugMode() && meta) {
          const sanitizedMeta = { ...meta };
          delete sanitizedMeta.correlationId;
          this.captureOutput(`   📤 Full Response: ${JSON.stringify(sanitizedMeta, null, 2)}`);
        }
      }
      // HTTP Requests
      else if (message.includes('Request Started') && meta?.method && meta?.url) {
        const emoji = this.getMethodEmoji(meta.method);
        const timestamp = meta.timestamp || new Date().toISOString();
        const output = `${emoji} [${timestamp}] ${meta.method} ${meta.url}`;
        this.captureOutput(output);
      }
      // Test Events
      else if (message.includes('Test') || message.includes('test')) {
        const output = `🧪 ${message}`;
        this.captureOutput(output);
        if (this.isDebugMode() && meta) {
          this.captureOutput(`   ${JSON.stringify(meta, null, 2)}`);
        }
      }
      // Error Events
      else if (level === 'error' && message.includes('Error')) {
        const output = `❌ ${message}`;
        this.captureOutput(output);
        if (meta?.stack && this.isDebugMode()) {
          this.captureOutput(`   ${meta.stack}`);
        }
      }
    } catch (enhanceError) {
      this.captureOutput(`Enhancement error: ${enhanceError instanceof Error ? enhanceError.message : 'Unknown error'}`);
    }
  }

  private captureOutput(text: string) {
    this.capturedOutput.push(text);
  }

  private shouldEnhanceConsole(): boolean {
    return process.env.RICH_CONSOLE_LOGGING !== 'false';
  }

  private isDebugMode(): boolean {
    return process.env.LOG_LEVEL === 'debug';
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

  // Test helper methods
  clearCapturedOutput() {
    this.capturedOutput = [];
  }

  getLastOutput(): string | undefined {
    return this.capturedOutput[this.capturedOutput.length - 1];
  }

  getAllOutput(): string[] {
    return [...this.capturedOutput];
  }

  hasOutputContaining(text: string): boolean {
    return this.capturedOutput.some(output => output.includes(text));
  }
}

describe('Enhanced Logger - Output Capture Tests', () => {
  let logger: TestableEnhancedLogger;
  let mockWinstonLogger: any;

  beforeEach(() => {
    // Enable enhanced logging for tests
    process.env.RICH_CONSOLE_LOGGING = 'true';
    process.env.NODE_ENV = 'development';
    
    // Create mock Winston logger
    mockWinstonLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      http: jest.fn(),
      log: jest.fn(),
    };
    
    // Create test logger instance
    logger = new TestableEnhancedLogger(mockWinstonLogger);
  });

  afterEach(() => {
    logger.clearCapturedOutput();
  });

  describe('Call Management Events', () => {
    it('should enhance call slot reservation logs', () => {
      logger.debug('Call slot reserved', {
        activeCallCount: 2,
        semaphore: 1,
        maxConcurrentCalls: 5,
        currentLoad: 3
      });

      expect(logger.getLastOutput()).toBe('📞 Call slot reserved');
    });

    it('should enhance call capacity warnings', () => {
      logger.warn('Call slot reservation denied - capacity limit reached', {
        activeCallCount: 5,
        semaphore: 0,
        maxConcurrentCalls: 5,
        currentLoad: 5
      });

      expect(logger.getLastOutput()).toBe('⚠️ Call slot reservation denied - capacity limit reached');
    });
  });

  describe('Booking Events', () => {
    it('should enhance booking event logs', () => {
      logger.info('Booking Event', {
        action: 'created',
        code: 'ABC123',
        guest: 'John Smith'
      });

      expect(logger.getLastOutput()).toBe('🏷️ Booking Event');
    });

    it('should enhance booking operation logs', () => {
      logger.info('Booking operation completed', {
        operation: 'create',
        confirmationCode: 'XYZ789'
      });

      expect(logger.getLastOutput()).toBe('🏷️ Booking operation completed');
    });
  });

  describe('Tool Events', () => {
    it('should enhance tool availability check logs', () => {
      logger.info('Checking availability', {
        correlationId: 'test-correlation',
        date: '2025-06-28',
        time: '19:00',
        partySize: 4
      });

      const output = logger.getLastOutput();
      expect(output).toContain('🔧');
      expect(output).toContain('check-availability called');
      expect(output).toMatch(/\[20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/); // Timestamp format
    });

    it('should enhance tool completion results', () => {
      logger.info('Availability check completed', {
        available: true,
        correlationId: 'test-correlation'
      });

      expect(logger.getLastOutput()).toBe('   ✅ Response: Available');
    });

    it('should show unavailable results', () => {
      logger.info('Availability check completed', {
        available: false,
        correlationId: 'test-correlation'
      });

      expect(logger.getLastOutput()).toBe('   ✅ Response: Not available');
    });
  });

  describe('HTTP Request Events', () => {
    it('should enhance HTTP request logs with method emojis', () => {
      const mockTimestamp = '2025-06-27T10:30:15.123Z';
      
      logger.info('Request Started', {
        method: 'GET',
        url: '/tools/check-availability',
        timestamp: mockTimestamp,
        correlationId: 'test-correlation'
      });

      expect(logger.getLastOutput()).toBe(`🌐 [${mockTimestamp}] GET /tools/check-availability`);
    });

    it('should use correct emoji for POST requests', () => {
      const mockTimestamp = '2025-06-27T10:30:15.123Z';
      
      logger.info('Request Started', {
        method: 'POST',
        url: '/tools/make-reservation',
        timestamp: mockTimestamp
      });

      expect(logger.getLastOutput()).toBe(`📝 [${mockTimestamp}] POST /tools/make-reservation`);
    });
  });

  describe('Error Events', () => {
    it('should enhance error logs with error emoji', () => {
      logger.error('Error checking availability', {
        message: 'Database connection failed',
        stack: 'Error stack trace'
      });

      expect(logger.getLastOutput()).toBe('❌ Error checking availability');
    });
  });

  describe('Debug Mode Features', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'debug';
    });

    it('should show request details in debug mode for tool calls', () => {
      logger.info('Checking availability', {
        correlationId: 'test-correlation',
        date: '2025-06-28',
        time: '19:00',
        partySize: 4
      });

      const outputs = logger.getAllOutput();
      
      // Should have tool call output
      expect(outputs[0]).toContain('🔧');
      expect(outputs[0]).toContain('check-availability called');
      
      // Should have request details (without correlationId)
      expect(outputs[1]).toContain('📥 Request:');
      expect(outputs[1]).toContain('"date": "2025-06-28"');
      expect(outputs[1]).toContain('"time": "19:00"');
      expect(outputs[1]).toContain('"partySize": 4');
      expect(outputs[1]).not.toContain('correlationId');
    });

    it('should show response details in debug mode', () => {
      logger.info('Availability check completed', {
        available: true,
        correlationId: 'test-correlation',
        slots: [{ time: '19:00', available: true }]
      });

      const outputs = logger.getAllOutput();
      
      expect(outputs[0]).toBe('   ✅ Response: Available');
      expect(outputs[1]).toContain('📤 Full Response:');
      expect(outputs[1]).toContain('"available": true');
      expect(outputs[1]).toContain('"slots"');
      expect(outputs[1]).not.toContain('correlationId');
    });
  });

  describe('Environment Controls', () => {
    it('should not enhance console output when RICH_CONSOLE_LOGGING=false', () => {
      process.env.RICH_CONSOLE_LOGGING = 'false';
      
      logger.debug('Call slot reserved', {
        activeCallCount: 2
      });

      // Should not capture any enhanced output
      expect(logger.getAllOutput()).toHaveLength(0);
      
      // But should still call Winston
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Call slot reserved', { activeCallCount: 2 });
    });
  });

  describe('Error Handling', () => {
    it('should handle enhancement errors gracefully', () => {
      // Create a logger that will cause an error in JSON.stringify
      const circularObj: any = { activeCallCount: 1 };
      circularObj.self = circularObj; // Create circular reference
      
      logger.debug('Call slot reserved', circularObj);

      // Should capture error output instead of crashing
      expect(logger.hasOutputContaining('Enhancement error:')).toBe(true);
      
      // Should still call Winston
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Call slot reserved', circularObj);
    });
  });

  describe('Winston Integration', () => {
    it('should always call Winston logger methods', () => {
      logger.info('Test message', { test: 'data' });
      logger.error('Test error', { error: 'details' });
      logger.warn('Test warning', { warning: 'info' });
      logger.debug('Test debug', { debug: 'info' });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', { test: 'data' });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Test error', { error: 'details' });
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Test warning', { warning: 'info' });
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Test debug', { debug: 'info' });
    });
  });
});