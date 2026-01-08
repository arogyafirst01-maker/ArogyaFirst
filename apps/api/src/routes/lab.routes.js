import { Router } from 'express';
import * as controller from '../controllers/lab.controller.js';
import { register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, bulkUploadReportsSchema, addQCRecordSchema, updateQCRecordSchema } from '../middleware/validation.middleware.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = Router();

// Public lab registration alias (injects role=LAB)
router.post('/register',
	(req, _res, next) => { req.body.role = ROLES.LAB; next(); },
	register
);
// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.LAB]), controller.getProfile);
router.put('/profile', authenticate, authorize([ROLES.LAB]), controller.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.LAB]), controller.getSettings);
router.put('/settings', authenticate, authorize([ROLES.LAB]), controller.updateSettings);

// Machine Management Routes
router.get('/machines', authenticate, authorize([ROLES.LAB]), controller.getMachines);
router.post('/machines', authenticate, authorize([ROLES.LAB]), controller.addMachine);
router.put('/machines/:id', authenticate, authorize([ROLES.LAB]), controller.updateMachine);
router.delete('/machines/:id', authenticate, authorize([ROLES.LAB]), controller.deleteMachine);

// QC (Quality Control) Management Routes
router.post('/machines/:machineId/qc', authenticate, authorize([ROLES.LAB]), validateRequest(addQCRecordSchema), controller.addQCRecord);
router.get('/machines/:machineId/qc', authenticate, authorize([ROLES.LAB]), controller.getQCRecords);
router.get('/machines/:machineId/qc/trends', authenticate, authorize([ROLES.LAB]), controller.getQCTrends);
router.put('/machines/:machineId/qc/:qcId', authenticate, authorize([ROLES.LAB]), validateRequest(updateQCRecordSchema), controller.updateQCRecord);
router.delete('/machines/:machineId/qc/:qcId', authenticate, authorize([ROLES.LAB]), controller.deleteQCRecord);

// Facility Management Routes
router.get('/facilities', authenticate, authorize([ROLES.LAB]), controller.getFacilities);
router.post('/facilities', authenticate, authorize([ROLES.LAB]), controller.addFacility);
router.delete('/facilities/:index', authenticate, authorize([ROLES.LAB]), controller.deleteFacility);

// Bulk Report Upload Route
router.post('/bulk-upload-reports', authenticate, authorize([ROLES.LAB]), uploadSingle('csvFile'), handleUploadError, validateRequest(bulkUploadReportsSchema), controller.bulkUploadReports);

// Dashboard Route
router.get('/:id/dashboard', authenticate, authorize([ROLES.LAB, ROLES.ADMIN]), controller.getDashboard);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.LAB, ROLES.ADMIN]), controller.exportReport);

export default router;