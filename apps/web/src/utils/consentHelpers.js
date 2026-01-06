import { CONSENT_STATUS } from '@arogyafirst/shared';

/**
 * Get Mantine Badge color for consent status
 * @param {string} status - Consent status from CONSENT_STATUS enum
 * @returns {string} Mantine Badge color
 */
export const getConsentStatusColor = (status) => {
  const colorMap = {
    [CONSENT_STATUS.PENDING]: 'yellow',
    [CONSENT_STATUS.APPROVED]: 'green',
    [CONSENT_STATUS.REJECTED]: 'red',
    [CONSENT_STATUS.REVOKED]: 'gray',
    [CONSENT_STATUS.EXPIRED]: 'orange',
  };
  return colorMap[status] || 'gray';
};

/**
 * Get Mantine Badge label for consent status
 * @param {string} status - Consent status from CONSENT_STATUS enum
 * @returns {string} Human-readable label
 */
export const getConsentStatusLabel = (status) => {
  const labelMap = {
    [CONSENT_STATUS.PENDING]: 'Pending',
    [CONSENT_STATUS.APPROVED]: 'Approved',
    [CONSENT_STATUS.REJECTED]: 'Rejected',
    [CONSENT_STATUS.REVOKED]: 'Revoked',
    [CONSENT_STATUS.EXPIRED]: 'Expired',
  };
  return labelMap[status] || status;
};
