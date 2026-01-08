import User from '../models/User.model.js';
import Booking from '../models/Booking.model.js';
import StaffSchedule from '../models/StaffSchedule.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { uploadToCloudinary, deleteFromCloudinary, validateFileType } from '../utils/fileUpload.util.js';
import { updateUserSettings } from '../utils/settings.util.js';
import { generateCSV, generatePDF, formatDateForExport, sanitizeFilename, formatCurrency } from '../utils/export.util.js';
import { ROLES, SCHEDULE_STATUS, PAYMENT_STATUS, BOOKING_TYPES, BOOKING_STATUS, BED_ASSIGNMENT_STATUS, PRIORITY_LEVELS } from '@arogyafirst/shared';
import { calculatePriorityScore, findAvailableBeds, matchBedToPatient, updateQueuePositions, estimateWaitTime, isBedTypeCompatible } from '../utils/bedAllocation.util.js';
import { sendBedAvailabilityNotificationEmail, sendQueuePositionUpdateEmail } from '../utils/email.util.js';
import { withTransaction } from '../utils/transaction.util.js';

export const getProfile = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }
    // Return sanitized profile from auth middleware
    return successResponse(res, { user: req.user }, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, location } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (name !== undefined) user.hospitalData.name = name;
    if (location !== undefined) user.hospitalData.location = location;
    await user.save();
    // Sanitize profile to match /api/auth/me shape
    const profile = {
      _id: user._id,
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
      hospitalData: user.hospitalData
    };
    return successResponse(res, { user: profile }, 'Profile updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }
    const { valid } = await validateFileType(req.file.buffer, ['application/pdf', 'image/jpeg', 'image/png']);
    if (!valid) {
      return errorResponse(res, 'Invalid file type', 400);
    }
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: 'hospitals/legal',
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png']
    });
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    user.hospitalData.legalDocuments.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      size: uploadResult.size,
      uploadedAt: uploadResult.uploadedAt
    });
    try {
      await user.save();
    } catch (dbError) {
      // If saving to DB fails, attempt to delete the uploaded file to avoid orphaned storage
      try {
        await deleteFromCloudinary(uploadResult.publicId);
      } catch (delErr) {
        console.error('Failed to delete orphaned Cloudinary file:', delErr);
      }
      throw dbError;
    }
    return successResponse(res, {
      document: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        format: uploadResult.format,
        size: uploadResult.size,
        uploadedAt: uploadResult.uploadedAt
      }
    }, 'Document uploaded successfully');
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse(res, 'Failed to upload document', 500);
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid document index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.legalDocuments.length) {
      return errorResponse(res, 'Document not found', 404);
    }
    const document = user.hospitalData.legalDocuments[idx];
    await deleteFromCloudinary(document.publicId);
    user.hospitalData.legalDocuments.splice(idx, 1);
    await user.save();
    return successResponse(res, null, 'Document deleted successfully');
  } catch (error) {
    console.error('Delete error:', error);
    return errorResponse(res, 'Failed to delete document', 500);
  }
};

export const addDoctor = async (req, res) => {
  try {
    const { name, specialization, qualification, experience, contactPhone, email, schedule } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const doctor = {
      name,
      specialization,
      qualification,
      experience,
      contactPhone,
      email,
      schedule
    };
    user.hospitalData.doctors.push(doctor);
    // ensure mongoose detects the nested array change
    user.markModified('hospitalData.doctors');
    await user.save();
    // Return both the added item and its index for frontend reference
    return successResponse(res, {
      item: doctor,
      index: user.hospitalData.doctors.length - 1,
      list: user.hospitalData.doctors
    }, 'Doctor added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add doctor', 500);
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid doctor index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.doctors.length) {
      return errorResponse(res, 'Doctor not found', 404);
    }
    const updates = req.body || {};
    // whitelist allowed doctor fields to prevent arbitrary field injection
    const allowed = ['name', 'specialization', 'qualification', 'experience', 'contactPhone', 'email', 'schedule', 'isActive'];
    const assigned = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
    }
    Object.assign(user.hospitalData.doctors[idx], assigned);
    // ensure mongoose persists nested doctor updates
    user.markModified('hospitalData.doctors');
    await user.save();
    // Return both updated item and list for frontend sync
    return successResponse(res, {
      item: user.hospitalData.doctors[idx],
      index: idx,
      list: user.hospitalData.doctors
    }, 'Doctor updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update doctor', 500);
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid doctor index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.doctors.length) {
      return errorResponse(res, 'Doctor not found', 404);
    }
    // Save deleted item before removal for frontend reference
    const deletedItem = user.hospitalData.doctors[idx];
    user.hospitalData.doctors.splice(idx, 1);
    user.markModified('hospitalData.doctors');
    await user.save();
    // Return both deleted item and updated list
    return successResponse(res, {
      item: deletedItem,
      index: idx,
      list: user.hospitalData.doctors
    }, 'Doctor deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete doctor', 500);
  }
};

export const addLab = async (req, res) => {
  try {
    const { name, type, location, contactPhone, availableTests } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    user.hospitalData.labs.push({
      name,
      type,
      location,
      contactPhone,
      availableTests
    });
    // mark modified so mongoose notices nested array change
    user.markModified('hospitalData.labs');
    await user.save();
    return successResponse(res, user.hospitalData.labs, 'Lab added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add lab', 500);
  }
};

export const updateLab = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid lab index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.labs.length) {
      return errorResponse(res, 'Lab not found', 404);
    }
  const updates = req.body || {};
  const allowed = ['name', 'type', 'location', 'contactPhone', 'availableTests', 'isActive'];
  const assigned = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
  }
  Object.assign(user.hospitalData.labs[idx], assigned);
  user.markModified('hospitalData.labs');
  await user.save();
    return successResponse(res, null, 'Lab updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update lab', 500);
  }
};

export const deleteLab = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid lab index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.labs.length) {
      return errorResponse(res, 'Lab not found', 404);
    }
  user.hospitalData.labs.splice(idx, 1);
  user.markModified('hospitalData.labs');
  await user.save();
    return successResponse(res, null, 'Lab deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete lab', 500);
  }
};

export const addBed = async (req, res) => {
  try {
    const { bedNumber, type, floor, ward } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    // Normalize bed number for comparison and storage (trim + uppercase)
    const normalizedBedNumber = String(bedNumber || '').trim().toUpperCase();
    // Prevent duplicate bed numbers within the same hospital (case/whitespace insensitive)
    const existing = user.hospitalData.beds.find(b => String(b.bedNumber || '').trim().toUpperCase() === normalizedBedNumber);
    if (existing) {
      return errorResponse(res, 'Bed number already exists', 400);
    }
    user.hospitalData.beds.push({
      bedNumber: normalizedBedNumber,
      type,
      floor,
      ward
    });
    // ensure mongoose detects the nested array change
    user.markModified('hospitalData.beds');
    await user.save();
    return successResponse(res, user.hospitalData.beds, 'Bed added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add bed', 500);
  }
};

