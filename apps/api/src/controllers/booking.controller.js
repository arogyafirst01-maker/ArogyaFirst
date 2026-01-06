const Booking = require('../models/Booking.model.js');
const Slot = require('../models/Slot.model.js');
const User = require('../models/User.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { withTransaction, atomicSlotBooking } = require('../utils/transaction.util.js');
const { ROLES, BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPES, PAYMENT_METHODS, BED_ASSIGNMENT_STATUS } = require('@arogyafirst/shared');
const { generateBookingId } = require('@arogyafirst/shared');
const { processRefund, processPartialRefund } = require('./payment.controller.js');
const { sendReschedulingNotificationEmail } = require('../utils/email.util.js');

const getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { status, startDate, endDate, entityType, locationId } = req.query;
    if (providerId !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized access to provider bookings', 403);
    }
    // Build filters object with validated query parameters
    const filters = {};
    
    // Validate and add status filter
    if (status && Object.values(BOOKING_STATUS).includes(status)) {
      filters.status = status;
    }
    
    // Validate and add entityType filter
    if (entityType && Object.values(BOOKING_TYPES).includes(entityType)) {
      filters.entityType = entityType;
    }
    
    // Parse and normalize date filters
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        filters.startDate = parsedStart;
      }
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        filters.endDate = parsedEnd;
      }
    }

    // Add locationId support for multi-location providers
    if (locationId && locationId !== 'all') {
      filters.locationId = locationId;
    } else if (req.user && req.user.hospitalData?.parentHospitalId) {
      // If provider is a chain branch, only show own location's bookings
      filters.locationId = req.user._id.toString();
    }

    // Only patientSnapshot is used in provider UI; patientId populate is omitted for performance.
    const bookings = await Booking.findByProvider(providerId, filters)
      .sort({ bookingDate: -1 });
    return successResponse(res, bookings, 'Provider bookings retrieved successfully');
  } catch (error) {
    console.error('Error retrieving provider bookings:', error);
    return errorResponse(res, 'Failed to retrieve provider bookings', 500);
  }
};

