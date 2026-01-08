import Slot from '../models/Slot.model.js';
import User from '../models/User.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import mongoose from 'mongoose';
import { ROLES, BOOKING_TYPES } from '@arogyafirst/shared';
import { timeToMinutes } from '@arogyafirst/shared/utils';
import { withTransaction } from '../utils/transaction.util.js';

export const createSlot = async (req, res) => {
  return await withTransaction(async (session) => {
    try {
      const { entityType, date, startTime, endTime, capacity, advanceBookingDays, metadata, timeSlots, locationId } = req.body;

    // Validate provider role matches entityType
    if (!validateProviderCanCreateEntityType(req.user.role, entityType)) {
      return errorResponse(res, 'Provider role cannot create this entity type', 403);
    }

    // Validate provider is verified
    if (!req.user.isVerified) {
      return errorResponse(res, 'Provider must be verified to create slots', 403);
    }
    
    // Handle locationId for multi-location hospitals
    let effectiveLocationId = locationId;
    const provider = await User.findById(req.user._id);
    
    if (provider.hospitalData) {
      // If requester is chain branch, enforce locationId to be self
      if (provider.hospitalData.parentHospitalId) {
        effectiveLocationId = req.user._id;
      }
      // If requester is chain parent, require locationId in request
      if (provider.hospitalData.isChain && !locationId) {
        return errorResponse(res, 'Chain hospitals must specify locationId for slot creation', 400);
      }
    }

    // Normalize and validate date using UTC consistently
    const dateObj = new Date(date);
    const slotDateUTC = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
    
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    if (slotDateUTC < todayUTC) {
      return errorResponse(res, 'Slot date cannot be in the past', 400);
    }

    // If timeSlots provided, validate each and internal overlaps (server-side guard)
    if (Array.isArray(timeSlots) && timeSlots.length > 0) {
      for (const ts of timeSlots) {
        if (!ts || typeof ts !== 'object') {
          return errorResponse(res, 'Each timeSlot must be an object', 400);
        }
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.startTime) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.endTime)) {
          return errorResponse(res, 'timeSlots must have startTime and endTime in HH:MM format', 400);
        }
        if (!Number.isInteger(ts.capacity) || ts.capacity < 1) {
          return errorResponse(res, 'Each timeSlot must have capacity >= 1', 400);
        }
        if (timeToMinutes(ts.endTime) <= timeToMinutes(ts.startTime)) {
          return errorResponse(res, 'Each timeSlot must have endTime after startTime', 400);
        }
      }
      // internal overlaps
      const sorted = [...timeSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      for (let i = 1; i < sorted.length; i++) {
        if (timeToMinutes(sorted[i].startTime) < timeToMinutes(sorted[i - 1].endTime)) {
          return errorResponse(res, 'Provided timeSlots contain overlapping windows', 400);
        }
      }
    } else {
      // Legacy single-range validation: only run when no timeSlots provided
      if (!startTime || !endTime || capacity === undefined) {
        return errorResponse(res, 'Either startTime/endTime/capacity or timeSlots array must be provided', 400);
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return errorResponse(res, 'End time must be after start time', 400);
      }
    }

    // Enforce MAX_SLOTS_PER_DAY before creation
    const MAX_SLOTS_PER_DAY = Number(process.env.MAX_SLOTS_PER_DAY || 50);
    const existingCount = await Slot.countDocuments({ providerId: req.user._id, date: slotDateUTC, isActive: true });
    if (existingCount >= MAX_SLOTS_PER_DAY) {
      return errorResponse(res, `Provider already has ${existingCount} active slots on this date; max allowed is ${MAX_SLOTS_PER_DAY}`, 400);
    }

    // Use a transaction to avoid races: re-check overlap inside transaction and insert
    const created = await withTransaction(async (session) => {
      // Re-check overlap inside transaction
      const overlapInner = Array.isArray(timeSlots) && timeSlots.length > 0
        ? await Slot.checkSlotOverlap(req.user._id, effectiveLocationId, slotDateUTC, null, null, null, entityType, timeSlots, session)
        : await Slot.checkSlotOverlap(req.user._id, effectiveLocationId, slotDateUTC, startTime, endTime, null, entityType, null, session);
      if (overlapInner) {
        // throw to abort transaction and be handled below
        const err = new Error('Slot overlaps with existing slot');
        err.code = 'SLOT_OVERLAP';
        throw err;
      }

      const slotPayload = {
        providerId: req.user._id,
        locationId: effectiveLocationId,
        providerRole: req.user.role,
        entityType,
        date: slotDateUTC,
        advanceBookingDays: advanceBookingDays || Number(process.env.DEFAULT_ADVANCE_BOOKING_DAYS || 30),
        metadata: metadata || {},
        createdBy: req.user._id,
        isActive: true
      };

      if (Array.isArray(timeSlots) && timeSlots.length > 0) {
        // ensure booked is explicitly set (controller responsibility)
        slotPayload.timeSlots = timeSlots.map(ts => ({ startTime: ts.startTime, endTime: ts.endTime, capacity: ts.capacity, booked: (typeof ts.booked === 'number' ? ts.booked : 0) }));
      } else {
        slotPayload.startTime = startTime;
        slotPayload.endTime = endTime;
        slotPayload.capacity = capacity;
        slotPayload.booked = 0;
      }

      const newSlot = new Slot(slotPayload);
      await newSlot.save({ session });
      return newSlot;
    });

    return successResponse(res, { slot: created }, 'Slot created successfully', 201);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    if (error && error.code === 'SLOT_OVERLAP') {
      return errorResponse(res, error.message, 400);
    }
    if (error && error.code === 11000) {
      return errorResponse(res, 'Duplicate active slot exists for the same provider/date/time/entityType', 400);
    }
    return errorResponse(res, 'Failed to create slot', 500);
    }
  });
};

