const express = require('express');

/**
 * Raw Body Parser Middleware
 * 
 * Provides middleware for capturing raw request body as Buffer,
 * which is required for Razorpay webhook signature verification.
 * 
 * CRITICAL IMPLEMENTATION DETAILS:
 * 
 * Razorpay webhook signatures are computed using HMAC-SHA256 over
 * the exact byte-for-byte request body. Standard JSON parsing
 * can alter the body (whitespace, key ordering), breaking verification.
 * 
 * Implementation Requirements:
 * 1. Use express.raw({ type: 'application/json' }) to capture raw Buffer
 * 2. Store original Buffer in req.rawBody for signature verification
 * 3. Manually parse JSON and assign to req.body for handler convenience
 * 4. Apply this middleware ONLY to webhook routes (not globally)
 * 5. Webhook route must be defined BEFORE global express.json() processes it
 * 
 * Current Implementation in apps/api/src/server.js:
 * 
 *   // CRITICAL: Mount webhook routes BEFORE express.json() to capture raw body
 *   // Webhook signature verification requires the exact byte-for-byte body.
 *   // If express.json() runs first, it consumes the stream and breaks verification.
 *   app.use('/api/payments/webhook', webhookRoutes);
 *   
 *   // Global middleware for other routes
 *   app.use(cookieParser());
 *   app.use(express.json());
 *   app.use(express.urlencoded({ extended: true }));
 * 
 * The webhook routes in apps/api/src/routes/webhook.routes.js apply webhookMiddleware
 * internally, which uses express.raw() to override the global JSON parsing.
 * 
 * Testing:
 * - Verify HMAC signature matches using sample Razorpay webhook
 * - Test with known webhook secret and payload from Razorpay docs
 * - Ensure req.rawBody is Buffer and req.body is parsed Object
 * 
 * Usage in routes:
 * router.post('/webhook', webhookMiddleware, handleWebhook);
 */

/**
 * Raw body parser using express.raw()
 * Captures the raw body as a Buffer in req.body
 * 
 * @returns {Function} Express middleware
 */
const rawBodyParser = () => {
  return express.raw({ type: 'application/json' });
};

/**
 * Attach raw body middleware
 * 
 * Stores the raw body in req.rawBody as a Buffer,
 * then parses it as JSON and stores in req.body for convenience.
 * 
 * This allows signature verification using the raw body while still
 * accessing parsed JSON data in the handler.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const attachRawBody = (req, res, next) => {
  // Store raw body for signature verification
  req.rawBody = req.body;
  
  // Validate that raw body is a Buffer (not already parsed by express.json)
  // Set error flag instead of returning 400 to ensure webhook always returns 2xx to Razorpay
  if (!Buffer.isBuffer(req.rawBody)) {
    console.error('Raw body is not a Buffer - webhook route may be mounted after express.json()');
    req.webhookBodyError = true;
    req.webhookBodyErrorMessage = 'Webhook configuration error: Invalid body - expected raw Buffer. Ensure webhook routes are mounted before express.json() middleware.';
    return next();
  }
  
  try {
    // Parse JSON manually for handler convenience
    req.body = JSON.parse(req.rawBody.toString('utf8'));
  } catch (error) {
    console.error('Error parsing webhook body:', error);
    req.webhookBodyError = true;
    req.webhookBodyErrorMessage = 'Invalid JSON body';
    return next();
  }
  
  next();
};

/**
 * Combined middleware for webhook routes
 * Applies raw body parsing and attachment in sequence
 * 
 * Usage in routes:
 * router.post('/webhook', webhookMiddleware, handleWebhook);
 * 
 * @returns {Array} Array of middleware functions
 */
const webhookMiddleware = [rawBodyParser(), attachRawBody];

module.exports = { webhookMiddleware, rawBodyParser, attachRawBody };