// Create manual booking for walk-in patients
const createManualBooking = async (req, res) => {
  try {
    const { slotId, timeSlot, patientName, patientPhone, patientEmail, paymentMethod, paymentAmount, metadata } = req.body;
    
    // Guard: Enforce CASH/MANUAL-only constraint
    if (![PAYMENT_METHODS.CASH, PAYMENT_METHODS.MANUAL].includes(paymentMethod)) {
      return errorResponse(res, 'Manual booking only supports CASH or MANUAL payment methods', 400);
    }
    
    // Guard: Validate paymentAmount is a valid positive number
    if (typeof paymentAmount !== 'number' || !Number.isFinite(paymentAmount) || paymentAmount < 0) {
      return errorResponse(res, 'Invalid payment amount: must be a positive number', 400);
    }
    
    // NOTE: Slot and booking creation are only atomic when ENABLE_TRANSACTIONS=true.
    // See docs/DEPLOYMENT.md for replica set setup instructions.
    const result = await withTransaction(async (session) => {
      const slot = await Slot.findById(slotId).session(session);
      console.log(`[ManualBooking] Slot found: ${!!slot}, slotId: ${slotId}`);
      if (!slot) {
        throw new Error('Slot not found or not bookable');
      }
      
      // Check if slot is active
      console.log(`[ManualBooking] Slot isActive: ${slot.isActive}`);
      if (!slot.isActive) {
        throw new Error('Slot not found or not bookable');
      }
      
      // Check if slot is bookable (can't use virtual field with transaction)
      // isBookable checks: isActive, date within advance booking days, and has available capacity
      // ALL DATE COMPARISONS MUST USE UTC TO MATCH DATABASE STORAGE
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      
      // slot.date is stored as UTC in DB, extract just the date part in UTC
      const slotDateObj = new Date(slot.date);
      const slotDateUTC = new Date(Date.UTC(slotDateObj.getUTCFullYear(), slotDateObj.getUTCMonth(), slotDateObj.getUTCDate(), 0, 0, 0, 0));
      
      // Calculate max booking date
      const maxBookingDateUTC = new Date(todayUTC);
      maxBookingDateUTC.setUTCDate(maxBookingDateUTC.getUTCDate() + slot.advanceBookingDays);
      
      console.log(`[ManualBooking] UTC Date check: slotDate=${slotDateUTC.toISOString()}, today=${todayUTC.toISOString()}, maxDate=${maxBookingDateUTC.toISOString()}, advanceDays=${slot.advanceBookingDays}`);
      console.log(`[ManualBooking] Millisecond values - slot: ${slotDateUTC.getTime()}, today: ${todayUTC.getTime()}, max: ${maxBookingDateUTC.getTime()}`);
      
      // Check date is within booking window
      if (slotDateUTC > maxBookingDateUTC || slotDateUTC < todayUTC) {
        console.log(`[ManualBooking] Date check FAILED: slotDate > max = ${slotDateUTC > maxBookingDateUTC}, slotDate < today = ${slotDateUTC < todayUTC}`);
        throw new Error('Slot not found or not bookable');
      }
      
      // Check if slot has available capacity
      let hasCapacity = false;
      if (Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0) {
        hasCapacity = slot.timeSlots.some(ts => (ts.booked || 0) < ts.capacity);
        console.log(`[ManualBooking] TimeSlots check: hasCapacity=${hasCapacity}, slots=${JSON.stringify(slot.timeSlots)}`);
      } else {
        hasCapacity = (slot.booked || 0) < slot.capacity;
        console.log(`[ManualBooking] Single range check: booked=${slot.booked}, capacity=${slot.capacity}, hasCapacity=${hasCapacity}`);
      }
      
      if (!hasCapacity) {
        console.log(`[ManualBooking] Capacity check FAILED: hasCapacity=${hasCapacity}`);
        throw new Error('Slot not found or not bookable');
      }
      
      console.log(`[ManualBooking] All checks passed for slotId: ${slotId}`);
      
      const provider = await User.findById(slot.providerId).session(session);
      if (!provider || !provider.isVerified || provider.verificationStatus !== 'APPROVED') {
        throw new Error('Provider not found or not verified');
      }
      
      // Handle multi-window vs single-range slots
      let matchingTimeSlot = null;
      let bookingTime = null;
      
      if (slot.timeSlots && slot.timeSlots.length > 0) {
        // Multi-window slot: require timeSlot
        if (!timeSlot) {
          throw new Error('Manual booking requires a timeSlot for multi-window slots.');
        }
        matchingTimeSlot = slot.timeSlots.find(ts => ts.startTime === timeSlot.startTime && ts.endTime === timeSlot.endTime);
        if (!matchingTimeSlot || (matchingTimeSlot.booked || 0) >= matchingTimeSlot.capacity) {
          throw new Error('Selected time slot is not available');
        }
        bookingTime = matchingTimeSlot;
      } else {
        // Legacy single-range slot: use slot startTime/endTime
        bookingTime = { startTime: slot.startTime, endTime: slot.endTime };
      }
      
      const updatedSlot = await atomicSlotBooking(slotId, 1, matchingTimeSlot, session);
      if (!updatedSlot) {
        throw new Error('Slot is full');
      }

      // Extract locationId from slot
      const locationId = slot.locationId || null;

      const bookingId = generateBookingId();
      const patientSnapshot = {
        name: patientName,
        phone: patientPhone,
        email: patientEmail || 'N/A'
      };
      const providerSnapshot = buildProviderSnapshot(provider);
      const slotSnapshot = buildSlotSnapshot(slot, matchingTimeSlot);
      const booking = new Booking({
        bookingId,
        patientId: null,
        providerId: slot.providerId,
        slotId: slot._id,
        locationId,
        entityType: slot.entityType,
        bookingDate: slot.date,
        bookingTime,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: paymentMethod === PAYMENT_METHODS.CASH ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.PENDING,
        paymentMethod: paymentMethod,
        paymentAmount: paymentAmount || 0,
        patientSnapshot,
        providerSnapshot,
        slotSnapshot,
        metadata: metadata || {},
        createdBy: req.user._id,
      });
      await booking.save({ session });
      return booking;
    });
    return successResponse(res, result, 'Manual booking created successfully', 201);
  } catch (error) {
    console.error('Error creating manual booking:', error);
    if (error.message === 'Slot is full') return errorResponse(res, 'Slot is full', 400);
    if (error.message === 'Slot not found or not bookable') return errorResponse(res, 'Slot not found or not bookable', 404);
    if (error.message === 'Provider not found or not verified') return errorResponse(res, 'Provider not found or not verified', 400);
    if (error.message === 'Selected time slot is not available') return errorResponse(res, 'Selected time slot is not available', 400);
    if (error.message === 'Manual booking requires a timeSlot for multi-window slots.') return errorResponse(res, 'Manual booking requires a timeSlot for multi-window slots.', 400);
    if (error.message === 'Manual booking only supports CASH or MANUAL payment methods') return errorResponse(res, error.message, 400);
    return errorResponse(res, 'Failed to create manual booking', 500);
  }
};

