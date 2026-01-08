import mongoose from 'mongoose';
import ConsentRequest from '../models/ConsentRequest.model.js';
import User from '../models/User.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { CONSENT_STATUS, ROLES } from '@arogyafirst/shared';

/**
 * Request Consent
 * 
 * Creates a consent request from a provider to access patient documents.
 * Returns existing consent if already active.
 * 
 * @route POST /api/consent/request
 * @access Private (Hospital, Doctor, Lab)
 */
export const requestConsent = async (req, res) => {
  try {
    const { patientId, purpose } = req.body;
    const requesterId = req.user._id;
    const requesterRole = req.user.role;

    // Validate patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Invalid patient ID', 400);
    }

    // Check if active consent already exists
    const existingConsent = await ConsentRequest.findActiveConsent(patientId, requesterId);
    if (existingConsent) {
      return successResponse(res, {
        consent: existingConsent,
        message: 'Active consent already exists',
      }, 'Consent already granted');
    }

    // Create new consent request
    const consentRequest = new ConsentRequest({
      consentId: ConsentRequest.generateConsentId(),
      patientId,
      requesterId,
      requesterRole,
      purpose,
      status: CONSENT_STATUS.PENDING,
      requestedAt: new Date(),
    });

    await consentRequest.save();

    // Populate requester details
    await consentRequest.populate('requesterId', 'name email role');

    return successResponse(res, { consent: consentRequest }, 'Consent request sent successfully');

  } catch (error) {
    console.error('Error requesting consent:', error);
    return errorResponse(res, 'Failed to request consent', 500);
  }
};

/**
 * Get Patient Consent Requests
 * 
 * Retrieves all consent requests for a specific patient.
 * Only accessible by the patient themselves.
 * 
 * @route GET /api/consent/patient/:patientId
 * @access Private (Patient only)
 */
export const getPatientConsentRequests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const requesterId = req.user._id;
    const { status } = req.query;

    // Verify requester is the patient
    if (requesterId.toString() !== patientId.toString()) {
      return errorResponse(res, 'Unauthorized: Can only view your own consent requests', 403);
    }

    // Build filters
    const filters = {};
    if (status) filters.status = status;

    // Fetch consent requests
    const consents = await ConsentRequest.findByPatient(patientId, filters);

    return successResponse(res, {
      consents,
      count: consents.length,
    }, 'Consent requests retrieved successfully');

  } catch (error) {
    console.error('Error fetching patient consent requests:', error);
    return errorResponse(res, 'Failed to fetch consent requests', 500);
  }
};

/**
 * Get Provider Consent Requests
 * 
 * Retrieves all consent requests made by a specific provider.
 * Only accessible by the provider themselves.
 * 
 * @route GET /api/consent/provider/:providerId
 * @access Private (Hospital, Doctor, Lab)
 */
export const getProviderConsentRequests = async (req, res) => {
  try {
    const { providerId } = req.params;
    const requesterId = req.user._id;
    const { status } = req.query;

    // Verify requester is the provider
    if (requesterId.toString() !== providerId.toString()) {
      return errorResponse(res, 'Unauthorized: Can only view your own consent requests', 403);
    }

    // Build filters
    const filters = {};
    if (status) filters.status = status;

    // Fetch consent requests
    const consents = await ConsentRequest.findByRequester(providerId, filters);

    return successResponse(res, {
      consents,
      count: consents.length,
    }, 'Consent requests retrieved successfully');

  } catch (error) {
    console.error('Error fetching provider consent requests:', error);
    return errorResponse(res, 'Failed to fetch consent requests', 500);
  }
};

/**
 * Approve Consent
 * 
 * Approves a pending consent request with optional expiry date.
 * Only accessible by the patient who received the request.
 * 
 * @route PUT /api/consent/:consentId/approve
 * @access Private (Patient only)
 */
export const approveConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { expiresAt, notes } = req.body;
    const requesterId = req.user._id;

    // Find consent request
    const consent = await ConsentRequest.findOne({ consentId });

    if (!consent) {
      return errorResponse(res, 'Consent request not found', 404);
    }

    // Verify requester is the patient
    if (requesterId.toString() !== consent.patientId.toString()) {
      return errorResponse(res, 'Unauthorized: Only the patient can approve consent', 403);
    }

    // Verify status is PENDING
    if (consent.status !== CONSENT_STATUS.PENDING) {
      return errorResponse(res, `Cannot approve consent with status: ${consent.status}`, 400);
    }

    // Approve consent
    consent.approve(expiresAt, notes);
    await consent.save();

    // Populate requester details
    await consent.populate('requesterId', 'name email role');

    return successResponse(res, { consent }, 'Consent approved successfully');

  } catch (error) {
    console.error('Error approving consent:', error);
    return errorResponse(res, 'Failed to approve consent', 500);
  }
};

