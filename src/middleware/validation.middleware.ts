import { Request, Response, NextFunction } from 'express';
import { 
  validateBody, 
  validateQuery,
  validateWithAsync 
} from './zodValidation.middleware';
import {
  twilioWebhookSchema,
  streamStatusSchema,
  makeReservationSchema,
  checkAvailabilitySchema,
  checkBookingSchema,
  transferCallSchema,
  adminQuerySchema
} from '../schemas';

/**
 * Zod-based validation middleware for different endpoints
 */

// Webhook validation
export const validateWebhookInput = validateBody(twilioWebhookSchema);
export const validateStreamStatus = validateBody(streamStatusSchema);

// Tool validation
export const validateReservationInput = validateBody(makeReservationSchema);
export const validateAvailabilityInput = validateBody(checkAvailabilitySchema);
export const validateBookingLookupInput = validateBody(checkBookingSchema);
export const validateTransferCallInput = validateBody(transferCallSchema);

// Admin validation
export const validateAdminQuery = validateQuery(adminQuerySchema);

/**
 * Custom async validation example for unique constraints
 */
export const validateUniqueBooking = validateWithAsync(
  makeReservationSchema,
  async (data) => {
    // Example: Check for duplicate bookings
    // This would query the database to ensure no conflicts
    // throw new Error('Booking conflict') if validation fails
  }
);

/**
 * Legacy support - keeping for backward compatibility
 * @deprecated Use Zod validation middleware instead
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  // This is now handled by Zod middleware
  next();
};