export const updateBed = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid bed index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.beds.length) {
      return errorResponse(res, 'Bed not found', 404);
    }
    const updates = req.body || {};
    // whitelist bed fields
    const allowed = ['bedNumber', 'type', 'floor', 'ward', 'isOccupied', 'isActive'];
    const assigned = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
    }
    // If bedNumber is being updated, normalize and prevent duplicates
    if (Object.prototype.hasOwnProperty.call(assigned, 'bedNumber')) {
      const newNorm = String(assigned.bedNumber || '').trim().toUpperCase();
      const duplicate = user.hospitalData.beds.find((b, i) => i !== idx && String(b.bedNumber || '').trim().toUpperCase() === newNorm);
      if (duplicate) {
        return errorResponse(res, 'Bed number already exists', 400);
      }
      assigned.bedNumber = newNorm;
    }
    Object.assign(user.hospitalData.beds[idx], assigned);
    user.markModified('hospitalData.beds');
    await user.save();
    return successResponse(res, null, 'Bed updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update bed', 500);
  }
};

export const deleteBed = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid bed index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.beds.length) {
      return errorResponse(res, 'Bed not found', 404);
    }
    user.hospitalData.beds.splice(idx, 1);
    user.markModified('hospitalData.beds');
    await user.save();
    return successResponse(res, null, 'Bed deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete bed', 500);
  }
};

export const addPharmacy = async (req, res) => {
  try {
    const { name, location, contactPhone, operatingHours } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    user.hospitalData.pharmacies.push({
      name,
      location,
      contactPhone,
      operatingHours
    });
    // ensure mongoose detects the nested array change
    user.markModified('hospitalData.pharmacies');
    await user.save();
    return successResponse(res, user.hospitalData.pharmacies, 'Pharmacy added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add pharmacy', 500);
  }
};

export const updatePharmacy = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid pharmacy index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.pharmacies.length) {
      return errorResponse(res, 'Pharmacy not found', 404);
    }
  const updates = req.body || {};
  const allowed = ['name', 'location', 'contactPhone', 'operatingHours', 'isActive'];
  const assigned = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
  }
  Object.assign(user.hospitalData.pharmacies[idx], assigned);
  user.markModified('hospitalData.pharmacies');
  await user.save();
    return successResponse(res, null, 'Pharmacy updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update pharmacy', 500);
  }
};

export const deletePharmacy = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid pharmacy index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.pharmacies.length) {
      return errorResponse(res, 'Pharmacy not found', 404);
    }
  user.hospitalData.pharmacies.splice(idx, 1);
  user.markModified('hospitalData.pharmacies');
  await user.save();
    return successResponse(res, null, 'Pharmacy deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete pharmacy', 500);
  }
};

export const addStaff = async (req, res) => {
  try {
    const { name, role, department, contactPhone, email, shift } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    user.hospitalData.staff.push({
      name,
      role,
      department,
      contactPhone,
      email,
      shift
    });
    // ensure mongoose detects the nested array change
    user.markModified('hospitalData.staff');
    await user.save();
    return successResponse(res, user.hospitalData.staff, 'Staff added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add staff', 500);
  }
};

export const updateStaff = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid staff index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.staff.length) {
      return errorResponse(res, 'Staff not found', 404);
    }
  const updates = req.body || {};
  const allowed = ['name', 'role', 'department', 'contactPhone', 'email', 'shift', 'isActive'];
  const assigned = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
  }
  Object.assign(user.hospitalData.staff[idx], assigned);
  user.markModified('hospitalData.staff');
  await user.save();
    return successResponse(res, null, 'Staff updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update staff', 500);
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid staff index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.hospitalData.staff.length) {
      return errorResponse(res, 'Staff not found', 404);
    }
  user.hospitalData.staff.splice(idx, 1);
  user.markModified('hospitalData.staff');
  await user.save();
    return successResponse(res, null, 'Staff deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete staff', 500);
  }
};

// Location Management Functions (Multi-location Chain Support)

export const addLocation = async (req, res) => {
  try {
    const { name, location, branchCode, contactPhone, contactEmail } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    
    // Only chain parents can add locations
    if (!user.hospitalData.isChain) {
      return errorResponse(res, 'Only chain hospitals can create branches', 403);
    }
    
    // Check branch code uniqueness within the chain
    const existingBranch = await User.findOne({
      'hospitalData.parentHospitalId': user._id,
      'hospitalData.branchCode': branchCode,
      isActive: true
    });
    
    if (existingBranch) {
      return errorResponse(res, 'Branch code already exists in this chain', 409);
    }
    
    // Create new branch hospital
    const branchHospital = new User({
      email: `${branchCode.toLowerCase()}@${user.email.split('@')[1]}`,
      emailNormalized: `${branchCode.toLowerCase()}@${user.email.split('@')[1]}`.toLowerCase(),
      password: 'temporary-password-change-required',
      role: ROLES.HOSPITAL,
      verificationStatus: VERIFICATION_STATUS.PENDING,
      isActive: true,
      hospitalData: {
        name,
        location,
        parentHospitalId: user._id,
        branchCode,
        isChain: false,
        doctors: [],
        labs: [],
        beds: [],
        pharmacies: [],
        staff: [],
        branchLocations: []
      }
    });
    
    await branchHospital.save();
    
    // Add branch to parent's branchLocations
    user.hospitalData.branchLocations.push(branchHospital._id);
    user.markModified('hospitalData.branchLocations');
    await user.save();
    
    return successResponse(res, {
      locationId: branchHospital._id,
      branchCode,
      name,
      location,
      contactPhone,
      contactEmail,
      isActive: true
    }, 'Location created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Duplicate branch code', 409);
    }
    return errorResponse(res, 'Failed to create location', 500);
  }
};

