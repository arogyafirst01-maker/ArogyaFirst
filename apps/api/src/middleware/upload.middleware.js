import multer from 'multer';
import { errorResponse } from '../utils/response.util.js';

const storage = multer.memoryStorage();

const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB max per file
  files: 5, // max 5 files per request
  fields: 10, // max 10 form fields
  parts: 20 // max 20 multipart parts
};

// Custom error type for invalid file types
class InvalidFileTypeError extends multer.MulterError {
  constructor(file) {
    super('INVALID_FILE_TYPE');
    this.message = `File '${file.originalname}' has unsupported type. Allowed: PDF, JPEG, PNG, CSV`;
  }
}

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.ms-excel'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Use custom error for better error messages
    cb(new InvalidFileTypeError(file));
  }
};

const multerConfig = {
  storage,
  limits,
  fileFilter
};

export const uploadSingle = (fieldName) => multer(multerConfig).single(fieldName);
export const uploadMultiple = (fieldName, maxCount) => multer(multerConfig).array(fieldName, maxCount);
export const uploadFields = (fields) => multer(multerConfig).fields(fields);

export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // Handle multer errors with specific messages
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return errorResponse(res, 'File size limit exceeded (max 5MB)', 400);
      case 'LIMIT_FILE_COUNT':
        return errorResponse(res, 'Too many files (max 5)', 400);
      case 'LIMIT_FIELD_COUNT':
        return errorResponse(res, 'Too many form fields', 400);
      case 'INVALID_FILE_TYPE':
        return errorResponse(res, error.message, 400);
      default:
        return errorResponse(res, 'File upload error', 400);
    }
  }
  // Pass other errors through
  next(error);
};