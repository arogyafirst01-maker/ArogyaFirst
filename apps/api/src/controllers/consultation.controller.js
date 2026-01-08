import Consultation from '../models/Consultation.model.js';
import Booking from '../models/Booking.model.js';
import ConsentRequest from '../models/ConsentRequest.model.js';
import User from '../models/User.model.js';
import Prescription from '../models/Prescription.model.js';
import Document from '../models/Document.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { withTransaction } from '../utils/transaction.util.js';
import { generateAgoraToken, generateChannelName, validateAgoraConfig } from '../utils/agora.util.js';
import { ROLES, CONSULTATION_STATUS, CONSULTATION_MODE, CONSENT_STATUS, BOOKING_STATUS, generateConsultationId } from '@arogyafirst/shared';

// Get doctor's patient list (patients with bookings or active consent)
export const getDoctorPatients = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    // Verify ownership
    if (doctorId !== req.user._id.toString()) {
      return errorResponse(res, 'Forbidden: You can only access your own patient list', 403);
    }
    
    const { search, sortBy = 'lastActivity', page = 1, limit = 20 } = req.query;
    
    // Find unique patient IDs from bookings
    const bookings = await Booking.find({
      providerId: doctorId,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] }
    }).select('patientId bookingDate').lean();
    
    // Find unique patient IDs from consent requests
    const consentRequests = await ConsentRequest.find({
      requesterId: doctorId,
      status: CONSENT_STATUS.APPROVED
    }).select('patientId').lean();
    
    // Merge and deduplicate patient IDs
    const patientIdsFromBookings = bookings.filter(b => b.patientId).map(b => b.patientId.toString());
    const patientIdsFromConsent = consentRequests.filter(c => c.patientId).map(c => c.patientId.toString());
    const allPatientIds = [...new Set([...patientIdsFromBookings, ...patientIdsFromConsent])];
    
    if (allPatientIds.length === 0) {
      return successResponse(res, {
        patients: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
      }, 'No patients found');
    }
    
    // Fetch patient details
    let patients = await User.find({
      _id: { $in: allPatientIds },
      role: ROLES.PATIENT
    }).select('name email phone patientData uniqueId').lean();
    
    // For each patient, fetch latest consultation and count
    const patientsWithDetails = await Promise.all(patients.map(async (patient) => {
      const latestConsultation = await Consultation.findOne({
        patientId: patient._id,
        doctorId
      }).sort({ scheduledAt: -1 }).select('scheduledAt').lean();
      
      const consultationCount = await Consultation.countDocuments({
        patientId: patient._id,
        doctorId
      });
      
      const latestBooking = bookings.find(b => b.patientId && b.patientId.toString() === patient._id.toString());
      const hasConsent = patientIdsFromConsent.includes(patient._id.toString());
      
      return {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        uniqueId: patient.uniqueId,
        lastActivity: latestConsultation?.scheduledAt || latestBooking?.bookingDate || null,
        totalConsultations: consultationCount,
        hasActiveConsent: hasConsent,
        accessType: hasConsent ? 'consent' : 'booking'
      };
    }));
    
    // Apply search filter
    let filteredPatients = patientsWithDetails;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPatients = patientsWithDetails.filter(p => 
        p.name?.toLowerCase().includes(searchLower) ||
        p.phone?.includes(search) ||
        p.email?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    if (sortBy === 'lastActivity') {
      filteredPatients.sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity) - new Date(a.lastActivity);
      });
    } else if (sortBy === 'name') {
      filteredPatients.sort((a, b) => a.name?.localeCompare(b.name));
    }
    
    // Apply pagination
    const total = filteredPatients.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPatients = filteredPatients.slice(skip, skip + parseInt(limit));
    
    // Add hasBooking field to each patient
    const patientsWithBookingFlag = paginatedPatients.map(p => ({
      ...p,
      hasBooking: patientIdsFromBookings.includes(p._id.toString())
    }));
    
    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const seenToday = await Consultation.countDocuments({
      doctorId,
      status: CONSULTATION_STATUS.COMPLETED,
      endedAt: { $gte: today, $lt: tomorrow }
    });
    
    const upcomingConsultations = await Consultation.countDocuments({
      doctorId,
      status: CONSULTATION_STATUS.SCHEDULED,
      scheduledAt: { $gte: new Date() }
    });
    
    return successResponse(res, {
      patients: patientsWithBookingFlag,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      },
      totalPatients: total,
      seenToday,
      upcomingConsultations
    }, 'Patients retrieved successfully');
  } catch (error) {
    console.error('Get doctor patients error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve patients', 500);
  }
};

