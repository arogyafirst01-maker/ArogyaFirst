import mongoose from 'mongoose';
import { BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPES, ROLES, PAYMENT_METHODS, BED_ASSIGNMENT_STATUS, PRIORITY_LEVELS, BED_TYPES } from '@arogyafirst/shared';

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Make patientId optional at schema level. Controllers should enforce presence for patient-created bookings.
    required: false,
    index: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Location context for multi-location hospitals
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: [BOOKING_TYPES.OPD, BOOKING_TYPES.IPD, BOOKING_TYPES.LAB],
    required: true,
    index: true
  },
  bookingDate: {
    type: Date,
    required: true,
    index: true
  },
  bookingTime: {
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: 'End time must be in HH:MM format (24-hour)'
      }
    }
  },
  status: {
    type: String,
    enum: Object.values(BOOKING_STATUS),
    required: true,
    index: true,
    default: BOOKING_STATUS.CONFIRMED
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    required: true,
    default: PAYMENT_STATUS.PENDING
  },
  paymentAmount: {
    type: Number,
    min: [0, 'Payment amount must be non-negative'],
    /**
     * Payment amount in base currency units (rupees for INR)
     * 
     * IMPORTANT: This differs from Payment.amount which is in smallest units (paise).
     * - Booking.paymentAmount: stored in rupees (e.g., 500 rupees = ₹500)
     * - Payment.amount: stored in paise (e.g., 50000 paise = ₹500)
     * 
     * Always use rupees when setting this field. Payment model handles conversion to paise.
     */
  },
  paymentId: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
    default: PAYMENT_METHODS.ONLINE
  },
  refundFailed: {
    type: Boolean,
    default: false,
    index: true
  },
  refundFailureReason: {
    type: String,
    maxlength: [500, 'Refund failure reason must not exceed 500 characters']
  },
  patientSnapshot: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
  },
  providerSnapshot: {
    name: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
    specialization: { type: String },
    location: { type: String, required: true },
    branchCode: { type: String },
    chainName: { type: String },
    locationId: { type: mongoose.Schema.Types.ObjectId }
  },
  slotSnapshot: {
    date: { type: Date, required: true },
    time: {
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    },
    capacity: { type: Number, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Bed Allocation Fields (for IPD bookings)
  bedAssignmentStatus: {
    type: String,
    enum: Object.values(BED_ASSIGNMENT_STATUS),
    default: null,
    index: true
  },
  queuePosition: {
    type: Number,
    default: null,
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(PRIORITY_LEVELS),
    default: PRIORITY_LEVELS.MEDIUM
  },
  priorityScore: {
    type: Number,
    min: [0, 'Priority score must be between 0 and 100'],
    max: [100, 'Priority score must be between 0 and 100'],
    default: null,
    index: true
  },
  priorityMetadata: {
    medicalUrgency: { type: Number, default: 0 },
    waitingTime: { type: Number, default: 0 },
    ageScore: { type: Number, default: 0 },
    otherFactors: { type: Number, default: 0 },
    calculatedAt: { type: Date }
  },
  bedRequirement: {
    bedType: {
      type: String,
      enum: Object.values(BED_TYPES)
    },
    specialRequirements: [{ type: String }],
    preferredFloor: { type: String },
    preferredWard: { type: String }
  },
  assignedBed: {
    bedId: { type: String },
    bedNumber: { type: String },
    bedType: { type: String },
    floor: { type: String },
    ward: { type: String },
    assignedAt: { type: Date },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  queueMetadata: {
    joinedQueueAt: { type: Date },
    estimatedWaitTime: { type: Number },
    notificationsSent: [
      {
        type: { type: String },
        sentAt: { type: Date }
      }
    ]
  },
  cancellationReason: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
bookingSchema.index({ patientId: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ providerId: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ locationId: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ providerId: 1, locationId: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ slotId: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });
// Bed allocation indexes
bookingSchema.index({ providerId: 1, bedAssignmentStatus: 1, priorityScore: -1, queuePosition: 1 });
bookingSchema.index({ locationId: 1, bedAssignmentStatus: 1, priorityScore: -1 });

// Virtual fields
bookingSchema.virtual('isUpcoming').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.bookingDate >= today && this.status === BOOKING_STATUS.CONFIRMED;
});

bookingSchema.virtual('isPast').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.bookingDate < today;
});

bookingSchema.virtual('isCancellable').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.status === BOOKING_STATUS.CONFIRMED && this.bookingDate >= today;
});

