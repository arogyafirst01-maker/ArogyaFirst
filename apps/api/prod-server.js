#!/usr/bin/env node
/**
 * Production Express.js Server - CommonJS Version
 * Full API with all routes, database connection, and utilities
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import configuration and utilities
const connectDB = require('./config/database.js');
const { getTokenExpiryInSeconds } = require('./utils/jwt.util.js');
const { getRazorpayInstance } = require('./config/razorpay.js');
const { checkTransactionSupport } = require('./utils/transaction.util.js');
const { verifyEmailTransporter } = require('./utils/email.util.js');
const { verifySMSTransporter } = require('./utils/sms.util.js');
const { migrateIndexes } = require('./utils/indexMigration.util.js');

// Import route modules
const healthRoutes = require('./routes/health.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const patientRoutes = require('./routes/patient.routes.js');
const hospitalRoutes = require('./routes/hospital.routes.js');
const doctorRoutes = require('./routes/doctor.routes.js');
const labRoutes = require('./routes/lab.routes.js');
const pharmacyRoutes = require('./routes/pharmacy.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const slotRoutes = require('./routes/slot.routes.js');
const bookingRoutes = require('./routes/booking.routes.js');
const providerRoutes = require('./routes/provider.routes.js');
const paymentRoutes = require('./routes/payment.routes.js');
const webhookRoutes = require('./routes/webhook.routes.js');
const documentRoutes = require('./routes/document.routes.js');
const consentRoutes = require('./routes/consent.routes.js');
const prescriptionRoutes = require('./routes/prescription.routes.js');
const referralRoutes = require('./routes/referral.routes.js');
const healthAwarenessRoutes = require('./routes/healthAwareness.routes.js');
const consultationRoutes = require('./routes/consultation.routes.js');
const billingRoutes = require('./routes/billing.routes.js');
const contactRoutes = require('./routes/contact.routes.js');

// Validate JWT configuration
if (!process.env.JWT_SECRET) {
  console.error('Fatal: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.error('Fatal: JWT_REFRESH_SECRET environment variable is not set');
  process.exit(1);
}

try {
  // Validate JWT expiry formats
  getTokenExpiryInSeconds(process.env.JWT_EXPIRES_IN || '15m');
  getTokenExpiryInSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
} catch (error) {
  console.error('Fatal: Invalid JWT expiry format:', error.message);
  process.exit(1);
}

// Validate Razorpay configuration only if credentials are present
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    getRazorpayInstance();
    console.log('Razorpay payment gateway configured successfully');
  } catch (error) {
    console.warn('Warning: Razorpay initialization failed:', error.message);
  }
} else {
  console.warn('Warning: Razorpay credentials not configured.');
  console.warn('Payment endpoints will return errors until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.');
}

const app = express();

// Start database connection in background - don't block server startup
connectDB()
  .then(async () => {
    console.log('✓ Database connected');
    // Migrate database indexes
    await migrateIndexes();

    // Check transaction support after database connection
    const transactionsEnabled = await checkTransactionSupport();
    if (transactionsEnabled) {
      console.log('MongoDB transactions: ENABLED (replica set detected)');
    } else {
      console.error('WARNING: MongoDB transactions: DISABLED');
      console.error('Multi-document operations will NOT be atomic. Data consistency is NOT guaranteed.');
      console.error('For production: Set up MongoDB replica set and set ENABLE_TRANSACTIONS=true');
      console.error('See docs/DEPLOYMENT.md for setup instructions.');
    }

    // Verify email transporter configuration
    await verifyEmailTransporter();

    // Verify SMS transporter configuration
    await verifySMSTransporter();
  })
  .catch((err) => {
    console.error('⚠ Database connection failed (will retry):', err.message);
  });

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));

// CRITICAL: Mount webhook routes BEFORE express.json() to capture raw body
app.use('/api/payments/webhook', webhookRoutes);

// Global JSON body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Disable caching for all API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  next();
});

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/health-awareness', healthAwarenessRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/contact', contactRoutes);

// Error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, (err) => {
  if (err) throw err;
  console.log(`[${new Date().toISOString()}] Server running on http://${HOST}:${PORT}`);
  console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