// Provider-facing: Update booking status (Complete, No-show, Cancel)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return errorResponse(res, 'Booking not found', 404);
    if (booking.providerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
    if (!validateStatusTransition(booking.status, status)) {
      return errorResponse(res, 'Invalid status transition', 400);
    }

    // Process refund for provider-initiated cancellations of successful online payments
    let refundErrorInfo = null;
    if (status === BOOKING_STATUS.CANCELLED && 
        booking.paymentStatus === PAYMENT_STATUS.SUCCESS && 
        booking.paymentMethod === PAYMENT_METHODS.ONLINE) {
      try {
        await processRefund(booking._id.toString(), req.user._id);
        console.log(`Refund initiated for provider-cancelled booking ${booking._id}`);
      } catch (refundError) {
        console.error('Refund failed during provider cancellation:', refundError);
        // Store refund error info for transaction merge
        refundErrorInfo = {
          refundFailed: true,
          refundError: refundError.message,
          refundErrorMessage: 'Refund processing failed. Please contact support for assistance.',
          refundAttemptedAt: new Date(),
        };
      }
    }

    // NOTE: Slot and booking updates are only atomic when ENABLE_TRANSACTIONS=true.
    // See docs/DEPLOYMENT.md for replica set setup instructions.
    await withTransaction(async (session) => {
      const slot = await Slot.findById(booking.slotId).session(session);
      const timeSlot = slot?.timeSlots?.length ? booking.bookingTime : null;
      if (status === BOOKING_STATUS.COMPLETED) {
        booking.complete();
      } else if (status === BOOKING_STATUS.NO_SHOW) {
        booking.markNoShow();
        const slotUpdate = await atomicSlotBooking(booking.slotId, -1, timeSlot, session);
        if (!slotUpdate) console.warn('Failed to restore slot capacity during no-show for booking', booking._id);
      } else if (status === BOOKING_STATUS.CANCELLED) {
        booking.cancel(req.user._id, note || 'Cancelled by provider');
        
        // Set refund failure tracking fields if refund failed
        if (refundErrorInfo) {
          booking.refundFailed = true;
          booking.refundFailureReason = refundError.message || 'Refund processing failed';
          booking.metadata = {
            ...booking.metadata,
            ...refundErrorInfo,
          };
        }
        
        const slotUpdate = await atomicSlotBooking(booking.slotId, -1, timeSlot, session);
        if (!slotUpdate) console.warn('Failed to restore slot capacity during cancellation for booking', booking._id);
      }
      booking.updatedBy = req.user._id;
      await booking.save({ session });
    });
    
    // Re-fetch booking to get latest state with metadata
    const updated = await Booking.findById(id);
    
    // Construct response with refund outcome details if cancelled
    const response = {
      booking: updated,
      ...(status === BOOKING_STATUS.CANCELLED && {
        refundInitiated: refundErrorInfo === null && 
                        updated.paymentStatus === PAYMENT_STATUS.SUCCESS && 
                        updated.paymentMethod === PAYMENT_METHODS.ONLINE,
        refundId: updated.metadata?.refundId || null,
        refundError: refundErrorInfo?.refundErrorMessage || null,
      }),
    };
    
    return successResponse(res, response, 'Booking status updated successfully');
  } catch (error) {
    console.error('Error updating booking status:', error);
    return errorResponse(res, 'Failed to update booking status', 500);
  }
};

