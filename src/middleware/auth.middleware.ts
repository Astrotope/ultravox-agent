import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';

/**
 * Authentication middleware for admin endpoints
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const config = getConfig();
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (apiKey !== config.ADMIN_API_KEY) {
    res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
    return;
  }
  
  next();
};