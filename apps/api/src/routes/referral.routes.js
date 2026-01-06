const express = require('express');
const { createReferral,
  getSourceReferrals,
  getTargetReferrals,
  getReferralById,
  acceptReferral,
  completeReferral,
  rejectReferral,
  cancelReferral } = require('../controllers/referral.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest,
  createReferralSchema,
  acceptReferralSchema,
  rejectReferralSchema,
  cancelReferralSchema } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

/**
 * POST /api/referrals/create
 * Create new referral
 * Access: HOSPITAL, DOCTOR, LAB
 */
router.post(
  '/create',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(createReferralSchema),
  createReferral
);

/**
 * GET /api/referrals/source/:sourceId
 * Get referrals created by source entity
 * Access: HOSPITAL, DOCTOR, LAB
 */
router.get(
  '/source/:sourceId',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  getSourceReferrals
);

/**
 * GET /api/referrals/target/:targetId
 * Get referrals received by target entity
 * Access: HOSPITAL, DOCTOR, LAB, PHARMACY
 */
router.get(
  '/target/:targetId',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]),
  getTargetReferrals
);

/**
 * GET /api/referrals/:id
 * Get single referral by ID
 * Access: All authenticated users (access validated in controller)
 */
router.get(
  '/:id',
  authenticate,
  getReferralById
);

/**
 * PUT /api/referrals/:id/accept
 * Accept referral
 * Access: HOSPITAL, DOCTOR, LAB, PHARMACY
 */
router.put(
  '/:id/accept',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]),
  validateRequest(acceptReferralSchema),
  acceptReferral
);

/**
 * PUT /api/referrals/:id/complete
 * Complete referral
 * Access: HOSPITAL, DOCTOR, LAB, PHARMACY
 */
router.put(
  '/:id/complete',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]),
  completeReferral
);

/**
 * PUT /api/referrals/:id/reject
 * Reject referral
 * Access: HOSPITAL, DOCTOR, LAB, PHARMACY
 */
router.put(
  '/:id/reject',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]),
  validateRequest(rejectReferralSchema),
  rejectReferral
);

/**
 * PUT /api/referrals/:id/cancel
 * Cancel referral
 * Access: HOSPITAL, DOCTOR, LAB
 */
router.put(
  '/:id/cancel',
  authenticate,
  authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]),
  validateRequest(cancelReferralSchema),
  cancelReferral
);

module.exports = router;
