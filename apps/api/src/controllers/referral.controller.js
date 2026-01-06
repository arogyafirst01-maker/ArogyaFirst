const Referral = require('../models/Referral.model.js');
const User = require('../models/User.model.js');
const { successResponse, errorResponse } = require('../utils/response.util.js');
const { withTransaction } = require('../utils/transaction.util.js');
const { sendReferralStatusEmail } = require('../utils/email.util.js');
const { ROLES, REFERRAL_STATUS, REFERRAL_TYPES } = require('@arogyafirst/shared');
const mongoose = require('mongoose');

/**
 * Helper function to build source snapshot
 */
const buildSourceSnapshot = (user) => {
  const snapshot = {
    name: user.name,
    role: user.role,
  };
  
  if (user.role === ROLES.DOCTOR) {
    snapshot.specialization = user.doctorData?.specialization || '';
    snapshot.location = user.doctorData?.location || '';
  } else if (user.role === ROLES.HOSPITAL) {
    snapshot.location = user.hospitalData?.location || '';
  } else if (user.role === ROLES.LAB) {
    snapshot.location = user.labData?.location || '';
  }
  
  return snapshot;
};

/**
 * Helper function to build target snapshot
 */
const buildTargetSnapshot = (user) => {
  const snapshot = {
    name: user.name,
    role: user.role,
  };
  
  if (user.role === ROLES.DOCTOR) {
    snapshot.specialization = user.doctorData?.specialization || '';
    snapshot.location = user.doctorData?.location || '';
  } else if (user.role === ROLES.LAB) {
    snapshot.location = user.labData?.location || '';
  } else if (user.role === ROLES.PHARMACY) {
    snapshot.location = user.pharmacyData?.location || '';
  }
  
  return snapshot;
};

/**
 * Helper function to build patient snapshot
 */
const buildPatientSnapshot = (user) => {
  return {
    name: user.name,
    phone: user.phone,
    email: user.email,
  };
};

/**
 * Helper function to validate referral type
 */
const validateReferralType = (sourceRole, referralType, targetRole) => {
  // Validate source role can create this referral type
  if (sourceRole === ROLES.HOSPITAL && referralType !== REFERRAL_TYPES.INTER_DEPARTMENTAL) {
    return { valid: false, message: 'Hospitals can only create INTER_DEPARTMENTAL referrals' };
  }
  
  if (sourceRole === ROLES.DOCTOR && 
      ![REFERRAL_TYPES.DOCTOR_TO_DOCTOR, REFERRAL_TYPES.DOCTOR_TO_PHARMACY].includes(referralType)) {
    return { valid: false, message: 'Doctors can only create DOCTOR_TO_DOCTOR or DOCTOR_TO_PHARMACY referrals' };
  }
  
  if (sourceRole === ROLES.LAB && referralType !== REFERRAL_TYPES.LAB_TO_LAB) {
    return { valid: false, message: 'Labs can only create LAB_TO_LAB referrals' };
  }
  
  // Validate target role matches referral type
  if (referralType === REFERRAL_TYPES.INTER_DEPARTMENTAL && targetRole !== ROLES.DOCTOR) {
    return { valid: false, message: 'INTER_DEPARTMENTAL referrals must target doctors' };
  }
  
  if (referralType === REFERRAL_TYPES.DOCTOR_TO_DOCTOR && targetRole !== ROLES.DOCTOR) {
    return { valid: false, message: 'DOCTOR_TO_DOCTOR referrals must target doctors' };
  }
  
  if (referralType === REFERRAL_TYPES.DOCTOR_TO_PHARMACY && targetRole !== ROLES.PHARMACY) {
    return { valid: false, message: 'DOCTOR_TO_PHARMACY referrals must target pharmacies' };
  }
  
  if (referralType === REFERRAL_TYPES.LAB_TO_LAB && targetRole !== ROLES.LAB) {
    return { valid: false, message: 'LAB_TO_LAB referrals must target labs' };
  }
  
  return { valid: true };
};

/**
 * Create Referral
 * 
 * Creates a new referral from source entity to target entity for a patient.
 * Validates roles and referral type compatibility.
 * 
 * @route POST /api/referrals/create
 * @access Private (HOSPITAL, DOCTOR, LAB)
 */
