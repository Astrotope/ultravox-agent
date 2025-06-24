import { CallManagerService } from '../../../src/services/callManagerService';

// Mock the config
jest.mock('../../../src/config', () => ({
  getConfig: () => ({
    MAX_CONCURRENT_CALLS: 2,
    CALL_CLEANUP_INTERVAL: 1000 // 1 second for testing
  })
}));

describe('CallManagerService', () => {
  let callManager: CallManagerService;

  beforeEach(() => {
    callManager = new CallManagerService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining calls
    callManager.getActiveCalls().clear();
  });

  describe('reserveCallSlot', () => {
    it('should reserve a call slot when capacity is available', () => {
      const reserved = callManager.reserveCallSlot();
      expect(reserved).toBe(true);
    });

    it('should reject slot reservation when at capacity', () => {
      // Reserve all available slots
      callManager.reserveCallSlot();
      callManager.reserveCallSlot();
      
      // Should reject the third reservation
      const reserved = callManager.reserveCallSlot();
      expect(reserved).toBe(false);
    });

    it('should reject when active calls plus semaphore reach limit', () => {
      // Register one active call
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
      
      // Reserve one more slot
      callManager.reserveCallSlot();
      
      // Should reject the third
      const reserved = callManager.reserveCallSlot();
      expect(reserved).toBe(false);
    });
  });

  describe('registerCall', () => {
    it('should register a call successfully', () => {
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
      
      expect(callManager.getActiveCallCount()).toBe(1);
      
      const activeCalls = callManager.getActiveCalls();
      const call = activeCalls.get('call1');
      
      expect(call).toBeDefined();
      expect(call?.twilioCallSid).toBe('twilio1');
      expect(call?.status).toBe('connecting');
    });

    it('should emit callStarted event', (done) => {
      callManager.on('callStarted', (callId, twilioCallSid) => {
        expect(callId).toBe('call1');
        expect(twilioCallSid).toBe('twilio1');
        done();
      });
      
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
    });
  });

  describe('updateCallStatus', () => {
    it('should update call status', () => {
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
      
      callManager.updateCallStatus('call1', 'active');
      
      const call = callManager.getActiveCalls().get('call1');
      expect(call?.status).toBe('active');
    });

    it('should handle non-existent call gracefully', () => {
      expect(() => {
        callManager.updateCallStatus('non-existent', 'active');
      }).not.toThrow();
    });
  });

  describe('endCall', () => {
    it('should end a call and emit event', (done) => {
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
      
      callManager.on('callEnded', (callId, reason) => {
        expect(callId).toBe('call1');
        expect(reason).toBe('test-end');
        done();
      });
      
      callManager.endCall('call1', 'test-end');
      
      expect(callManager.getActiveCallCount()).toBe(0);
      
      const call = callManager.getActiveCalls().get('call1');
      expect(call?.status).toBe('ended');
    });

    it('should not double-end a call', () => {
      callManager.reserveCallSlot();
      callManager.registerCall('call1', 'twilio1');
      
      callManager.endCall('call1', 'first-end');
      const firstCount = callManager.getActiveCallCount();
      
      callManager.endCall('call1', 'second-end');
      const secondCount = callManager.getActiveCallCount();
      
      expect(firstCount).toBe(secondCount);
    });
  });

  describe('canAcceptCall', () => {
    it('should return true when capacity is available', () => {
      expect(callManager.canAcceptCall()).toBe(true);
    });

    it('should return false when at capacity', () => {
      callManager.reserveCallSlot();
      callManager.reserveCallSlot();
      
      expect(callManager.canAcceptCall()).toBe(false);
    });
  });

  describe('releaseCallSlot', () => {
    it('should release a reserved slot', () => {
      callManager.reserveCallSlot();
      expect(callManager.canAcceptCall()).toBe(true);
      
      callManager.reserveCallSlot();
      expect(callManager.canAcceptCall()).toBe(false);
      
      callManager.releaseCallSlot();
      expect(callManager.canAcceptCall()).toBe(true);
    });

    it('should not go below zero semaphore', () => {
      callManager.releaseCallSlot(); // Should not crash
      expect(callManager.canAcceptCall()).toBe(true);
    });
  });

  describe('getMaxConcurrentCalls', () => {
    it('should return the configured limit', () => {
      expect(callManager.getMaxConcurrentCalls()).toBe(2);
    });
  });
});