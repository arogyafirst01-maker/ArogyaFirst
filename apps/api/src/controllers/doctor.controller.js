import User from '../models/User.model.js';
import Booking from '../models/Booking.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { uploadToCloudinary, deleteFromCloudinary, validateFileType } from '../utils/fileUpload.util.js';
import { updateUserSettings } from '../utils/settings.util.js';
import { generateCSV, generatePDF, formatDateForExport, sanitizeFilename, formatCurrency } from '../utils/export.util.js';
import { ROLES, BOOKING_STATUS, PAYMENT_STATUS } from '@arogyafirst/shared';
import { generateDoctorId } from '@arogyafirst/shared';
import crypto from 'crypto';

export const getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Access denied: Doctor role required', 403);
    }
    return successResponse(res, { user }, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, qualification, experience, location, dateOfBirth, aadhaarLast4, specialization, hospitalId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (name !== undefined) user.doctorData.name = name;
    if (qualification !== undefined) user.doctorData.qualification = qualification;
    if (experience !== undefined) user.doctorData.experience = experience;
    if (location !== undefined) user.doctorData.location = location;
    if (dateOfBirth !== undefined) user.doctorData.dateOfBirth = new Date(dateOfBirth);
    if (aadhaarLast4 !== undefined) user.doctorData.aadhaarLast4 = aadhaarLast4;
    if (specialization !== undefined) user.doctorData.specialization = specialization;
    // Update hospitalId and sync uniqueId
    if (hospitalId !== undefined) {
      // Validate hospitalId exists if provided
      if (hospitalId) {
        const hospital = await User.findOne({ role: ROLES.HOSPITAL, uniqueId: hospitalId });
        if (!hospital) {
          return errorResponse(res, 'Hospital not found', 404);
        }
      }
      user.doctorData.hospitalId = hospitalId;
      
      // Generate uniqueId and handle collisions
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          user.uniqueId = generateDoctorId(hospitalId);
          await user.save();
          break;
        } catch (err) {
          if (err.code === 11000 && err.keyPattern?.uniqueId === 1) {
            attempts++;
            if (attempts === maxAttempts) {
              return errorResponse(res, 'Failed to generate unique ID after multiple attempts', 409);
            }
            continue;
          }
          throw err;
        }
      }
    } else {
      await user.save();
    }
    const profile = {
      _id: user._id,
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
      doctorData: user.doctorData
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
      folder: 'doctors/practice',
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png']
    });
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    user.doctorData.practiceDocuments.push({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      size: uploadResult.size,
      uploadedAt: uploadResult.uploadedAt
    });
    try {
      await user.save();
    } catch (dbError) {
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
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.doctorData.practiceDocuments.length) {
      return errorResponse(res, 'Document not found', 404);
    }
    const document = user.doctorData.practiceDocuments[idx];
    await deleteFromCloudinary(document.publicId);
    user.doctorData.practiceDocuments.splice(idx, 1);
    await user.save();
    return successResponse(res, null, 'Document deleted successfully');
  } catch (error) {
    console.error('Delete error:', error);
    return errorResponse(res, 'Failed to delete document', 500);
  }
};

export const getSlots = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    let slots = user.doctorData.slots || [];
    if (req.query.activeOnly === 'true') {
      slots = slots.filter(slot => slot.isActive);
    }
    if (req.query.startDate) {
      const normalizedStartDate = normalizeDate(req.query.startDate);
      slots = slots.filter(slot => normalizeDate(slot.date) >= normalizedStartDate);
    }
    if (req.query.endDate) {
      const normalizedEndDate = normalizeDate(req.query.endDate);
      slots = slots.filter(slot => normalizeDate(slot.date) <= normalizedEndDate);
    }
    slots.sort((a, b) => {
      const comparison = normalizeDate(a.date).localeCompare(normalizeDate(b.date));
      if (comparison !== 0) return comparison;
      return a.startTime.localeCompare(b.startTime);
    });
    return successResponse(res, { slots }, 'Slots retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve slots', 500);
  }
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Normalize date to YYYY-MM-DD string
const normalizeDate = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const checkOverlap = (newSlot, existingSlots, excludeIndex = -1) => {
  const newDate = normalizeDate(newSlot.date);
  const newStart = timeToMinutes(newSlot.startTime);
  const newEnd = timeToMinutes(newSlot.endTime);
  for (let i = 0; i < existingSlots.length; i++) {
    if (i === excludeIndex) continue;
    const slot = existingSlots[i];
    if (normalizeDate(slot.date) === newDate && slot.isActive) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      if (newStart < slotEnd && newEnd > slotStart) {
        return true;
      }
    }
  }
  return false;
};