/**
 * Reject Consent
 * 
 * Rejects a pending consent request.
 * Only accessible by the patient who received the request.
 * 
 * @route PUT /api/consent/:consentId/reject
 * @access Private (Patient only)
 */
export const rejectConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const { notes } = req.body;
    const requesterId = req.user._id;

    // Find consent request
    const consent = await ConsentRequest.findOne({ consentId });

    if (!consent) {
      return errorResponse(res, 'Consent request not found', 404);
    }

    // Verify requester is the patient
    if (requesterId.toString() !== consent.patientId.toString()) {
      return errorResponse(res, 'Unauthorized: Only the patient can reject consent', 403);
    }

    // Verify status is PENDING
    if (consent.status !== CONSENT_STATUS.PENDING) {
      return errorResponse(res, `Cannot reject consent with status: ${consent.status}`, 400);
    }

    // Reject consent
    consent.reject(notes);
    await consent.save();

    // Populate requester details
    await consent.populate('requesterId', 'name email role');

    return successResponse(res, { consent }, 'Consent rejected successfully');

  } catch (error) {
    console.error('Error rejecting consent:', error);
    return errorResponse(res, 'Failed to reject consent', 500);
  }
};

/**
 * Revoke Consent
 * 
 * Revokes an approved consent, immediately removing provider access.
 * Only accessible by the patient who approved the consent.
 * 
 * @route PUT /api/consent/:consentId/revoke
 * @access Private (Patient only)
 */
export const revokeConsent = async (req, res) => {
  try {
    const { consentId } = req.params;
    const requesterId = req.user._id;

    // Find consent request
    const consent = await ConsentRequest.findOne({ consentId });

    if (!consent) {
      return errorResponse(res, 'Consent request not found', 404);
    }

    // Verify requester is the patient
    if (requesterId.toString() !== consent.patientId.toString()) {
      return errorResponse(res, 'Unauthorized: Only the patient can revoke consent', 403);
    }

    // Verify status is APPROVED
    if (consent.status !== CONSENT_STATUS.APPROVED) {
      return errorResponse(res, `Cannot revoke consent with status: ${consent.status}`, 400);
    }

    // Revoke consent
    consent.revoke();
    await consent.save();

    // Populate requester details
    await consent.populate('requesterId', 'name email role');

    return successResponse(res, { consent }, 'Consent revoked successfully');

  } catch (error) {
    console.error('Error revoking consent:', error);
    return errorResponse(res, 'Failed to revoke consent', 500);
  }
};

/**
 * Check Consent Status
 * 
 * Checks if active consent exists between patient and requester.
 * Requires both patientId and requesterId in query parameters.
 * Enforces that requesterId matches the authenticated user for security.
 * 
 * @route GET /api/consent/check?patientId=xxx&requesterId=xxx
 * @access Private (Hospital, Doctor, Lab)
 */
export const checkConsentStatus = async (req, res) => {
  try {
    const { patientId, requesterId } = req.query;
    const authenticatedUserId = req.user._id;

    if (!patientId) {
      return errorResponse(res, 'Missing required parameter: patientId', 400);
    }

    if (!requesterId) {
      return errorResponse(res, 'Missing required parameter: requesterId', 400);
    }

    // Validate requesterId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return errorResponse(res, 'Invalid requesterId format', 400);
    }

    // Security: Enforce that requesterId matches authenticated user
    if (requesterId !== authenticatedUserId.toString()) {
      return errorResponse(res, 'Unauthorized: requesterId must match authenticated user', 403);
    }

    // Find active consent using validated requesterId
    const consent = await ConsentRequest.findActiveConsent(patientId, requesterId);

    return successResponse(res, {
      hasConsent: !!consent,
      consent: consent || null,
    }, 'Consent status checked successfully');

  } catch (error) {
    console.error('Error checking consent status:', error);
    return errorResponse(res, 'Failed to check consent status', 500);
  }
};
