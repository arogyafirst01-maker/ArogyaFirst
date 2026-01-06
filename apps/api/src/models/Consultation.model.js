const mongoose = require('mongoose');
const { generateConsultationId, CONSULTATION_STATUS, CONSULTATION_MODE } = require('@arogyafirst/shared');

const consultationNoteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['DOCTOR', 'PATIENT'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { _id: false });

const consultationSchema = new mongoose.Schema({
  consultationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    index: true
  },
  mode: {
    type: String,
    enum: Object.values(CONSULTATION_MODE),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CONSULTATION_STATUS),
    default: CONSULTATION_STATUS.SCHEDULED,
    index: true
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  startedAt: {
    type: Date
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number // in minutes
  },
  notes: [consultationNoteSchema],
  messages: [chatMessageSchema], // Chat history for video consultations
  diagnosis: {
    type: String,
    maxlength: 1000
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  agoraChannelName: {
    type: String
  },
  agoraToken: {
    type: String,
    select: false // Don't return token in queries for security
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
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

// Compound indexes for efficient queries
consultationSchema.index({ doctorId: 1, scheduledAt: -1, status: 1 });
consultationSchema.index({ patientId: 1, scheduledAt: -1 });
consultationSchema.index({ bookingId: 1 });

// Static Methods
consultationSchema.statics.findByDoctor = async function(doctorId, filters = {}) {
  const query = { doctorId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate || filters.endDate) {
    query.scheduledAt = {};
    if (filters.startDate) {
      query.scheduledAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.scheduledAt.$lte = new Date(filters.endDate);
    }
  }
  
  return this.find(query)
    .populate('patientId', 'name email phone patientData')
    .sort({ scheduledAt: -1 })
    .lean();
};

consultationSchema.statics.findByPatient = async function(patientId, filters = {}) {
  const query = { patientId };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate || filters.endDate) {
    query.scheduledAt = {};
    if (filters.startDate) {
      query.scheduledAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.scheduledAt.$lte = new Date(filters.endDate);
    }
  }
  
  return this.find(query)
    .populate('doctorId', 'name email doctorData')
    .sort({ scheduledAt: -1 })
    .lean();
};

consultationSchema.statics.findUpcoming = async function(doctorId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    doctorId,
    status: CONSULTATION_STATUS.SCHEDULED,
    scheduledAt: { $gte: today }
  })
    .populate('patientId', 'name email phone patientData')
    .sort({ scheduledAt: 1 })
    .lean();
};

// Instance Methods
consultationSchema.methods.start = async function() {
  if (this.status !== CONSULTATION_STATUS.SCHEDULED) {
    throw new Error('Can only start a scheduled consultation');
  }
  
  this.status = CONSULTATION_STATUS.IN_PROGRESS;
  this.startedAt = new Date();
  return this.save();
};

consultationSchema.methods.complete = async function(finalNotes, diagnosis) {
  if (this.status !== CONSULTATION_STATUS.IN_PROGRESS) {
    throw new Error('Can only complete an in-progress consultation');
  }
  
  this.status = CONSULTATION_STATUS.COMPLETED;
  this.endedAt = new Date();
  
  // Calculate duration in minutes
  if (this.startedAt && this.endedAt) {
    const durationMs = this.endedAt - this.startedAt;
    this.duration = Math.round(durationMs / 60000);
  }
  
  if (finalNotes) {
    this.notes.push({
      content: finalNotes,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  if (diagnosis) {
    this.diagnosis = diagnosis;
  }
  
  return this.save();
};

consultationSchema.methods.cancel = async function(reason) {
  if (this.status === CONSULTATION_STATUS.COMPLETED) {
    throw new Error('Cannot cancel a completed consultation');
  }
  
  this.status = CONSULTATION_STATUS.CANCELLED;
  
  if (reason) {
    this.metadata = {
      ...this.metadata,
      cancellationReason: reason,
      cancelledAt: new Date()
    };
  }
  
  return this.save();
};

consultationSchema.methods.addNote = async function(content) {
  this.notes.push({
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return this.save();
};

// Pre-save Hooks
consultationSchema.pre('save', function(next) {
  // Validate scheduledAt is not in the past for new consultations
  if (this.isNew && this.scheduledAt < new Date()) {
    return next(new Error('Scheduled time cannot be in the past'));
  }
  
  // Calculate duration if both timestamps are set
  if (this.startedAt && this.endedAt && !this.duration) {
    const durationMs = this.endedAt - this.startedAt;
    this.duration = Math.round(durationMs / 60000);
  }
  
  // Validate status transitions using Mongoose's built-in tracking
  if (!this.isNew && this.isModified('status')) {
    const validTransitions = {
      [CONSULTATION_STATUS.SCHEDULED]: [CONSULTATION_STATUS.IN_PROGRESS, CONSULTATION_STATUS.CANCELLED, CONSULTATION_STATUS.NO_SHOW],
      [CONSULTATION_STATUS.IN_PROGRESS]: [CONSULTATION_STATUS.COMPLETED, CONSULTATION_STATUS.CANCELLED],
      [CONSULTATION_STATUS.COMPLETED]: [],
      [CONSULTATION_STATUS.CANCELLED]: [],
      [CONSULTATION_STATUS.NO_SHOW]: []
    };
    
    // Use $locals to store original status from pre('init') hook
    const originalStatus = this.$locals.originalStatus || CONSULTATION_STATUS.SCHEDULED;
    const newStatus = this.status;
    
    if (!validTransitions[originalStatus]?.includes(newStatus)) {
      return next(new Error(`Invalid status transition from ${originalStatus} to ${newStatus}`));
    }
  }
  
  // Generate consultation ID if not set (allow pre-set IDs to pass through)
  if (!this.consultationId) {
    this.consultationId = generateConsultationId();
  }
  
  next();
});

// Store original status when document is loaded from DB
consultationSchema.post('init', function(doc) {
  doc.$locals.originalStatus = doc.status;
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;;
