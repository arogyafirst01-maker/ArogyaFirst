import { REFERRAL_STATUS } from '@arogyafirst/shared';

/**
 * Get status badge color for referrals
 */
export const getReferralStatusColor = (status) => {
  switch (status) {
    case REFERRAL_STATUS.PENDING:
      return 'yellow';
    case REFERRAL_STATUS.ACCEPTED:
      return 'blue';
    case REFERRAL_STATUS.COMPLETED:
      return 'green';
    case REFERRAL_STATUS.REJECTED:
      return 'red';
    case REFERRAL_STATUS.CANCELLED:
      return 'gray';
    default:
      return 'gray';
  }
};

/**
 * Get priority badge color for referrals
 */
export const getReferralPriorityColor = (priority) => {
  switch (priority) {
    case 'LOW':
      return 'gray';
    case 'MEDIUM':
      return 'blue';
    case 'HIGH':
      return 'orange';
    case 'URGENT':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Get referral type display label
 */
export const getReferralTypeLabel = (type) => {
  const labels = {
    'INTER_DEPARTMENTAL': 'Inter-Dept',
    'DOCTOR_TO_DOCTOR': 'To Specialist',
    'DOCTOR_TO_PHARMACY': 'To Pharmacy',
    'LAB_TO_LAB': 'Lab to Lab',
  };
  return labels[type] || type;
};
