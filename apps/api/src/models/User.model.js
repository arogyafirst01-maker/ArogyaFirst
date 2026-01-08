import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, VERIFICATION_STATUS } from '@arogyafirst/shared';

// Define role-specific subdocument schemas
const patientDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String },
  dateOfBirth: { type: Date, required: true },
  aadhaarLast4: { type: String }
}, { _id: false });

const hospitalDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  legalDocuments: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    format: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],
  doctors: [new mongoose.Schema({
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    qualification: { type: String, required: true },
    experience: { type: Number, required: true, min: 0 },
    contactPhone: { type: String, required: true },
    email: { type: String },
    schedule: { type: String },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: false })],
  labs: [new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    location: { type: String },
    contactPhone: { type: String },
    availableTests: [{ type: String }],
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: false })],
  beds: [new mongoose.Schema({
    bedNumber: { type: String, required: true },
    type: { type: String, required: true, enum: ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'] },
    floor: { type: String },
    ward: { type: String },
    isOccupied: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: false })],
  pharmacies: [new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String },
    contactPhone: { type: String, required: true },
    operatingHours: { type: String },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: false })],
  staff: [new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    department: { type: String },
    contactPhone: { type: String, required: true },
    email: { type: String },
    shift: { type: String },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: false })],
  // Multi-location chain support
  parentHospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isChain: {
    type: Boolean,
    default: false,
    index: true
  },
  chainName: {
    type: String
  },
  branchCode: {
    type: String,
    sparse: true
  },
  branchLocations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { _id: false });

const doctorDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qualification: { type: String, required: true },
  experience: { type: Number, required: true },
  location: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  aadhaarLast4: { type: String, required: true },
  specialization: { type: String, required: true },
  hospitalId: { type: String }, // Optional for independent doctors
  practiceDocuments: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    format: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],
  slots: [new mongoose.Schema({
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1, default: 1 },
    booked: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    consultationType: { type: String, enum: ['IN_PERSON', 'TELECONSULTATION', 'BOTH'], default: 'IN_PERSON' },
    createdAt: { type: Date, default: Date.now }
  }, { _id: false })],
  prescriptionTemplates: [new mongoose.Schema({
    templateId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    medicines: [{
      name: { type: String, required: true, trim: true },
      dosage: { type: String, required: true, trim: true },
      quantity: { type: Number, required: true, min: 1 },
      instructions: { type: String, trim: true },
      duration: { type: String, trim: true }
    }],
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { _id: false })]
}, { _id: false });

const labDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  machines: [new mongoose.Schema({
    name: { type: String, required: true },
    model: { type: String, required: true },
    manufacturer: { type: String },
    purchaseDate: { type: Date },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    status: { type: String, enum: ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'], default: 'OPERATIONAL' },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
    qcRecords: {
      type: [new mongoose.Schema({
        qcId: { type: String, required: true },
        date: { type: Date, required: true },
        testType: { type: String, required: true },
        result: { type: String, enum: ['PASS', 'FAIL', 'WARNING'], required: true },
        parameters: [{
          name: { type: String, required: true },
          value: { type: String, required: true },
          unit: { type: String },
          referenceRange: { type: String },
          status: { type: String, enum: ['WITHIN_RANGE', 'OUT_OF_RANGE'], required: true }
        }],
        performedBy: { type: String, required: true },
        notes: { type: String },
        createdAt: { type: Date, default: Date.now }
      }, { _id: false })],
      default: []
    }
  })],
  facilities: [{ type: String }]
}, { _id: false });

const pharmacyDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  medicines: [new mongoose.Schema({
    name: { type: String, required: true },
    nameNormalized: { type: String },
    genericName: { type: String },
    manufacturer: { type: String },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    price: { type: Number, required: true, min: 0 },
    batchNumber: { type: String },
    batchNumberNormalized: { type: String },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  })],
  suppliers: [new mongoose.Schema({
    name: { type: String, required: true },
    contactPerson: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    gstin: { type: String },
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }, { _id: true })],
  purchaseOrders: [new mongoose.Schema({
    poNumber: { type: String },
    supplierId: { type: mongoose.Schema.Types.ObjectId },
    supplierSnapshot: {
      name: String,
      phone: String,
      email: String
    },
    items: [new mongoose.Schema({
      medicineName: String,
      genericName: String,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      batchNumber: String,
      expiryDate: Date,
      quantityReceived: { type: Number, default: 0 }
    }, { _id: false })],
    totalAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'ORDERED', 'PARTIAL', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    orderDate: { type: Date, default: Date.now },
    expectedDeliveryDate: Date,
    approvedBy: String,
    approvedAt: Date,
    receivedAt: Date,
    notes: String,
    statusHistory: [new mongoose.Schema({
      status: String,
      timestamp: { type: Date, default: Date.now },
      updatedBy: String,
      notes: String
    }, { _id: false })],
    createdAt: { type: Date, default: Date.now }
  }, { _id: true })]
}, { _id: false });

const verificationNoteSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['APPROVED', 'REJECTED', 'PENDING'], required: true },
  note: { type: String },
  timestamp: { type: Date, default: Date.now, required: true }
}, { _id: false });

// Settings schema for user preferences
const settingsSchema = new mongoose.Schema({
  notificationPreferences: {
    emailNotifications: {
      bookings: { type: Boolean, default: true },
      prescriptions: { type: Boolean, default: true },
      referrals: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    },
    smsNotifications: {
      bookings: { type: Boolean, default: true },
      prescriptions: { type: Boolean, default: true },
      referrals: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    },
    pushNotifications: {
      bookings: { type: Boolean, default: true },
      prescriptions: { type: Boolean, default: true },
      referrals: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true }
    }
  },
  language: {
    type: String,
    enum: ['en', 'hi'],
    default: 'en'
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE', 'CONTACTS_ONLY'],
      default: 'PUBLIC'
    },
    shareDataForResearch: { type: Boolean, default: false },
    allowMarketingCommunications: { type: Boolean, default: false }
  },
  accessibility: {
    highContrast: { type: Boolean, default: false },
    fontSize: {
      type: String,
      enum: ['SMALL', 'MEDIUM', 'LARGE'],
      default: 'MEDIUM'
    }
  }
}, { _id: false });

// Main User schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  emailNormalized: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    required: true,
    enum: [ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY, ROLES.ADMIN]
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: function() {
      return [ROLES.PATIENT, ROLES.LAB, ROLES.PHARMACY].includes(this.role);
    }
  },
  verificationStatus: {
    type: String,
    enum: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED],
    default: VERIFICATION_STATUS.PENDING
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false }
  }],
  verificationNotes: [verificationNoteSchema],
  // Role-specific subdocuments
  patientData: patientDataSchema,
  hospitalData: hospitalDataSchema,
  doctorData: doctorDataSchema,
  labData: labDataSchema,
  pharmacyData: pharmacyDataSchema,
  // User settings (role-agnostic)
  settings: { type: settingsSchema, default: () => ({}) },
  // Terms and conditions acceptance
  // Note: required: true removed to support legacy users; enforcement is done via validation middleware at registration
  termsAccepted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to speed up admin verification queue queries
userSchema.index({ verificationStatus: 1, role: 1, createdAt: 1 });
// Additional compound index to support sorting by email in admin queries
userSchema.index({ verificationStatus: 1, role: 1, emailNormalized: 1 });
// Index on patientData.phone for efficient phone-based login lookups
userSchema.index({ 'patientData.phone': 1 });
// Multi-location chain indexes
userSchema.index({ 'hospitalData.parentHospitalId': 1, 'hospitalData.branchCode': 1 }, { unique: true, sparse: true });
userSchema.index({ 'hospitalData.isChain': 1 });

// Virtual property to check if hospital is part of a chain
userSchema.virtual('isChainBranch').get(function() {
  return this.role === ROLES.HOSPITAL && !!this.hospitalData?.parentHospitalId;
});

