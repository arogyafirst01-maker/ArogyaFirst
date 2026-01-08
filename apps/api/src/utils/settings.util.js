import User from '../models/User.model.js';

/**
 * Shared helper for updating user settings across all roles.
 * Encapsulates the common settings update pattern to reduce code duplication.
 * 
 * @param {Object} params - Parameters for the update operation
 * @param {string} params.userId - The authenticated user's ID
 * @param {string} params.expectedRole - The expected role for authorization
 * @param {Object} params.settingsPayload - The partial settings payload from req.body
 * @returns {Promise<Object>} - The updated settings object
 * @throws {Object} - Error object with statusCode and message properties
 */
export const updateUserSettings = async ({ userId, expectedRole, settingsPayload }) => {
  const { notificationPreferences, language, privacy, accessibility } = settingsPayload;

  const user = await User.findById(userId);
  if (!user || user.role !== expectedRole) {
    const error = new Error('User not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  // Build updates object from non-undefined fields
  const updates = {};
  if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;
  if (language !== undefined) updates.language = language;
  if (privacy !== undefined) updates.privacy = privacy;
  if (accessibility !== undefined) updates.accessibility = accessibility;

  // Merge with existing settings
  user.settings = { ...user.settings?.toObject?.() || user.settings || {}, ...updates };
  user.markModified('settings');
  await user.save();

  return user.settings;
};