// Get patient history for doctor (consent-based access)
export const getPatientHistoryForDoctor = async (req, res) => {
  try {
    const patientId = req.params.id;
    const doctorId = req.user._id;
    const { type, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    // Verify doctor has access (active consent or confirmed booking)
    const hasConsent = await ConsentRequest.findOne({
      patientId,
      requesterId: doctorId,
      status: CONSENT_STATUS.APPROVED
    });
    
    const hasBooking = await Booking.findOne({
      patientId,
      providerId: doctorId,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] }
    });
    
    if (!hasConsent && !hasBooking) {
      return errorResponse(res, 'Forbidden: You do not have access to this patient\'s medical history', 403);
    }
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }
    
    let timeline = [];
    
    // Fetch bookings
    if (!type || type === 'booking') {
      const bookingFilter = { patientId };
      if (Object.keys(dateFilter).length > 0) {
        bookingFilter.bookingDate = dateFilter;
      }
      
      const bookings = await Booking.find(bookingFilter)
        .select('providerSnapshot entityType bookingDate status metadata')
        .lean();
      
      timeline.push(...bookings.map(b => ({
        type: 'booking',
        id: b._id,
        _id: b._id.toString(),
        title: b.providerSnapshot?.name || 'Unknown Provider',
        date: b.bookingDate,
        details: {
          providerName: b.providerSnapshot?.name || 'Unknown Provider',
          bookingType: b.entityType,
          status: b.status,
          department: b.metadata?.department || null
        }
      })));
    }
    
    // Fetch prescriptions
    if (!type || type === 'prescription') {
      const prescriptionFilter = { patientId };
      if (Object.keys(dateFilter).length > 0) {
        prescriptionFilter.createdAt = dateFilter;
      }
      
      const prescriptions = await Prescription.find(prescriptionFilter)
        .select('doctorSnapshot medicines pharmacySnapshot status createdAt')
        .lean();
      
      timeline.push(...prescriptions.map(p => ({
        type: 'prescription',
        id: p._id,
        _id: p._id.toString(),
        title: `Prescription by ${p.doctorSnapshot?.name || 'Unknown Doctor'}`,
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
    
    // Fetch documents
    if (!type || type === 'document') {
      const documentFilter = { patientId };
      if (Object.keys(dateFilter).length > 0) {
        documentFilter.createdAt = dateFilter;
      }
      
      const documents = await Document.find(documentFilter)
        .select('title description documentType fileUrl createdAt')
        .lean();
      
      timeline.push(...documents.map(d => ({
        type: 'document',
        id: d._id,
        _id: d._id.toString(),
        title: d.title || 'Untitled Document',
        date: d.createdAt,
        details: {
          documentType: d.documentType,
          fileName: d.title || 'Untitled',
          description: d.description,
          fileUrl: d.fileUrl
        }
      })));
    }
    
    // Fetch consultations
    if (!type || type === 'consultation') {
      const consultationFilter = { patientId, doctorId };
      if (Object.keys(dateFilter).length > 0) {
        consultationFilter.scheduledAt = dateFilter;
      }
      
      const consultations = await Consultation.find(consultationFilter)
        .select('mode status scheduledAt duration notes diagnosis')
        .lean();
      
      timeline.push(...consultations.map(c => ({
        type: 'consultation',
        id: c._id,
        _id: c._id.toString(),
        title: `${c.mode} consultation`,
        date: c.scheduledAt,
        details: {
          mode: c.mode,
          status: c.status,
          duration: c.duration,
          notesSummary: c.notes?.[0]?.content?.substring(0, 100) || null,
          diagnosis: c.diagnosis
        }
      })));
    }
    
    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply pagination
    const total = timeline.length;
    const totalPages = Math.ceil(total / parseInt(limit));
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTimeline = timeline.slice(skip, skip + parseInt(limit));
    
    // Fetch patient info
    const patient = await User.findById(patientId).select('name email phone uniqueId').lean();
    patient.hasActiveConsent = !!hasConsent;
    
    return successResponse(res, {
      patient,
      timeline: paginatedTimeline,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      },
      accessType: hasConsent ? 'consent' : 'booking'
    }, 'Patient history retrieved successfully');
  } catch (error) {
    console.error('Get patient history error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve patient history', 500);
  }
};

// Create new consultation
export const createConsultation = async (req, res) => {
  try {
    const { patientId, bookingId, mode, scheduledAt, notes } = req.body;
    const doctorId = req.user._id;
    
    // Validate doctor has access to patient
    const hasConsent = await ConsentRequest.findOne({
      patientId,
      requesterId: doctorId,
      status: CONSENT_STATUS.APPROVED
    });
    
    const hasBooking = await Booking.findOne({
      patientId,
      providerId: doctorId,
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] }
    });
    
    if (!hasConsent && !hasBooking) {
      return errorResponse(res, 'Forbidden: You do not have access to this patient', 403);
    }
    
    // Validate booking if provided
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.patientId.toString() !== patientId || booking.providerId.toString() !== doctorId.toString()) {
        return errorResponse(res, 'Invalid booking ID or booking does not belong to this doctor-patient pair', 400);
      }
    }
    
    const consultationData = {
      doctorId,
      patientId,
      bookingId,
      mode,
      scheduledAt: new Date(scheduledAt),
      createdBy: doctorId,
      status: CONSULTATION_STATUS.SCHEDULED
    };
    
    // Add initial notes if provided
    if (notes) {
      consultationData.notes = [{
        content: notes,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    }
    
    // Generate Agora credentials for video calls
    if (mode === CONSULTATION_MODE.VIDEO_CALL) {
      if (!validateAgoraConfig()) {
        return errorResponse(res, 'Video call feature is not configured. Contact administrator.', 503);
      }
      
      const result = await withTransaction(async (session) => {
        // Generate consultation ID before creating instance
        const consultationId = generateConsultationId();
        consultationData.consultationId = consultationId;
        consultationData.agoraChannelName = generateChannelName(consultationId);
        
        const consultation = new Consultation(consultationData);
        await consultation.save({ session });
        
        // Generate Agora token
        const agoraCredentials = generateAgoraToken(consultation.agoraChannelName, 0, 'publisher', 3600);
        
        return {
          consultation: consultation.toObject(),
          agoraCredentials
        };
      });
      
      return successResponse(res, result, 'Consultation created successfully with video call credentials', 201);
    } else {
      // Non-video consultation
      const consultation = new Consultation(consultationData);
      await consultation.save();
      
      return successResponse(res, { consultation: consultation.toObject() }, 'Consultation created successfully', 201);
    }
  } catch (error) {
    console.error('Create consultation error:', error);
    return errorResponse(res, error.message || 'Failed to create consultation', 500);
  }
};

