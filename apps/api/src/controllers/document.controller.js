const Document = require('../models/Document.model.js');
const ConsentRequest = require('../models/ConsentRequest.model.js');
const User = require('../models/User.model.js');
const Booking = require('../models/Booking.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUpload.util.js');
const { DOCUMENT_UPLOAD_SOURCE, ROLES } = require('@arogyafirst/shared');

// Maximum document size: 5MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

/**
 * Upload Document
 * 
 * Handles document upload by patients (self-upload) or providers (direct submission).
 * Providers must have active consent to submit documents on behalf of patients.
 * 
 * @route POST /api/documents/upload
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
const uploadDocument = async (req, res) => {
  try {
    const { patientId, patientEmail, bookingId, documentType, title, description, metadata } = req.body;
    const uploaderId = req.user._id;
    const uploaderRole = req.user.role;

    // Normalize metadata (handle JSON string from multipart/form-data)
    let normalizedMetadata = metadata || {};
    if (typeof normalizedMetadata === 'string') {
      try {
        normalizedMetadata = JSON.parse(normalizedMetadata);
      } catch (e) {
        return errorResponse(res, 'Invalid metadata JSON', 400);
      }
    }
    if (typeof normalizedMetadata !== 'object' || normalizedMetadata === null) {
      normalizedMetadata = {};
    }

    // Validate file exists
    if (!req.file) {
      return errorResponse(res, 'No file provided', 400);
    }

    // Server-side file size validation
    if (req.file.size > MAX_DOCUMENT_SIZE) {
      return errorResponse(res, `File size exceeds maximum allowed size of ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`, 400);
    }

    // Validate patient exists - accept either patientId or patientEmail
    let patient;
    if (patientId) {
      patient = await User.findById(patientId);
    } else if (patientEmail) {
      patient = await User.findOne({ email: patientEmail, role: ROLES.PATIENT });
    }
    
    if (!patient || patient.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Invalid patient ID or email', 400);
    }

    const finalPatientId = patient._id;

    // Resolve bookingId if provided (convert booking ID string to ObjectId)
    let bookingObjectId = null;
    if (bookingId) {
      const booking = await Booking.findOne({ bookingId: bookingId });
      if (booking) {
        bookingObjectId = booking._id;
      }
      // If bookingId provided but not found, just log warning and continue
      if (!booking) {
        console.warn(`Booking not found for bookingId: ${bookingId}`);
      }
    }

    // Determine upload source
    let uploadSource;
    if (uploaderId.toString() === finalPatientId.toString()) {
      // Patient self-upload
      uploadSource = DOCUMENT_UPLOAD_SOURCE.PATIENT_UPLOAD;
    } else {
      // Provider submission - verify consent
      uploadSource = DOCUMENT_UPLOAD_SOURCE.PROVIDER_SUBMISSION;
      
      const activeConsent = await ConsentRequest.findActiveConsent(finalPatientId, uploaderId);
      if (!activeConsent) {
        return errorResponse(res, 'No active consent to upload documents for this patient', 403);
      }
    }

    // Upload file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, 'documents', ['pdf', 'jpg', 'jpeg', 'png']);

    // Create document record
    const document = new Document({
      documentId: Document.generateDocumentId(),
      patientId: finalPatientId,
      bookingId: bookingObjectId,
      uploadedBy: uploaderId,
      uploadSource,
      documentType,
      title,
      description: description || '',
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      size: uploadResult.bytes,
      metadata: normalizedMetadata,
      uploadedAt: new Date(),
    });

    // Save document
    await document.save();

    // Re-fetch with populated uploadedBy to match getPatientDocuments response shape
    const populatedDocument = await Document.findOne({ documentId: document.documentId })
      .populate('uploadedBy', 'name email role')
      .populate('patientId', 'name email');

    return successResponse(res, {
      document: populatedDocument,
    }, 'Document uploaded successfully');

  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Handle Cloudinary configuration errors with 503 Service Unavailable
    if (error.message && error.message.includes('Cloudinary is not configured')) {
      return errorResponse(res, 'Document storage service is temporarily unavailable. Please contact support.', 503);
    }
    
    return errorResponse(res, 'Failed to upload document', 500);
  }
};

/**
 * Get Patient Documents
 * 
 * Retrieves documents for a specific patient.
 * Accessible by the patient themselves or providers with active consent.
 * 
 * @route GET /api/documents/patient/:patientId
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
const getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const requesterId = req.user._id;
    const { documentType, startDate, endDate, page, limit } = req.query;

    // Validate patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Invalid patient ID', 400);
    }

    // Check access permissions
    if (requesterId.toString() !== patientId.toString()) {
      // Provider requesting - verify consent
      const activeConsent = await ConsentRequest.findActiveConsent(patientId, requesterId);
      if (!activeConsent) {
        return errorResponse(res, 'Unauthorized: No active consent to access patient documents', 403);
      }
    }

    // Build filters
    const filters = {};
    if (documentType) filters.documentType = documentType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = Math.min(parseInt(limit), 100);

    // Fetch documents
    const documents = await Document.findByPatient(patientId, filters);

    return successResponse(res, {
      documents,
      count: documents.length,
    }, 'Documents retrieved successfully');

  } catch (error) {
    console.error('Error fetching patient documents:', error);
    return errorResponse(res, 'Failed to fetch documents', 500);
  }
};

/**
 * Get Document By ID
 * 
 * Retrieves a specific document by its document ID.
 * Accessible by the patient or providers with active consent.
 * 
 * @route GET /api/documents/:documentId
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
const getDocumentById = async (req, res) => {
  try {
    const { documentId } = req.params;
    const requesterId = req.user._id;

    // Find document
    const document = await Document.findOne({ documentId, isActive: true })
      .populate('uploadedBy', 'name email role')
      .populate('patientId', 'name email phone');

    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Check access permissions
    if (requesterId.toString() !== document.patientId._id.toString()) {
      // Provider requesting - verify consent
      const activeConsent = await ConsentRequest.findActiveConsent(document.patientId._id, requesterId);
      if (!activeConsent) {
        return errorResponse(res, 'Unauthorized: No access to this document', 403);
      }
    }

    return successResponse(res, { document }, 'Document retrieved successfully');

  } catch (error) {
    console.error('Error fetching document:', error);
    return errorResponse(res, 'Failed to fetch document', 500);
  }
};

/**
 * Update Document
 * 
 * Updates document metadata (title, description, type).
 * Only accessible by the patient who owns the document.
 * 
 * @route PUT /api/documents/:documentId
 * @access Private (Patient only)
 */