// Helper: validate status transitions
const validateStatusTransition = (currentStatus, newStatus) => {
  if ([BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.NO_SHOW].includes(currentStatus)) return false;
  if (currentStatus === BOOKING_STATUS.CONFIRMED) {
    return [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW, BOOKING_STATUS.CANCELLED].includes(newStatus);
  }
  return false;
};
// Patient-facing: Create booking
const createBooking = async (req, res) => {
  try {
    const { slotId, timeSlot, metadata, paymentAmount, paymentMethod: incomingPaymentMethod } = req.body;

    // Validate payment method (default to ONLINE for patient bookings)
    const paymentMethod = incomingPaymentMethod || PAYMENT_METHODS.ONLINE;
    if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      return errorResponse(res, 'Unsupported payment method', 400);
    }

    // Route already authorizes patients; rely on middleware for RBAC

    // Execute within transaction
    // NOTE: Slot and booking creation are only atomic when ENABLE_TRANSACTIONS=true.
    // See docs/DEPLOYMENT.md for replica set setup instructions.
    const result = await withTransaction(async (session) => {
      // Fetch slot by ID with session
      const slot = await Slot.findById(slotId).session(session);
      if (!slot) {
        throw new Error('Slot not found or not bookable');
      }
      
      // Check if slot is active
      if (!slot.isActive) {
        throw new Error('Slot not found or not bookable');
      }
      
      // Check if slot is bookable (can't use virtual field with transaction)
      // ALL DATE COMPARISONS MUST USE UTC TO MATCH DATABASE STORAGE
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      
      // slot.date is stored as UTC in DB, extract just the date part in UTC
      const slotDateObj = new Date(slot.date);
      const slotDateUTC = new Date(Date.UTC(slotDateObj.getUTCFullYear(), slotDateObj.getUTCMonth(), slotDateObj.getUTCDate(), 0, 0, 0, 0));
      
      // Calculate max booking date
      const maxBookingDateUTC = new Date(todayUTC);
      maxBookingDateUTC.setUTCDate(maxBookingDateUTC.getUTCDate() + slot.advanceBookingDays);
      
      if (slotDateUTC > maxBookingDateUTC || slotDateUTC < todayUTC) {
        throw new Error('Slot not found or not bookable');
      }
      
      let hasCapacity = false;
      if (Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0) {
        hasCapacity = slot.timeSlots.some(ts => (ts.booked || 0) < ts.capacity);
      } else {
        hasCapacity = (slot.booked || 0) < slot.capacity;
      }
      
      if (!hasCapacity) {
        throw new Error('Slot not found or not bookable');
      }

      // Fetch provider with role-specific data
      const provider = await User.findById(slot.providerId).session(session);
      if (!provider || !provider.isVerified || provider.verificationStatus !== 'APPROVED') {
        throw new Error('Provider not found or not verified');
      }

      // If timeSlot provided, validate it exists in slot.timeSlots and has capacity
      let matchingTimeSlot = null;
      if (timeSlot) {
        matchingTimeSlot = slot.timeSlots?.find(ts => ts.startTime === timeSlot.startTime && ts.endTime === timeSlot.endTime);
        if (!matchingTimeSlot || (matchingTimeSlot.booked || 0) >= matchingTimeSlot.capacity) {
          throw new Error('Selected time slot is not available');
        }
      }

      // Call atomicSlotBooking to increment booked count (pass session for transactional safety)
      const updatedSlot = await atomicSlotBooking(slotId, 1, timeSlot, session);
      if (!updatedSlot) {
        throw new Error('Slot is full');
      }

      // Extract locationId from slot or derive from provider chain context
      const locationId = slot.locationId || (provider.hospitalData?.isChain ? null : slot.providerId);

      // Generate unique bookingId using shared util
      const bookingId = generateBookingId();

      // Build snapshots
        const patientSnapshot = buildPatientSnapshot(req.user);
        const providerSnapshot = buildProviderSnapshot(provider);
        const bookingTime = matchingTimeSlot || { startTime: slot.startTime, endTime: slot.endTime };
        const slotSnapshot = buildSlotSnapshot(slot, bookingTime);

      // Determine payment status based on payment method and amount
      // ONLINE payments with amount > 0 are PENDING until payment gateway confirms
      // CASH payments or zero-amount bookings are SUCCESS (no gateway needed)
      const paymentStatus = (paymentMethod === PAYMENT_METHODS.ONLINE && paymentAmount > 0)
        ? PAYMENT_STATUS.PENDING
        : PAYMENT_STATUS.SUCCESS;

      const booking = new Booking({
        bookingId,
        patientId: req.user._id,
        providerId: slot.providerId,
        slotId: slot._id,
        locationId,
        entityType: slot.entityType,
        bookingDate: slot.date,
        bookingTime,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        paymentAmount: paymentAmount || 0,
        patientSnapshot,
        providerSnapshot,
        slotSnapshot,
        metadata: metadata || {},
        createdBy: req.user._id,
        // For IPD bookings, add to queue with WAITING_IN_QUEUE status
        bedAssignmentStatus: slot.entityType === BOOKING_TYPES.IPD ? BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE : undefined,
      });

      console.log('[Booking.Create] IPD Check - entityType:', slot.entityType, 'isIPD:', slot.entityType === BOOKING_TYPES.IPD, 'bedAssignmentStatus:', booking.bedAssignmentStatus);

      // Save booking with session
      await booking.save({ session });
      
      console.log('[Booking.Create] Saved booking - entityType:', booking.entityType, 'bedAssignmentStatus:', booking.bedAssignmentStatus);

      return booking;
    });

    return successResponse(res, result, 'Booking created successfully', 201);
  } catch (error) {
    if (error.message === 'Slot is full') {
      return errorResponse(res, 'Slot is full', 400);
    }
    if (error.message === 'Slot not found or not bookable') {
      return errorResponse(res, 'Slot not found or not bookable', 404);
    }
    if (error.message === 'Provider not found or not verified') {
      return errorResponse(res, 'Provider not found or not verified', 400);
    }
    if (error.message === 'Selected time slot is not available') {
      return errorResponse(res, 'Selected time slot is not available', 400);
    }
    console.error('Error creating booking:', error);
    return errorResponse(res, 'Failed to create booking', 500);
  }
};

