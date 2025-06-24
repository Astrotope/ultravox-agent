import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { logSecurity } from '../utils/logger';

/**
 * Helmet.js security middleware configuration
 */
export const securityMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.ultravox.ai"], // Allow Ultravox API
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // X-XSS-Protection (legacy browsers)
  xssFilter: true
});

/**
 * Rate limiting security middleware
 */
export const rateLimitSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const forwarded = req.get('X-Forwarded-For');
  const realIp = req.get('X-Real-IP');
  const clientIp = req.ip;
  
  // Log potential proxy/forwarding issues
  if (forwarded && forwarded !== clientIp) {
    logSecurity('proxy_detected', {
      clientIp,
      forwarded,
      realIp,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
  }
  
  next();
};

/**
 * Suspicious request pattern detection
 */
export const suspiciousRequestDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const url = req.url;
  const method = req.method;
  
  // Detect common attack patterns
  const suspiciousPatterns = [
    /\.\.(\/|\\)/,           // Directory traversal
    /<script/i,              // XSS attempts
    /union.*select/i,        // SQL injection
    /eval\(/i,               // Code injection
    /document\./i,           // DOM manipulation
    /javascript:/i,          // Javascript protocol
    /vbscript:/i,           // VBScript protocol
    /onload=/i,             // Event handler injection
  ];
  
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /masscan/i,
    /nmap/i,
    /bot/i
  ];
  
  // Check URL for suspicious patterns
  const hasSuspiciousUrl = suspiciousPatterns.some(pattern => pattern.test(url));
  
  // Check User-Agent for suspicious patterns
  const hasSuspiciousUserAgent = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (hasSuspiciousUrl || hasSuspiciousUserAgent) {
    logSecurity('suspicious_request', {
      ip: req.ip,
      method,
      url,
      userAgent,
      headers: req.headers,
      suspiciousUrl: hasSuspiciousUrl,
      suspiciousUserAgent: hasSuspiciousUserAgent
    });
    
    // Return 400 for suspicious requests
    res.status(400).json({
      error: 'Bad Request',
      message: 'Request rejected due to security policy'
    });
    return;
  }
  
  next();
};

/**
 * Admin endpoint security
 */
export const adminSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || '';
  
  // Log all admin access attempts
  logSecurity('admin_access_attempt', {
    ip,
    userAgent,
    url: req.url,
    method: req.method,
    hasApiKey: !!apiKey,
    timestamp: new Date().toISOString()
  });
  
  next();
};

/**
 * Content-Type validation for POST requests
 */
export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type') || '';
    
    // Allow JSON and form data
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];
    
    const isValidContentType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type)
    );
    
    if (!isValidContentType) {
      logSecurity('invalid_content_type', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        contentType,
        userAgent: req.get('User-Agent')
      });
      
      res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type not supported'
      });
      return;
    }
  }
  
  next();
};

/**
 * Request size monitoring
 */
export const requestSizeMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    logSecurity('oversized_request', {
      ip: req.ip,
      url: req.url,
      contentLength,
      maxSize,
      userAgent: req.get('User-Agent')
    });
    
    res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request size exceeds limit'
    });
    return;
  }
  
  next();
};