export const addSlot = async (req, res) => {
  try {
    const { date, startTime, endTime, capacity, consultationType } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    
    // Validate endTime is after startTime
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      return errorResponse(res, 'End time must be after start time', 400);
    }

    // Store date as Date object after normalization
    const newSlot = {
      date: new Date(normalizeDate(date)),
      startTime,
      endTime,
      capacity,
      consultationType: consultationType || 'IN_PERSON',
      booked: 0,
      isActive: true,
      createdAt: new Date()
    };
    if (checkOverlap(newSlot, user.doctorData.slots)) {
      return errorResponse(res, 'Slot overlaps with existing slot', 400);
    }
    user.doctorData.slots.push(newSlot);
    user.markModified('doctorData.slots');
    await user.save();
    return successResponse(res, {
      slot: newSlot,
      index: user.doctorData.slots.length - 1
    }, 'Slot added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add slot', 500);
  }
};

export const updateSlot = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid slot index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.doctorData.slots.length) {
      return errorResponse(res, 'Slot not found', 404);
    }
    const updates = req.body || {};
    const allowed = ['date', 'startTime', 'endTime', 'capacity', 'consultationType', 'isActive'];
    const assigned = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) assigned[key] = updates[key];
    }

    // Validate end time is after start time if either is being updated
    if (assigned.startTime || assigned.endTime) {
      const startTime = assigned.startTime || user.doctorData.slots[idx].startTime;
      const endTime = assigned.endTime || user.doctorData.slots[idx].endTime;
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      if (endMinutes <= startMinutes) {
        return errorResponse(res, 'End time must be after start time', 400);
      }
    }

    // Validate capacity is not reduced below current bookings
    if (assigned.capacity !== undefined) {
      const currentSlot = user.doctorData.slots[idx];
      if (assigned.capacity < currentSlot.booked) {
        return errorResponse(res, 'Cannot reduce capacity below current bookings', 400);
      }
    }

    if (assigned.date) assigned.date = new Date(assigned.date);
    const updatedSlot = { ...user.doctorData.slots[idx], ...assigned };
    if (checkOverlap(updatedSlot, user.doctorData.slots, idx)) {
      return errorResponse(res, 'Updated slot overlaps with existing slot', 400);
    }
    Object.assign(user.doctorData.slots[idx], assigned);
    user.markModified('doctorData.slots');
    await user.save();
    return successResponse(res, { slot: user.doctorData.slots[idx] }, 'Slot updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update slot', 500);
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid slot index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.doctorData.slots.length) {
      return errorResponse(res, 'Slot not found', 404);
    }
    const slot = user.doctorData.slots[idx];
    if (slot.booked > 0) {
      user.doctorData.slots[idx].isActive = false;
    } else {
      user.doctorData.slots.splice(idx, 1);
    }
    user.markModified('doctorData.slots');
    await user.save();
    return successResponse(res, null, 'Slot deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete slot', 500);
  }
};

// Prescription Template CRUD Operations
export const getPrescriptionTemplates = async (req, res) => {
  try {
    const { activeOnly, category } = req.query;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    let templates = user.doctorData.prescriptionTemplates || [];

    // Apply filters
    if (activeOnly === 'true') {
      templates = templates.filter(t => t.isActive);
    }
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    // Sort by createdAt descending
    templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Convert Mongoose documents to plain objects and ensure medicines is always an array
    templates = templates.map(t => {
      // Convert to plain object if it's a Mongoose document
      const plainTemplate = t.toObject ? t.toObject() : JSON.parse(JSON.stringify(t));
      return {
        ...plainTemplate,
        medicines: Array.isArray(plainTemplate.medicines) ? plainTemplate.medicines : []
      };
    });

    return successResponse(res, { templates }, 'Templates retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve templates', 500);
  }
};

