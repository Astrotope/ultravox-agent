import { CallManagerService } from './callManagerService';
import { logger } from '../utils/logger';

interface UltravoxWebhookData {
  event_type: string;
  call_id: string;
  transcript?: string;
  end_reason?: string;
  // Add other webhook fields as needed
}

interface TwilioWebhookData {
  CallSid: string;
  CallStatus: string;
  From?: string;
  To?: string;
  // Add other webhook fields as needed
}

export class WebhookService {
  private callManager: CallManagerService;

  constructor() {
    this.callManager = new CallManagerService();
  }

  async handleUltravoxWebhook(data: UltravoxWebhookData): Promise<any> {
    const { event_type, call_id } = data;

    logger.info('Processing Ultravox webhook', {
      eventType: event_type,
      callId: call_id
    });

    switch (event_type) {
      case 'call_started':
        return this.handleCallStarted(data);
      case 'call_ended':
        return this.handleCallEnded(data);
      case 'transcript':
        return this.handleTranscript(data);
      default:
        logger.warn('Unknown Ultravox webhook event type', {
          eventType: event_type,
          callId: call_id
        });
        return { status: 'unknown_event', event_type };
    }
  }

  async handleTwilioWebhook(data: TwilioWebhookData): Promise<any> {
    const { CallSid, CallStatus } = data;

    logger.info('Processing Twilio webhook', {
      callSid: CallSid,
      callStatus: CallStatus
    });

    switch (CallStatus) {
      case 'ringing':
        return this.handleTwilioRinging(data);
      case 'in-progress':
        return this.handleTwilioInProgress(data);
      case 'completed':
        return this.handleTwilioCompleted(data);
      case 'failed':
        return this.handleTwilioFailed(data);
      default:
        logger.warn('Unknown Twilio call status', {
          callSid: CallSid,
          callStatus: CallStatus
        });
        return { status: 'unknown_status', call_status: CallStatus };
    }
  }

  private async handleCallStarted(data: UltravoxWebhookData): Promise<any> {
    logger.info('Ultravox call started', {
      callId: data.call_id
    });

    // Register the call in our call manager
    this.callManager.registerCall(data.call_id, data.call_id);

    return { status: 'call_started', call_id: data.call_id };
  }

  private async handleCallEnded(data: UltravoxWebhookData): Promise<any> {
    logger.info('Ultravox call ended', {
      callId: data.call_id,
      endReason: data.end_reason
    });

    // End the call in our call manager
    this.callManager.endCall(data.call_id, data.end_reason || 'webhook_ended');

    return { 
      status: 'call_ended', 
      call_id: data.call_id, 
      end_reason: data.end_reason 
    };
  }

  private async handleTranscript(data: UltravoxWebhookData): Promise<any> {
    logger.debug('Received transcript', {
      callId: data.call_id,
      transcript: data.transcript
    });

    // Here you could store the transcript in the database or process it
    
    return { 
      status: 'transcript_received', 
      call_id: data.call_id 
    };
  }

  private async handleTwilioRinging(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call ringing', {
      callSid: data.CallSid,
      from: data.From,
      to: data.To
    });

    return { status: 'ringing', call_sid: data.CallSid };
  }

  private async handleTwilioInProgress(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call in progress', {
      callSid: data.CallSid
    });

    return { status: 'in_progress', call_sid: data.CallSid };
  }

  private async handleTwilioCompleted(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call completed', {
      callSid: data.CallSid
    });

    return { status: 'completed', call_sid: data.CallSid };
  }

  private async handleTwilioFailed(data: TwilioWebhookData): Promise<any> {
    logger.error('Twilio call failed', {
      callSid: data.CallSid
    });

    return { status: 'failed', call_sid: data.CallSid };
  }
}