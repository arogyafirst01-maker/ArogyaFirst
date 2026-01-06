#!/usr/bin/env node
/**
 * Production Express.js Server - Safe Loader Version
 * Loads all routes with error handling, no ES module issues
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

console.log(`[${new Date().toISOString()}] Starting ArogyaFirst API Server...`);

// Initialize Express app first
const app = express();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ Fatal: JWT_SECRET environment variable is not set');
  process.exit(1);
}

console.log(`[${new Date().toISOString()}] ✓ JWT_SECRET configured`);

// Configure middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('dev'));

// Mount webhook routes BEFORE JSON parser
try {
  const webhookRoutes = require('./src/routes/webhook.routes.js');
  app.use('/api/payments/webhook', webhookRoutes);
  console.log(`[${new Date().toISOString()}] ✓ Webhook routes loaded`);
} catch (err) {
  console.warn(`[${new Date().toISOString()}] ⚠ Webhook routes failed to load:`, err.message);
}

// Global JSON parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Disable caching
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Route mounting helper
const mountRoute = (path, filename) => {
  try {
    const route = require(`./src/routes/${filename}`);
    app.use(path, route);
    console.log(`[${new Date().toISOString()}] ✓ ${path}`);
    return true;
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] ⚠ ${path} failed: ${err.message}`);
    return false;
  }
};

// Mount all routes
console.log(`[${new Date().toISOString()}] Loading API routes...`);
mountRoute('/api/health', 'health.routes.js');
mountRoute('/api/auth', 'auth.routes.js');
mountRoute('/api/patients', 'patient.routes.js');
mountRoute('/api/hospitals', 'hospital.routes.js');
mountRoute('/api/doctors', 'doctor.routes.js');
mountRoute('/api/labs', 'lab.routes.js');
mountRoute('/api/pharmacies', 'pharmacy.routes.js');
mountRoute('/api/admin', 'admin.routes.js');
mountRoute('/api/slots', 'slot.routes.js');
mountRoute('/api/bookings', 'booking.routes.js');
mountRoute('/api/providers', 'provider.routes.js');
mountRoute('/api/payments', 'payment.routes.js');
mountRoute('/api/documents', 'document.routes.js');
mountRoute('/api/consent', 'consent.routes.js');
mountRoute('/api/prescriptions', 'prescription.routes.js');
mountRoute('/api/referrals', 'referral.routes.js');
mountRoute('/api/health-awareness', 'healthAwareness.routes.js');
mountRoute('/api/consultations', 'consultation.routes.js');
mountRoute('/api/billing', 'billing.routes.js');
mountRoute('/api/contact', 'contact.routes.js');

// Error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] ✓ Server running on http://${HOST}:${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health endpoint: /api/health`);
  console.log(`[${new Date().toISOString()}] ✓ Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Database connection in background
(async () => {
  try {
    const connectDB = require('./src/config/database.js');
    await connectDB();
    console.log(`[${new Date().toISOString()}] ✓ Database connected`);
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] ⚠ Database connection error: ${err.message}`);
    console.warn(`[${new Date().toISOString()}] ⚠ App will continue with health checks only`);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  process.exit(1);
});

module.exports = app;
