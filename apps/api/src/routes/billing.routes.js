const express = require('express');
const { generateInvoice,
  getInvoicesByProvider,
  getInvoiceById,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  cancelInvoice } = require('../controllers/billing.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validate } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

/**
 * @route   POST /api/billing/invoices
 * @desc    Generate a new invoice (RESTful route)
 * @access  LAB, PHARMACY, ADMIN
 */
router.post(
  '/invoices',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('generateInvoice'),
  generateInvoice
);

/**
 * @route   POST /api/billing/generate-invoice
 * @desc    Generate a new invoice (compatibility alias)
 * @access  LAB, PHARMACY, ADMIN
 */
router.post(
  '/generate-invoice',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('generateInvoice'),
  generateInvoice
);

/**
 * @route   GET /api/billing/providers/:providerId/invoices
 * @desc    Get all invoices for a provider (RESTful route)
 * @access  LAB, PHARMACY, ADMIN
 */
router.get(
  '/providers/:providerId/invoices',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  getInvoicesByProvider
);

/**
 * @route   GET /api/billing/provider/:providerId
 * @desc    Get all invoices for a provider (compatibility alias)
 * @access  LAB, PHARMACY, ADMIN
 */
router.get(
  '/provider/:providerId',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  getInvoicesByProvider
);

/**
 * @route   GET /api/billing/invoices/:invoiceId
 * @desc    Get invoice by ID
 * @access  LAB, PHARMACY, PATIENT, ADMIN
 */
router.get(
  '/invoices/:invoiceId',
  authenticate,
  getInvoiceById
);

/**
 * @route   PATCH /api/billing/invoices/:invoiceId/status
 * @desc    Update invoice status
 * @access  LAB, PHARMACY, ADMIN
 */
router.patch(
  '/invoices/:invoiceId/status',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('updateInvoiceStatus'),
  updateInvoiceStatus
);

/**
 * @route   PATCH /api/billing/invoices/:invoiceId/mark-paid
 * @desc    Mark invoice as paid
 * @access  LAB, PHARMACY, ADMIN
 */
router.patch(
  '/invoices/:invoiceId/mark-paid',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('markInvoiceAsPaid'),
  markInvoiceAsPaid
);

/**
 * @route   PUT /api/billing/invoices/:invoiceId/mark-paid
 * @desc    Mark invoice as paid (compatibility alias for PUT method)
 * @access  LAB, PHARMACY, ADMIN
 */
router.put(
  '/invoices/:invoiceId/mark-paid',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('markInvoiceAsPaid'),
  markInvoiceAsPaid
);

/**
 * @route   PATCH /api/billing/invoices/:invoiceId/cancel
 * @desc    Cancel invoice
 * @access  LAB, PHARMACY, ADMIN
 */
router.patch(
  '/invoices/:invoiceId/cancel',
  authenticate,
  authorize([ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]),
  validate('cancelInvoice'),
  cancelInvoice
);

module.exports = router;
