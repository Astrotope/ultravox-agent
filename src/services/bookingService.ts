import { Booking, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { DateUtils } from '../utils/dateUtils';
import { 
  MakeReservationRequest, 
  CheckAvailabilityRequest, 
  AvailabilitySlot,
  makeReservationSchema,
  checkAvailabilitySchema
} from '../schemas';
import { ApplicationError, ValidationError } from '../middleware/error.middleware';

// Re-export types for backward compatibility
export type CreateBookingData = MakeReservationRequest;
export type BookingAvailabilityParams = CheckAvailabilityRequest;
export type BookingSlot = AvailabilitySlot;

export class BookingService {
  private readonly baseTimeSlots = [
    { time: '5:00 PM', maxCapacity: 8 },
    { time: '5:30 PM', maxCapacity: 6 },
    { time: '6:00 PM', maxCapacity: 8 },
    { time: '6:30 PM', maxCapacity: 8 },
    { time: '7:00 PM', maxCapacity: 8 },
    { time: '7:30 PM', maxCapacity: 8 },
    { time: '8:00 PM', maxCapacity: 8 },
    { time: '8:30 PM', maxCapacity: 6 },
    { time: '9:00 PM', maxCapacity: 6 },
    { time: '9:30 PM', maxCapacity: 4 }
  ];

  // Generate three-letter phonetic booking ID
  generateConfirmationCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code: string;
    
    do {
      code = Array.from({ length: 3 }, () => 
        letters[Math.floor(Math.random() * letters.length)]
      ).join('');
    } while (false); // We'll add duplicate check later
    
    return code;
  }

  // Convert booking ID to phonetic alphabet for voice
  convertToPhonetic(bookingId: string): string {
    const phoneticAlphabet: { [key: string]: string } = {
      'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
      'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
      'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
      'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
      'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee', 'Z': 'Zulu'
    };

    const letters = bookingId.split('');
    const phoneticParts = letters.map(letter => `${letter} for ${phoneticAlphabet[letter] || letter}`);
    return phoneticParts.join(', ');
  }

  // Convert phonetic alphabet back to letters
  convertPhoneticToLetters(phoneticInput: string): string {
    const phoneticAlphabet: { [key: string]: string } = {
      'Alpha': 'A', 'Bravo': 'B', 'Charlie': 'C', 'Delta': 'D', 'Echo': 'E',
      'Foxtrot': 'F', 'Golf': 'G', 'Hotel': 'H', 'India': 'I', 'Juliet': 'J',
      'Kilo': 'K', 'Lima': 'L', 'Mike': 'M', 'November': 'N', 'Oscar': 'O',
      'Papa': 'P', 'Quebec': 'Q', 'Romeo': 'R', 'Sierra': 'S', 'Tango': 'T',
      'Uniform': 'U', 'Victor': 'V', 'Whiskey': 'W', 'X-ray': 'X', 'Yankee': 'Y', 'Zulu': 'Z'
    };
    
    const normalizedInput = phoneticInput.trim().toLowerCase();
    
    // If it's already a 3-letter code, return uppercase
    if (/^[a-z]{3}$/i.test(normalizedInput)) {
      return normalizedInput.toUpperCase();
    }
    
    // Handle "V for Victor, M for Mike, G for Golf" format
    const forPattern = /([a-z])\s+for\s+([a-z]+)/gi;
    const forMatches = [...normalizedInput.matchAll(forPattern)];
    
    if (forMatches.length === 3) {
      return forMatches.map(match => match[1].toUpperCase()).join('');
    }
    
    // Handle "Victor Mike Golf" format
    const words = normalizedInput.split(/[\s\-]+/).filter(word => word.length > 0);
    
    if (words.length === 3) {
      const letters = words.map(word => {
        const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        return phoneticAlphabet[capitalized];
      }).filter(Boolean);
      
      if (letters.length === 3) {
        return letters.join('');
      }
    }
    
    // If we can't parse it, return the original input (uppercase, no spaces)
    return phoneticInput.toUpperCase().replace(/\s+/g, '');
  }

  async checkAvailability({ date, partySize }: BookingAvailabilityParams): Promise<BookingSlot[]> {
    // Get existing bookings for the date
    const existingBookings = await prisma.booking.findMany({
      where: {
        date,
        status: 'CONFIRMED'
      }
    });

    // Ensure existingBookings is an array (defensive programming)
    const bookings = Array.isArray(existingBookings) ? existingBookings : [];

    // Calculate availability for each time slot
    const availableSlots: BookingSlot[] = [];

    for (const slot of this.baseTimeSlots) {
      // Find bookings for this specific time slot
      const slotBookings = bookings.filter(booking => booking.time === slot.time);
      
      // Calculate total people already booked for this slot
      const totalBooked = slotBookings.reduce((sum, booking) => sum + booking.partySize, 0);
      
      // Calculate remaining capacity
      const remainingCapacity = slot.maxCapacity - totalBooked;
      
      // Check if this slot can accommodate the requested party size
      if (remainingCapacity >= partySize) {
        availableSlots.push({
          date,
          time: slot.time,
          available: true,
          remainingCapacity
        });
      }
    }

    return availableSlots;
  }

  /**
   * Parse and validate date input
   */
  parseDate(dateInput: string): { date: string; isValid: boolean; error?: string } {
    const result = DateUtils.parseNaturalDate(dateInput);
    return {
      date: result.parsedDate,
      isValid: result.isValid,
      error: result.error
    };
  }

  /**
   * Validate booking data with Zod schema
   */
  validateBookingData(data: any): MakeReservationRequest {
    return makeReservationSchema.parse(data);
  }

  /**
   * Validate availability data with Zod schema
   */
  validateAvailabilityData(data: any): CheckAvailabilityRequest {
    return checkAvailabilitySchema.parse(data);
  }

  async createBooking(data: CreateBookingData): Promise<Booking> {
    // Validate input data with Zod
    const validatedData = this.validateBookingData(data);
    
    // Parse and validate the date
    const dateResult = this.parseDate(validatedData.date);
    if (!dateResult.isValid) {
      throw new ValidationError(`Invalid date: ${dateResult.error || 'Date must be in the future'}`);
    }

    // Generate unique confirmation code
    let confirmationCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      confirmationCode = this.generateConfirmationCode();
      const existing = await prisma.booking.findUnique({
        where: { confirmationCode }
      });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error('Failed to generate unique confirmation code');
    }

    // Use the parsed date for availability check
    const parsedDate = dateResult.date;

    // Check availability before creating
    const availableSlots = await this.checkAvailability({
      date: parsedDate,
      partySize: validatedData.partySize
    });

    const requestedSlot = availableSlots.find(slot => slot.time === validatedData.time);
    if (!requestedSlot) {
      throw new ApplicationError(`No availability for ${validatedData.partySize} people at ${validatedData.time} on ${parsedDate}`, 409);
    }

    // Check for potential duplicate bookings (same customer name + date + time)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        customerName: {
          equals: validatedData.customerName,
          mode: 'insensitive' // Case-insensitive comparison
        },
        date: parsedDate,
        time: validatedData.time,
        status: 'CONFIRMED'
      }
    });

    if (existingBooking) {
      throw new ApplicationError(`You already have a reservation (${existingBooking.confirmationCode}) for ${existingBooking.partySize} people at ${validatedData.time} on ${parsedDate}. To modify this booking, please use your confirmation code or call us.`, 409);
    }

    // Create the booking with validated data
    const booking = await prisma.booking.create({
      data: {
        confirmationCode,
        customerName: validatedData.customerName,
        phone: validatedData.phone,
        date: parsedDate, // Use the parsed date
        time: validatedData.time,
        partySize: validatedData.partySize,
        specialRequirements: validatedData.specialRequirements,
      }
    });

    return booking;
  }

  async findBookingByConfirmationCode(confirmationCode: string): Promise<Booking | null> {
    const normalizedCode = this.convertPhoneticToLetters(confirmationCode);
    
    return await prisma.booking.findUnique({
      where: { confirmationCode: normalizedCode }
    });
  }

  async getAllBookings(): Promise<Booking[]> {
    return await prisma.booking.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateBooking(id: string, data: Partial<CreateBookingData>): Promise<Booking> {
    return await prisma.booking.update({
      where: { id },
      data
    });
  }

  async cancelBooking(confirmationCode: string): Promise<Booking> {
    const normalizedCode = this.convertPhoneticToLetters(confirmationCode);
    
    return await prisma.booking.update({
      where: { confirmationCode: normalizedCode },
      data: { status: 'CANCELLED' }
    });
  }
}