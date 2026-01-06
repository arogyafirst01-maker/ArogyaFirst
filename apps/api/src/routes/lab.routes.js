const { Router } = require('express');
const labController = require('../controllers/lab.controller.js');
const { register } = require('../controllers/auth.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, bulkUploadReportsSchema, addQCRecordSchema, updateQCRecordSchema } = require('../middleware/validation.middleware.js');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = Router();

// Public lab registration alias (injects role=LAB)
router.post('/register',
	(req, _res, next) => { req.body.role = ROLES.LAB; next(); },
	register
);
// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.LAB]), labController.getProfile);
router.put('/profile', authenticate, authorize([ROLES.LAB]), labController.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.LAB]), labController.getSettings);
router.put('/settings', authenticate, authorize([ROLES.LAB]), labController.updateSettings);

// Machine Management Routes
router.get('/machines', authenticate, authorize([ROLES.LAB]), labController.getMachines);
router.post('/machines', authenticate, authorize([ROLES.LAB]), labController.addMachine);
router.put('/machines/:id', authenticate, authorize([ROLES.LAB]), labController.updateMachine);
router.delete('/machines/:id', authenticate, authorize([ROLES.LAB]), labController.deleteMachine);

// QC (Quality Control) Management Routes
router.post('/machines/:machineId/qc', authenticate, authorize([ROLES.LAB]), validateRequest(addQCRecordSchema), labController.addQCRecord);
router.get('/machines/:machineId/qc', authenticate, authorize([ROLES.LAB]), labController.getQCRecords);
router.get('/machines/:machineId/qc/trends', authenticate, authorize([ROLES.LAB]), labController.getQCTrends);
router.put('/machines/:machineId/qc/:qcId', authenticate, authorize([ROLES.LAB]), validateRequest(updateQCRecordSchema), labController.updateQCRecord);
router.delete('/machines/:machineId/qc/:qcId', authenticate, authorize([ROLES.LAB]), labController.deleteQCRecord);

// Facility Management Routes
router.get('/facilities', authenticate, authorize([ROLES.LAB]), labController.getFacilities);
router.post('/facilities', authenticate, authorize([ROLES.LAB]), labController.addFacility);
router.delete('/facilities/:index', authenticate, authorize([ROLES.LAB]), labController.deleteFacility);

// Bulk Report Upload Route
router.post('/bulk-upload-reports', authenticate, authorize([ROLES.LAB]), uploadSingle('csvFile'), handleUploadError, validateRequest(bulkUploadReportsSchema), labController.bulkUploadReports);

// Dashboard Route
router.get('/:id/dashboard', authenticate, authorize([ROLES.LAB, ROLES.ADMIN]), labController.getDashboard);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.LAB, ROLES.ADMIN]), labController.exportReport);

module.exports = router;