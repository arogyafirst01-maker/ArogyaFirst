const mongoose = require('mongoose');
const { CONSENT_STATUS, ROLES } = require('@arogyafirst/shared');
const { generateConsentId, isConsentExpired } = require('@arogyafirst/shared');

/**
 * ConsentRequest Schema
 * 
 * Manages consent requests from providers to access patient documents.
 * Supports approval, rejection, revocation, and expiry tracking.
 */

const consentRequestSchema = new mongoose.Schema({
  consentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  requesterRole: {
    type: String,
    enum: [ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB],
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Purpose must be at least 10 characters'],
    maxlength: [500, 'Purpose must not exceed 500 characters'],
  },
  status: {
    type: String,
    enum: Object.values(CONSENT_STATUS),
    default: CONSENT_STATUS.PENDING,
    required: true,
    index: true,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  respondedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
  revokedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes must not exceed 500 characters'],
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
consentRequestSchema.index({ patientId: 1, status: 1, requestedAt: -1 });
consentRequestSchema.index({ requesterId: 1, status: 1 });
consentRequestSchema.index({ patientId: 1, requesterId: 1, status: 1 });

/**
 * Static method: Find consent requests by patient ID with optional filters
 * @param {ObjectId} patientId - Patient ID
 * @param {Object} filters - Optional filters (status)
 * @returns {Promise<ConsentRequest[]>} Array of consent requests
 */
consentRequestSchema.statics.findByPatient = async function(patientId, filters = {}) {
  const query = { patientId };

  if (filters.status) {
    query.status = filters.status;
  }

  return this.find(query)
    .populate('requesterId', 'name email role')
    .sort({ requestedAt: -1 });
};

/**
 * Static method: Find consent requests by requester ID with optional filters
 * @param {ObjectId} requesterId - Requester ID
 * @param {Object} filters - Optional filters (status)
 * @returns {Promise<ConsentRequest[]>} Array of consent requests
 */
consentRequestSchema.statics.findByRequester = async function(requesterId, filters = {}) {
  const query = { requesterId };

  if (filters.status) {
    query.status = filters.status;
  }

  return this.find(query)
    .populate('patientId', 'name email phone')
    .sort({ requestedAt: -1 });
};

/**
 * Static method: Find active consent between patient and requester
 * @param {ObjectId} patientId - Patient ID
 * @param {ObjectId} requesterId - Requester ID
 * @returns {Promise<ConsentRequest|null>} Active consent or null
 */
consentRequestSchema.statics.findActiveConsent = async function(patientId, requesterId) {
  const consent = await this.findOne({
    patientId,
    requesterId,
    status: CONSENT_STATUS.APPROVED,
  }).sort({ respondedAt: -1 });

  // Check if consent has expired
  if (consent && consent.isExpired()) {
    consent.status = CONSENT_STATUS.EXPIRED;
    await consent.save();
    return null;
  }

  return consent;
};

/**
 * Static method: Generate unique consent ID
 * @returns {string} Unique consent ID
 */
consentRequestSchema.statics.generateConsentId = function() {
  return generateConsentId();
};

/**
 * Instance method: Approve consent request
 * @param {Date} expiresAt - Optional expiry date
 * @param {string} notes - Optional notes
 */
consentRequestSchema.methods.approve = function(expiresAt, notes) {
  this.status = CONSENT_STATUS.APPROVED;
  this.respondedAt = new Date();
  if (expiresAt) {
    this.expiresAt = new Date(expiresAt);
  }
  if (notes) {
    this.notes = notes;
  }
};

/**
 * Instance method: Reject consent request
 * @param {string} notes - Optional notes
 */
consentRequestSchema.methods.reject = function(notes) {
  this.status = CONSENT_STATUS.REJECTED;
  this.respondedAt = new Date();
  if (notes) {
    this.notes = notes;
  }
};

/**
 * Instance method: Revoke consent
 */
consentRequestSchema.methods.revoke = function() {
  this.status = CONSENT_STATUS.REVOKED;
  this.revokedAt = new Date();
};

/**
 * Instance method: Check if consent has expired
 * @returns {boolean} True if expired, false otherwise
 */
consentRequestSchema.methods.isExpired = function() {
  return isConsentExpired(this.expiresAt);
};

// Pre-save hook to auto-expire consents
consentRequestSchema.pre('save', function(next) {
  if (this.status === CONSENT_STATUS.APPROVED && this.isExpired()) {
    this.status = CONSENT_STATUS.EXPIRED;
  }
  next();
});

const ConsentRequest = mongoose.model('ConsentRequest', consentRequestSchema);

module.exports = ConsentRequest;;
