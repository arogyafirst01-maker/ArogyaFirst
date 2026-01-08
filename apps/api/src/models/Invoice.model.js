import mongoose from 'mongoose';
import { generateInvoiceId, INVOICE_STATUS, INVOICE_ITEM_TYPE, TAX_TYPES, PAYMENT_STATUS, PAYMENT_METHODS } from '@arogyafirst/shared';

const invoiceItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: Object.values(INVOICE_ITEM_TYPE),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true
  }
}, { _id: false });

const taxDetailSchema = new mongoose.Schema({
  taxType: {
    type: String,
    enum: Object.values(TAX_TYPES),
    required: true
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    required: true
  }
}, { _id: false });

const providerSnapshotSchema = new mongoose.Schema({
  name: String,
  role: String,
  location: String,
  uniqueId: String
}, { _id: false });

const patientSnapshotSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    index: true,
    default: null // Will be set by pre-save hook
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    index: true
  },
  invoiceDate: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: Object.values(INVOICE_STATUS),
    default: INVOICE_STATUS.DRAFT,
    index: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxDetails: [taxDetailSchema],
  totalTax: {
    type: Number,
    required: true,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING,
    /**
     * Payment Status (mirrors Payment model status):
     * - PENDING: Awaiting payment
     * - SUCCESS: Payment confirmed
     * - FAILED: Payment attempt failed
     * - REFUNDED: Payment refunded (if cancelling paid invoice)
     * 
     * Updated by:
     * - generateInvoice: Sets to PENDING
     * - markInvoiceAsPaid: Sets to SUCCESS
     * - Payment webhook: May update based on payment events
     */
  },
  paymentId: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PAYMENT_METHODS)
  },
  providerSnapshot: providerSnapshotSchema,
  patientSnapshot: patientSnapshotSchema,
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes
invoiceSchema.index({ providerId: 1, invoiceDate: -1 });
invoiceSchema.index({ patientId: 1, status: 1 });
invoiceSchema.index({ bookingId: 1 });
invoiceSchema.index({ prescriptionId: 1 });

// Static Methods
invoiceSchema.statics.findByProvider = async function(providerId, filters = {}) {
  const query = { providerId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate || filters.endDate) {
    query.invoiceDate = {};
    if (filters.startDate) {
      query.invoiceDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.invoiceDate.$lte = new Date(filters.endDate);
    }
  }
  
  return this.find(query)
    .populate('patientId', 'name email phone')
    .sort({ invoiceDate: -1 })
    .limit(filters.limit || 50)
    .skip(filters.skip || 0)
    .lean();
};

invoiceSchema.statics.findByPatient = async function(patientId, filters = {}) {
  const query = { patientId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate || filters.endDate) {
    query.invoiceDate = {};
    if (filters.startDate) {
      query.invoiceDate.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.invoiceDate.$lte = new Date(filters.endDate);
    }
  }
  
  return this.find(query)
    .populate('providerId', 'name role location uniqueId')
    .sort({ invoiceDate: -1 })
    .limit(filters.limit || 50)
    .skip(filters.skip || 0)
    .lean();
};

// Instance Methods
invoiceSchema.methods.calculateTotals = function() {
  // Calculate item totals
  this.items.forEach(item => {
    item.totalPrice = item.quantity * item.unitPrice;
  });
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate tax amounts
  this.taxDetails.forEach(tax => {
    tax.taxAmount = (this.subtotal * tax.taxRate) / 100;
  });
  
  // Calculate total tax
  this.totalTax = this.taxDetails.reduce((sum, tax) => sum + tax.taxAmount, 0);
  
  // Calculate total amount
  this.totalAmount = this.subtotal + this.totalTax;
  
  return this;
};

invoiceSchema.methods.markAsPaid = async function(paymentId, method) {
  this.status = INVOICE_STATUS.PAID;
  this.paymentStatus = PAYMENT_STATUS.SUCCESS;
  this.paymentId = paymentId;
  this.paymentMethod = method;
  return this.save();
};

invoiceSchema.methods.cancel = async function(reason) {
  this.status = INVOICE_STATUS.CANCELLED;
  if (reason) {
    this.notes = this.notes ? `${this.notes}\n\nCancellation: ${reason}` : `Cancellation: ${reason}`;
  }
  return this.save();
};

// Pre-save Hook
invoiceSchema.pre('save', function(next) {
  // Generate invoice ID if not set - must be done BEFORE validation
  if (!this.invoiceId) {
    this.invoiceId = generateInvoiceId();
  }
  
  // Auto-calculate totals if items or taxDetails are modified
  if (this.isModified('items') || this.isModified('taxDetails')) {
    this.calculateTotals();
  }
  
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
