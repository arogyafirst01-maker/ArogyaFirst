import PharmacyLink from '../models/PharmacyLink.model.js';
import User from '../models/User.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { ROLES } from '@arogyafirst/shared';

/**
 * Create Pharmacy Link Request
 * 
 * Doctor sends a connection request to pharmacy.
 * Pharmacy must accept the request before prescriptions can be sent.
 * 
 * @route POST /api/pharmacies/link
 * @access Private (Doctor)
 */
export const createPharmacyLink = async (req, res) => {
  try {
    const { doctorId, pharmacyId } = req.body;

    // Only doctors can send link requests
    if (req.user.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Only doctors can send pharmacy link requests', 403);
    }

    if (req.user._id.toString() !== doctorId) {
      return errorResponse(res, 'Doctor can only create links for themselves', 403);
    }

    // Validate doctor exists and is DOCTOR role
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== ROLES.DOCTOR) {
      return errorResponse(res, 'Invalid doctor ID', 400);
    }

    // Validate pharmacy exists and is PHARMACY role
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Invalid pharmacy ID', 400);
    }

    // Check if link already exists
    const existingLink = await PharmacyLink.findLink(doctorId, pharmacyId);
    if (existingLink) {
      if (existingLink.requestStatus === 'PENDING') {
        return errorResponse(res, 'Link request already pending', 400);
      } else if (existingLink.requestStatus === 'ACCEPTED' && existingLink.isActive) {
        return errorResponse(res, 'Link already exists and is active', 400);
      } else if (existingLink.requestStatus === 'REJECTED') {
        // Allow resending request after rejection
        existingLink.requestStatus = 'PENDING';
        existingLink.isActive = false;
        existingLink.respondedAt = null;
        existingLink.respondedBy = null;
        await existingLink.save();
        return successResponse(res, existingLink, 'Link request resent successfully');
      }
    }

    // Create new link request (always MANUAL for doctor-initiated requests)
    const link = await PharmacyLink.createManualLink(doctorId, pharmacyId, req.user._id);

    return successResponse(res, link, 'Link request sent to pharmacy successfully. Waiting for pharmacy approval.', 201);
  } catch (error) {
    console.error('Error creating pharmacy link:', error);
    return errorResponse(res, error.message || 'Failed to create pharmacy link', 500);
  }
};

/**
 * Get Pharmacy Links
 * 
 * Retrieve pharmacy links for the authenticated user.
 * Doctor: get all requests (pending, accepted, rejected)
 * Pharmacy: get accepted links only
 * 
 * @route GET /api/pharmacies/links
 * @access Private (Doctor, Pharmacy)
 */
export const getPharmacyLinks = async (req, res) => {
  try {
    let links;

    if (req.user.role === ROLES.DOCTOR) {
      // Doctors see all their requests with status
      links = await PharmacyLink.findAllByDoctor(req.user._id);
    } else if (req.user.role === ROLES.PHARMACY) {
      // Pharmacies see only accepted links
      links = await PharmacyLink.findActiveByPharmacy(req.user._id);
    } else {
      return errorResponse(res, 'Only doctors and pharmacies can access pharmacy links', 403);
    }

    return successResponse(res, links, 'Pharmacy links retrieved successfully');
  } catch (error) {
    console.error('Error fetching pharmacy links:', error);
    return errorResponse(res, error.message || 'Failed to fetch pharmacy links', 500);
  }
};

/**
 * Delete Pharmacy Link
 * 
 * Deactivate a MANUAL pharmacy link.
 * Cannot delete AUTO links (hospital-affiliated).
 * 
 * @route DELETE /api/pharmacies/links/:linkId
 * @access Private (Doctor, Pharmacy)
 */
export const deletePharmacyLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    // Fetch link
    const link = await PharmacyLink.findOne({ linkId });
    if (!link) {
      return errorResponse(res, 'Pharmacy link not found', 404);
    }

    // Validate access
    const isDoctorOwner = req.user.role === ROLES.DOCTOR && link.doctorId.toString() === req.user._id.toString();
    const isPharmacyOwner = req.user.role === ROLES.PHARMACY && link.pharmacyId.toString() === req.user._id.toString();

    if (!isDoctorOwner && !isPharmacyOwner) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Validate link type
    if (link.linkType === 'AUTO') {
      return errorResponse(res, 'Cannot delete auto-generated hospital links', 400);
    }

    // Deactivate link
    await link.deactivate();

    return successResponse(res, null, 'Pharmacy link deleted successfully');
  } catch (error) {
    console.error('Error deleting pharmacy link:', error);
    return errorResponse(res, error.message || 'Failed to delete pharmacy link', 500);
  }
};

/**
 * Get Pending Link Requests
 * 
 * Retrieve pending connection requests for pharmacy.
 * 
 * @route GET /api/pharmacies/links/pending
 * @access Private (Pharmacy)
 */
export const getPendingRequests = async (req, res) => {
  try {
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Only pharmacies can view pending requests', 403);
    }

    const pendingRequests = await PharmacyLink.findPendingByPharmacy(req.user._id);

    return successResponse(res, pendingRequests, 'Pending requests retrieved successfully');
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return errorResponse(res, error.message || 'Failed to fetch pending requests', 500);
  }
};

/**
 * Accept Link Request
 * 
 * Pharmacy accepts a pending link request from a doctor.
 * 
 * @route PUT /api/pharmacies/links/:linkId/accept
 * @access Private (Pharmacy)
 */
export const acceptRequest = async (req, res) => {
  try {
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Only pharmacies can accept link requests', 403);
    }

    const { linkId } = req.params;

    // Fetch link
    const link = await PharmacyLink.findOne({ linkId }).populate('doctorId', 'name email uniqueId');
    if (!link) {
      return errorResponse(res, 'Link request not found', 404);
    }

    // Validate pharmacy owns this request
    if (link.pharmacyId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Validate request is pending
    if (link.requestStatus !== 'PENDING') {
      return errorResponse(res, `Cannot accept request with status: ${link.requestStatus}`, 400);
    }

    // Accept request
    await link.acceptRequest(req.user._id);

    return successResponse(res, link, 'Link request accepted successfully');
  } catch (error) {
    console.error('Error accepting link request:', error);
    return errorResponse(res, error.message || 'Failed to accept link request', 500);
  }
};

/**
 * Reject Link Request
 * 
 * Pharmacy rejects a pending link request from a doctor.
 * 
 * @route PUT /api/pharmacies/links/:linkId/reject
 * @access Private (Pharmacy)
 */
export const rejectRequest = async (req, res) => {
  try {
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Only pharmacies can reject link requests', 403);
    }

    const { linkId } = req.params;

    // Fetch link
    const link = await PharmacyLink.findOne({ linkId }).populate('doctorId', 'name email uniqueId');
    if (!link) {
      return errorResponse(res, 'Link request not found', 404);
    }

    // Validate pharmacy owns this request
    if (link.pharmacyId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Validate request is pending
    if (link.requestStatus !== 'PENDING') {
      return errorResponse(res, `Cannot reject request with status: ${link.requestStatus}`, 400);
    }

    // Reject request
    await link.rejectRequest(req.user._id);

    return successResponse(res, link, 'Link request rejected successfully');
  } catch (error) {
    console.error('Error rejecting link request:', error);
    return errorResponse(res, error.message || 'Failed to reject link request', 500);
  }
};
