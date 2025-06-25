import { EventEmitter } from 'events';
import { ActiveCall } from '../types';
import { getConfig } from '../config';
import { logger } from '../utils/logger';

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
    const currentLoad = this.activeCallCount + this.semaphore;
    const canReserve = currentLoad < this.maxConcurrentCalls;
    
    if (canReserve) {
      this.semaphore++;
      logger.debug('Call slot reserved', {
        activeCallCount: this.activeCallCount,
        semaphore: this.semaphore,
        maxConcurrentCalls: this.maxConcurrentCalls,
        currentLoad: currentLoad + 1
      });
    } else {
      logger.warn('Call slot reservation denied - capacity limit reached', {
        activeCallCount: this.activeCallCount,
        semaphore: this.semaphore,
        maxConcurrentCalls: this.maxConcurrentCalls,
        currentLoad
      });
    }
    
    return canReserve;
  }

  /**
   * Release reserved slot (if call creation failed)
   */
  releaseCallSlot(): void {
    if (this.semaphore > 0) {
      this.semaphore--;
      logger.debug('Call slot released', {
        activeCallCount: this.activeCallCount,
        semaphore: this.semaphore,
        maxConcurrentCalls: this.maxConcurrentCalls,
        reason: 'call_creation_failed'
      });
    } else {
      logger.warn('Attempted to release call slot when semaphore is zero', {
        activeCallCount: this.activeCallCount,
        semaphore: this.semaphore
      });
    }
  }

  /**
   * Register successful call (converts reservation to active call)
   */
  registerCall(callId: string, twilioCallSid: string): void {
    const timestamp = new Date().toISOString();
    const call: ActiveCall = {
      twilioCallSid,
      timestamp,
      status: 'connecting',
      lastActivity: new Date()
    };
    
    this.activeCalls.set(callId, call);
    this.activeCallCount++;
    
    if (this.semaphore > 0) {
      this.semaphore--;
    }
    
    this.events.emit('callStarted', callId, twilioCallSid);
    
    logger.info('Call registered successfully', {
      callId,
      twilioCallSid,
      activeCallCount: this.activeCallCount,
      maxConcurrentCalls: this.maxConcurrentCalls,
      semaphore: this.semaphore,
      timestamp,
      status: 'connecting',
      utilizationPercentage: Math.round((this.activeCallCount / this.maxConcurrentCalls) * 100)
    });
  }

  /**
   * Update call status
   */
  updateCallStatus(callId: string, status: ActiveCall['status']): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      const previousStatus = call.status;
      call.status = status;
      call.lastActivity = new Date();
      
      logger.info('Call status updated', {
        callId,
        twilioCallSid: call.twilioCallSid,
        previousStatus,
        newStatus: status,
        timestamp: call.lastActivity.toISOString(),
        activeCallCount: this.activeCallCount
      });
    } else {
      logger.warn('Attempted to update status for unknown call', {
        callId,
        requestedStatus: status,
        activeCallCount: this.activeCallCount
      });
    }
  }

  /**
   * End call
   */
  endCall(callId: string, reason: string): void {
    const call = this.activeCalls.get(callId);
    if (call && call.status !== 'ended') {
      const previousStatus = call.status;
      const startTime = new Date(call.timestamp);
      const endTime = new Date();
      const callDuration = endTime.getTime() - startTime.getTime();
      
      call.status = 'ended';
      call.lastActivity = endTime;
      this.activeCallCount--;
      
      // Schedule removal after retention period
      const CALL_RETENTION_TIME = 30000; // 30 seconds
      setTimeout(() => {
        this.activeCalls.delete(callId);
        logger.debug('Call record removed from memory', {
          callId,
          retentionTime: CALL_RETENTION_TIME
        });
      }, CALL_RETENTION_TIME);
      
      this.events.emit('callEnded', callId, reason);
      
      logger.info('Call ended', {
        callId,
        twilioCallSid: call.twilioCallSid,
        reason,
        previousStatus,
        activeCallCount: this.activeCallCount,
        maxConcurrentCalls: this.maxConcurrentCalls,
        callDurationMs: callDuration,
        callDurationMinutes: Math.round(callDuration / 60000 * 100) / 100,
        endTime: endTime.toISOString(),
        utilizationPercentage: Math.round((this.activeCallCount / this.maxConcurrentCalls) * 100)
      });
    } else if (!call) {
      logger.warn('Attempted to end unknown call', {
        callId,
        reason,
        activeCallCount: this.activeCallCount
      });
    } else {
      logger.debug('Call already ended, ignoring duplicate end request', {
        callId,
        reason,
        currentStatus: call.status
      });
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
            logger.warn('Force ending stale call', {
              callId,
              twilioCallSid: call.twilioCallSid,
              status: call.status,
              lastActivity: call.lastActivity.toISOString(),
              staleDurationMs: now.getTime() - call.lastActivity.getTime(),
              reason: 'stale-cleanup'
            });
            this.endCall(callId, 'stale-cleanup');
          } else {
            this.activeCalls.delete(callId);
            logger.debug('Cleaned up old call record', {
              callId,
              reason: 'automatic-cleanup'
            });
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