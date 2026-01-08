import mongoose from 'mongoose';
import { SHIFT_TYPES, SCHEDULE_STATUS } from '@arogyafirst/shared';

const staffScheduleSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    staffId: {
      type: Number, // Array index in hospital.hospitalData.staff
      required: true,
      min: 0,
    },
    staffSnapshot: {
      name: { type: String, required: true },
      role: { type: String, required: true },
      department: { type: String },
      contactPhone: { type: String },
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    shiftType: {
      type: String,
      enum: Object.values(SHIFT_TYPES),
      required: true,
    },
    startTime: {
      type: String, // HH:MM format
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Start time must be in HH:MM format',
      },
    },
    endTime: {
      type: String, // HH:MM format
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format',
      },
    },
    department: {
      type: String,
      index: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: Object.values(SCHEDULE_STATUS),
      default: SCHEDULE_STATUS.SCHEDULED,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
staffScheduleSchema.index({ hospitalId: 1, date: 1, staffId: 1 });
staffScheduleSchema.index({ hospitalId: 1, date: 1, department: 1 });

// Pre-save validation
staffScheduleSchema.pre('save', function(next) {
  // Validate endTime > startTime
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  // Validate date is not in the past (only for new documents)
  if (this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(this.date);
    scheduleDate.setHours(0, 0, 0, 0);
    
    if (scheduleDate < today) {
      return next(new Error('Schedule date cannot be in the past'));
    }
  }
  
  next();
});

// Static method to find schedules by hospital with filters
staffScheduleSchema.statics.findByHospital = function(hospitalId, filters = {}) {
  const query = { hospitalId };
  
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) {
      query.date.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.date.$lte = new Date(filters.endDate);
    }
  }
  
  if (filters.department) {
    query.department = filters.department;
  }
  
  if (filters.staffId) {
    query.staffId = filters.staffId;
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  return this.find(query).sort({ date: 1, startTime: 1 });
};

// Static method to find schedules by staff member
staffScheduleSchema.statics.findByStaff = function(hospitalId, staffId, filters = {}) {
  const query = { hospitalId, staffId };
  
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) {
      query.date.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.date.$lte = new Date(filters.endDate);
    }
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  return this.find(query).sort({ date: 1, startTime: 1 });
};

const StaffSchedule = mongoose.model('StaffSchedule', staffScheduleSchema);

export default StaffSchedule;
