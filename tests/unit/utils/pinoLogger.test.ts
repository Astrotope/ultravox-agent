import { logger, createLogger } from '../../../src/utils/pinoLogger';

// Create a capturable console logger for testing
class TestablePinoLogger {
  private logger: any;
  public capturedOutput: string[] = [];
  private originalConsoleLog: any;

  constructor() {
    this.logger = createLogger();
    
    // Mock console.log to capture output
    this.originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      this.capturedOutput.push(args.join(' '));
    };
  }

  // Wrapper methods that call the actual logger
  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  http(message: string, meta?: any) {
    this.logger.http(message, meta);
  }

  log(level: string, message: string, meta?: any) {
    this.logger.log(level, message, meta);
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

  cleanup() {
    console.log = this.originalConsoleLog;
  }
}

describe('Pino Logger - Rich Console Output Tests', () => {
  let testLogger: TestablePinoLogger;

  beforeEach(() => {
    // Enable enhanced logging for tests
    process.env.RICH_CONSOLE_LOGGING = 'true';
    process.env.NODE_ENV = 'development';
    
    testLogger = new TestablePinoLogger();
  });

  afterEach(() => {
    testLogger.clearCapturedOutput();
    testLogger.cleanup();
  });

  describe('Winston API Compatibility', () => {
    it('should maintain Winston API compatibility', () => {
      expect(testLogger.info).toBeDefined();
      expect(testLogger.error).toBeDefined();
      expect(testLogger.warn).toBeDefined();
      expect(testLogger.debug).toBeDefined();
      expect(testLogger.http).toBeDefined();
      expect(testLogger.log).toBeDefined();
    });

    it('should call logger methods without throwing', () => {
      expect(() => {
        testLogger.info('Test message', { test: 'data' });
        testLogger.error('Test error', { error: 'details' });
        testLogger.warn('Test warning', { warning: 'info' });
        testLogger.debug('Test debug', { debug: 'info' });
        testLogger.http('Test http', { http: 'info' });
        testLogger.log('info', 'Test log', { log: 'info' });
      }).not.toThrow();
    });
  });

  describe('Server Startup Events', () => {
    it('should enhance server startup messages', () => {
      testLogger.info('Starting Twilio Ultravox Agent Server...');
      const actual = testLogger.getLastOutput();
      // Test the actual enhanced output with ANSI color codes
      const expected = '\x1b[32m🚀 Starting Twilio Ultravox Agent Server...\x1b[39m';
      expect(actual).toBe(expected);
    });

    it('should enhance server started messages', () => {
      testLogger.info('Server started successfully');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m🚀 Server started successfully\x1b[39m');
    });

    it('should enhance application started messages', () => {
      testLogger.info('Restaurant Voice Agent Server started successfully');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m🚀 Restaurant Voice Agent Server started successfully\x1b[39m');
    });
  });

  describe('Database Events', () => {
    it('should enhance database connection messages', () => {
      testLogger.info('Connecting to database at pgvector-astrotope.sliplane.app:5432...');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m🗄️ Connecting to database at pgvector-astrotope.sliplane.app:5432...\x1b[39m');
    });

    it('should enhance database established messages', () => {
      testLogger.info('Database connection established');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m🗄️ Database connection established\x1b[39m');
    });
  });

  describe('Configuration Events', () => {
    it('should enhance configuration messages', () => {
      testLogger.info('Configuration validated');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m⚙️ Configuration validated\x1b[39m');
    });

    it('should enhance application initialization messages', () => {
      testLogger.info('Application initialization complete');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m⚙️ Application initialization complete\x1b[39m');
    });
  });

  describe('Migration Events', () => {
    it('should enhance database migration messages', () => {
      testLogger.info('Running database migrations...');
      expect(testLogger.getLastOutput()).toBe('\x1b[36m🔄 Running database migrations...\x1b[39m');
    });

    it('should enhance migration completed messages', () => {
      testLogger.info('Database migrations completed');
      expect(testLogger.getLastOutput()).toBe('\x1b[36m🔄 Database migrations completed\x1b[39m');
    });
  });

  describe('Shutdown Events', () => {
    it('should enhance graceful shutdown messages', () => {
      testLogger.info('Starting graceful shutdown sequence due to SIGTERM');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m🔄 Starting graceful shutdown sequence due to SIGTERM\x1b[39m');
    });

    it('should enhance shutdown completion messages', () => {
      testLogger.info('Graceful shutdown completed successfully');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m🔄 Graceful shutdown completed successfully\x1b[39m');
    });

    it('should enhance SIGTERM messages', () => {
      testLogger.info('Received SIGTERM, initiating graceful shutdown');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m🔄 Received SIGTERM, initiating graceful shutdown\x1b[39m');
    });
  });

  describe('Call Management Events', () => {
    it('should enhance call slot reservation logs', () => {
      testLogger.debug('Call slot reserved', {
        activeCallCount: 2,
        semaphore: 1,
        maxConcurrentCalls: 5,
        currentLoad: 3
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[32m📞 Call slot reserved\x1b[39m');
    });

    it('should enhance call capacity warnings', () => {
      testLogger.warn('Call slot reservation denied - capacity limit reached', {
        activeCallCount: 5,
        semaphore: 0,
        maxConcurrentCalls: 5,
        currentLoad: 5
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[32m⚠️ Call slot reservation denied - capacity limit reached\x1b[39m');
    });
  });

  describe('Booking Events', () => {
    it('should enhance booking event logs', () => {
      testLogger.info('Booking Event', {
        action: 'created',
        code: 'ABC123',
        guest: 'John Smith'
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[34m🏷️ Booking Event\x1b[39m');
    });

    it('should enhance booking operation logs', () => {
      testLogger.info('Booking operation completed', {
        operation: 'create',
        confirmationCode: 'XYZ789'
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[34m🏷️ Booking operation completed\x1b[39m');
    });
  });

  describe('Tool Events', () => {
    it('should enhance tool availability check logs', () => {
      testLogger.info('Checking availability', {
        correlationId: 'test-correlation',
        date: '2025-06-28',
        time: '19:00',
        partySize: 4
      });

      const output = testLogger.getLastOutput();
      expect(output).toContain('🔧');
      expect(output).toContain('check-availability called');
      expect(output).toMatch(/\[20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/); // Timestamp format
    });

    it('should enhance tool completion results for available', () => {
      testLogger.info('Availability check completed', {
        available: true,
        correlationId: 'test-correlation'
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[32m   ✅ Response: Available\x1b[39m');
    });

    it('should enhance tool completion results for unavailable', () => {
      testLogger.info('Availability check completed', {
        available: false,
        correlationId: 'test-correlation'
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[32m   ✅ Response: Not available\x1b[39m');
    });
  });

  describe('HTTP Request Events', () => {
    it('should enhance HTTP request logs with method emojis', () => {
      const mockTimestamp = '2025-06-27T10:30:15.123Z';
      
      testLogger.info('Request Started', {
        method: 'GET',
        url: '/tools/check-availability',
        timestamp: mockTimestamp,
        correlationId: 'test-correlation'
      });

      expect(testLogger.getLastOutput()).toBe(`🌐 \x1b[90m[${mockTimestamp}]\x1b[39m \x1b[33mGET\x1b[39m \x1b[36m/tools/check-availability\x1b[39m`);
    });

    it('should use correct emoji for POST requests', () => {
      const mockTimestamp = '2025-06-27T10:30:15.123Z';
      
      testLogger.info('Request Started', {
        method: 'POST',
        url: '/tools/make-reservation',
        timestamp: mockTimestamp
      });

      expect(testLogger.getLastOutput()).toBe(`📝 \x1b[90m[${mockTimestamp}]\x1b[39m \x1b[33mPOST\x1b[39m \x1b[36m/tools/make-reservation\x1b[39m`);
    });
  });

  describe('Error Events', () => {
    it('should enhance error logs with error emoji', () => {
      testLogger.error('Error checking availability', {
        message: 'Database connection failed',
        stack: 'Error stack trace'
      });

      expect(testLogger.getLastOutput()).toBe('\x1b[31m❌ Error checking availability\x1b[39m');
    });
  });

  describe('Additional Patterns from Example Logs', () => {
    it('should enhance restaurant server messages', () => {
      testLogger.info('Restaurant booking server running on port 3000');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m🍝 Restaurant booking server running on port 3000\x1b[39m');
    });

    it('should enhance webhook endpoint messages', () => {
      testLogger.info('Webhook endpoint: http://localhost:3000/webhook/twilio');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m📞 Webhook endpoint: http://localhost:3000/webhook/twilio\x1b[39m');
    });

    it('should enhance health check messages', () => {
      testLogger.info('Health check: http://localhost:3000/health');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m🏥 Health check: http://localhost:3000/health\x1b[39m');
    });

    it('should enhance agent configuration messages', () => {
      testLogger.info('Agent: Mark');
      expect(testLogger.getLastOutput()).toBe('\x1b[36m👤 Agent: Mark\x1b[39m');
    });

    it('should enhance voice configuration messages', () => {
      testLogger.info('Ultravox Voice: Mark-Slow');
      expect(testLogger.getLastOutput()).toBe('\x1b[35m🗣️ Ultravox Voice: Mark-Slow\x1b[39m');
    });

    it('should enhance max concurrent calls messages', () => {
      testLogger.info('Max Concurrent Calls: 5');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m🔢 Max Concurrent Calls: 5\x1b[39m');
    });

    it('should enhance debug mode messages', () => {
      testLogger.info('Debug mode - Bookings: true, Tools: true, Requests: true');
      expect(testLogger.getLastOutput()).toBe('\x1b[35m🧪 Debug mode - Bookings: true, Tools: true, Requests: true\x1b[39m');
    });

    it('should enhance resource monitoring messages', () => {
      testLogger.info('Resources - Memory: 75MB (4% of system), Active Calls: 1, Bookings: 2');
      expect(testLogger.getLastOutput()).toBe('\x1b[36m📊 Resources - Memory: 75MB (4% of system), Active Calls: 1, Bookings: 2\x1b[39m');
    });

    it('should enhance call registration messages', () => {
      testLogger.info('Call registered: ebbec62e-e2d6-4cf5-9719-ef86e9a66a15 (1/5)');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m📞 Call registered: ebbec62e-e2d6-4cf5-9719-ef86e9a66a15 (1/5)\x1b[39m');
    });

    it('should enhance stream event messages', () => {
      testLogger.info('Stream event: stream-started for call CAa745466eaec5677115e9c9d231bec559');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m📡 Stream event: stream-started for call CAa745466eaec5677115e9c9d231bec559\x1b[39m');
    });

    it('should enhance booking creation messages', () => {
      testLogger.info('BOOKING CREATED: LSN');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m📝 BOOKING CREATED: LSN\x1b[39m');
    });

    it('should enhance booking ID generation messages', () => {
      testLogger.info('Generated booking ID: LSN (Lima Sierra November)');
      expect(testLogger.getLastOutput()).toBe('\x1b[33m🎯 Generated booking ID: LSN (Lima Sierra November)\x1b[39m');
    });

    it('should enhance request headers/body messages', () => {
      testLogger.info('Headers: { host: "example.com" }');
      expect(testLogger.getLastOutput()).toBe('\x1b[90m🔧 Headers: { host: "example.com" }\x1b[39m');
    });

    it('should enhance date parsing messages', () => {
      testLogger.info('Date parsing: "two days from now" -> "2025-06-26"');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m🔧 Date parsing: "two days from now" -> "2025-06-26"\x1b[39m');
    });

    it('should enhance availability found messages', () => {
      testLogger.info('Found 4 available slots for 4 people on 2025-06-26');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m✅ Found 4 available slots for 4 people on 2025-06-26\x1b[39m');
    });

    it('should enhance reservation success messages', () => {
      testLogger.info('Reservation created successfully: LSN (L for Lima, S for Sierra, N for November)');
      expect(testLogger.getLastOutput()).toBe('\x1b[32m✅ Reservation created successfully: LSN (L for Lima, S for Sierra, N for November)\x1b[39m');
    });

    it('should enhance booking lookup messages', () => {
      testLogger.info('Looking for booking with code: LSN');
      expect(testLogger.getLastOutput()).toBe('\x1b[34m🔧 Looking for booking with code: LSN\x1b[39m');
    });
  });

  describe('Debug Mode Features', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'debug';
      // Create new logger instance with debug mode
      testLogger.cleanup();
      testLogger = new TestablePinoLogger();
    });

    it('should show additional metrics in debug mode for call events', () => {
      testLogger.debug('Call slot reserved', {
        activeCallCount: 2,
        semaphore: 1,
        maxConcurrentCalls: 5
      });

      const outputs = testLogger.getAllOutput();
      expect(outputs[0]).toContain('\x1b[32m📞 Call slot reserved\x1b[39m');
      expect(outputs[1]).toContain('📊 Metrics:');
      expect(outputs[1]).toContain('activeCallCount');
    });

    it('should show additional details in debug mode for booking events', () => {
      testLogger.info('Booking Event', {
        action: 'created',
        code: 'ABC123',
        guest: 'John Smith'
      });

      const outputs = testLogger.getAllOutput();
      expect(outputs[0]).toBe('\x1b[34m🏷️ Booking Event\x1b[39m');
      expect(outputs[1]).toContain('📝 Details:');
      expect(outputs[1]).toContain('action');
    });

    it('should show request details in debug mode for tool calls', () => {
      testLogger.info('Checking availability', {
        correlationId: 'test-correlation',
        date: '2025-06-28',
        time: '19:00',
        partySize: 4
      });

      const outputs = testLogger.getAllOutput();
      
      // Should have tool call output
      expect(outputs[0]).toContain('🔧');
      expect(outputs[0]).toContain('check-availability called');
      
      // Should have request details (without correlationId)
      expect(outputs[1]).toContain('📥 Request:');
      // Debug: log the actual output to see what's happening
      console.log('Tool call debug output:', outputs[1]);
      expect(outputs[1]).toContain('2025-06-28');
      expect(outputs[1]).toContain('19:00');
      expect(outputs[1]).toContain('partySize');
      expect(outputs[1]).not.toContain('correlationId');
    });

    it('should show response details in debug mode', () => {
      testLogger.info('Availability check completed', {
        available: true,
        correlationId: 'test-correlation',
        slots: [{ time: '19:00', available: true }]
      });

      const outputs = testLogger.getAllOutput();
      
      expect(outputs[0]).toBe('\x1b[32m   ✅ Response: Available\x1b[39m');
      expect(outputs[1]).toContain('📤 Full Response:');
      expect(outputs[1]).toContain('available');
      expect(outputs[1]).toContain('slots');
      expect(outputs[1]).not.toContain('correlationId');
    });
  });

  describe('Environment Controls', () => {
    it('should not enhance console output when RICH_CONSOLE_LOGGING=false', () => {
      process.env.RICH_CONSOLE_LOGGING = 'false';
      
      // Create new instance with disabled enhancement
      testLogger.cleanup();
      testLogger = new TestablePinoLogger();
      
      testLogger.debug('Call slot reserved', {
        activeCallCount: 2
      });

      // Should fall back to standard format without emojis
      const output = testLogger.getLastOutput();
      expect(output).not.toContain('📞');
      expect(output).toContain('[DEBUG]');
      expect(output).toContain('Call slot reserved');
    });

    it('should not enhance console output in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.RICH_CONSOLE_LOGGING = 'true';
      
      // Create new instance in test environment
      testLogger.cleanup();
      testLogger = new TestablePinoLogger();
      
      testLogger.info('Starting Twilio Ultravox Agent Server...');

      // Should fall back to standard format in test environment
      const output = testLogger.getLastOutput();
      expect(output).not.toContain('🚀');
      expect(output).toContain('[INFO]');
      expect(output).toContain('Starting Twilio Ultravox Agent Server...');
    });
  });

  describe('Error Handling', () => {
    it('should handle enhancement errors gracefully', () => {
      // Create a message that might cause JSON.stringify issues
      const circularObj: any = { activeCallCount: 1 };
      circularObj.self = circularObj; // Create circular reference
      
      expect(() => {
        testLogger.debug('Call slot reserved', circularObj);
      }).not.toThrow();

      // Should still produce some output (either enhanced or fallback)
      expect(testLogger.getAllOutput().length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Format', () => {
    it('should use fallback format for unmatched messages', () => {
      testLogger.info('Some random message that does not match any pattern', {
        correlationId: 'test-123',
        someData: 'value'
      });

      const output = testLogger.getLastOutput();
      expect(output).toContain('[INFO]');
      expect(output).toContain('[test-123]');
      expect(output).toContain('Some random message that does not match any pattern');
      // Should not contain emojis
      expect(output).not.toMatch(/[🚀📞🏷️🔧🌐❌⚙️🗄️🔄]/);
    });

    it('should include metadata in debug mode for fallback format', () => {
      process.env.LOG_LEVEL = 'debug';
      
      // Create new logger instance with debug mode
      testLogger.cleanup();
      testLogger = new TestablePinoLogger();
      
      testLogger.info('Unmatched message', {
        correlationId: 'test-123',
        testData: 'value'
      });

      const output = testLogger.getLastOutput();
      expect(output).toContain('correlationId');
      expect(output).toContain('testData');
    });
  });
});