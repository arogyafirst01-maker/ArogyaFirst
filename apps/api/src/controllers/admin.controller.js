import User from '../models/User.model.js';
import { successResponse, errorResponse, forbiddenResponse } from '../utils/response.util.js';
import { ROLES, VERIFICATION_STATUS } from '@arogyafirst/shared';

export const getPendingVerifications = async (req, res) => {
  try {
    const { role, sortBy = 'createdAt', order = 'asc', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build query
    const query = {
      verificationStatus: VERIFICATION_STATUS.PENDING,
      role: { $in: [ROLES.HOSPITAL, ROLES.DOCTOR] }
    };

    // Apply role filter if specified
    if (role && [ROLES.HOSPITAL, ROLES.DOCTOR].includes(role)) {
      query.role = role;
    }

    // Build sort object
    const sortOrder = order === 'desc' ? -1 : 1;
    const sort = {};
    if (sortBy === 'email') {
      sort.email = sortOrder;
    } else {
      sort.createdAt = sortOrder;
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    
    // Query users with projection and pagination
    const pendingUsers = await User.find(query, {
      _id: 1,
      email: 1,
      role: 1,
      uniqueId: 1,
      verificationStatus: 1,
      createdAt: 1,
      'hospitalData.name': 1,
      'hospitalData.location': 1,
      'hospitalData.legalDocuments': 1,
      'doctorData.name': 1,
      'doctorData.qualification': 1,
      'doctorData.experience': 1,
      'doctorData.specialization': 1,
      'doctorData.hospitalId': 1,
      'doctorData.practiceDocuments': 1
    })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return successResponse(res, {
      items: pendingUsers,
      page: pageNum,
      limit: limitNum,
      total
    }, 'Pending verifications retrieved successfully');
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return errorResponse(res, 'Failed to retrieve pending verifications', 500);
  }
};

export const verifyEntity = async (req, res) => {
  try {
    const { entityType, id } = req.params;
    const { status, note } = req.body;

    // Validate status using shared constants
    if (![VERIFICATION_STATUS.APPROVED, VERIFICATION_STATUS.REJECTED].includes(status)) {
      return errorResponse(res, `Invalid status. Must be ${VERIFICATION_STATUS.APPROVED} or ${VERIFICATION_STATUS.REJECTED}`, 400);
    }

    // Validate entityType
    if (!['hospital', 'doctor'].includes(entityType)) {
      return errorResponse(res, 'Invalid entity type. Must be hospital or doctor', 400);
    }

    // Require admin note when rejecting
    if (status === VERIFICATION_STATUS.REJECTED && (!note || !note.trim())) {
      return errorResponse(res, 'Admin note is required when rejecting verification', 400);
    }

    // Verify existence and role first to provide precise errors
    const userExists = await User.findById(id).select('_id role email uniqueId verificationStatus');
    if (!userExists) {
      return errorResponse(res, 'User not found', 404);
    }

    const expectedRole = entityType === 'hospital' ? ROLES.HOSPITAL : ROLES.DOCTOR;
    if (userExists.role !== expectedRole) {
      return errorResponse(res, 'User role does not match entity type', 400);
    }

    // Attempt atomic update only when current verificationStatus is PENDING to avoid races
    const update = {
      $set: {
        verificationStatus: status,
        isVerified: status === VERIFICATION_STATUS.APPROVED
      },
      $push: {
        verificationNotes: {
          adminId: req.user._id,
          action: status,
          note: note || '',
          timestamp: new Date()
        }
      }
    };

    const filter = { _id: id, role: expectedRole, verificationStatus: VERIFICATION_STATUS.PENDING };

    const updated = await User.findOneAndUpdate(filter, update, { new: true }).select('_id email role uniqueId verificationStatus isVerified verificationNotes');

    if (!updated) {
      // If we reach here, the document exists but did not match the PENDING precondition
      // Return conflict to indicate state changed concurrently
      return errorResponse(res, 'Verification state has changed and cannot be modified', 409);
    }

    const profile = {
      _id: updated._id,
      email: updated.email,
      role: updated.role,
      uniqueId: updated.uniqueId,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
      verificationNotes: updated.verificationNotes
    };

    return successResponse(res, { user: profile }, 'Verification status updated successfully');
  } catch (error) {
    console.error('Error verifying entity:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update verification status', 500);
  }
};

export const getVerificationHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user and populate verificationNotes.adminId with email
    const user = await User.findById(userId).populate('verificationNotes.adminId', 'email uniqueId');
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user.verificationNotes, 'Verification history retrieved successfully');
  } catch (error) {
    console.error('Error fetching verification history:', error);
    return errorResponse(res, 'Failed to retrieve verification history', 500);
  }
};