const getPatientBookings = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, startDate, endDate, entityType } = req.query;

    // Validate patientId matches req.user._id
    if (patientId !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized access to bookings', 403);
    }

    // Use Booking.findByPatient static method
    const bookings = await Booking.findByPatient(patientId, { status, startDate, endDate, entityType })
      .populate('providerId', 'role hospitalData.name doctorData.name doctorData.specialization labData.name')
      .sort({ bookingDate: -1 });

    return successResponse(res, bookings, 'Patient bookings retrieved successfully');
  } catch (error) {
    console.error('Error retrieving patient bookings:', error);
    return errorResponse(res, 'Failed to retrieve bookings', 500);
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('patientId', 'patientData.name patientData.phone email')
      .populate('providerId', 'role hospitalData.name doctorData.name doctorData.specialization labData.name');

    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Validate access: patient owns booking OR provider owns slot
    const isPatientOwner = booking.patientId && booking.patientId._id.toString() === req.user._id.toString();
    const isProviderOwner = booking.providerId._id.toString() === req.user._id.toString();

    if (!isPatientOwner && !isProviderOwner) {
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, booking, 'Booking retrieved successfully');
  } catch (error) {
    console.error('Error retrieving booking:', error);
    return errorResponse(res, 'Failed to retrieve booking', 500);
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Guard patient cancellation for manual bookings
    if (!booking.patientId) {
      return errorResponse(res, 'Manual bookings cannot be cancelled by patient.', 403);
    }
    // Validate ownership
    if (booking.patientId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to cancel this booking', 403);
    }

    // Validate cancellable
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (booking.status !== BOOKING_STATUS.CONFIRMED || booking.bookingDate < today) {
      return errorResponse(res, 'Booking cannot be cancelled', 400);
    }

    // Process refund only for successful ONLINE payments with positive amount (mirrors provider cancellation logic)
    let refundResult = null;
    let refundErrorInfo = null; // Store refund error for transaction merge
    
    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS && 
        booking.paymentMethod === PAYMENT_METHODS.ONLINE && 
        booking.paymentAmount > 0) {
      try {
        refundResult = await processRefund(booking._id.toString(), req.user._id);
        console.log(`Refund initiated for booking ${booking._id}:`, refundResult);
      } catch (refundError) {
        console.error('Refund failed during booking cancellation:', refundError);
        // Log refund failure but allow cancellation to proceed
        // Store refund error info in local variable (not persisted yet)
        refundErrorInfo = {
          refundFailed: true,
          refundError: refundError.message,
          refundErrorMessage: 'Refund processing failed. Please contact support for assistance.',
          refundAttemptedAt: new Date(),
        };
        // Keep payment status as SUCCESS (refund failed, manual intervention needed)
      }
    }

    // Execute cancellation within transaction
    // NOTE: Slot and booking updates are only atomic when ENABLE_TRANSACTIONS=true.
    // See docs/DEPLOYMENT.md for replica set setup instructions.
    await withTransaction(async (session) => {
      // Use Booking instance method to perform cancellation so schema-level logic is centralized
      booking.cancel(req.user._id, cancellationReason);

      // Set refund failure tracking fields if refund failed
      if (refundErrorInfo) {
        booking.refundFailed = true;
        booking.refundFailureReason = refundErrorInfo.refundError || 'Refund processing failed';
        booking.metadata = {
          ...booking.metadata,
          ...refundErrorInfo,
        };
      }

      // Fetch slot to determine if it's multi-window
      const slot = await Slot.findById(booking.slotId).session(session);
      const timeSlot = slot?.timeSlots?.length ? booking.bookingTime : null;

      // Restore slot capacity
      const slotUpdate = await atomicSlotBooking(booking.slotId, -1, timeSlot, session);
      if (!slotUpdate) {
        console.warn('Failed to restore slot capacity for booking', booking._id, '- slot may be deleted');
      }

      await booking.save({ session });
    });

    // Re-fetch booking to get latest state with metadata
    const updatedBooking = await Booking.findById(id);

    // Construct response with refund outcome details
    const response = {
      booking: updatedBooking,
      refundInitiated: refundResult !== null,
      refundId: refundResult?.refundId || updatedBooking.metadata?.refundId || null,
      refundError: refundErrorInfo?.refundErrorMessage || null,
    };

    return successResponse(res, response, 'Booking cancelled successfully');
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return errorResponse(res, 'Failed to cancel booking', 500);
  }
};