export const getSlots = async (req, res) => {
  try {
  const { providerId, entityType, startDate, endDate, activeOnly, availableOnly, locationId } = req.query;
    
    const query = {};
    
    // Debug logging
    console.log("[getSlots] Request:", { providerId, entityType, user: req.user ? { id: req.user._id, role: req.user.role } : "none" });
    
    // If providerId provided, use it; otherwise default to current user's slots only when the
    // requester is a provider (hospital/doctor/lab) AND authenticated. 
    // For unauthenticated requests, allow querying all slots.
    if (providerId) {
      query.providerId = providerId;
    } else if (req.user && req.user.role !== ROLES.PATIENT && req.user.role !== ROLES.ADMIN) {
      query.providerId = req.user._id;
    }
    
    // Add locationId filtering for multi-location support
    if (locationId) {
      query.locationId = locationId;
    } else if (req.user && req.user.hospitalData?.parentHospitalId) {
      // If requester is a chain branch, only show own location's slots
      query.locationId = req.user._id;
    }
    
    if (entityType) {
      query.entityType = entityType;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) { const sd = new Date(startDate); sd.setUTCHours(0,0,0,0); query.date.$gte = sd; }
      if (endDate) { const ed = new Date(endDate); ed.setUTCHours(0,0,0,0); query.date.$lte = ed; }
    }
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    if (availableOnly === 'true') {
      // availableOnly implies activeOnly; check both capacity and date window
      query.isActive = true;
      query.availableCapacity = { $gt: 0 };
      
      // Add date filter to check advance booking window
      // Slots must be: today <= slotDate <= today + advanceBookingDays
      // We'll do application-level filtering after fetching since each slot has its own advanceBookingDays
    }
    
    const slots = await Slot.find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('providerId', 'name role');
    
    // Application-level filtering for availableOnly to check booking window
    let filteredSlots = slots;
    if (availableOnly === 'true') {
      const now = new Date();
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      
      filteredSlots = slots.filter(slot => {
        // Extract slot date in UTC
        const slotDateObj = new Date(slot.date);
        const slotDateUTC = new Date(Date.UTC(slotDateObj.getUTCFullYear(), slotDateObj.getUTCMonth(), slotDateObj.getUTCDate(), 0, 0, 0, 0));
        
        // Calculate max booking date
        const maxBookingDateUTC = new Date(todayUTC);
        maxBookingDateUTC.setUTCDate(maxBookingDateUTC.getUTCDate() + (slot.advanceBookingDays || 30));
        
        // Check if slot is within booking window
        return slotDateUTC >= todayUTC && slotDateUTC <= maxBookingDateUTC;
      });
    }
    
    return successResponse(res, { slots: filteredSlots }, 'Slots retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve slots', 500);
  }
};

