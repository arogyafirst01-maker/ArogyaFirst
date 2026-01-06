/**
 * Razorpay Utility
 * 
 * Provides functions for loading Razorpay checkout script and initializing payments.
 * Uses dynamic script loading to avoid bundling Razorpay SDK with the app.
 */

/**
 * Load Razorpay checkout script dynamically
 * 
 * Checks if Razorpay is already loaded, otherwise creates a script tag
 * and appends it to the document body. Returns a Promise that resolves
 * when the script is loaded or rejects on error.
 * 
 * @returns {Promise<void>} Promise that resolves when Razorpay script is loaded
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      resolve();
      return;
    }

    // Create script tag
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    // Handle script load success
    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(new Error('Razorpay SDK loaded but not available'));
      }
    };

    // Handle script load failure
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK'));
    };

    // Append script to document
    document.body.appendChild(script);
  });
};

/**
 * Initialize Razorpay payment
 * 
 * Loads Razorpay script and opens checkout modal with provided options.
 * Handles payment success and failure callbacks.
 * 
 * @param {Object} options - Razorpay checkout options
 * @param {string} options.key - Razorpay API key ID
 * @param {number} options.amount - Payment amount in smallest currency unit (paise)
 * @param {string} options.currency - Currency code (e.g., 'INR')
 * @param {string} options.order_id - Razorpay order ID from backend
 * @param {string} options.name - Business name (e.g., 'ArogyaFirst')
 * @param {string} options.description - Payment description
 * @param {Object} options.prefill - Pre-filled customer details
 * @param {string} options.prefill.name - Customer name
 * @param {string} options.prefill.email - Customer email
 * @param {string} options.prefill.contact - Customer phone number
 * @param {Function} onSuccess - Callback function on payment success (receives response)
 * @param {Function} onFailure - Callback function on payment failure or modal close
 * @returns {Promise<void>} Promise that resolves when checkout modal is opened
 */
export const initializeRazorpayPayment = async (options, onSuccess, onFailure) => {
  try {
    // Load Razorpay script
    await loadRazorpayScript();

    // Get payment timeout from env (default 15 minutes = 900000ms)
    const paymentTimeout = parseInt(import.meta.env.VITE_PAYMENT_TIMEOUT || '900000', 10);
    let timeoutId = null;

    // Set up timeout handler
    const setupTimeout = () => {
      timeoutId = setTimeout(() => {
        console.warn('Payment session timed out after', paymentTimeout, 'ms');
        const timeoutError = new Error(
          `Payment session timed out. Please try again. If amount was deducted, it will be refunded within 5-7 business days.`
        );
        onFailure(timeoutError);
      }, paymentTimeout);
    };

    // Clear timeout helper
    const clearPaymentTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Create Razorpay instance with options
    const razorpay = new window.Razorpay({
      ...options,
      // Success handler
      handler: (response) => {
        // Clear timeout on successful payment
        clearPaymentTimeout();
        // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
        onSuccess(response);
      },
      // Modal close/dismiss handler (payment incomplete)
      modal: {
        ondismiss: () => {
          // Clear timeout when modal is closed
          clearPaymentTimeout();
          onFailure(new Error('Payment cancelled by user'));
        },
      },
      // Theme customization
      theme: {
        color: '#228be6', // Mantine blue
      },
    });

    // Start timeout before opening modal
    setupTimeout();

    // Open checkout modal
    razorpay.open();

  } catch (error) {
    console.error('Error initializing Razorpay payment:', error);
    onFailure(error);
  }
};