const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, description, documentType, metadata } = req.body;
    const requesterId = req.user._id;

    // Find document
    const document = await Document.findOne({ documentId, isActive: true });

    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Verify requester is the patient
    if (requesterId.toString() !== document.patientId.toString()) {
      return errorResponse(res, 'Unauthorized: Only the patient can update their documents', 403);
    }

    // Update allowed fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (documentType) document.documentType = documentType;
    if (metadata) document.metadata = { ...document.metadata, ...metadata };

    await document.save();

    return successResponse(res, { document }, 'Document updated successfully');

  } catch (error) {
    console.error('Error updating document:', error);
    return errorResponse(res, 'Failed to update document', 500);
  }
};

/**
 * Delete Document
 * 
 * Soft deletes a document and optionally removes it from Cloudinary.
 * Accessible by the patient who owns the document or the provider who uploaded it.
 * 
 * @route DELETE /api/documents/:documentId
 * @access Private (Patient, Lab, Doctor, Hospital)
 */
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const requesterId = req.user._id;
    const requesterRole = req.user.role;

    // Find document
    const document = await Document.findOne({ documentId, isActive: true });

    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Verify requester is either the patient or the uploader
    const isPatient = requesterId.toString() === document.patientId.toString();
    const isUploader = requesterId.toString() === document.uploadedBy.toString();
    
    if (!isPatient && !isUploader) {
      return errorResponse(res, 'Unauthorized: Only the patient can delete their documents', 403);
    }

    // Soft delete
    await document.softDelete();

    // Optionally delete from Cloudinary
    try {
      await deleteFromCloudinary(document.publicId);
    } catch (cloudinaryError) {
      console.warn('Failed to delete from Cloudinary:', cloudinaryError);
      // Continue even if Cloudinary deletion fails
    }

    return successResponse(res, null, 'Document deleted successfully');

  } catch (error) {
    console.error('Error deleting document:', error);
    return errorResponse(res, 'Failed to delete document', 500);
  }
};

/**
 * Get Lab Documents
 * 
 * Retrieves all documents uploaded by the current lab user.
 * 
 * @route GET /api/documents/lab
 * @access Private (Lab)
 */
const getLabDocuments = async (req, res) => {
  try {
    const labId = req.user._id;

    const documents = await Document.find({
      uploadedBy: labId,
      isActive: true
    })
      .populate('patientId', 'name email phone')
      .populate('bookingId', 'bookingId')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, { documents, count: documents.length }, 'Lab documents retrieved successfully');

  } catch (error) {
    console.error('Error retrieving lab documents:', error);
    return errorResponse(res, 'Failed to retrieve lab documents', 500);
  }
};


module.exports = {
  uploadDocument,
  getPatientDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getLabDocuments,
};
