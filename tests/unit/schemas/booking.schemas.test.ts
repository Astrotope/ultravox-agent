import {
  checkAvailabilitySchema,
  makeReservationSchema,
  checkBookingSchema,
  transferCallSchema,
  customerNameSchema,
  partySizeString,
  timeSchema,
  confirmationCodeSchema
} from '../../../src/schemas/booking.schemas';
import { ZodError } from 'zod';

describe('Booking Schemas', () => {
  describe('customerNameSchema', () => {
    it('should validate valid customer names', () => {
      expect(customerNameSchema.parse('John Doe')).toBe('John Doe');
      expect(customerNameSchema.parse('  Maria Garcia  ')).toBe('Maria Garcia'); // Trimmed
    });

    it('should reject invalid customer names', () => {
      expect(() => customerNameSchema.parse('')).toThrow();
      expect(() => customerNameSchema.parse('a'.repeat(101))).toThrow();
    });
  });

  describe('partySizeString', () => {
    it('should convert string numbers to integers', () => {
      expect(partySizeString.parse('4')).toBe(4);
      expect(partySizeString.parse('1')).toBe(1);
      expect(partySizeString.parse('12')).toBe(12);
    });

    it('should reject invalid party sizes', () => {
      expect(() => partySizeString.parse('0')).toThrow();
      expect(() => partySizeString.parse('13')).toThrow();
      expect(() => partySizeString.parse('abc')).toThrow();
      expect(() => partySizeString.parse('2.5')).toThrow();
    });
  });

  describe('timeSchema', () => {
    it('should validate valid time formats', () => {
      expect(timeSchema.parse('7:30 PM')).toBe('7:30 PM');
      expect(timeSchema.parse('12:00 AM')).toBe('12:00 AM');
      expect(timeSchema.parse('1:15 pm')).toBe('1:15 pm');
    });

    it('should reject invalid time formats', () => {
      expect(() => timeSchema.parse('25:00 PM')).toThrow();
      expect(() => timeSchema.parse('7:30')).toThrow(); // Missing AM/PM
      expect(() => timeSchema.parse('7:60 PM')).toThrow(); // Invalid minutes
      expect(() => timeSchema.parse('')).toThrow();
    });
  });

  describe('confirmationCodeSchema', () => {
    it('should validate and transform confirmation codes', () => {
      expect(confirmationCodeSchema.parse('ABC')).toBe('ABC');
      expect(confirmationCodeSchema.parse('  XYZ  ')).toBe('XYZ'); // Trimmed
      expect(confirmationCodeSchema.parse('Victor Mike Golf')).toBe('Victor Mike Golf');
    });

    it('should reject invalid confirmation codes', () => {
      expect(() => confirmationCodeSchema.parse('')).toThrow();
      expect(() => confirmationCodeSchema.parse('a'.repeat(51))).toThrow();
    });
  });

  describe('checkAvailabilitySchema', () => {
    it('should validate valid availability requests', () => {
      const validData = {
        date: '2025-06-25',
        partySize: 4
      };
      
      const result = checkAvailabilitySchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should handle string party size', () => {
      const data = {
        date: 'tomorrow',
        partySize: '4'
      };
      
      const result = checkAvailabilitySchema.parse(data);
      expect(result.partySize).toBe(4);
    });

    it('should reject invalid requests', () => {
      expect(() => checkAvailabilitySchema.parse({
        date: '',
        partySize: 4
      })).toThrow();

      expect(() => checkAvailabilitySchema.parse({
        date: '2025-06-25',
        partySize: 0
      })).toThrow();
    });
  });

  describe('makeReservationSchema', () => {
    it('should validate valid reservation requests', () => {
      const validData = {
        customerName: 'John Doe',
        date: '2025-06-25',
        time: '7:30 PM',
        partySize: 4,
        specialRequirements: 'Window table',
        phone: '+1234567890'
      };
      
      const result = makeReservationSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should handle optional fields', () => {
      const minimalData = {
        customerName: 'Jane Smith',
        date: 'tomorrow',
        time: '8:00 PM',
        partySize: 2
      };
      
      const result = makeReservationSchema.parse(minimalData);
      expect(result.customerName).toBe('Jane Smith');
      expect(result.specialRequirements).toBeUndefined();
      expect(result.phone).toBeUndefined();
    });

    it('should transform and validate data', () => {
      const data = {
        customerName: '  Maria Garcia  ',
        date: 'next Friday',
        time: '7:30 PM',
        partySize: '6',
        specialRequirements: '  Birthday celebration  '
      };
      
      const result = makeReservationSchema.parse(data);
      expect(result.customerName).toBe('Maria Garcia'); // Trimmed
      expect(result.partySize).toBe(6); // Converted to number
      expect(result.specialRequirements).toBe('Birthday celebration'); // Trimmed
    });

    it('should reject invalid reservation data', () => {
      // Missing required fields
      expect(() => makeReservationSchema.parse({
        customerName: 'John',
        date: '2025-06-25',
        time: '7:30 PM'
        // Missing partySize
      })).toThrow();

      // Invalid time format
      expect(() => makeReservationSchema.parse({
        customerName: 'John',
        date: '2025-06-25',
        time: '25:30 PM',
        partySize: 4
      })).toThrow();

      // Party size too large
      expect(() => makeReservationSchema.parse({
        customerName: 'John',
        date: '2025-06-25',
        time: '7:30 PM',
        partySize: 15
      })).toThrow();
    });
  });

  describe('checkBookingSchema', () => {
    it('should validate booking lookup requests', () => {
      const data = { confirmationCode: 'ABC' };
      const result = checkBookingSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('should handle phonetic codes', () => {
      const data = { confirmationCode: 'Alpha Bravo Charlie' };
      const result = checkBookingSchema.parse(data);
      expect(result.confirmationCode).toBe('Alpha Bravo Charlie');
    });

    it('should reject invalid codes', () => {
      expect(() => checkBookingSchema.parse({ confirmationCode: '' })).toThrow();
    });
  });

  describe('transferCallSchema', () => {
    it('should validate call transfer requests', () => {
      const validData = {
        callId: 'call_123',
        reason: 'Customer requested human agent',
        customerName: 'John Doe',
        summary: 'Customer wants to modify reservation'
      };
      
      const result = transferCallSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should handle minimal required fields', () => {
      const minimalData = {
        callId: 'call_456',
        reason: 'Complex request'
      };
      
      const result = transferCallSchema.parse(minimalData);
      expect(result.callId).toBe('call_456');
      expect(result.reason).toBe('Complex request');
      expect(result.customerName).toBeUndefined();
      expect(result.summary).toBeUndefined();
    });

    it('should reject invalid transfer requests', () => {
      expect(() => transferCallSchema.parse({
        callId: '',
        reason: 'Test'
      })).toThrow();

      expect(() => transferCallSchema.parse({
        callId: 'call_123',
        reason: ''
      })).toThrow();

      expect(() => transferCallSchema.parse({
        callId: 'call_123',
        reason: 'a'.repeat(201) // Too long
      })).toThrow();
    });
  });

  describe('error handling', () => {
    it('should provide detailed error messages', () => {
      try {
        makeReservationSchema.parse({
          customerName: '',
          date: '2025-06-25',
          time: 'invalid-time',
          partySize: 0
        });
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors.length).toBeGreaterThan(0);
          expect(error.errors.some(e => e.path.includes('customerName'))).toBe(true);
          expect(error.errors.some(e => e.path.includes('time'))).toBe(true);
          expect(error.errors.some(e => e.path.includes('partySize'))).toBe(true);
        }
      }
    });
  });
});