// Pre-validate hook: Validate role-specific data exists
userSchema.pre('validate', function(next) {
  const role = this.role;
  if (role === ROLES.PATIENT && !this.patientData) {
    return next(new Error('Patient data is required for PATIENT role'));
  }
  if (role === ROLES.HOSPITAL && !this.hospitalData) {
    return next(new Error('Hospital data is required for HOSPITAL role'));
  }
  if (role === ROLES.DOCTOR && !this.doctorData) {
    return next(new Error('Doctor data is required for DOCTOR role'));
  }
  if (role === ROLES.LAB && !this.labData) {
    return next(new Error('Lab data is required for LAB role'));
  }
  if (role === ROLES.PHARMACY && !this.pharmacyData) {
    return next(new Error('Pharmacy data is required for PHARMACY role'));
  }
  
  // Validate chain-related fields
  if (role === ROLES.HOSPITAL && this.hospitalData) {
    // Prevent a hospital from being both chain parent and branch
    if (this.hospitalData.isChain && this.hospitalData.parentHospitalId) {
      return next(new Error('Hospital cannot be both a chain parent and a branch'));
    }
    
    // Ensure chain parent has branchLocations array
    if (this.hospitalData.isChain && (!this.hospitalData.branchLocations || !Array.isArray(this.hospitalData.branchLocations))) {
      this.hospitalData.branchLocations = [];
    }
    
    // Ensure branch has branchCode
    if (this.hospitalData.parentHospitalId && !this.hospitalData.branchCode) {
      return next(new Error('Branch code is required for chain branch hospitals'));
    }
  }
  
  next();
});

// Pre-save hook: Hash password if modified, normalize email, and validate chain hierarchy
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  this.emailNormalized = this.email.toLowerCase().trim();
  
  // Validate chain hierarchy for branch hospitals
  if (this.role === ROLES.HOSPITAL && this.hospitalData?.parentHospitalId && this.isModified('hospitalData.parentHospitalId')) {
    const parentUser = await mongoose.model('User').findById(this.hospitalData.parentHospitalId);
    if (!parentUser) {
      return next(new Error('Referenced parent hospital does not exist'));
    }
    if (parentUser.role !== ROLES.HOSPITAL) {
      return next(new Error('Parent must be a hospital user'));
    }
    if (!parentUser.hospitalData?.isChain) {
      return next(new Error('Parent hospital must be marked as a chain'));
    }
  }
  
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.addRefreshToken = function(token, expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  this.refreshTokens.push({
    token,
    createdAt: new Date(),
    expiresAt,
    isRevoked: false
  });
};

userSchema.methods.revokeRefreshToken = function(token) {
  const tokenDoc = this.refreshTokens.find(t => t.token === token);
  if (tokenDoc) {
    tokenDoc.isRevoked = true;
  }
};

userSchema.methods.revokeAllRefreshTokens = function() {
  this.refreshTokens.forEach(token => {
    token.isRevoked = true;
  });
};

userSchema.methods.pruneRefreshTokens = function(maxTokens = 50) {
  // Remove expired tokens - keep only non-expired tokens
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(token => token.expiresAt > now);

  // Sort by createdAt descending and keep only the most recent maxTokens
  if (this.refreshTokens.length > maxTokens) {
    this.refreshTokens.sort((a, b) => b.createdAt - a.createdAt);
    this.refreshTokens = this.refreshTokens.slice(0, maxTokens);
  }
};

// Virtual property: displayName for consistent name display across all roles
userSchema.virtual('displayName').get(function() {
  switch (this.role) {
    case ROLES.PATIENT:
      return this.patientData?.name || 'Unknown Patient';
    case ROLES.HOSPITAL:
      return this.hospitalData?.name || 'Unknown Hospital';
    case ROLES.DOCTOR:
      return this.doctorData?.name || 'Unknown Doctor';
    case ROLES.LAB:
      return this.labData?.name || 'Unknown Lab';
    case ROLES.PHARMACY:
      return this.pharmacyData?.name || 'Unknown Pharmacy';
    case ROLES.ADMIN:
      return 'Admin';
    default:
      return this.email || 'Unknown User';
  }
});

// Enable virtuals in JSON responses
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ emailNormalized: email.toLowerCase().trim() });
};

userSchema.statics.findByPhone = function(phone) {
  const normalizedPhone = String(phone).trim();
  return this.findOne({ 'patientData.phone': normalizedPhone });
};

userSchema.statics.findByUniqueId = function(uniqueId) {
  return this.findOne({ uniqueId });
};

const User = mongoose.model('User', userSchema);

export default User;