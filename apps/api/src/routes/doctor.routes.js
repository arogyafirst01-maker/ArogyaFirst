import { Router } from 'express';
import * as controller from '../controllers/doctor.controller.js';
import * as authController from '../controllers/auth.controller.js';
import { getDoctorPatients, getPatientHistoryForDoctor } from '../controllers/consultation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, registerDoctorSchema, addSlotSchema, updateSlotSchema, getDoctorPatientsSchema, getPrescriptionTemplatesSchema, addPrescriptionTemplateSchema, updatePrescriptionTemplateSchema, deletePrescriptionTemplateSchema } from '../middleware/validation.middleware.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = Router();

// Registration Alias
router.post('/register', uploadMultiple('documents', 5), validateRequest(registerDoctorSchema), (req, res, next) => {
  req.body.role = ROLES.DOCTOR;
  next();
}, authController.register);

// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.DOCTOR]), controller.getProfile);
router.put('/profile', authenticate, authorize([ROLES.DOCTOR]), controller.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.DOCTOR]), controller.getSettings);
router.put('/settings', authenticate, authorize([ROLES.DOCTOR]), controller.updateSettings);

// Document Routes
router.post('/documents', authenticate, authorize([ROLES.DOCTOR]), uploadSingle('document'), controller.uploadDocument, handleUploadError);
router.delete('/documents/:index', authenticate, authorize([ROLES.DOCTOR]), controller.deleteDocument);

// Patient Management Routes
router.get('/:id/patients', authenticate, authorize([ROLES.DOCTOR]), validateRequest(getDoctorPatientsSchema), getDoctorPatients);
router.get('/patients/:id/history', authenticate, authorize([ROLES.DOCTOR]), getPatientHistoryForDoctor);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.DOCTOR]), controller.exportReport);

// Prescription Template Routes
router.get('/templates', authenticate, authorize([ROLES.DOCTOR]), validateRequest(getPrescriptionTemplatesSchema), controller.getPrescriptionTemplates);
router.post('/templates', authenticate, authorize([ROLES.DOCTOR]), validateRequest(addPrescriptionTemplateSchema), controller.addPrescriptionTemplate);
router.put('/templates/:index', authenticate, authorize([ROLES.DOCTOR]), validateRequest(updatePrescriptionTemplateSchema), controller.updatePrescriptionTemplate);
router.delete('/templates/:index', authenticate, authorize([ROLES.DOCTOR]), controller.deletePrescriptionTemplate);

// DEPRECATED: Slot management moved to /api/slots endpoints (see slot.routes.js)
// router.get('/slots', authenticate, authorize([ROLES.DOCTOR]), controller.getSlots);
// router.post('/slots', authenticate, authorize([ROLES.DOCTOR]), validateRequest(addSlotSchema), controller.addSlot);
// router.put('/slots/:index', authenticate, authorize([ROLES.DOCTOR]), validateRequest(updateSlotSchema), controller.updateSlot);
// router.delete('/slots/:index', authenticate, authorize([ROLES.DOCTOR]), controller.deleteSlot);

export default router;
