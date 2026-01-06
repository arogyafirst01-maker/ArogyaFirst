/**
 * SMS Utility for ArogyaFirst
 * 
 * Provides SMS notification services via Twilio for OTP verification.
 * 
 * PRODUCTION SETUP: Configure Twilio with actual credentials
 * - Set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * 
 * Environment Variables:
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID (starts with AC)
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token (keep secret!)
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number (format: +1234567890)
 * 
 * Getting Started:
 * 1. Sign up at https://www.twilio.com/try-twilio
 * 2. Get your Account SID and Auth Token from Console Dashboard
 * 3. Purchase a phone number from Phone Numbers > Manage > Buy a number
 * 4. Free trial provides $15 credit (sufficient for development)
 */

const twilio = require('twilio');

// Track whether Twilio is properly configured
let smsConfigured = false;
let smsVerified = false;

// Initialize Twilio client (lazy - only when credentials exist)
let twilioClient = null;

/**
 * Get or create Twilio client instance
 * @returns {Object|null} Twilio client or null if not configured
 */
const getTwilioClient = () => {
  if (twilioClient) return twilioClient;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (accountSid && authToken) {
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  }
  
  return null;
};

/**
 * Verify SMS transporter (Twilio) configuration
 * Logs status and checks if SMS sending will work
 * @returns {Promise<boolean>} True if Twilio is configured and verified
 */
const verifySMSTransporter = async () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('📱 SMS Configuration (Twilio):');
  console.log(`   Account SID: ${accountSid ? '(configured)' : '(not set)'}`);
  console.log(`   Auth Token: ${authToken ? '(configured)' : '(not set)'}`);
  console.log(`   Phone Number: ${phoneNumber || '(not set)'}`);

  // Check if basic credentials are provided
  if (!accountSid || !authToken || !phoneNumber) {
    console.warn('⚠️  Twilio SMS credentials not configured. SMS will be logged to console in development mode.');
    smsConfigured = false;
    return false;
  }

  smsConfigured = true;

  // Verify Twilio connection by fetching account info
  try {
    const client = getTwilioClient();
    if (client) {
      // Fetch account to verify credentials are valid
      await client.api.accounts(accountSid).fetch();
      console.log('✅ Twilio SMS transporter verified successfully');
      smsVerified = true;
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Twilio SMS transporter verification failed:', error.message);
    console.error('   SMS sending may not work. Please check your Twilio credentials.');
    smsVerified = false;
    return false;
  }
};

/**
 * Check if Twilio SMS is properly configured
 * @returns {boolean} True if Twilio credentials are set
 */
const isSMSConfigured = () => smsConfigured;

/**
 * Check if Twilio SMS transporter was verified successfully
 * @returns {boolean} True if transporter verification passed
 */
const isSMSVerified = () => smsVerified;

/**
 * Format phone number with country code
 * @param {string} phone - 10-digit phone number
 * @param {string} countryCode - Country code (default: +91 for India)
 * @returns {string} Formatted phone number with country code
 */
const formatPhoneNumber = (phone, countryCode = '+91') => {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code (more than 10 digits), return as-is with +
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Add country code
  return `${countryCode}${cleaned}`;
};

/**
 * Send OTP SMS for password reset
 * @param {string} phone - 10-digit phone number
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'PASSWORD_RESET' (default)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, placeholder?: boolean, otp?: string}>}
 */
const sendOTPSMS = async (phone, otp, purpose = 'PASSWORD_RESET') => {
  try {
    if (!phone) {
      console.warn('No phone number provided for OTP SMS');
      return { success: false, error: 'No phone number provided' };
    }

    // Validate phone format (10 digits)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      return { success: false, error: 'Invalid phone number format. Must be 10 digits.' };
    }

    const formattedPhone = formatPhoneNumber(cleanedPhone);
    
    // Create message body
    const messageBody = purpose === 'PASSWORD_RESET'
      ? `Your ArogyaFirst OTP for password reset is: ${otp}. Valid for 10 minutes. Do not share this code.`
      : `Your ArogyaFirst verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.log('📱 OTP SMS (Development Mode - Twilio not configured):');
      console.log('To:', formattedPhone);
      console.log('Message:', messageBody);
      console.log('OTP:', otp);
      console.log('Purpose:', purpose);
      console.log('---');
      return { success: true, placeholder: true, otp }; // Return OTP for development testing
    }

    const client = getTwilioClient();
    if (!client) {
      console.error('Failed to initialize Twilio client');
      return { success: false, error: 'SMS service not available' };
    }

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`📱 OTP SMS sent successfully to ${formattedPhone}, SID: ${message.sid}`);
    return { success: true, messageId: message.sid };

  } catch (error) {
    console.error('Failed to send OTP SMS:', error.message);
    // Don't throw - SMS failures shouldn't break the flow
    // The OTP is still saved in the database and can be resent
    return { success: false, error: error.message };
  }
};

module.exports = {
  verifySMSTransporter,
  isSMSConfigured,
  isSMSVerified,
  sendOTPSMS
};
