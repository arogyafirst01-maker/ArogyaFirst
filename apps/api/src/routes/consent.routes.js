const express = require('express');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest,
  requestConsentSchema,
  approveConsentSchema,
  rejectConsentSchema,
  checkConsentSchema,
  getPatientConsentsSchema,
  getProviderConsentsSchema, } = require('../middleware/validation.middleware.js');
const { requestConsent,
  getPatientConsentRequests,
  getProviderConsentRequests,
  approveConsent,
  rejectConsent,
  revokeConsent,
  checkConsentStatus, } = require('../controllers/consent.controller.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

/**
 * @route POST /api/consent/request
 * @desc Request consent to access patient documents
 * @access Private (Hospital, Doctor, Lab)
 */
router.post(
  '/request',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(requestConsentSchema),
  requestConsent
);

/**
 * @route GET /api/consent/patient/:patientId
 * @desc Get all consent requests for a patient
 * @access Private (Patient only)
 */
router.get(
  '/patient/:patientId',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(getPatientConsentsSchema),
  getPatientConsentRequests
);

/**
 * @route GET /api/consent/provider/:providerId
 * @desc Get all consent requests made by a provider
 * @access Private (Hospital, Doctor, Lab)
 */
router.get(
  '/provider/:providerId',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(getProviderConsentsSchema),
  getProviderConsentRequests
);

/**
 * @route PUT /api/consent/:consentId/approve
 * @desc Approve a consent request
 * @access Private (Patient only)
 */
router.put(
  '/:consentId/approve',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(approveConsentSchema),
  approveConsent
);

/**
 * @route PUT /api/consent/:consentId/reject
 * @desc Reject a consent request
 * @access Private (Patient only)
 */
router.put(
  '/:consentId/reject',
  authenticate,
  authorize([ROLES.PATIENT]),
  validateRequest(rejectConsentSchema),
  rejectConsent
);

/**
 * @route PUT /api/consent/:consentId/revoke
 * @desc Revoke an approved consent
 * @access Private (Patient only)
 */
router.put(
  '/:consentId/revoke',
  authenticate,
  authorize([ROLES.PATIENT]),
  revokeConsent
);

/**
 * @route GET /api/consent/check
 * @desc Check if active consent exists between patient and provider
 * @access Private (Hospital, Doctor, Lab)
 */
router.get(
  '/check',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(checkConsentSchema),
  checkConsentStatus
);

module.exports = router;
