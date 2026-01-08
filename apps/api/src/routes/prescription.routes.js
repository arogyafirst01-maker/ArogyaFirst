import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';
import {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPharmacyPrescriptions,
  prebookPrescription,
  fulfillPrescription,
  cancelPrescription,
  searchMedicines
} from '../controllers/prescription.controller.js';
import {
  createPrescriptionSchema,
  prebookPrescriptionSchema,
  cancelPrescriptionSchema,
  searchMedicinesSchema
} from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Doctor routes
router.post('/create', authorize([ROLES.DOCTOR]), validateRequest(createPrescriptionSchema), createPrescription);
router.get('/doctor', authorize([ROLES.DOCTOR]), getDoctorPrescriptions);
router.get('/medicines/search', authorize([ROLES.DOCTOR]), validateRequest(searchMedicinesSchema), searchMedicines);

// Patient routes
router.get('/patient/:patientId', authorize([ROLES.PATIENT, ROLES.DOCTOR]), getPatientPrescriptions);
router.post('/:prescriptionId/prebook', authorize([ROLES.PATIENT]), validateRequest(prebookPrescriptionSchema), prebookPrescription);

// Pharmacy routes
router.get('/pharmacy', authorize([ROLES.PHARMACY]), getPharmacyPrescriptions);
router.put('/:prescriptionId/fulfill', authorize([ROLES.PHARMACY]), fulfillPrescription);

// Shared routes (doctor or patient can cancel)
router.put('/:prescriptionId/cancel', authorize([ROLES.DOCTOR, ROLES.PATIENT]), validateRequest(cancelPrescriptionSchema), cancelPrescription);

export default router;
