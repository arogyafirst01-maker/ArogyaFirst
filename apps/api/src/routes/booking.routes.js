// Provider Booking Routes
// GET /provider/:providerId - Get provider's bookings
// POST /manual - Create manual booking (walk-in)
// PUT /:id/status - Update booking status
import express from 'express';
import {
  createBooking,
  getPatientBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  getProviderBookings,
  createManualBooking,
  updateBookingStatus
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import {
  validateRequest,
  createBookingSchema,
  cancelBookingSchema,
  rescheduleBookingSchema,
  manualBookingSchema,
  updateBookingStatusSchema
} from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = express.Router();

// Patient Booking Routes

// POST /create - Create new booking
router.post(
  '/create',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(createBookingSchema),
  createBooking
);

// GET /patient/:patientId - Get patient's bookings
router.get(
  '/patient/:patientId',
  authenticate,
  authorize([ROLES.PATIENT]),
  getPatientBookings
);


// Provider Booking Routes

// GET /provider/:providerId - Get provider's bookings
router.get(
  '/provider/:providerId',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  getProviderBookings
);

// POST /manual - Create manual booking (walk-in)
router.post(
  '/manual',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(manualBookingSchema),
  createManualBooking
);

// PUT /:id/status - Update booking status
router.put(
  '/:id/status',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(updateBookingStatusSchema),
  updateBookingStatus
);

// GET /:id - Get single booking by ID
router.get(
  '/:id',
  authenticate,
  getBookingById
);

// PUT /:id/cancel - Cancel booking
router.put(
  '/:id/cancel',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(cancelBookingSchema),
  cancelBooking
);

// PUT /:id/reschedule - Reschedule booking
router.put(
  '/:id/reschedule',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(rescheduleBookingSchema),
  rescheduleBooking
);

export default router;