export const getLocations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    
    let locations = [];
    
    // If chain parent, fetch all branches
    if (user.hospitalData.isChain && user.hospitalData.branchLocations) {
      const branches = await User.find({
        _id: { $in: user.hospitalData.branchLocations },
        isActive: true
      }).select('_id hospitalData.name hospitalData.location hospitalData.branchCode hospitalData.parentHospitalId');
      
      locations = branches.map(b => ({
        locationId: b._id,
        branchCode: b.hospitalData.branchCode,
        name: b.hospitalData.name,
        location: b.hospitalData.location,
        isActive: b.isActive
      }));
    } else if (user.hospitalData.parentHospitalId) {
      // If branch, fetch only self info (for consistency)
      locations = [{
        locationId: user._id,
        branchCode: user.hospitalData.branchCode,
        name: user.hospitalData.name,
        location: user.hospitalData.location,
        isActive: user.isActive
      }];
    }
    
    return successResponse(res, { locations }, 'Locations retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve locations', 500);
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { name, location, contactPhone, contactEmail } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    
    const branchHospital = await User.findById(locationId);
    if (!branchHospital || branchHospital.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Location not found', 404);
    }
    
    // Verify requester is chain parent or the branch itself
    if (branchHospital.hospitalData.parentHospitalId) {
      if (branchHospital.hospitalData.parentHospitalId.toString() !== user._id.toString() && locationId !== user._id.toString()) {
        return errorResponse(res, 'Access denied', 403);
      }
    } else if (locationId !== user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
    
    // Update only allowed fields
    if (name) branchHospital.hospitalData.name = name;
    if (location) branchHospital.hospitalData.location = location;
    // contactPhone and contactEmail would be added to a separate contacts subdocument in production
    
    branchHospital.markModified('hospitalData');
    await branchHospital.save();
    
    return successResponse(res, {
      locationId: branchHospital._id,
      branchCode: branchHospital.hospitalData.branchCode,
      name: branchHospital.hospitalData.name,
      location: branchHospital.hospitalData.location,
      isActive: branchHospital.isActive
    }, 'Location updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update location', 500);
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user || user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    
    if (!user.hospitalData.isChain) {
      return errorResponse(res, 'Only chain hospitals can delete branches', 403);
    }
    
    const branchHospital = await User.findById(locationId);
    if (!branchHospital || branchHospital.hospitalData.parentHospitalId?.toString() !== user._id.toString()) {
      return errorResponse(res, 'Location not found or access denied', 404);
    }
    
    // Check for active slots or bookings for this location
    const Slot = require('../models/Slot.model.js').default;
    const Booking = require('../models/Booking.model.js').default;
    
    const activeSlots = await Slot.countDocuments({
      locationId: branchHospital._id,
      isActive: true
    });
    
    const activeBookings = await Booking.countDocuments({
      locationId: branchHospital._id,
      status: { $in: ['CONFIRMED', 'PENDING'] }
    });
    
    if (activeSlots > 0 || activeBookings > 0) {
      return errorResponse(res, 'Cannot delete location with active slots or bookings', 409);
    }
    
    // Soft delete
    branchHospital.isActive = false;
    await branchHospital.save();
    
    // Remove from parent's branchLocations
    user.hospitalData.branchLocations = user.hospitalData.branchLocations.filter(
      id => id.toString() !== branchHospital._id.toString()
    );
    user.markModified('hospitalData.branchLocations');
    await user.save();
    
    return successResponse(res, null, 'Location deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete location', 500);
  }
};

// Dashboard & Analytics Functions

export const getDashboard = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    const { locationId } = req.query;
    
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    
    // Ensure existing IPD bookings have bedAssignmentStatus set (migration)
    await Booking.updateMany(
      {
        providerId: hospitalId,
        entityType: BOOKING_TYPES.IPD,
        bedAssignmentStatus: { $exists: false },
        status: { $ne: BOOKING_STATUS.CANCELLED }
      },
      { $set: { bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE } }
    );
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Fetch hospital data for bed capacity
    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Hospital not found', 404);
    }
    
    // Calculate bed occupancy (handle missing beds array)
    const beds = hospital.hospitalData?.beds || [];
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(bed => bed.isOccupied).length;
    const bedOccupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;
    
    // Build booking query with locationId support
    const bookingQuery = { providerId: hospitalId };
    
    // If locationId is specified, filter by location
    if (locationId && locationId !== 'all') {
      bookingQuery.locationId = locationId;
    } else if (locationId === 'all' && hospital.hospitalData.isChain) {
      // If chain parent and locationId='all', include all branches
      bookingQuery.$or = [
        { providerId: hospitalId },
        { locationId: { $in: hospital.hospitalData.branchLocations || [] } }
      ];
    }
    
    // Get OPD count (today's bookings)
    const opdCount = await Booking.countDocuments({
      ...bookingQuery,
      bookingDate: { $gte: today, $lt: tomorrow },
      entityType: BOOKING_TYPES.OPD,
      status: { $ne: BOOKING_STATUS.CANCELLED }
    });

    // Get IPD queue size (waiting for bed assignment)
    // Include bookings with explicit WAITING_IN_QUEUE status OR IPD bookings without bedAssignmentStatus set
    const ipdQueueCount = await Booking.countDocuments({
      ...bookingQuery,
      entityType: BOOKING_TYPES.IPD,
      $or: [
        { bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE },
        { bedAssignmentStatus: { $exists: false } }
      ],
      status: { $ne: BOOKING_STATUS.CANCELLED }
    });
    
    console.log('[Hospital.Dashboard] IPD Queue Query:', {
      bookingQuery,
      ipdQueueCount,
      bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE
    });

    // Get occupied beds (IPD bookings with bed assigned)
    const ipdOccupiedCount = await Booking.countDocuments({
      ...bookingQuery,
      entityType: BOOKING_TYPES.IPD,
      bedAssignmentStatus: BED_ASSIGNMENT_STATUS.BED_OCCUPIED,
      status: { $ne: BOOKING_STATUS.CANCELLED }
    });
    
    // Get this month's revenue
    const revenueResult = await Booking.aggregate([
      {
        $match: {
          ...bookingQuery,
          bookingDate: { $gte: startOfMonth, $lte: endOfMonth },
          paymentStatus: PAYMENT_STATUS.SUCCESS
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paymentAmount' }
        }
      }
    ]);
    const monthlyRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    // Get this month's surgeries count (using metadata.type or bookingType if it exists)
    const surgeriesCount = await Booking.countDocuments({
      ...bookingQuery,
      bookingDate: { $gte: startOfMonth, $lte: endOfMonth },
      'metadata.type': 'SURGERY'
    });
    
    // Use booking occupancy if no physical beds are configured
    const effectiveOccupiedBeds = occupiedBeds > 0 ? occupiedBeds : ipdOccupiedCount;
    const effectiveTotalBeds = totalBeds > 0 ? totalBeds : (ipdOccupiedCount + ipdQueueCount) || 1;
    const effectiveBedOccupancyRate = effectiveTotalBeds > 0 ? ((effectiveOccupiedBeds / effectiveTotalBeds) * 100).toFixed(1) : 0;
    
    const metricsData = {
      opdCount,
      ipdQueueCount,
      bedOccupancy: {
        rate: parseFloat(effectiveBedOccupancyRate),
        occupied: effectiveOccupiedBeds,
        total: effectiveTotalBeds,
        fromPhysicalBeds: occupiedBeds > 0,
        fromBookings: effectiveOccupiedBeds !== occupiedBeds
      },
      monthlyRevenue,
      surgeriesCount
    };
    
    console.log('[Hospital.Dashboard] Final Response:', JSON.stringify({ metrics: metricsData }, null, 2));
    
    // Prevent caching for dashboard - always fresh data
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    return successResponse(res, { metrics: metricsData }, 'Dashboard metrics retrieved successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    return errorResponse(res, 'Failed to retrieve dashboard metrics', 500);
  }
};