const createReferral = async (req, res) => {
  try {
    const { targetId, patientId, referralType, reason, notes, priority, metadata } = req.body;
    
    // Validate target user exists
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return errorResponse(res, 'Target user not found', 404);
    }
    
    // Validate patient exists and is PATIENT role
    const patientUser = await User.findById(patientId);
    if (!patientUser || patientUser.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Invalid patient ID', 400);
    }
    
    // Validate referral type
    const validation = validateReferralType(req.user.role, referralType, targetUser.role);
    if (!validation.valid) {
      return errorResponse(res, validation.message, 400);
    }
    
    // Build snapshots
    const sourceSnapshot = buildSourceSnapshot(req.user);
    const targetSnapshot = buildTargetSnapshot(targetUser);
    const patientSnapshot = buildPatientSnapshot(patientUser);
    
    // Generate referral ID
    const referralId = Referral.generateReferralId();
    
    // Create referral
    const referralData = {
      referralId,
      sourceId: req.user._id,
      targetId,
      patientId,
      referralType,
      reason,
      notes: notes || '',
      priority: priority || 'MEDIUM',
      sourceSnapshot,
      targetSnapshot,
      patientSnapshot,
      metadata: metadata || {},
      createdBy: req.user._id,
    };
    
    const referral = await withTransaction(async (session) => {
      const newReferral = new Referral(referralData);
      await newReferral.save({ session });
      return newReferral;
    });
    
    return successResponse(res, referral, 'Referral created successfully', 201);
  } catch (error) {
    console.error('Error creating referral:', error);
    return errorResponse(res, error.message || 'Failed to create referral', 500);
  }
};

/**
 * Get Source Referrals
 * 
 * Retrieves referrals created by the source entity with optional filters.
 * 
 * @route GET /api/referrals/source/:sourceId
 * @access Private
 */
const getSourceReferrals = async (req, res) => {
  try {
    const { sourceId } = req.params;
    
    // Validate ownership
    if (sourceId !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
    
    // Extract filters from query
    const filters = {
      status: req.query.status,
      referralType: req.query.referralType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
    
    const referrals = await Referral.findBySource(sourceId, filters)
      .populate('targetId', 'name role uniqueId')
      .populate('patientId', 'name phone email');
    
    return successResponse(res, referrals, 'Source referrals retrieved successfully');
  } catch (error) {
    console.error('Error getting source referrals:', error);
    return errorResponse(res, error.message || 'Failed to retrieve referrals', 500);
  }
};

/**
 * Get Target Referrals
 * 
 * Retrieves referrals received by the target entity with optional filters.
 * 
 * @route GET /api/referrals/target/:targetId
 * @access Private
 */
const getTargetReferrals = async (req, res) => {
  try {
    const { targetId } = req.params;
    
    // Validate ownership
    if (targetId !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }
    
    // Extract filters from query
    const filters = {
      status: req.query.status,
      referralType: req.query.referralType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
    
    const referrals = await Referral.findByTarget(targetId, filters)
      .populate('sourceId', 'name role uniqueId')
      .populate('patientId', 'name phone email');
    
    return successResponse(res, referrals, 'Target referrals retrieved successfully');
  } catch (error) {
    console.error('Error getting target referrals:', error);
    return errorResponse(res, error.message || 'Failed to retrieve referrals', 500);
  }
};

/**
 * Get Referral By ID
 * 
 * Retrieves a single referral by ID. User must be source, target, or patient.
 * 
 * @route GET /api/referrals/:id
 * @access Private
 */
const getReferralById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const referral = await Referral.findById(id)
      .populate('sourceId', 'name role uniqueId email phone')
      .populate('targetId', 'name role uniqueId email phone')
      .populate('patientId', 'name email phone');
    
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }
    
    // Validate access
    const userId = req.user._id.toString();
    const hasAccess = 
      referral.sourceId._id.toString() === userId ||
      referral.targetId._id.toString() === userId ||
      referral.patientId._id.toString() === userId;
    
    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403);
    }
    
    return successResponse(res, referral, 'Referral retrieved successfully');
  } catch (error) {
    console.error('Error getting referral:', error);
    return errorResponse(res, error.message || 'Failed to retrieve referral', 500);
  }
};

/**
 * Accept Referral
 * 
 * Target entity accepts a pending referral.
 * 
 * @route PUT /api/referrals/:id/accept
 * @access Private
 */
const acceptReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const referral = await Referral.findById(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }
    
    // Validate user is target
    if (referral.targetId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Only the target entity can accept this referral', 403);
    }
    
    // Validate status is PENDING
    if (referral.status !== REFERRAL_STATUS.PENDING) {
      return errorResponse(res, 'Only pending referrals can be accepted', 400);
    }
    
    // Accept referral
    referral.accept(req.user._id, notes);
    
    await withTransaction(async (session) => {
      await referral.save({ session });
    });

    // Send email notification to source entity
    try {
      const sourceUser = await User.findById(referral.sourceId).select('email');
      if (sourceUser?.email) {
        await sendReferralStatusEmail(
          sourceUser.email,
          referral,
          'accepted',
          '',
          notes || ''
        );
      }
    } catch (emailError) {
      console.error('Failed to send acceptance email:', emailError);
      // Don't fail the request if email fails
    }

    return successResponse(res, referral, 'Referral accepted successfully');
  } catch (error) {
    console.error('Error accepting referral:', error);
    return errorResponse(res, error.message || 'Failed to accept referral', 500);
  }
};

