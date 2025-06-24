import { z } from 'zod';

// Base schemas for reusable validation rules
export const phoneNumberSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be at most 20 characters')
  .optional();

export const confirmationCodeSchema = z.string()
  .min(1, 'Confirmation code is required')
  .max(50, 'Confirmation code is too long')
  .transform((val) => val.trim());

export const partySize = z.number()
  .int('Party size must be a whole number')
  .min(1, 'Party size must be at least 1')
  .max(12, 'Party size cannot exceed 12 people');

export const partySizeString = z.string()
  .refine((val) => /^\d+$/.test(val), 'Party size must be a whole number')
  .transform((val) => parseInt(val, 10))
  .pipe(partySize);

export const customerNameSchema = z.string()
  .min(1, 'Customer name is required')
  .max(100, 'Customer name must be at most 100 characters')
  .transform((val) => val.trim());

export const dateSchema = z.string()
  .min(1, 'Date is required')
  .max(50, 'Date input is too long');

export const timeSchema = z.string()
  .min(1, 'Time is required')
  .regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, 'Time must be in format "7:30 PM"')
  .transform((val) => val.trim());

export const specialRequirementsSchema = z.string()
  .max(500, 'Special requirements must be at most 500 characters')
  .transform((val) => val.trim())
  .optional();

// Request validation schemas
export const checkAvailabilitySchema = z.object({
  date: dateSchema,
  partySize: z.union([partySize, partySizeString])
});

export const makeReservationSchema = z.object({
  customerName: customerNameSchema,
  date: dateSchema,
  time: timeSchema,
  partySize: z.union([partySize, partySizeString]),
  specialRequirements: specialRequirementsSchema,
  phone: phoneNumberSchema
});

export const checkBookingSchema = z.object({
  confirmationCode: confirmationCodeSchema
});

export const transferCallSchema = z.object({
  callId: z.string().min(1, 'Call ID is required'),
  reason: z.string().min(1, 'Reason is required').max(200, 'Reason is too long'),
  customerName: z.string().max(100, 'Customer name is too long').optional(),
  summary: z.string().max(1000, 'Summary is too long').optional()
});

export const updateBookingSchema = z.object({
  confirmationCode: confirmationCodeSchema,
  newDate: dateSchema.optional(),
  newTime: timeSchema.optional(),
  newPartySize: z.union([partySize, partySizeString]).optional(),
  newSpecialRequirements: specialRequirementsSchema
});

export const modifyReservationSchema = z.object({
  confirmationCode: confirmationCodeSchema,
  newDate: dateSchema.optional(),
  newTime: timeSchema.optional(),
  newPartySize: z.union([partySize, partySizeString]).optional(),
  newSpecialRequirements: specialRequirementsSchema
});

export const cancelReservationSchema = z.object({
  confirmationCode: confirmationCodeSchema,
  reason: z.string().max(200, 'Cancellation reason is too long').optional()
});

// Response schemas for type safety
export const bookingResponseSchema = z.object({
  id: z.string(),
  confirmationCode: z.string(),
  customerName: z.string(),
  date: z.string(),
  time: z.string(),
  partySize: z.number(),
  specialRequirements: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const availabilitySlotSchema = z.object({
  date: z.string(),
  time: z.string(),
  available: z.boolean(),
  remainingCapacity: z.number()
});

// Infer TypeScript types from Zod schemas
export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
export type MakeReservationRequest = z.infer<typeof makeReservationSchema>;
export type CheckBookingRequest = z.infer<typeof checkBookingSchema>;
export type TransferCallRequest = z.infer<typeof transferCallSchema>;
export type UpdateBookingRequest = z.infer<typeof updateBookingSchema>;
export type ModifyReservationRequest = z.infer<typeof modifyReservationSchema>;
export type CancelReservationRequest = z.infer<typeof cancelReservationSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;