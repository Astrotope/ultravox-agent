import { BookingService } from './bookingService';
import { CallManagerService } from './callManagerService';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface AdminStats {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  totalCalls: number;
  activeCalls: number;
  averageCallDuration?: number;
  bookingsByDate: { [date: string]: number };
  systemStatus: {
    database: 'healthy' | 'unhealthy';
    memory: {
      used: string;
      total: string;
      percentage: number;
    };
    uptime: string;
  };
}

export interface AdminBookingQuery {
  date?: string;
  status?: string;
  customerName?: string;
  limit?: number;
  offset?: number;
}

export class AdminService {
  private bookingService: BookingService;
  private callManager: CallManagerService;

  constructor() {
    this.bookingService = new BookingService();
    this.callManager = new CallManagerService();
  }

  async getSystemStats(): Promise<AdminStats> {
    try {
      logger.info('Admin: Getting system stats');

      // Get booking statistics
      const allBookings = await prisma.booking.findMany();
      const activeBookings = allBookings.filter(b => b.status === 'CONFIRMED');
      const cancelledBookings = allBookings.filter(b => b.status === 'CANCELLED');

      // Get call statistics
      const allCalls = await prisma.callLog.findMany();
      const activeCalls = allCalls.filter(c => c.status === 'ACTIVE');
      
      // Calculate average call duration
      const completedCalls = allCalls.filter(c => c.duration !== null);
      const averageCallDuration = completedCalls.length > 0
        ? completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCalls.length
        : undefined;

      // Group bookings by date
      const bookingsByDate: { [date: string]: number } = {};
      allBookings.forEach(booking => {
        const date = booking.date;
        bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
      });

      // System health checks
      const memUsage = process.memoryUsage();
      const systemStatus = {
        database: await this.checkDatabaseHealth(),
        memory: {
          used: `${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
          total: `${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        uptime: this.formatUptime(process.uptime())
      };

      return {
        totalBookings: allBookings.length,
        activeBookings: activeBookings.length,
        cancelledBookings: cancelledBookings.length,
        totalCalls: allCalls.length,
        activeCalls: activeCalls.length,
        averageCallDuration,
        bookingsByDate,
        systemStatus
      };
    } catch (error) {
      logger.error('Admin: Error getting system stats', { error });
      throw new Error('Failed to retrieve system statistics');
    }
  }

  async getBookings(query: AdminBookingQuery = {}): Promise<any> {
    try {
      logger.info('Admin: Getting bookings', { query });

      const where: any = {};

      if (query.date) {
        where.date = query.date;
      }

      if (query.status) {
        where.status = query.status.toUpperCase();
      }

      if (query.customerName) {
        where.customerName = {
          contains: query.customerName,
          mode: 'insensitive'
        };
      }

      const bookings = await prisma.booking.findMany({
        where,
        skip: query.offset || 0,
        take: query.limit || 100,
        orderBy: {
          createdAt: 'desc'
        }
      });

      const total = await prisma.booking.count({ where });

      return {
        bookings,
        pagination: {
          total,
          offset: query.offset || 0,
          limit: query.limit || 100,
          hasMore: (query.offset || 0) + bookings.length < total
        }
      };
    } catch (error) {
      logger.error('Admin: Error getting bookings', { error, query });
      throw new Error('Failed to retrieve bookings');
    }
  }

  async getCallLogs(limit = 100, offset = 0): Promise<any> {
    try {
      logger.info('Admin: Getting call logs', { limit, offset });

      const callLogs = await prisma.callLog.findMany({
        skip: offset,
        take: limit,
        orderBy: {
          startedAt: 'desc'
        }
      });

      const total = await prisma.callLog.count();

      return {
        callLogs,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + callLogs.length < total
        }
      };
    } catch (error) {
      logger.error('Admin: Error getting call logs', { error, limit, offset });
      throw new Error('Failed to retrieve call logs');
    }
  }

  async getActiveCallsStatus(): Promise<any> {
    try {
      logger.info('Admin: Getting active calls status');

      const activeCallsFromManager = this.callManager.getActiveCalls();
      const activeCallsArray = Array.from(activeCallsFromManager.values());

      return {
        activeCalls: activeCallsArray,
        capacity: {
          current: activeCallsArray.length,
          maximum: 5, // Default max concurrent calls
          available: 5 - activeCallsArray.length
        }
      };
    } catch (error) {
      logger.error('Admin: Error getting active calls status', { error });
      throw new Error('Failed to retrieve active calls status');
    }
  }

  async exportBookings(format: 'json' | 'csv' = 'json'): Promise<any> {
    try {
      logger.info('Admin: Exporting bookings', { format });

      const bookings = await prisma.booking.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['Confirmation Code', 'Customer Name', 'Phone', 'Date', 'Time', 'Party Size', 'Special Requirements', 'Status', 'Created At'];
        const csv = [
          headers.join(','),
          ...bookings.map(booking => [
            booking.confirmationCode,
            `"${booking.customerName}"`,
            booking.phone || '',
            booking.date,
            booking.time,
            booking.partySize,
            `"${booking.specialRequirements || ''}"`,
            booking.status,
            booking.createdAt.toISOString()
          ].join(','))
        ].join('\n');

        return {
          format: 'csv',
          data: csv,
          filename: `bookings-${new Date().toISOString().split('T')[0]}.csv`
        };
      }

      return {
        format: 'json',
        data: bookings,
        filename: `bookings-${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      logger.error('Admin: Error exporting bookings', { error, format });
      throw new Error('Failed to export bookings');
    }
  }

  private async checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch (error) {
      logger.error('Database health check failed', { error });
      return 'unhealthy';
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Add missing methods for controller compatibility
  async getSystemHealth(): Promise<any> {
    return this.getSystemStats();
  }

  async getActiveCalls(): Promise<any> {
    return this.getActiveCallsStatus();
  }

  async endCall(callId: string): Promise<any> {
    try {
      logger.info('Admin: Ending call', { callId });
      
      // End the call through call manager
      this.callManager.endCall(callId, 'admin_terminated');
      
      return {
        success: true,
        message: `Call ${callId} terminated by admin`,
        callId
      };
    } catch (error) {
      logger.error('Admin: Error ending call', { error, callId });
      throw new Error('Failed to end call');
    }
  }

  async getAllBookings(params: AdminBookingQuery = {}): Promise<any> {
    return this.getBookings(params);
  }

  async getBookingStats(): Promise<any> {
    const stats = await this.getSystemStats();
    return {
      totalBookings: stats.totalBookings,
      activeBookings: stats.activeBookings,
      cancelledBookings: stats.cancelledBookings,
      bookingsByDate: stats.bookingsByDate
    };
  }
}