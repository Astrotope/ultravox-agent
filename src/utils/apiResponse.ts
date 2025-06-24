import { Response } from 'express';
import { APIResponse } from '../types';

/**
 * Standardized API response utility
 */
export class ApiResponseUtil {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): void {
    const response: APIResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
    
    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(res: Response, message: string, statusCode: number = 500, errors?: any): void {
    const response: APIResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(errors && { details: errors })
    };
    
    res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, errors: any[]): void {
    const response: APIResponse = {
      success: false,
      error: 'Validation failed',
      timestamp: new Date().toISOString(),
      details: errors
    };
    
    res.status(400).json(response);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, message: string = 'Resource not found'): void {
    const response: APIResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
    
    res.status(404).json(response);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    const response: APIResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    };
    
    res.status(401).json(response);
  }
}