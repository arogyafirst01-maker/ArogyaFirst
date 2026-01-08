import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate a short-lived access token
 * @param {Object} payload - Payload containing userId, email, role, uniqueId
 * @returns {string} - Signed JWT access token
 */
function generateAccessToken(payload) {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
}

/**
 * Generate a long-lived refresh token
 * @param {Object} payload - Payload containing userId, tokenId
 * @returns {string} - Signed JWT refresh token
 */
function generateRefreshToken(payload) {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  } catch (error) {
    throw new Error(`Failed to generate refresh token: ${error.message}`);
  }
}

/**
 * Verify an access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError} - If token is invalid or expired
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    } else {
      throw new Error(`Access token verification failed: ${error.message}`);
    }
  }
}

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError} - If token is invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }
}

/**
 * Decode a token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error(`Failed to decode token: ${error.message}`);
  }
}

/**
 * Convert expiry string to seconds
 * @param {string} expiresIn - Expiry string like '15m', '7d'
 * @returns {number} - Expiry in seconds
 */
function getTokenExpiryInSeconds(expiresIn) {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiresIn}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: throw new Error(`Unsupported time unit: ${unit}`);
  }
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiryInSeconds,
};