// Get consultations (role-aware)
export const getConsultations = async (req, res) => {
  try {
    const { status, mode, startDate, endDate, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const filters = {};
    
    // Role-based filtering
    if (userRole === ROLES.DOCTOR) {
      filters.doctorId = userId;
    } else if (userRole === ROLES.PATIENT) {
      filters.patientId = userId;
    } else {
      return errorResponse(res, 'Forbidden: Invalid role for accessing consultations', 403);
    }
    
    // Apply filters
    if (status) filters.status = status;
    if (mode) filters.mode = mode;
    
    if (startDate || endDate) {
      filters.scheduledAt = {};
      if (startDate) filters.scheduledAt.$gte = new Date(startDate);
      if (endDate) filters.scheduledAt.$lte = new Date(endDate);
    }
    
    // Count total
    const total = await Consultation.countDocuments(filters);
    
    // Fetch consultations
    const consultations = await Consultation.find(filters)
      .populate('patientId', 'name email phone patientData')
      .populate('doctorId', 'name email doctorData')
      .sort({ scheduledAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();
    
    return successResponse(res, {
      consultations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    }, 'Consultations retrieved successfully');
  } catch (error) {
    console.error('Get consultations error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve consultations', 500);
  }
};

// Get consultation by ID
export const getConsultationById = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const userId = req.user._id;
    
    const consultation = await Consultation.findById(consultationId)
      .populate('patientId', 'name email phone patientData')
      .populate('doctorId', 'name email doctorData')
      .lean();
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify user has access
    if (consultation.doctorId._id.toString() !== userId.toString() && 
        consultation.patientId._id.toString() !== userId.toString()) {
      return errorResponse(res, 'Forbidden: You do not have access to this consultation', 403);
    }
    
    return successResponse(res, { consultation }, 'Consultation retrieved successfully');
  } catch (error) {
    console.error('Get consultation by ID error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve consultation', 500);
  }
};

// Update consultation status
export const updateConsultationStatus = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const { status, notes, diagnosis, followUpRequired, followUpDate } = req.body;
    const doctorId = req.user._id;
    
    const consultation = await Consultation.findById(consultationId);
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify doctor ownership
    if (consultation.doctorId.toString() !== doctorId.toString()) {
      return errorResponse(res, 'Forbidden: You can only update your own consultations', 403);
    }
    
    // Use instance methods based on status
    if (status === CONSULTATION_STATUS.IN_PROGRESS) {
      await consultation.start();
    } else if (status === CONSULTATION_STATUS.COMPLETED) {
      if (!notes) {
        return errorResponse(res, 'Notes are required when completing a consultation', 400);
      }
      await consultation.complete(notes, diagnosis);
      
      if (followUpRequired) {
        consultation.followUpRequired = true;
        consultation.followUpDate = followUpDate ? new Date(followUpDate) : null;
        await consultation.save();
      }
    } else if (status === CONSULTATION_STATUS.CANCELLED) {
      await consultation.cancel(notes);
    } else if (status === CONSULTATION_STATUS.NO_SHOW) {
      consultation.status = CONSULTATION_STATUS.NO_SHOW;
      if (notes) {
        await consultation.addNote(notes);
      }
      await consultation.save();
    } else {
      consultation.status = status;
      consultation.updatedBy = doctorId;
      await consultation.save();
    }
    
    return successResponse(res, { consultation }, 'Consultation status updated successfully');
  } catch (error) {
    console.error('Update consultation status error:', error);
    return errorResponse(res, error.message || 'Failed to update consultation status', 500);
  }
};

