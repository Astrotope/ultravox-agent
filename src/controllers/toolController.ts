import { Request, Response } from 'express';
import { ToolService } from '../services/toolService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class ToolController {
  private toolService: ToolService;

  constructor() {
    this.toolService = new ToolService();
  }

  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { date, time, partySize } = req.body;
      
      logger.info('Checking availability', {
        correlationId: res.locals.correlationId,
        date,
        time,
        partySize
      });

      const result = await this.toolService.checkAvailability(date, time, partySize);

      logger.info('Availability check completed', {
        correlationId: res.locals.correlationId,
        date,
        time,
        partySize,
        available: result.available
      });

      ApiResponseUtil.success(res, result, 'Availability checked successfully');
    } catch (error) {
      logger.error('Error checking availability', {
        correlationId: res.locals.correlationId,
        requestData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async makeReservation(req: Request, res: Response): Promise<void> {
    try {
      const reservationData = req.body;
      
      logger.info('Making reservation', {
        correlationId: res.locals.correlationId,
        customerName: reservationData.customerName,
        date: reservationData.date,
        time: reservationData.time,
        partySize: reservationData.partySize
      });

      const result = await this.toolService.makeReservation(reservationData);

      logger.info('Reservation created', {
        correlationId: res.locals.correlationId,
        confirmationCode: result.confirmationCode,
        customerName: reservationData.customerName
      });

      ApiResponseUtil.success(res, result, 'Reservation created successfully', 201);
    } catch (error) {
      logger.error('Error making reservation', {
        correlationId: res.locals.correlationId,
        reservationData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async modifyReservation(req: Request, res: Response): Promise<void> {
    try {
      const modificationData = req.body;
      
      logger.info('Modifying reservation', {
        correlationId: res.locals.correlationId,
        confirmationCode: modificationData.confirmationCode
      });

      const result = await this.toolService.modifyReservation(modificationData);

      logger.info('Reservation modified', {
        correlationId: res.locals.correlationId,
        confirmationCode: modificationData.confirmationCode,
        result
      });

      ApiResponseUtil.success(res, result, 'Reservation modified successfully');
    } catch (error) {
      logger.error('Error modifying reservation', {
        correlationId: res.locals.correlationId,
        modificationData: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.body;
      
      logger.info('Cancelling reservation', {
        correlationId: res.locals.correlationId,
        confirmationCode
      });

      const result = await this.toolService.cancelReservation(confirmationCode);

      logger.info('Reservation cancelled', {
        correlationId: res.locals.correlationId,
        confirmationCode,
        result
      });

      ApiResponseUtil.success(res, result, 'Reservation cancelled successfully');
    } catch (error) {
      logger.error('Error cancelling reservation', {
        correlationId: res.locals.correlationId,
        confirmationCode: req.body.confirmationCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getBookingDetails(req: Request, res: Response): Promise<void> {
    try {
      const { confirmationCode } = req.body;
      
      logger.info('Getting booking details', {
        correlationId: res.locals.correlationId,
        confirmationCode
      });

      const result = await this.toolService.getBookingDetails(confirmationCode);

      logger.info('Retrieved booking details', {
        correlationId: res.locals.correlationId,
        confirmationCode,
        found: !!result
      });

      ApiResponseUtil.success(res, result, 'Booking details retrieved successfully');
    } catch (error) {
      // Log 404 errors as warnings, other errors as errors
      const statusCode = (error as any).statusCode || 500;
      const isClientError = statusCode >= 400 && statusCode < 500;
      const logLevel = isClientError ? 'warn' : 'error';
      
      logger[logLevel]('Error getting booking details', {
        correlationId: res.locals.correlationId,
        confirmationCode: req.body.confirmationCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}