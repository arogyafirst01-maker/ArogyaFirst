import express from 'express';
import { handleWebhook } from '../controllers/payment.controller.js';
import { webhookMiddleware } from '../middleware/rawBody.middleware.js';

const router = express.Router();

/**
 * Webhook Routes
 * 
 * Dedicated router for webhook endpoints that require raw body parsing.
 * 
 * IMPORTANT MOUNTING DETAILS:
 * - This router is mounted at `/api/payments/webhook` in server.js
 * - MUST be mounted BEFORE express.json() middleware in server.js
 * - All payment-related webhooks (Razorpay, future providers) should be added here
 * - Do NOT add webhook routes to payment.routes.js (uses parsed JSON bodies)
 * 
 * WHY SEPARATE ROUTER:
 * Webhook signature verification requires the exact byte-for-byte request body
 * for HMAC-SHA256 computation. If express.json() runs first, it consumes the
 * body stream and converts it to an object, breaking signature verification.
 * 
 * This separation ensures /api/payments/webhook captures raw Buffer while other
 * /api/payments/* routes use parsed JSON bodies.
 * 
 * Mounting order in server.js:
 * 1. app.use('/api/payments/webhook', webhookRoutes); // BEFORE express.json()
 * 2. app.use(express.json());                        // Global JSON parser
 * 3. app.use('/api/payments', paymentRoutes);        // Other payment routes
 */

/**
 * @route POST /api/payments/webhook
 * @desc Receive payment webhooks from Razorpay
 * @access Public (Razorpay only, verified by signature)
 * @body Raw JSON payload from Razorpay
 * 
 * Handles server-side payment status updates from Razorpay.
 * Verifies webhook signature if RAZORPAY_WEBHOOK_SECRET is configured.
 * Processes events: payment.captured, payment.failed, refund.processed
 * 
 * NOTE: Uses webhookMiddleware to capture raw body as Buffer for
 * signature verification, then manually parses JSON for handler use.
 */
router.post('/', webhookMiddleware, handleWebhook);

export default router;