// Add consultation note
export const addConsultationNote = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const { content } = req.body;
    const doctorId = req.user._id;
    
    const consultation = await Consultation.findById(consultationId);
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify doctor ownership
    if (consultation.doctorId.toString() !== doctorId.toString()) {
      return errorResponse(res, 'Forbidden: You can only add notes to your own consultations', 403);
    }
    
    await consultation.addNote(content);
    
    return successResponse(res, { consultation }, 'Note added successfully');
  } catch (error) {
    console.error('Add consultation note error:', error);
    return errorResponse(res, error.message || 'Failed to add note', 500);
  }
};

// Generate Agora token for consultation
export const generateConsultationAgoraToken = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const userId = req.user._id;
    
    if (!validateAgoraConfig()) {
      return errorResponse(res, 'Video call feature is not configured', 503);
    }
    
    const consultation = await Consultation.findById(consultationId);
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify user is doctor or patient for this consultation
    if (consultation.doctorId.toString() !== userId.toString() && 
        consultation.patientId.toString() !== userId.toString()) {
      return errorResponse(res, 'Forbidden: You do not have access to this consultation', 403);
    }
    
    if (consultation.mode !== CONSULTATION_MODE.VIDEO_CALL) {
      return errorResponse(res, 'This consultation is not configured for video calls', 400);
    }
    
    if (!consultation.agoraChannelName) {
      consultation.agoraChannelName = generateChannelName(consultation.consultationId);
      await consultation.save();
    }
    
    // Generate new token
    const agoraCredentials = generateAgoraToken(consultation.agoraChannelName, 0, 'publisher', 3600);
    
    return successResponse(res, { agoraCredentials }, 'Agora token generated successfully');
  } catch (error) {
    console.error('Generate Agora token error:', error);
    return errorResponse(res, error.message || 'Failed to generate Agora token', 500);
  }
};

// Save chat message to consultation
export const saveChatMessage = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const { message } = req.body;
    const userId = req.user._id;
    
    // Note: message validation (non-empty, max 1000 chars) is handled by saveChatMessageSchema middleware
    
    const consultation = await Consultation.findById(consultationId);
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify user is doctor or patient for this consultation
    const isDoctor = consultation.doctorId.toString() === userId.toString();
    const isPatient = consultation.patientId.toString() === userId.toString();
    
    if (!isDoctor && !isPatient) {
      return errorResponse(res, 'Forbidden: You do not have access to this consultation', 403);
    }
    
    // Add message to consultation
    consultation.messages.push({
      senderId: userId,
      senderRole: isDoctor ? 'DOCTOR' : 'PATIENT',
      message: message.trim(),
      timestamp: new Date()
    });
    
    await consultation.save();
    
    return successResponse(res, { 
      message: consultation.messages[consultation.messages.length - 1]
    }, 'Message saved successfully');
  } catch (error) {
    console.error('Save chat message error:', error);
    return errorResponse(res, error.message || 'Failed to save message', 500);
  }
};

// Get chat history for consultation
export const getChatHistory = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const userId = req.user._id;
    
    const consultation = await Consultation.findById(consultationId)
      .select('messages doctorId patientId')
      .lean();
    
    if (!consultation) {
      return errorResponse(res, 'Consultation not found', 404);
    }
    
    // Verify user is doctor or patient for this consultation
    const isDoctor = consultation.doctorId.toString() === userId.toString();
    const isPatient = consultation.patientId.toString() === userId.toString();
    
    if (!isDoctor && !isPatient) {
      return errorResponse(res, 'Forbidden: You do not have access to this consultation', 403);
    }
    
    return successResponse(res, { 
      messages: consultation.messages || []
    }, 'Chat history retrieved successfully');
  } catch (error) {
    console.error('Get chat history error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve chat history', 500);
  }
};

export default {
  getDoctorPatients,
  getPatientHistoryForDoctor,
  createConsultation,
  getConsultations,
  getConsultationById,
  updateConsultationStatus,
  addConsultationNote,
  generateConsultationAgoraToken,
  saveChatMessage,
  getChatHistory
};