// Instance methods
bookingSchema.methods.cancel = function(userId, reason) {
  this.status = BOOKING_STATUS.CANCELLED;
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.updatedBy = userId;
};

bookingSchema.methods.complete = function() {
  this.status = BOOKING_STATUS.COMPLETED;
};

bookingSchema.methods.markNoShow = function() {
  this.status = BOOKING_STATUS.NO_SHOW;
};

// Static methods
// Booking IDs should be generated by shared util to avoid duplication; see packages/shared/src/utils

bookingSchema.statics.findByPatient = function(patientId, filters = {}) {
  const query = { patientId };
  if (filters.status) query.status = filters.status;
  if (filters.startDate || filters.endDate) {
    query.bookingDate = {};
    if (filters.startDate) query.bookingDate.$gte = filters.startDate;
    if (filters.endDate) query.bookingDate.$lte = filters.endDate;
  }
  if (filters.entityType) query.entityType = filters.entityType;
  return this.find(query).sort({ bookingDate: -1 });
};

bookingSchema.statics.findByProvider = function(providerId, filters = {}) {
  const query = { providerId };
  if (filters.status) query.status = filters.status;
  if (filters.startDate || filters.endDate) {
    query.bookingDate = {};
    if (filters.startDate) query.bookingDate.$gte = filters.startDate;
    if (filters.endDate) query.bookingDate.$lte = filters.endDate;
  }
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.locationId) query.locationId = filters.locationId;
  return this.find(query).sort({ bookingDate: -1 });
};

bookingSchema.statics.findBySlot = function(slotId) {
  return this.find({ slotId }).sort({ createdAt: -1 });
};

// Pre-save validation
bookingSchema.pre('save', async function(next) {
  // Payment status is set by controller logic; no DB lookup for createdBy user role here.
  // Validate bookingDate is not in the past for new bookings
  if (this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (this.bookingDate < today) {
      return next(new Error('Booking date cannot be in the past'));
    }
  }

  // Validate bookingTime.endTime > bookingTime.startTime
  const startMinutes = parseInt(this.bookingTime.startTime.split(':')[0]) * 60 + parseInt(this.bookingTime.startTime.split(':')[1]);
  const endMinutes = parseInt(this.bookingTime.endTime.split(':')[0]) * 60 + parseInt(this.bookingTime.endTime.split(':')[1]);
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }

  // Validate status transitions (ensure we don't allow moving out of terminal states)
  if (!this.isNew && this.isModified('status')) {
    try {
      const prev = await this.constructor.findById(this._id).select('status').lean();
      const previousStatus = prev?.status;
      if (previousStatus === BOOKING_STATUS.COMPLETED && this.status !== BOOKING_STATUS.COMPLETED) {
        return next(new Error('Cannot change status from COMPLETED'));
      }
      if (previousStatus === BOOKING_STATUS.CANCELLED && this.status !== BOOKING_STATUS.CANCELLED) {
        return next(new Error('Cannot change status from CANCELLED'));
      }
      if (previousStatus === BOOKING_STATUS.NO_SHOW && this.status !== BOOKING_STATUS.NO_SHOW) {
        return next(new Error('Cannot change status from NO_SHOW'));
      }
    } catch (err) {
      // If we cannot determine previous status, allow update but log
      console.warn('Could not validate previous booking status:', err);
    }
  }

  next();
});

// Instance methods for bed allocation
bookingSchema.methods.assignBed = function(bedDetails, userId) {
  this.assignedBed = {
    bedIndex: bedDetails.bedIndex,
    bedId: bedDetails.bedId,
    bedNumber: bedDetails.bedNumber,
    bedType: bedDetails.bedType,
    floor: bedDetails.floor,
    ward: bedDetails.ward,
    assignedAt: new Date(),
    assignedBy: userId
  };
  this.bedAssignmentStatus = BED_ASSIGNMENT_STATUS.BED_ASSIGNED;
  return this;
};

bookingSchema.methods.releaseBed = function(userId) {
  this.assignedBed = undefined;
  this.bedAssignmentStatus = BED_ASSIGNMENT_STATUS.BED_RELEASED;
  this.status = BOOKING_STATUS.COMPLETED;
  return this;
};

bookingSchema.methods.updateQueuePosition = function(position) {
  this.queuePosition = position;
  if (!this.queueMetadata) {
    this.queueMetadata = {};
  }
  return this;
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;