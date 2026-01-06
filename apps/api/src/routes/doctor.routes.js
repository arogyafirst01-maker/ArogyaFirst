const { Router } = require('express');
const doctorController = require('../controllers/doctor.controller.js');
const authController = require('../controllers/auth.controller.js');
const { getDoctorPatients, getPatientHistoryForDoctor } = require('../controllers/consultation.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, registerDoctorSchema, addSlotSchema, updateSlotSchema, getDoctorPatientsSchema, getPrescriptionTemplatesSchema, addPrescriptionTemplateSchema, updatePrescriptionTemplateSchema, deletePrescriptionTemplateSchema } = require('../middleware/validation.middleware.js');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = Router();

// Registration Alias
router.post('/register', uploadMultiple('documents', 5), validateRequest(registerDoctorSchema), (req, res, next) => {
  req.body.role = ROLES.DOCTOR;
  next();
}, authController.register);

// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.DOCTOR]), doctorController.getProfile);
router.put('/profile', authenticate, authorize([ROLES.DOCTOR]), doctorController.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.DOCTOR]), doctorController.getSettings);
router.put('/settings', authenticate, authorize([ROLES.DOCTOR]), doctorController.updateSettings);

// Document Routes
router.post('/documents', authenticate, authorize([ROLES.DOCTOR]), uploadSingle('document'), doctorController.uploadDocument, handleUploadError);
router.delete('/documents/:index', authenticate, authorize([ROLES.DOCTOR]), doctorController.deleteDocument);

// Patient Management Routes
router.get('/:id/patients', authenticate, authorize([ROLES.DOCTOR]), validateRequest(getDoctorPatientsSchema), getDoctorPatients);
router.get('/patients/:id/history', authenticate, authorize([ROLES.DOCTOR]), getPatientHistoryForDoctor);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.DOCTOR]), doctorController.exportReport);

// Prescription Template Routes
router.get('/templates', authenticate, authorize([ROLES.DOCTOR]), validateRequest(getPrescriptionTemplatesSchema), doctorController.getPrescriptionTemplates);
router.post('/templates', authenticate, authorize([ROLES.DOCTOR]), validateRequest(addPrescriptionTemplateSchema), doctorController.addPrescriptionTemplate);
router.put('/templates/:index', authenticate, authorize([ROLES.DOCTOR]), validateRequest(updatePrescriptionTemplateSchema), doctorController.updatePrescriptionTemplate);
router.delete('/templates/:index', authenticate, authorize([ROLES.DOCTOR]), doctorController.deletePrescriptionTemplate);

// DEPRECATED: Slot management moved to /api/slots endpoints (see slot.routes.js)
// router.get('/slots', authenticate, authorize([ROLES.DOCTOR]), controller.getSlots);
// router.post('/slots', authenticate, authorize([ROLES.DOCTOR]), validateRequest(addSlotSchema), controller.addSlot);
// router.put('/slots/:index', authenticate, authorize([ROLES.DOCTOR]), validateRequest(updateSlotSchema), controller.updateSlot);
// router.delete('/slots/:index', authenticate, authorize([ROLES.DOCTOR]), controller.deleteSlot);

module.exports = router;
