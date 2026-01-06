const Prescription = require('../models/Prescription.model.js');
const PharmacyLink = require('../models/PharmacyLink.model.js');
const User = require('../models/User.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { ROLES, PRESCRIPTION_STATUS } = require('@arogyafirst/shared');

/**
 * Create Prescription
 * 
 * Doctor creates a prescription for a patient with medicines list.
 * Optionally assigns to a specific pharmacy.
 * 
 * @route POST /api/prescriptions/create
 * @access Private (Doctor)
 */
const createPrescription = async (req, res) => {
  try {
    // Validate doctor role
    if (req.user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Only doctors can create prescriptions', 403);
    }

    const { patientId, medicines, pharmacyId, bookingId, notes } = req.body;

    console.log('[Prescription.Create] Input - medicines:', medicines, 'type:', typeof medicines, 'isArray:', Array.isArray(medicines));

    // Validate and normalize medicines to ensure it's always an array
    if (!Array.isArray(medicines) || medicines.length === 0) {
      console.error('[Prescription.Create] Invalid medicines - not array or empty');
      return errorResponse(res, 'At least one medicine is required', 400);
    }
    
    // Ensure each medicine has required fields
    const validMedicines = medicines.map(m => {
      if (!m.name || !m.dosage) {
        throw new Error('Each medicine must have name and dosage');
      }
      return {
        name: String(m.name).trim(),
        dosage: String(m.dosage).trim(),
        quantity: Number(m.quantity) || 1,
        instructions: String(m.instructions || '').trim(),
        duration: String(m.duration || '').trim()
      };
    });

    console.log('[Prescription.Create] Valid medicines:', validMedicines);

    // Validate patient exists and is PATIENT role
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Invalid patient ID', 400);
    }

    // Validate pharmacy is required
    if (!pharmacyId) {
      return errorResponse(res, 'Pharmacy selection is required. Please select a pharmacy for this prescription.', 400);
    }
    
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Invalid pharmacy ID. Please select a valid pharmacy.', 400);
    }

    // Fetch doctor
    const doctor = await User.findById(req.user._id);

    // Build snapshots
    const doctorSnapshot = {
      name: doctor.doctorData?.name || '',
      specialization: doctor.doctorData?.specialization || '',
      uniqueId: doctor.uniqueId,
    };

    const patientSnapshot = {
      name: patient.patientData?.name || '',
      phone: patient.patientData?.phone || patient.phone || '',
      email: patient.email,
    };

    const pharmacySnapshot = {
      name: pharmacy.pharmacyData?.name || '',
      location: pharmacy.pharmacyData?.location || '',
      uniqueId: pharmacy.uniqueId,
    };

    // Generate prescription ID
    const prescriptionId = Prescription.generatePrescriptionId();

    // Create prescription with strict type checking
    const prescription = new Prescription({
      prescriptionId,
      doctorId: req.user._id,
      patientId,
      pharmacyId,
      bookingId: bookingId || null,
      medicines: Array.isArray(validMedicines) ? validMedicines : [],
      status: PRESCRIPTION_STATUS.PENDING,
      notes: notes || '',
      doctorSnapshot,
      patientSnapshot,
      pharmacySnapshot,
      createdBy: req.user._id,
    });

    console.log('[Prescription.Create] Before save - medicines:', prescription.medicines, 'isArray:', Array.isArray(prescription.medicines));

    await prescription.save();

    console.log('[Prescription.Create] After save - medicines:', prescription.medicines, 'isArray:', Array.isArray(prescription.medicines));

    // Build response with absolute certainty medicines is an array
    const responseData = {
      _id: prescription._id,
      prescriptionId: prescription.prescriptionId,
      doctorId: prescription.doctorId,
      patientId: prescription.patientId,
      pharmacyId: prescription.pharmacyId,
      bookingId: prescription.bookingId,
      medicines: Array.isArray(prescription.medicines) ? prescription.medicines : [],
      status: prescription.status,
      notes: prescription.notes,
      doctorSnapshot: prescription.doctorSnapshot,
      patientSnapshot: prescription.patientSnapshot,
      pharmacySnapshot: prescription.pharmacySnapshot,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
      createdBy: prescription.createdBy,
    };

    console.log('[Prescription.Create] Response data - medicines:', responseData.medicines, 'type:', typeof responseData.medicines, 'isArray:', Array.isArray(responseData.medicines));
    
    return successResponse(res, responseData, 'Prescription created successfully', 201);
  } catch (error) {
    console.error('[Prescription.Create] Error:', error.message);
    return errorResponse(res, error.message || 'Failed to create prescription', 500);
  }
};

