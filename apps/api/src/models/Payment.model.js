import mongoose from 'mongoose';
import { PAYMENT_STATUS, REFUND_STATUS } from '@arogyafirst/shared';

/**
 * Payment Schema
 * 
 * Tracks payment transactions for bookings and prescriptions through Razorpay gateway.
 * Stores order creation, payment verification, refund processing, and webhook data.
 * 
 * Dual Support: Can be linked to either a Booking (lab tests) OR Prescription (pharmacy).
 * Exactly one of bookingId or prescriptionId must be provided.
 */

const paymentSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['RAZORPAY', 'STRIPE'],
    default: 'RAZORPAY',
    required: true,
    // Payment gateway provider for multi-gateway support
    // Currently supports RAZORPAY, ready for STRIPE integration
  },
  paymentId: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined for pending payments
    index: true,
    // Razorpay payment ID format: pay_xxxxx (set after successful payment)
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // Razorpay order ID format: order_xxxxx (generated during order creation)
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true,
    sparse: true,
    // Required if prescriptionId is not provided
    // Links payment to a lab booking
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    index: true,
    sparse: true,
    // Required if bookingId is not provided
    // Links payment to a pharmacy prescription
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be non-negative'],
    /**
     * Amount in smallest currency unit (paise for INR, cents for USD)
     * 
     * IMPORTANT: This differs from Booking.paymentAmount which is in base units (rupees).
     * - Payment.amount: stored in paise (e.g., 50000 paise = ₹500)
     * - Booking.paymentAmount: stored in rupees (e.g., 500 rupees = ₹500)
     * 
     * Always convert when displaying to users or passing between systems.
     */
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true,
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    required: true,
    default: PAYMENT_STATUS.PENDING,
    index: true,
    /**
     * Overall payment lifecycle status (PENDING → SUCCESS/FAILED → REFUNDED)
     * 
     * This is the CANONICAL source of truth for payment state in business logic.
     * Use this field (not refundStatus) when determining if a payment is refunded.
     * 
     * Lifecycle:
     * - PENDING: Order created, awaiting payment
     * - SUCCESS: Payment captured and verified
     * - FAILED: Payment attempt failed
     * - REFUNDED: Full refund processed (set by refund.processed webhook)
     * 
     * Relationship with refundStatus:
     * - status=REFUNDED means the payment is definitively refunded (authoritative)
     * - refundStatus tracks intermediate refund processing states (granular)
     * - status is updated to REFUNDED only after refund.processed webhook confirms
     * 
     * For downstream consumers: Check status === REFUNDED to determine refund completion.
     */
  },
  razorpaySignature: {
    type: String,
    // HMAC SHA256 signature from Razorpay for verification
  },
  method: {
    type: String,
    // Payment method used: card, upi, netbanking, wallet, etc.
    // Populated after successful payment from Razorpay response
  },
  refundId: {
    type: String,
    // Razorpay refund ID format: rfnd_xxxxx (set if refund initiated)
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount must be non-negative'],
    // Amount refunded (may differ from original if partial refund)
  },
  refundStatus: {
    type: String,
    enum: Object.values(REFUND_STATUS),
    /**
     * Granular refund processing tracker (internal use, debugging, audits)
     * 
     * This field provides detailed refund processing state but is NOT the canonical
     * indicator of whether a payment is refunded. Use Payment.status for that.
     * 
     * States:
     * - null/undefined: No refund initiated
     * - PENDING: Refund initiated via Razorpay API, awaiting webhook confirmation
     * - PROCESSED: Refund confirmed by refund.processed webhook
     * - FAILED: Refund attempt failed
     * 
     * Relationship with status:
     * - When refundStatus=PROCESSED, status should also be REFUNDED
     * - status=REFUNDED is the authoritative field for business logic
     * - refundStatus provides granular tracking for monitoring/debugging
     * 
     * For downstream consumers: Use Payment.status, not refundStatus, in business logic.
     * Only check refundStatus for detailed audit trails or troubleshooting.
     */
  },
  failureReason: {
    type: String,
    // Reason for payment failure (if status is FAILED)
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Additional data: customer details, notes, custom fields
  },
  webhookReceived: {
    type: Boolean,
    default: false,
    // Tracks if server-side webhook confirmation was received
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    // Raw webhook payload for audit trail
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    // User who initiated the payment (typically the patient)
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // User who last updated the payment record
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index({ prescriptionId: 1, status: 1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

/**
 * Static method: Find payments by booking ID
 * @param {ObjectId} bookingId - Booking ID to search for
 * @returns {Promise<Payment[]>} Array of payments for the booking
 */
paymentSchema.statics.findByBooking = function(bookingId) {
  return this.find({ bookingId }).sort({ createdAt: -1 });
};

/**
 * Static method: Find payments by prescription ID
 * @param {ObjectId} prescriptionId - Prescription ID to search for
 * @returns {Promise<Payment[]>} Array of payments for the prescription
 */
paymentSchema.statics.findByPrescription = function(prescriptionId) {
  return this.find({ prescriptionId }).sort({ createdAt: -1 });
};

/**
 * Instance method: Mark payment as successful
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature for verification
 * @param {string} method - Payment method used
 */
paymentSchema.methods.markAsSuccess = function(paymentId, signature, method) {
  this.status = PAYMENT_STATUS.SUCCESS;
  this.paymentId = paymentId;
  this.razorpaySignature = signature;
  this.method = method;
};

/**
 * Instance method: Mark payment as failed
 * @param {string} reason - Failure reason
 */
paymentSchema.methods.markAsFailed = function(reason) {
  this.status = PAYMENT_STATUS.FAILED;
  this.failureReason = reason;
};

/**
 * Instance method: Mark payment as refunded
 * @param {string} refundId - Razorpay refund ID
 * @param {number} refundAmount - Amount refunded
 */
paymentSchema.methods.markAsRefunded = function(refundId, refundAmount) {
  this.status = PAYMENT_STATUS.REFUNDED;
  this.refundId = refundId;
  this.refundAmount = refundAmount;
  this.refundStatus = REFUND_STATUS.PROCESSED;
};

// Pre-save hook: Validate exactly one of bookingId or prescriptionId, and validate amount
paymentSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Validate exactly one of bookingId or prescriptionId is provided
    if (!this.bookingId && !this.prescriptionId) {
      return next(new Error('Either bookingId or prescriptionId must be provided'));
    }
    
    if (this.bookingId && this.prescriptionId) {
      return next(new Error('Cannot have both bookingId and prescriptionId'));
    }
    
    // Validate amount matches booking/prescription paymentAmount
    try {
      if (this.bookingId) {
        const Booking = mongoose.model('Booking');
        const booking = await Booking.findById(this.bookingId).select('paymentAmount');
        
        if (!booking) {
          return next(new Error('Booking not found'));
        }
        
        // Defensive check: skip validation if booking.paymentAmount is invalid
        if (!booking || typeof booking.paymentAmount !== 'number' || !Number.isFinite(booking.paymentAmount) || booking.paymentAmount < 0) {
          console.warn(
            `Payment ${this._id}: Booking ${this.bookingId} has invalid paymentAmount (${booking?.paymentAmount}). ` +
            'Skipping amount validation. This may indicate legacy data or a data integrity issue.'
          );
          return next();
        }
        
        // Convert booking amount from rupees to paise for comparison
        const bookingAmountInPaise = Math.round(booking.paymentAmount * 100);
        
        if (this.amount !== bookingAmountInPaise) {
          return next(new Error(
            `Payment amount (${this.amount} paise) does not match booking amount (${bookingAmountInPaise} paise = ${booking.paymentAmount} rupees)`
          ));
        }
      }
      
      if (this.prescriptionId) {
        const Prescription = mongoose.model('Prescription');
        const prescription = await Prescription.findById(this.prescriptionId).select('totalAmount');
        
        if (!prescription) {
          return next(new Error('Prescription not found'));
        }
        
        // Defensive check: skip validation if prescription.totalAmount is invalid
        if (!prescription || typeof prescription.totalAmount !== 'number' || !Number.isFinite(prescription.totalAmount) || prescription.totalAmount < 0) {
          console.warn(
            `Payment ${this._id}: Prescription ${this.prescriptionId} has invalid totalAmount (${prescription?.totalAmount}). ` +
            'Skipping amount validation. This may indicate legacy data or a data integrity issue.'
          );
          return next();
        }
        
        // Convert prescription amount from rupees to paise for comparison
        const prescriptionAmountInPaise = Math.round(prescription.totalAmount * 100);
        
        if (this.amount !== prescriptionAmountInPaise) {
          return next(new Error(
            `Payment amount (${this.amount} paise) does not match prescription amount (${prescriptionAmountInPaise} paise = ${prescription.totalAmount} rupees)`
          ));
        }
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
