// Manual booking schema for provider walk-in bookings
import mongoose from 'mongoose';
import { validateEmail, validatePassword, validatePhone, validateAadhaarLast4, validateDateFormat, PAYMENT_METHODS, validateDocumentType, validateConsentStatus, DOCUMENT_TYPES, CONSENT_STATUS, SHIFT_TYPES, SCHEDULE_STATUS, HEALTH_ARTICLE_CATEGORIES, MEDICAL_HISTORY_TYPES, INVOICE_STATUS, INVOICE_ITEM_TYPE, TAX_TYPES, PO_STATUS, CONTACT_SUBJECTS, TEMPLATE_CATEGORIES, BED_TYPES } from '@arogyafirst/shared';
import { validationErrorResponse } from '../utils/response.util.js';

/**
 * Higher-order function that returns middleware for validating request body, params, and query.
 * @param {Object} schema - Validation schema. Can be:
 *   - Legacy format: { fieldName: { required, type, validate, message } } (validates body only)
 *   - Structured format: { bodySchema, paramsSchema, querySchema } (validates respective parts)
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Detect structured schema format
    const hasStructuredSchema = schema && (schema.bodySchema || schema.paramsSchema || schema.querySchema);
    const schemasToValidate = hasStructuredSchema
      ? [
          { schema: schema.bodySchema, source: req.body, sourceName: 'body' },
          { schema: schema.paramsSchema, source: req.params, sourceName: 'params' },
          { schema: schema.querySchema, source: req.query, sourceName: 'query' },
        ]
      : [{ schema, source: req.body, sourceName: 'body' }]; // Legacy format

    for (const { schema: currentSchema, source: rawSource, sourceName } of schemasToValidate) {
      const source = rawSource || {}; // Default to empty object if undefined
      if (!currentSchema) continue;

      // Preprocess: Convert numeric strings in arrays (common in form submissions)
      if (currentSchema.items && Array.isArray(source.items)) {
        source.items = source.items.map(item => {
          if (typeof item === 'object' && item !== null) {
            const processedItem = { ...item };
            // Convert string numbers to actual numbers for known numeric fields
            if (typeof processedItem.quantity === 'string' && processedItem.quantity.trim() !== '') {
              const parsed = parseInt(processedItem.quantity, 10);
              if (!isNaN(parsed)) processedItem.quantity = parsed;
            }
            if (typeof processedItem.unitPrice === 'string' && processedItem.unitPrice.trim() !== '') {
              const parsed = parseFloat(processedItem.unitPrice);
              if (!isNaN(parsed)) processedItem.unitPrice = parsed;
            }
            if (typeof processedItem.quantityReceived === 'string' && processedItem.quantityReceived.trim() !== '') {
              const parsed = parseInt(processedItem.quantityReceived, 10);
              if (!isNaN(parsed)) processedItem.quantityReceived = parsed;
            }
            if (typeof processedItem.itemIndex === 'string' && processedItem.itemIndex.trim() !== '') {
              const parsed = parseInt(processedItem.itemIndex, 10);
              if (!isNaN(parsed)) processedItem.itemIndex = parsed;
            }
            return processedItem;
          }
          return item;
        });
      }

      // Preprocess: Convert numeric strings in medicines arrays (prescription)
      if (currentSchema.medicines && Array.isArray(source.medicines)) {
        source.medicines = source.medicines.map(medicine => {
          if (typeof medicine === 'object' && medicine !== null) {
            const processedMedicine = { ...medicine };
            if (typeof processedMedicine.quantity === 'string' && processedMedicine.quantity.trim() !== '') {
              const parsed = parseInt(processedMedicine.quantity, 10);
              if (!isNaN(parsed)) processedMedicine.quantity = parsed;
            }
            return processedMedicine;
          }
          return medicine;
        });
      }

      // Support schema-level custom validator
      if (currentSchema.__custom && typeof currentSchema.__custom.validate === 'function') {
        try {
          const ok = currentSchema.__custom.validate(source);
          if (!ok) {
            return validationErrorResponse(res, [{ field: `__${sourceName}`, message: currentSchema.__custom.message || `Invalid ${sourceName}` }]);
          }
        } catch (err) {
          return validationErrorResponse(res, [{ field: `__${sourceName}`, message: err.message || currentSchema.__custom.message || `Invalid ${sourceName}` }]);
        }
      }

      // Safely iterate through schema fields
      let schemaEntries = [];
      try {
        schemaEntries = Object.entries(currentSchema || {});
      } catch (err) {
        console.error(`Failed to get entries from schema for ${sourceName}:`, err.message);
        continue;
      }

      for (const [fieldName, fieldConfig] of schemaEntries) {
        try {
          if (fieldName === '__custom' || fieldName === '__customValidation') continue; // Skip custom validator entries
          if (!fieldConfig || typeof fieldConfig !== 'object') {
            console.warn(`Skipping invalid field config for ${fieldName} in ${sourceName}: not an object`);
            continue;
          }
          let value = source[fieldName];

          // Check if required and missing
          if (fieldConfig.required && (value === undefined || value === null || value === '')) {
            errors.push({ field: fieldName, message: `${fieldName} is required` });
            continue;
          }

          // If not required and not present, skip further validation
          if (!fieldConfig.required && (value === undefined || value === null || value === '')) {
            continue;
          }

          // Try to coerce numeric types from strings (common in form submissions)
          if (value !== null && value !== undefined) {
            if (fieldConfig.validate && fieldConfig.validate.toString().includes('Number.isInteger')) {
              // This field needs an integer - try to convert from string
              if (typeof value === 'string' && value.trim() !== '') {
                const parsed = parseInt(value, 10);
                if (!isNaN(parsed)) {
                  value = parsed;
                  source[fieldName] = parsed; // Update source for controller to use
                }
              }
            }
          }

          // Check type (handle special case for arrays)
          if (fieldConfig.type) {
            let typeCheck = false;
            if (fieldConfig.type === 'array') {
              typeCheck = Array.isArray(value);
            } else {
              typeCheck = typeof value === fieldConfig.type;
            }
            
            if (!typeCheck) {
              errors.push({ field: fieldName, message: `${fieldName} must be of type ${fieldConfig.type}` });
              continue;
            }
          }

          // Run custom validation with robust error handling and detailed messages
          if (fieldConfig.validate && typeof fieldConfig.validate === 'function') {
            try {
              const valid = fieldConfig.validate(value);
              if (!valid) {
                errors.push({ 
                  field: fieldName,
                  value: value,
                  message: fieldConfig.message || `${fieldName} is invalid`,
                  code: 'VALIDATION_FAILED'
                });
              }
            } catch (err) {
              console.error(`Validation function error for field '${fieldName}' with value:`, value, 'Error:', err.message);
              errors.push({ 
                field: fieldName,
                value: value,
                message: err.message || fieldConfig.message || `${fieldName} is invalid`,
                code: 'VALIDATION_ERROR',
                error: err.name || 'ValidationError'
              });
            }
          }
        } catch (loopErr) {
          console.error(`Validation middleware error processing field ${fieldName}:`, loopErr.message);
          errors.push({
            field: fieldName || 'unknown',
            message: `Error validating field: ${loopErr.message}`
          });
        }
      }

      // Run custom cross-field validation if defined
      if (currentSchema.__customValidation && typeof currentSchema.__customValidation === 'function') {
        const customError = currentSchema.__customValidation(source);
        if (customError) {
          errors.push({ field: customError.field, message: customError.message });
        }
      }
    }

    if (errors.length > 0) {
      console.error('Validation errors for request to', req.path, ':', JSON.stringify(errors, null, 2));
      return validationErrorResponse(res, errors);
    }

    next();
  };
};

// Pre-built validation schemas
const registerPatientSchema = {
  name: { required: true, type: 'string', message: 'Name must be a valid string' },
  phone: { required: true, type: 'string', validate: validatePhone, message: 'Phone must be a valid 10-digit number' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Email must be a valid email address' },
  password: { required: true, type: 'string', validate: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  location: { required: false, type: 'string', message: 'Location must be a valid string' },
  dateOfBirth: { required: true, type: 'string', validate: validateDateFormat, message: 'Date of birth must be in YYYY-MM-DD format' },
  aadhaarLast4: { required: false, type: 'string', validate: validateAadhaarLast4, message: 'Aadhaar last 4 digits must be 4 digits' },
  termsAccepted: { required: true, validate: (value) => value === true || value === 'true', message: 'You must accept the terms and conditions to register' }
};

const registerHospitalSchema = {
  name: { required: true, type: 'string', message: 'Name must be a valid string' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Email must be a valid email address' },
  password: { required: true, type: 'string', validate: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  location: { required: true, type: 'string', message: 'Location must be a valid string' },
  termsAccepted: { required: true, validate: (value) => value === true || value === 'true', message: 'You must accept the terms and conditions to register' }
};

const registerDoctorSchema = {
  name: { required: true, type: 'string', message: 'Name must be a valid string' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Email must be a valid email address' },
  password: { required: true, type: 'string', validate: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  qualification: { required: true, type: 'string', message: 'Qualification must be a valid string' },
  experience: { 
    required: true, 
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0;
    },
    message: 'Experience must be a non-negative number'
  },
  location: { required: true, type: 'string', message: 'Location must be a valid string' },
  dateOfBirth: { required: true, type: 'string', validate: validateDateFormat, message: 'Date of birth must be in YYYY-MM-DD format' },
  aadhaarLast4: { required: false, type: 'string', validate: validateAadhaarLast4, message: 'Aadhaar last 4 digits must be 4 digits' },
  specialization: { required: true, type: 'string', message: 'Specialization must be a valid string' },
  termsAccepted: { required: true, validate: (value) => value === true || value === 'true', message: 'You must accept the terms and conditions to register' }
};

const registerLabSchema = {
  name: { required: true, type: 'string', message: 'Name must be a valid string' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Email must be a valid email address' },
  password: { required: true, type: 'string', validate: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  location: { required: true, type: 'string', message: 'Location must be a valid string' },
  termsAccepted: { required: true, validate: (value) => value === true || value === 'true', message: 'You must accept the terms and conditions to register' }
};

const registerPharmacySchema = {
  name: { required: true, type: 'string', message: 'Name must be a valid string' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Email must be a valid email address' },
  password: { required: true, type: 'string', validate: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
  location: { required: true, type: 'string', message: 'Location must be a valid string' },
  licenseNumber: { required: true, type: 'string', message: 'License number must be a valid string' },
  termsAccepted: { required: true, validate: (value) => value === true || value === 'true', message: 'You must accept the terms and conditions to register' }
};

const loginSchema = {
  identifier: { 
    required: false, 
    type: 'string', 
    validate: (value) => !value || validateEmail(value) || validatePhone(value),
    message: 'Identifier must be a valid email or 10-digit phone number' 
  },
  email: {
    required: false,
    type: 'string',
    validate: (value) => !value || validateEmail(value),
    message: 'Email must be a valid email address'
  },
  password: { 
    required: true, 
    type: 'string', 
    validate: (value) => value && value.length >= 8,
    message: 'Password must be at least 8 characters' 
  },
  // Custom validator to ensure at least identifier or email is provided
  __customValidation: (body) => {
    if (!body.identifier && !body.email) {
      return { field: 'identifier', message: 'Either identifier or email is required' };
    }
    return null;
  }
};

// Email OTP validation schemas
const sendEmailOTPSchema = {
  email: { 
    required: true, 
    type: 'string', 
    validate: validateEmail, 
    message: 'Valid email address is required' 
  }
};

const verifyEmailOTPSchema = {
  email: { 
    required: true, 
    type: 'string', 
    validate: validateEmail, 
    message: 'Valid email address is required' 
  },
  otp: { 
    required: true, 
    type: 'string', 
    validate: (value) => /^\d{6}$/.test(value),
    message: 'OTP must be exactly 6 digits' 
  }
};

// Phone OTP password reset validation schemas
const forgotPasswordSchema = {
  phone: {
    required: true,
    type: 'string',
    validate: validatePhone,
    message: 'Valid 10-digit phone number is required'
  }
};

const verifyPhoneOTPSchema = {
  phone: {
    required: true,
    type: 'string',
    validate: validatePhone,
    message: 'Valid 10-digit phone number is required'
  },
  otp: {
    required: true,
    type: 'string',
    validate: (value) => /^\d{6}$/.test(value),
    message: 'OTP must be exactly 6 digits'
  }
};

const resetPasswordSchema = {
  phone: {
    required: true,
    type: 'string',
    validate: validatePhone,
    message: 'Valid 10-digit phone number is required'
  },
  newPassword: {
    required: true,
    type: 'string',
    validate: validatePassword,
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  }
};

// Helper for validating timeSlots array
function validateTimeSlots(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  function toMins(t) {
    if (typeof t !== 'string') return NaN;
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
    if (!m) return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  const slots = value.map((s) => {
    if (!s || typeof s !== 'object') throw new Error('Each timeSlot must be an object');
    const { startTime, endTime, capacity } = s;
    const st = toMins(startTime);
    const et = toMins(endTime);
    if (isNaN(st) || isNaN(et)) throw new Error('startTime and endTime must be in HH:MM format');
    if (!(Number.isInteger(capacity) && capacity >= 1)) throw new Error('capacity must be a positive integer');
    if (et <= st) throw new Error('endTime must be greater than startTime');
    return { st, et };
  });
  slots.sort((a, b) => a.st - b.st);
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].st < slots[i - 1].et) return false; // overlap
  }
  return true;
}

const createSlotSchema = {
  entityType: { required: true, type: 'string', validate: (value) => ['OPD', 'IPD', 'LAB'].includes(value), message: 'Invalid entity type' },
  date: { required: true, validate: (value) => {
      const d = new Date(value);
      if (isNaN(d.getTime())) return false;
      d.setUTCHours(0,0,0,0);
      const today = new Date();
      today.setUTCHours(0,0,0,0);
      return d.getTime() >= today.getTime();
    }, message: 'Date must be a valid future date' },
  startTime: { required: false, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'Start time must be in HH:MM format (24-hour)' },
  endTime: { required: false, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'End time must be in HH:MM format (24-hour)' },
  capacity: { required: false, type: 'number', validate: (value) => Number.isInteger(value) && value >= 1, message: 'Capacity must be a positive integer' },
  // new: accept an array of timeSlots instead of single range
  timeSlots: { required: false, validate: (value) => validateTimeSlots(value), message: 'timeSlots must be an array of {startTime,endTime,capacity} with non-overlapping ranges' },
  advanceBookingDays: { required: false, type: 'number', validate: (value) => Number.isInteger(value) && value >= 0, message: 'Advance booking days must be non-negative' },
  metadata: { required: false, type: 'object' },
  // require either legacy single-range fields or timeSlots array
  __custom: { required: false, validate: (body) => {
      const hasLegacy = body.startTime && body.endTime && (body.capacity !== undefined);
      const hasTimeSlots = Array.isArray(body.timeSlots) && body.timeSlots.length > 0;
      return hasLegacy || hasTimeSlots;
    }, message: 'Either startTime/endTime/capacity or timeSlots array must be provided' }
};

const updateSlotSchema = {
  entityType: { required: false, type: 'string', validate: (value) => ['OPD', 'IPD', 'LAB'].includes(value), message: 'Invalid entity type' },
  date: { required: false, validate: (value) => {
      const d = new Date(value);
      if (isNaN(d.getTime())) return false;
      d.setUTCHours(0,0,0,0);
      const today = new Date();
      today.setUTCHours(0,0,0,0);
      return d.getTime() >= today.getTime();
    }, message: 'Date must be a valid future date' },
  startTime: { required: false, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'Start time must be in HH:MM format (24-hour)' },
  endTime: { required: false, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'End time must be in HH:MM format (24-hour)' },
  capacity: { required: false, type: 'number', validate: (value) => Number.isInteger(value) && value >= 1, message: 'Capacity must be a positive integer' },
  advanceBookingDays: { required: false, type: 'number', validate: (value) => Number.isInteger(value) && value >= 0, message: 'Advance booking days must be non-negative' },
  metadata: { required: false, type: 'object' },
  isActive: { required: false, type: 'boolean' }
};

const createBookingSchema = {
  bodySchema: {
    slotId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid slot ID is required' },
    timeSlot: { required: false, type: 'object', validate: (value) => {
      if (!value) return true; // optional
      if (!value.startTime || !value.endTime) return false;
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.startTime) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.endTime);
    }, message: 'timeSlot must have valid startTime and endTime in HH:MM format' },
    metadata: { required: false, type: 'object' },
    paymentAmount: { required: false, type: 'number', validate: (value) => value >= 0, message: 'Payment amount must be non-negative' },
    paymentMethod: { required: false, type: 'string', validate: (v) => !v || Object.values(PAYMENT_METHODS).includes(v), message: 'Invalid payment method' }
  }
};

const cancelBookingSchema = {
  bodySchema: {
    cancellationReason: { required: false, type: 'string', validate: (value) => !value || value.trim().length > 0, message: 'Cancellation reason must be a non-empty string if provided' }
  }
};

const rescheduleBookingSchema = {
  bodySchema: {
    newSlotId: { 
      required: true, 
      type: 'string', 
      validate: (value) => mongoose.Types.ObjectId.isValid(value), 
      message: 'Valid new slot ID is required' 
    },
    newTimeSlot: { 
      required: false, 
      type: 'object', 
      validate: (value) => {
        if (!value) return true; // optional for single-range slots
        if (!value.startTime || !value.endTime) return false;
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.startTime) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.endTime);
      }, 
      message: 'newTimeSlot must have valid startTime and endTime in HH:MM format if provided' 
    },
    rescheduleReason: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || value.trim().length > 0, 
      message: 'Reschedule reason must be a non-empty string if provided' 
    }
  }
};

// Provider/manual booking schema for walk-in patients
const manualBookingSchema = {
  bodySchema: {
    slotId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid slot ID is required' },
    timeSlot: { required: false, type: 'object', validate: (value) => {
      if (!value) return true;
      if (!value.startTime || !value.endTime) return false;
      return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.startTime) && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.endTime);
    }, message: 'timeSlot must have valid startTime and endTime in HH:MM format' },
    patientName: { required: true, type: 'string', validate: (v) => typeof v === 'string' && v.trim().length > 0, message: 'Patient name is required' },
    patientPhone: { required: true, type: 'string', validate: validatePhone, message: 'Valid 10-digit phone number required' },
    patientEmail: { required: false, type: 'string', validate: validateEmail, message: 'Valid email required if provided' },
    paymentMethod: { required: true, type: 'string', validate: (v) => [PAYMENT_METHODS.CASH, PAYMENT_METHODS.MANUAL].includes(v), message: 'Manual booking only supports CASH or MANUAL payment methods' },
    paymentAmount: { required: false, type: 'number', validate: (value) => value === undefined || value >= 0, message: 'Payment amount must be non-negative' },
    metadata: { required: false, type: 'object' }
  }
};

const updateBookingStatusSchema = {
  bodySchema: {
    status: { required: true, type: 'string', validate: (v) => ['CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'].includes(v), message: 'Invalid status' },
    note: { required: false, type: 'string', validate: (v) => !v || (typeof v === 'string' && v.trim().length > 0), message: 'Note must be a non-empty string if provided' }
  }
};

// Payment schemas
const createOrderSchema = {
  bodySchema: {
    bookingId: { required: false, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid booking ID required if provided' },
    prescriptionId: { required: false, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid prescription ID required if provided' },
    // Amount in rupees (base currency unit), optional for server-side pricing
    // Backend converts to paise internally for Razorpay API
    amount: { required: false, type: 'number', validate: (value) => typeof value === 'number' && value > 0, message: 'Amount must be a positive number in rupees if provided' },
    __custom: {
      validate: (body) => {
        const hasBooking = body.bookingId !== undefined && body.bookingId !== null && body.bookingId !== '';
        const hasPrescription = body.prescriptionId !== undefined && body.prescriptionId !== null && body.prescriptionId !== '';
        if (!hasBooking && !hasPrescription) {
          throw new Error('Either bookingId or prescriptionId must be provided');
        }
        if (hasBooking && hasPrescription) {
          throw new Error('Cannot provide both bookingId and prescriptionId');
        }
        return true;
      },
      message: 'Either bookingId or prescriptionId must be provided, but not both'
    }
  }
};

const verifyPaymentSchema = {
  bodySchema: {
    orderId: { required: true, type: 'string', validate: (v) => typeof v === 'string' && v.startsWith('order_'), message: 'Valid Razorpay order ID required (starts with order_)' },
    paymentId: { required: true, type: 'string', validate: (v) => typeof v === 'string' && v.startsWith('pay_'), message: 'Valid Razorpay payment ID required (starts with pay_)' },
    signature: { required: true, type: 'string', validate: (v) => typeof v === 'string' && v.length === 64, message: 'Valid signature required (64-character hex string)' }
  }
};

const addSlotSchema = {
  bodySchema: {
    date: { required: true, validate: (value) => !isNaN(new Date(value).getTime()), message: 'Date must be a valid date' },
    startTime: { required: true, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'Start time must be in HH:MM format (24-hour)' },
    endTime: { required: true, type: 'string', validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), message: 'End time must be in HH:MM format (24-hour)' },
    capacity: { required: true, type: 'number', validate: (value) => Number.isInteger(value) && value >= 1, message: 'Capacity must be a positive integer' },
    consultationType: { required: false, type: 'string', validate: (value) => ['IN_PERSON', 'TELECONSULTATION', 'BOTH'].includes(value), message: 'Invalid consultation type' }
  }
};

const addDoctorSchema = {
  bodySchema: {
    name: { required: true, type: 'string', message: 'Name is required' },
    specialization: { required: true, type: 'string', message: 'Specialization is required' },
    qualification: { required: true, type: 'string', message: 'Qualification is required' },
    experience: { required: true, type: 'number', validate: (value) => value >= 0, message: 'Experience must be non-negative' },
    contactPhone: { required: true, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
    email: { required: false, type: 'string', validate: validateEmail, message: 'Valid email required if provided' },
    schedule: { required: false, type: 'string' }
  }
};

const addLabSchema = {
  bodySchema: {
    name: { required: true, type: 'string', message: 'Name is required' },
    type: { required: true, type: 'string', message: 'Type is required' },
    location: { required: false, type: 'string' },
    contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Valid phone number required if provided' },
    availableTests: { required: false, validate: (value) => Array.isArray(value) && value.every(i => typeof i === 'string'), message: 'availableTests must be an array of strings' }
  }
};

const addBedSchema = {
  bedNumber: { required: true, type: 'string', message: 'Bed number is required' },
  type: { required: true, type: 'string', validate: (value) => ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'].includes(value), message: 'Invalid bed type' },
  floor: { required: false, type: 'string' },
  ward: { required: false, type: 'string' }
};

const addPharmacySchema = {
  name: { required: true, type: 'string', message: 'Name is required' },
  location: { required: false, type: 'string' },
  contactPhone: { required: true, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
  operatingHours: { required: false, type: 'string' }
};

const addStaffSchema = {
  name: { required: true, type: 'string', message: 'Name is required' },
  role: { required: true, type: 'string', message: 'Role is required' },
  department: { required: false, type: 'string' },
  contactPhone: { required: true, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
  email: { required: false, type: 'string', validate: validateEmail, message: 'Valid email required if provided' },
  shift: { required: false, type: 'string' }
};

const updateDoctorSchema = {
  name: { required: false, type: 'string', message: 'Name is required' },
  specialization: { required: false, type: 'string', message: 'Specialization is required' },
  qualification: { required: false, type: 'string', message: 'Qualification is required' },
  experience: { required: false, type: 'number', validate: (value) => value >= 0, message: 'Experience must be non-negative' },
  contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
  email: { required: false, type: 'string', validate: validateEmail, message: 'Valid email required if provided' },
  schedule: { required: false, type: 'string' }
};

const updateLabSchema = {
  name: { required: false, type: 'string', message: 'Name is required' },
  type: { required: false, type: 'string', message: 'Type is required' },
  location: { required: false, type: 'string' },
  contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Valid phone number required if provided' },
  availableTests: { required: false, validate: (value) => Array.isArray(value) && value.every(i => typeof i === 'string'), message: 'availableTests must be an array of strings' }
};

const updateBedSchema = {
  bedNumber: { required: false, type: 'string', message: 'Bed number is required' },
  type: { required: false, type: 'string', validate: (value) => ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'].includes(value), message: 'Invalid bed type' },
  floor: { required: false, type: 'string' },
  ward: { required: false, type: 'string' },
  isOccupied: { required: false, type: 'boolean' }
};

const updatePharmacySchema = {
  name: { required: false, type: 'string', message: 'Name is required' },
  location: { required: false, type: 'string' },
  contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
  operatingHours: { required: false, type: 'string' }
};

const updateStaffSchema = {
  name: { required: false, type: 'string', message: 'Name is required' },
  role: { required: false, type: 'string', message: 'Role is required' },
  department: { required: false, type: 'string' },
  contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Valid phone number required' },
  email: { required: false, type: 'string', validate: validateEmail, message: 'Valid email required if provided' },
  shift: { required: false, type: 'string' }
};

const addQCRecordSchema = {
  date: { required: true, validate: (value) => new Date(value) <= new Date(), message: 'QC date cannot be in the future' },
  testType: { required: true, type: 'string', validate: (value) => value && value.length >= 2 && value.length <= 100, message: 'Test type must be between 2 and 100 characters' },
  result: { required: true, type: 'string', validate: (value) => ['PASS', 'FAIL', 'WARNING'].includes(value), message: 'Result must be one of: PASS, FAIL, WARNING' },
  parameters: { 
    required: true, 
    type: 'array', 
    validate: (value) => {
      if (!Array.isArray(value) || value.length === 0) return false;
      return value.every(param => 
        param.name && typeof param.name === 'string' &&
        param.value && typeof param.value === 'string' &&
        ['WITHIN_RANGE', 'OUT_OF_RANGE'].includes(param.status)
      );
    },
    message: 'At least one parameter is required with name, value, and status fields' 
  },
  performedBy: { required: true, type: 'string', validate: (value) => value && value.length >= 2 && value.length <= 100, message: 'Performed by must be between 2 and 100 characters' },
  notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 500, message: 'Notes must not exceed 500 characters' }
};

const updateQCRecordSchema = {
  date: { required: false, validate: (value) => !value || new Date(value) <= new Date(), message: 'QC date cannot be in the future' },
  testType: { required: false, type: 'string', validate: (value) => !value || (value.length >= 2 && value.length <= 100), message: 'Test type must be between 2 and 100 characters' },
  result: { required: false, type: 'string', validate: (value) => !value || ['PASS', 'FAIL', 'WARNING'].includes(value), message: 'Result must be one of: PASS, FAIL, WARNING' },
  parameters: { 
    required: false, 
    type: 'array', 
    validate: (value) => {
      if (!value) return true;
      if (!Array.isArray(value) || value.length === 0) return false;
      return value.every(param => 
        param.name && typeof param.name === 'string' &&
        param.value && typeof param.value === 'string' &&
        ['WITHIN_RANGE', 'OUT_OF_RANGE'].includes(param.status)
      );
    },
    message: 'If provided, parameters must be a non-empty array with name, value, and status fields' 
  },
  performedBy: { required: false, type: 'string', validate: (value) => !value || (value.length >= 2 && value.length <= 100), message: 'Performed by must be between 2 and 100 characters' },
  notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 500, message: 'Notes must not exceed 500 characters' }
};

// Document validation schemas
const documentUploadSchema = {
  bodySchema: {
    patientId: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || mongoose.Types.ObjectId.isValid(value), 
      message: 'Patient ID must be a valid MongoDB ObjectId' 
    },
    patientEmail: {
      required: false,
      type: 'string',
      validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Valid email address is required'
    },
    bookingId: {
      required: false,
      type: 'string',
      message: 'Booking ID must be a string'
    },
    documentType: { required: true, type: 'string', validate: validateDocumentType, message: `Document type must be one of: ${Object.values(DOCUMENT_TYPES).join(', ')}` },
    title: { required: true, type: 'string', validate: (value) => value.trim().length >= 3, message: 'Title must be at least 3 characters long' },
    description: { required: false, type: 'string', message: 'Description must be a string' },
    metadata: { 
      required: false, 
      validate: (value) => {
        if (!value) return true;
        if (typeof value === 'object' && value !== null) return true;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null;
          } catch {
            return false;
          }
        }
        return false;
      },
      message: 'Metadata must be a valid object or JSON string' 
    },
    __customValidation: (body) => {
      // Either patientId or patientEmail must be provided
      if (!body.patientId && !body.patientEmail) {
        return { field: 'patientId', message: 'Either patientId or patientEmail is required' };
      }
      return null;
    }
  }
};

const getPatientDocumentsSchema = {
  paramsSchema: {
    patientId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid patient ID is required' }
  },
  querySchema: {
    documentType: { required: false, type: 'string', validate: (value) => !value || validateDocumentType(value), message: `Document type must be one of: ${Object.values(DOCUMENT_TYPES).join(', ')}` },
    startDate: { required: false, type: 'string', validate: (value) => !value || !isNaN(Date.parse(value)), message: 'Start date must be a valid ISO date string' },
    endDate: { required: false, type: 'string', validate: (value) => !value || !isNaN(Date.parse(value)), message: 'End date must be a valid ISO date string' },
    page: { required: false, validate: (value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0), message: 'Page must be a positive integer' },
    limit: { required: false, validate: (value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 100), message: 'Limit must be a positive integer (max 100)' }
  }
};

const updateDocumentSchema = {
  paramsSchema: {
    documentId: { required: true, type: 'string', message: 'Document ID is required' }
  },
  bodySchema: {
    title: { required: false, type: 'string', validate: (value) => value.trim().length >= 3, message: 'Title must be at least 3 characters long' },
    description: { required: false, type: 'string', message: 'Description must be a string' }
  }
};

const bulkUploadReportsSchema = {
  bodySchema: {
    __custom: {
      validate: (body) => {
        // CSV file is in req.file, not body. Body should be empty.
        return Object.keys(body).length === 0;
      },
      message: 'CSV file is required in the request'
    }
  }
};

// Consent validation schemas
const requestConsentSchema = {
  bodySchema: {
    patientId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid patient ID is required' },
    purpose: { required: true, type: 'string', validate: (value) => value.trim().length >= 10, message: 'Purpose must be at least 10 characters long' }
  }
};

const approveConsentSchema = {
  paramsSchema: {
    consentId: { required: true, type: 'string', message: 'Consent ID is required' }
  },
  bodySchema: {
    expiresAt: { required: false, validate: (value) => {
      if (!value) return true; // Optional
      const date = new Date(value);
      if (isNaN(date.getTime())) return false;
      return date.getTime() > Date.now();
    }, message: 'Expiry date must be a valid future date' },
    notes: { required: false, type: 'string', message: 'Notes must be a string' }
  }
};

const rejectConsentSchema = {
  paramsSchema: {
    consentId: { required: true, type: 'string', message: 'Consent ID is required' }
  },
  bodySchema: {
    notes: { required: false, type: 'string', message: 'Notes must be a string' }
  }
};

const checkConsentSchema = {
  querySchema: {
    patientId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid patient ID is required' },
    requesterId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid requester ID is required' }
  }
};

const getPatientConsentsSchema = {
  paramsSchema: {
    patientId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid patient ID is required' }
  },
  querySchema: {
    status: { required: false, type: 'string', validate: validateConsentStatus, message: `Status must be one of: ${Object.values(CONSENT_STATUS).join(', ')}` }
  }
};

const getProviderConsentsSchema = {
  paramsSchema: {
    providerId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid provider ID is required' }
  },
  querySchema: {
    status: { required: false, type: 'string', validate: validateConsentStatus, message: `Status must be one of: ${Object.values(CONSENT_STATUS).join(', ')}` }
  }
};

// Prescription validation schemas
const createPrescriptionSchema = {
  bodySchema: {
    patientId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid patient ID is required' },
    medicines: { 
      required: true, 
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) return false;
        return value.every(m => 
          m.name && typeof m.name === 'string' &&
          m.dosage && typeof m.dosage === 'string' &&
          m.quantity && Number.isInteger(m.quantity) && m.quantity > 0
        );
      }, 
      message: 'Medicines must be a non-empty array with name, dosage, and quantity for each item' 
    },
    pharmacyId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid pharmacy ID is required' },
    bookingId: { required: false, type: 'string', validate: (value) => !value || mongoose.Types.ObjectId.isValid(value), message: 'Valid booking ID required if provided' },
    notes: { required: false, type: 'string' }
  }
};

const prebookPrescriptionSchema = {
  paramsSchema: {
    prescriptionId: { required: true, type: 'string', message: 'Prescription ID is required' }
  },
  bodySchema: {
    pharmacyId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid pharmacy ID is required' }
  }
};

const cancelPrescriptionSchema = {
  paramsSchema: {
    prescriptionId: { required: true, type: 'string', message: 'Prescription ID is required' }
  },
  bodySchema: {
    cancellationReason: { required: false, type: 'string', validate: (value) => !value || value.trim().length > 0, message: 'Cancellation reason must be a non-empty string if provided' }
  }
};

const searchMedicinesSchema = {
  querySchema: {
    query: { required: true, type: 'string', validate: (value) => value.trim().length >= 2, message: 'Search query must be at least 2 characters' }
  }
};

const createPharmacyLinkSchema = {
  bodySchema: {
    doctorId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid doctor ID is required' },
    pharmacyId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid pharmacy ID is required' }
  }
};

// Referral validation schemas
const createReferralSchema = {
  bodySchema: {
    targetId: { 
      required: true, 
      type: 'string', 
      validate: (value) => mongoose.Types.ObjectId.isValid(value), 
      message: 'Valid target ID is required' 
    },
    patientId: { 
      required: true, 
      type: 'string', 
      validate: (value) => mongoose.Types.ObjectId.isValid(value), 
      message: 'Valid patient ID is required' 
    },
    referralType: { 
      required: true, 
      type: 'string', 
      validate: (value) => ['INTER_DEPARTMENTAL', 'DOCTOR_TO_DOCTOR', 'DOCTOR_TO_PHARMACY', 'LAB_TO_LAB'].includes(value), 
      message: 'Invalid referral type' 
    },
    reason: { 
      required: true, 
      type: 'string', 
      validate: (value) => value.trim().length >= 10 && value.trim().length <= 1000, 
      message: 'Reason must be between 10 and 1000 characters' 
    },
    notes: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || value.trim().length <= 500, 
      message: 'Notes must not exceed 500 characters' 
    },
    priority: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(value), 
      message: 'Invalid priority' 
    },
    metadata: {
      required: false,
      validate: (value) => {
        if (!value) return true;
        if (typeof value === 'object' && value !== null) return true;
        return false;
      },
      message: 'Metadata must be a valid object'
    }
  }
};

const acceptReferralSchema = {
  bodySchema: {
    notes: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || value.trim().length <= 500, 
      message: 'Notes must not exceed 500 characters' 
    }
  }
};

const rejectReferralSchema = {
  bodySchema: {
    rejectionReason: { 
      required: true, 
      type: 'string', 
      validate: (value) => value.trim().length >= 10 && value.trim().length <= 500, 
      message: 'Rejection reason must be between 10 and 500 characters' 
    }
  }
};

const cancelReferralSchema = {
  bodySchema: {
    cancellationReason: { 
      required: false, 
      type: 'string', 
      validate: (value) => !value || value.trim().length <= 500, 
      message: 'Cancellation reason must not exceed 500 characters' 
    }
  }
};

// Hospital Dashboard & Analytics validation schemas

const createStaffScheduleSchema = {
  staffId: { 
    required: true, 
    type: 'number',
    validate: (val) => Number.isInteger(val) && val >= 0,
    message: 'Staff ID must be a valid non-negative integer' 
  },
  date: { 
    required: true, 
    type: 'string',
    validate: (val) => !isNaN(Date.parse(val)),
    message: 'Date must be a valid date string' 
  },
  shiftType: { 
    required: true, 
    type: 'string',
    validate: (val) => Object.values(SHIFT_TYPES).includes(val),
    message: `Shift type must be one of: ${Object.values(SHIFT_TYPES).join(', ')}` 
  },
  startTime: { 
    required: true, 
    type: 'string',
    validate: (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    message: 'Start time must be in HH:MM format' 
  },
  endTime: { 
    required: true, 
    type: 'string',
    validate: (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    message: 'End time must be in HH:MM format' 
  },
  department: { 
    required: false, 
    type: 'string' 
  },
  notes: { 
    required: false, 
    type: 'string',
    validate: (val) => val.length <= 500,
    message: 'Notes must not exceed 500 characters' 
  },
  __custom: {
    validate: (body) => {
      if (body.startTime && body.endTime) {
        const start = body.startTime.split(':').map(Number);
        const end = body.endTime.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        if (endMinutes <= startMinutes) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    },
    message: 'End time must be after start time'
  }
};

const updateStaffScheduleSchema = {
  staffId: { 
    required: false, 
    type: 'number',
    validate: (val) => Number.isInteger(val) && val >= 0,
    message: 'Staff ID must be a valid non-negative integer' 
  },
  date: { 
    required: false, 
    type: 'string',
    validate: (val) => !isNaN(Date.parse(val)),
    message: 'Date must be a valid date string' 
  },
  shiftType: { 
    required: false, 
    type: 'string',
    validate: (val) => Object.values(SHIFT_TYPES).includes(val),
    message: `Shift type must be one of: ${Object.values(SHIFT_TYPES).join(', ')}` 
  },
  startTime: { 
    required: false, 
    type: 'string',
    validate: (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    message: 'Start time must be in HH:MM format' 
  },
  endTime: { 
    required: false, 
    type: 'string',
    validate: (val) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
    message: 'End time must be in HH:MM format' 
  },
  department: { 
    required: false, 
    type: 'string' 
  },
  notes: { 
    required: false, 
    type: 'string',
    validate: (val) => val.length <= 500,
    message: 'Notes must not exceed 500 characters' 
  },
  status: { 
    required: false, 
    type: 'string',
    validate: (val) => Object.values(SCHEDULE_STATUS).includes(val),
    message: `Status must be one of: ${Object.values(SCHEDULE_STATUS).join(', ')}` 
  },
  __custom: {
    validate: (body) => {
      if (body.startTime && body.endTime) {
        const start = body.startTime.split(':').map(Number);
        const end = body.endTime.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        if (endMinutes <= startMinutes) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    },
    message: 'End time must be after start time'
  }
};

const getAnalyticsQuerySchema = {
  querySchema: {
    startDate: { 
      required: false, 
      type: 'string',
      validate: (val) => !isNaN(Date.parse(val)),
      message: 'Start date must be a valid date string' 
    },
    endDate: { 
      required: false, 
      type: 'string',
      validate: (val) => !isNaN(Date.parse(val)),
      message: 'End date must be a valid date string' 
    },
    department: { 
      required: false, 
      type: 'string' 
    }
  }
};

// Medical history query validation schema
const getMedicalHistorySchema = {
  querySchema: {
    type: {
      required: false,
      type: 'string',
      validate: (value) => Object.values(MEDICAL_HISTORY_TYPES).includes(value),
      message: `Type must be one of: ${Object.values(MEDICAL_HISTORY_TYPES).join(', ')}`
    },
    startDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'Start date must be a valid ISO 8601 date'
    },
    endDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'End date must be a valid ISO 8601 date'
    },
    page: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Page must be an integer between 1 and 100'
    },
    limit: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 50;
      },
      message: 'Limit must be an integer between 1 and 50'
    },
    __custom: (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end < start) {
          throw new Error('End date must be equal to or after start date');
        }
      }
      return true;
    }
  }
};

// Export medical history validation schema
const exportMedicalHistorySchema = {
  querySchema: {
    format: {
      required: true,
      type: 'string',
      validate: (value) => ['csv', 'pdf'].includes(value),
      message: 'Format must be either csv or pdf'
    },
    type: {
      required: false,
      type: 'string',
      validate: (value) => Object.values(MEDICAL_HISTORY_TYPES).includes(value),
      message: `Type must be one of: ${Object.values(MEDICAL_HISTORY_TYPES).join(', ')}`
    },
    startDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'Start date must be a valid ISO 8601 date'
    },
    endDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'End date must be a valid ISO 8601 date'
    },
    __custom: (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end < start) {
          throw new Error('End date must be equal to or after start date');
        }
      }
      return true;
    }
  }
};

// Health articles query validation schema
const getHealthArticlesSchema = {
  querySchema: {
    category: {
      required: false,
      type: 'string',
      validate: (value) => Object.values(HEALTH_ARTICLE_CATEGORIES).includes(value),
      message: `Category must be one of: ${Object.values(HEALTH_ARTICLE_CATEGORIES).join(', ')}`
    },
    search: {
      required: false,
      type: 'string',
      validate: (value) => value.length <= 100,
      message: 'Search query must not exceed 100 characters'
    },
    page: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Page must be an integer between 1 and 100'
    },
    limit: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 50;
      },
      message: 'Limit must be an integer between 1 and 50'
    }
  }
};

// Consultation validation schemas
const createConsultationSchema = {
  bodySchema: {
    patientId: {
      required: true,
      type: 'string',
      validate: (value) => mongoose.Types.ObjectId.isValid(value),
      message: 'Patient ID must be a valid MongoDB ObjectId'
    },
    bookingId: {
      required: false,
      type: 'string',
      validate: (value) => !value || mongoose.Types.ObjectId.isValid(value),
      message: 'Booking ID must be a valid MongoDB ObjectId'
    },
    mode: {
      required: true,
      type: 'string',
      message: 'Consultation mode is required'
    },
    scheduledAt: {
      required: true,
      type: 'string',
      validate: (value) => {
        const date = new Date(value);
        return !isNaN(date.getTime()) && date > new Date();
      },
      message: 'Scheduled date must be a valid future date'
    },
    notes: {
      required: false,
      type: 'string',
      validate: (value) => !value || value.length <= 2000,
      message: 'Notes must not exceed 2000 characters'
    }
  }
};

const updateConsultationStatusSchema = {
  bodySchema: {
    status: {
      required: true,
      type: 'string',
      message: 'Status is required'
    },
    notes: {
      required: false,
      type: 'string',
      validate: (value) => !value || value.length <= 2000,
      message: 'Notes must not exceed 2000 characters'
    },
    diagnosis: {
      required: false,
      type: 'string',
      validate: (value) => !value || value.length <= 1000,
      message: 'Diagnosis must not exceed 1000 characters'
    },
    followUpRequired: {
      required: false,
      type: 'boolean'
    },
    followUpDate: {
      required: false,
      type: 'string',
      validate: (value) => !value || !isNaN(new Date(value).getTime()),
      message: 'Follow-up date must be a valid date'
    }
  }
};

const addConsultationNoteSchema = {
  bodySchema: {
    content: {
      required: true,
      type: 'string',
      validate: (value) => value.length >= 10 && value.length <= 2000,
      message: 'Note content must be between 10 and 2000 characters'
    }
  }
};

const saveChatMessageSchema = {
  bodySchema: {
    message: {
      required: true,
      type: 'string',
      validate: (value) => value.length >= 1 && value.length <= 1000,
      message: 'Message must be between 1 and 1000 characters'
    }
  }
};

const getConsultationsSchema = {
  querySchema: {
    status: {
      required: false,
      type: 'string'
    },
    mode: {
      required: false,
      type: 'string'
    },
    startDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'Start date must be a valid ISO date'
    },
    endDate: {
      required: false,
      type: 'string',
      validate: validateDateFormat,
      message: 'End date must be a valid ISO date'
    },
    page: {
      required: false,
      type: 'number',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Page must be an integer between 1 and 100'
    },
    limit: {
      required: false,
      type: 'number',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Limit must be an integer between 1 and 100'
    }
  }
};

const getDoctorPatientsSchema = {
  querySchema: {
    search: {
      required: false,
      type: 'string',
      validate: (value) => !value || value.length >= 2,
      message: 'Search query must be at least 2 characters'
    },
    sortBy: {
      required: false,
      type: 'string',
      validate: (value) => !value || ['lastActivity', 'name'].includes(value),
      message: 'Sort by must be either lastActivity or name'
    },
    page: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Page must be an integer between 1 and 100'
    },
    limit: {
      required: false,
      type: 'string',
      validate: (value) => {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 100;
      },
      message: 'Limit must be an integer between 1 and 100'
    }
  }
};

// Billing validation schemas
const generateInvoiceSchema = {
  providerId: {
    required: true,
    type: 'string',
    validate: (v) => mongoose.Types.ObjectId.isValid(v),
    message: 'providerId must be a valid ObjectId'
  },
  items: {
    required: true,
    validate: (v) => {
      if (!Array.isArray(v) || v.length === 0) return false;
      // Validate each item has required structure
      return v.every(item => 
        item.itemType && Object.values(INVOICE_ITEM_TYPE).includes(item.itemType) &&
        item.description && typeof item.description === 'string' && item.description.trim().length > 0 &&
        typeof item.quantity === 'number' && item.quantity >= 1 &&
        typeof item.unitPrice === 'number' && item.unitPrice >= 0
      );
    },
    message: 'items must be a non-empty array with valid itemType, description, quantity (min 1), and unitPrice (non-negative)'
  },
  taxDetails: {
    required: false,
    validate: (v) => {
      if (!v) return true; // Optional field
      if (!Array.isArray(v)) return false;
      // Validate each tax detail structure
      return v.every(tax => 
        tax.taxType && Object.values(TAX_TYPES).includes(tax.taxType) &&
        typeof tax.taxRate === 'number' && tax.taxRate >= 0 && tax.taxRate <= 100
      );
    },
    message: 'taxDetails must be an array with valid taxType and taxRate (0-100)'
  },
  patientId: {
    required: false,
    type: 'string',
    validate: (v) => !v || mongoose.Types.ObjectId.isValid(v),
    message: 'patientId must be a valid ObjectId'
  },
  bookingId: {
    required: false,
    type: 'string',
    validate: (v) => !v || mongoose.Types.ObjectId.isValid(v),
    message: 'bookingId must be a valid ObjectId'
  },
  prescriptionId: {
    required: false,
    type: 'string',
    validate: (v) => !v || mongoose.Types.ObjectId.isValid(v),
    message: 'prescriptionId must be a valid ObjectId'
  }
};

const updateInvoiceStatusSchema = {
  status: {
    required: true,
    type: 'string',
    validate: (v) => Object.values(INVOICE_STATUS).includes(v),
    message: `status must be one of ${Object.values(INVOICE_STATUS).join(', ')}`
  }
};

const markInvoiceAsPaidSchema = {
  paymentId: {
    required: false,
    type: 'string',
    message: 'paymentId must be a string'
  },
  paymentMethod: {
    required: true,
    type: 'string',
    validate: (v) => Object.values(PAYMENT_METHODS).includes(v),
    message: 'Invalid payment method'
  }
};

const cancelInvoiceSchema = {
  reason: {
    required: true,
    type: 'string',
    validate: (v) => v && v.trim().length > 0,
    message: 'reason is required and must not be empty'
  }
};

// Supplier validation schemas
const addSupplierSchema = {
  bodySchema: {
    name: { required: true, type: 'string', validate: (value) => {
      const trimmed = value.trim();
      return trimmed.length >= 1 && trimmed.length <= 200;
    }, message: 'Name must be between 1 and 200 characters' },
    contactPerson: { required: false, type: 'string', validate: (value) => !value || (value.trim().length >= 1 && value.trim().length <= 100), message: 'Contact person must be between 1 and 100 characters if provided' },
    phone: { required: true, type: 'string', validate: (value) => /^\d{10}$/.test(value), message: 'Phone must be exactly 10 digits' },
    email: { required: false, type: 'string', validate: (value) => !value || validateEmail(value), message: 'Email must be a valid email address' },
    address: { required: false, type: 'string', validate: (value) => !value || value.trim().length <= 500, message: 'Address must not exceed 500 characters' },
    gstin: { required: false, type: 'string', validate: (value) => !value || /^[A-Za-z0-9]{15}$/.test(value), message: 'GSTIN must be 15 alphanumeric characters' }
  }
};

const updateSupplierSchema = {
  bodySchema: {
    name: { required: false, type: 'string', validate: (value) => !value || (value.trim().length >= 1 && value.trim().length <= 200), message: 'Name must be between 1 and 200 characters' },
    contactPerson: { required: false, type: 'string', validate: (value) => !value || value.trim().length <= 100, message: 'Contact person must not exceed 100 characters' },
    phone: { required: false, type: 'string', validate: (value) => !value || /^\d{10}$/.test(value), message: 'Phone must be exactly 10 digits' },
    email: { required: false, type: 'string', validate: (value) => !value || validateEmail(value), message: 'Email must be a valid email address' },
    address: { required: false, type: 'string', validate: (value) => !value || value.trim().length <= 500, message: 'Address must not exceed 500 characters' },
    gstin: { required: false, type: 'string', validate: (value) => !value || /^[A-Za-z0-9]{15}$/.test(value), message: 'GSTIN must be 15 alphanumeric characters' },
    isActive: { required: false, type: 'boolean', message: 'isActive must be a boolean' }
  }
};

// Purchase Order validation schemas
const createPurchaseOrderSchema = {
  bodySchema: {
    supplierId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'Valid supplier ID is required' },
    items: { required: true, type: 'array', validate: (value) => {
      if (!Array.isArray(value) || value.length < 1) return false;
      return value.every(item => 
        item.medicineName && typeof item.medicineName === 'string' && item.medicineName.trim().length >= 1 &&
        Number.isInteger(item.quantity) && item.quantity > 0 &&
        typeof item.unitPrice === 'number' && item.unitPrice > 0
      );
    }, message: 'At least one item is required with medicineName (non-empty string), quantity (positive integer), and unitPrice (positive number)' },
    expectedDeliveryDate: { required: false, validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime()) && date > new Date();
    }, message: 'Expected delivery date must be a valid future date' },
    notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 1000, message: 'Notes must not exceed 1000 characters' }
  }
};

const updatePurchaseOrderSchema = {
  bodySchema: {
    items: { required: false, type: 'array', validate: (value) => !value || (Array.isArray(value) && value.length >= 0), message: 'Items must be an array' },
    expectedDeliveryDate: { required: false, validate: (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime()) && date > new Date();
    }, message: 'Expected delivery date must be a valid future date' },
    notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 1000, message: 'Notes must not exceed 1000 characters' },
    status: { required: false, type: 'string', validate: (value) => !value || Object.values(PO_STATUS).includes(value), message: 'Status must be a valid PO status' }
  }
};

const approvePurchaseOrderSchema = {
  bodySchema: {
    approvedBy: { required: true, type: 'string', validate: (value) => value.trim().length >= 1 && value.trim().length <= 100, message: 'Approved by name must be between 1 and 100 characters' },
    notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 500, message: 'Notes must not exceed 500 characters' }
  }
};

const receivePurchaseOrderSchema = {
  bodySchema: {
    items: { required: true, type: 'array', validate: (value) => {
      if (!Array.isArray(value) || value.length < 1) return false;
      return value.every(item => 
        Number.isInteger(item.itemIndex) && item.itemIndex >= 0 &&
        Number.isInteger(item.quantityReceived) && item.quantityReceived > 0
      );
    }, message: 'At least one item receipt is required with itemIndex (non-negative integer) and quantityReceived (positive integer)' },
    notes: { required: false, type: 'string', validate: (value) => !value || value.length <= 1000, message: 'Notes must not exceed 1000 characters' },
    receivedBy: { required: true, type: 'string', validate: (value) => {
      const trimmed = value.trim();
      return trimmed.length >= 1 && trimmed.length <= 100;
    }, message: 'Received by name must be between 1 and 100 characters' }
  }
};

const validate = (schemaName) => {
  const schemas = {
    generateInvoice: generateInvoiceSchema,
    updateInvoiceStatus: updateInvoiceStatusSchema,
    markInvoiceAsPaid: markInvoiceAsPaidSchema,
    cancelInvoice: cancelInvoiceSchema
  };
  
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Unknown validation schema: ${schemaName}`);
  }
  
  return validateRequest(schema);
};

// Bulk upload medicines schema
const bulkUploadMedicinesSchema = {
  bodySchema: {
    __custom: {
      validate: (body) => {
        // CSV file is in req.file, not body. Body should be empty.
        return Object.keys(body).length === 0;
      },
      message: 'CSV file is required in the request'
    }
  }
};

// Stock adjustment schema
const stockAdjustmentSchema = {
  bodySchema: {
    medicineId: { required: true, type: 'string', message: 'Medicine ID is required' },
    adjustmentType: { required: true, type: 'string', validate: (value) => ['ADD', 'SUBTRACT'].includes(value), message: 'Adjustment type must be ADD or SUBTRACT' },
    quantity: { required: true, validate: (value) => Number.isInteger(value) && value >= 1, message: 'Quantity must be a positive integer' },
    reason: { required: true, type: 'string', validate: (value) => value.trim().length >= 3 && value.trim().length <= 500, message: 'Reason must be between 3 and 500 characters' },
    performedBy: { required: true, type: 'string', validate: (value) => value.trim().length >= 1 && value.trim().length <= 100, message: 'Performed by name must be between 1 and 100 characters' }
  }
};

// Contact form schema
const contactFormSchema = {
  name: { required: true, type: 'string', validate: (value) => value.trim().length >= 2, message: 'Name must be at least 2 characters long' },
  email: { required: true, type: 'string', validate: validateEmail, message: 'Valid email address is required' },
  subject: { required: true, type: 'string', validate: (value) => CONTACT_SUBJECTS.includes(value), message: 'Invalid subject selected' },
  message: { required: true, type: 'string', validate: (value) => value.trim().length >= 10 && value.trim().length <= 1000, message: 'Message must be between 10 and 1000 characters' }
};

// Prescription Template Validation Schemas
const addPrescriptionTemplateSchema = {
  name: { required: true, type: 'string', min: 3, max: 100 },
  category: { required: true, type: 'string', validate: (value) => Object.values(TEMPLATE_CATEGORIES).includes(value), message: `Category must be one of: ${Object.values(TEMPLATE_CATEGORIES).join(', ')}` },
  medicines: {
    required: true,
    validate: (value) => {
      if (!Array.isArray(value) || value.length < 1) return false;
      return value.every(m =>
        m.name && typeof m.name === 'string' && m.name.trim().length > 0 &&
        m.dosage && typeof m.dosage === 'string' && m.dosage.trim().length > 0 &&
        Number.isInteger(m.quantity) && m.quantity >= 1
      );
    },
    message: 'Medicines must be a non-empty array with at least name, dosage, and quantity for each medicine'
  },
  notes: { required: false, type: 'string', max: 1000 }
};

const updatePrescriptionTemplateSchema = {
  name: { required: false, type: 'string', min: 3, max: 100 },
  category: { required: false, type: 'string', validate: (value) => Object.values(TEMPLATE_CATEGORIES).includes(value), message: `Category must be one of: ${Object.values(TEMPLATE_CATEGORIES).join(', ')}` },
  medicines: {
    required: false,
    validate: (value) => {
      if (!Array.isArray(value) || value.length < 1) return false;
      return value.every(m =>
        m.name && typeof m.name === 'string' && m.name.trim().length > 0 &&
        m.dosage && typeof m.dosage === 'string' && m.dosage.trim().length > 0 &&
        Number.isInteger(m.quantity) && m.quantity >= 1
      );
    },
    message: 'Medicines must be a non-empty array with at least name, dosage, and quantity for each medicine'
  },
  notes: { required: false, type: 'string', max: 1000 },
  isActive: { required: false, type: 'boolean' }
};

const getPrescriptionTemplatesSchema = {
  querySchema: {
    activeOnly: { required: false, type: 'string', validate: (value) => !value || value === 'true' || value === 'false', message: 'activeOnly must be "true" or "false"' },
    category: { required: false, type: 'string', validate: (value) => Object.values(TEMPLATE_CATEGORIES).includes(value), message: `Category must be one of: ${Object.values(TEMPLATE_CATEGORIES).join(', ')}` }
  }
};

const deletePrescriptionTemplateSchema = {
  paramsSchema: {
    index: { required: true, type: 'number', validate: (value) => Number.isInteger(value) && value >= 0, message: 'Index must be a non-negative integer' }
  }
};

// Physical verification schema
const physicalVerificationSchema = {
  bodySchema: {
    verifications: { 
      required: true, 
      validate: (value) => {
        if (!Array.isArray(value) || value.length < 1) return false;
        return value.every(v =>
          v.medicineId && typeof v.medicineId === 'string' &&
          Number.isInteger(v.systemStock) && v.systemStock >= 0 &&
          Number.isInteger(v.actualStock) && v.actualStock >= 0
        );
      },
      message: 'Verifications must be a non-empty array with medicineId, systemStock, and actualStock'
    },
    verifiedBy: { required: true, type: 'string', validate: (value) => value.trim().length >= 1 && value.trim().length <= 100, message: 'Verified by name must be between 1 and 100 characters' },
    autoAdjust: { required: false, validate: (value) => typeof value === 'boolean' || value === undefined, message: 'autoAdjust must be a boolean' }
  }
};

// Location Management Validation Schemas
const addLocationSchema = {
  name: { required: true, type: 'string', validate: (value) => value.trim().length >= 2 && value.trim().length <= 100, message: 'Name must be between 2 and 100 characters' },
  location: { required: true, type: 'string', validate: (value) => value.trim().length >= 2 && value.trim().length <= 200, message: 'Location must be between 2 and 200 characters' },
  branchCode: { required: true, type: 'string', validate: (value) => /^[A-Z0-9]{2,20}$/.test(value), message: 'Branch code must be 2-20 alphanumeric characters (uppercase)' },
  contactPhone: { required: false, type: 'string', validate: validatePhone, message: 'Contact phone must be a valid 10-digit number' },
  contactEmail: { required: false, type: 'string', validate: validateEmail, message: 'Contact email must be a valid email address' }
};

const updateLocationSchema = {
  name: { required: false, type: 'string', validate: (value) => !value || (value.trim().length >= 2 && value.trim().length <= 100), message: 'Name must be between 2 and 100 characters' },
  location: { required: false, type: 'string', validate: (value) => !value || (value.trim().length >= 2 && value.trim().length <= 200), message: 'Location must be between 2 and 200 characters' },
  contactPhone: { required: false, type: 'string', validate: (value) => !value || validatePhone(value), message: 'Contact phone must be a valid 10-digit number' },
  contactEmail: { required: false, type: 'string', validate: (value) => !value || validateEmail(value), message: 'Contact email must be a valid email address' }
};

// Bed Allocation & Queue Management Validation Schemas
const getQueueQuerySchema = {
  locationId: { required: false, type: 'string', validate: (value) => !value || value === 'all' || mongoose.Types.ObjectId.isValid(value), message: 'locationId must be valid ObjectId or "all"' }
};

const addToQueueSchema = {
  bodySchema: {
    bookingId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'bookingId must be a valid ObjectId' },
    bedRequirement: { 
      required: true, 
      type: 'object',
      validate: (value) => value && value.bedType && Object.values(BED_TYPES).includes(value.bedType),
      message: 'bedRequirement must include valid bedType' 
    },
    medicalUrgency: { required: true, type: 'number', validate: (value) => value >= 0 && value <= 10, message: 'medicalUrgency must be between 0 and 10' },
    patientAge: { required: false, type: 'number', validate: (value) => !value || (value >= 0 && value <= 120), message: 'patientAge must be between 0 and 120' }
  }
};

const allocateBedSchema = {
  bodySchema: {
    bookingId: { required: true, type: 'string', validate: (value) => mongoose.Types.ObjectId.isValid(value), message: 'bookingId must be a valid ObjectId' },
    bedIndex: { required: true, type: 'number', validate: (value) => Number.isInteger(value) && value >= 0, message: 'bedIndex must be a non-negative integer' }
  }
};

const releaseBedSchema = {};

const removeFromQueueSchema = {};

const getAvailableBedsQuerySchema = {
  bedType: { required: false, type: 'string', validate: (value) => !value || Object.values(BED_TYPES).includes(value), message: 'bedType must be one of: ' + Object.values(BED_TYPES).join(', ') },
  locationId: { required: false, type: 'string', validate: (value) => !value || value === 'all' || mongoose.Types.ObjectId.isValid(value), message: 'locationId must be valid ObjectId or "all"' }
};

export {
  validate,
  validateRequest,
  registerPatientSchema,
  registerHospitalSchema,
  registerDoctorSchema,
  registerLabSchema,
  registerPharmacySchema,
  loginSchema,
  createSlotSchema,
  updateSlotSchema,
  createBookingSchema,
  manualBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  createOrderSchema,
  verifyPaymentSchema,
  addSlotSchema,
  addDoctorSchema,
  addLabSchema,
  addBedSchema,
  addPharmacySchema,
  addStaffSchema,
  updateDoctorSchema,
  updateLabSchema,
  updateBedSchema,
  updatePharmacySchema,
  updateStaffSchema,
  addQCRecordSchema,
  updateQCRecordSchema,
  documentUploadSchema,
  getPatientDocumentsSchema,
  updateDocumentSchema,
  bulkUploadReportsSchema,
  bulkUploadMedicinesSchema,
  addSupplierSchema,
  updateSupplierSchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  approvePurchaseOrderSchema,
  receivePurchaseOrderSchema,
  requestConsentSchema,
  approveConsentSchema,
  rejectConsentSchema,
  checkConsentSchema,
  getPatientConsentsSchema,
  getProviderConsentsSchema,
  createPrescriptionSchema,
  prebookPrescriptionSchema,
  cancelPrescriptionSchema,
  searchMedicinesSchema,
  createPharmacyLinkSchema,
  createReferralSchema,
  acceptReferralSchema,
  rejectReferralSchema,
  cancelReferralSchema,
  createStaffScheduleSchema,
  updateStaffScheduleSchema,
  getAnalyticsQuerySchema,
  getMedicalHistorySchema,
  exportMedicalHistorySchema,
  getHealthArticlesSchema,
  createConsultationSchema,
  updateConsultationStatusSchema,
  addConsultationNoteSchema,
  saveChatMessageSchema,
  getConsultationsSchema,
  getDoctorPatientsSchema,
  generateInvoiceSchema,
  updateInvoiceStatusSchema,
  markInvoiceAsPaidSchema,
  cancelInvoiceSchema,
  sendEmailOTPSchema,
  verifyEmailOTPSchema,
  forgotPasswordSchema,
  verifyPhoneOTPSchema,
  resetPasswordSchema,
  rescheduleBookingSchema,
  stockAdjustmentSchema,
  physicalVerificationSchema,
  contactFormSchema,
  addPrescriptionTemplateSchema,
  updatePrescriptionTemplateSchema,
  getPrescriptionTemplatesSchema,
  deletePrescriptionTemplateSchema,
  addLocationSchema,
  updateLocationSchema,
  getQueueQuerySchema,
  addToQueueSchema,
  allocateBedSchema,
  releaseBedSchema,
  removeFromQueueSchema,
  getAvailableBedsQuerySchema
};
