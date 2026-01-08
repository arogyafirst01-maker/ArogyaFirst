import express from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, createOrderSchema, verifyPaymentSchema } from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = express.Router();

/**
 * Payment Routes
 * 
 * Handles Razorpay payment operations for booking payments.
 * 
 * Routes:
 * - POST /create-order: Create Razorpay order for payment initiation
 * - POST /verify: Verify payment after checkout completion
 * 
 * IMPORTANT: Webhook endpoints are in ./webhook.routes.js (NOT here)
 * Webhooks require raw body parsing and are mounted in server.js BEFORE express.json().
 * See ./webhook.routes.js and server.js for webhook mounting order details.
 * All routes in this file use standard JSON parsing (after express.json() middleware).
 */

/**
 * @route POST /api/payments/create-order
 * @desc Create Razorpay order for a booking
 * @access Private (Patient only)
 * @body { bookingId: string, amount: number }
 * 
 * Creates a Razorpay order and payment record in database.
 * Called by frontend before opening Razorpay checkout modal.
 * Returns orderId and keyId needed for checkout.
 */
router.post(
  '/create-order',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(createOrderSchema),
  createOrder
);

/**
 * @route POST /api/payments/verify
 * @desc Verify payment signature after checkout
 * @access Private (Patient only)
 * @body { orderId: string, paymentId: string, signature: string }
 * 
 * Verifies Razorpay payment signature using HMAC SHA256.
 * Updates payment and booking status to SUCCESS if valid.
 * Called by frontend after user completes payment in checkout modal.
 */
router.post(
  '/verify',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(verifyPaymentSchema),
  verifyPayment
);

export default router;
