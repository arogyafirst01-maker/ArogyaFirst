const crypto = require('crypto');
const User = require('../models/User.model.js');
const OTP = require('../models/OTP.model.js');
const { OTP_PURPOSES } = require('../models/OTP.model.js');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiryInSeconds } = require('../utils/jwt.util.js');
const { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } = require('../utils/response.util.js');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/fileUpload.util.js');
const { generateOTP, sendOTPEmail, validateOTPFormat } = require('../utils/email.util.js');
const { sendOTPSMS } = require('../utils/sms.util.js');
const { generatePatientId, generateHospitalId, generateDoctorId, generateLabId, generatePharmacyId, normalizeEmail, validatePhone, validateEmail } = require('@arogyafirst/shared');
const { ROLES, VERIFICATION_STATUS } = require('@arogyafirst/shared');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const register = async (req, res) => {
  try {
    const { 
      role, 
      email, 
      password: userPassword, 
      name, 
      phone, 
      location, 
      dateOfBirth, 
      aadhaarLast4, 
      qualification, 
      experience, 
      specialization, 
      hospitalId, 
      licenseNumber 
    } = req.body;
    
    // Build role-specific data
    let uniqueId;
    let roleData = {};

    switch (role) {
      case ROLES.PATIENT:
        uniqueId = generatePatientId(phone);
        roleData.patientData = { 
          name, 
          phone, 
          location,
          dateOfBirth: new Date(dateOfBirth),
          aadhaarLast4
        };
        break;
      case ROLES.HOSPITAL:
        uniqueId = generateHospitalId();
        roleData.hospitalData = {
          name,
          location,
          legalDocuments: [] // Empty at registration
        };
        break;
      case ROLES.DOCTOR:
        uniqueId = generateDoctorId(hospitalId);
        const parsedExperience = Number(experience);
        // No need to revalidate since validation middleware handles this
        roleData.doctorData = {
          name,
          qualification,
          experience: parsedExperience,
          location,
          dateOfBirth: new Date(dateOfBirth),
          aadhaarLast4,
          specialization,
          hospitalId: hospitalId || undefined,
          practiceDocuments: [] // Empty at registration
        };
        break;
      case ROLES.LAB:
        uniqueId = generateLabId();
        roleData.labData = {
          name,
          location,
          machines: [],
          facilities: []
        };
        // Accept machines/facilities passed at registration (JSON or stringified in multipart)
        if (req.body.machines) {
          try {
            const machines = typeof req.body.machines === 'string' ? JSON.parse(req.body.machines) : req.body.machines;
            if (Array.isArray(machines)) {
              roleData.labData.machines = machines.map(m => ({
                name: m.name,
                model: m.model,
                manufacturer: m.manufacturer,
                purchaseDate: m.purchaseDate ? new Date(m.purchaseDate) : undefined,
                status: m.status,
                isActive: true,
                addedAt: new Date()
              }));
            }
          } catch (e) {
            // ignore parse errors; validation middleware should have caught invalid shapes
          }
        }
        if (req.body.facilities) {
          try {
            const facilities = typeof req.body.facilities === 'string' ? JSON.parse(req.body.facilities) : req.body.facilities;
            if (Array.isArray(facilities)) {
              roleData.labData.facilities = facilities;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        break;
      case ROLES.PHARMACY:
        uniqueId = generatePharmacyId();
        roleData.pharmacyData = {
          name,
          location,
          licenseNumber
        };
        // Accept medicines array at registration
        if (req.body.medicines) {
          try {
            const meds = typeof req.body.medicines === 'string' ? JSON.parse(req.body.medicines) : req.body.medicines;
            if (Array.isArray(meds)) {
              roleData.pharmacyData.medicines = meds.map(m => ({
                name: m.name,
                genericName: m.genericName,
                manufacturer: m.manufacturer,
                stock: m.stock !== undefined ? Number(m.stock) : 0,
                reorderLevel: m.reorderLevel !== undefined ? Number(m.reorderLevel) : 0,
                price: m.price !== undefined ? Number(m.price) : 0,
                batchNumber: m.batchNumber,
                expiryDate: m.expiryDate ? new Date(m.expiryDate) : undefined,
                isActive: true,
                addedAt: new Date()
              }));
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        break;
      default:
        return errorResponse(res, 'Invalid role', 400);
    }

    // Check for existing email or uniqueId
    const existingUser = await User.findOne({
      $or: [
        { emailNormalized: normalizeEmail(email) },
        { uniqueId }
      ]
    });
    if (existingUser) {
      return errorResponse(res, 'Email or unique ID already exists', 400);
    }

    // Server-side enforcement: Verify email was verified via OTP before allowing registration
    const verifiedOTP = await OTP.findOne({
      email: normalizeEmail(email),
      isUsed: true
    });
    if (!verifiedOTP) {
      return errorResponse(res, 'Email verification required. Please verify your email with OTP before registering.', 400);
    }

    // Handle document uploads for hospitals and doctors
    const uploadedPublicIds = [];
    if ((role === ROLES.HOSPITAL || role === ROLES.DOCTOR) && req.files && req.files.length) {
      try {
        for (const file of req.files) {
          const folder = role === ROLES.HOSPITAL ? 'hospitals/legal' : 'doctors/practice';
          const uploadResult = await uploadToCloudinary(file.buffer, {
            folder,
            allowedFormats: ['pdf', 'jpg', 'jpeg', 'png']
          });
          const docData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            size: uploadResult.size,
            uploadedAt: uploadResult.uploadedAt
          };
          if (role === ROLES.HOSPITAL) {
            roleData.hospitalData.legalDocuments.push(docData);
          } else {
            roleData.doctorData.practiceDocuments.push(docData);
          }
          uploadedPublicIds.push(uploadResult.publicId);
        }
      } catch (uploadErr) {
        console.error('Registration file upload error:', uploadErr);
        return errorResponse(res, 'Failed to upload registration documents', 500);
      }
    }

    // Create user document
    const user = new User({
      email,
      emailNormalized: normalizeEmail(email),
      password: userPassword,
      role,
      uniqueId,
      ...roleData,
      isVerified: [ROLES.PATIENT, ROLES.LAB, ROLES.PHARMACY].includes(role),
      verificationStatus: [ROLES.PATIENT, ROLES.LAB, ROLES.PHARMACY].includes(role) ? VERIFICATION_STATUS.APPROVED : VERIFICATION_STATUS.PENDING
    });

    // Save user (password hashed by pre-save hook)
    try {
      await user.save();
    } catch (saveErr) {
      // If we uploaded files but user save failed, attempt to cleanup uploaded Cloudinary files
      if (uploadedPublicIds.length) {
        for (const pid of uploadedPublicIds) {
          try {
            await deleteFromCloudinary(pid);
          } catch (delErr) {
            console.error('Failed to delete orphaned registration file:', delErr);
          }
        }
      }
      throw saveErr;
    }

    // Generate tokens
    const accessTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId
    };
    const refreshTokenPayload = {
      userId: user._id.toString(),
      tokenId: crypto.randomUUID()
    };
    const accessToken = generateAccessToken(accessTokenPayload);
    const refreshToken = generateRefreshToken(refreshTokenPayload);

    // Prune and add refresh token to user
    user.pruneRefreshTokens();
    user.addRefreshToken(refreshToken, getTokenExpiryInSeconds(JWT_REFRESH_EXPIRES_IN));
    await user.save();

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth'
    });

    // Return response
    const { password, refreshTokens, ...userProfile } = user.toObject();
    return successResponse(res, {
      accessToken,
      expiresIn: getTokenExpiryInSeconds(JWT_EXPIRES_IN),
      user: userProfile
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;

    // Support both new 'identifier' field and legacy 'email' field
    const loginIdentifier = identifier || email;
    if (!loginIdentifier) {
      return errorResponse(res, 'Either identifier or email is required', 400);
    }

    // Find user by phone (for patients) or email (for all roles)
    const isPhone = validatePhone(loginIdentifier);
    const user = isPhone 
      ? await User.findByPhone(loginIdentifier).select('+password')
      : await User.findByEmail(loginIdentifier).select('+password');
    if (!user || !user.isActive) {
      return unauthorizedResponse(res, 'Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return unauthorizedResponse(res, 'Invalid credentials');
    }

    // Check verification only for REJECTED doctors - allow PENDING to access profile
    if (user.role === ROLES.DOCTOR && user.verificationStatus === VERIFICATION_STATUS.REJECTED) {
      return forbiddenResponse(res, 'Account verification rejected');
    }

    // Generate tokens
    const accessTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId
    };
    const refreshTokenPayload = {
      userId: user._id.toString(),
      tokenId: crypto.randomUUID()
    };
    const accessToken = generateAccessToken(accessTokenPayload);
    const refreshToken = generateRefreshToken(refreshTokenPayload);

    // Prune expired tokens, add new one and update lastLogin
    user.pruneRefreshTokens();
    user.addRefreshToken(refreshToken, getTokenExpiryInSeconds(JWT_REFRESH_EXPIRES_IN));
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Return response
    const { password: _, refreshTokens, ...userProfile } = user.toObject();
    return successResponse(res, {
      accessToken,
      expiresIn: getTokenExpiryInSeconds(JWT_EXPIRES_IN),
      user: userProfile
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return unauthorizedResponse(res, 'Refresh token missing');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(payload.userId);
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    // Check if token exists and not revoked
    const tokenDoc = user.refreshTokens.find(t => t.token === refreshToken && !t.isRevoked);
    if (!tokenDoc) {
      // Token reuse detected - revoke all tokens
      user.revokeAllRefreshTokens();
      await user.save();
      return unauthorizedResponse(res, 'Token reuse detected');
    }

    // Revoke old token
    user.revokeRefreshToken(refreshToken);

    // Generate new tokens
    const accessTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId
    };
    const refreshTokenPayload = {
      userId: user._id.toString(),
      tokenId: crypto.randomUUID()
    };
    const newAccessToken = generateAccessToken(accessTokenPayload);
    const newRefreshToken = generateRefreshToken(refreshTokenPayload);

    // Prune expired tokens and add new one
    user.pruneRefreshTokens();
    user.addRefreshToken(newRefreshToken, getTokenExpiryInSeconds(JWT_REFRESH_EXPIRES_IN));
    await user.save();

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE || 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth'
    });

    // Return response
    return successResponse(res, {
      accessToken: newAccessToken,
      expiresIn: getTokenExpiryInSeconds(JWT_EXPIRES_IN)
    }, 'Token refreshed successfully');

  } catch (error) {
    console.error('Refresh error:', error);
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return unauthorizedResponse(res, error.message);
    }
    return errorResponse(res, 'Token refresh failed', 500);
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        const user = await User.findById(payload.userId);
        if (user) {
          user.revokeRefreshToken(refreshToken);
          await user.save();
        }
      } catch (error) {
        // Ignore verification errors during logout
      }
    }

    // Clear cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    return successResponse(res, null, 'Logged out successfully');

  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
};

const me = async (req, res) => {
  try {
    // req.user is already sanitized by auth middleware
    return successResponse(res, { user: req.user }, 'User profile retrieved successfully');
  } catch (error) {
    console.error('Me error:', error);
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
};

const logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return unauthorizedResponse(res);
    }
    user.revokeAllRefreshTokens();
    await user.save();

    // Clear cookie
    res.clearCookie('refreshToken', { path: '/api/auth' });

    return successResponse(res, null, 'Logged out from all devices');

  } catch (error) {
    console.error('Logout all error:', error);
    return errorResponse(res, 'Logout from all devices failed', 500);
  }
};