/**
 * Get Patient Prescriptions
 * 
 * Retrieve prescriptions for a specific patient.
 * Accessible by patient (own prescriptions) or doctor.
 * 
 * @route GET /api/prescriptions/patient/:patientId
 * @access Private (Patient, Doctor)
 */
const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Validate access
    if (req.user.role === ROLES.PATIENT && req.user._id.toString() !== patientId) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Extract filters
    const { status, startDate, endDate } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Fetch prescriptions
    const prescriptions = await Prescription.findByPatient(patientId, filters);

    // Sanitize each prescription to ensure medicines is always an array
    const sanitizedPrescriptions = prescriptions.map(p => {
      const obj = p.toObject();
      if (!Array.isArray(obj.medicines)) {
        obj.medicines = [];
      }
      return obj;
    });

    return successResponse(res, sanitizedPrescriptions, 'Prescriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    return errorResponse(res, error.message || 'Failed to fetch prescriptions', 500);
  }
};

/**
 * Get Doctor Prescriptions
 * 
 * Retrieve prescriptions created by the authenticated doctor.
 * 
 * @route GET /api/prescriptions/doctor
 * @access Private (Doctor)
 */
const getDoctorPrescriptions = async (req, res) => {
  try {
    // Validate doctor role
    if (req.user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Only doctors can access this endpoint', 403);
    }

    // Extract filters
    const { status, patientId, startDate, endDate } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (patientId) filters.patientId = patientId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Fetch prescriptions
    const prescriptions = await Prescription.findByDoctor(req.user._id, filters);

    // Sanitize each prescription to ensure medicines is always an array
    const sanitizedPrescriptions = prescriptions.map(p => {
      const obj = p.toObject();
      if (!Array.isArray(obj.medicines)) {
        obj.medicines = [];
      }
      return obj;
    });

    return successResponse(res, sanitizedPrescriptions, 'Prescriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching doctor prescriptions:', error);
    return errorResponse(res, error.message || 'Failed to fetch prescriptions', 500);
  }
};

/**
 * Get Pharmacy Prescriptions
 * 
 * Retrieve prescriptions assigned to the authenticated pharmacy.
 * Defaults to PENDING status for incoming queue.
 * 
 * @route GET /api/prescriptions/pharmacy
 * @access Private (Pharmacy)
 */
const getPharmacyPrescriptions = async (req, res) => {
  try {
    // Validate pharmacy role
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Only pharmacies can access this endpoint', 403);
    }

    // Extract filters (default to PENDING)
    const { status = PRESCRIPTION_STATUS.PENDING, startDate, endDate } = req.query;
    const filters = { status };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Fetch prescriptions
    const prescriptions = await Prescription.findByPharmacy(req.user._id, filters);

    // Sanitize each prescription to ensure medicines is always an array
    const sanitizedPrescriptions = prescriptions.map(p => {
      const obj = p.toObject();
      if (!Array.isArray(obj.medicines)) {
        obj.medicines = [];
      }
      return obj;
    });

    return successResponse(res, sanitizedPrescriptions, 'Prescriptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching pharmacy prescriptions:', error);
    return errorResponse(res, error.message || 'Failed to fetch prescriptions', 500);
  }
};

/**
 * Pre-book Prescription at Pharmacy
 * 
 * Patient selects a pharmacy for prescription fulfillment.
 * 
 * @route POST /api/prescriptions/:prescriptionId/prebook
 * @access Private (Patient)
 */
