import { Router } from 'express';
import { WebhookController } from '../../controllers/webhookController';
import { asyncHandler } from '../../middleware/error.middleware';
import { validateBody } from '../../middleware/zodValidation.middleware';
import { z } from 'zod';

const router = Router();
const webhookController = new WebhookController();

// Webhook validation schemas
const ultravoxWebhookSchema = z.object({
  event_type: z.string().min(1),
  call_id: z.string().min(1),
  transcript: z.string().optional(),
  end_reason: z.string().optional()
});

const twilioWebhookSchema = z.object({
  CallSid: z.string().min(1),
  CallStatus: z.string().min(1),
  From: z.string().optional(),
  To: z.string().optional()
});

// Ultravox webhook endpoint
router.post('/ultravox', 
  validateBody(ultravoxWebhookSchema),
  asyncHandler(webhookController.handleUltravoxWebhook.bind(webhookController))
);

// Twilio status webhook endpoint (returns JSON)
router.post('/twilio', 
  validateBody(twilioWebhookSchema),
  asyncHandler(webhookController.handleTwilioWebhook.bind(webhookController))
);

// Twilio voice webhook endpoint (returns TwiML XML)
router.post('/twilio/voice', 
  asyncHandler(webhookController.handleTwilioVoiceWebhook.bind(webhookController))
);

export default router;