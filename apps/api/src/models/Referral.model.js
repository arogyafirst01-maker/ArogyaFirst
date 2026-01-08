import mongoose from 'mongoose';
import { REFERRAL_STATUS, REFERRAL_TYPES, ROLES } from '@arogyafirst/shared';
import { generateReferralId } from '@arogyafirst/shared';

/**
 * Referral Schema
 * 
 * Manages referrals between healthcare entities (hospitals, doctors, labs, pharmacies).
 * Supports inter-departmental, specialist, pharmacy, and lab-to-lab referrals.
 */

const referralSchema = new mongoose.Schema({
  referralId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetId: {
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
  referralType: {
    type: String,
    enum: Object.values(REFERRAL_TYPES),
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: Object.values(REFERRAL_STATUS),
    default: REFERRAL_STATUS.PENDING,
    index: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },
  sourceSnapshot: {
    name: String,
    role: String,
    specialization: String,
    location: String,
  },
  targetSnapshot: {
    name: String,
    role: String,
    specialization: String,
    location: String,
  },
  patientSnapshot: {
    name: String,
    phone: String,
    email: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  acceptedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  rejectedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
    trim: true,
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
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
referralSchema.index({ sourceId: 1, status: 1, createdAt: -1 });
referralSchema.index({ targetId: 1, status: 1, createdAt: -1 });
referralSchema.index({ patientId: 1, createdAt: -1 });

/**
 * Static method to find referrals by source
 */
referralSchema.statics.findBySource = function(sourceId, filters = {}) {
  const query = { sourceId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.referralType) {
    query.referralType = filters.referralType;
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
 * Static method to find referrals by target
 */
referralSchema.statics.findByTarget = function(targetId, filters = {}) {
  const query = { targetId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.referralType) {
    query.referralType = filters.referralType;
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
 * Static method to find referrals by patient
 */
referralSchema.statics.findByPatient = function(patientId, filters = {}) {
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
 * Static method to generate referral ID
 */
referralSchema.statics.generateReferralId = function() {
  return generateReferralId();
};

/**
 * Instance method to accept referral
 */
referralSchema.methods.accept = function(userId, notes = '') {
  this.status = REFERRAL_STATUS.ACCEPTED;
  this.acceptedAt = new Date();
  this.updatedBy = userId;
  if (notes) {
    this.notes = notes;
  }
  return this;
};

/**
 * Instance method to complete referral
 */
referralSchema.methods.complete = function(userId) {
  this.status = REFERRAL_STATUS.COMPLETED;
  this.completedAt = new Date();
  this.updatedBy = userId;
  return this;
};

/**
 * Instance method to reject referral
 */
referralSchema.methods.reject = function(userId, reason) {
  this.status = REFERRAL_STATUS.REJECTED;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.updatedBy = userId;
  return this;
};

/**
 * Instance method to cancel referral
 */
referralSchema.methods.cancel = function(userId, reason = '') {
  this.status = REFERRAL_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  this.updatedBy = userId;
  return this;
};

/**
 * Pre-save hook for validation
 */
referralSchema.pre('save', function(next) {
  // Prevent status changes from terminal states
  if (this.isModified('status') && !this.isNew) {
    const terminalStates = [REFERRAL_STATUS.COMPLETED, REFERRAL_STATUS.REJECTED, REFERRAL_STATUS.CANCELLED];
    if (terminalStates.includes(this._original?.status)) {
      return next(new Error('Cannot modify referral in terminal state'));
    }
  }
  
  // Validate referral type matches source role
  if (this.isNew || this.isModified('referralType')) {
    const sourceRole = this.sourceSnapshot?.role;
    
    if (sourceRole === ROLES.HOSPITAL && this.referralType !== REFERRAL_TYPES.INTER_DEPARTMENTAL) {
      return next(new Error('Hospitals can only create INTER_DEPARTMENTAL referrals'));
    }
    
    if (sourceRole === ROLES.DOCTOR && 
        ![REFERRAL_TYPES.DOCTOR_TO_DOCTOR, REFERRAL_TYPES.DOCTOR_TO_PHARMACY].includes(this.referralType)) {
      return next(new Error('Doctors can only create DOCTOR_TO_DOCTOR or DOCTOR_TO_PHARMACY referrals'));
    }
    
    if (sourceRole === ROLES.LAB && this.referralType !== REFERRAL_TYPES.LAB_TO_LAB) {
      return next(new Error('Labs can only create LAB_TO_LAB referrals'));
    }
    
    // Validate target role based on referral type
    const targetRole = this.targetSnapshot?.role;
    
    if (this.referralType === REFERRAL_TYPES.INTER_DEPARTMENTAL && targetRole !== ROLES.DOCTOR) {
      return next(new Error('INTER_DEPARTMENTAL referrals must target DOCTOR role'));
    }
    
    if (this.referralType === REFERRAL_TYPES.DOCTOR_TO_DOCTOR && targetRole !== ROLES.DOCTOR) {
      return next(new Error('DOCTOR_TO_DOCTOR referrals must target DOCTOR role'));
    }
    
    if (this.referralType === REFERRAL_TYPES.DOCTOR_TO_PHARMACY && targetRole !== ROLES.PHARMACY) {
      return next(new Error('DOCTOR_TO_PHARMACY referrals must target PHARMACY role'));
    }
    
    if (this.referralType === REFERRAL_TYPES.LAB_TO_LAB && targetRole !== ROLES.LAB) {
      return next(new Error('LAB_TO_LAB referrals must target LAB role'));
    }
  }
  
  next();
});

// Store original state for pre-save validation
referralSchema.post('init', function() {
  this._original = this.toObject();
});

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
