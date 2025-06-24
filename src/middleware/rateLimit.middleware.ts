import rateLimit from 'express-rate-limit';
import { getConfig } from '../config';

/**
 * Create a rate limiter with custom configuration
 */
const createRateLimit = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use combination of IP and User-Agent for better tracking
      return `${req.ip}-${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`;
    }
  });

/**
 * Rate limiting for webhook endpoints
 */
export const webhookRateLimit = () => {
  const config = getConfig();
  return createRateLimit(
    60 * 1000, 
    config.MAX_CONCURRENT_CALLS * 3, 
    'Too many call attempts, please try again later'
  );
};

/**
 * Rate limiting for tool endpoints
 */
export const toolRateLimit = createRateLimit(
  60 * 1000, 
  200, 
  'Too many tool requests, please slow down'
);

/**
 * Rate limiting for admin endpoints
 */
export const adminRateLimit = createRateLimit(
  60 * 1000, 
  30, 
  'Too many admin requests'
);