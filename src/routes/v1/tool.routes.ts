import { Router } from 'express';
import { ToolController } from '../../controllers/toolController';
import { validateBody } from '../../middleware/zodValidation.middleware';
import { 
  checkAvailabilitySchema, 
  makeReservationSchema, 
  modifyReservationSchema, 
  cancelReservationSchema,
  checkBookingSchema
} from '../../schemas/booking.schemas';
import { asyncHandler } from '../../middleware/error.middleware';

const router = Router();
const toolController = new ToolController();

// Check availability tool
router.post('/check-availability',
  validateBody(checkAvailabilitySchema),
  asyncHandler(toolController.checkAvailability.bind(toolController))
);

// Make reservation tool
router.post('/make-reservation',
  validateBody(makeReservationSchema),
  asyncHandler(toolController.makeReservation.bind(toolController))
);

// Modify reservation tool
router.post('/modify-reservation',
  validateBody(modifyReservationSchema),
  asyncHandler(toolController.modifyReservation.bind(toolController))
);

// Cancel reservation tool
router.post('/cancel-reservation',
  validateBody(cancelReservationSchema),
  asyncHandler(toolController.cancelReservation.bind(toolController))
);

// Get booking details tool
router.post('/get-booking-details',
  validateBody(checkBookingSchema),
  asyncHandler(toolController.getBookingDetails.bind(toolController))
);

export default router;