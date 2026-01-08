import User from '../models/User.model.js';
import Booking from '../models/Booking.model.js';
import Prescription from '../models/Prescription.model.js';
import Document from '../models/Document.model.js';
import Consultation from '../models/Consultation.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { updateUserSettings } from '../utils/settings.util.js';
import { generatePatientId, ROLES, BOOKING_STATUS } from '@arogyafirst/shared';
import { generatePDF, generateCSV, formatDateForExport, sanitizeFilename } from '../utils/export.util.js';

export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    // Defensive check for role
    if (user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Forbidden: Only patients can access this resource', 403);
    }

    // req.user is already sanitized by the auth middleware; return it directly
    return successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone, location, dateOfBirth, aadhaarLast4 } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify role
    if (user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Forbidden: Only patients can update this profile', 403);
    }

    // Check if phone changed and generate new uniqueId if so
    if (phone && phone !== user.patientData.phone) {
      const newUniqueId = generatePatientId(phone);
      const existingUser = await User.findOne({ uniqueId: newUniqueId });
      if (existingUser) {
        return errorResponse(res, 'Phone number already in use', 400);
      }
      user.uniqueId = newUniqueId;
    }

    // Update patientData fields
    if (name !== undefined) user.patientData.name = name;
    if (phone !== undefined) user.patientData.phone = phone;
    if (location !== undefined) user.patientData.location = location;
    // Only update dateOfBirth when it is explicitly provided (not undefined or null)
    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      user.patientData.dateOfBirth = new Date(dateOfBirth);
    }
    if (aadhaarLast4 !== undefined) user.patientData.aadhaarLast4 = aadhaarLast4;

    // Save user (triggers validation)
    await user.save();

    // Return updated profile excluding sensitive fields
    const { password, refreshTokens, ...updatedUserData } = user.toObject();
    return successResponse(res, updatedUserData, 'Profile updated successfully');
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message);
      return errorResponse(res, 'Validation failed', 400, validationErrors);
    }

    // Handle duplicate key errors (e.g., uniqueId conflict)
    if (error.code === 11000) {
      return errorResponse(res, 'Phone number already in use', 400);
    }

    // General error
    return errorResponse(res, error.message || 'Failed to update profile', 500);
  }
};

export const getMedicalHistory = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Verify role
    if (req.user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Forbidden: Only patients can access medical history', 403);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Use optimized DB-level pagination for paginated requests
    const result = await fetchPatientTimelineWithPagination(patientId, { type, startDate, endDate, skip, limit: limitNum });

    return successResponse(res, {
      timeline: result.timeline,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(result.total / limitNum)
      }
    }, 'Medical history retrieved successfully');
  } catch (error) {
    console.error('Medical history error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve medical history', 500);
  }
};

export const getHealthProfile = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Verify role
    if (req.user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Forbidden: Only patients can access health profile', 403);
    }

    // Get today's date for upcoming appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Execute all queries in parallel for efficiency
    const [totalBookings, upcomingAppointments, totalPrescriptions, totalDocuments, recentBooking, recentPrescription] = await Promise.all([
      Booking.countDocuments({ patientId }),
      Booking.countDocuments({
        patientId,
        status: BOOKING_STATUS.CONFIRMED,
        bookingDate: { $gte: today }
      }),
      Prescription.countDocuments({ patientId }),
      Document.countDocuments({ patientId }),
      Booking.findOne({ patientId }).sort({ bookingDate: -1 }).select('bookingDate').lean(),
      Prescription.findOne({ patientId }).sort({ createdAt: -1 }).select('createdAt').lean()
    ]);

    // Determine last activity date
    const lastActivity = [
      recentBooking?.bookingDate,
      recentPrescription?.createdAt
    ].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || null;

    return successResponse(res, {
      totalBookings,
      upcomingAppointments,
      totalPrescriptions,
      totalDocuments,
      lastActivity
    }, 'Health profile retrieved successfully');
  } catch (error) {
    console.error('Health profile error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve health profile', 500);
  }
};

export const getSettings = async (req, res) => {
  try {
    if (req.user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Access denied: Patient role required', 403);
    }
    return successResponse(res, { settings: req.user.settings }, 'Settings retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve settings', 500);
  }
};

