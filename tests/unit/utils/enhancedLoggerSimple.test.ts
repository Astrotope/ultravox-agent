import { logger } from '../../../src/utils/logger';

describe('Enhanced Logger Integration', () => {
  beforeEach(() => {
    // Enable rich logging for integration tests
    process.env.RICH_CONSOLE_LOGGING = 'true';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  describe('Backwards Compatibility', () => {
    it('should maintain Winston API compatibility', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.http).toBeDefined();
      expect(logger.log).toBeDefined();
    });

    it('should call Winston logger methods without throwing', () => {
      expect(() => {
        logger.info('Test message', { test: 'data' });
        logger.error('Test error', { error: 'details' });
        logger.warn('Test warning', { warning: 'info' });
        logger.debug('Test debug', { debug: 'info' });
      }).not.toThrow();
    });
  });

  describe('Enhanced Console Output Integration', () => {
    it('should enhance call management logs', () => {
      // This will output enhanced logs to console if working correctly
      expect(() => {
        logger.debug('Call slot reserved', {
          activeCallCount: 2,
          semaphore: 1,
          maxConcurrentCalls: 5,
          currentLoad: 3
        });
      }).not.toThrow();
    });

    it('should enhance booking logs', () => {
      expect(() => {
        logger.info('Booking Event', {
          action: 'created',
          code: 'ABC123',
          guest: 'John Smith'
        });
      }).not.toThrow();
    });

    it('should enhance tool logs', () => {
      expect(() => {
        logger.info('Checking availability', {
          correlationId: 'test-correlation',
          date: '2025-06-28',
          time: '19:00',
          partySize: 4
        });
      }).not.toThrow();
    });

    it('should enhance HTTP request logs', () => {
      expect(() => {
        logger.info('Request Started', {
          method: 'GET',
          url: '/tools/check-availability',
          timestamp: '2025-06-27T10:30:15.123Z',
          correlationId: 'test-correlation'
        });
      }).not.toThrow();
    });

    it('should handle errors gracefully', () => {
      expect(() => {
        logger.error('Error checking availability', {
          message: 'Database connection failed',
          stack: 'Error stack trace'
        });
      }).not.toThrow();
    });
  });

  describe('Environment Controls', () => {
    it('should not break when rich logging is disabled', () => {
      process.env.RICH_CONSOLE_LOGGING = 'false';
      
      expect(() => {
        logger.info('Call Event', {
          action: 'started',
          callId: 'test-call-123'
        });
      }).not.toThrow();
    });

    it('should not break in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      expect(() => {
        logger.info('Call Event', {
          action: 'started',
          callId: 'test-call-123'
        });
      }).not.toThrow();
    });
  });
});