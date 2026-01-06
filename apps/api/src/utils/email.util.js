/**
 * Email Utility for ArogyaFirst
 * 
 * Provides email notification services using Resend API for OTP emails
 * and nodemailer SMTP fallback for other notifications
 * (Uses Resend API for critical OTP emails to work with Render.com which blocks SMTP ports)
 * 
 * Environment Variables:
 * - RESEND_API_KEY: Resend API key (e.g., re_xxxxxxxxxxxx) - for OTP emails
 * - EMAIL_FROM: Sender email address (e.g., onboarding@resend.dev or noreply@arogyafirst.com)
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { formatDateForDisplay, PO_STATUS } from '@arogyafirst/shared';

// Initialize Resend with API key for OTP emails
const resend = new Resend(process.env.RESEND_API_KEY);

// Keep nodemailer transporter for backwards compatibility with other email functions
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Track whether email service is properly configured
let emailConfigured = false;
let emailVerified = false;
let smtpConfigured = false;

/**
 * Verify email configuration
 * Checks Resend API for OTP emails and SMTP for other notifications
 */
const verifyEmailTransporter = async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  console.log('📧 Email Configuration:');
  console.log(`   Resend API Key: ${apiKey ? '(configured)' : '(not set)'}`);
  console.log(`   From: ${emailFrom || '(using default: onboarding@resend.dev)'}`);
  console.log(`   SMTP User: ${emailUser ? '(configured)' : '(not set)'}`);
  console.log(`   SMTP Pass: ${emailPass ? '(configured)' : '(not set)'}`);

  // Check Resend API for OTP emails
  if (apiKey) {
    emailConfigured = true;
    emailVerified = true;
    console.log('✅ Resend Email API configured successfully (for OTP emails)');
  } else {
    console.warn('⚠️  Resend API key not configured. OTP emails will be logged to console.');
  }

  // Check SMTP for other notifications
  if (emailUser && emailPass) {
    smtpConfigured = true;
    try {
      await transporter.verify();
      console.log('✅ SMTP transporter verified successfully (for notification emails)');
    } catch (error) {
      console.warn('⚠️  SMTP verification failed:', error.message);
      smtpConfigured = false;
    }
  } else {
    console.warn('⚠️  SMTP credentials not configured. Notification emails will be logged to console.');
    smtpConfigured = false;
  }

  return emailConfigured || smtpConfigured;
};

/**
 * Check if email service is properly configured
 * @returns {boolean} True if API key is set
 */
const isSmtpConfigured = () => emailConfigured;

/**
 * Check if email service was verified successfully
 * @returns {boolean} True if configuration passed
 */
const isSmtpVerified = () => emailVerified;

/**
 * Generate a 6-digit OTP code
 * @returns {string} 6-digit OTP as string (preserves leading zeros)
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Validate OTP format (exactly 6 digits)
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid format
 */