/**
 * Send email OTP for verification
 * POST /api/auth/send-email-otp
 */
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !validateEmail(email)) {
      return errorResponse(res, 'Valid email address is required', 400);
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if email already exists (findByEmail normalizes internally)
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 400);
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Delete any existing unused OTPs for this email
    await OTP.deleteMany({ 
      email: normalizedEmail, 
      purpose: 'EMAIL_VERIFICATION', 
      isUsed: false 
    });

    // Create new OTP (expires in 10 minutes)
    await OTP.createOTP(normalizedEmail, otp, 'EMAIL_VERIFICATION', 10);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp, 'EMAIL_VERIFICATION');
    
    if (!emailResult.success && !emailResult.placeholder) {
      console.warn('Failed to send OTP email:', emailResult.error);
      // Still return success - OTP is saved and can be resent
    }

    return successResponse(res, { sent: true }, 'OTP sent to your email');

  } catch (error) {
    console.error('Send email OTP error:', error);
    return errorResponse(res, 'Failed to send OTP', 500);
  }
};

/**
 * Verify email OTP
 * POST /api/auth/verify-email-otp
 */
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const normalizedEmail = normalizeEmail(email);

    // Validate OTP format
    if (!validateOTPFormat(otp)) {
      return errorResponse(res, 'OTP must be exactly 6 digits', 400);
    }

    // Find valid OTP
    const otpDoc = await OTP.findValidOTP(normalizedEmail, 'EMAIL_VERIFICATION');
    
    if (!otpDoc) {
      return errorResponse(res, 'Invalid or expired OTP', 400);
    }

    // Check max attempts (5 attempts allowed)
    const MAX_ATTEMPTS = 5;
    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      await OTP.findByIdAndDelete(otpDoc._id);
      return errorResponse(res, 'Too many attempts. Please request a new OTP', 400);
    }

    // Compare OTP
    if (otpDoc.otp !== otp) {
      const updatedDoc = await OTP.incrementAttempts(otpDoc._id);
      const remaining = Math.max(0, MAX_ATTEMPTS - updatedDoc.attempts);
      return errorResponse(res, `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`, 400);
    }

    // Mark OTP as used
    await OTP.markAsUsed(otpDoc._id);

    return successResponse(res, { 
      verified: true, 
      email: normalizedEmail 
    }, 'Email verified successfully');

  } catch (error) {
    console.error('Verify email OTP error:', error);
    return errorResponse(res, 'Failed to verify OTP', 500);
  }
};

