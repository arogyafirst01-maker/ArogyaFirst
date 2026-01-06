const crypto = require('crypto');
const { getRazorpayInstance } = require('../config/razorpay.js');
const Payment = require('../models/Payment.model.js');
const Booking = require('../models/Booking.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { withTransaction } = require('../utils/transaction.util.js');
const { generateReceiptId } = require('../utils/idempotency.util.js');
const { PAYMENT_STATUS, REFUND_STATUS } = require('@arogyafirst/shared');

/**
 * Create Razorpay Order
 * 
 * Generates a Razorpay order for initiating payment for a booking or prescription.
 * Called by frontend before opening checkout modal.
 * 
 * @route POST /api/payments/create-order
 * @access Private (Patient only)
 */
const createOrder = async (req, res) => {
  try {
    const { bookingId, prescriptionId, amount } = req.body;
    const userId = req.user._id;

    // Validate exactly one of bookingId or prescriptionId is provided
    if (!bookingId && !prescriptionId) {
      return errorResponse(res, 'Either bookingId or prescriptionId must be provided', 400);
    }
    if (bookingId && prescriptionId) {
      return errorResponse(res, 'Cannot provide both bookingId and prescriptionId', 400);
    }

    let entityAmountInRupees;
    let entityType;
    let entityId;

    // Handle booking payment
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return errorResponse(res, 'Booking not found', 404);
      }

      // Verify booking belongs to authenticated user
      if (booking.patientId.toString() !== userId.toString()) {
        return errorResponse(res, 'Unauthorized: Booking does not belong to you', 403);
      }

      // Block order creation only for terminal paid states (SUCCESS or REFUNDED)
      if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.paymentStatus === PAYMENT_STATUS.REFUNDED) {
        return errorResponse(res, `Booking payment status is ${booking.paymentStatus}, cannot create new order`, 400);
      }

      entityAmountInRupees = booking.paymentAmount;
      entityType = 'booking';
      entityId = bookingId;

      // Validate booking amount is a valid positive number
      if (typeof entityAmountInRupees !== 'number' || !Number.isFinite(entityAmountInRupees) || entityAmountInRupees < 0) {
        return errorResponse(res, 'Invalid booking amount: Pricing is not correctly configured for this booking', 400);
      }
      
      // Validate client-supplied amount matches server-side booking amount if provided
      if (typeof amount !== 'undefined' && Math.round(amount) !== Math.round(entityAmountInRupees)) {
        return errorResponse(res, `Amount mismatch: expected ${entityAmountInRupees} rupees, got ${amount}`, 400);
      }
    }

    // Handle prescription payment
    if (prescriptionId) {
      const Prescription = (await import('../models/Prescription.model.js')).default;
      // Select explicit pricing and ownership fields to avoid trusting client
      const prescription = await Prescription.findById(prescriptionId).select('totalAmount patientId status');
      
      if (!prescription) {
        return errorResponse(res, 'Prescription not found', 404);
      }

      // Verify prescription belongs to authenticated user
      if (prescription.patientId.toString() !== userId.toString()) {
        return errorResponse(res, 'Unauthorized: Prescription does not belong to you', 403);
      }

      // Validate prescription is in payable state
      if (prescription.status !== 'PENDING') {
        return errorResponse(res, `Prescription status is ${prescription.status}, only PENDING prescriptions can be paid`, 400);
      }

      // Derive payable amount from server-side pricing if available
      if (typeof prescription.totalAmount === 'number' && !Number.isNaN(prescription.totalAmount) && prescription.totalAmount >= 0) {
        entityAmountInRupees = prescription.totalAmount;
      } else {
        // If server-side price is not present, disallow client-supplied amount to prevent tampering
        return errorResponse(res, 'Prescription does not have a server-side price configured; payment is disabled for this prescription', 400);
      }

      // If client provided an amount, treat it as a guard and ensure it matches server-side total
      if (typeof amount !== 'undefined' && Math.round(amount) !== Math.round(entityAmountInRupees)) {
        return errorResponse(res, `Amount mismatch: expected ${entityAmountInRupees} rupees, got ${amount}`, 400);
      }

      entityType = 'prescription';
      entityId = prescriptionId;
    }

    // At this point entityAmountInRupees is derived from server-side data for bookings/prescriptions
    // Client-supplied `amount` has already been validated for prescriptions above when present.

    // Final validation: Ensure amount is valid before conversion to paise
    if (typeof entityAmountInRupees !== 'number' || !Number.isFinite(entityAmountInRupees) || entityAmountInRupees < 0) {
      return errorResponse(res, 'Invalid payment amount: Pricing is not correctly configured', 400);
    }

    // Convert rupees to paise for Razorpay API (smallest currency unit)
    const amountInPaise = Math.round(entityAmountInRupees * 100);

    // Idempotency check: Return existing order if one exists
    const existingPaymentQuery = bookingId 
      ? { bookingId, status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS] } }
      : { prescriptionId, status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS] } };
    
    const existingPayment = await Payment.findOne(existingPaymentQuery).sort({ createdAt: -1 });

    if (existingPayment && existingPayment.orderId) {
      console.log(`Returning existing order for ${entityType} ${entityId}: ${existingPayment.orderId}`);
      return successResponse(res, {
        orderId: existingPayment.orderId,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        paymentRecordId: existingPayment._id,
      }, 'Using existing payment order');
    }

    // Generate unique receipt ID for idempotency
    const receipt = generateReceiptId('RCP', entityId);

    // Get Razorpay instance with lazy validation
    const razorpayInstance = getRazorpayInstance();

    // Create Razorpay order
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInPaise, // Amount in paise (smallest currency unit)
      currency: process.env.PAYMENT_CURRENCY || 'INR',
      receipt: receipt,
      notes: {
        ...(bookingId && { bookingId }),
        ...(prescriptionId && { prescriptionId }),
        patientId: userId.toString(),
        entityType,
      },
    });

    // Create Payment record in database within transaction
    const result = await withTransaction(async (session) => {
      const payment = new Payment({
        provider: 'RAZORPAY', // Current implementation uses Razorpay
        orderId: razorpayOrder.id,
        ...(bookingId && { bookingId }),
        ...(prescriptionId && { prescriptionId }),
        amount: amountInPaise, // Store amount in paise as per Payment schema
        currency: razorpayOrder.currency,
        status: PAYMENT_STATUS.PENDING,
        metadata: {
          receipt: receipt,
          razorpayOrderResponse: razorpayOrder,
          entityType,
        },
        createdBy: userId,
      });

      await payment.save({ session });
      return payment;
    });

    // Return order details for frontend checkout
    return successResponse(res, {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentRecordId: result._id,
    }, 'Payment order created successfully', 201);

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    // Handle Razorpay configuration errors with 503 Service Unavailable
    if (error.message && error.message.includes('Razorpay payment gateway not configured')) {
      return errorResponse(res, 'Payment service is temporarily unavailable. Please contact support.', 503);
    }
    
    // Handle Razorpay-specific errors
    if (error.error && error.error.code) {
      return errorResponse(res, `Razorpay error: ${error.error.description}`, 400);
    }
    
    return errorResponse(res, 'Failed to create payment order', 500);
  }
};

