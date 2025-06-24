import { Router } from 'express';
import { AdminController } from '../../controllers/adminController';
import { asyncHandler } from '../../middleware/error.middleware';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

// Apply authentication to all admin routes
router.use(authenticateAdmin);

// System health check
router.get('/health', asyncHandler(adminController.getHealth.bind(adminController)));

// System stats
router.get('/stats', asyncHandler(adminController.getStats.bind(adminController)));

// Call management
router.get('/calls', asyncHandler(adminController.getActiveCalls.bind(adminController)));
router.delete('/calls/:callId', asyncHandler(adminController.endCall.bind(adminController)));

// Booking management
router.get('/bookings', asyncHandler(adminController.getAllBookings.bind(adminController)));
router.get('/bookings/stats', asyncHandler(adminController.getBookingStats.bind(adminController)));

// Call log management
router.get('/call-logs', asyncHandler(adminController.getCallLogs.bind(adminController)));

export default router;