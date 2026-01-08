import express from 'express';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import {
  validateRequest,
  documentUploadSchema,
  getPatientDocumentsSchema,
  updateDocumentSchema,
} from '../middleware/validation.middleware.js';
import {
  uploadDocument,
  getPatientDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getLabDocuments,
} from '../controllers/document.controller.js';
import { ROLES } from '@arogyafirst/shared';

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

export default router;