/**
 * Helper function to fetch patient timeline with DB-level pagination
 * Optimized for paginated requests - only fetches requested page from database
 * Respects type filter, date range, and pagination parameters
 */
const fetchPatientTimelineWithPagination = async (patientId, { type, startDate, endDate, skip = 0, limit = 20 } = {}) => {
  const dateFilter = {};
  if (startDate) {
    dateFilter.$gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.$lte = new Date(endDate);
  }

  // Build parallel queries for each collection type with skip/limit at DB level
  const queries = [];
  const counts = [];

  // Query bookings
  if (!type || type === 'booking') {
    const bookingFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      bookingFilter.bookingDate = dateFilter;
    }
    queries.push(
      Booking.find(bookingFilter)
        .select('bookingId providerSnapshot entityType bookingDate bookingTime status paymentStatus paymentAmount metadata')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    );
    counts.push(Booking.countDocuments(bookingFilter));
  }

  // Query prescriptions
  if (!type || type === 'prescription') {
    const prescriptionFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      prescriptionFilter.createdAt = dateFilter;
    }
    queries.push(
      Prescription.find(prescriptionFilter)
        .select('prescriptionId doctorSnapshot medicines pharmacySnapshot status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    );
    counts.push(Prescription.countDocuments(prescriptionFilter));
  }

  // Query documents
  if (!type || type === 'document') {
    const documentFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      documentFilter.createdAt = dateFilter;
    }
    queries.push(
      Document.find(documentFilter)
        .select('title description documentType uploadedBy createdAt fileUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    );
    counts.push(Document.countDocuments(documentFilter));
  }

  // Query consultations (if available)
  if (!type || type === 'consultation') {
    const consultationFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      consultationFilter.createdAt = dateFilter;
    }
    queries.push(
      Consultation.find(consultationFilter)
        .select('consultationId doctorSnapshot mode status createdAt notes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .catch(() => []) // Graceful fallback if consultation collection doesn't exist
    );
    counts.push(Consultation.countDocuments(consultationFilter).catch(() => 0));
  }

  // Execute all queries in parallel
  const [bookingsData, prescriptionsData, documentsData, consultationsData] = await Promise.all(queries);
  const [bookingsCount, prescriptionsCount, documentsCount, consultationsCount] = await Promise.all(counts);

  let timeline = [];
  let total = 0;

  // Map bookings
  if (bookingsData && Array.isArray(bookingsData)) {
    timeline.push(...bookingsData.map(b => ({
      type: 'booking',
      id: b._id,
      date: b.bookingDate,
      details: {
        providerName: b.providerSnapshot?.name || 'Unknown Provider',
        bookingType: b.entityType,
        status: b.status,
        department: b.metadata?.department || null,
        bookingTime: b.bookingTime,
        paymentStatus: b.paymentStatus,
        paymentAmount: b.paymentAmount
      }
    })));
    total += bookingsCount || 0;
  }

  // Map prescriptions
  if (prescriptionsData && Array.isArray(prescriptionsData)) {
    timeline.push(...prescriptionsData.map(p => ({
      type: 'prescription',
      id: p._id,
      date: p.createdAt,
      details: {
        prescribedBy: p.doctorSnapshot?.name || 'Unknown Doctor',
        medicines: (p.medicines || []).map(m => 
          typeof m === 'string' ? m : `${m.name || 'Medicine'} ${m.dosage || ''} ${m.frequency || ''}`.trim()
        ),
        pharmacy: p.pharmacySnapshot?.name,
        status: p.status
      }
    })));
    total += prescriptionsCount || 0;
  }

  // Map documents
  if (documentsData && Array.isArray(documentsData)) {
    timeline.push(...documentsData.map(d => ({
      type: 'document',
      id: d._id,
      date: d.createdAt,
      details: {
        documentType: d.documentType,
        fileName: d.title || 'Untitled',
        description: d.description,
        fileUrl: d.fileUrl,
        uploadedBy: d.uploadedBy
      }
    })));
    total += documentsCount || 0;
  }

  // Map consultations
  if (consultationsData && Array.isArray(consultationsData)) {
    timeline.push(...consultationsData.map(c => ({
      type: 'consultation',
      id: c._id,
      date: c.createdAt,
      details: {
        doctorName: c.doctorSnapshot?.name || 'Unknown Doctor',
        mode: c.mode || 'unknown',
        status: c.status,
        notes: c.notes || ''
      }
    })));
    total += consultationsCount || 0;
  }

  // Sort by date descending (needed when combining multiple collections)
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { timeline, total };
};

/**
 * Helper function to fetch patient timeline without pagination (for export/analytics)
 * IMPORTANT: This loads entire timeline into memory - use only for exports or analytics with capped limits
 * Respects type filter and date range
 */
const fetchPatientTimeline = async (patientId, { type, startDate, endDate } = {}) => {
  const dateFilter = {};
  if (startDate) {
    dateFilter.$gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.$lte = new Date(endDate);
  }

  let timeline = [];

  // Fetch bookings if type is 'booking' or 'all'
  if (!type || type === 'booking') {
    const bookingFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      bookingFilter.bookingDate = dateFilter;
    }

    const bookings = await Booking.find(bookingFilter)
      .select('bookingId providerSnapshot entityType bookingDate bookingTime status paymentStatus paymentAmount metadata')
      .lean();

    timeline.push(...bookings.map(b => ({
      type: 'booking',
      id: b._id,
      date: b.bookingDate,
      details: {
        providerName: b.providerSnapshot?.name || 'Unknown Provider',
        bookingType: b.entityType,
        status: b.status,
        department: b.metadata?.department || null,
        bookingTime: b.bookingTime,
        paymentStatus: b.paymentStatus,
        paymentAmount: b.paymentAmount
      }
    })));
  }

  // Fetch prescriptions if type is 'prescription' or 'all'
  if (!type || type === 'prescription') {
    const prescriptionFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      prescriptionFilter.createdAt = dateFilter;
    }

    const prescriptions = await Prescription.find(prescriptionFilter)
      .select('prescriptionId doctorSnapshot medicines pharmacySnapshot status createdAt')
      .lean();

    timeline.push(...prescriptions.map(p => ({
      type: 'prescription',
      id: p._id,
      date: p.createdAt,
      details: {
        prescribedBy: p.doctorSnapshot?.name || 'Unknown Doctor',
        medicines: (p.medicines || []).map(m => 
          typeof m === 'string' ? m : `${m.name || 'Medicine'} ${m.dosage || ''} ${m.frequency || ''}`.trim()
        ),
        pharmacy: p.pharmacySnapshot?.name,
        status: p.status
      }
    })));
  }

  // Fetch documents if type is 'document' or 'all'
  if (!type || type === 'document') {
    const documentFilter = { patientId };
    if (Object.keys(dateFilter).length > 0) {
      documentFilter.createdAt = dateFilter;
    }

    const documents = await Document.find(documentFilter)
      .select('title description documentType uploadedBy createdAt fileUrl')
      .lean();

    timeline.push(...documents.map(d => ({
      type: 'document',
      id: d._id,
      date: d.createdAt,
      details: {
        documentType: d.documentType,
        fileName: d.title || 'Untitled',
        description: d.description,
        fileUrl: d.fileUrl,
        uploadedBy: d.uploadedBy
      }
    })));
  }

  // Fetch consultations if type is 'consultation' or 'all'
  // Note: Consultations are a distinct event type from bookings
  if (!type || type === 'consultation') {
    try {
      const consultationFilter = { patientId };
      if (Object.keys(dateFilter).length > 0) {
        consultationFilter.createdAt = dateFilter;
      }

      const consultations = await Consultation.find(consultationFilter)
        .select('consultationId doctorSnapshot mode status createdAt notes')
        .lean()
        .catch(() => []); // Graceful fallback if collection doesn't exist

      timeline.push(...consultations.map(c => ({
        type: 'consultation',
        id: c._id,
        date: c.createdAt,
        details: {
          doctorName: c.doctorSnapshot?.name || 'Unknown Doctor',
          mode: c.mode || 'unknown',
          status: c.status,
          notes: c.notes || ''
        }
      })));
    } catch (err) {
      // Silently skip consultations if there's an error fetching them
      console.warn('Warning: Could not fetch consultations:', err.message);
    }
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  return timeline;
};

