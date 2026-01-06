const express = require('express');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload.middleware.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest,
  documentUploadSchema,
  getPatientDocumentsSchema,
  updateDocumentSchema, } = require('../middleware/validation.middleware.js');
const { uploadDocument,
  getPatientDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getLabDocuments, } = require('../controllers/document.controller.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

/**
 * @route GET /api/documents/lab
 * @desc Get all documents uploaded by the current lab
 * @access Private (Lab only)
 */
router.get(
  '/lab',
  authenticate,
  authorize([ROLES.LAB]),
  getLabDocuments
);

/**
 * @route POST /api/documents/upload
 * @desc Upload a document (patient self-upload or provider submission)
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
router.post(
  '/upload',
  authenticate,
  authorize([ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  uploadSingle('document'),
  validateRequest(documentUploadSchema),
  uploadDocument
);

/**
 * @route GET /api/documents/patient/:patientId
 * @desc Get all documents for a specific patient
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
router.get(
  '/patient/:patientId',
  authenticate,
  authorize([ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(getPatientDocumentsSchema),
  getPatientDocuments
);

/**
 * @route GET /api/documents/:documentId
 * @desc Get a specific document by ID
 * @access Private (Patient, Hospital, Doctor, Lab)
 */
router.get(
  '/:documentId',
  authenticate,
  authorize([ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  getDocumentById
);

/**
 * @route PUT /api/documents/:documentId
 * @desc Update document metadata
 * @access Private (Patient only)
 */
router.put(
  '/:documentId',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(updateDocumentSchema),
  updateDocument
);

/**
 * @route DELETE /api/documents/:documentId
 * @desc Delete a document (soft delete)
 * @access Private (Patient, Lab, Doctor, Hospital - document owner or uploader)
 */
router.delete(
  '/:documentId',
  authenticate,
  authorize([ROLES.PATIENT, ROLES.LAB, ROLES.DOCTOR, ROLES.HOSPITAL]),
  deleteDocument
);

module.exports = router;