export const getSlotById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const slot = await Slot.findById(id).populate('providerId', 'name role');
    
    if (!slot) {
      return errorResponse(res, 'Slot not found', 404);
    }
    
    return successResponse(res, { slot }, 'Slot retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve slot', 500);
  }
};

export const updateSlot = async (req, res) => {
  return withTransaction(async (session) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const slot = await Slot.findById(id);
      
      if (!slot) {
        return errorResponse(res, 'Slot not found', 404);
      }
      
      // Verify ownership
      if (!validateSlotOwnership(slot, req.user._id)) {
        return errorResponse(res, 'Access denied: You do not own this slot', 403);
      }
      
      // Whitelist allowed fields
      const allowedFields = ['date', 'startTime', 'endTime', 'capacity', 'isActive', 'advanceBookingDays', 'metadata', 'timeSlots'];
      const filteredUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }
      
      // If time/date changed OR timeSlots provided, validate no overlap
      if (filteredUpdates.date || filteredUpdates.startTime || filteredUpdates.endTime || filteredUpdates.timeSlots) {
        const newDate = filteredUpdates.date ? new Date(filteredUpdates.date) : slot.date;

          // If timeSlots are provided, merge with existing while preserving booked counts
        if (Array.isArray(filteredUpdates.timeSlots) && filteredUpdates.timeSlots.length > 0) {
          const existingTimeSlotsMap = new Map();
          if (Array.isArray(slot.timeSlots)) {
            slot.timeSlots.forEach(ts => {
              existingTimeSlotsMap.set(`${ts.startTime}-${ts.endTime}`, ts);
            });
          }

          const newTimeSlots = filteredUpdates.timeSlots;
          const mergedTimeSlots = [];
          
          // Track which existing slots are kept
          const keptSlots = new Set();

          for (const ts of newTimeSlots) {
            // Basic validation
            if (!ts || typeof ts !== 'object') {
              return errorResponse(res, 'Each timeSlot must be an object', 400);
            }
            if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.startTime) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.endTime)) {
              return errorResponse(res, 'timeSlots must have startTime and endTime in HH:MM format', 400);
            }
            if (!Number.isInteger(ts.capacity) || ts.capacity < 1) {
              return errorResponse(res, 'Each timeSlot must have capacity >= 1', 400);
            }
            if (timeToMinutes(ts.endTime) <= timeToMinutes(ts.startTime)) {
              return errorResponse(res, 'Each timeSlot must have endTime after startTime', 400);
            }

            // Check for existing slot and merge booked count
            const key = `${ts.startTime}-${ts.endTime}`;
            const existingSlot = existingTimeSlotsMap.get(key);
            
            if (existingSlot) {
              keptSlots.add(key);
              // Preserve booked count if not explicitly provided
              const booked = ts.booked !== undefined ? ts.booked : existingSlot.booked || 0;
              
              // Validate capacity >= booked
              if (ts.capacity < booked) {
                return errorResponse(res, `New capacity (${ts.capacity}) cannot be less than booked count (${booked}) for time slot ${ts.startTime}-${ts.endTime}`, 400);
              }
              
              mergedTimeSlots.push({
                ...ts,
                booked
              });
            } else {
              // New slot - initialize with booked=0
              mergedTimeSlots.push({
                ...ts,
                booked: 0
              });
            }
          }

          // Check for removed slots that had bookings
          for (const [key, existingSlot] of existingTimeSlotsMap) {
            if (!keptSlots.has(key) && existingSlot.booked > 0) {
              return errorResponse(res, `Cannot remove time slot ${existingSlot.startTime}-${existingSlot.endTime} that has ${existingSlot.booked} bookings`, 400);
            }
          }

          // Sort and check for overlaps
          const sorted = [...mergedTimeSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          for (let i = 1; i < sorted.length; i++) {
            if (timeToMinutes(sorted[i].startTime) < timeToMinutes(sorted[i - 1].endTime)) {
              return errorResponse(res, 'Provided timeSlots contain overlapping windows', 400);
            }
          }

          // Update filteredUpdates with merged slots
          filteredUpdates.timeSlots = mergedTimeSlots;
          const overlap = await Slot.checkSlotOverlap(slot.providerId, slot.locationId || null, newDate, null, null, slot._id, slot.entityType, newTimeSlots);
          if (overlap) return errorResponse(res, 'Updated timeSlots overlap with existing slots', 400);
        } else {
          const newStartTime = filteredUpdates.startTime || slot.startTime;
          const newEndTime = filteredUpdates.endTime || slot.endTime;
          // Validate endTime > startTime only when legacy fields are present
          if (newStartTime && newEndTime && timeToMinutes(newEndTime) <= timeToMinutes(newStartTime)) {
            return errorResponse(res, 'End time must be after start time', 400);
          }
          const overlap = await Slot.checkSlotOverlap(slot.providerId, slot.locationId || null, newDate, newStartTime, newEndTime, slot._id, slot.entityType);
          if (overlap) return errorResponse(res, 'Updated slot overlaps with existing slot', 400);
        }
      }
      
      // If capacity reduced, validate >= current booked
      if (filteredUpdates.capacity !== undefined && filteredUpdates.capacity < slot.booked) {
        return errorResponse(res, 'Cannot reduce capacity below current bookings', 400);
      }
      
      // Update fields
      Object.assign(slot, filteredUpdates);
      // If switching to timeSlots, explicitly unset legacy fields to avoid mixed semantics
      if (Array.isArray(filteredUpdates.timeSlots) && filteredUpdates.timeSlots.length > 0) {
        slot.startTime = undefined;
        slot.endTime = undefined;
        slot.capacity = undefined;
        slot.booked = 0;
      }
      slot.updatedBy = req.user._id;
      
      await slot.save({ session });
      
      return successResponse(res, { slot }, 'Slot updated successfully');
    } catch (error) {
      if (error.name === 'ValidationError') {
        return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
      }
      return errorResponse(res, 'Failed to update slot', 500);
    }
  });
};

