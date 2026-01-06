const { getCloudinary } = require('../config/cloudinary.js');

// file-type is ESM-only, so we handle it dynamically
let fileTypeFromBuffer;
(async () => {
  try {
    const fileType = await import('file-type');
    fileTypeFromBuffer = fileType.fileTypeFromBuffer;
  } catch (e) {
    console.warn('file-type module not available:', e.message);
  }
})();

/**
 * Uploads a file buffer to Cloudinary with validation.
 * @param {Buffer} buffer - The file buffer from Multer.
 * @param {Object} options - Upload options.
 * @param {string} options.folder - Subfolder within CLOUDINARY_FOLDER (default: 'documents').
 * @param {string} options.resourceType - Resource type (default: 'auto').
 * @param {Array<string>} options.allowedFormats - Allowed file extensions (e.g., ['pdf', 'jpg', 'png']).
 * @returns {Promise<Object>} Upload result with { url, publicId, format, size, uploadedAt }.
 * @throws {Error} If file type is invalid or upload fails.
 */
async function uploadToCloudinary(buffer, options = {}) {
  const { folder = 'documents', resourceType = 'auto', allowedFormats } = options;
  const rootFolder = process.env.CLOUDINARY_FOLDER || 'arogyafirst';

  try {
    // Validate file type using magic numbers
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) {
      throw new Error('Invalid file type: Unable to detect file type from buffer');
    }

    const detectedType = fileType.mime;

    // Check against allowed formats (extensions)
    if (allowedFormats && !allowedFormats.includes(fileType.ext)) {
      throw new Error(`File type not allowed: Detected ${detectedType} (${fileType.ext})`);
    }

    // Upload to Cloudinary (lazy initialize/validate at call time)
    const cloudinary = getCloudinary();
    const uploadOptions = {
      folder: `${rootFolder}/${folder}`,
      resource_type: resourceType
    };

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error.message);
          reject(new Error('Failed to upload file to Cloudinary'));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            uploadedAt: new Date()
          });
        }
      });
      stream.end(buffer);
    });
  } catch (error) {
    console.error('File upload utility error:', error.message);
    throw error;
  }
}

/**
 * Deletes a file from Cloudinary.
 * @param {string} publicId - The public ID of the file to delete.
 * @returns {Promise<Object>} Deletion result from Cloudinary.
 * @throws {Error} If deletion fails.
 */
async function deleteFromCloudinary(publicId) {
  try {
    const cloudinary = getCloudinary();
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error.message);
          reject(new Error('Failed to delete file from Cloudinary'));
        } else {
          resolve(result);
        }
      });
    });
  } catch (error) {
    console.error('File delete utility error:', error.message);
    throw error;
  }
}

/**
 * Validates file type using magic numbers.
 * @param {Buffer} buffer - The file buffer.
 * @param {Array<string>} allowedTypes - Allowed MIME types (e.g., ['image/jpeg', 'application/pdf']).
 * @returns {Promise<Object>} { valid: boolean, detectedType: string }.
 */
async function validateFileType(buffer, allowedTypes) {
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) {
      return { valid: false, detectedType: null };
    }

    const detectedType = fileType.mime;
    const valid = allowedTypes ? allowedTypes.includes(detectedType) : true;

    return { valid, detectedType };
  } catch (error) {
    console.error('File type validation error:', error.message);
    return { valid: false, detectedType: null };
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary, validateFileType };
