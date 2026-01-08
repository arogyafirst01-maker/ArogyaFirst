import Razorpay from 'razorpay';

/**
 * Razorpay Configuration
 * 
 * Initializes and exports a Razorpay instance for payment processing.
 * Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.
 * 
 * Validation is performed on first access via getRazorpayInstance().
 * Note: server.js calls getRazorpayInstance() at startup to validate configuration
 * and provide early feedback, so validation may occur before payment routes are used.
 * Non-payment tooling can still function if credentials are missing (validation deferred).
 * Payment endpoints will return appropriate errors if credentials are not configured.
 * 
 * Usage:
 * - Import this instance in controllers to create orders, verify payments, and process refunds
 * - Example: razorpayInstance.orders.create({ amount, currency, receipt })
 * 
 * @see {@link https://razorpay.com/docs/api/}
 */

let razorpayInstance = null;

/**
 * Check if Razorpay is configured with required environment variables.
 * Used by health checks to report service status.
 * 
 * @returns {boolean} True if both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set
 */
export const isRazorpayConfigured = () => {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

/**
 * Get Razorpay instance with lazy validation
 * Validates credentials only when instance is first accessed
 * 
 * @returns {Razorpay} Razorpay SDK instance
 * @throws {Error} If RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured
 */
export const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    // Validate required environment variables on first access
    if (!isRazorpayConfigured()) {
      throw new Error(
        'Razorpay payment gateway not configured. ' +
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be defined in environment variables. ' +
        'Please add them to your .env file. See .env.example for reference.'
      );
    }

    // Initialize Razorpay instance with API credentials
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  
  return razorpayInstance;
};
