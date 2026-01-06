const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller.js');
const { validateRequest, registerPatientSchema, registerHospitalSchema, registerDoctorSchema, registerLabSchema, registerPharmacySchema, loginSchema, sendEmailOTPSchema, verifyEmailOTPSchema, forgotPasswordSchema, verifyPhoneOTPSchema, resetPasswordSchema } = require('../middleware/validation.middleware.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

// Email OTP verification routes (public, no authentication required)
router.post('/send-email-otp', validateRequest(sendEmailOTPSchema), authController.sendEmailOTP);
router.post('/verify-email-otp', validateRequest(verifyEmailOTPSchema), authController.verifyEmailOTP);

// Phone OTP password reset routes (public, patient-only)
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/verify-phone-otp', validateRequest(verifyPhoneOTPSchema), authController.verifyPhoneOTP);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

// Registration routes with role middleware
router.post('/register/patient', validateRequest(registerPatientSchema), (req, res, next) => {
  req.body.role = ROLES.PATIENT;
  next();
}, authController.register);

router.post('/register/hospital', validateRequest(registerHospitalSchema), (req, res, next) => {
  req.body.role = ROLES.HOSPITAL;
  next();
}, authController.register);

router.post('/register/doctor', validateRequest(registerDoctorSchema), (req, res, next) => {
  req.body.role = ROLES.DOCTOR;
  next();
}, authController.register);

router.post('/register/lab', validateRequest(registerLabSchema), (req, res, next) => {
  req.body.role = ROLES.LAB;
  next();
}, authController.register);

router.post('/register/pharmacy', validateRequest(registerPharmacySchema), (req, res, next) => {
  req.body.role = ROLES.PHARMACY;
  next();
}, authController.register);

// Authentication routes
// Login route with validation for email or phone identifier
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/logout-all', authenticate, authController.logoutAll);

module.exports = router;