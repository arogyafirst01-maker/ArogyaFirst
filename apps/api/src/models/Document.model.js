const mongoose = require('mongoose');
const { DOCUMENT_TYPES, DOCUMENT_UPLOAD_SOURCE } = require('@arogyafirst/shared');
const { generateDocumentId } = require('@arogyafirst/shared');

/**
 * Document Schema
 * 
 * Stores patient medical documents uploaded by patients or providers.
 * Documents are stored in Cloudinary with metadata tracked in MongoDB.
 */

const documentSchema = new mongoose.Schema({
  documentId: {
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
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadSource: {
    type: String,
    enum: Object.values(DOCUMENT_UPLOAD_SOURCE),
    required: true,
  },
  documentType: {
    type: String,
    enum: Object.values(DOCUMENT_TYPES),
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title must not exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description must not exceed 1000 characters'],
  },
  fileUrl: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  format: {
    type: String,
  },
  size: {
    type: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
documentSchema.index({ patientId: 1, isActive: 1, uploadedAt: -1 });
documentSchema.index({ patientId: 1, documentType: 1, isActive: 1 });
documentSchema.index({ patientId: 1, bookingId: 1, isActive: 1 });

/**
 * Static method: Find documents by patient ID with optional filters
 * @param {ObjectId} patientId - Patient ID
 * @param {Object} filters - Optional filters (documentType, startDate, endDate, page, limit)
 * @returns {Promise<Document[]>} Array of documents
 */
documentSchema.statics.findByPatient = async function(patientId, filters = {}) {
  const query = {
    patientId,
    isActive: true,
  };

  // Apply filters
  if (filters.documentType) {
    query.documentType = filters.documentType;
  }

  if (filters.startDate || filters.endDate) {
    query.uploadedAt = {};
    if (filters.startDate) {
      query.uploadedAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.uploadedAt.$lte = new Date(filters.endDate);
    }
  }

  // Pagination
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('uploadedBy', 'displayName email role')
    .populate('patientId', 'displayName email')
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Static method: Generate unique document ID
 * @returns {string} Unique document ID
 */
documentSchema.statics.generateDocumentId = function() {
  return generateDocumentId();
};

/**
 * Instance method: Soft delete document
 */
documentSchema.methods.softDelete = function() {
  this.isActive = false;
  return this.save();
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;;
