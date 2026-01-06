const mongoose = require('mongoose');
const { ROLES, BOOKING_TYPES } = require('@arogyafirst/shared');
const { timeToMinutes } = require('@arogyafirst/shared/utils');

const normalizeDateToStartOfDayUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const slotSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Location context for multi-location hospitals
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  providerRole: {
    type: String,
    enum: [ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB],
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: [BOOKING_TYPES.OPD, BOOKING_TYPES.IPD, BOOKING_TYPES.LAB],
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Support multiple time windows per date
  timeSlots: {
    type: [new mongoose.Schema({
      startTime: {
        type: String,
        required: true,
        validate: {
          validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
          message: 'Start time must be in HH:MM format (24-hour)'
        }
      },
      endTime: {
        type: String,
        required: true,
        validate: {
          validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
          message: 'End time must be in HH:MM format (24-hour)'
        }
      },
      capacity: { type: Number, required: true, min: [1, 'Capacity must be at least 1'], default: 1 },
      booked: { type: Number, default: 0, min: [0, 'Booked count cannot be negative'] }
    }, { _id: false })],
    default: undefined
  },
  startTime: {
    type: String,
    required: function() { return !Array.isArray(this.timeSlots) || this.timeSlots.length === 0; },
    validate: {
      validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String,
    required: function() { return !Array.isArray(this.timeSlots) || this.timeSlots.length === 0; },
    validate: {
      validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  capacity: {
    type: Number,
    required: function() { return !Array.isArray(this.timeSlots) || this.timeSlots.length === 0; },
    min: [1, 'Capacity must be at least 1'],
    default: 1
  },
  booked: {
    type: Number,
    default: 0,
    min: [0, 'Booked count cannot be negative']
  },
  // Persisted aggregate available capacity to accelerate availability queries
  availableCapacity: {
    type: Number,
    default: 0,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  advanceBookingDays: {
    type: Number,
    default: Number(process.env.DEFAULT_ADVANCE_BOOKING_DAYS || 30),
    min: [0, 'Advance booking days cannot be negative']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Indexes
slotSchema.index({ providerId: 1, date: 1, entityType: 1 });
slotSchema.index({ locationId: 1, date: 1, isActive: 1 });
slotSchema.index({ providerId: 1, locationId: 1, date: 1, entityType: 1 });
slotSchema.index({ date: 1, entityType: 1, isActive: 1 });
slotSchema.index({ providerId: 1, date: 1 }, { partialFilterExpression: { isActive: true } });
// Prevent exact duplicate active slots for same provider/date/time/type (only for single-range slots without timeSlots array)
// Use existence check for startTime/endTime instead of $not for timeSlots since MongoDB doesn't support $not in partial filters
slotSchema.index({ providerId: 1, entityType: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true, partialFilterExpression: { isActive: true, startTime: { $exists: true }, endTime: { $exists: true } } });
// Index to support fast available-only queries
slotSchema.index({ isActive: 1, date: 1, entityType: 1, availableCapacity: -1 });
// Compound index for providerRole/entityType/date/availableCapacity
slotSchema.index({ providerRole: 1, entityType: 1, date: 1, availableCapacity: -1 });
slotSchema.index({ createdAt: -1 });

// Virtual fields
slotSchema.virtual('isFull').get(function() {
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    return this.timeSlots.every(ts => (ts.booked || 0) >= ts.capacity);
  }
  return this.booked >= this.capacity;
});

slotSchema.virtual('isBookable').get(function() {
  // ALL DATE COMPARISONS MUST USE UTC TO MATCH DATABASE STORAGE
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const maxBookingDateUTC = new Date(todayUTC);
  maxBookingDateUTC.setUTCDate(maxBookingDateUTC.getUTCDate() + this.advanceBookingDays);
  
  const slotDate = new Date(this.date);
  const slotDateUTC = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(), 0, 0, 0, 0));
  
  if (!this.isActive) return false;
  if (slotDateUTC > maxBookingDateUTC || slotDateUTC < todayUTC) return false;
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    return this.timeSlots.some(ts => (ts.booked || 0) < ts.capacity);
  }
  return !this.isFull;
});

// Instance methods
slotSchema.methods.canBook = function() {
  return this.isBookable;
};

// Concurrency-safe increment/decrement using conditional findOneAndUpdate
slotSchema.methods.incrementBooked = async function(session = null) {
  const Slot = this.constructor;
  // If slot uses timeSlots, require caller to pass matcher via 'session' param as { matcher: { startTime, endTime } } or pass null to fail
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    throw new Error('Use atomicSlotBooking with a timeSlot matcher for slots with multiple time windows');
  }
  const updated = await Slot.findOneAndUpdate(
    { _id: this._id, booked: { $lt: this.capacity } },
    { $inc: { booked: 1 } },
    { new: true, session }
  );
  if (!updated) {
    throw new Error('Slot is full or update failed');
  }
  // persist recomputed availableCapacity
  const newAvailable = (updated.capacity || 0) - (updated.booked || 0);
  await Slot.updateOne({ _id: this._id }, { $set: { availableCapacity: newAvailable } }, { session });
  this.booked = updated.booked;
  this.availableCapacity = newAvailable;
  return this.booked;
};

slotSchema.methods.decrementBooked = async function(session = null) {
  const Slot = this.constructor;
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    throw new Error('Use atomicSlotBooking with a timeSlot matcher for slots with multiple time windows');
  }
  const updated = await Slot.findOneAndUpdate(
    { _id: this._id, booked: { $gt: 0 } },
    { $inc: { booked: -1 } },
    { new: true, session }
  );
  if (!updated) {
    throw new Error('Cannot decrement booked count below 0 or update failed');
  }
  const newAvailable = (updated.capacity || 0) - (updated.booked || 0);
  await Slot.updateOne({ _id: this._id }, { $set: { availableCapacity: newAvailable } }, { session });
  this.booked = updated.booked;
  this.availableCapacity = newAvailable;
  return this.booked;
};