export const getAnalytics = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    const { startDate, endDate, department, locationId } = req.query;
    
    // Fetch hospital to check chain status
    const hospital = await User.findById(hospitalId);
    
    // Build match query
    const matchQuery = { providerId: hospitalId };
    
    // If locationId is specified, filter by location
    if (locationId && locationId !== 'all') {
      matchQuery.locationId = locationId;
    } else if (locationId === 'all' && hospital.hospitalData.isChain) {
      // If chain parent and locationId='all', include all branches
      matchQuery.$or = [
        { providerId: hospitalId },
        { locationId: { $in: hospital.hospitalData.branchLocations || [] } }
      ];
    }
    
    if (startDate || endDate) {
      matchQuery.bookingDate = {};
      if (startDate) {
        matchQuery.bookingDate.$gte = new Date(startDate);
      }
      if (endDate) {
        matchQuery.bookingDate.$lte = new Date(endDate);
      }
    }
    
    if (department) {
      matchQuery['metadata.department'] = department;
    }
    
    // Aggregate bookings by date for trend chart
    const dailyBookings = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' }
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.SUCCESS] }, '$paymentAmount', 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          bookings: '$count',
          revenue: '$revenue'
        }
      }
    ]);
    
    // Aggregate bookings by type for pie chart
    const bookingsByType = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$entityType',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          count: '$count'
        }
      }
    ]);
    
    // Aggregate bookings by department for bar chart (using metadata.department)
    const bookingsByDepartment = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$metadata.department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $match: { _id: { $ne: null } } },
      {
        $project: {
          _id: 0,
          department: '$_id',
          count: '$count'
        }
      }
    ]);
    
    return successResponse(res, {
      dailyBookings,
      bookingsByType,
      bookingsByDepartment
    }, 'Analytics data retrieved successfully');
  } catch (error) {
    console.error('Analytics error:', error);
    return errorResponse(res, 'Failed to retrieve analytics data', 500);
  }
};