/**
 * Verify Payment
 * 
 * Verifies payment signature after successful Razorpay checkout.
 * Called by frontend after user completes payment in checkout modal.
 * 
 * @route POST /api/payments/verify
 * @access Private (Patient only)
 */
const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const userId = req.user._id;

    // Fetch payment record
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      return errorResponse(res, 'Payment order not found', 404);
    }

    // Verify payment belongs to authenticated user
    if (payment.createdBy.toString() !== userId.toString()) {
      return errorResponse(res, 'Unauthorized: Payment does not belong to you', 403);
    }

    // Guard against missing RAZORPAY_KEY_SECRET configuration
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET is not configured - cannot verify payment signature');
      return errorResponse(res, 'Payment gateway is not correctly configured. Please contact support.', 500);
    }

    // Verify signature using Razorpay secret
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      // Signature verification failed - mark payment as failed within transaction
      await withTransaction(async (session) => {
        payment.markAsFailed('Invalid signature');
        payment.updatedBy = userId;
        await payment.save({ session });
      });
      
      return errorResponse(res, 'Payment verification failed: Invalid signature', 400);
    }

    // Signature valid - update payment and booking within transaction
    const result = await withTransaction(async (session) => {
      // Fetch payment method from Razorpay (optional, for audit trail)
      let paymentMethod = null;
      try {
        // Get Razorpay instance with lazy validation
        const razorpayInstance = getRazorpayInstance();
        const razorpayPayment = await razorpayInstance.payments.fetch(paymentId);
        paymentMethod = razorpayPayment.method;
      } catch (err) {
        console.warn('Could not fetch payment details from Razorpay:', err.message);
      }

      // Update payment record
      payment.markAsSuccess(paymentId, signature, paymentMethod);
      payment.updatedBy = userId;
      await payment.save({ session });

      // Update booking or prescription based on payment type
      let entity, entityType;
      
      if (payment.bookingId) {
        const booking = await Booking.findById(payment.bookingId).session(session);
        if (!booking) {
          throw new Error('Booking not found');
        }
        booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
        booking.paymentId = paymentId;
        booking.updatedBy = userId;
        await booking.save({ session });
        entity = booking;
        entityType = 'booking';
      } else if (payment.prescriptionId) {
        const Prescription = (await import('../models/Prescription.model.js')).default;
        const prescription = await Prescription.findById(payment.prescriptionId).session(session);
        if (!prescription) {
          throw new Error('Prescription not found');
        }
        if (prescription.status === 'PENDING') {
          prescription.fulfill();
          await prescription.save({ session });
        }
        entity = prescription;
        entityType = 'prescription';
      } else {
        throw new Error('Payment has no associated booking or prescription');
      }

      return { payment, entity, entityType };
    });

    const responseData = {
      paymentId: result.payment.paymentId,
      paymentStatus: result.payment.status,
      amountInPaise: result.payment.amount,
      amountInRupees: result.payment.amount / 100,
      entityType: result.entityType,
      ...(result.entityType === 'booking' && {
        bookingId: result.entity._id,
        bookingStatus: result.entity.status,
      }),
      ...(result.entityType === 'prescription' && {
        prescriptionId: result.entity._id,
        prescriptionStatus: result.entity.status,
      }),
      // Advisory redirect hint for SPA clients (not enforced by API)
      // Clients can use this to determine post-verification navigation
      redirectHint: {
        type: 'PAYMENT_SUCCESS',
        ...(result.entityType === 'booking' && {
          bookingId: result.entity._id,
          suggestedRoute: `/payment-success?bookingId=${result.entity._id}&paymentId=${result.payment.paymentId}&amount=${result.payment.amount / 100}`,
        }),
        ...(result.entityType === 'prescription' && {
          prescriptionId: result.entity._id,
          suggestedRoute: `/payment-success?prescriptionId=${result.entity._id}&paymentId=${result.payment.paymentId}&amount=${result.payment.amount / 100}`,
        }),
        paymentId: result.payment.paymentId,
      },
    };

    return successResponse(res, responseData, 'Payment verified successfully');

  } catch (error) {
    console.error('Error verifying payment:', error);
    return errorResponse(res, 'Failed to verify payment', 500);
  }
};

