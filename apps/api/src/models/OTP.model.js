import mongoose from 'mongoose';

/**
 * OTP Model for Email/Phone Verification and Password Reset
 * 
 * Stores one-time passwords with expiry, usage tracking, and attempt limiting
 * to prevent brute force attacks and ensure secure verification flows.
 * 
 * Supports both email-based OTPs (for registration verification) and
 * phone-based OTPs (for patient password reset).
 */

const OTP_PURPOSES = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET'
};

const otpSchema = new mongoose.Schema({
  // Email address for which OTP is generated (optional - for email verification)
  // Normalized to lowercase
  email: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Phone number for which OTP is generated (optional - for phone-based password reset)
  // Stored as 10-digit string without country code
  phone: {
    type: String,
    trim: true,
    index: true
  },
  
  // 6-digit OTP code (stored as string to preserve leading zeros)
  otp: {
    type: String,
    required: true,
    select: false // Don't include in queries by default for security
  },
  
  // Purpose of OTP generation
  purpose: {
    type: String,
    required: true,
    enum: Object.values(OTP_PURPOSES)
  },
  
  // Expiry timestamp (auto-deleted by TTL index after this time)
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Flag to prevent OTP reuse
  isUsed: {
    type: Boolean,
    default: false
  },
  
  // Track verification attempts to prevent brute force
  attempts: {
    type: Number,
    default: 0
  },
  
  // Timestamp of OTP creation
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-validate hook to ensure at least one of email or phone is provided
otpSchema.pre('validate', function(next) {
  if (!this.email && !this.phone) {
    return next(new Error('Either email or phone is required for OTP'));
  }
  next();
});

// Compound index for efficient lookups (supports both email and phone)
otpSchema.index({ email: 1, phone: 1, purpose: 1, isUsed: 1 });

// TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Instance method to check if OTP has expired
 * @returns {boolean} True if expired
 */
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

/**
 * Instance method to check if OTP is valid (unused and not expired)
 * @returns {boolean} True if valid
 */
otpSchema.methods.isValid = function() {
  return !this.isUsed && !this.isExpired();
};

/**
 * Static method to create and save a new OTP
 * @param {string|null} email - Email address (null for phone-based OTP)
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - OTP purpose (EMAIL_VERIFICATION or PASSWORD_RESET)
 * @param {number} expiryMinutes - Minutes until OTP expires (default: 10)
 * @param {string|null} phone - Phone number (null for email-based OTP)
 * @returns {Promise<Document>} Created OTP document
 */
otpSchema.statics.createOTP = async function(email, otp, purpose, expiryMinutes = 10, phone = null) {
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  const otpData = {
    otp,
    purpose,
    expiresAt
  };
  
  // Set email or phone based on what's provided
  if (email) {
    otpData.email = email.toLowerCase().trim();
  }
  if (phone) {
    otpData.phone = phone.replace(/\D/g, '').trim();
  }
  
  const otpDoc = new this(otpData);
  
  return otpDoc.save();
};

/**
 * Static method to find the most recent valid (unused, non-expired) OTP
 * @param {string|null} email - Email address (null for phone-based lookup)
 * @param {string} purpose - OTP purpose
 * @param {string|null} phone - Phone number (null for email-based lookup)
 * @returns {Promise<Document|null>} OTP document or null
 */
otpSchema.statics.findValidOTP = function(email, purpose, phone = null) {
  const query = {
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  };
  
  // Search by phone if provided, otherwise by email
  if (phone) {
    query.phone = phone.replace(/\D/g, '').trim();
  } else if (email) {
    query.email = email.toLowerCase().trim();
  }
  
  return this.findOne(query)
    .select('+otp')
    .sort({ createdAt: -1 });
};

/**
 * Static method to mark an OTP as used
 * @param {ObjectId} otpId - OTP document ID
 * @returns {Promise<Document>} Updated OTP document
 */
otpSchema.statics.markAsUsed = function(otpId) {
  return this.findByIdAndUpdate(otpId, { isUsed: true }, { new: true });
};

/**
 * Static method to increment attempt counter
 * @param {ObjectId} otpId - OTP document ID
 * @returns {Promise<Document>} Updated OTP document
 */
otpSchema.statics.incrementAttempts = function(otpId) {
  return this.findByIdAndUpdate(otpId, { $inc: { attempts: 1 } }, { new: true });
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
export { OTP_PURPOSES };
