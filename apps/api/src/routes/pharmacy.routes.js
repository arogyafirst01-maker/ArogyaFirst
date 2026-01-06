const { Router } = require('express');
const controller = require('../controllers/pharmacy.controller.js');
const { register } = require('../controllers/auth.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, createPharmacyLinkSchema, bulkUploadMedicinesSchema, addSupplierSchema, updateSupplierSchema, createPurchaseOrderSchema, updatePurchaseOrderSchema, approvePurchaseOrderSchema, receivePurchaseOrderSchema, stockAdjustmentSchema, physicalVerificationSchema } = require('../middleware/validation.middleware.js');
const { uploadSingle, handleUploadError } = require('../middleware/upload.middleware.js');
const { ROLES } = require('@arogyafirst/shared');
const { createPharmacyLink, getPharmacyLinks, deletePharmacyLink, getPendingRequests, acceptRequest, rejectRequest } = require('../controllers/pharmacyLink.controller.js');

const router = Router();

// Public pharmacy registration alias (injects role=PHARMACY)
router.post('/register',
	(req, _res, next) => { req.body.role = ROLES.PHARMACY; next(); },
	register
);

// Get all pharmacies (for doctor linking)
router.get('/all', authenticate, authorize([ROLES.DOCTOR, ROLES.ADMIN]), controller.getAllPharmacies);

// Profile Routes
router.get('/profile', authenticate, authorize([ROLES.PHARMACY]), controller.getProfile);
router.put('/profile', authenticate, authorize([ROLES.PHARMACY]), controller.updateProfile);

// Settings Routes
router.get('/settings', authenticate, authorize([ROLES.PHARMACY]), controller.getSettings);
router.put('/settings', authenticate, authorize([ROLES.PHARMACY]), controller.updateSettings);

// Medicine Inventory Routes
router.get('/medicines', authenticate, authorize([ROLES.PHARMACY]), controller.getMedicines);
router.post('/medicines', authenticate, authorize([ROLES.PHARMACY]), controller.addMedicine);
router.put('/medicines/:id', authenticate, authorize([ROLES.PHARMACY]), controller.updateMedicine);
router.delete('/medicines/:id', authenticate, authorize([ROLES.PHARMACY]), controller.deleteMedicine);
router.post('/bulk-upload-medicines', authenticate, authorize([ROLES.PHARMACY]), uploadSingle('csvFile'), handleUploadError, validateRequest(bulkUploadMedicinesSchema), controller.bulkUploadMedicines);
router.get('/medicines/low-stock', authenticate, authorize([ROLES.PHARMACY]), controller.getLowStockMedicines);
router.get('/medicines/expiring', authenticate, authorize([ROLES.PHARMACY]), controller.getExpiringMedicines);
router.post('/medicines/adjust-stock', authenticate, authorize([ROLES.PHARMACY]), validateRequest(stockAdjustmentSchema), controller.adjustStock);
router.post('/medicines/physical-verification', authenticate, authorize([ROLES.PHARMACY]), validateRequest(physicalVerificationSchema), controller.physicalVerification);

// Dashboard Route
router.get('/:id/dashboard', authenticate, authorize([ROLES.PHARMACY, ROLES.ADMIN]), controller.getDashboard);

// Export Routes
router.get('/:id/export', authenticate, authorize([ROLES.PHARMACY, ROLES.ADMIN]), controller.exportReport);

// Pharmacy Link Routes
router.post('/link', authenticate, authorize([ROLES.DOCTOR]), validateRequest(createPharmacyLinkSchema), createPharmacyLink);
router.get('/links', authenticate, authorize([ROLES.DOCTOR, ROLES.PHARMACY]), getPharmacyLinks);
router.get('/links/pending', authenticate, authorize([ROLES.PHARMACY]), getPendingRequests);
router.put('/links/:linkId/accept', authenticate, authorize([ROLES.PHARMACY]), acceptRequest);
router.put('/links/:linkId/reject', authenticate, authorize([ROLES.PHARMACY]), rejectRequest);
router.delete('/links/:linkId', authenticate, authorize([ROLES.DOCTOR, ROLES.PHARMACY]), deletePharmacyLink);

// Supplier Management Routes
router.get('/suppliers', authenticate, authorize([ROLES.PHARMACY]), controller.getSuppliers);
router.post('/suppliers', authenticate, authorize([ROLES.PHARMACY]), validateRequest(addSupplierSchema), controller.addSupplier);
router.put('/suppliers/:id', authenticate, authorize([ROLES.PHARMACY]), validateRequest(updateSupplierSchema), controller.updateSupplier);
router.delete('/suppliers/:id', authenticate, authorize([ROLES.PHARMACY]), controller.deleteSupplier);

// Purchase Order Management Routes
router.get('/purchase-orders', authenticate, authorize([ROLES.PHARMACY]), controller.getPurchaseOrders);
router.post('/purchase-orders', authenticate, authorize([ROLES.PHARMACY]), validateRequest(createPurchaseOrderSchema), controller.createPurchaseOrder);
router.put('/purchase-orders/:id', authenticate, authorize([ROLES.PHARMACY]), validateRequest(updatePurchaseOrderSchema), controller.updatePurchaseOrder);
router.delete('/purchase-orders/:id', authenticate, authorize([ROLES.PHARMACY]), controller.deletePurchaseOrder);
router.put('/purchase-orders/:id/approve', authenticate, authorize([ROLES.PHARMACY]), validateRequest(approvePurchaseOrderSchema), controller.approvePurchaseOrder);
router.put('/purchase-orders/:id/receive', authenticate, authorize([ROLES.PHARMACY]), validateRequest(receivePurchaseOrderSchema), controller.receivePurchaseOrder);
router.put('/purchase-orders/:id/cancel', authenticate, authorize([ROLES.PHARMACY]), controller.cancelPurchaseOrder);

module.exports = router;;