const prebookPrescription = async (req, res) => {
  try {
    // Validate patient role
    if (req.user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Only patients can pre-book prescriptions', 403);
    }

    const { prescriptionId } = req.params;
    const { pharmacyId } = req.body;

    // Fetch prescription
    const prescription = await Prescription.findOne({ prescriptionId });
    if (!prescription) {
      return errorResponse(res, 'Prescription not found', 404);
    }

    // Validate ownership
    if (prescription.patientId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Validate status
    if (prescription.status !== PRESCRIPTION_STATUS.PENDING) {
      return errorResponse(res, 'Only pending prescriptions can be pre-booked', 400);
    }

    // Validate pharmacy
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Invalid pharmacy ID', 400);
    }

    // Build pharmacy snapshot
    const pharmacySnapshot = {
      name: pharmacy.name,
      location: pharmacy.pharmacyData?.location || '',
      uniqueId: pharmacy.uniqueId,
    };

    // Update prescription
    prescription.pharmacyId = pharmacyId;
    prescription.pharmacySnapshot = pharmacySnapshot;
    await prescription.save();

    return successResponse(res, prescription.toObject(), 'Prescription pre-booked successfully');
  } catch (error) {
    console.error('Error pre-booking prescription:', error);
    return errorResponse(res, error.message || 'Failed to pre-book prescription', 500);
  }
};

/**
 * Fulfill Prescription
 * 
 * Pharmacy marks prescription as fulfilled.
 * 
 * @route PUT /api/prescriptions/:prescriptionId/fulfill
 * @access Private (Pharmacy)
 */
const fulfillPrescription = async (req, res) => {
  try {
    // Validate pharmacy role
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Only pharmacies can fulfill prescriptions', 403);
    }

    const { prescriptionId } = req.params;

    console.log('[Fulfill] Looking for prescription:', prescriptionId);

    // Fetch prescription
    const prescription = await Prescription.findOne({ prescriptionId });
    if (!prescription) {
      console.log('[Fulfill] Prescription not found');
      return errorResponse(res, 'Prescription not found', 404);
    }

    console.log('[Fulfill] Found prescription:', {
      _id: prescription._id,
      prescriptionId: prescription.prescriptionId,
      pharmacyId: prescription.pharmacyId,
      status: prescription.status,
      currentPharmacy: req.user._id
    });

    // Validate pharmacy ownership
    if (!prescription.pharmacyId) {
      console.log('[Fulfill] No pharmacyId assigned to prescription');
      return errorResponse(res, 'This prescription does not have a pharmacy assigned', 400);
    }
    
    if (prescription.pharmacyId.toString() !== req.user._id.toString()) {
      console.log('[Fulfill] Pharmacy mismatch:', {
        prescriptionPharmacy: prescription.pharmacyId.toString(),
        currentPharmacy: req.user._id.toString()
      });
      return errorResponse(res, 'This prescription is not assigned to your pharmacy', 403);
    }

    // Validate status
    if (prescription.status !== PRESCRIPTION_STATUS.PENDING) {
      console.log('[Fulfill] Invalid status:', prescription.status);
      return errorResponse(res, 'Only pending prescriptions can be fulfilled', 400);
    }

    // Fulfill prescription
    prescription.fulfill();
    await prescription.save();

    console.log('[Fulfill] Successfully fulfilled prescription:', prescriptionId);

    return successResponse(res, prescription.toObject(), 'Prescription fulfilled successfully');
  } catch (error) {
    console.error('[Fulfill] Error fulfilling prescription:', error);
    return errorResponse(res, error.message || 'Failed to fulfill prescription', 500);
  }
};

/**
 * Cancel Prescription
 * 
 * Doctor or patient cancels a pending prescription.
 * 
 * @route PUT /api/prescriptions/:prescriptionId/cancel
 * @access Private (Doctor, Patient)
 */
const cancelPrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { cancellationReason } = req.body;

    // Fetch prescription
    const prescription = await Prescription.findOne({ prescriptionId });
    if (!prescription) {
      return errorResponse(res, 'Prescription not found', 404);
    }

    // Validate access
    if (req.user.role === ROLES.DOCTOR) {
      if (prescription.doctorId.toString() !== req.user._id.toString()) {
        return errorResponse(res, 'Access denied', 403);
      }
    } else if (req.user.role === ROLES.PATIENT) {
      if (prescription.patientId.toString() !== req.user._id.toString()) {
        return errorResponse(res, 'Access denied', 403);
      }
    } else {
      return errorResponse(res, 'Access denied', 403);
    }

    // Validate status
    if (prescription.status !== PRESCRIPTION_STATUS.PENDING) {
      return errorResponse(res, 'Only pending prescriptions can be cancelled', 400);
    }

    // Cancel prescription
    prescription.cancel(req.user._id, cancellationReason);
    await prescription.save();

    return successResponse(res, prescription.toObject(), 'Prescription cancelled successfully');
  } catch (error) {
    console.error('Error cancelling prescription:', error);
    return errorResponse(res, error.message || 'Failed to cancel prescription', 500);
  }
};

/**
 * Search Medicines
 * 
 * Doctor searches medicines from linked pharmacies for autocomplete.
 * 
 * @route GET /api/prescriptions/medicines/search
 * @access Private (Doctor)
 */
const searchMedicines = async (req, res) => {
  try {
    // Validate doctor role
    if (req.user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Only doctors can search medicines', 403);
    }

    const { query } = req.query;

    // Fetch doctor
    const doctor = await User.findById(req.user._id);
    const hospitalId = doctor.doctorData?.hospitalId;

    let linkedPharmacies = [];

    // Get linked pharmacies
    if (hospitalId) {
      // Hospital-affiliated doctor: get hospital pharmacies
      const hospital = await User.findOne({ role: ROLES.HOSPITAL, uniqueId: hospitalId });
      if (hospital && hospital.hospitalData?.pharmacies) {
        // Find pharmacy users matching hospital pharmacies
        for (const hospitalPharmacy of hospital.hospitalData.pharmacies) {
          const pharmacy = await User.findOne({
            role: ROLES.PHARMACY,
            name: hospitalPharmacy.name,
          });
          if (pharmacy) {
            linkedPharmacies.push(pharmacy);
          }
        }
      }
    }

    // Get manual pharmacy links
    const manualLinks = await PharmacyLink.findActiveByDoctor(req.user._id);
    for (const link of manualLinks) {
      if (link.pharmacyId && !linkedPharmacies.find(p => p._id.toString() === link.pharmacyId._id.toString())) {
        linkedPharmacies.push(link.pharmacyId);
      }
    }

    // Search medicines in linked pharmacies
    const medicinesMap = new Map();
    const searchRegex = new RegExp(query, 'i');

    for (const pharmacy of linkedPharmacies) {
      if (pharmacy.pharmacyData?.medicines) {
        for (const medicine of pharmacy.pharmacyData.medicines) {
          const matchesName = searchRegex.test(medicine.name);
          const matchesNormalized = medicine.nameNormalized && searchRegex.test(medicine.nameNormalized);
          
          if (matchesName || matchesNormalized) {
            const key = medicine.nameNormalized || medicine.name.toLowerCase();
            if (!medicinesMap.has(key)) {
              medicinesMap.set(key, {
                name: medicine.name,
                dosage: medicine.dosage || '',
                genericName: medicine.genericName || '',
                manufacturer: medicine.manufacturer || '',
              });
            }
          }
        }
      }
    }

    const medicines = Array.from(medicinesMap.values());

    return successResponse(res, medicines, 'Medicines retrieved successfully');
  } catch (error) {
    console.error('Error searching medicines:', error);
    return errorResponse(res, error.message || 'Failed to search medicines', 500);
  }
};

module.exports = {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPharmacyPrescriptions,
  prebookPrescription,
  fulfillPrescription,
  cancelPrescription,
  searchMedicines,
};
