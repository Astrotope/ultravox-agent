import { Router } from 'express';
import { BookingController } from '../../controllers/bookingController';
import { validateBody } from '../../middleware/zodValidation.middleware';
import { makeReservationSchema, updateBookingSchema } from '../../schemas/booking.schemas';
import { asyncHandler } from '../../middleware/error.middleware';

const router = Router();
const bookingController = new BookingController();

// Get all bookings (admin endpoint)
router.get('/', asyncHandler(bookingController.getAllBookings.bind(bookingController)));

// Get booking by confirmation code
router.get('/:confirmationCode', asyncHandler(bookingController.getBookingByCode.bind(bookingController)));

// Create new booking
router.post('/', 
  validateBody(makeReservationSchema),
  asyncHandler(bookingController.createBooking.bind(bookingController))
);

// Update booking
router.put('/:confirmationCode',
  validateBody(updateBookingSchema),
  asyncHandler(bookingController.updateBooking.bind(bookingController))
);

// Cancel booking
router.delete('/:confirmationCode', asyncHandler(bookingController.cancelBooking.bind(bookingController)));

export default router;