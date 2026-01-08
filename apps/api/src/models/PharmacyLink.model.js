import mongoose from 'mongoose';
import { generatePharmacyLinkId } from '@arogyafirst/shared';

/**
 * PharmacyLink Schema
 * 
 * Tracks doctor-pharmacy relationships for prescription management.
 * AUTO links created for hospital-affiliated doctors, MANUAL for independent doctors.
 */

const pharmacyLinkSchema = new mongoose.Schema({
  linkId: {
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
  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  linkType: {
    type: String,
    enum: ['AUTO', 'MANUAL'],
    required: true,
  },
  hospitalId: {
    type: String,
  },
  requestStatus: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
    default: 'PENDING',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  respondedAt: {
    type: Date,
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound unique index to prevent duplicate links
pharmacyLinkSchema.index({ doctorId: 1, pharmacyId: 1 }, { unique: true });

// Compound index for efficient active link queries
pharmacyLinkSchema.index({ doctorId: 1, isActive: 1 });
pharmacyLinkSchema.index({ pharmacyId: 1, requestStatus: 1 });

/**
 * Static method: Find active pharmacy links for a doctor
 * @param {ObjectId} doctorId - Doctor ID
 * @returns {Promise<PharmacyLink[]>} Array of active pharmacy links
 */
pharmacyLinkSchema.statics.findActiveByDoctor = async function(doctorId) {
  return this.find({ doctorId, isActive: true, requestStatus: 'ACCEPTED' })
    .populate('pharmacyId', 'name uniqueId pharmacyData')
    .sort({ createdAt: -1 });
};

/**
 * Static method: Find active doctor links for a pharmacy
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @returns {Promise<PharmacyLink[]>} Array of active doctor links
 */
pharmacyLinkSchema.statics.findActiveByPharmacy = async function(pharmacyId) {
  return this.find({ pharmacyId, isActive: true, requestStatus: 'ACCEPTED' })
    .populate('doctorId', 'name uniqueId doctorData')
    .sort({ createdAt: -1 });
};

/**
 * Static method: Find link between doctor and pharmacy
 * @param {ObjectId} doctorId - Doctor ID
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @returns {Promise<PharmacyLink|null>} Pharmacy link or null
 */
pharmacyLinkSchema.statics.findLink = async function(doctorId, pharmacyId) {
  return this.findOne({ doctorId, pharmacyId });
};

/**
 * Static method: Find pending requests for a pharmacy
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @returns {Promise<PharmacyLink[]>} Array of pending requests
 */
pharmacyLinkSchema.statics.findPendingByPharmacy = async function(pharmacyId) {
  return this.find({ pharmacyId, requestStatus: 'PENDING' })
    .populate('doctorId', 'name uniqueId doctorData email')
    .sort({ createdAt: -1 });
};

/**
 * Static method: Find all requests sent by a doctor
 * @param {ObjectId} doctorId - Doctor ID
 * @returns {Promise<PharmacyLink[]>} Array of all requests
 */
pharmacyLinkSchema.statics.findAllByDoctor = async function(doctorId) {
  return this.find({ doctorId })
    .populate('pharmacyId', 'name uniqueId pharmacyData')
    .sort({ createdAt: -1 });
};

/**
 * Static method: Create AUTO link for hospital-affiliated doctor
 * @param {ObjectId} doctorId - Doctor ID
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @param {string} hospitalId - Hospital unique ID
 * @param {ObjectId} createdBy - User creating the link
 * @returns {Promise<PharmacyLink>} Created pharmacy link
 */
pharmacyLinkSchema.statics.createAutoLink = async function(doctorId, pharmacyId, hospitalId, createdBy) {
  const link = new this({
    linkId: generatePharmacyLinkId(),
    doctorId,
    pharmacyId,
    linkType: 'AUTO',
    hospitalId,
    isActive: true,
    createdBy,
  });
  return link.save();
};

/**
 * Static method: Create MANUAL link for independent doctor
 * @param {ObjectId} doctorId - Doctor ID
 * @param {ObjectId} pharmacyId - Pharmacy ID
 * @param {ObjectId} createdBy - User creating the link
 * @returns {Promise<PharmacyLink>} Created pharmacy link
 */
pharmacyLinkSchema.statics.createManualLink = async function(doctorId, pharmacyId, createdBy) {
  const link = new this({
    linkId: generatePharmacyLinkId(),
    doctorId,
    pharmacyId,
    linkType: 'MANUAL',
    requestStatus: 'PENDING',
    isActive: false,
    createdBy,
  });
  return link.save();
};

/**
 * Instance method: Deactivate link (soft delete)
 */
pharmacyLinkSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

/**
 * Instance method: Activate link
 */
pharmacyLinkSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

/**
 * Instance method: Accept request
 */
pharmacyLinkSchema.methods.acceptRequest = function(respondedBy) {
  this.requestStatus = 'ACCEPTED';
  this.isActive = true;
  this.respondedAt = new Date();
  this.respondedBy = respondedBy;
  return this.save();
};

/**
 * Instance method: Reject request
 */
pharmacyLinkSchema.methods.rejectRequest = function(respondedBy) {
  this.requestStatus = 'REJECTED';
  this.isActive = false;
  this.respondedAt = new Date();
  this.respondedBy = respondedBy;
  return this.save();
};

const PharmacyLink = mongoose.model('PharmacyLink', pharmacyLinkSchema);

export default PharmacyLink;