slotSchema.methods.checkOverlap = function(otherSlot) {
  if (this.date.getTime() !== otherSlot.date.getTime()) {
    return false;
  }
  const thisStart = timeToMinutes(this.startTime);
  const thisEnd = timeToMinutes(this.endTime);
  const otherStart = timeToMinutes(otherSlot.startTime);
  const otherEnd = timeToMinutes(otherSlot.endTime);
  return thisStart < otherEnd && otherStart < thisEnd;
};

// Static methods
slotSchema.statics.findAvailableSlots = function(filters) {
  const query = { isActive: true, $expr: { $lt: ['$booked', '$capacity'] } };
  if (filters.providerId) query.providerId = filters.providerId;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = normalizeDateToStartOfDayUTC(filters.startDate);
    if (filters.endDate) query.date.$lte = normalizeDateToStartOfDayUTC(filters.endDate);
  }
  return this.find(query).sort({ date: 1, startTime: 1 });
};

slotSchema.statics.findByProvider = function(providerId, filters = {}) {
  const query = { providerId };
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = normalizeDateToStartOfDayUTC(filters.startDate);
    if (filters.endDate) query.date.$lte = normalizeDateToStartOfDayUTC(filters.endDate);
  }
  if (filters.activeOnly) query.isActive = true;
  if (filters.availableOnly) query.$expr = { $lt: ['$booked', '$capacity'] };
  return this.find(query).sort({ date: 1, startTime: 1 });
};

slotSchema.statics.checkSlotOverlap = async function(providerId, locationId, date, startTime, endTime, excludeSlotId = null, entityType = null, newTimeSlots = null, session = null) {
  const normalizedDate = normalizeDateToStartOfDayUTC(date);

  // Build base query to fetch existing active slots for the provider/date/location
  const baseQuery = { providerId, date: normalizedDate, isActive: true };
  if (locationId) baseQuery.locationId = locationId;
  if (entityType) baseQuery.entityType = entityType;
  if (excludeSlotId) baseQuery._id = { $ne: excludeSlotId };

  const existingSlotsQuery = this.find(baseQuery);
  if (session) existingSlotsQuery.session(session);
  const existingSlots = await existingSlotsQuery.lean();

  const overlaps = (aStart, aEnd, bStart, bEnd) => {
    // use numeric minutes comparisons to avoid string ordering problems
    const aS = timeToMinutes(aStart);
    const aE = timeToMinutes(aEnd);
    const bS = timeToMinutes(bStart);
    const bE = timeToMinutes(bEnd);
    return aS < bE && bS < aE;
  };

  // If caller supplied an array of new timeSlots, compare all new sub-slots against existing
  if (Array.isArray(newTimeSlots) && newTimeSlots.length > 0) {
    for (const nts of newTimeSlots) {
      const ns = nts.startTime;
      const ne = nts.endTime;
      for (const es of existingSlots) {
        if (Array.isArray(es.timeSlots) && es.timeSlots.length > 0) {
          for (const ets of es.timeSlots) {
            if (overlaps(ns, ne, ets.startTime, ets.endTime)) return true;
          }
        } else if (es.startTime && es.endTime) {
          if (overlaps(ns, ne, es.startTime, es.endTime)) return true;
        }
      }
    }
    return false;
  }

  // If caller provided a single-range (startTime/endTime) we must also check existing multi-window slots
  if (!Array.isArray(newTimeSlots) || newTimeSlots.length === 0) {
    if (startTime && endTime) {
      for (const es of existingSlots) {
        if (Array.isArray(es.timeSlots) && es.timeSlots.length > 0) {
          for (const ets of es.timeSlots) {
            if (overlaps(startTime, endTime, ets.startTime, ets.endTime)) return true;
          }
        }
      }
    }
  }

  // Two-phase check for mixed timeSlots/single-range slots:
  
  // 1. Check against timeSlots-based documents
  const timeSlotQuery = {
    providerId,
    date: normalizedDate,
    isActive: true,
    timeSlots: { $exists: true, $ne: [] },
  };
  if (locationId) timeSlotQuery.locationId = locationId;
  if (entityType) timeSlotQuery.entityType = entityType;
  if (excludeSlotId) timeSlotQuery._id = { $ne: excludeSlotId };

  const timeSlotDocs = await this.find(timeSlotQuery).session(session || null);
  for (const doc of timeSlotDocs) {
    for (const ts of doc.timeSlots) {
      if (overlaps(startTime, endTime, ts.startTime, ts.endTime)) return true;
    }
  }

  // 2. Check against single-range slots
  const singleRangeQuery = {
    providerId,
    date: normalizedDate,
    isActive: true,
    timeSlots: { $exists: false },
    startTime: { $exists: true },
    endTime: { $exists: true }
  };
  if (locationId) singleRangeQuery.locationId = locationId;
  if (entityType) singleRangeQuery.entityType = entityType;
  if (excludeSlotId) singleRangeQuery._id = { $ne: excludeSlotId };

  const overlappingQuery = this.find(singleRangeQuery);
  if (session) overlappingQuery.session(session);
  const singleRangeSlots = await overlappingQuery;
  
  // Check for overlaps in application code (since MongoDB string comparison doesn't work for times)
  for (const slot of singleRangeSlots) {
    if (overlaps(startTime, endTime, slot.startTime, slot.endTime)) {
      return true;
    }
  }
  
  return false;
};