// Patient-facing: Reschedule booking
const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSlotId, newTimeSlot, rescheduleReason } = req.body;

    // Fetch existing booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Guard: Manual bookings cannot be rescheduled by patient
    if (!booking.patientId) {
      return errorResponse(res, 'Manual bookings cannot be rescheduled by patient.', 403);
    }

    // Validate ownership
    if (booking.patientId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to reschedule this booking', 403);
    }

    // Validate booking status - only CONFIRMED bookings can be rescheduled
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return errorResponse(res, 'Only confirmed bookings can be rescheduled', 400);
    }

    // Validate booking date is today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return errorResponse(res, 'Cannot reschedule past appointments', 400);
    }

    // Validate new slot is different from current slot
    if (booking.slotId.toString() === newSlotId) {
      return errorResponse(res, 'New slot must be different from current slot', 400);
    }

    // Fetch new slot
    const newSlot = await Slot.findById(newSlotId);
    if (!newSlot) {
      return errorResponse(res, 'New slot not found or not bookable', 404);
    }
    
    // Check if slot is active
    if (!newSlot.isActive) {
      return errorResponse(res, 'New slot not found or not bookable', 404);
    }
    
    // Check if slot is bookable (can't use virtual field)
    // ALL DATE COMPARISONS MUST USE UTC TO MATCH DATABASE STORAGE
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    // newSlot.date is stored as UTC in DB, extract just the date part in UTC
    const newSlotDateObj = new Date(newSlot.date);
    const newSlotDateUTC = new Date(Date.UTC(newSlotDateObj.getUTCFullYear(), newSlotDateObj.getUTCMonth(), newSlotDateObj.getUTCDate(), 0, 0, 0, 0));
    
    // Calculate max booking date
    const maxBookingDateUTC = new Date(todayUTC);
    maxBookingDateUTC.setUTCDate(maxBookingDateUTC.getUTCDate() + newSlot.advanceBookingDays);
    
    if (newSlotDateUTC > maxBookingDateUTC || newSlotDateUTC < todayUTC) {
      return errorResponse(res, 'New slot not found or not bookable', 404);
    }
    
    let newSlotHasCapacity = false;
    if (Array.isArray(newSlot.timeSlots) && newSlot.timeSlots.length > 0) {
      newSlotHasCapacity = newSlot.timeSlots.some(ts => (ts.booked || 0) < ts.capacity);
    } else {
      newSlotHasCapacity = (newSlot.booked || 0) < newSlot.capacity;
    }
    
    if (!newSlotHasCapacity) {
      return errorResponse(res, 'New slot not found or not bookable', 404);
    }

    // Fetch provider for new slot
    const provider = await User.findById(newSlot.providerId);
    if (!provider || !provider.isVerified || provider.verificationStatus !== 'APPROVED') {
      return errorResponse(res, 'Provider not found or not verified', 400);
    }

    // Validate time slot availability for multi-window slots
    let matchingTimeSlot = null;
    let newBookingTime = null;

    if (newSlot.timeSlots && newSlot.timeSlots.length > 0) {
      // Multi-window slot: require newTimeSlot
      if (!newTimeSlot) {
        return errorResponse(res, 'Time slot is required for multi-window slots', 400);
      }
      matchingTimeSlot = newSlot.timeSlots.find(
        ts => ts.startTime === newTimeSlot.startTime && ts.endTime === newTimeSlot.endTime
      );
      if (!matchingTimeSlot || (matchingTimeSlot.booked || 0) >= matchingTimeSlot.capacity) {
        return errorResponse(res, 'Selected time slot is not available', 400);
      }
      newBookingTime = { startTime: matchingTimeSlot.startTime, endTime: matchingTimeSlot.endTime };
    } else {
      // Single-range slot: check overall capacity
      if ((newSlot.booked || 0) >= newSlot.capacity) {
        return errorResponse(res, 'Slot is full', 400);
      }
      newBookingTime = { startTime: newSlot.startTime, endTime: newSlot.endTime };
    }

    // Store old booking details for notification and audit
    const oldBookingDetails = {
      slotId: booking.slotId,
      date: booking.bookingDate,
      startTime: booking.bookingTime.startTime,
      endTime: booking.bookingTime.endTime,
      paymentAmount: booking.paymentAmount,
    };

    // Calculate payment adjustment
    const oldAmount = booking.paymentAmount || 0;
    const newAmount = newSlot.metadata?.fee || newSlot.metadata?.price || oldAmount;
    const paymentDifference = newAmount - oldAmount;

    let paymentAdjustment = null;
    if (paymentDifference > 0) {
      paymentAdjustment = { type: 'additional', amount: paymentDifference };
    } else if (paymentDifference < 0) {
      paymentAdjustment = { type: 'refund', amount: Math.abs(paymentDifference) };
    }

    // Fetch old slot to determine if it's multi-window
    const oldSlot = await Slot.findById(booking.slotId);
    const oldTimeSlot = oldSlot?.timeSlots?.length ? booking.bookingTime : null;

    // Execute reschedule within transaction
    let refundResult = null;
    await withTransaction(async (session) => {
      // Restore old slot capacity
      const restoreResult = await atomicSlotBooking(booking.slotId, -1, oldTimeSlot, session);
      if (!restoreResult) {
        console.warn('Failed to restore old slot capacity for booking', booking._id, '- slot may be deleted');
      }

      // Book new slot capacity
      const bookResult = await atomicSlotBooking(newSlotId, 1, matchingTimeSlot, session);
      if (!bookResult) {
        throw new Error('New slot is full');
      }

      // Build new snapshots
      const providerSnapshot = buildProviderSnapshot(provider);
      const slotSnapshot = buildSlotSnapshot(newSlot, newBookingTime);

      // Extract locationId from new slot
      const newLocationId = newSlot.locationId || null;

      // Update booking document
      booking.slotId = newSlot._id;
      booking.providerId = newSlot.providerId;
      booking.locationId = newLocationId;
      booking.bookingDate = newSlot.date;
      booking.bookingTime = newBookingTime;
      booking.providerSnapshot = providerSnapshot;
      booking.slotSnapshot = slotSnapshot;
      booking.updatedBy = req.user._id;

      // Store reschedule details in metadata
      booking.metadata = {
        ...booking.metadata,
        previousBooking: oldBookingDetails,
        rescheduleReason: rescheduleReason || undefined,
        rescheduledAt: new Date(),
        rescheduledBy: req.user._id,
      };

      // Handle payment adjustments
      if (paymentAdjustment) {
        if (paymentAdjustment.type === 'additional') {
          // Additional payment needed - update amount and set status to PENDING
          booking.paymentAmount = newAmount;
          if (booking.paymentMethod === PAYMENT_METHODS.ONLINE) {
            booking.paymentStatus = PAYMENT_STATUS.PENDING;
          }
          booking.metadata.paymentAdjustment = paymentAdjustment;
        } else if (paymentAdjustment.type === 'refund') {
          // Refund needed - only for successful online payments
          booking.paymentAmount = newAmount;
          booking.metadata.paymentAdjustment = paymentAdjustment;
          
          // Process refund if applicable (outside transaction to avoid blocking)
          if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS && 
              booking.paymentMethod === PAYMENT_METHODS.ONLINE && 
              paymentAdjustment.amount > 0) {
            // We'll process refund after transaction commits
            booking.metadata.pendingRefund = {
              amount: paymentAdjustment.amount,
              reason: 'Price difference due to rescheduling',
            };
          }
        }
      }

      await booking.save({ session });
    });

    // Process pending refund after transaction (if any)
    let updatedBooking = await Booking.findById(id);
    let partialRefundResult = null;
    let partialRefundError = null;
    
    if (updatedBooking.metadata?.pendingRefund) {
      try {
        const refundAmountInRupees = updatedBooking.metadata.pendingRefund.amount;
        console.log(`Processing partial refund of ₹${refundAmountInRupees} for booking ${id}`);
        
        // Call processPartialRefund helper for partial refunds
        partialRefundResult = await processPartialRefund(
          updatedBooking._id.toString(),
          req.user._id,
          refundAmountInRupees,
          'Price difference due to rescheduling'
        );
        
        // Update booking with refund success details
        updatedBooking.metadata = {
          ...updatedBooking.metadata,
          partialRefundProcessed: true,
          partialRefundId: partialRefundResult.refundId,
          partialRefundAmount: refundAmountInRupees,
          partialRefundAmountInPaise: partialRefundResult.refundAmount,
          partialRefundInitiatedAt: new Date(),
        };
        // Clear pending refund flag
        delete updatedBooking.metadata.pendingRefund;
        // Keep paymentStatus as SUCCESS for partial refunds (not full refund)
        await updatedBooking.save();
        
        console.log(`Partial refund initiated for booking ${id}: ${partialRefundResult.refundId}`);
      } catch (refundError) {
        console.error('Failed to process partial refund for rescheduled booking:', refundError);
        
        // Store refund failure info similar to cancellation flow
        partialRefundError = {
          refundFailed: true,
          refundError: refundError.message,
          refundErrorMessage: 'Partial refund processing failed. Please contact support for assistance.',
          refundAttemptedAt: new Date(),
        };
        
        updatedBooking.refundFailed = true;
        updatedBooking.refundFailureReason = refundError.message || 'Partial refund processing failed';
        updatedBooking.metadata = {
          ...updatedBooking.metadata,
          ...partialRefundError,
          partialRefundPending: updatedBooking.metadata.pendingRefund,
        };
        delete updatedBooking.metadata.pendingRefund;
        await updatedBooking.save();
      }
    }

    // Send notification email to provider
    try {
      const providerEmail = provider.email;
      if (providerEmail) {
        await sendReschedulingNotificationEmail(
          providerEmail,
          updatedBooking,
          oldBookingDetails,
          rescheduleReason || ''
        );
      }
    } catch (emailError) {
      console.error('Failed to send rescheduling notification email:', emailError);
      // Don't fail the reschedule if email fails
    }

    // Re-fetch booking to get latest state
    const finalBooking = await Booking.findById(id)
      .populate('providerId', 'role hospitalData.name doctorData.name doctorData.specialization labData.name email');

    // Construct response with partial refund outcome
    const response = {
      booking: finalBooking,
      paymentAdjustment: paymentAdjustment,
      previousBooking: oldBookingDetails,
      partialRefund: partialRefundResult ? {
        initiated: true,
        refundId: partialRefundResult.refundId,
        amount: partialRefundResult.refundAmount / 100, // Convert paise to rupees
      } : null,
      partialRefundError: partialRefundError?.refundErrorMessage || null,
    };

    return successResponse(res, response, 'Booking rescheduled successfully');
  } catch (error) {
    if (error.message === 'New slot is full') {
      return errorResponse(res, 'New slot is full', 400);
    }
    console.error('Error rescheduling booking:', error);
    return errorResponse(res, 'Failed to reschedule booking', 500);
  }
};

