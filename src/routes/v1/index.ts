import { Router } from 'express';
import bookingRoutes from './booking.routes';
import webhookRoutes from './webhook.routes';
import toolRoutes from './tool.routes';
import adminRoutes from './admin.routes';

const v1Router = Router();

// Mount route modules
v1Router.use('/bookings', bookingRoutes);
v1Router.use('/webhook', webhookRoutes);
v1Router.use('/tools', toolRoutes);
v1Router.use('/admin', adminRoutes);

// Status endpoint for monitoring
v1Router.get('/status', (req, res) => {
  res.set('api-version', 'v1');
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: 'v1',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    message: 'API status retrieved successfully',
    timestamp: new Date().toISOString()
  });
});

// API version info endpoint
v1Router.get('/', (req, res) => {
  res.json({
    version: 'v1',
    status: 'active',
    description: 'Restaurant Voice Agent API v1',
    endpoints: {
      bookings: '/api/v1/bookings',
      webhook: '/api/v1/webhook',
      tools: '/api/v1/tools',
      admin: '/api/v1/admin'
    },
    documentation: '/api/v1/docs'
  });
});

export default v1Router;