// Pre-save validation
slotSchema.pre('save', async function(next) {
  // If using timeSlots array, validate each sub-slot
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    // Validate each sub-slot times and capacities
    for (const ts of this.timeSlots) {
      if (timeToMinutes(ts.endTime) <= timeToMinutes(ts.startTime)) {
        return next(new Error('End time must be after start time for each timeSlot'));
      }
      if (typeof ts.booked !== 'number' || isNaN(ts.booked)) {
        return next(new Error('booked must be an explicit number for each timeSlot'));
      }
      if (ts.booked > ts.capacity) {
        return next(new Error('Booked count cannot exceed capacity for a timeSlot'));
      }
    }
    // Check for internal overlaps among provided timeSlots
    const slotsSorted = [...this.timeSlots].sort((a,b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < slotsSorted.length; i++) {
      if (timeToMinutes(slotsSorted[i].startTime) < timeToMinutes(slotsSorted[i-1].endTime)) {
        return next(new Error('timeSlots contain overlapping windows'));
      }
    }
    // When timeSlots are present, unset legacy single-range fields to avoid mixed semantics
    this.startTime = undefined;
    this.endTime = undefined;
    this.capacity = undefined;
    // set top-level booked to 0 (bookings tracked in sub-slots)
    this.booked = 0;
  } else {
    // Legacy single-range validation
    if (timeToMinutes(this.endTime) <= timeToMinutes(this.startTime)) {
      return next(new Error('End time must be after start time'));
    }
    // Validate booked <= capacity
    if (this.booked > this.capacity) {
      return next(new Error('Booked count cannot exceed capacity'));
    }
  }

  // Validate date is not in the past
  const now = normalizeDateToStartOfDayUTC(new Date());
  const slotDate = normalizeDateToStartOfDayUTC(this.date);
  if (slotDate < now) {
    return next(new Error('Slot date cannot be in the past'));
  }

  // Normalize date to start of day UTC
  this.date = normalizeDateToStartOfDayUTC(this.date);
  
  // Validate providerRole matches the role of providerId
  const User = mongoose.model('User');
  const provider = await User.findById(this.providerId).select('role');
  if (!provider) {
    return next(new Error('Provider not found'));
  }
  if (provider.role !== this.providerRole) {
    return next(new Error('Provider role mismatch'));
  }

  // Compute persisted availableCapacity for fast queries
  if (Array.isArray(this.timeSlots) && this.timeSlots.length > 0) {
    this.availableCapacity = this.timeSlots.reduce((sum, ts) => sum + ((ts.capacity || 0) - (ts.booked || 0)), 0);
  } else {
    this.availableCapacity = (this.capacity || 0) - (this.booked || 0);
  }
  
  next();
});

// Add index to support sub-slot queries
slotSchema.index({ 
  providerId: 1, 
  date: 1, 
  'timeSlots.startTime': 1, 
  'timeSlots.endTime': 1 
});

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;;