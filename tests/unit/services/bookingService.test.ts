import { BookingService } from '../../../src/services/bookingService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('../../../src/config/database', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
  }
}));

import { prisma } from '../../../src/config/database';

const mockPrisma = prisma as jest.Mocked<PrismaClient>;

describe('BookingService', () => {
  let bookingService: BookingService;

  beforeEach(() => {
    bookingService = new BookingService();
    jest.clearAllMocks();
  });

  describe('generateConfirmationCode', () => {
    it('should generate a 3-letter confirmation code', () => {
      const code = bookingService.generateConfirmationCode();
      expect(code).toHaveLength(3);
      expect(code).toMatch(/^[A-Z]{3}$/);
    });

    it('should generate different codes on multiple calls', () => {
      const codes = Array.from({ length: 10 }, () => bookingService.generateConfirmationCode());
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThan(1);
    });
  });

  describe('convertToPhonetic', () => {
    it('should convert letters to phonetic format', () => {
      const phonetic = bookingService.convertToPhonetic('ABC');
      expect(phonetic).toBe('A for Alpha, B for Bravo, C for Charlie');
    });

    it('should handle single letters', () => {
      const phonetic = bookingService.convertToPhonetic('X');
      expect(phonetic).toBe('X for X-ray');
    });
  });

  describe('convertPhoneticToLetters', () => {
    it('should convert phonetic format to letters', () => {
      const letters = bookingService.convertPhoneticToLetters('A for Alpha, B for Bravo, C for Charlie');
      expect(letters).toBe('ABC');
    });

    it('should handle "Victor Mike Golf" format', () => {
      const letters = bookingService.convertPhoneticToLetters('Victor Mike Golf');
      expect(letters).toBe('VMG');
    });

    it('should handle already formatted letters', () => {
      const letters = bookingService.convertPhoneticToLetters('ABC');
      expect(letters).toBe('ABC');
    });

    it('should handle lowercase input', () => {
      const letters = bookingService.convertPhoneticToLetters('abc');
      expect(letters).toBe('ABC');
    });

    it('should handle mixed case phonetic input', () => {
      const letters = bookingService.convertPhoneticToLetters('alpha bravo charlie');
      expect(letters).toBe('ABC');
    });
  });

  describe('checkAvailability', () => {
    it('should return available slots when no bookings exist', async () => {
      // Mock empty bookings array
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const slots = await bookingService.checkAvailability({
        date: '2025-06-25',
        partySize: 2
      });

      expect(slots).toHaveLength(10); // All base time slots should be available
      expect(slots[0]).toMatchObject({
        date: '2025-06-25',
        time: '5:00 PM',
        available: true,
        remainingCapacity: 8
      });
    });

    it('should calculate remaining capacity correctly', async () => {
      // Mock existing booking
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          confirmationCode: 'ABC',
          date: '2025-06-25',
          time: '7:00 PM',
          partySize: 4,
          status: 'CONFIRMED'
        }
      ]);

      const slots = await bookingService.checkAvailability({
        date: '2025-06-25',
        partySize: 2
      });

      const sevenPmSlot = slots.find(slot => slot.time === '7:00 PM');
      expect(sevenPmSlot).toMatchObject({
        time: '7:00 PM',
        remainingCapacity: 4, // 8 - 4 = 4
        available: true
      });
    });

    it('should not return slots that cannot accommodate party size', async () => {
      // Mock existing booking that fills most capacity
      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          confirmationCode: 'ABC',
          date: '2025-06-25',
          time: '7:00 PM',
          partySize: 7, // Only 1 seat remaining
          status: 'CONFIRMED'
        }
      ]);

      const slots = await bookingService.checkAvailability({
        date: '2025-06-25',
        partySize: 4 // Requesting more than available
      });

      const sevenPmSlot = slots.find(slot => slot.time === '7:00 PM');
      expect(sevenPmSlot).toBeUndefined();
    });
  });

  describe('parseDate', () => {
    it('should parse natural language dates', () => {
      const result = bookingService.parseDate('tomorrow');
      
      expect(result.isValid).toBe(true);
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should parse formatted dates', () => {
      const result = bookingService.parseDate('2025-06-30');
      
      expect(result.isValid).toBe(true);
      expect(result.date).toBe('2025-06-30');
    });

    it('should reject past dates', () => {
      const result = bookingService.parseDate('2025-06-20'); // Assuming current date is 2025-06-24
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Date is in the past');
    });

    it('should handle invalid input gracefully', () => {
      const result = bookingService.parseDate('invalid date');
      
      expect(result.isValid).toBe(true); // Should fallback to tomorrow
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.error).toContain('Could not parse date');
    });
  });

  describe('findBookingByConfirmationCode', () => {
    it('should find booking by exact confirmation code', async () => {
      const mockBooking = {
        id: '1',
        confirmationCode: 'ABC',
        customerName: 'Test Customer',
        date: '2025-06-25',
        time: '7:00 PM',
        partySize: 2
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const booking = await bookingService.findBookingByConfirmationCode('ABC');
      expect(booking).toEqual(mockBooking);
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { confirmationCode: 'ABC' }
      });
    });

    it('should find booking by phonetic confirmation code', async () => {
      const mockBooking = {
        id: '1',
        confirmationCode: 'VMG',
        customerName: 'Test Customer'
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const booking = await bookingService.findBookingByConfirmationCode('Victor Mike Golf');
      expect(booking).toEqual(mockBooking);
      expect(mockPrisma.booking.findUnique).toHaveBeenCalledWith({
        where: { confirmationCode: 'VMG' }
      });
    });

    it('should return null for non-existent booking', async () => {
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const booking = await bookingService.findBookingByConfirmationCode('XYZ');
      expect(booking).toBeNull();
    });
  });

  describe('createBooking - Duplicate Detection', () => {
    beforeEach(() => {
      // Mock checkAvailability to return available slots
      jest.spyOn(bookingService, 'checkAvailability').mockResolvedValue([
        {
          date: '2025-06-30',
          time: '7:30 PM',
          available: true,
          remainingCapacity: 8
        },
        {
          date: '2025-06-30',
          time: '8:00 PM',
          available: true,
          remainingCapacity: 8
        }
      ]);
    });

    it('should prevent duplicate bookings for same customer, date, and time', async () => {
      // Mock existing booking found
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-123',
        confirmationCode: 'ABC',
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        status: 'CONFIRMED'
      });

      const bookingData = {
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 4,
        phone: '+1234567890'
      };

      await expect(bookingService.createBooking(bookingData))
        .rejects
        .toThrow('You already have a reservation (ABC) for 2 people at 7:30 PM on 2025-06-30. To modify this booking, please use your confirmation code or call us.');
    });

    it('should allow bookings for different customers at same time', async () => {
      // Mock no existing booking found (different customer)
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null); // No duplicate confirmation code

      const newBooking = {
        id: 'new-123',
        confirmationCode: 'XYZ',
        customerName: 'Jane Smith',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        status: 'CONFIRMED'
      };
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue(newBooking);

      const bookingData = {
        customerName: 'Jane Smith',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        phone: '+1234567890'
      };

      const result = await bookingService.createBooking(bookingData);
      expect(result).toEqual(newBooking);
    });

    it('should allow same customer to book different times', async () => {
      // Mock no existing booking found (different time)
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const newBooking = {
        id: 'new-456',
        confirmationCode: 'DEF',
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '8:00 PM',
        partySize: 2,
        status: 'CONFIRMED'
      };
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue(newBooking);

      const bookingData = {
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '8:00 PM',
        partySize: 2,
        phone: '+1234567890'
      };

      const result = await bookingService.createBooking(bookingData);
      expect(result).toEqual(newBooking);
    });

    it('should be case-insensitive for customer names', async () => {
      // Mock existing booking found with different case
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-789',
        confirmationCode: 'GHI',
        customerName: 'john doe',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 3,
        status: 'CONFIRMED'
      });

      const bookingData = {
        customerName: 'JOHN DOE',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        phone: '+1234567890'
      };

      await expect(bookingService.createBooking(bookingData))
        .rejects
        .toThrow('You already have a reservation (GHI) for 3 people at 7:30 PM on 2025-06-30. To modify this booking, please use your confirmation code or call us.');
    });

    it('should ignore cancelled bookings when checking duplicates', async () => {
      // Mock no active booking found (cancelled booking exists but ignored)
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const newBooking = {
        id: 'new-999',
        confirmationCode: 'JKL',
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        status: 'CONFIRMED'
      };
      (mockPrisma.booking.create as jest.Mock).mockResolvedValue(newBooking);

      const bookingData = {
        customerName: 'John Doe',
        date: '2025-06-30',
        time: '7:30 PM',
        partySize: 2,
        phone: '+1234567890'
      };

      const result = await bookingService.createBooking(bookingData);
      expect(result).toEqual(newBooking);

      // Verify it only looked for CONFIRMED bookings
      expect(mockPrisma.booking.findFirst).toHaveBeenCalledWith({
        where: {
          customerName: {
            equals: 'John Doe',
            mode: 'insensitive'
          },
          date: '2025-06-30',
          time: '7:30 PM',
          status: 'CONFIRMED'
        }
      });
    });
  });
});