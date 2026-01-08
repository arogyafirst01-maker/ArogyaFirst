import { verifyAccessToken } from '../utils/jwt.util.js';
import User from '../models/User.model.js';
import { unauthorizedResponse } from '../utils/response.util.js';

/**
 * Authentication middleware that verifies JWT token and attaches user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Authorization header missing or invalid');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const payload = verifyAccessToken(token);
    
    // Find user in database
    const user = await User.findById(payload.userId);
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }
    
    // Check if user is active
    if (!user.isActive) {
      return unauthorizedResponse(res, 'User account is inactive');
    }
    
    // Create sanitized user object with nested role data (keep hospitalData, doctorData etc.)
    const roleDataKey = `${user.role.toLowerCase()}Data`;
    const safeRoleData = user[roleDataKey] ? 
      (user[roleDataKey].toObject ? user[roleDataKey].toObject() : user[roleDataKey]) 
      : {};

    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified,
      isActive: user.isActive,
      [roleDataKey]: safeRoleData
    };
    
    next();
  } catch (error) {
    // Handle JWT verification errors
    return unauthorizedResponse(res, error.message);
  }
};

export {
  authenticate
};