export const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    
    const slot = await Slot.findById(id);
    
    if (!slot) {
      return errorResponse(res, 'Slot not found', 404);
    }
    
    // Verify ownership
    if (!validateSlotOwnership(slot, req.user._id)) {
      return errorResponse(res, 'Access denied: You do not own this slot', 403);
    }
    
    if (slot.booked > 0) {
      // Soft delete
      slot.isActive = false;
      await slot.save();
    } else {
      // Hard delete
      await slot.deleteOne();
    }
    
    return successResponse(res, null, 'Slot deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete slot', 500);
  }
};

export const checkAvailability = async (req, res) => {
  try {
    const { providerId, entityType, date, startTime, endTime } = req.query;
    
    const query = { isActive: true };
    if (providerId) query.providerId = providerId;
    if (entityType) query.entityType = entityType;
    if (date) { const d = new Date(date); d.setUTCHours(0,0,0,0); query.date = d; }

    // Fetch candidate slots (active)
    const slots = await Slot.find(query).populate('providerId', 'name role');

    // If timeSlots are present on slot documents, filter sub-slots by overlap and capacity
    const requestedStart = startTime;
    const requestedEnd = endTime;
    const results = [];

    for (const slot of slots) {
      const sObj = slot.toObject();
      if (Array.isArray(sObj.timeSlots) && sObj.timeSlots.length > 0) {
        // if caller supplied a range, return only sub-slots that overlap and have capacity
        const matching = [];
        for (const ts of sObj.timeSlots) {
          // check overlap only when both requestedStart and requestedEnd provided
          const overlaps = (!requestedStart && !requestedEnd) || (
            requestedStart && requestedEnd
              ? (timeToMinutes(ts.startTime) < timeToMinutes(requestedEnd) && timeToMinutes(ts.endTime) > timeToMinutes(requestedStart))
              : requestedStart
                ? (timeToMinutes(ts.endTime) > timeToMinutes(requestedStart))
                : (timeToMinutes(ts.startTime) < timeToMinutes(requestedEnd))
          );
          const remaining = (ts.capacity || 0) - (ts.booked || 0);
          if (overlaps && remaining > 0) {
            matching.push({ startTime: ts.startTime, endTime: ts.endTime, capacity: ts.capacity, booked: ts.booked || 0, remainingCapacity: remaining });
          }
        }
        if (matching.length > 0) {
          results.push({ slotId: sObj._id, providerId: sObj.providerId, date: sObj.date, entityType: sObj.entityType, timeSlots: matching });
        }
      } else {
        // legacy single-range
        const remaining = (sObj.capacity || 0) - (sObj.booked || 0);
        let include = remaining > 0;
        if (requestedStart || requestedEnd) {
          const startCond = requestedEnd ? (sObj.startTime < requestedEnd) : true;
          const endCond = requestedStart ? (sObj.endTime > requestedStart) : true;
          include = include && startCond && endCond;
        }
        if (include) {
          results.push({ slotId: sObj._id, providerId: sObj.providerId, date: sObj.date, entityType: sObj.entityType, startTime: sObj.startTime, endTime: sObj.endTime, capacity: sObj.capacity, booked: sObj.booked, remainingCapacity: remaining });
        }
      }
    }

    return successResponse(res, { slots: results }, 'Availability checked successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to check availability', 500);
  }
};

