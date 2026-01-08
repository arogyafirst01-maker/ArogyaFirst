import { ROLES, VERIFICATION_STATUS } from '@arogyafirst/shared';
import { forbiddenResponse, unauthorizedResponse } from '../utils/response.util.js';

/**
 * Higher-order function that returns middleware for role-based authorization
 * @param {Array} allowedRoles - Array of allowed roles (e.g., [ROLES.DOCTOR, ROLES.HOSPITAL])
 * @returns {Function} Middleware function
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return forbiddenResponse(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Middleware for resource ownership checks
 * @param {string} resourceUserIdField - Field name to extract userId from req.params or req.body (default: 'userId')
 * @returns {Function} Middleware function
 */
const authorizeOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res);
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (!resourceUserId) {
      return forbiddenResponse(res, 'Resource user ID not found');
    }

    // Allow access if user owns the resource or is admin
    if (req.user._id.toString() === resourceUserId.toString() || req.user.role === ROLES.ADMIN) {
      return next();
    }

    return forbiddenResponse(res, 'Access denied: You do not own this resource');
  };
};

/**
 * Middleware that requires user verification (for doctors and hospitals)
 * @returns {Function} Middleware function
 */
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res);
  }

  const { verificationStatus } = req.user;

  if (verificationStatus === VERIFICATION_STATUS.APPROVED) {
    return next();
  }

  if (verificationStatus === VERIFICATION_STATUS.PENDING) {
    return forbiddenResponse(res, 'Account pending verification');
  }

  if (verificationStatus === VERIFICATION_STATUS.REJECTED) {
    return forbiddenResponse(res, 'Account verification rejected');
  }

  // Fallback for unexpected status
  return forbiddenResponse(res, 'Account verification required');
};

export {
  authorize,
  authorizeOwnership,
  requireVerification
};