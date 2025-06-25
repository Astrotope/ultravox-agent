import { Request, Response } from 'express';
import { ToolController } from '../../../src/controllers/toolController';
import { ToolService } from '../../../src/services/toolService';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/services/toolService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/apiResponse');

const mockToolService = jest.mocked(ToolService);
const mockLogger = jest.mocked(logger);

describe('ToolController', () => {
  let toolController: ToolController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockToolServiceInstance: jest.Mocked<ToolService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockToolServiceInstance = {
      checkAvailability: jest.fn(),
      makeReservation: jest.fn(),
      getBookingDetails: jest.fn(),
      getDailySpecials: jest.fn(),
      getOpeningHours: jest.fn(),
      transferCall: jest.fn(),
      modifyReservation: jest.fn(),
      cancelReservation: jest.fn(),
    } as any;

    mockToolService.mockImplementation(() => mockToolServiceInstance);
    
    toolController = new ToolController();
    
    mockRequest = {
      body: {},
    };
    
    mockResponse = {
      locals: {
        correlationId: 'test-correlation-id'
      },
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getDailySpecials', () => {
    it('should return daily specials successfully', async () => {
      const mockSpecials = {
        success: true,
        message: 'Daily specials retrieved',
        specials: {
          soup: 'Tomato soup',
          meal: 'Grilled salmon'
        }
      };

      mockToolServiceInstance.getDailySpecials.mockResolvedValue(mockSpecials);

      await toolController.getDailySpecials(mockRequest as Request, mockResponse as Response);

      expect(mockToolServiceInstance.getDailySpecials).toHaveBeenCalledWith();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Getting daily specials',
        { correlationId: 'test-correlation-id' }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Retrieved daily specials',
        { correlationId: 'test-correlation-id', specials: mockSpecials }
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Service error');
      mockToolServiceInstance.getDailySpecials.mockRejectedValue(error);

      await expect(
        toolController.getDailySpecials(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Service error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting daily specials',
        { correlationId: 'test-correlation-id', error: 'Service error' }
      );
    });
  });

  describe('getOpeningHours', () => {
    it('should return opening hours successfully', async () => {
      const mockHours = {
        success: true,
        isOpen: true,
        message: 'Currently open',
        hours: {
          'Monday through Thursday': '5:00 PM to 10:00 PM'
        }
      };

      mockToolServiceInstance.getOpeningHours.mockResolvedValue(mockHours);

      await toolController.getOpeningHours(mockRequest as Request, mockResponse as Response);

      expect(mockToolServiceInstance.getOpeningHours).toHaveBeenCalledWith();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Getting opening hours',
        { correlationId: 'test-correlation-id' }
      );
    });
  });

  describe('transferCall', () => {
    it('should transfer call successfully', async () => {
      mockRequest.body = {
        callId: 'call-123',
        reason: 'Customer request',
        customerName: 'John Doe',
        summary: 'Wants to book large party'
      };

      const mockResult = {
        status: 'success',
        message: 'Call transfer initiated'
      };

      mockToolServiceInstance.transferCall.mockResolvedValue(mockResult);

      await toolController.transferCall(mockRequest as Request, mockResponse as Response);

      expect(mockToolServiceInstance.transferCall).toHaveBeenCalledWith(
        'call-123',
        'Customer request',
        'John Doe',
        'Wants to book large party'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Transferring call',
        {
          correlationId: 'test-correlation-id',
          callId: 'call-123',
          reason: 'Customer request',
          customerName: 'John Doe'
        }
      );
    });

    it('should handle transfer with minimal data', async () => {
      mockRequest.body = {
        callId: 'call-456',
        reason: 'Complex request'
      };

      const mockResult = {
        status: 'success',
        message: 'Call transfer initiated'
      };

      mockToolServiceInstance.transferCall.mockResolvedValue(mockResult);

      await toolController.transferCall(mockRequest as Request, mockResponse as Response);

      expect(mockToolServiceInstance.transferCall).toHaveBeenCalledWith(
        'call-456',
        'Complex request',
        undefined,
        undefined
      );
    });
  });
});