import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  async handleUltravoxWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      logger.info('Received Ultravox webhook', {
        correlationId: res.locals.correlationId,
        eventType: webhookData.event_type,
        callId: webhookData.call_id
      });

      const result = await this.webhookService.handleUltravoxWebhook(webhookData);

      logger.info('Processed Ultravox webhook', {
        correlationId: res.locals.correlationId,
        eventType: webhookData.event_type,
        callId: webhookData.call_id,
        result
      });

      ApiResponseUtil.success(res, result, 'Webhook processed successfully');
    } catch (error) {
      logger.error('Error processing Ultravox webhook', {
        correlationId: res.locals.correlationId,
        webhookData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async handleTwilioWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      logger.info('Received Twilio webhook', {
        correlationId: res.locals.correlationId,
        callSid: webhookData.CallSid,
        callStatus: webhookData.CallStatus
      });

      const result = await this.webhookService.handleTwilioWebhook(webhookData);

      logger.info('Processed Twilio webhook', {
        correlationId: res.locals.correlationId,
        callSid: webhookData.CallSid,
        callStatus: webhookData.CallStatus,
        result
      });

      ApiResponseUtil.success(res, result, 'Webhook processed successfully');
    } catch (error) {
      logger.error('Error processing Twilio webhook', {
        correlationId: res.locals.correlationId,
        webhookData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}