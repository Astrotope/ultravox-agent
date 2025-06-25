import { EventEmitter } from 'events';
import { ActiveCall } from '../types';
import { getConfig } from '../config';

const MAX_EVENT_LISTENERS = 100;

/**
 * Enhanced call management with semaphore pattern
 */
export class CallManagerService {
  private activeCalls = new Map<string, ActiveCall>();
  private activeCallCount = 0;
  private semaphore = 0; // Track pending call creation
  private events = new EventEmitter();
  private maxConcurrentCalls: number;
  private callCleanupInterval: number;

  constructor() {
    const config = getConfig();
    this.maxConcurrentCalls = config.MAX_CONCURRENT_CALLS;
    this.callCleanupInterval = config.CALL_CLEANUP_INTERVAL;
    
    this.events.setMaxListeners(MAX_EVENT_LISTENERS);
    this.setupCleanup();
  }

  /**
   * Atomic operation to reserve a call slot
   */
  reserveCallSlot(): boolean {
    if (this.activeCallCount + this.semaphore >= this.maxConcurrentCalls) {
      return false;
    }
    this.semaphore++;
    return true;
  }

  /**
   * Release reserved slot (if call creation failed)
   */
  releaseCallSlot(): void {
    if (this.semaphore > 0) {
      this.semaphore--;
    }
  }

  /**
   * Register successful call (converts reservation to active call)
   */
  registerCall(callId: string, twilioCallSid: string): void {
    this.activeCalls.set(callId, {
      twilioCallSid,
      timestamp: new Date().toISOString(),
      status: 'connecting',
      lastActivity: new Date()
    });
    
    this.activeCallCount++;
    if (this.semaphore > 0) {
      this.semaphore--;
    }
    
    this.events.emit('callStarted', callId, twilioCallSid);
    console.log(`📞 Call registered: ${callId} (${this.activeCallCount}/${this.maxConcurrentCalls})`);
  }

  /**
   * Update call status
   */
  updateCallStatus(callId: string, status: ActiveCall['status']): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      call.status = status;
      call.lastActivity = new Date();
    }
  }

  /**
   * End call
   */
  endCall(callId: string, reason: string): void {
    const call = this.activeCalls.get(callId);
    if (call && call.status !== 'ended') {
      call.status = 'ended';
      call.lastActivity = new Date();
      this.activeCallCount--;
      
      // Schedule removal after retention period
      const CALL_RETENTION_TIME = 30000; // 30 seconds
      setTimeout(() => {
        this.activeCalls.delete(callId);
      }, CALL_RETENTION_TIME);
      
      this.events.emit('callEnded', callId, reason);
      console.log(`📞 Call ended: ${callId}, reason: ${reason} (${this.activeCallCount}/${this.maxConcurrentCalls})`);
    }
  }

  /**
   * Get active call count
   */
  getActiveCallCount(): number {
    return this.activeCallCount;
  }

  /**
   * Get all active calls
   */
  getActiveCalls(): Map<string, ActiveCall> {
    return this.activeCalls;
  }

  /**
   * Check if new calls can be accepted
   */
  canAcceptCall(): boolean {
    return this.activeCallCount + this.semaphore < this.maxConcurrentCalls;
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Setup automatic cleanup of stale calls
   */
  private setupCleanup(): void {
    // Temporarily disabled for testing timeout issues
    if (process.env.NODE_ENV !== 'test') {
      setInterval(() => {
        const now = new Date();
        const staleCallIds: string[] = [];
        
        this.activeCalls.forEach((call, callId) => {
          const timeSinceLastActivity = now.getTime() - call.lastActivity.getTime();
          
          // Clean up very old calls (beyond cleanup interval)
          if (timeSinceLastActivity > this.callCleanupInterval) {
            staleCallIds.push(callId);
          }
        });
        
        staleCallIds.forEach(callId => {
          const call = this.activeCalls.get(callId);
          if (call && call.status !== 'ended') {
            console.log(`🧹 Force ending stale call: ${callId}`);
            this.endCall(callId, 'stale-cleanup');
          } else {
            this.activeCalls.delete(callId);
            console.log(`🧹 Cleaned up old call record: ${callId}`);
          }
        });
        
      }, this.callCleanupInterval);
    }
  }

  /**
   * Get max concurrent calls limit
   */
  getMaxConcurrentCalls(): number {
    return this.maxConcurrentCalls;
  }
}