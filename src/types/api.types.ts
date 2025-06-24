import { Request, Response } from 'express';

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId?: string;
  details?: any;
}

// Tool Request/Response Types
export interface ToolRequest {
  body: Record<string, any>;
  headers: Record<string, string>;
}

export interface AvailabilityRequest {
  date: string;
  partySize: number;
}

export interface ReservationRequest {
  customerName: string;
  date: string;
  time: string;
  partySize: number;
  specialRequirements?: string;
}

export interface BookingLookupRequest {
  confirmationCode: string;
}

export interface TransferCallRequest {
  callId: string;
  reason: string;
  customerName?: string;
  summary?: string;
}

// Webhook Types
export interface TwilioWebhookRequest {
  CallSid: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  AccountSid?: string;
}

export interface StreamStatusRequest {
  CallSid: string;
  StreamSid: string;
  StreamEvent: 'stream-started' | 'stream-stopped' | 'stream-error';
  StreamError?: string;
  Timestamp: string;
}

// Extended Express Types
export interface AuthenticatedRequest extends Request {
  apiVersion?: string;
  requestId?: string;
}

export interface TypedResponse<T = any> extends Response {
  json: (body: APIResponse<T>) => this;
}