export const bulkCreateSlots = async (req, res) => {
  try {
    const { slots } = req.body;
    
    if (!Array.isArray(slots) || slots.length === 0) {
      return errorResponse(res, 'Slots array is required', 400);
    }

    // Determine if requester is chain parent or branch
    const isChainParent = req.user.role === ROLES.HOSPITAL && req.user.hospitalData?.isChain;
    const isChainBranch = req.user.role === ROLES.HOSPITAL && !!req.user.hospitalData?.parentHospitalId;
    
    // Validate each slot
    const validatedSlots = [];
    for (const slotData of slots) {
      const { entityType, date, startTime, endTime, capacity, advanceBookingDays, metadata, timeSlots, locationId: slotLocationId } = slotData;
      
      if (!validateProviderCanCreateEntityType(req.user.role, entityType)) {
        return errorResponse(res, 'Provider role cannot create this entity type', 403);
      }
      
      // Determine effective location ID for this slot
      let effectiveLocationId = null;
      if (isChainBranch) {
        // If requester is a branch, enforce location = self
        effectiveLocationId = req.user._id;
      } else if (isChainParent) {
        // If requester is chain parent, require locationId in each slot
        if (!slotLocationId) {
          return errorResponse(res, 'Chain parent must specify locationId for each slot in bulk creation', 400);
        }
        effectiveLocationId = slotLocationId;
      }
      // Otherwise standalone hospital, locationId stays null
      
      const slotDate = new Date(date);
      // normalize to UTC start-of-day for comparison and storage
      slotDate.setUTCHours(0, 0, 0, 0);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (slotDate < today) {
        return errorResponse(res, 'Slot date cannot be in the past', 400);
      }
      
      // Check if timeSlots array is provided (multi-window slots)
      if (Array.isArray(timeSlots) && timeSlots.length > 0) {
        // Validate each sub-slot using same rules as createSlot()
        for (const ts of timeSlots) {
          if (!ts || typeof ts !== 'object') {
            return errorResponse(res, 'Each timeSlot must be an object', 400);
          }
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.startTime) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.endTime)) {
            return errorResponse(res, 'timeSlots must have startTime and endTime in HH:MM format', 400);
          }
          if (!Number.isInteger(ts.capacity) || ts.capacity < 1) {
            return errorResponse(res, 'Each timeSlot must have capacity >= 1', 400);
          }
          if (timeToMinutes(ts.endTime) <= timeToMinutes(ts.startTime)) {
            return errorResponse(res, 'Each timeSlot must have endTime after startTime', 400);
          }
        }
        
        // Check for internal overlaps within the timeSlots array
        const sorted = [...timeSlots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        for (let i = 1; i < sorted.length; i++) {
          if (timeToMinutes(sorted[i].startTime) < timeToMinutes(sorted[i - 1].endTime)) {
            return errorResponse(res, 'Provided timeSlots contain overlapping windows', 400);
          }
        }
        
        // Check overlap with existing slots using timeSlots array
        const overlap = await Slot.checkSlotOverlap(req.user._id, effectiveLocationId, slotDate, null, null, null, entityType, timeSlots);
        if (overlap) {
          return errorResponse(res, 'Slot overlaps with existing slot', 400);
        }
        
        // Build payload with timeSlots and explicit booked: 0 for each
        validatedSlots.push({
          providerId: req.user._id,
          locationId: effectiveLocationId,
          providerRole: req.user.role,
          entityType,
          date: normalizeDate(slotDate),
          timeSlots: timeSlots.map(ts => ({
            startTime: ts.startTime,
            endTime: ts.endTime,
            capacity: ts.capacity,
            booked: 0
          })),
          advanceBookingDays: advanceBookingDays || 30,
          metadata,
          createdBy: req.user._id,
          isActive: true
        });
      } else {
        // Legacy single-range validation
        if (!startTime || !endTime || capacity === undefined) {
          return errorResponse(res, 'Either startTime/endTime/capacity or timeSlots array must be provided', 400);
        }
        
        if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
          return errorResponse(res, 'End time must be after start time', 400);
        }
        
        const overlap = await Slot.checkSlotOverlap(req.user._id, effectiveLocationId, slotDate, startTime, endTime, null, entityType);
        if (overlap) {
          return errorResponse(res, 'Slot overlaps with existing slot', 400);
        }
        
        validatedSlots.push({
          providerId: req.user._id,
          locationId: effectiveLocationId,
          providerRole: req.user.role,
          entityType,
          date: normalizeDate(slotDate),
          startTime,
          endTime,
          capacity,
          booked: 0,
          advanceBookingDays: advanceBookingDays || 30,
          metadata,
          createdBy: req.user._id,
          isActive: true
        });
      }
    }
    
    try {
      const createdSlots = await Slot.insertMany(validatedSlots);
      return successResponse(res, { count: createdSlots.length }, 'Slots created successfully', 201);
    } catch (error) {
      if (error && error.code === 11000) {
        return errorResponse(res, 'Duplicate active slot exists for the same provider/date/time/entityType', 400);
      }
      throw error;
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to create slots', 500);
  }
};

// Helper Functions
export const validateSlotOwnership = (slot, userId) => {
  return slot.providerId.toString() === userId.toString();
};

export const validateProviderCanCreateEntityType = (providerRole, entityType) => {
  if (providerRole === ROLES.HOSPITAL) {
    return [BOOKING_TYPES.OPD, BOOKING_TYPES.IPD].includes(entityType);
  }
  if (providerRole === ROLES.DOCTOR) {
    return entityType === BOOKING_TYPES.OPD;
  }
  if (providerRole === ROLES.LAB) {
    return entityType === BOOKING_TYPES.LAB;
  }
  return false;
};

export const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Use checkSlotOverlap from model instead which uses shared timeToMinutes