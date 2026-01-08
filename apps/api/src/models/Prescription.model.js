import mongoose from 'mongoose';
import { PRESCRIPTION_STATUS } from '@arogyafirst/shared';
import { generatePrescriptionId } from '@arogyafirst/shared';

/**
 * Prescription Schema
 * 
 * Stores doctor-created prescriptions for patients with medicines list.
 * Supports pharmacy pre-booking and fulfillment tracking.
 */

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
  },
  medicines: {
    type: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      dosage: {
        type: String,
        required: true,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      instructions: {
        type: String,
        trim: true,
      },
      duration: {
        type: String,
        trim: true,
      },
    }],
    default: [],
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(PRESCRIPTION_STATUS),
    default: PRESCRIPTION_STATUS.PENDING,
    index: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  doctorSnapshot: {
    name: String,
    specialization: String,
    uniqueId: String,
  },
  patientSnapshot: {
    name: String,
    phone: String,
    email: String,
  },
  pharmacySnapshot: {
    name: String,
    location: String,
    uniqueId: String,
  },
  fulfilledAt: {
    type: Date,
  },
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  cancellationReason: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

// Compound indexes for efficient queries
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ pharmacyId: 1, status: 1, createdAt: -1 });

/**
 * Static method: Find prescriptions by patient ID with optional filters
 * @param {ObjectId} patientId - Patient ID
 * @param {Object} filters - Optional filters (status, startDate, endDate)
 * @returns {Promise<Prescription[]>} Array of prescriptions
 */
prescriptionSchema.statics.findByPatient = async function(patientId, filters = {}) {
  const query = { patientId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method: Find prescriptions by doctor ID with optional filters
 * @param {ObjectId} doctorId - Doctor ID
 * @param {Object} filters - Optional filters (status, patientId, startDate, endDate)
 * @returns {Promise<Prescription[]>} Array of prescriptions
 */
prescriptionSchema.statics.findByDoctor = async function(doctorId, filters = {}) {
  const query = { doctorId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.patientId) {
    query.patientId = filters.patientId;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method: Find prescriptions by pharmacy ID with optional filters
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @param {Object} filters - Optional filters (status, startDate, endDate)
 * @returns {Promise<Prescription[]>} Array of prescriptions
 */
prescriptionSchema.statics.findByPharmacy = async function(pharmacyId, filters = {}) {
  const query = { pharmacyId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Static method: Generate unique prescription ID
 * @returns {string} Unique prescription ID
 */
prescriptionSchema.statics.generatePrescriptionId = function() {
  return generatePrescriptionId();
};

/**
 * Instance method: Mark prescription as fulfilled
 */
prescriptionSchema.methods.fulfill = function() {
  if (this.status !== PRESCRIPTION_STATUS.PENDING) {
    throw new Error('Only pending prescriptions can be fulfilled');
  }
  this.status = PRESCRIPTION_STATUS.FULFILLED;
  this.fulfilledAt = new Date();
  return this;
};

/**
 * Instance method: Cancel prescription
 * @param {ObjectId} userId - ID of user cancelling
 * @param {string} reason - Cancellation reason
 */
prescriptionSchema.methods.cancel = function(userId, reason) {
  if (this.status !== PRESCRIPTION_STATUS.PENDING) {
    throw new Error('Only pending prescriptions can be cancelled');
  }
  this.status = PRESCRIPTION_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason || '';
  return this;
};

/**
 * Pre-save validation
 */
prescriptionSchema.pre('save', function(next) {
  // Ensure medicines is always an array
  if (!Array.isArray(this.medicines)) {
    console.log('[Prescription.presave] medicines is not an array, type:', typeof this.medicines, 'value:', this.medicines);
    this.medicines = [];
  }
  
  // Validate medicines array is not empty
  if (this.medicines.length === 0) {
    return next(new Error('Prescription must have at least one medicine'));
  }

  // Validate each medicine has required fields
  for (const medicine of this.medicines) {
    if (!medicine.name || !medicine.dosage || !medicine.quantity) {
      return next(new Error('Each medicine must have name, dosage, and quantity'));
    }
  }

  // Prevent status changes FROM terminal states (FULFILLED/CANCELLED cannot be changed)
  if (!this.isNew && this.isModified('status')) {
    // Get the original status before modification
    const originalStatus = this._original?.status;
    if (originalStatus && [PRESCRIPTION_STATUS.FULFILLED, PRESCRIPTION_STATUS.CANCELLED].includes(originalStatus)) {
      return next(new Error('Cannot modify prescription in terminal state'));
    }
  }

  next();
});

// Post-init hook to store original status for terminal state check
prescriptionSchema.post('init', function(doc) {
  doc._original = {
    status: doc.status
  };
});

/**
 * Post-save hook to verify medicines is always an array
 */
prescriptionSchema.post('save', function(doc) {
  if (!Array.isArray(doc.medicines)) {
    console.error('[Prescription.post-save] ERROR: medicines is not an array after save!', typeof doc.medicines, doc.medicines);
    doc.medicines = [];
  }
});

/**
 * Post find hook to ensure medicines is always an array
 */
prescriptionSchema.post('find', function(docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc && !Array.isArray(doc.medicines)) {
        doc.medicines = [];
      }
    });
  }
});

/**
 * Post findOne hook to ensure medicines is always an array
 */
prescriptionSchema.post('findOne', function(doc) {
  if (doc && !Array.isArray(doc.medicines)) {
    doc.medicines = [];
  }
});

/**
 * Custom toJSON to ensure medicines is always an array
 */
prescriptionSchema.methods.toJSON = function() {
  const obj = this.toObject();
  console.log('[Prescription.toJSON] Before fix - medicines:', obj.medicines, 'type:', typeof obj.medicines);
  if (!Array.isArray(obj.medicines)) {
    console.log('[Prescription.toJSON] medicines was not array, resetting');
    obj.medicines = [];
  }
  console.log('[Prescription.toJSON] After fix - medicines:', obj.medicines, 'type:', typeof obj.medicines);
  return obj;
};

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;
