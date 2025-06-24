import { Router, Request, Response } from 'express';
import v1Router from './v1';

const apiRouter = Router();

// API version routing
apiRouter.use('/v1', v1Router);

// Default to v1 for backward compatibility
apiRouter.use('/', v1Router);

// API info endpoint
apiRouter.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'Restaurant Voice Agent API',
    description: 'Voice-powered restaurant booking system using Ultravox and Twilio',
    versions: {
      v1: {
        status: 'active',
        endpoints: '/api/v1',
        deprecated: false
      }
    },
    currentVersion: 'v1',
    support: {
      documentation: '/api/docs',
      contact: 'support@restaurant-voice-agent.com'
    }
  });
});

export default apiRouter;