export const addPrescriptionTemplate = async (req, res) => {
  try {
    const { name, category, medicines, notes } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    if (!medicines || medicines.length === 0) {
      return errorResponse(res, 'At least one medicine is required', 400);
    }

    const templateId = crypto.randomUUID();
    const newTemplate = {
      templateId,
      name,
      category,
      medicines,
      notes: notes || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.doctorData.prescriptionTemplates.push(newTemplate);
    user.markModified('doctorData.prescriptionTemplates');
    await user.save();

    const index = user.doctorData.prescriptionTemplates.length - 1;
    return successResponse(res, { template: newTemplate, index }, 'Template created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create template', 500);
  }
};

export const updatePrescriptionTemplate = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid template index', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    if (idx >= user.doctorData.prescriptionTemplates.length) {
      return errorResponse(res, 'Template not found', 404);
    }

    const { name, category, medicines, notes, isActive } = req.body;
    const template = user.doctorData.prescriptionTemplates[idx];

    if (name !== undefined) template.name = name;
    if (category !== undefined) template.category = category;
    if (medicines !== undefined) {
      if (medicines.length === 0) {
        return errorResponse(res, 'At least one medicine is required', 400);
      }
      template.medicines = medicines;
    }
    if (notes !== undefined) template.notes = notes;
    if (isActive !== undefined) template.isActive = isActive;
    template.updatedAt = new Date();

    user.markModified('doctorData.prescriptionTemplates');
    await user.save();

    return successResponse(res, { template }, 'Template updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update template', 500);
  }
};

export const deletePrescriptionTemplate = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid template index', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    if (idx >= user.doctorData.prescriptionTemplates.length) {
      return errorResponse(res, 'Template not found', 404);
    }

    // Soft delete
    user.doctorData.prescriptionTemplates[idx].isActive = false;
    user.doctorData.prescriptionTemplates[idx].updatedAt = new Date();
    user.markModified('doctorData.prescriptionTemplates');
    await user.save();

    return successResponse(res, null, 'Template deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete template', 500);
  }
};

