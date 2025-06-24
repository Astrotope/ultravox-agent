import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validateParams,
  ValidationTarget,
  validateSchema
} from '../../../src/middleware/zodValidation.middleware';

// Mock ApiResponseUtil
jest.mock('../../../src/utils/apiResponse', () => ({
  ApiResponseUtil: {
    validationError: jest.fn(),
    error: jest.fn()
  }
}));

import { ApiResponseUtil } from '../../../src/utils/apiResponse';

describe('ZodValidation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {}
    };
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive')
    });

    it('should validate valid body data', () => {
      mockReq.body = { name: 'John', age: 25 };
      
      const middleware = validateBody(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({ name: 'John', age: 25 });
    });

    it('should transform data if schema includes transformations', () => {
      const transformSchema = z.object({
        name: z.string().transform(val => val.trim()),
        age: z.string().transform(val => parseInt(val, 10))
      });
      
      mockReq.body = { name: '  John  ', age: '25' };
      
      const middleware = validateBody(transformSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({ name: 'John', age: 25 });
    });

    it('should call ApiResponseUtil.validationError for invalid data', () => {
      mockReq.body = { name: '', age: -5 };
      
      const middleware = validateBody(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(ApiResponseUtil.validationError).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('Name is required')
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('Age must be positive')
          })
        ])
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip unknown properties by default', () => {
      mockReq.body = { 
        name: 'John', 
        age: 25, 
        extraField: 'should be removed' 
      };
      
      const middleware = validateBody(testSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({ name: 'John', age: 25 });
      expect(mockReq.body).not.toHaveProperty('extraField');
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.string().transform(val => parseInt(val, 10)).default('1'),
      limit: z.string().transform(val => parseInt(val, 10)).default('10')
    });

    it('should validate and transform query parameters', () => {
      mockReq.query = { page: '2', limit: '20' };
      
      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query).toEqual({ page: 2, limit: 20 });
    });

    it('should apply defaults for missing query parameters', () => {
      mockReq.query = {};
      
      const middleware = validateQuery(querySchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query).toEqual({ page: 1, limit: 10 });
    });
  });

  describe('validateParams', () => {
    const paramsSchema = z.object({
      id: z.string().uuid('Invalid ID format'),
      category: z.string().min(1, 'Category is required')
    });

    it('should validate route parameters', () => {
      mockReq.params = { 
        id: '123e4567-e89b-12d3-a456-426614174000',
        category: 'bookings'
      };
      
      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject invalid UUID format', () => {
      mockReq.params = { 
        id: 'invalid-uuid',
        category: 'bookings'
      };
      
      const middleware = validateParams(paramsSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(ApiResponseUtil.validationError).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('Invalid ID format')
          })
        ])
      );
    });
  });

  describe('validateSchema with custom options', () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number()
    });

    it('should validate different request targets', () => {
      const testCases = [
        { target: ValidationTarget.BODY, data: { name: 'test', value: 42 } },
        { target: ValidationTarget.QUERY, data: { name: 'test', value: 42 } },
        { target: ValidationTarget.PARAMS, data: { name: 'test', value: 42 } }
      ];

      testCases.forEach(({ target, data }) => {
        const mockReqLocal = { ...mockReq };
        (mockReqLocal as any)[target] = data;
        
        const middleware = validateSchema({ target, schema: testSchema });
        middleware(mockReqLocal as Request, mockRes as Response, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
        expect((mockReqLocal as any)[target]).toEqual(data);
      });
    });
  });

  describe('error handling', () => {
    it('should handle non-Zod errors gracefully', () => {
      const errorSchema = z.object({}).transform(() => {
        throw new Error('Custom error');
      });
      
      mockReq.body = {};
      
      const middleware = validateBody(errorSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(ApiResponseUtil.error).toHaveBeenCalledWith(
        mockRes,
        'Validation error occurred',
        500
      );
    });

    it('should provide detailed error formatting', () => {
      const schema = z.object({
        email: z.string().email('Invalid email'),
        age: z.number().min(18, 'Must be at least 18'),
        nested: z.object({
          field: z.string().min(1, 'Nested field required')
        })
      });
      
      mockReq.body = {
        email: 'invalid-email',
        age: 15,
        nested: { field: '' }
      };
      
      const middleware = validateBody(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(ApiResponseUtil.validationError).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('Invalid email')
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('Must be at least 18')
          }),
          expect.objectContaining({
            field: 'nested.field',
            message: expect.stringContaining('Nested field required')
          })
        ])
      );
    });
  });
});