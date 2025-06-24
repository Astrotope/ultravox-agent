import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { TwilioService } from '../services/twilioService';

export class WebhookController {
  private webhookService: WebhookService;
  private twilioService: TwilioService;

  constructor() {
    this.webhookService = new WebhookService();
    this.twilioService = new TwilioService();
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

  async handleTwilioVoiceWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;
      
      logger.info('Received Twilio voice webhook', {
        correlationId: res.locals.correlationId,
        callSid: webhookData.CallSid,
        from: webhookData.From,
        to: webhookData.To
      });

      const twiml = await this.webhookService.handleTwilioVoiceWebhook(webhookData);

      logger.info('Generated TwiML response', {
        correlationId: res.locals.correlationId,
        callSid: webhookData.CallSid,
        twimlLength: twiml.length
      });

      // Return TwiML XML response
      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      logger.error('Error processing Twilio voice webhook', {
        correlationId: res.locals.correlationId,
        webhookData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Return TwiML error response
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say>Sorry, there was an error processing your call. Please try again later.</Say>\n  <Hangup/>\n</Response>`);
    }
  }
}