/**
 * Normalize phone number by stripping all non-digit characters
 * @param {string} phone - Raw phone number input
 * @returns {string} Cleaned 10-digit phone number
 */
const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '').trim();
};

/**
 * Forgot Password - Send OTP to patient's phone
 * Only available for patient accounts using phone-based authentication
 */
const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone format
    if (!validatePhone(phone)) {
      return errorResponse(res, 'Valid 10-digit phone number is required', 400);
    }

    const cleanedPhone = normalizePhone(phone);

    // Find user by phone
    const user = await User.findByPhone(cleanedPhone);
    
    // Check if user exists and is a patient
    if (!user || user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Phone-based password reset is only available for patient accounts', 400);
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Delete any existing unused OTPs for this phone with PASSWORD_RESET purpose
    await OTP.deleteMany({ 
      phone: cleanedPhone, 
      purpose: OTP_PURPOSES.PASSWORD_RESET, 
      isUsed: false 
    });

    // Create new OTP (email=null, phone provided)
    await OTP.createOTP(null, otp, OTP_PURPOSES.PASSWORD_RESET, 10, cleanedPhone);

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(cleanedPhone, otp, 'PASSWORD_RESET');
    
    if (!smsResult.success && !smsResult.placeholder) {
      console.error('Failed to send OTP SMS:', smsResult.error);
      // Still return success - OTP is saved and can be resent
    }

    return successResponse(res, { sent: true }, 'OTP sent to your phone number');

  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 'Failed to send OTP', 500);
  }
};

