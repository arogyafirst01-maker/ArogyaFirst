import express from 'express';
import mongoose from 'mongoose';
import { isRazorpayConfigured } from '../config/razorpay.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ArogyaFirst API',
    version: process.env.APP_VERSION || '0.1.0'
  });
});

router.get('/db', (req, res) => {
  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      res.json({
        status: 'ok',
        database: 'connected'
      });
      break;
    case 2:
      res.json({
        status: 'pending',
        database: 'connecting'
      });
      break;
    case 0:
    case 3:
      res.status(503).json({
        status: 'error',
        database: readyState === 0 ? 'disconnected' : 'disconnecting'
      });
      break;
    default:
      res.status(503).json({
        status: 'error',
        database: 'unknown'
      });
  }
});

/**
 * GET /health/services
 * Check external service configuration status (Razorpay, Cloudinary).
 * Returns 200 with service health details for monitoring and troubleshooting.
 */
router.get('/services', (req, res) => {
  const razorpayConfigured = isRazorpayConfigured();
  const cloudinaryConfigured = isCloudinaryConfigured;

  res.json({
    timestamp: new Date().toISOString(),
    services: {
      razorpay: {
        configured: razorpayConfigured,
        status: razorpayConfigured ? 'available' : 'not configured',
        message: razorpayConfigured 
          ? 'Payment gateway is configured and ready' 
          : 'Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables'
      },
      cloudinary: {
        configured: cloudinaryConfigured,
        status: cloudinaryConfigured ? 'available' : 'not configured',
        message: cloudinaryConfigured 
          ? 'Document storage is configured and ready' 
          : 'Missing Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)'
      }
    }
  });
});

export default router;