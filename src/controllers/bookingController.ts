import { Request, Response } from 'express';
import { BookingService } from '../services/bookingService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class BookingController {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const bookings = await this.bookingService.getAllBookings();
      
      logger.info('Retrieved all bookings', {
        correlationId: res.locals.correlationId,
        count: bookings.length
      });

      ApiResponseUtil.success(res, bookings, 'Bookings retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving bookings', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getBookingByCode(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.params;
      const booking = await this.bookingService.findBookingByConfirmationCode(confirmationCode);

      if (!booking) {
        ApiResponseUtil.notFound(res, `Booking with confirmation code ${confirmationCode} not found`);
        return;
      }

      logger.info('Retrieved booking by code', {
        correlationId: res.locals.correlationId,
        confirmationCode
      });

      ApiResponseUtil.success(res, booking, 'Booking retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving booking by code', {
        correlationId: res.locals.correlationId,
        confirmationCode: req.params.confirmationCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const bookingData = req.body;
      const booking = await this.bookingService.createBooking(bookingData);

      logger.info('Created new booking', {
        correlationId: res.locals.correlationId,
        confirmationCode: booking.confirmationCode,
        customerName: booking.customerName
      });

      ApiResponseUtil.success(res, booking, 'Booking created successfully', 201);
    } catch (error) {
      logger.error('Error creating booking', {
        correlationId: res.locals.correlationId,
        bookingData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateBooking(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.params;
      const updateData = req.body;
      
      const updatedBooking = await this.bookingService.updateBooking(confirmationCode, updateData);

      if (!updatedBooking) {
        ApiResponseUtil.notFound(res, `Booking with confirmation code ${confirmationCode} not found`);
        return;
      }

      logger.info('Updated booking', {
        correlationId: res.locals.correlationId,
        confirmationCode,
        updateData
      });

      ApiResponseUtil.success(res, updatedBooking, 'Booking updated successfully');
    } catch (error) {
      logger.error('Error updating booking', {
        correlationId: res.locals.correlationId,
        confirmationCode: req.params.confirmationCode,
        updateData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.params;
      const cancelled = await this.bookingService.cancelBooking(confirmationCode);

      if (!cancelled) {
        ApiResponseUtil.notFound(res, `Booking with confirmation code ${confirmationCode} not found`);
        return;
      }

      logger.info('Cancelled booking', {
        correlationId: res.locals.correlationId,
        confirmationCode
      });

      ApiResponseUtil.success(res, { confirmationCode, status: 'CANCELLED' }, 'Booking cancelled successfully');
    } catch (error) {
      logger.error('Error cancelling booking', {
        correlationId: res.locals.correlationId,
        confirmationCode: req.params.confirmationCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}