export const exportReport = async (req, res) => {
  try {
    // Authorization
    const { id } = req.params;
    if (req.user.role !== ROLES.HOSPITAL || id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Extract and validate parameters
    const { reportType, format, startDate, endDate, department, locationId } = req.query;
    
    if (!reportType || !['bookings', 'revenue', 'staff-schedules', 'department-analytics'].includes(reportType)) {
      return errorResponse(res, 'Invalid report type. Allowed: bookings, revenue, staff-schedules, department-analytics', 400);
    }
    
    if (!format || !['csv', 'pdf'].includes(format)) {
      return errorResponse(res, 'Invalid format. Allowed: csv, pdf', 400);
    }
    
    if (!startDate || !endDate) {
      return errorResponse(res, 'startDate and endDate are required', 400);
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse(res, 'Invalid date format. Use ISO date strings', 400);
    }
    
    const hospitalId = req.user._id;
    
    // Fetch hospital to check chain status
    const hospital = await User.findById(hospitalId);
    
    let data = [];
    let fields = [];
    let columns = [];
    let title = '';
    
    switch (reportType) {
      case 'bookings': {
        title = 'Bookings Report';
        const matchQuery = {
          providerId: hospitalId,
          bookingDate: { $gte: start, $lte: end }
        };
        
        // If locationId is specified, filter by location
        if (locationId && locationId !== 'all') {
          matchQuery.locationId = locationId;
        } else if (locationId === 'all' && hospital.hospitalData.isChain) {
          // If chain parent and locationId='all', include all branches
          matchQuery.$or = [
            { providerId: hospitalId },
            { locationId: { $in: hospital.hospitalData.branchLocations || [] } }
          ];
        }
        
        if (department) {
          matchQuery['metadata.department'] = department;
        }
        
        const bookings = await Booking.find(matchQuery)
          .populate('patientId', 'name patientData.name phone')
          .lean();
        
        data = bookings.map(b => ({
          bookingId: b.bookingId || b._id.toString().slice(-8).toUpperCase(),
          patientName: b.patientId?.patientData?.name || b.patientId?.name || 'N/A',
          date: formatDateForExport(b.bookingDate),
          type: b.entityType || 'OPD',
          department: b.metadata?.department || 'General',
          status: b.status,
          paymentAmount: b.paymentAmount || 0
        }));
        
        fields = [
          { label: 'Booking ID', value: 'bookingId' },
          { label: 'Patient Name', value: 'patientName' },
          { label: 'Date', value: 'date' },
          { label: 'Type', value: 'type' },
          { label: 'Department', value: 'department' },
          { label: 'Status', value: 'status' },
          { label: 'Payment (₹)', value: 'paymentAmount' }
        ];
        
        columns = [
          { header: 'Booking ID', key: 'bookingId', width: 60 },
          { header: 'Patient', key: 'patientName', width: 90 },
          { header: 'Date', key: 'date', width: 65 },
          { header: 'Type', key: 'type', width: 40 },
          { header: 'Department', key: 'department', width: 70 },
          { header: 'Status', key: 'status', width: 60 },
          { header: 'Payment', key: 'paymentAmount', width: 55, isCurrency: true }
        ];
        break;
      }
      
      case 'revenue': {
        title = 'Revenue Report';
        const matchQuery = {
          providerId: hospitalId,
          bookingDate: { $gte: start, $lte: end },
          status: BOOKING_STATUS.COMPLETED,
          paymentStatus: PAYMENT_STATUS.SUCCESS
        };
        if (department) {
          matchQuery['metadata.department'] = department;
        }
        
        const revenueAgg = await Booking.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
              totalBookings: { $sum: 1 },
              opdRevenue: {
                $sum: { $cond: [{ $eq: ['$entityType', BOOKING_TYPES.OPD] }, '$paymentAmount', 0] }
              },
              ipdRevenue: {
                $sum: { $cond: [{ $eq: ['$entityType', BOOKING_TYPES.IPD] }, '$paymentAmount', 0] }
              },
              labRevenue: {
                $sum: { $cond: [{ $eq: ['$entityType', BOOKING_TYPES.LAB] }, '$paymentAmount', 0] }
              },
              totalRevenue: { $sum: '$paymentAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        data = revenueAgg.map(r => ({
          date: formatDateForExport(new Date(r._id)),
          totalBookings: r.totalBookings,
          opdRevenue: r.opdRevenue,
          ipdRevenue: r.ipdRevenue,
          labRevenue: r.labRevenue,
          totalRevenue: r.totalRevenue
        }));
        
        fields = [
          { label: 'Date', value: 'date' },
          { label: 'Total Bookings', value: 'totalBookings' },
          { label: 'OPD Revenue (₹)', value: 'opdRevenue' },
          { label: 'IPD Revenue (₹)', value: 'ipdRevenue' },
          { label: 'Lab Revenue (₹)', value: 'labRevenue' },
          { label: 'Total Revenue (₹)', value: 'totalRevenue' }
        ];
        
        columns = [
          { header: 'Date', key: 'date', width: 70 },
          { header: 'Bookings', key: 'totalBookings', width: 60 },
          { header: 'OPD', key: 'opdRevenue', width: 65, isCurrency: true },
          { header: 'IPD', key: 'ipdRevenue', width: 65, isCurrency: true },
          { header: 'Lab', key: 'labRevenue', width: 65, isCurrency: true },
          { header: 'Total', key: 'totalRevenue', width: 75, isCurrency: true }
        ];
        break;
      }
      
      case 'staff-schedules': {
        title = 'Staff Schedules Report';
        const matchQuery = {
          hospitalId,
          date: { $gte: start, $lte: end }
        };
        if (department) {
          matchQuery.department = department;
        }
        
        const schedules = await StaffSchedule.find(matchQuery)
          .sort({ date: 1 })
          .lean();
        
        // Get hospital to map staff names
        const hospital = await User.findById(hospitalId);
        const staffMembers = hospital?.hospitalData?.staff || [];
        
        data = schedules.map(s => ({
          staffName: staffMembers[s.staffId]?.name || s.staffSnapshot?.name || 'Unknown',
          date: formatDateForExport(s.date),
          shiftType: s.shiftType,
          startTime: s.startTime,
          endTime: s.endTime,
          department: s.department || 'General',
          status: s.status
        }));
        
        fields = [
          { label: 'Staff Name', value: 'staffName' },
          { label: 'Date', value: 'date' },
          { label: 'Shift Type', value: 'shiftType' },
          { label: 'Start Time', value: 'startTime' },
          { label: 'End Time', value: 'endTime' },
          { label: 'Department', value: 'department' },
          { label: 'Status', value: 'status' }
        ];
        
        columns = [
          { header: 'Staff Name', key: 'staffName', width: 90 },
          { header: 'Date', key: 'date', width: 70 },
          { header: 'Shift', key: 'shiftType', width: 60 },
          { header: 'Start', key: 'startTime', width: 50 },
          { header: 'End', key: 'endTime', width: 50 },
          { header: 'Dept', key: 'department', width: 70 },
          { header: 'Status', key: 'status', width: 60 }
        ];
        break;
      }
      
      case 'department-analytics': {
        title = 'Department Analytics Report';
        const deptAgg = await Booking.aggregate([
          {
            $match: {
              providerId: hospitalId,
              bookingDate: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$metadata.department',
              totalBookings: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] }
              },
              cancelled: {
                $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.CANCELLED] }, 1, 0] }
              },
              revenue: {
                $sum: { $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.SUCCESS] }, '$paymentAmount', 0] }
              }
            }
          },
          { $sort: { totalBookings: -1 } }
        ]);
        
        data = deptAgg.map(d => ({
          department: d._id || 'General',
          totalBookings: d.totalBookings,
          completed: d.completed,
          cancelled: d.cancelled,
          revenue: d.revenue,
          averageValue: d.totalBookings > 0 ? Math.round(d.revenue / d.totalBookings) : 0
        }));
        
        fields = [
          { label: 'Department', value: 'department' },
          { label: 'Total Bookings', value: 'totalBookings' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Revenue (₹)', value: 'revenue' },
          { label: 'Avg Value (₹)', value: 'averageValue' }
        ];
        
        columns = [
          { header: 'Department', key: 'department', width: 100 },
          { header: 'Bookings', key: 'totalBookings', width: 60 },
          { header: 'Completed', key: 'completed', width: 60 },
          { header: 'Cancelled', key: 'cancelled', width: 60 },
          { header: 'Revenue', key: 'revenue', width: 80, isCurrency: true },
          { header: 'Avg Value', key: 'averageValue', width: 70, isCurrency: true }
        ];
        break;
      }
    }
    
    // Generate export
    const dateRangeStr = `${formatDateForExport(start)} to ${formatDateForExport(end)}`;
    const filename = sanitizeFilename(`hospital_${reportType}_${Date.now()}`);
    
    if (format === 'csv') {
      const csvContent = generateCSV(data, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvContent);
    } else {
      const pdfBuffer = await generatePDF(title, data, columns, { dateRange: dateRangeStr });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    return errorResponse(res, 'Failed to generate export', 500);
  }
};

// Staff Schedule Functions

export const createStaffSchedule = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    const { staffId, date, shiftType, startTime, endTime, department, notes } = req.body;
    
    // Verify hospital exists
    const hospital = await User.findById(hospitalId);
    if (!hospital || hospital.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Hospital not found', 404);
    }
    
    // Verify staff member exists (staffId is now Number)
    const staffIndex = Number(staffId);
    if (!Number.isInteger(staffIndex) || staffIndex < 0 || staffIndex >= hospital.hospitalData.staff.length) {
      return errorResponse(res, 'Staff member not found', 404);
    }
    
    const staffMember = hospital.hospitalData.staff[staffIndex];
    
    // Check for scheduling conflicts
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(scheduleDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const existingSchedule = await StaffSchedule.findOne({
      hospitalId,
      staffId: staffIndex,
      date: { $gte: scheduleDate, $lt: nextDay },
      status: { $ne: SCHEDULE_STATUS.CANCELLED }
    });
    
    if (existingSchedule) {
      return errorResponse(res, 'Staff member already has a schedule for this date', 400);
    }
    
    // Create staff snapshot
    const staffSnapshot = {
      name: staffMember.name,
      role: staffMember.role,
      department: staffMember.department || department,
      contactPhone: staffMember.contactPhone
    };
    
    // Create new schedule
    const schedule = new StaffSchedule({
      hospitalId,
      staffId: staffIndex,
      staffSnapshot,
      date: scheduleDate,
      shiftType,
      startTime,
      endTime,
      department: department || staffMember.department,
      notes,
      createdBy: hospitalId,
      status: SCHEDULE_STATUS.SCHEDULED
    });
    
    await schedule.save();
    
    return successResponse(res, { schedule }, 'Staff schedule created successfully');
  } catch (error) {
    console.error('Create schedule error:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to create staff schedule', 500);
  }
};

