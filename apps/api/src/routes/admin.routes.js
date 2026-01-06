const { Router } = require('express');
const controller = require('../controllers/admin.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = Router();

// Verification Queue Routes
router.get('/pending-verifications', authenticate, authorize([ROLES.ADMIN]), controller.getPendingVerifications);
router.post('/verify/:entityType/:id', authenticate, authorize([ROLES.ADMIN]), controller.verifyEntity);
router.get('/verification-history/:userId', authenticate, authorize([ROLES.ADMIN]), controller.getVerificationHistory);

module.exports = router;;