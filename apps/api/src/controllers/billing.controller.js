const Invoice = require('../models/Invoice.model.js');
const Booking = require('../models/Booking.model.js');
const Prescription = require('../models/Prescription.model.js');
const User = require('../models/User.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { ROLES, INVOICE_STATUS, PAYMENT_STATUS } = require('@arogyafirst/shared');

/**
 * Generate Invoice
 * 
 * Creates a new invoice for a lab booking or pharmacy prescription.
 * 
 * @route POST /api/billing/invoices (RESTful)
 * @route POST /api/billing/generate-invoice (compatibility alias)
 * @access Private (LAB, PHARMACY, ADMIN)
 */
const generateInvoice = async (req, res) => {
  try {
    const { providerId, items, taxDetails, bookingId, prescriptionId, patientId, dueDate, notes } = req.body;
    const userId = req.user._id;
    
    // Verify authenticated user is the provider or admin
    if (providerId !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only generate invoices for yourself', 403);
    }
    
    // Fetch provider details
    const provider = await User.findById(providerId).select('role uniqueId pharmacyData labData').lean();
    if (!provider) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    // Extract name and location based on role
    let providerName = '';
    let providerLocation = '';
    
    if (provider.role === ROLES.PHARMACY && provider.pharmacyData) {
      providerName = provider.pharmacyData.name || 'Unknown Pharmacy';
      providerLocation = provider.pharmacyData.location || '';
    } else if (provider.role === ROLES.LAB && provider.labData) {
      providerName = provider.labData.name || 'Unknown Lab';
      providerLocation = provider.labData.location || '';
    }
    
    // Validate and fetch related documents
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return errorResponse(res, 'Booking not found', 404);
      }
      if (booking.providerId.toString() !== providerId) {
        return errorResponse(res, 'Booking does not belong to this provider', 400);
      }
      if (booking.entityType !== 'LAB') {
        return errorResponse(res, 'Only LAB bookings can have invoices', 400);
      }
    }
    
    if (prescriptionId) {
      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription) {
        return errorResponse(res, 'Prescription not found', 404);
      }
      if (prescription.pharmacyId?.toString() !== providerId) {
        return errorResponse(res, 'Prescription does not belong to this pharmacy', 400);
      }
    }
    
    // Create provider snapshot
    const providerSnapshot = {
      name: providerName,
      role: provider.role,
      location: providerLocation,
      uniqueId: provider.uniqueId
    };
    
    // Create patient snapshot if patientId provided
    let patientSnapshot = null;
    if (patientId) {
      const patient = await User.findById(patientId).select('patientData email').lean();
      if (patient) {
        patientSnapshot = {
          name: patient.patientData?.name || patient.email,
          phone: patient.patientData?.phone || '',
          email: patient.email
        };
      }
    }
    
    // Create invoice
    const invoice = new Invoice({
      providerId,
      patientId,
      bookingId,
      prescriptionId,
      items,
      taxDetails: taxDetails || [],
      dueDate,
      notes,
      providerSnapshot,
      patientSnapshot,
      createdBy: userId,
      status: INVOICE_STATUS.ISSUED,
      paymentStatus: PAYMENT_STATUS.PENDING // Explicitly set initial payment status
    });
    
    // Totals are auto-calculated by pre-save hook
    await invoice.save();
    
    return successResponse(res, { invoice }, 'Invoice generated successfully', 201);
  } catch (error) {
    console.error('Generate invoice error:', error);
    return errorResponse(res, error.message || 'Failed to generate invoice', 500);
  }
};

/**
 * Get Invoices by Provider
 * 
 * Retrieves all invoices for a specific provider with optional filters.
 * 
 * @route GET /api/billing/providers/:providerId/invoices (RESTful)
 * @route GET /api/billing/provider/:providerId (compatibility alias)
 * @access Private (LAB, PHARMACY, ADMIN)
 */
const getInvoicesByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const userId = req.user._id;
    
    // Verify authorization
    if (providerId !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only access your own invoices', 403);
    }
    
    const { status, startDate, endDate, limit = 50, skip = 0 } = req.query;
    
    const filters = {
      status,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip: parseInt(skip)
    };
    
    const invoices = await Invoice.findByProvider(providerId, filters);
    const total = await Invoice.countDocuments({
      providerId,
      ...(status && { status }),
      ...(startDate || endDate) && {
        invoiceDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) })
        }
      }
    });
    
    return successResponse(res, {
      invoices,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    }, 'Invoices retrieved successfully');
  } catch (error) {
    console.error('Get invoices by provider error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve invoices', 500);
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user._id;
    
    const invoice = await Invoice.findOne({ invoiceId })
      .populate('providerId', 'name role location uniqueId')
      .populate('patientId', 'name email phone')
      .lean();
    
    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }
    
    // Verify user has access (provider, patient, or admin)
    const isProvider = invoice.providerId._id.toString() === userId.toString();
    const isPatient = invoice.patientId?._id.toString() === userId.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    
    if (!isProvider && !isPatient && !isAdmin) {
      return errorResponse(res, 'Forbidden: You do not have access to this invoice', 403);
    }
    
    return successResponse(res, { invoice }, 'Invoice retrieved successfully');
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve invoice', 500);
  }
};

// Update invoice status
const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;
    
    const invoice = await Invoice.findOne({ invoiceId });
    
    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }
    
    // Verify ownership
    if (invoice.providerId.toString() !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only update your own invoices', 403);
    }
    
    // Prevent status changes from terminal states
    if (invoice.status === INVOICE_STATUS.PAID || invoice.status === INVOICE_STATUS.CANCELLED) {
      return errorResponse(res, `Cannot change status from ${invoice.status}`, 400);
    }
    
    // Prevent direct status changes to PAID - must use markInvoiceAsPaid endpoint
    if (status === INVOICE_STATUS.PAID) {
      return errorResponse(res, 'Cannot set status to PAID directly. Use the mark-paid endpoint instead.', 400);
    }
    
    invoice.status = status;
    invoice.updatedBy = userId;
    await invoice.save();
    
    return successResponse(res, { invoice }, 'Invoice status updated successfully');
  } catch (error) {
    console.error('Update invoice status error:', error);
    return errorResponse(res, error.message || 'Failed to update invoice status', 500);
  }
};

// Mark invoice as paid
const markInvoiceAsPaid = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentId, paymentMethod } = req.body;
    const userId = req.user._id;
    
    const invoice = await Invoice.findOne({ invoiceId });
    
    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }
    
    // Verify ownership
    if (invoice.providerId.toString() !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only mark your own invoices as paid', 403);
    }
    
    await invoice.markAsPaid(paymentId, paymentMethod);
    
    // If linked to prescription, fulfill it using the model's instance method
    // This centralizes fulfillment logic with the prescription controller
    if (invoice.prescriptionId) {
      const Prescription = (await import('../models/Prescription.model.js')).default;
      const prescription = await Prescription.findById(invoice.prescriptionId);
      if (prescription && prescription.status === 'PENDING') {
        prescription.fulfill(); // Use model's instance method for consistent logic
        await prescription.save();
      }
    }
    
    return successResponse(res, { invoice }, 'Invoice marked as paid successfully');
  } catch (error) {
    console.error('Mark invoice as paid error:', error);
    return errorResponse(res, error.message || 'Failed to mark invoice as paid', 500);
  }
};

// Cancel invoice
const cancelInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    
    const invoice = await Invoice.findOne({ invoiceId });
    
    if (!invoice) {
      return errorResponse(res, 'Invoice not found', 404);
    }
    
    // Verify ownership
    if (invoice.providerId.toString() !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only cancel your own invoices', 403);
    }
    
    // Cannot cancel paid invoices
    if (invoice.status === INVOICE_STATUS.PAID) {
      return errorResponse(res, 'Cannot cancel a paid invoice', 400);
    }
    
    await invoice.cancel(reason);
    
    return successResponse(res, { invoice }, 'Invoice cancelled successfully');
  } catch (error) {
    console.error('Cancel invoice error:', error);
    return errorResponse(res, error.message || 'Failed to cancel invoice', 500);
  }
};

module.exports = {
  generateInvoice,
  getInvoicesByProvider,
  getInvoiceById,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  cancelInvoice
};