export const exportReport = async (req, res) => {
  try {
    // Authorization
    const { id } = req.params;
    if (req.user.role !== ROLES.DOCTOR || id !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Extract and validate parameters
    const { reportType, format, startDate, endDate } = req.query;
    
    if (!reportType || !['patients', 'consultations', 'revenue'].includes(reportType)) {
      return errorResponse(res, 'Invalid report type. Allowed: patients, consultations, revenue', 400);
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
    
    const doctorId = req.user._id;
    let data = [];
    let fields = [];
    let columns = [];
    let title = '';
    
    switch (reportType) {
      case 'patients': {
        title = 'Patients Report';
        // Aggregate unique patients from bookings
        const patientAgg = await Booking.aggregate([
          {
            $match: {
              providerId: doctorId,
              bookingDate: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$patientId',
              totalConsultations: { $sum: 1 },
              lastVisit: { $max: '$bookingDate' },
              statuses: { $push: '$status' }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'patient'
            }
          },
          { $unwind: '$patient' }
        ]);
        
        data = patientAgg.map(p => ({
          patientName: p.patient.patientData?.name || p.patient.name || 'N/A',
          contact: p.patient.phone ? `${p.patient.phone.slice(0, 3)}***${p.patient.phone.slice(-2)}` : 'N/A',
          totalConsultations: p.totalConsultations,
          lastVisit: formatDateForExport(p.lastVisit),
          status: p.statuses.includes(BOOKING_STATUS.COMPLETED) ? 'Active' : 'Pending'
        }));
        
        fields = [
          { label: 'Patient Name', value: 'patientName' },
          { label: 'Contact (Masked)', value: 'contact' },
          { label: 'Total Consultations', value: 'totalConsultations' },
          { label: 'Last Visit', value: 'lastVisit' },
          { label: 'Status', value: 'status' }
        ];
        
        columns = [
          { header: 'Patient Name', key: 'patientName', width: 120 },
          { header: 'Contact', key: 'contact', width: 80 },
          { header: 'Consultations', key: 'totalConsultations', width: 80 },
          { header: 'Last Visit', key: 'lastVisit', width: 80 },
          { header: 'Status', key: 'status', width: 60 }
        ];
        break;
      }
      
      case 'consultations': {
        title = 'Consultations Report';
        const bookings = await Booking.find({
          providerId: doctorId,
          bookingDate: { $gte: start, $lte: end }
        }).populate('patientId', 'name patientData.name phone').lean();
        
        data = bookings.map(b => ({
          bookingId: b.bookingId || b._id.toString().slice(-8).toUpperCase(),
          patientName: b.patientId?.patientData?.name || b.patientId?.name || 'N/A',
          date: formatDateForExport(b.bookingDate),
          time: b.bookingTime?.startTime || 'N/A',
          type: b.entityType || 'OPD',
          status: b.status,
          paymentAmount: b.paymentAmount || 0
        }));
        
        fields = [
          { label: 'Booking ID', value: 'bookingId' },
          { label: 'Patient Name', value: 'patientName' },
          { label: 'Date', value: 'date' },
          { label: 'Time', value: 'time' },
          { label: 'Type', value: 'type' },
          { label: 'Status', value: 'status' },
          { label: 'Payment (₹)', value: 'paymentAmount' }
        ];
        
        columns = [
          { header: 'Booking ID', key: 'bookingId', width: 70 },
          { header: 'Patient', key: 'patientName', width: 100 },
          { header: 'Date', key: 'date', width: 70 },
          { header: 'Time', key: 'time', width: 50 },
          { header: 'Type', key: 'type', width: 50 },
          { header: 'Status', key: 'status', width: 70 },
          { header: 'Payment', key: 'paymentAmount', width: 60, isCurrency: true }
        ];
        break;
      }
      
      case 'revenue': {
        title = 'Revenue Report';
        const revenueAgg = await Booking.aggregate([
          {
            $match: {
              providerId: doctorId,
              bookingDate: { $gte: start, $lte: end },
              status: BOOKING_STATUS.COMPLETED,
              paymentStatus: PAYMENT_STATUS.SUCCESS
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
              totalBookings: { $sum: 1 },
              totalRevenue: { $sum: '$paymentAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        data = revenueAgg.map(r => ({
          date: formatDateForExport(new Date(r._id)),
          totalBookings: r.totalBookings,
          totalRevenue: r.totalRevenue,
          averageValue: r.totalBookings > 0 ? Math.round(r.totalRevenue / r.totalBookings) : 0
        }));
        
        fields = [
          { label: 'Date', value: 'date' },
          { label: 'Total Bookings', value: 'totalBookings' },
          { label: 'Total Revenue (₹)', value: 'totalRevenue' },
          { label: 'Average Value (₹)', value: 'averageValue' }
        ];
        
        columns = [
          { header: 'Date', key: 'date', width: 100 },
          { header: 'Total Bookings', key: 'totalBookings', width: 100 },
          { header: 'Total Revenue', key: 'totalRevenue', width: 100, isCurrency: true },
          { header: 'Avg Value', key: 'averageValue', width: 100, isCurrency: true }
        ];
        break;
      }
    }
    
    // Generate export
    const dateRangeStr = `${formatDateForExport(start)} to ${formatDateForExport(end)}`;
    const filename = sanitizeFilename(`doctor_${reportType}_${Date.now()}`);
    
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

export const getSettings = async (req, res) => {
  try {
    if (req.user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Access denied: Doctor role required', 403);
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
      expectedRole: ROLES.DOCTOR,
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