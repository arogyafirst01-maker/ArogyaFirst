import { Router } from 'express';
import * as controller from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = Router();

// Verification Queue Routes
router.get('/pending-verifications', authenticate, authorize([ROLES.ADMIN]), controller.getPendingVerifications);
router.post('/verify/:entityType/:id', authenticate, authorize([ROLES.ADMIN]), controller.verifyEntity);
router.get('/verification-history/:userId', authenticate, authorize([ROLES.ADMIN]), controller.getVerificationHistory);

export default router;