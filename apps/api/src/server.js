import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import labRoutes from './routes/lab.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import adminRoutes from './routes/admin.routes.js';
import slotRoutes from './routes/slot.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import providerRoutes from './routes/provider.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import documentRoutes from './routes/document.routes.js';
import consentRoutes from './routes/consent.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import referralRoutes from './routes/referral.routes.js';
import healthAwarenessRoutes from './routes/healthAwareness.routes.js';
import consultationRoutes from './routes/consultation.routes.js';
import billingRoutes from './routes/billing.routes.js';
import contactRoutes from './routes/contact.routes.js';
import { getTokenExpiryInSeconds } from './utils/jwt.util.js';
import { getRazorpayInstance } from './config/razorpay.js';
import { checkTransactionSupport } from './utils/transaction.util.js';
import { verifyEmailTransporter } from './utils/email.util.js';
import { verifySMSTransporter } from './utils/sms.util.js';
import { migrateIndexes } from './utils/indexMigration.util.js';

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
// This preserves lazy initialization for environments without payment gateway
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

connectDB().then(async () => {
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
  //await verifyEmailTransporter();

  // Verify SMS transporter configuration
  await verifySMSTransporter();
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

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));

// CRITICAL: Mount webhook routes BEFORE express.json() to capture raw body
// Webhook signature verification requires the exact byte-for-byte body.
// If express.json() runs first, it consumes the stream and breaks verification.
app.use('/api/payments/webhook', webhookRoutes);

// Global JSON body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Disable caching for all API responses to ensure fresh data
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.removeHeader('ETag');
  res.removeHeader('Last-Modified');
  next();
});

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
app.use('/api/payments', paymentRoutes); // Payment routes (webhook mounted separately before JSON parser)
app.use('/api/documents', documentRoutes); // Document management routes
app.use('/api/consent', consentRoutes); // Consent management routes
app.use('/api/prescriptions', prescriptionRoutes); // Prescription management routes
app.use('/api/referrals', referralRoutes); // Referral management routes
app.use('/api/health-awareness', healthAwarenessRoutes); // Patient health education articles
app.use('/api/consultations', consultationRoutes); // Consultation management routes
app.use('/api/billing', billingRoutes); // Billing and invoice management routes
app.use('/api/contact', contactRoutes); // Public contact form submission

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, (err) => {
  if (err) throw err;
  console.log(`Server running on http://${HOST}:${PORT}`);
});
