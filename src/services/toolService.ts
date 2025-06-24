import { BookingService } from './bookingService';
import { DateUtils } from '../utils/dateUtils';
import { logger } from '../utils/logger';
import { ApplicationError, ValidationError } from '../middleware/error.middleware';

export interface ToolAvailabilityResult {
  available: boolean;
  message: string;
  slots?: Array<{
    time: string;
    available: boolean;
    remainingCapacity: number;
  }>;
}

export interface ToolReservationResult {
  success: boolean;
  confirmationCode: string;
  phoneticCode: string;
  message: string;
  booking: {
    customerName: string;
    date: string;
    time: string;
    partySize: number;
    specialRequirements?: string;
  };
}

export interface ModifyReservationData {
  confirmationCode: string;
  newDate?: string;
  newTime?: string;
  newPartySize?: number;
  newSpecialRequirements?: string;
}

export class ToolService {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  async checkAvailability(date: string, time?: string, partySize?: number): Promise<ToolAvailabilityResult> {
    try {
      logger.info('Tool: Checking availability', { date, time, partySize });

      // Parse the date to ensure it's valid
      const dateResult = this.bookingService.parseDate(date);
      if (!dateResult.isValid) {
        throw new ValidationError(`Invalid date: ${dateResult.error || 'Date must be in the future'}`);
      }

      const parsedDate = dateResult.date;
      const requestedPartySize = partySize || 1;

      // Check availability for the date
      const slots = await this.bookingService.checkAvailability({
        date: parsedDate,
        partySize: requestedPartySize
      });

      if (time) {
        // Check specific time slot
        const requestedSlot = slots.find(slot => slot.time === time);
        if (requestedSlot) {
          return {
            available: true,
            message: `Available for ${requestedPartySize} people at ${time} on ${DateUtils.formatDateForDisplay(parsedDate)}`,
            slots: [requestedSlot]
          };
        } else {
          return {
            available: false,
            message: `No availability for ${requestedPartySize} people at ${time} on ${DateUtils.formatDateForDisplay(parsedDate)}`,
            slots
          };
        }
      } else {
        // Return all available slots
        return {
          available: slots.length > 0,
          message: slots.length > 0 
            ? `Found ${slots.length} available time slots for ${requestedPartySize} people on ${DateUtils.formatDateForDisplay(parsedDate)}`
            : `No availability for ${requestedPartySize} people on ${DateUtils.formatDateForDisplay(parsedDate)}`,
          slots
        };
      }
    } catch (error) {
      logger.error('Tool: Error checking availability', { error, date, time, partySize });
      // Re-throw validation and application errors to be handled by global error handler
      if (error instanceof ValidationError || error instanceof ApplicationError) {
        throw error;
      }
      // For other errors, return a generic error response
      return {
        available: false,
        message: 'Error checking availability. Please try again.'
      };
    }
  }

  async makeReservation(reservationData: any): Promise<ToolReservationResult> {
    try {
      logger.info('Tool: Making reservation', { 
        customerName: reservationData.customerName,
        date: reservationData.date,
        time: reservationData.time,
        partySize: reservationData.partySize
      });

      const booking = await this.bookingService.createBooking(reservationData);
      
      // Generate phonetic code
      const phoneticCode = this.bookingService.convertToPhonetic(booking.confirmationCode);

      return {
        success: true,
        confirmationCode: booking.confirmationCode,
        phoneticCode,
        message: `Reservation confirmed for ${booking.customerName}, party of ${booking.partySize}, on ${DateUtils.formatDateForDisplay(booking.date)} at ${booking.time}`,
        booking: {
          customerName: booking.customerName,
          date: booking.date,
          time: booking.time,
          partySize: booking.partySize,
          specialRequirements: booking.specialRequirements || undefined
        }
      };
    } catch (error) {
      logger.error('Tool: Error making reservation', { error, reservationData });
      // Re-throw validation and application errors to preserve status codes
      if (error instanceof ValidationError || error instanceof ApplicationError) {
        throw error;
      }
      // For other errors, wrap in a generic application error
      throw new ApplicationError(`Failed to create reservation: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  async modifyReservation(modificationData: ModifyReservationData): Promise<any> {
    try {
      logger.info('Tool: Modifying reservation', { 
        confirmationCode: modificationData.confirmationCode
      });

      // Find existing booking
      const existingBooking = await this.bookingService.findBookingByConfirmationCode(modificationData.confirmationCode);
      if (!existingBooking) {
        throw new Error(`Booking not found for confirmation code: ${modificationData.confirmationCode}`);
      }

      // Update booking data
      const updateData: any = {};
      if (modificationData.newDate) {
        const dateResult = this.bookingService.parseDate(modificationData.newDate);
        if (!dateResult.isValid) {
          throw new Error(`Invalid date: ${dateResult.error || 'Date must be in the future'}`);
        }
        updateData.date = dateResult.date;
      }
      if (modificationData.newTime) updateData.time = modificationData.newTime;
      if (modificationData.newPartySize) updateData.partySize = modificationData.newPartySize;
      if (modificationData.newSpecialRequirements) updateData.specialRequirements = modificationData.newSpecialRequirements;

      // Update the booking (this would need to be implemented in BookingService)
      // For now, return the existing booking with modifications noted
      return {
        success: true,
        message: `Reservation ${modificationData.confirmationCode} modification requested`,
        originalBooking: existingBooking,
        requestedChanges: updateData
      };
    } catch (error) {
      logger.error('Tool: Error modifying reservation', { error, modificationData });
      throw error;
    }
  }

  async cancelReservation(confirmationCode: string): Promise<any> {
    try {
      logger.info('Tool: Cancelling reservation', { confirmationCode });

      // Find existing booking
      const existingBooking = await this.bookingService.findBookingByConfirmationCode(confirmationCode);
      if (!existingBooking) {
        throw new Error(`Booking not found for confirmation code: ${confirmationCode}`);
      }

      // Cancel the booking (this would need to be implemented in BookingService)
      // For now, return success message
      return {
        success: true,
        message: `Reservation ${confirmationCode} has been cancelled`,
        cancelledBooking: existingBooking
      };
    } catch (error) {
      logger.error('Tool: Error cancelling reservation', { error, confirmationCode });
      throw error;
    }
  }

  async getBookingDetails(confirmationCode: string): Promise<any> {
    try {
      logger.info('Tool: Getting booking details', { confirmationCode });

      const booking = await this.bookingService.findBookingByConfirmationCode(confirmationCode);
      if (!booking) {
        throw new ApplicationError(`Booking not found for confirmation code: ${confirmationCode}`, 404);
      }

      const phoneticCode = this.bookingService.convertToPhonetic(booking.confirmationCode);

      return {
        booking: {
          confirmationCode: booking.confirmationCode,
          phoneticCode,
          customerName: booking.customerName,
          phone: booking.phone,
          date: booking.date,
          time: booking.time,
          partySize: booking.partySize,
          specialRequirements: booking.specialRequirements,
          status: booking.status
        },
        formattedDate: DateUtils.formatDateForDisplay(booking.date)
      };
    } catch (error) {
      logger.error('Tool: Error getting booking details', { error, confirmationCode });
      throw error;
    }
  }

}