export const exportMedicalHistory = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { format, type, startDate, endDate } = req.query;

    // Verify role
    if (req.user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Forbidden: Only patients can export medical history', 403);
    }

    // Validate format
    if (!format || !['csv', 'pdf'].includes(format)) {
      return errorResponse(res, 'Invalid export format. Must be csv or pdf', 400);
    }

    // Fetch timeline data (respects type filter like UI does)
    const timeline = await fetchPatientTimeline(patientId, { type, startDate, endDate });

    if (timeline.length === 0) {
      return errorResponse(res, 'No medical history data to export for the selected date range', 404);
    }

    // Prepare export filename with sanitization
    const timestamp = Date.now();
    const baseFilename = sanitizeFilename(`medical-history-${patientId}-${timestamp}`);

    if (format === 'csv') {
      // Flatten timeline data for CSV
      const flattenedData = timeline.map(item => ({
        Date: formatDateForExport(item.date),
        Type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        Details: item.type === 'booking' 
          ? `${item.details.providerName} (${item.details.bookingType})`
          : item.type === 'prescription'
          ? `Prescribed by ${item.details.prescribedBy}`
          : item.details.fileName,
        Status: item.type === 'booking' ? item.details.status : (item.type === 'prescription' ? item.details.status : 'N/A')
      }));

      const fields = [
        { label: 'Date', value: 'Date' },
        { label: 'Type', value: 'Type' },
        { label: 'Details', value: 'Details' },
        { label: 'Status', value: 'Status' }
      ];

      const csvString = generateCSV(flattenedData, fields);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.csv"`);
      res.send(csvString);
    } else if (format === 'pdf') {
      // Prepare data for PDF table
      const pdfData = timeline.map(item => ({
        date: formatDateForExport(item.date),
        type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        details: item.type === 'booking' 
          ? `${item.details.providerName} (${item.details.bookingType})`
          : item.type === 'prescription'
          ? `Prescribed by ${item.details.prescribedBy}`
          : item.details.fileName,
        status: item.type === 'booking' ? item.details.status : (item.type === 'prescription' ? item.details.status : 'N/A')
      }));

      const columns = [
        { header: 'Date', key: 'date', width: 80 },
        { header: 'Type', key: 'type', width: 80 },
        { header: 'Details', key: 'details', width: 200 },
        { header: 'Status', key: 'status', width: 80 }
      ];

      const metadata = {
        dateRange: startDate && endDate 
          ? `${formatDateForExport(startDate)} to ${formatDateForExport(endDate)}`
          : 'All dates',
        generatedAt: new Date()
      };

      const pdfBuffer = await generatePDF('Medical History Timeline', pdfData, columns, metadata);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Medical history export error:', error);
    return errorResponse(res, error.message || 'Failed to export medical history', 500);
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await updateUserSettings({
      userId: req.user._id,
      expectedRole: ROLES.PATIENT,
      settingsPayload: req.body
    });
    return successResponse(res, { settings }, 'Settings updated successfully');
  } catch (error) {
    if (error.statusCode === 404) {
      return errorResponse(res, error.message, 404);
    }
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message);
      return errorResponse(res, 'Validation failed', 400, validationErrors);
    }
    return errorResponse(res, error.message || 'Failed to update settings', 500);
  }
};

/**
 * Search patients - for providers to find patients for referrals
 */
export const searchPatients = async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;

    let query = {
      role: ROLES.PATIENT,
      isActive: true
    };

    // If search term provided, search by name, email, or phone
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { email: searchRegex },
        { 'patientData.name': searchRegex },
        { 'patientData.phone': searchRegex }
      ];
    }

    const patients = await User.find(query)
      .select('_id email patientData.name patientData.phone patientData.dateOfBirth')
      .limit(parseInt(limit))
      .lean();

    const formattedPatients = patients.map(p => ({
      _id: p._id,
      name: p.patientData?.name || p.email,
      email: p.email,
      phone: p.patientData?.phone || '',
      dateOfBirth: p.patientData?.dateOfBirth || null
    }));

    return successResponse(res, formattedPatients, `Found ${formattedPatients.length} patients`);
  } catch (error) {
    console.error('Error searching patients:', error);
    return errorResponse(res, 'Failed to search patients', 500);
  }
};