export const getStaffSchedules = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    const { startDate, endDate, department, staffId, status } = req.query;
    
    const filters = {};
    
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    
    if (department) filters.department = department;
    if (staffId) filters.staffId = Number(staffId);
    if (status) filters.status = status;
    
    const schedules = await StaffSchedule.findByHospital(hospitalId, filters);
    
    return successResponse(res, { schedules }, 'Staff schedules retrieved successfully');
  } catch (error) {
    console.error('Get schedules error:', error);
    return errorResponse(res, 'Failed to retrieve staff schedules', 500);
  }
};

export const updateStaffSchedule = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    const { scheduleId } = req.params;
    const updates = req.body;
    
    const schedule = await StaffSchedule.findOne({
      _id: scheduleId,
      hospitalId
    });
    
    if (!schedule) {
      return errorResponse(res, 'Schedule not found', 404);
    }
    
    // If updating date or staffId, check for conflicts
    if (updates.date || updates.staffId !== undefined) {
      const checkDate = updates.date ? new Date(updates.date) : schedule.date;
      checkDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const checkStaffId = updates.staffId !== undefined ? Number(updates.staffId) : schedule.staffId;
      
      // Validate staffId if updating
      if (updates.staffId !== undefined) {
        const hospital = await User.findById(hospitalId);
        const staffIndex = Number(updates.staffId);
        if (!Number.isInteger(staffIndex) || staffIndex < 0 || staffIndex >= hospital.hospitalData.staff.length) {
          return errorResponse(res, 'Invalid staff member', 404);
        }
      }
      
      const conflict = await StaffSchedule.findOne({
        _id: { $ne: scheduleId },
        hospitalId,
        staffId: checkStaffId,
        date: { $gte: checkDate, $lt: nextDay },
        status: { $ne: SCHEDULE_STATUS.CANCELLED }
      });
      
      if (conflict) {
        return errorResponse(res, 'Schedule conflict detected', 400);
      }
    }
    
    // Update allowed fields
    const allowed = ['date', 'shiftType', 'startTime', 'endTime', 'department', 'notes', 'status', 'staffId'];
    allowed.forEach(field => {
      if (updates[field] !== undefined) {
        schedule[field] = field === 'staffId' ? Number(updates[field]) : updates[field];
      }
    });
    
    schedule.updatedBy = hospitalId;
    await schedule.save();
    
    return successResponse(res, { schedule }, 'Staff schedule updated successfully');
  } catch (error) {
    console.error('Update schedule error:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update staff schedule', 500);
  }
};

export const deleteStaffSchedule = async (req, res) => {
  try {
    // Validate :id param matches authenticated user
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: ID mismatch', 403);
    }
    const hospitalId = req.user._id;
    const { scheduleId } = req.params;
    
    const schedule = await StaffSchedule.findOne({
      _id: scheduleId,
      hospitalId
    });
    
    if (!schedule) {
      return errorResponse(res, 'Schedule not found', 404);
    }
    
    // Soft delete by marking as cancelled
    schedule.status = SCHEDULE_STATUS.CANCELLED;
    schedule.updatedBy = hospitalId;
    await schedule.save();
    
    return successResponse(res, null, 'Staff schedule deleted successfully');
  } catch (error) {
    console.error('Delete schedule error:', error);
    return errorResponse(res, 'Failed to delete staff schedule', 500);
  }
};

export const getSettings = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }
    return successResponse(res, { settings: req.user.settings }, 'Settings retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve settings', 500);
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await updateUserSettings({
      userId: req.user._id,
      expectedRole: ROLES.HOSPITAL,
      settingsPayload: req.body
    });
    return successResponse(res, { settings }, 'Settings updated successfully');
  } catch (error) {
    if (error.statusCode === 404) {
      return errorResponse(res, error.message, 404);
    }
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update settings', 500);
  }
};

// ==================== Bed Allocation & Queue Management ====================

export const getQueue = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const locationId = req.query.locationId;
    const query = {
      providerId: req.params.id,
      entityType: BOOKING_TYPES.IPD,
      bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE
    };

    if (locationId && locationId !== 'all') {
      query.locationId = locationId;
    }

    const queueDataRaw = await Booking.find(query)
      .populate('patientId', 'name email phone')
      .sort({ priorityScore: -1, 'queueMetadata.joinedQueueAt': 1 })
      .lean();

    // Ensure patientSnapshot exists; fallback to populated patientId if missing
    const queueData = queueDataRaw.map((b) => {
      const snapshot = b.patientSnapshot || {
        name: b.patientId?.name,
        email: b.patientId?.email,
        phone: b.patientId?.phone,
      };
      return { ...b, patientSnapshot: snapshot };
    });

    return successResponse(res, { queue: queueData }, 'Queue retrieved successfully');
  } catch (error) {
    console.error('Error retrieving queue:', error);
    return errorResponse(res, 'Failed to retrieve queue', 500);
  }
};

export const addToQueue = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const { bookingId, bedRequirement, medicalUrgency, patientAge, otherFactors } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.entityType !== BOOKING_TYPES.IPD) {
      return errorResponse(res, 'Only IPD bookings can be added to queue', 400);
    }

    if (booking.providerId.toString() !== req.params.id) {
      return errorResponse(res, 'Booking does not belong to this hospital', 400);
    }

    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return errorResponse(res, 'Booking must be in CONFIRMED status', 400);
    }

    if (booking.bedAssignmentStatus === BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE) {
      return errorResponse(res, 'Booking is already in queue', 400);
    }
    if ([BED_ASSIGNMENT_STATUS.BED_RELEASED, BED_ASSIGNMENT_STATUS.BED_OCCUPIED].includes(booking.bedAssignmentStatus)) {
      return errorResponse(res, 'Completed or discharged bookings cannot be re-queued; create a new IPD booking instead.', 400);
    }
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return errorResponse(res, 'Completed bookings cannot be re-queued; create a new IPD booking instead.', 400);
    }

    // Calculate priority score (include other factors if provided)
    const { score, priority, breakdown } = calculatePriorityScore(
      booking,
      patientAge,
      medicalUrgency,
      otherFactors ?? booking.priorityMetadata?.otherFactors ?? 0
    );

    booking.bedAssignmentStatus = BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE;
    booking.priority = priority;
    booking.priorityScore = score;
    booking.priorityMetadata = breakdown;
    booking.bedRequirement = bedRequirement;
    booking.queueMetadata = {
      joinedQueueAt: new Date(),
      estimatedWaitTime: 48,
      notificationsSent: []
    };

    await booking.save();
    await updateQueuePositions(req.params.id, booking.locationId);
    await sendQueuePositionNotifications(req.params.id, booking.locationId);

    const updated = await Booking.findById(bookingId).populate('patientId', 'name email phone');
    return successResponse(res, { booking: updated }, 'Booking added to queue successfully');
  } catch (error) {
    console.error('Error adding to queue:', error);
    return errorResponse(res, 'Failed to add booking to queue', 500);
  }
};

