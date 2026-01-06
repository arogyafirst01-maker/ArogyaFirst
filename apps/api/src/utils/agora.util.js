const pkg = require('agora-access-token');
const { RtcTokenBuilder, RtcRole } = pkg;

/**
 * Generates an Agora RTC token for video call authentication.
 * @param {string} channelName - The Agora channel name.
 * @param {number} uid - User ID (0 for dynamic assignment).
 * @param {string} role - 'publisher' or 'subscriber'.
 * @param {number} expiryInSeconds - Token expiry time in seconds (default 3600).
 * @returns {Object} Object with token, channelName, uid, appId, and expiryAt.
 */
function generateAgoraToken(channelName, uid = 0, role = 'publisher', expiryInSeconds = 3600) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
  if (!appId || !appCertificate) {
    throw new Error('Agora credentials not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables.');
  }
  
  // Convert role string to Agora RtcRole
  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  
  // Calculate expiry timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expiryInSeconds;
  
  try {
    // Build token using Agora SDK
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpireTime
    );
    
    return {
      token,
      channelName,
      uid,
      appId,
      expiryAt: new Date(privilegeExpireTime * 1000)
    };
  } catch (error) {
    console.error('Error generating Agora token:', error);
    throw new Error('Failed to generate Agora token');
  }
}

/**
 * Validates if Agora configuration is present in environment.
 * @returns {boolean} True if Agora is configured, false otherwise.
 */
function validateAgoraConfig() {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
  const isConfigured = !!(appId && appCertificate);
  
  if (!isConfigured) {
    console.warn('Agora credentials not configured. Video call features will not be available.');
  }
  
  return isConfigured;
}

/**
 * Generates a unique Agora channel name for a consultation.
 * @param {string} consultationId - The consultation ID.
 * @returns {string} URL-safe channel name.
 */
function generateChannelName(consultationId) {
  // Ensure channel name is URL-safe and follows Agora conventions
  // Max 64 characters, alphanumeric, hyphens, underscores
  const channelName = `consultation-${consultationId}`;
  
  // Validate length
  if (channelName.length > 64) {
    throw new Error('Channel name exceeds maximum length of 64 characters');
  }
  
  // Validate characters (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9-_]+$/.test(channelName)) {
    throw new Error('Channel name contains invalid characters');
  }
  
  return channelName;
}

module.exports = pkg;
