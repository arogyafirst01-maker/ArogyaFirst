#!/usr/bin/env node
/**
 * ArogyaFirst Production Server - Simple Express Wrapper
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

console.log(`[${new Date().toISOString()}] Starting ArogyaFirst Production Server...`);

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  next();
});

// JSON parser (before routes)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Mount webhook routes first (before auth middleware)
try {
  const webhookRoutes = require('./src/routes/webhook.routes.js');
  app.use('/api/payments/webhook', webhookRoutes);
  console.log(`[${new Date().toISOString()}] ✓ Webhooks loaded`);
} catch (e) {
  console.warn(`[${new Date().toISOString()}] ⚠ Webhooks: ${e.message}`);
}

// Cache control
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Load all routes
const routes = [
  ['/api/health', './src/routes/health.routes.js'],
  ['/api/auth', './src/routes/auth.routes.js'],
  ['/api/patients', './src/routes/patient.routes.js'],
  ['/api/hospitals', './src/routes/hospital.routes.js'],
  ['/api/doctors', './src/routes/doctor.routes.js'],
  ['/api/labs', './src/routes/lab.routes.js'],
  ['/api/pharmacies', './src/routes/pharmacy.routes.js'],
  ['/api/admin', './src/routes/admin.routes.js'],
  ['/api/slots', './src/routes/slot.routes.js'],
  ['/api/bookings', './src/routes/booking.routes.js'],
  ['/api/providers', './src/routes/provider.routes.js'],
  ['/api/payments', './src/routes/payment.routes.js'],
  ['/api/documents', './src/routes/document.routes.js'],
  ['/api/consent', './src/routes/consent.routes.js'],
  ['/api/prescriptions', './src/routes/prescription.routes.js'],
  ['/api/referrals', './src/routes/referral.routes.js'],
  ['/api/health-awareness', './src/routes/healthAwareness.routes.js'],
  ['/api/consultations', './src/routes/consultation.routes.js'],
  ['/api/billing', './src/routes/billing.routes.js'],
  ['/api/contact', './src/routes/contact.routes.js']
];

let loadedCount = 0;
for (const [path, filePath] of routes) {
  try {
    console.log(`[${new Date().toISOString()}] Loading ${path}...`);
    const route = require(filePath);
    app.use(path, route);
    loadedCount++;
    console.log(`[${new Date().toISOString()}] ✓ ${path}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] ERROR loading ${path}:`, e.message);
    console.error(e.stack);
    // Don't crash, just skip this route
  }
}

console.log(`[${new Date().toISOString()}] ✓ Loaded ${loadedCount}/19 routes`);

// Error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[${new Date().toISOString()}] ✓ Server listening on ${HOST}:${PORT}`);
  console.log(`[${new Date().toISOString()}] ✓ Health endpoint: /api/health`);
});

// Load database in background
(async () => {
  try {
    const connectDB = require('./src/config/database.js');
    await connectDB();
    console.log(`[${new Date().toISOString()}] ✓ Database connected`);
  } catch (e) {
    console.warn(`[${new Date().toISOString()}] ⚠ Database: ${e.message}`);
  }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received`);
  server.close(() => process.exit(0));
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, reason);
});

module.exports = server;