/**
 * Verify Phone OTP for password reset
 */
const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const MAX_ATTEMPTS = 5;

    // Validate OTP format
    if (!validateOTPFormat(otp)) {
      return errorResponse(res, 'OTP must be exactly 6 digits', 400);
    }

    const cleanedPhone = normalizePhone(phone);

    // Find valid OTP by phone
    const otpDoc = await OTP.findValidOTP(null, OTP_PURPOSES.PASSWORD_RESET, cleanedPhone);
    
    if (!otpDoc) {
      return errorResponse(res, 'Invalid or expired OTP. Please request a new one.', 400);
    }

    // Check max attempts
    if (otpDoc.attempts >= MAX_ATTEMPTS) {
      await OTP.findByIdAndDelete(otpDoc._id);
      return errorResponse(res, 'Too many attempts. Please request a new OTP.', 400);
    }

    // Compare OTP
    if (otpDoc.otp !== otp) {
      const updatedDoc = await OTP.incrementAttempts(otpDoc._id);
      const remaining = Math.max(0, MAX_ATTEMPTS - updatedDoc.attempts);
      return errorResponse(res, `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`, 400);
    }

    // Mark OTP as used (verified)
    await OTP.markAsUsed(otpDoc._id);

    return successResponse(res, { 
      verified: true, 
      phone: cleanedPhone 
    }, 'OTP verified successfully');

  } catch (error) {
    console.error('Verify phone OTP error:', error);
    return errorResponse(res, 'Failed to verify OTP', 500);
  }
};

/**
 * Reset Password - Set new password after OTP verification
 * Requires prior successful OTP verification via verifyPhoneOTP
 */
const resetPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;

    const cleanedPhone = normalizePhone(phone);

    // Find user by phone
    const user = await User.findByPhone(cleanedPhone);
    
    if (!user || user.role !== ROLES.PATIENT) {
      return errorResponse(res, 'Phone-based password reset is only available for patient accounts', 400);
    }

    // Verify OTP was verified (isUsed should be true)
    // Don't filter by otp value - rely on prior verification state
    // Order by createdAt descending to get the most recent verified OTP
    const otpDoc = await OTP.findOne({ 
      phone: cleanedPhone, 
      purpose: OTP_PURPOSES.PASSWORD_RESET, 
      isUsed: true
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return errorResponse(res, 'OTP verification required before password reset', 400);
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Delete the used OTP
    await OTP.findByIdAndDelete(otpDoc._id);

    // Revoke all refresh tokens for security
    user.revokeAllRefreshTokens();
    await user.save();

    return successResponse(res, { success: true }, 'Password reset successfully. Please login with your new password.');

  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, 'Failed to reset password', 500);
  }
};

module.exports = { register, login, refresh, logout, me, logoutAll, sendEmailOTP, verifyEmailOTP, forgotPassword, verifyPhoneOTP, resetPassword };
