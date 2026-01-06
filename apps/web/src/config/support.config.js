/**
 * Support Contact Configuration
 * 
 * Frontend contact information for display on Contact page.
 * IMPORTANT: Keep the SUPPORT_EMAIL values in sync with the backend SUPPORT_EMAIL 
 * environment variable (apps/api/src/utils/email.util.js line ~955)
 * and operations team configuration.
 * 
 * Backend Reference:
 * - apps/api/src/utils/email.util.js: sendContactFormEmail() function
 * - Environment variable: SUPPORT_EMAIL (defaults to 'support@arogyafirst.com')
 */

export const SUPPORT_CONTACT = {
  emails: {
    support: 'support@arogyafirst.com',      // Main support channel - MUST match backend SUPPORT_EMAIL
    technical: 'tech@arogyafirst.com',       // Technical issues
    billing: 'billing@arogyafirst.com',      // Billing inquiries
  },
  phone: '+91-1800-123-4567',
  businessHours: {
    weekdays: '9:00 AM - 6:00 PM IST',      // Monday - Friday
    saturday: '10:00 AM - 4:00 PM IST',
    sunday: 'Closed',
  },
};

/**
 * Backend Email Configuration Mapping
 * 
 * The backend sendContactFormEmail function uses:
 * - process.env.SUPPORT_EMAIL (defaults to 'support@arogyafirst.com')
 * - process.env.EMAIL_FROM (defaults to 'noreply@arogyafirst.com')
 * 
 * Operations teams should ensure SUPPORT_CONTACT.emails.support matches
 * the backend SUPPORT_EMAIL environment variable when updating contact addresses.
 */
export const BACKEND_EMAIL_CONFIG = {
  supportEmailEnvVar: 'SUPPORT_EMAIL',
  defaultSupportEmail: 'support@arogyafirst.com',
  note: 'Update SUPPORT_CONTACT.emails.support if backend SUPPORT_EMAIL environment variable changes',
};