// Helper Functions
const validateBookingOwnership = (booking, userId) => {
  return booking.patientId.toString() === userId.toString();
};

const buildProviderSnapshot = (provider) => {
  let name, specialization, location, branchCode, chainName, locationId, isChainBranch;
  
  // Determine if provider is a chain branch
  isChainBranch = provider.role === ROLES.HOSPITAL && !!provider.hospitalData?.parentHospitalId;
  
  switch (provider.role) {
    case ROLES.HOSPITAL:
      name = provider.hospitalData?.name;
      location = provider.hospitalData?.location;
      branchCode = provider.hospitalData?.branchCode;
      chainName = provider.hospitalData?.chainName;
      locationId = isChainBranch ? provider._id : null;
      break;
    case ROLES.DOCTOR:
      name = provider.doctorData?.name;
      specialization = provider.doctorData?.specialization;
      location = provider.doctorData?.location;
      break;
    case ROLES.LAB:
      name = provider.labData?.name;
      location = provider.labData?.location;
      break;
    default:
      name = 'Unknown';
      location = 'Unknown';
  }
  return {
    name,
    role: provider.role,
    specialization,
    location,
    branchCode,
    chainName,
    locationId,
    isChainBranch,
  };
};

const buildPatientSnapshot = (patient) => {
  return {
    name: patient.patientData?.name,
    phone: patient.patientData?.phone,
    email: patient.email,
  };
};

const buildSlotSnapshot = (slot, timeSlot) => {
  // If timeSlot has capacity, use it (from timeSlots array)
  // Otherwise use slot.capacity (single-range slot)
  const capacity = timeSlot?.capacity ?? slot.capacity;
  const time = (timeSlot?.startTime && timeSlot?.endTime) 
    ? { startTime: timeSlot.startTime, endTime: timeSlot.endTime }
    : { startTime: slot.startTime, endTime: slot.endTime };
  
  return {
    date: slot.date,
    time,
    capacity,
    metadata: slot.metadata,
  };
};

// Provider-facing: Get provider's bookings

module.exports = { createBooking, getPatientBookings, getBookingById, cancelBooking, rescheduleBooking, getProviderBookings, createManualBooking, updateBookingStatus };
