import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { GracefulShutdown } from '../../../src/utils/gracefulShutdown';

// Mock dependencies
const mockServer = {
  close: jest.fn()
} as unknown as Server;

const mockPrisma = {
  $disconnect: jest.fn()
} as unknown as PrismaClient;

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('GracefulShutdown', () => {
  let gracefulShutdown: GracefulShutdown;
  let originalProcessOn: typeof process.on;
  let processEventHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    processEventHandlers = {};

    // Mock process.on to capture event handlers
    originalProcessOn = process.on;
    process.on = jest.fn((event: string, handler: Function) => {
      processEventHandlers[event] = handler;
      return process;
    }) as any;

    // Mock server.close to call callback immediately
    (mockServer.close as jest.Mock).mockImplementation((callback: Function) => {
      if (callback) {
        // Simulate async close with successful completion
        setTimeout(() => callback(), 10);
      }
    });

    // Mock Prisma disconnect
    (mockPrisma.$disconnect as jest.Mock).mockResolvedValue(undefined);

    gracefulShutdown = new GracefulShutdown(mockServer, mockPrisma, {
      timeout: 1000, // Short timeout for testing
      signals: ['SIGTERM', 'SIGINT']
    });
  });

  afterEach(() => {
    process.on = originalProcessOn;
  });

  describe('Signal Handler Setup', () => {
    it('should register signal handlers for SIGTERM and SIGINT', () => {
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should register exception handlers', () => {
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    });

    it('should use custom signals when provided', () => {
      jest.clearAllMocks();
      processEventHandlers = {};

      new GracefulShutdown(mockServer, mockPrisma, {
        signals: ['SIGUSR1', 'SIGUSR2']
      });

      expect(process.on).toHaveBeenCalledWith('SIGUSR1', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGUSR2', expect.any(Function));
    });
  });

  describe('Shutdown Process', () => {
    it('should perform graceful shutdown when SIGTERM is received', async () => {
      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        // Trigger SIGTERM handler
        const sigTermHandler = processEventHandlers['SIGTERM'];
        expect(sigTermHandler).toBeDefined();

        // Execute shutdown
        const shutdownPromise = sigTermHandler();

        // Wait a bit for async operations
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockServer.close).toHaveBeenCalled();
        expect(mockPrisma.$disconnect).toHaveBeenCalled();
        expect(process.exit).toHaveBeenCalledWith(0);
      } finally {
        process.exit = originalExit;
      }
    });

    it('should handle server close errors gracefully', async () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      // Mock server.close to call callback with error
      (mockServer.close as jest.Mock).mockImplementation((callback: Function) => {
        if (callback) {
          setTimeout(() => callback(new Error('Server close error')), 10);
        }
      });

      try {
        const sigTermHandler = processEventHandlers['SIGTERM'];
        sigTermHandler();

        await new Promise(resolve => setTimeout(resolve, 50));

        // Should exit with error code (0 or 1 depending on error handling)
        expect(process.exit).toHaveBeenCalledWith(expect.any(Number));
      } finally {
        process.exit = originalExit;
      }
    });

    it('should handle database disconnect errors', async () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      // Mock Prisma disconnect to reject
      (mockPrisma.$disconnect as jest.Mock).mockRejectedValue(new Error('Database disconnect error'));

      try {
        const sigTermHandler = processEventHandlers['SIGTERM'];
        sigTermHandler();

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        process.exit = originalExit;
      }
    });

    it('should force shutdown if timeout is exceeded', async () => {
      const originalExit = process.exit;
      const originalSetTimeout = global.setTimeout;
      
      process.exit = jest.fn() as any;

      // Mock setTimeout to call the timeout callback immediately
      const mockSetTimeout = jest.fn((callback: Function, delay: number) => {
        if (delay === 1000) { // Our test timeout
          callback();
        }
        return {} as any;
      }) as any;
      global.setTimeout = mockSetTimeout;

      try {
        const sigTermHandler = processEventHandlers['SIGTERM'];
        sigTermHandler();

        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        process.exit = originalExit;
        global.setTimeout = originalSetTimeout;
      }
    });
  });

  describe('Exception Handling', () => {
    it('should handle uncaught exceptions', () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        const uncaughtHandler = processEventHandlers['uncaughtException'];
        expect(uncaughtHandler).toBeDefined();

        const testError = new Error('Test uncaught exception');
        uncaughtHandler(testError);

        // Should initiate shutdown process
        expect(gracefulShutdown.isShutdownInProgress()).toBe(true);
      } finally {
        process.exit = originalExit;
      }
    });

    it('should handle unhandled rejections', () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        const unhandledHandler = processEventHandlers['unhandledRejection'];
        expect(unhandledHandler).toBeDefined();

        const testReason = new Error('Test unhandled rejection');
        const testPromise = Promise.resolve(); // Use resolved promise to avoid actual rejection
        unhandledHandler(testReason, testPromise);

        expect(gracefulShutdown.isShutdownInProgress()).toBe(true);
      } finally {
        process.exit = originalExit;
      }
    });
  });

  describe('Status Methods', () => {
    it('should indicate shutdown is not in progress initially', () => {
      expect(gracefulShutdown.isShutdownInProgress()).toBe(false);
    });

    it('should indicate shutdown is in progress after signal received', () => {
      const sigTermHandler = processEventHandlers['SIGTERM'];
      sigTermHandler();

      expect(gracefulShutdown.isShutdownInProgress()).toBe(true);
    });

    it('should support manual shutdown', async () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        await gracefulShutdown.manualShutdown();
        expect(gracefulShutdown.isShutdownInProgress()).toBe(true);
      } finally {
        process.exit = originalExit;
      }
    });
  });

  describe('Multiple Signal Handling', () => {
    it('should ignore additional signals during shutdown', () => {
      const originalExit = process.exit;
      process.exit = jest.fn() as any;

      try {
        const sigTermHandler = processEventHandlers['SIGTERM'];
        
        // First signal should start shutdown
        sigTermHandler();
        expect(gracefulShutdown.isShutdownInProgress()).toBe(true);

        // Reset call count
        jest.clearAllMocks();

        // Second signal should be ignored
        sigTermHandler();
        
        // Server.close should not be called again
        expect(mockServer.close).not.toHaveBeenCalled();
      } finally {
        process.exit = originalExit;
      }
    });
  });
});