export const allocateBed = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const {
      bookingId,
      bedIndex,
      bedId: requestBedId,
      bedNumber
    } = req.body;

    const result = await withTransaction(async (session) => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw { statusCode: 404, message: 'Booking not found' };
      }

      if (booking.bedAssignmentStatus !== BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE) {
        throw { statusCode: 400, message: 'Booking must be in queue' };
      }

      if (booking.entityType !== BOOKING_TYPES.IPD) {
        throw { statusCode: 400, message: 'Only IPD bookings can be allocated' };
      }

      if (booking.providerId.toString() !== req.params.id) {
        throw { statusCode: 400, message: 'Booking does not belong to this hospital' };
      }

      const hospital = await User.findById(req.params.id).session(session);
      if (!hospital || !hospital.hospitalData || !hospital.hospitalData.beds[bedIndex]) {
        throw { statusCode: 404, message: 'Bed not found' };
      }

      const beds = hospital.hospitalData.beds;

      // Resolve bed index using provided index, bedId or bedNumber
      let resolvedBedIndex = -1;
      if (bedIndex !== undefined && bedIndex !== null) {
        const parsed = typeof bedIndex === 'number' ? bedIndex : parseInt(bedIndex, 10);
        if (Number.isInteger(parsed)) {
          resolvedBedIndex = parsed;
        }
      }

      if (resolvedBedIndex < 0 || resolvedBedIndex >= beds.length) {
        resolvedBedIndex = beds.findIndex((b) => {
          const idMatch = requestBedId && (
            b._id?.toString() === requestBedId ||
            (b.bedId && b.bedId.toString() === requestBedId)
          );
          const numberMatch = bedNumber && b.bedNumber?.toString() === bedNumber.toString();
          return idMatch || numberMatch;
        });
      }

      if (resolvedBedIndex < 0 || resolvedBedIndex >= beds.length) {
        throw { statusCode: 404, message: 'Bed not found' };
      }

      const bed = beds[resolvedBedIndex];
      if (!bed.isActive || bed.isOccupied) {
        throw { statusCode: 400, message: 'Bed is not available' };
      }

      // Check bed type compatibility
      if (booking.bedRequirement?.bedType && !isBedTypeCompatible(booking.bedRequirement.bedType, bed.type)) {
        throw { statusCode: 400, message: 'Bed type does not match requirement' };
      }

      // Update bed
      beds[resolvedBedIndex].isOccupied = true;
      await hospital.save({ session });

      // Assign bed to booking with bedIndex for future reference
      booking.assignBed({
        bedIndex: resolvedBedIndex,
        bedId: requestBedId || bed._id?.toString() || resolvedBedIndex.toString(),
        bedNumber: bed.bedNumber,
        bedType: bed.type,
        floor: bed.floor,
        ward: bed.ward
      }, req.user._id);

      await booking.save({ session });
      await updateQueuePositions(req.params.id, booking.locationId);

      return booking;
    });

    // Re-fetch booking with populated patientId for email notification (Comment 3)
    const updatedBooking = await Booking.findById(bookingId).populate('patientId', 'name email phone');
    // Send queue position notifications after recalculation
    await sendQueuePositionNotifications(req.params.id, updatedBooking?.locationId);
    
    // Send notification email only if patientId was populated with email
    if (updatedBooking?.patientId?.email) {
      await sendBedAvailabilityNotificationEmail(
        updatedBooking.patientId.email,
        updatedBooking,
        req.user.hospitalData?.name || 'Hospital'
      );
    }

    return successResponse(res, { booking: updatedBooking }, 'Bed allocated successfully');
  } catch (error) {
    console.error('Error allocating bed:', error);
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return errorResponse(res, 'Failed to allocate bed', 500);
  }
};

export const autoAllocateBeds = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const locationId = req.query.locationId;
    const query = {
      providerId: req.params.id,
      entityType: BOOKING_TYPES.IPD,
      bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE
    };

    if (locationId && locationId !== 'all') {
      query.locationId = locationId;
    }

    // Fetch top 10 priority patients
    const queuedBookings = await Booking.find(query)
      .sort({ priorityScore: -1, 'queueMetadata.joinedQueueAt': 1 })
      .limit(10)
      .populate('patientId', 'name email phone');

    const availableBeds = await findAvailableBeds(req.params.id, null, locationId);

    const allocations = [];
    const failures = [];

    for (const booking of queuedBookings) {
      if (availableBeds.length === 0) break;

      const bestMatch = matchBedToPatient(booking.bedRequirement, availableBeds);
      if (!bestMatch) {
        failures.push({ bookingId: booking._id.toString(), reason: 'No suitable bed found' });
        continue;
      }

      try {
        await withTransaction(async (session) => {
          const hospital = await User.findById(req.params.id).session(session);
          const bed = hospital.hospitalData.beds[bestMatch.bed.bedIndex];

          if (!bed.isActive || bed.isOccupied) {
            throw new Error('Bed no longer available');
          }

          hospital.hospitalData.beds[bestMatch.bed.bedIndex].isOccupied = true;
          await hospital.save({ session });

          booking.assignBed({
            bedIndex: bestMatch.bed.bedIndex,
            bedId: bed._id?.toString() || bestMatch.bed.bedIndex.toString(),
            bedNumber: bed.bedNumber,
            bedType: bed.type,
            floor: bed.floor,
            ward: bed.ward
          }, req.user._id);

          await booking.save({ session });
        });

        // Send notification email
        if (booking.patientId?.email) {
          await sendBedAvailabilityNotificationEmail(
            booking.patientId.email,
            booking,
            req.user.hospitalData?.name || 'Hospital'
          );
        }

        allocations.push({
          bookingId: booking._id.toString(),
          patientName: booking.patientId?.name || 'Unknown',
          bedNumber: bestMatch.bed.bedNumber
        });

        // Remove allocated bed from available list
        availableBeds.splice(availableBeds.indexOf(bestMatch.bed), 1);
      } catch (err) {
        failures.push({ bookingId: booking._id.toString(), reason: err.message });
      }
    }

    await updateQueuePositions(req.params.id, locationId);
    await sendQueuePositionNotifications(req.params.id, locationId);

    return successResponse(res, {
      allocatedCount: allocations.length,
      failedCount: failures.length,
      allocations,
      failures
    }, 'Auto allocation completed');
  } catch (error) {
    console.error('Error auto-allocating beds:', error);
    return errorResponse(res, 'Failed to auto-allocate beds', 500);
  }
};