/**
 * Handle Razorpay Webhook
 * 
 * Processes server-side payment events from Razorpay.
 * Webhooks provide asynchronous confirmation of payment status.
 * 
 * Supported events:
 * - payment.captured: Payment successfully captured
 * - payment.failed: Payment failed
 * - refund.processed: Refund successfully processed
 * 
 * @route POST /api/payments/webhook
 * @access Public (Razorpay only, verified by signature)
 */
const handleWebhook = async (req, res) => {
  try {
    // Check for middleware configuration errors
    // Middleware sets this flag instead of returning 400 to ensure 2xx response to Razorpay
    if (req.webhookBodyError) {
      console.error('Webhook body error detected:', req.webhookBodyErrorMessage);
      return res.status(200).json({ status: 'ignored', reason: req.webhookBodyErrorMessage || 'Invalid raw body' });
    }

    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Log raw body capture in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('Webhook rawBody received (Buffer):', Buffer.isBuffer(req.rawBody));
    }

    // Defensive guard: Verify webhook signature if secret is configured
    if (webhookSecret) {
      // Ensure raw body is present and valid before computing HMAC
      // Guards against misconfigured webhook middleware
      if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
        console.error('Webhook raw body missing or invalid - middleware may be misconfigured');
        return res.status(200).json({ status: 'ignored', reason: 'Invalid raw body' });
      }

      const generatedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody)
        .digest('hex');

      if (generatedSignature !== webhookSignature) {
        console.error('Webhook signature verification failed');
        // Return 200 to prevent Razorpay retries, but log the failure
        return res.status(200).json({ status: 'ignored', reason: 'Invalid signature' });
      }
    } else {
      console.warn('RAZORPAY_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    const event = req.body;
    const eventType = event.event;

    // Extract entity from payload based on event type
    let entity = null;
    if (event.payload?.payment?.entity) {
      entity = event.payload.payment.entity;
    } else if (event.payload?.refund?.entity) {
      entity = event.payload.refund.entity;
    }

    if (!entity) {
      console.error(`Webhook payload missing entity for event: ${eventType}`);
      return res.status(200).json({ status: 'ignored', reason: 'Missing entity in payload' });
    }

    // Log webhook event with key identifiers only (avoid logging full entity in production)
    const entityId = entity.id || 'unknown';
    const orderId = entity.order_id || 'N/A';
    const paymentId = entity.payment_id || 'N/A';
    console.log(`Webhook received: ${eventType}, entityId: ${entityId}, orderId: ${orderId}, paymentId: ${paymentId}`);

    // Process different event types
    switch (eventType) {
      case 'payment.captured': {
        // Payment successfully captured
        const payment = await Payment.findOne({ orderId: entity.order_id });
        
        if (!payment) {
          console.error(`Payment not found for order: ${entity.order_id}`);
          break;
        }

        // Update payment status if not already updated by verify endpoint
        if (payment.status !== PAYMENT_STATUS.SUCCESS) {
          await withTransaction(async (session) => {
            payment.markAsSuccess(entity.id, null, entity.method);
            payment.webhookReceived = true;
            payment.webhookData = event;
            await payment.save({ session });

            // Update booking or prescription based on payment type
            if (payment.bookingId) {
              const booking = await Booking.findById(payment.bookingId).session(session);
              if (booking && booking.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
                booking.paymentStatus = PAYMENT_STATUS.SUCCESS;
                booking.paymentId = entity.id;
                await booking.save({ session });
              }
            } else if (payment.prescriptionId) {
              const Prescription = (await import('../models/Prescription.model.js')).default;
              const prescription = await Prescription.findById(payment.prescriptionId).session(session);
              if (prescription && prescription.status === 'PENDING') {
                prescription.fulfill();
                await prescription.save({ session });
              }
            }
          });
          
          console.log(`Payment captured via webhook: ${entity.id}`);
        }
        break;
      }

      case 'payment.failed': {
        // Payment failed
        const payment = await Payment.findOne({ orderId: entity.order_id });
        
        if (!payment) {
          console.error(`Payment not found for order: ${entity.order_id}`);
          break;
        }

        if (payment.status === PAYMENT_STATUS.PENDING) {
          // Update both Payment and entity in transaction
          await withTransaction(async (session) => {
            payment.markAsFailed(entity.error_description || 'Payment failed');
            payment.webhookReceived = true;
            payment.webhookData = event;
            await payment.save({ session });
            
            // Update booking or prescription payment status to FAILED
            if (payment.bookingId) {
              const booking = await Booking.findById(payment.bookingId).session(session);
              if (booking && booking.paymentStatus === PAYMENT_STATUS.PENDING) {
                booking.paymentStatus = PAYMENT_STATUS.FAILED;
                booking.metadata = {
                  ...booking.metadata,
                  paymentFailureReason: entity.error_description || 'Payment failed',
                  paymentFailedAt: new Date(),
                };
                await booking.save({ session });
              }
            }
            // Note: Prescriptions don't have paymentStatus field, so no update needed
          });
          
          console.log(`Payment failed via webhook: ${entity.id}`);
        }
        break;
      }

      case 'refund.processed': {
        // Refund successfully processed
        const payment = await Payment.findOne({ paymentId: entity.payment_id });
        
        if (!payment) {
          console.error(`Payment not found for refund: ${entity.id}`);
          break;
        }

        // Update both Payment and entity in transaction
        await withTransaction(async (session) => {
          // Use markAsRefunded method to update both status and refundStatus
          payment.markAsRefunded(entity.id, entity.amount);
          payment.webhookData = event;
          await payment.save({ session });
          
          // Update booking or prescription payment status to REFUNDED
          if (payment.bookingId) {
            const booking = await Booking.findById(payment.bookingId).session(session);
            if (booking && booking.paymentStatus !== PAYMENT_STATUS.REFUNDED) {
              booking.paymentStatus = PAYMENT_STATUS.REFUNDED;
              await booking.save({ session });
            }
          }
          // Note: Prescriptions don't have paymentStatus field, no update needed
        });
        
        console.log(`Refund processed via webhook: ${entity.id}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Always return 200 OK to prevent Razorpay retries
    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 200 even on error to prevent retries for unrecoverable errors
    return res.status(200).json({ status: 'error', message: error.message });
  }
};

/**
 * Process Partial Refund for Booking
 * 
 * Initiates a partial refund via Razorpay for price difference scenarios
 * such as rescheduling to a cheaper slot.
 * 
 * @param {string} bookingId - Booking ID to refund
 * @param {string} userId - User initiating the refund
 * @param {number} amountInRupees - Amount to refund in rupees
 * @param {string} reason - Reason for the partial refund
 * @returns {Promise<Object>} Refund result with refund ID and amount
 * @throws {Error} If booking not found, payment not successful, or Razorpay refund fails
 */
const processPartialRefund = async (bookingId, userId, amountInRupees, reason = 'Partial refund') => {
  try {
    // Fetch booking and associated successful payment
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    const payment = await Payment.findOne({
      bookingId: bookingId,
      status: PAYMENT_STATUS.SUCCESS,
    }).sort({ createdAt: -1 }); // Get most recent successful payment

    if (!payment || !payment.paymentId) {
      throw new Error('No successful payment found for this booking');
    }

    // Convert amount to paise for Razorpay
    const amountInPaise = Math.round(amountInRupees * 100);

    // Validate refund amount doesn't exceed original payment
    if (amountInPaise > payment.amount) {
      throw new Error(`Refund amount (${amountInRupees}) exceeds original payment amount (${payment.amount / 100})`);
    }

    // Validate refund amount is positive
    if (amountInPaise <= 0) {
      throw new Error('Refund amount must be greater than zero');
    }

    // Check if a full refund was already processed for this payment
    if (payment.refundStatus === REFUND_STATUS.PROCESSED) {
      throw new Error('Payment has already been fully refunded');
    }

    // Generate unique refund receipt for idempotency
    const refundReceipt = generateReceiptId('PRFD', bookingId);

    // Get Razorpay instance with lazy validation
    const razorpayInstance = getRazorpayInstance();

    // Initiate partial refund via Razorpay
    const razorpayRefund = await razorpayInstance.payments.refund(payment.paymentId, {
      amount: amountInPaise, // Partial refund amount in paise
      receipt: refundReceipt,
      notes: {
        bookingId: bookingId,
        refundedBy: userId.toString(),
        refundType: 'partial',
        reason: reason,
      },
    });

    // Update payment record with partial refund info
    // Don't update to REFUNDED status for partial refunds - keep as SUCCESS
    await withTransaction(async (session) => {
      payment.metadata = {
        ...payment.metadata,
        partialRefunds: [
          ...(payment.metadata?.partialRefunds || []),
          {
            refundId: razorpayRefund.id,
            amount: amountInPaise,
            amountInRupees: amountInRupees,
            receipt: refundReceipt,
            reason: reason,
            initiatedAt: new Date(),
            initiatedBy: userId,
            razorpayResponse: razorpayRefund,
          },
        ],
      };
      payment.updatedBy = userId;
      await payment.save({ session });
    });

    console.log(`Partial refund initiated for booking ${bookingId}: ${razorpayRefund.id} (₹${amountInRupees})`);

    return {
      refundId: razorpayRefund.id,
      refundAmount: razorpayRefund.amount,
      refundStatus: razorpayRefund.status,
    };

  } catch (error) {
    console.error('Error processing partial refund:', error);
    
    // Handle Razorpay-specific errors
    if (error.error && error.error.code) {
      throw new Error(`Razorpay refund error: ${error.error.description}`);
    }
    
    throw error;
  }
};

/**
 * Process Refund (Internal Helper)
 * 
 * Initiates refund for a booking's successful payment.
 * Called internally by booking cancellation flow.
 * 
 * @param {string} bookingId - Booking ID to refund
 * @param {string} userId - User initiating the refund
 * @returns {Promise<Object>} Refund result with refund ID and amount
 * @throws {Error} If booking not found, payment not successful, or Razorpay refund fails
 */
const processRefund = async (bookingId, userId) => {
  try {
    // Fetch booking and associated successful payment
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    const payment = await Payment.findOne({
      bookingId: bookingId,
      status: PAYMENT_STATUS.SUCCESS,
    }).sort({ createdAt: -1 }); // Get most recent successful payment

    if (!payment || !payment.paymentId) {
      throw new Error('No successful payment found for this booking');
    }

    // Idempotency guard: Check if refund already initiated
    // Prevents duplicate refund attempts for the same payment
    if (payment.refundId || 
        payment.refundStatus === REFUND_STATUS.PENDING || 
        payment.refundStatus === REFUND_STATUS.PROCESSED ||
        payment.metadata?.refundInitiated) {
      const refundStatusMsg = payment.refundStatus || 'in progress';
      throw new Error(`Refund already initiated for this booking (status: ${refundStatusMsg})`);
    }

    // Generate unique refund receipt for idempotency
    const refundReceipt = generateReceiptId('RFD', bookingId);

    // Get Razorpay instance with lazy validation
    const razorpayInstance = getRazorpayInstance();

    // Initiate refund via Razorpay
    const razorpayRefund = await razorpayInstance.payments.refund(payment.paymentId, {
      amount: payment.amount, // Full refund
      receipt: refundReceipt,
      notes: {
        bookingId: bookingId,
        cancelledBy: userId.toString(),
      },
    });

    // Update payment and booking within transaction
    await withTransaction(async (session) => {
      // Update payment record
      payment.refundId = razorpayRefund.id;
      payment.refundAmount = razorpayRefund.amount;
      payment.refundStatus = REFUND_STATUS.PENDING; // Will be updated to PROCESSED by webhook
      // Keep status as SUCCESS until webhook confirms refund is PROCESSED
      // Then use markAsRefunded() method to update status to REFUNDED
      payment.updatedBy = userId;
      payment.metadata = {
        ...payment.metadata,
        refundReceipt: refundReceipt,
        razorpayRefundResponse: razorpayRefund,
        refundInitiated: true, // Mark that refund has been initiated
      };
      await payment.save({ session });

      // Store refund initiation in booking metadata
      // Do NOT set paymentStatus to REFUNDED here - webhook will do that
      // This prevents stale status if webhook fails or is delayed
      booking.metadata = {
        ...booking.metadata,
        refundInitiated: true,
        refundId: razorpayRefund.id,
        refundAmountInPaise: razorpayRefund.amount, // Amount in paise
        refundAmountInRupees: razorpayRefund.amount / 100, // Amount in rupees for display
        refundInitiatedAt: new Date(),
      };
      booking.updatedBy = userId;
      await booking.save({ session });
    });

    console.log(`Refund initiated for booking ${bookingId}: ${razorpayRefund.id}`);

    return {
      refundId: razorpayRefund.id,
      refundAmount: razorpayRefund.amount,
      refundStatus: razorpayRefund.status,
    };

  } catch (error) {
    console.error('Error processing refund:', error);
    
    // Handle Razorpay-specific errors
    if (error.error && error.error.code) {
      throw new Error(`Razorpay refund error: ${error.error.description}`);
    }
    
    throw error;
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  processPartialRefund,
  processRefund,
};
