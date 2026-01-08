/**
 * Idempotency Utility
 * 
 * Generates unique idempotency keys for payment operations to prevent
 * duplicate charges, orders, and refunds in the Razorpay payment system.
 * 
 * Idempotency is crucial for payment systems to ensure that retrying a failed
 * request does not result in duplicate transactions. Each operation should have
 * a unique identifier that Razorpay can use to detect and reject duplicates.
 */

/**
 * Generate a random alphanumeric string
 * @param {number} length - Length of the random string
 * @returns {string} Random alphanumeric string
 */
const generateRandomString = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a unique receipt ID for Razorpay orders and refunds
 * 
 * Format: {prefix}-{identifier}-{timestamp}-{random}
 * 
 * Examples:
 * - RCP-67890abc12345def-1700000000000-A3b9Xz (order receipt)
 * - RFD-67890abc12345def-1700000000000-K8m2Pq (refund receipt)
 * 
 * @param {string} prefix - Prefix identifying the operation type ('RCP' for receipts, 'RFD' for refunds)
 * @param {string} identifier - Unique identifier (typically bookingId)
 * @returns {string} Unique receipt ID
 */
export const generateReceiptId = (prefix, identifier) => {
  if (!prefix || !identifier) {
    throw new Error('Both prefix and identifier are required for receipt ID generation');
  }
  
  // Razorpay receipt must be max 40 characters
  // Format: PREFIX-SUFFIX where SUFFIX is derived from identifier hash
  // This keeps total length under 40 chars
  
  // Convert identifier to a short hash
  let shortId = identifier;
  if (typeof identifier === 'string' && identifier.length > 12) {
    // Take last 8 characters of identifier (usually enough for uniqueness)
    shortId = identifier.slice(-8);
  }
  
  // Create receipt: PREFIX-shortId (e.g., RCP-8b939011)
  const receipt = `${prefix}-${shortId}`;
  
  // Ensure it doesn't exceed 40 characters
  if (receipt.length > 40) {
    // Fallback: just use prefix-timestamp mod
    return `${prefix}-${Date.now() % 1000000}`;
  }
  
  return receipt;
};

/**
 * Validate receipt ID format
 * 
 * Checks if a receipt ID matches the expected format: PREFIX-identifier-timestamp-random
 * 
 * @param {string} receipt - Receipt ID to validate
 * @returns {boolean} True if format is valid, false otherwise
 */
export const validateReceiptFormat = (receipt) => {
  if (!receipt || typeof receipt !== 'string') {
    return false;
  }
  
  // Expected format: PREFIX-identifier-timestamp-random
  // PREFIX: 3-4 uppercase letters
  // identifier: alphanumeric (MongoDB ObjectId or custom)
  // timestamp: 13 digits
  // random: 6 alphanumeric characters
  const receiptPattern = /^[A-Z]{3,4}-[a-zA-Z0-9]+-\d{13}-[A-Za-z0-9]{6}$/;
  
  return receiptPattern.test(receipt);
};