export const releaseBed = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const { bookingId } = req.params;
    let releasedLocationId = null;

    await withTransaction(async (session) => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        throw { statusCode: 404, message: 'Booking not found' };
      }

      if (!booking.assignedBed) {
        throw { statusCode: 400, message: 'No bed assigned to this booking' };
      }

      if (booking.providerId.toString() !== req.params.id) {
        throw { statusCode: 400, message: 'Booking does not belong to this hospital' };
      }

      // Store locationId for later use in async auto-allocate (Comment 5)
      releasedLocationId = booking.locationId;

      const hospital = await User.findById(req.params.id).session(session);
      // Use bedIndex from assignedBed instead of treating bedId as array index (Comment 2)
      const bedIndex = booking.assignedBed.bedIndex;
      if (hospital.hospitalData.beds[bedIndex]) {
        hospital.hospitalData.beds[bedIndex].isOccupied = false;
        await hospital.save({ session });
      }

      booking.releaseBed(req.user._id);
      await booking.save({ session });
    });

    // Trigger auto-allocate for next patient with correct locationId (Comment 5)
    autoAllocateBedsAsync(req.params.id, releasedLocationId).catch(err =>
      console.error('Error in auto-allocation after bed release:', err)
    );

    return successResponse(res, { message: 'Bed released successfully' }, 'Bed released successfully');
  } catch (error) {
    console.error('Error releasing bed:', error);
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return errorResponse(res, 'Failed to release bed', 500);
  }
};

export const removeFromQueue = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (booking.bedAssignmentStatus !== BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE) {
      return errorResponse(res, 'Booking is not in queue', 400);
    }

    if (booking.providerId.toString() !== req.params.id) {
      return errorResponse(res, 'Booking does not belong to this hospital', 400);
    }

    booking.bedAssignmentStatus = BED_ASSIGNMENT_STATUS.QUEUE_CANCELLED;
    booking.queuePosition = null;
    booking.priorityScore = null;

    await booking.save();
    await updateQueuePositions(req.params.id, booking.locationId);
    await sendQueuePositionNotifications(req.params.id, booking.locationId);

    return successResponse(res, { message: 'Booking removed from queue' }, 'Booking removed from queue');
  } catch (error) {
    console.error('Error removing from queue:', error);
    return errorResponse(res, 'Failed to remove from queue', 500);
  }
};

/**
 * Send queue position update notifications to patients after queue recalculation
 * - Notifies top positions and avoids spamming via 24h cooldown per booking
 */
async function sendQueuePositionNotifications(hospitalId, locationId = null) {
  try {
    const hospital = await User.findById(hospitalId).select('hospitalData.name');
    const hospitalName = hospital?.hospitalData?.name || 'Hospital';

    const query = {
      providerId: hospitalId,
      entityType: BOOKING_TYPES.IPD,
      bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE,
    };
    if (locationId) query.locationId = locationId;

    const bookings = await Booking.find(query)
      .sort({ priorityScore: -1, 'queueMetadata.joinedQueueAt': 1 })
      .limit(10)
      .populate('patientId', 'name email phone');

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const booking of bookings) {
      const notificationsSent = booking.queueMetadata?.notificationsSent || [];
      const lastPositionUpdate = notificationsSent
        .filter(n => n.type === 'POSITION_UPDATE')
        .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

      const recentlyNotified = lastPositionUpdate && (now - new Date(lastPositionUpdate.sentAt).getTime()) < oneDayMs;
      const significantPosition = (booking.queuePosition || 0) <= 5; // Notify top 5

      if (!recentlyNotified && significantPosition && booking.patientId?.email) {
        const etaReadable = estimateWaitTime(booking.queuePosition || 1).readable;
        await sendQueuePositionUpdateEmail(
          booking.patientId.email,
          booking.patientId?.name || 'Patient',
          booking.queuePosition || 1,
          etaReadable,
          hospitalName
        );

        // Track notification to avoid spam
        if (!booking.queueMetadata) booking.queueMetadata = {};
        if (!booking.queueMetadata.notificationsSent) booking.queueMetadata.notificationsSent = [];
        booking.queueMetadata.notificationsSent.push({ type: 'POSITION_UPDATE', sentAt: new Date() });
        await booking.save();
      }
    }
  } catch (err) {
    console.error('Error sending queue position notifications:', err);
  }
}

export const getAvailableBeds = async (req, res) => {
  try {
    if (req.user.role !== ROLES.HOSPITAL) {
      return errorResponse(res, 'Access denied: Hospital role required', 403);
    }

    if (req.user._id.toString() !== req.params.id) {
      return errorResponse(res, 'Access denied: Hospital ownership required', 403);
    }

    const { bedType, locationId } = req.query;
    const availableBeds = await findAvailableBeds(req.params.id, bedType, locationId);

    return successResponse(res, { availableBeds, count: availableBeds.length }, 'Available beds retrieved successfully');
  } catch (error) {
    console.error('Error retrieving available beds:', error);
    return errorResponse(res, 'Failed to retrieve available beds', 500);
  }
};

// Helper function for async auto-allocation after bed release
async function autoAllocateBedsAsync(hospitalId, locationId) {
  const query = {
    providerId: hospitalId,
    entityType: BOOKING_TYPES.IPD,
    bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE
  };

  if (locationId) {
    query.locationId = locationId;
  }

  const nextBooking = await Booking.findOne(query)
    .sort({ priorityScore: -1, 'queueMetadata.joinedQueueAt': 1 })
    .populate('patientId', 'name email phone');

  if (!nextBooking) return;

  const availableBeds = await findAvailableBeds(hospitalId, null, locationId);
  if (availableBeds.length === 0) return;

  const bestMatch = matchBedToPatient(nextBooking.bedRequirement, availableBeds);
  if (!bestMatch) return;

  try {
    const hospital = await User.findById(hospitalId);
    const bed = hospital.hospitalData.beds[bestMatch.bed.bedIndex];

    if (bed.isActive && !bed.isOccupied) {
      hospital.hospitalData.beds[bestMatch.bed.bedIndex].isOccupied = true;
      await hospital.save();

      nextBooking.assignBed({
        bedIndex: bestMatch.bed.bedIndex,
        bedId: bed._id?.toString() || bestMatch.bed.bedIndex.toString(),
        bedNumber: bed.bedNumber,
        bedType: bed.type,
        floor: bed.floor,
        ward: bed.ward
      }, hospitalId);

      await nextBooking.save();

      // After allocation, update queue positions and notify patients
      await updateQueuePositions(hospitalId, locationId);
      await sendQueuePositionNotifications(hospitalId, locationId);

      if (nextBooking.patientId?.email) {
        await sendBedAvailabilityNotificationEmail(
          nextBooking.patientId.email,
          nextBooking,
          hospital.hospitalData?.name || 'Hospital'
        );
      }
    }
  } catch (err) {
    console.error('Error in async auto-allocation:', err);
  }
}