/**
 * Complete Referral
 * 
 * Target entity marks an accepted referral as completed.
 * 
 * @route PUT /api/referrals/:id/complete
 * @access Private
 */
const completeReferral = async (req, res) => {
  try {
    const { id } = req.params;
    
    const referral = await Referral.findById(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }
    
    // Validate user is target
    if (referral.targetId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Only the target entity can complete this referral', 403);
    }
    
    // Validate status is ACCEPTED
    if (referral.status !== REFERRAL_STATUS.ACCEPTED) {
      return errorResponse(res, 'Only accepted referrals can be completed', 400);
    }
    
    // Complete referral
    referral.complete(req.user._id);
    
    await withTransaction(async (session) => {
      await referral.save({ session });
    });

    // Send email notifications to source entity and patient
    try {
      const [sourceUser, patientUser] = await Promise.all([
        User.findById(referral.sourceId).select('email'),
        User.findById(referral.patientId).select('email'),
      ]);

      const emailPromises = [];
      
      if (sourceUser?.email) {
        emailPromises.push(
          sendReferralStatusEmail(sourceUser.email, referral, 'completed')
        );
      }
      
      if (patientUser?.email) {
        emailPromises.push(
          sendReferralStatusEmail(patientUser.email, referral, 'completed')
        );
      }

      await Promise.allSettled(emailPromises);
    } catch (emailError) {
      console.error('Failed to send completion email:', emailError);
      // Don't fail the request if email fails
    }

    return successResponse(res, referral, 'Referral completed successfully');
  } catch (error) {
    console.error('Error completing referral:', error);
    return errorResponse(res, error.message || 'Failed to complete referral', 500);
  }
};

/**
 * Reject Referral
 * 
 * Target entity rejects a pending referral with a reason.
 * 
 * @route PUT /api/referrals/:id/reject
 * @access Private
 */
const rejectReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const referral = await Referral.findById(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }
    
    // Validate user is target
    if (referral.targetId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Only the target entity can reject this referral', 403);
    }
    
    // Validate status is PENDING
    if (referral.status !== REFERRAL_STATUS.PENDING) {
      return errorResponse(res, 'Only pending referrals can be rejected', 400);
    }
    
    // Reject referral
    referral.reject(req.user._id, rejectionReason);
    
    await withTransaction(async (session) => {
      await referral.save({ session });
    });

    // Send email notification to source entity
    try {
      const sourceUser = await User.findById(referral.sourceId).select('email');
      if (sourceUser?.email) {
        await sendReferralStatusEmail(
          sourceUser.email,
          referral,
          'rejected',
          rejectionReason || ''
        );
      }
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }

    return successResponse(res, referral, 'Referral rejected successfully');
  } catch (error) {
    console.error('Error rejecting referral:', error);
    return errorResponse(res, error.message || 'Failed to reject referral', 500);
  }
};

/**
 * Cancel Referral
 * 
 * Source entity cancels a pending or accepted referral with optional reason.
 * 
 * @route PUT /api/referrals/:id/cancel
 * @access Private
 */
const cancelReferral = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    
    const referral = await Referral.findById(id);
    if (!referral) {
      return errorResponse(res, 'Referral not found', 404);
    }
    
    // Validate user is source
    if (referral.sourceId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Only the source entity can cancel this referral', 403);
    }
    
    // Validate status is PENDING or ACCEPTED
    if (![REFERRAL_STATUS.PENDING, REFERRAL_STATUS.ACCEPTED].includes(referral.status)) {
      return errorResponse(res, 'Only pending or accepted referrals can be cancelled', 400);
    }
    
    // Cancel referral
    referral.cancel(req.user._id, cancellationReason);
    
    await withTransaction(async (session) => {
      await referral.save({ session });
    });

    // Send email notification to target entity
    try {
      const targetUser = await User.findById(referral.targetId).select('email');
      if (targetUser?.email) {
        await sendReferralStatusEmail(
          targetUser.email,
          referral,
          'cancelled',
          cancellationReason || ''
        );
      }
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    return successResponse(res, referral, 'Referral cancelled successfully');
  } catch (error) {
    console.error('Error cancelling referral:', error);
    return errorResponse(res, error.message || 'Failed to cancel referral', 500);
  }
};

module.exports = {
  createReferral,
  getSourceReferrals,
  getTargetReferrals,
  getReferralById,
  acceptReferral,
  completeReferral,
  rejectReferral,
  cancelReferral,
};
