const { Router } = require('express');
const controller = require('../controllers/hospital.controller.js');
const { register } = require('../controllers/auth.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, registerHospitalSchema, addDoctorSchema, updateDoctorSchema, addLabSchema, updateLabSchema, addBedSchema, updateBedSchema, addPharmacySchema, updatePharmacySchema, addStaffSchema, updateStaffSchema, createStaffScheduleSchema, updateStaffScheduleSchema, getAnalyticsQuerySchema, addLocationSchema, updateLocationSchema, getQueueQuerySchema, addToQueueSchema, allocateBedSchema, releaseBedSchema, removeFromQueueSchema, getAvailableBedsQuerySchema } = require('../middleware/validation.middleware.js');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = Router();

// Public hospital registration alias (keeps existing /api/auth/register/hospital intact)
// Route order: parse multipart → inject role → validate schema → register → handle upload errors
router.post('/register',
	uploadMultiple('documents', 5),
	(req, _res, next) => { req.body.role = ROLES.HOSPITAL; next(); },
	validateRequest(registerHospitalSchema),
	register,
	handleUploadError
);

// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.HOSPITAL]), controller.getProfile);
router.put('/profile', authenticate, authorize([ROLES.HOSPITAL]), controller.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.HOSPITAL]), controller.getSettings);
router.put('/settings', authenticate, authorize([ROLES.HOSPITAL]), controller.updateSettings);

// Document Routes
router.post('/documents', authenticate, authorize([ROLES.HOSPITAL]), uploadSingle('document'), controller.uploadDocument, handleUploadError);
router.delete('/documents/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteDocument);

// Doctor Management Routes
router.post('/doctors', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addDoctorSchema), controller.addDoctor);
router.put('/doctors/:index', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateDoctorSchema), controller.updateDoctor);
router.delete('/doctors/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteDoctor);

// Lab Management Routes
router.post('/labs', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addLabSchema), controller.addLab);
router.put('/labs/:index', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateLabSchema), controller.updateLab);
router.delete('/labs/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteLab);

// Bed Management Routes
router.post('/beds', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addBedSchema), controller.addBed);
router.put('/beds/:index', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateBedSchema), controller.updateBed);
router.delete('/beds/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteBed);

// Pharmacy Management Routes
router.post('/pharmacies', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addPharmacySchema), controller.addPharmacy);
router.put('/pharmacies/:index', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updatePharmacySchema), controller.updatePharmacy);
router.delete('/pharmacies/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deletePharmacy);

// Staff Management Routes
router.post('/staff', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addStaffSchema), controller.addStaff);
router.put('/staff/:index', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateStaffSchema), controller.updateStaff);
router.delete('/staff/:index', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteStaff);

// Location Management Routes (Chain Hospitals)
router.post('/locations', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addLocationSchema), controller.addLocation);
router.get('/locations', authenticate, authorize([ROLES.HOSPITAL]), controller.getLocations);
router.put('/locations/:locationId', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateLocationSchema), controller.updateLocation);
router.delete('/locations/:locationId', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteLocation);

// Dashboard & Analytics Routes
router.get('/:id/dashboard', authenticate, authorize([ROLES.HOSPITAL]), controller.getDashboard);
router.get('/:id/analytics', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(getAnalyticsQuerySchema), controller.getAnalytics);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.HOSPITAL]), controller.exportReport);

// Staff Schedule Routes
router.post('/:id/staff-schedule', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(createStaffScheduleSchema), controller.createStaffSchedule);
router.get('/:id/staff-schedules', authenticate, authorize([ROLES.HOSPITAL]), controller.getStaffSchedules);
router.put('/:id/staff-schedule/:scheduleId', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(updateStaffScheduleSchema), controller.updateStaffSchedule);
router.delete('/:id/staff-schedule/:scheduleId', authenticate, authorize([ROLES.HOSPITAL]), controller.deleteStaffSchedule);

// Bed Allocation & Queue Management Routes
router.get('/:id/queue', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(getQueueQuerySchema), controller.getQueue);
router.post('/:id/queue', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(addToQueueSchema), controller.addToQueue);
router.post('/:id/allocate-bed', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(allocateBedSchema), controller.allocateBed);
router.post('/:id/auto-allocate', authenticate, authorize([ROLES.HOSPITAL]), controller.autoAllocateBeds);
router.put('/:id/release-bed/:bookingId', authenticate, authorize([ROLES.HOSPITAL]), controller.releaseBed);
router.delete('/:id/queue/:bookingId', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(removeFromQueueSchema), controller.removeFromQueue);
router.get('/:id/available-beds', authenticate, authorize([ROLES.HOSPITAL]), validateRequest(getAvailableBedsQuerySchema), controller.getAvailableBeds);

module.exports = router;;