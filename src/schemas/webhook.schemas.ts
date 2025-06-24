import { z } from 'zod';

// Twilio webhook validation schemas
export const twilioWebhookSchema = z.object({
  CallSid: z.string().min(1, 'CallSid is required'),
  From: z.string().optional(),
  To: z.string().optional(),
  CallStatus: z.string().optional(),
  AccountSid: z.string().optional(),
  Direction: z.string().optional(),
  ApiVersion: z.string().optional(),
  CallerName: z.string().optional()
});

export const streamStatusSchema = z.object({
  CallSid: z.string().min(1, 'CallSid is required'),
  StreamSid: z.string().min(1, 'StreamSid is required'),
  StreamEvent: z.enum(['stream-started', 'stream-stopped', 'stream-error'], {
    errorMap: () => ({ message: 'StreamEvent must be stream-started, stream-stopped, or stream-error' })
  }),
  StreamError: z.string().optional(),
  Timestamp: z.string().min(1, 'Timestamp is required')
});

export const twilioErrorSchema = z.object({
  AccountSid: z.string().min(1, 'AccountSid is required'),
  Sid: z.string().min(1, 'Sid is required'),
  Level: z.enum(['WARNING', 'ERROR', 'NOTICE'], {
    errorMap: () => ({ message: 'Level must be WARNING, ERROR, or NOTICE' })
  }),
  Payload: z.union([z.string(), z.object({}).passthrough()]).optional(),
  Timestamp: z.string().min(1, 'Timestamp is required')
});

// Query parameter schemas
export const adminQuerySchema = z.object({
  apiKey: z.string().optional()
});

export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).default('10'),
  sortBy: z.enum(['createdAt', 'date', 'customerName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Infer TypeScript types
export type TwilioWebhookRequest = z.infer<typeof twilioWebhookSchema>;
export type StreamStatusRequest = z.infer<typeof streamStatusSchema>;
export type TwilioErrorRequest = z.infer<typeof twilioErrorSchema>;
export type AdminQueryParams = z.infer<typeof adminQuerySchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;