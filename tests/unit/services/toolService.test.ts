import { ToolService } from '../../../src/services/toolService';
import { BookingService } from '../../../src/services/bookingService';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/services/bookingService');
jest.mock('../../../src/utils/logger');

const mockBookingService = jest.mocked(BookingService);
const mockLogger = jest.mocked(logger);

describe('ToolService', () => {
  let toolService: ToolService;
  let mockBookingServiceInstance: jest.Mocked<BookingService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBookingServiceInstance = {
      parseDate: jest.fn(),
      checkAvailability: jest.fn(),
      createBooking: jest.fn(),
      findBookingByConfirmationCode: jest.fn(),
      convertToPhonetic: jest.fn(),
      modifyBooking: jest.fn(),
      cancelBooking: jest.fn(),
    } as any;

    mockBookingService.mockImplementation(() => mockBookingServiceInstance);
    
    toolService = new ToolService();
  });

  describe('getDailySpecials', () => {
    it('should return daily specials', async () => {
      const result = await toolService.getDailySpecials();

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('Today\'s specials are'),
        specials: {
          soup: 'Tuscan White Bean Soup with rosemary and pancetta',
          meal: 'Pan-Seared Salmon with lemon herb risotto and seasonal vegetables'
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Tool: Getting daily specials');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in the logger to simulate service error
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logging error');
      });

      await expect(toolService.getDailySpecials()).rejects.toThrow('Logging error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tool: Error getting daily specials',
        { error: expect.any(Error) }
      );
    });
  });

  describe('getOpeningHours', () => {
    it('should return opening hours with current status', async () => {
      const result = await toolService.getOpeningHours();

      expect(result).toEqual({
        success: true,
        isOpen: expect.any(Boolean),
        message: expect.any(String),
        hours: {
          'Monday through Thursday': '5:00 PM to 10:00 PM',
          'Friday and Saturday': '5:00 PM to 11:00 PM',
          'Sunday': '5:00 PM to 10:00 PM'
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Tool: Getting opening hours');
    });

    it('should calculate opening status correctly during business hours', async () => {
      // Mock current time to be during business hours (e.g., 7 PM on a Tuesday)
      const mockDate = new Date('2025-06-24T19:00:00'); // Tuesday 7 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await toolService.getOpeningHours();

      expect(result.isOpen).toBe(true);
      expect(result.message).toContain('currently open');

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should calculate opening status correctly outside business hours', async () => {
      // Mock current time to be outside business hours (e.g., 2 PM on a Tuesday)
      const mockDate = new Date('2025-06-24T14:00:00'); // Tuesday 2 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await toolService.getOpeningHours();

      expect(result.isOpen).toBe(false);
      expect(result.message).toContain('closed but will open');

      // Restore Date
      jest.restoreAllMocks();
    });
  });

  describe('transferCall', () => {
    it('should handle call transfer successfully', async () => {
      const callId = 'call-123';
      const reason = 'Customer requested human agent';
      const customerName = 'John Doe';
      const summary = 'Complex booking request';

      const result = await toolService.transferCall(callId, reason, customerName, summary);

      expect(result).toEqual({
        status: 'success',
        message: 'Call transfer initiated',
        transferMessage: expect.any(String),
        reason,
        customerName,
        summary
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool: Transferring call',
        { callId, reason, customerName }
      );
    });

    it('should handle transfer without optional parameters', async () => {
      const callId = 'call-456';
      const reason = 'Complex request';

      const result = await toolService.transferCall(callId, reason);

      expect(result).toEqual({
        status: 'success',
        message: 'Call transfer initiated',
        transferMessage: expect.any(String),
        reason,
        customerName: undefined,
        summary: undefined
      });
    });

    it('should adapt transfer message based on opening hours', async () => {
      // Test when restaurant is open
      const mockDate = new Date('2025-06-24T19:00:00'); // Tuesday 7 PM
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await toolService.transferCall('call-123', 'test');

      expect(result.transferMessage).toContain('connecting you with our booking team');
      expect(result.transferMessage).toContain('busy serving hours');

      // Restore Date
      jest.restoreAllMocks();
    });

    it('should handle errors gracefully', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Service error');
      });

      await expect(
        toolService.transferCall('call-123', 'test')
      ).rejects.toThrow('Service error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tool: Error transferring call',
        { error: expect.any(Error), callId: 'call-123', reason: 'test' }
      );
    });
  });

  describe('formatTime helper', () => {
    it('should format times correctly', () => {
      // Test the private method indirectly through opening hours
      const result = toolService.getOpeningHours();
      
      // The formatted hours should be properly formatted
      expect(result).resolves.toEqual(
        expect.objectContaining({
          hours: expect.objectContaining({
            'Monday through Thursday': '5:00 PM to 10:00 PM'
          })
        })
      );
    });
  });
});