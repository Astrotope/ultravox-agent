import { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { ApiResponseUtil } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.adminService.getSystemHealth();
      
      logger.info('Health check requested', {
        correlationId: res.locals.correlationId,
        status: health.status
      });

      ApiResponseUtil.success(res, health, 'System health retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving system health', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.adminService.getSystemStats();
      
      logger.info('System stats requested', {
        correlationId: res.locals.correlationId
      });

      ApiResponseUtil.success(res, stats, 'System statistics retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving system stats', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getActiveCalls(req: Request, res: Response): Promise<void> {
    try {
      const calls = await this.adminService.getActiveCalls();
      
      logger.info('Active calls requested', {
        correlationId: res.locals.correlationId,
        count: calls.length
      });

      ApiResponseUtil.success(res, calls, 'Active calls retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving active calls', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async endCall(req: Request, res: Response): Promise<void> {
    try {
      const { callId } = req.params;
      const result = await this.adminService.endCall(callId);
      
      logger.info('Call ended via admin', {
        correlationId: res.locals.correlationId,
        callId,
        success: result.success
      });

      ApiResponseUtil.success(res, result, 'Call ended successfully');
    } catch (error) {
      logger.error('Error ending call', {
        correlationId: res.locals.correlationId,
        callId: req.params.callId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getAllBookings(req: Request, res: Response): Promise<void> {
    try {
      const query = {
        status: req.query.status as string,
        customerName: req.query.customerName as string,
        date: req.query.date as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
      };

      // Remove undefined values
      Object.keys(query).forEach(key => 
        query[key as keyof typeof query] === undefined && delete query[key as keyof typeof query]
      );

      const result = await this.adminService.getBookings(query);
      
      logger.info('Bookings requested via admin', {
        correlationId: res.locals.correlationId,
        query,
        count: result.bookings?.length || 0
      });

      ApiResponseUtil.success(res, result, 'Bookings retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving bookings', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getBookingStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.adminService.getBookingStats();
      
      logger.info('Booking stats requested', {
        correlationId: res.locals.correlationId
      });

      ApiResponseUtil.success(res, stats, 'Booking statistics retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving booking stats', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getCallLogs(req: Request, res: Response): Promise<void> {
    try {
      const logs = await this.adminService.getCallLogs();
      
      logger.info('Call logs requested', {
        correlationId: res.locals.correlationId,
        count: logs.length
      });

      ApiResponseUtil.success(res, logs, 'Call logs retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving call logs', {
        correlationId: res.locals.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}