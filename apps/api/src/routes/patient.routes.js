const express = require('express');
const { getProfile, updateProfile, getMedicalHistory, getHealthProfile, getSettings, updateSettings, exportMedicalHistory, searchPatients } = require('../controllers/patient.controller.js');
const { register } = require('../controllers/auth.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, getMedicalHistorySchema, exportMedicalHistorySchema, registerPatientSchema } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

// GET /search - Search patients (for providers)
router.get('/search', authenticate, authorize([ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB, ROLES.PHARMACY]), searchPatients);

// GET /profile - Get current patient's profile
router.get('/profile', authenticate, authorize([ROLES.PATIENT]), getProfile);

// PUT /profile - Update current patient's profile
router.put('/profile', authenticate, authorize([ROLES.PATIENT]), updateProfile);

// GET /medical-history/export - Export patient's medical history (CSV/PDF)
router.get('/medical-history/export', authenticate, authorize([ROLES.PATIENT]), validateRequest(exportMedicalHistorySchema), exportMedicalHistory);

// GET /medical-history - Get patient's medical history timeline
router.get('/medical-history', authenticate, authorize([ROLES.PATIENT]), validateRequest(getMedicalHistorySchema), getMedicalHistory);

// GET /health-profile - Get patient's health statistics
router.get('/health-profile', authenticate, authorize([ROLES.PATIENT]), getHealthProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.PATIENT]), getSettings);
router.put('/settings', authenticate, authorize([ROLES.PATIENT]), updateSettings);

// Public patient registration alias
// Inject role so clients don't have to send it and keep parity with /api/auth/register/patient
router.post(
	'/register',
	(req, _res, next) => { req.body.role = ROLES.PATIENT; next(); },
	validateRequest(registerPatientSchema),
	register
);

module.exports = router;