const validateOTPFormat = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Send OTP email for verification or password reset
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'EMAIL_VERIFICATION' or 'PASSWORD_RESET'
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendOTPEmail = async (toEmail, otp, purpose = 'EMAIL_VERIFICATION') => {
  try {
    if (!toEmail) {
      console.warn('No email address provided for OTP');
      return { success: false, error: 'No email address provided' };
    }

    const isVerification = purpose === 'EMAIL_VERIFICATION';
    const subject = isVerification 
      ? 'Verify Your Email - ArogyaFirst'
      : 'Password Reset OTP - ArogyaFirst';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #228be6; }
          .logo-icon { color: #228be6; }
          h2 { color: #2c3e50; margin-bottom: 20px; text-align: center; }
          .otp-container { text-align: center; margin: 30px 0; }
          .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #228be6; background: #f0f9ff; padding: 20px 30px; border-radius: 8px; display: inline-block; border: 2px dashed #228be6; }
          .expiry-notice { text-align: center; color: #e67700; font-weight: 500; margin: 20px 0; }
          .security-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">
                <span class="logo-icon">🏥</span> ArogyaFirst
              </div>
            </div>
            
            <h2>${isVerification ? 'Verify Your Email Address' : 'Password Reset Request'}</h2>
            
            <p style="text-align: center;">
              ${isVerification 
                ? 'Thank you for registering with ArogyaFirst! Please use the verification code below to complete your registration.'
                : 'We received a request to reset your password. Use the code below to proceed.'}
            </p>
            
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p class="expiry-notice">⏱️ This code is valid for 10 minutes</p>
            
            <div class="security-notice">
              <strong>🔒 Security Notice:</strong><br>
              If you didn't request this ${isVerification ? 'verification' : 'password reset'}, please ignore this email. 
              Never share this code with anyone.
            </div>
            
            <div class="footer">
              <p>This is an automated message from ArogyaFirst. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ArogyaFirst. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 OTP Email (Development Mode - Resend API not configured):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('OTP:', otp);
      console.log('Purpose:', purpose);
      console.log('---');
      return { success: true, placeholder: true, otp }; // Return OTP for development testing
    }

    // Send via Resend API
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: toEmail,
      subject,
      html: htmlBody,
    });

    if (response.error) {
      console.error('Failed to send OTP email via Resend:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('✅ OTP email sent successfully via Resend:', response.data.id);
    return { success: true, messageId: response.data.id };

  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // Don't throw - email failures shouldn't break the flow
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification for referral status changes
 * 
 * @param {string} toEmail - Recipient email address
 * @param {Object} referral - Referral document with populated fields
 * @param {string} eventType - Type of event: 'accepted', 'completed', 'rejected', 'cancelled'
 * @param {string} reason - Optional reason for rejection/cancellation
 * @param {string} notes - Optional notes for acceptance
 */
const sendReferralStatusEmail = async (toEmail, referral, eventType, reason = '', notes = '') => {
  try {
    if (!toEmail) {
      console.warn('No email address provided for referral notification');
      return;
    }

    const subject = getEmailSubject(referral, eventType);
    const htmlBody = getEmailBody(referral, eventType, reason, notes);

    // PRODUCTION: Uncomment when nodemailer is configured with SMTP credentials
    /*
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
    */

    // Placeholder: Log email details for development
    console.log('📧 Email Notification (Placeholder):');
    console.log('To:', toEmail);
    console.log('Subject:', subject);
    console.log('Event:', eventType);
    console.log('Referral ID:', referral.referralId);
    console.log('---');

    return { success: true, placeholder: true };
  } catch (error) {
    console.error('Failed to send email notification:', error);
    // Don't throw - email failures shouldn't break the referral workflow
    return { success: false, error: error.message };
  }
};

/**
 * Generate email subject based on event type
 */
const getEmailSubject = (referral, eventType) => {
  const refId = referral.referralId;
  
  switch (eventType) {
    case 'accepted':
      return `Referral ${refId} Accepted`;
    case 'completed':
      return `Referral ${refId} Completed`;
    case 'rejected':
      return `Referral ${refId} Rejected`;
    case 'cancelled':
      return `Referral ${refId} Cancelled`;
    default:
      return `Referral ${refId} Status Update`;
  }
};

/**
 * Generate HTML email body based on event type
 */
const getEmailBody = (referral, eventType, reason, notes) => {
  const refId = referral.referralId;
  const sourceName = referral.sourceSnapshot?.name || 'Unknown Source';
  const targetName = referral.targetSnapshot?.name || 'Unknown Target';
  const patientName = referral.patientSnapshot?.name || 'Unknown Patient';
  const timestamp = formatDateForDisplay(referral.statusHistory[referral.statusHistory.length - 1]?.timestamp || new Date());

  let bodyContent = '';

  switch (eventType) {
    case 'accepted':
      bodyContent = `
        <h2>Referral Accepted</h2>
        <p>Your referral <strong>${refId}</strong> to <strong>${targetName}</strong> has been accepted.</p>
        ${notes ? `<p><strong>Notes from ${targetName}:</strong><br>${notes}</p>` : ''}
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Accepted on:</strong> ${timestamp}</p>
      `;
      break;

    case 'completed':
      bodyContent = `
        <h2>Referral Completed</h2>
        <p>Referral <strong>${refId}</strong> has been completed by <strong>${targetName}</strong>.</p>
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Completed on:</strong> ${timestamp}</p>
      `;
      break;

    case 'rejected':
      bodyContent = `
        <h2>Referral Rejected</h2>
        <p>Your referral <strong>${refId}</strong> to <strong>${targetName}</strong> has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong><br>${reason}</p>` : ''}
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Rejected on:</strong> ${timestamp}</p>
      `;
      break;

    case 'cancelled':
      bodyContent = `
        <h2>Referral Cancelled</h2>
        <p>Referral <strong>${refId}</strong> from <strong>${sourceName}</strong> has been cancelled.</p>
        ${reason ? `<p><strong>Reason:</strong><br>${reason}</p>` : ''}
        <p><strong>Patient:</strong> ${patientName}</p>
        <p><strong>Cancelled on:</strong> ${timestamp}</p>
      `;
      break;

    default:
      bodyContent = `
        <h2>Referral Status Update</h2>
        <p>Referral <strong>${refId}</strong> status has been updated.</p>
        <p><strong>Patient:</strong> ${patientName}</p>
      `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h2 { color: #2c3e50; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        ${bodyContent}
        <div class="footer">
          <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send referral notification to multiple recipients
 * 
 * @param {Array<string>} emails - Array of recipient email addresses
 * @param {Object} referral - Referral document
 * @param {string} eventType - Event type
 * @param {string} reason - Optional reason
 * @param {string} notes - Optional notes
 */
const sendReferralStatusEmailBulk = async (emails, referral, eventType, reason = '', notes = '') => {
  const results = await Promise.allSettled(
    emails.map(email => sendReferralStatusEmail(email, referral, eventType, reason, notes))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Bulk email send complete: ${successful} successful, ${failed} failed`);

  return { successful, failed, results };
};

/**
 * Send email notification for appointment rescheduling
 * 
 * @param {string} toEmail - Provider's email address
 * @param {Object} booking - Updated booking document with new slot details
 * @param {Object} oldBookingDetails - Object containing old slot details { date, startTime, endTime }
 * @param {string} rescheduleReason - Optional reason for rescheduling
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendReschedulingNotificationEmail = async (toEmail, booking, oldBookingDetails, rescheduleReason = '') => {
  try {
    if (!toEmail) {
      console.warn('No email address provided for rescheduling notification');
      return { success: false, error: 'No email address provided' };
    }

    const subject = `Appointment Rescheduled - ${booking.bookingId}`;
    const patientName = booking.patientSnapshot?.name || 'Patient';
    const oldDate = formatDateForDisplay(oldBookingDetails.date);
    const oldTime = `${oldBookingDetails.startTime} - ${oldBookingDetails.endTime}`;
    const newDate = formatDateForDisplay(booking.bookingDate);
    const newTime = `${booking.bookingTime.startTime} - ${booking.bookingTime.endTime}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #228be6; }
          h2 { color: #2c3e50; margin-bottom: 20px; }
          .info-section { background: #f8f9fa; border-left: 4px solid #228be6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-label { font-weight: 600; color: #495057; }
          .info-value { color: #212529; margin-left: 10px; }
          .old-details { background: #fff3cd; border-left: 4px solid #ffc107; }
          .new-details { background: #d1ecf1; border-left: 4px solid #0dcaf0; }
          .reason-section { background: #e7f3ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">🏥 ArogyaFirst</div>
            </div>
            
            <h2>Appointment Rescheduled</h2>
            
            <p>An appointment has been rescheduled by the patient.</p>
            
            <div class="info-section">
              <div><span class="info-label">Booking ID:</span><span class="info-value">${booking.bookingId}</span></div>
              <div><span class="info-label">Patient:</span><span class="info-value">${patientName}</span></div>
              <div><span class="info-label">Phone:</span><span class="info-value">${booking.patientSnapshot?.phone || 'N/A'}</span></div>
            </div>
            
            <div class="info-section old-details">
              <strong>Previous Appointment:</strong>
              <div><span class="info-label">Date:</span><span class="info-value">${oldDate}</span></div>
              <div><span class="info-label">Time:</span><span class="info-value">${oldTime}</span></div>
            </div>
            
            <div class="info-section new-details">
              <strong>New Appointment:</strong>
              <div><span class="info-label">Date:</span><span class="info-value">${newDate}</span></div>
              <div><span class="info-label">Time:</span><span class="info-value">${newTime}</span></div>
            </div>
            
            ${rescheduleReason ? `
            <div class="reason-section">
              <strong>Reason for Rescheduling:</strong><br>
              ${rescheduleReason}
            </div>
            ` : ''}
            
            <div class="footer">
              <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ArogyaFirst. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Rescheduling Notification Email (Development Mode - SMTP not configured):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('Booking ID:', booking.bookingId);
      console.log('Patient:', patientName);
      console.log('Old Date/Time:', oldDate, oldTime);
      console.log('New Date/Time:', newDate, newTime);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Rescheduling notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send rescheduling notification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send lab report notification email to patient
 * @param {string} toEmail - Patient email address
 * @param {Object} booking - Booking object with populated patientId and metadata
 * @param {string} reportTitle - Title of the uploaded report
 * @param {string} labName - Name of the lab that uploaded the report
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendLabReportNotificationEmail = async (toEmail, booking, reportTitle, labName) => {
  try {
    if (!toEmail) {
      console.warn('No email address provided for lab report notification');
      return { success: false, error: 'No email address provided' };
    }

    const subject = `Lab Report Uploaded - ${booking.bookingId}`;
    const patientName = booking.patientSnapshot?.name || booking.patientId?.name || booking.patientId?.displayName || 'Patient';
    const uploadDate = formatDateForDisplay(new Date());
    const testType = booking.metadata?.testType || booking.metadata?.type || 'Lab Test';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #228be6; }
          h2 { color: #2c3e50; margin-bottom: 20px; }
          .success-badge { display: inline-block; background: #d4edda; color: #155724; padding: 10px 20px; border-radius: 6px; margin-bottom: 20px; font-weight: 600; }
          .info-section { background: #f8f9fa; border-left: 4px solid #228be6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-label { font-weight: 600; color: #495057; }
          .info-value { color: #212529; margin-left: 10px; }
          .cta-button { display: inline-block; background: #228be6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">🏥 ArogyaFirst</div>
            </div>
            
            <div style="text-align: center;">
              <div class="success-badge">✓ Report Uploaded Successfully</div>
            </div>
            
            <h2>Your Lab Report is Ready</h2>
            
            <p>Hello ${patientName},</p>
            
            <p>Good news! Your lab report has been uploaded and is now available for review. You can view it anytime in your ArogyaFirst Documents section.</p>
            
            <div class="info-section">
              <div><span class="info-label">Booking ID:</span><span class="info-value">${booking.bookingId}</span></div>
              <div><span class="info-label">Report Title:</span><span class="info-value">${reportTitle}</span></div>
              <div><span class="info-label">Test Type:</span><span class="info-value">${testType}</span></div>
              <div><span class="info-label">Lab:</span><span class="info-value">${labName}</span></div>
              <div><span class="info-label">Upload Date:</span><span class="info-value">${uploadDate}</span></div>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://arogyafirst.com'}/documents" class="cta-button">View Your Report</a>
            </p>
            
            <p>If you have any questions about your results, please consult with your healthcare provider or contact us for support.</p>
            
            <div class="footer">
              <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ArogyaFirst. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Lab Report Notification Email (Development Mode - SMTP not configured):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('Booking ID:', booking.bookingId);
      console.log('Report:', reportTitle);
      console.log('Lab:', labName);
      console.log('Test Type:', testType);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Lab report notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send lab report notification email:', error);
    return { success: false, error: error.message };
  }
};
/**
 * Send Purchase Order Approval Email
 */
const sendPOApprovalEmail = async (toEmail, purchaseOrder, pharmacyName) => {
  try {
    if (!toEmail) {
      return { success: false, error: 'Email address is required' };
    }

    const subject = `Purchase Order ${purchaseOrder.poNumber} Approved - ${pharmacyName}`;

    const itemsTable = purchaseOrder.items.map(item => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 12px; text-align: left;">${item.medicineName}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .header { background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; }
          .po-details { background: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #0066cc; color: white; padding: 12px; text-align: left; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          .success-badge { display: inline-block; background: #4caf50; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Purchase Order Approved</h1>
            <p>ArogyaFirst Pharmacy Management</p>
          </div>
          <div class="content">
            <p>Dear ${purchaseOrder.supplierSnapshot.name},</p>
            <p>Your purchase order has been approved and is ready for processing.</p>
            
            <div class="po-details">
              <strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}<br>
              <strong>Pharmacy:</strong> ${pharmacyName}<br>
              <strong>Order Date:</strong> ${new Date(purchaseOrder.orderDate).toLocaleDateString('en-IN')}<br>
              <strong>Expected Delivery:</strong> ${purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString('en-IN') : 'Not specified'}<br>
              <strong>Approved On:</strong> ${new Date(purchaseOrder.approvedAt).toLocaleDateString('en-IN')} ${new Date(purchaseOrder.approvedAt).toLocaleTimeString('en-IN')}
            </div>

            <h3>Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsTable}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #0066cc; font-weight: bold;">
                  <td colspan="3" style="padding: 12px; text-align: right;">Total Amount:</td>
                  <td style="padding: 12px; text-align: right; color: #0066cc; font-size: 16px;">₹${purchaseOrder.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div class="success-badge">✓ Status: APPROVED</div>

            ${purchaseOrder.notes ? `<p><strong>Additional Notes:</strong><br>${purchaseOrder.notes}</p>` : ''}

            <p>Please arrange for the delivery at the earliest convenience. For any queries, please contact the pharmacy directly.</p>
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Purchase Order Approval Email (Placeholder):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('PO Number:', purchaseOrder.poNumber);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('PO approval email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send PO approval email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Purchase Order Received Email
 */
const sendPOReceivedEmail = async (toEmail, purchaseOrder, pharmacyName, receivedItems) => {
  try {
    if (!toEmail) {
      return { success: false, error: 'Email address is required' };
    }

    const isCompleted = purchaseOrder.status === PO_STATUS.COMPLETED;
    const subject = `Purchase Order ${purchaseOrder.poNumber} ${isCompleted ? 'Completed' : 'Partially Received'} - ${pharmacyName}`;

    const itemsTable = purchaseOrder.items.map((poItem) => {
      const remaining = poItem.quantity - (poItem.quantityReceived || 0);
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; text-align: left;">${poItem.medicineName}</td>
          <td style="padding: 12px; text-align: center;">${poItem.quantityReceived || 0}</td>
          <td style="padding: 12px; text-align: center;">${remaining}</td>
          <td style="padding: 12px; text-align: center;"><span style="background: ${remaining === 0 ? '#4caf50' : '#ff9800'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${remaining === 0 ? 'Complete' : 'Pending'}</span></td>
        </tr>
      `;
    }).join('');

    const statusColor = isCompleted ? '#4caf50' : '#ff9800';
    const statusText = isCompleted ? 'COMPLETED' : 'PARTIALLY RECEIVED';

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; }
          .po-details { background: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #0066cc; color: white; padding: 12px; text-align: left; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Purchase Order ${isCompleted ? 'Completed' : 'Partially Received'}</h1>
            <p>ArogyaFirst Pharmacy Management</p>
          </div>
          <div class="content">
            <p>Dear ${purchaseOrder.supplierSnapshot.name},</p>
            <p>We have received items for your purchase order.</p>
            
            <div class="po-details">
              <strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}<br>
              <strong>Pharmacy:</strong> ${pharmacyName}<br>
              <strong>Received On:</strong> ${new Date(purchaseOrder.receivedAt || new Date()).toLocaleDateString('en-IN')} ${new Date(purchaseOrder.receivedAt || new Date()).toLocaleTimeString('en-IN')}<br>
              <strong>Status:</strong> ${statusText}
            </div>

            <h3>Received Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Received</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${itemsTable}
              </tbody>
            </table>

            <div class="status-badge">${isCompleted ? '✓' : '◐'} Status: ${statusText}</div>

            <p>Thank you for prompt delivery!</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Purchase Order Received Email (Placeholder):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('PO Number:', purchaseOrder.poNumber);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('PO received email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send PO received email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send Purchase Order Cancelled Email
 */
const sendPOCancelledEmail = async (toEmail, purchaseOrder, pharmacyName, reason) => {
  try {
    if (!toEmail) {
      return { success: false, error: 'Email address is required' };
    }

    const subject = `Purchase Order ${purchaseOrder.poNumber} Cancelled - ${pharmacyName}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
          .header { background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; }
          .po-details { background: #ffebee; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          .cancel-badge { display: inline-block; background: #d32f2f; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Purchase Order Cancelled</h1>
            <p>ArogyaFirst Pharmacy Management</p>
          </div>
          <div class="content">
            <p>Dear ${purchaseOrder.supplierSnapshot.name},</p>
            <p>We regret to inform you that the following purchase order has been cancelled.</p>
            
            <div class="po-details">
              <strong>Purchase Order Number:</strong> ${purchaseOrder.poNumber}<br>
              <strong>Pharmacy:</strong> ${pharmacyName}<br>
              <strong>Original Order Date:</strong> ${new Date(purchaseOrder.orderDate).toLocaleDateString('en-IN')}<br>
              <strong>Cancellation Date:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}<br>
              <strong>Total Amount:</strong> ₹${purchaseOrder.totalAmount.toFixed(2)}
            </div>

            ${reason ? `<p><strong>Reason for Cancellation:</strong><br>${reason}</p>` : ''}

            <div class="cancel-badge">✗ Status: CANCELLED</div>

            <p>If you have any questions regarding this cancellation, please contact the pharmacy directly.</p>
            <p>We appreciate your understanding.</p>
          </div>
          <div class="footer">
            <p>This is an automated notification from ArogyaFirst. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Purchase Order Cancelled Email (Placeholder):');
      console.log('To:', toEmail);
      console.log('Subject:', subject);
      console.log('PO Number:', purchaseOrder.poNumber);
      console.log('Reason:', reason || 'Not specified');
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: toEmail,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('PO cancelled email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send PO cancelled email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send contact form submission email to support team
 * Notifies the support team of a new contact form submission from a user
 * 
 * @param {Object} formData - Contact form data
 * @param {string} formData.name - User's full name
 * @param {string} formData.email - User's email address
 * @param {string} formData.subject - Contact subject/category
 * @param {string} formData.message - User's message
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendContactFormEmail = async (formData) => {
  try {
    const { name, email, subject, message } = formData;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@arogyafirst.com';
    const submissionTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #228be6; }
          h2 { color: #2c3e50; margin-bottom: 20px; }
          .badge { display: inline-block; background: #e7f3ff; border-left: 4px solid #228be6; padding: 10px 15px; margin: 20px 0; border-radius: 4px; font-weight: 600; color: #0d6efd; }
          .info-section { background: #f8f9fa; border-left: 4px solid #228be6; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .info-label { font-weight: 600; color: #495057; display: inline-block; width: 100px; }
          .info-value { color: #212529; margin-left: 10px; }
          .message-section { background: #f8f9fa; border-left: 4px solid #0dcaf0; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .message-content { white-space: pre-wrap; word-wrap: break-word; color: #212529; }
          .reply-section { background: #e7f3ff; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #0d6efd; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">💬 ArogyaFirst Contact Form</div>
            </div>
            
            <h2>New Contact Form Submission</h2>
            
            <div class="badge">📬 NEW SUBMISSION</div>
            
            <div class="info-section">
              <div><span class="info-label">Name:</span><span class="info-value">${name}</span></div>
              <div><span class="info-label">Email:</span><span class="info-value"><a href="mailto:${email}">${email}</a></span></div>
              <div><span class="info-label">Subject:</span><span class="info-value">${subject}</span></div>
              <div><span class="info-label">Submitted:</span><span class="info-value">${submissionTime}</span></div>
            </div>
            
            <div class="message-section">
              <strong>Message:</strong>
              <div class="message-content">${message}</div>
            </div>
            
            <div class="reply-section">
              <strong>📧 To Reply:</strong><br>
              Reply directly to this email or send an email to: <a href="mailto:${email}" style="color: #0d6efd; text-decoration: none;">${email}</a>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from ArogyaFirst. Contact Form Management System.</p>
              <p>© ${new Date().getFullYear()} ArogyaFirst. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Contact Form Submission Email (Development Mode - SMTP not configured):');
      console.log('To:', supportEmail);
      console.log('From (Reply-To):', email);
      console.log('Subject:', `New Contact Form Submission: ${subject}`);
      console.log('Submitted Time:', submissionTime);
      console.log('---');
      console.log('Sender:', name, `(${email})`);
      console.log('Subject:', subject);
      console.log('Message:');
      console.log(message);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: supportEmail,
      replyTo: email,
      subject: `New Contact Form Submission: ${subject}`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Contact form submission email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send contact form email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send bed availability notification email to patient
 * @param {String} recipientEmail - Patient email address
 * @param {Object} booking - Booking object with assigned bed details
 * @param {String} hospitalName - Hospital name
 */
const sendBedAvailabilityNotificationEmail = async (recipientEmail, booking, hospitalName) => {
  try {
    const patientName = booking.patientSnapshot?.name || 'Patient';
    const bedNumber = booking.assignedBed?.bedNumber || 'N/A';
    const bedType = booking.assignedBed?.bedType || 'N/A';
    const floor = booking.assignedBed?.floor || 'N/A';
    const ward = booking.assignedBed?.ward || 'N/A';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">Bed Allocation Notification</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
          <p>Dear ${patientName},</p>
          
          <p>We are pleased to inform you that a bed has been allocated for your admission at <strong>${hospitalName}</strong>.</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">Assigned Bed Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 40%;">Bed Number:</td>
                <td style="padding: 8px;">${bedNumber}</td>
              </tr>
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 8px; font-weight: bold;">Bed Type:</td>
                <td style="padding: 8px;">${bedType}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Floor:</td>
                <td style="padding: 8px;">${floor}</td>
              </tr>
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 8px; font-weight: bold;">Ward:</td>
                <td style="padding: 8px;">${ward}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <h4 style="margin-top: 0; color: #e65100;">Next Steps:</h4>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Please report to the admission desk as soon as possible</li>
              <li>Bring your booking confirmation and valid identification documents</li>
              <li>Complete the admission formalities with our staff</li>
            </ol>
          </div>
          
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Booking Date:</strong> ${new Date(booking.bookingDate).toLocaleDateString()}</p>
          
          <p>If you have any questions or need to reschedule, please contact us immediately.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Best regards,<br>
            ArogyaFirst Team<br>
            <em>Your health, our priority</em>
          </p>
        </div>
      </div>
    `;

    // If SMTP not configured, log to console in development
    if (!smtpConfigured) {
      console.log('---');
      console.log('BED ALLOCATION EMAIL (Development Mode)');
      console.log('To:', recipientEmail);
      console.log('Subject: Bed Allocated - ' + hospitalName);
      console.log('Content:', htmlBody);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: recipientEmail,
      subject: `Bed Allocated - ${hospitalName}`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Bed allocation email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send bed allocation email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send queue position update email to patient
 * @param {String} recipientEmail - Patient email address
 * @param {String} patientName - Patient name
 * @param {Number} queuePosition - Position in queue
 * @param {String} estimatedWaitTime - Estimated wait time string
 * @param {String} hospitalName - Hospital name
 */
const sendQueuePositionUpdateEmail = async (recipientEmail, patientName, queuePosition, estimatedWaitTime, hospitalName) => {
  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">Queue Position Update</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
          <p>Dear ${patientName},</p>
          
          <p>Your position in the waiting queue at <strong>${hospitalName}</strong> has been updated.</p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1565c0;">Queue Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 40%;">Your Position:</td>
                <td style="padding: 8px; font-size: 18px; color: #1565c0; font-weight: bold;">#${queuePosition}</td>
              </tr>
              <tr style="background-color: #f5f5f5;">
                <td style="padding: 8px; font-weight: bold;">Estimated Wait Time:</td>
                <td style="padding: 8px;">${estimatedWaitTime}</td>
              </tr>
            </table>
          </div>
          
          <p>We will notify you as soon as a bed becomes available for your admission.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            Best regards,<br>
            ArogyaFirst Team<br>
            <em>Your health, our priority</em>
          </p>
        </div>
      </div>
    `;

    if (!smtpConfigured) {
      console.log('---');
      console.log('QUEUE POSITION UPDATE EMAIL (Development Mode)');
      console.log('To:', recipientEmail);
      console.log('Subject: Queue Position Update - ' + hospitalName);
      console.log('Content:', htmlBody);
      console.log('---');
      return { success: true, placeholder: true };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@arogyafirst.com',
      to: recipientEmail,
      subject: `Queue Position Update - ${hospitalName}`,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Queue position update email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Failed to send queue position update email:', error);
    return { success: false, error: error.message };
  }
};

export {
  verifyEmailTransporter,
  isSmtpConfigured,
  isSmtpVerified,
  generateOTP,
  validateOTPFormat,
  sendOTPEmail,
  sendReferralStatusEmail,
  sendReferralStatusEmailBulk,
  sendReschedulingNotificationEmail,
  sendLabReportNotificationEmail,
  sendPOApprovalEmail,
  sendPOReceivedEmail,
  sendPOCancelledEmail,
  sendContactFormEmail,
  sendBedAvailabilityNotificationEmail,
  sendQueuePositionUpdateEmail,
};
