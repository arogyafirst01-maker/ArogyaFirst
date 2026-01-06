const cloudinaryModule = require('cloudinary');
const cloudinary = cloudinaryModule.v2;
require('dotenv/config');

// Lazy initializer for Cloudinary. Do not throw at import time so the API can boot without Cloudinary configured.
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
let _configured = false;

const isCloudinaryConfigured = requiredEnvVars.every((k) => !!process.env[k]);

if (!process.env.CLOUDINARY_FOLDER) {
  console.warn('CLOUDINARY_FOLDER is not set. Defaulting to "arogyafirst" when uploading files.');
}

function getCloudinary() {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
  }
  if (!_configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    _configured = true;
    console.log('Cloudinary configured successfully');
  }
  return cloudinary;
}

module.exports = { getCloudinary, isCloudinaryConfigured };