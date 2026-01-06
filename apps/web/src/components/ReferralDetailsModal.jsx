import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Divider,
  Textarea,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { REFERRAL_STATUS, REFERRAL_TYPES, formatDateForDisplay } from '@arogyafirst/shared';

/**
 * ReferralDetailsModal Component
 * 
 * Modal for viewing and managing referral details.
 * Provides action buttons based on user role and referral status.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Object} referral - Referral object to display
 * @param {string} userRole - Current user's role
 * @param {string} userId - Current user's ID
 * @param {Function} onUpdate - Callback after referral update
 */
export const ReferralDetailsModal = ({
  opened,
  onClose,
  referral,
  userRole,
  userId,
  onUpdate,
}) => {
  const { fetchData } = useAuthFetch();
  
  // Action state
  const [showAction, setShowAction] = useState(null); // 'accept', 'reject', 'cancel', 'complete'
  const [actionInput, setActionInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (!referral) return null;
  
  // Check if user is source or target
  const isSource = referral.sourceId?._id === userId || referral.sourceId === userId;
  const isTarget = referral.targetId?._id === userId || referral.targetId === userId;
  
  // Get status badge color
  const getStatusColor = (status) => {
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
  
  // Get priority badge color
  const getPriorityColor = (priority) => {
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
  
  // Get referral type label
  const getTypeLabel = (type) => {
    switch (type) {
      case REFERRAL_TYPES.INTER_DEPARTMENTAL:
        return 'Inter-Departmental';
      case REFERRAL_TYPES.DOCTOR_TO_DOCTOR:
        return 'Doctor to Specialist';
      case REFERRAL_TYPES.DOCTOR_TO_PHARMACY:
        return 'Doctor to Pharmacy';
      case REFERRAL_TYPES.LAB_TO_LAB:
        return 'Lab to Lab';
      default:
        return type;
    }
  };
  
  // Handle accept action
  const handleAccept = async () => {
    setLoading(true);
    try {
      await fetchData(`/api/referrals/${referral._id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionInput.trim() }),
      });
      
      showSuccessNotification('Referral accepted successfully');
      setShowAction(null);
      setActionInput('');
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to accept referral');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle reject action
  const handleReject = async () => {
    if (actionInput.trim().length < 10) {
      showErrorNotification('Rejection reason must be at least 10 characters');
      return;
    }
    
    setLoading(true);
    try {
      await fetchData(`/api/referrals/${referral._id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: actionInput.trim() }),
      });
      
      showSuccessNotification('Referral rejected');
      setShowAction(null);
      setActionInput('');
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to reject referral');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle complete action
  const handleComplete = async () => {
    setLoading(true);
    try {
      await fetchData(`/api/referrals/${referral._id}/complete`, {
        method: 'PUT',
      });
      
      showSuccessNotification('Referral completed successfully');
      setShowAction(null);
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to complete referral');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel action
  const handleCancel = async () => {
    setLoading(true);
    try {
      await fetchData(`/api/referrals/${referral._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: actionInput.trim() }),
      });
      
      showSuccessNotification('Referral cancelled');
      setShowAction(null);
      setActionInput('');
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to cancel referral');
    } finally {
      setLoading(false);
    }
  };
  
  // Render action buttons
  const renderActions = () => {
    if (showAction) {
      return (
        <Stack>
          {showAction === 'reject' && (
            <Textarea
              label="Rejection Reason"
              placeholder="Please provide a reason for rejection (min 10 characters)"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              minRows={3}
              required
              description={`${actionInput.length}/500 characters (min 10)`}
            />
          )}
          
          {showAction === 'accept' && (
            <Textarea
              label="Notes (Optional)"
              placeholder="Add any notes regarding acceptance..."
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              minRows={2}
              description={`${actionInput.length}/500 characters`}
            />
          )}
          
          {showAction === 'cancel' && (
            <Textarea
              label="Cancellation Reason (Optional)"
              placeholder="Provide a reason for cancellation..."
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              minRows={2}
              description={`${actionInput.length}/500 characters`}
            />
          )}
          
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => {
              setShowAction(null);
              setActionInput('');
            }}>
              Back
            </Button>
            <Button
              color={showAction === 'reject' || showAction === 'cancel' ? 'red' : 'green'}
              onClick={() => {
                if (showAction === 'accept') handleAccept();
                else if (showAction === 'reject') handleReject();
                else if (showAction === 'cancel') handleCancel();
                else if (showAction === 'complete') handleComplete();
              }}
              loading={loading}
            >
              Confirm {showAction.charAt(0).toUpperCase() + showAction.slice(1)}
            </Button>
          </Group>
        </Stack>
      );
    }
    
    const actions = [];
    
    // Target user actions
    if (isTarget && referral.status === REFERRAL_STATUS.PENDING) {
      actions.push(
        <Button
          key="accept"
          color="green"
          onClick={() => setShowAction('accept')}
        >
          Accept
        </Button>
      );
      actions.push(
        <Button
          key="reject"
          color="red"
          onClick={() => setShowAction('reject')}
        >
          Reject
        </Button>
      );
    }
    
    if (isTarget && referral.status === REFERRAL_STATUS.ACCEPTED) {
      actions.push(
        <Button
          key="complete"
          color="green"
          onClick={handleComplete}
          loading={loading}
        >
          Complete
        </Button>
      );
    }
    
    // Source user actions
    if (isSource && [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.ACCEPTED].includes(referral.status)) {
      actions.push(
        <Button
          key="cancel"
          color="red"
          variant="outline"
          onClick={() => setShowAction('cancel')}
        >
          Cancel Referral
        </Button>
      );
    }
    
    return actions.length > 0 ? (
      <Group justify="flex-end" mt="md">
        {actions}
      </Group>
    ) : null;
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Referral Details"
      size="lg"
    >
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Text size="xl" fw={700}>{referral.referralId}</Text>
          <Group>
            <Badge color={getStatusColor(referral.status)} size="lg">
              {referral.status}
            </Badge>
            <Badge color={getPriorityColor(referral.priority)} size="lg">
              {referral.priority}
            </Badge>
          </Group>
        </Group>
        
        <Badge color="blue" variant="light" size="md" w="fit-content">
          {getTypeLabel(referral.referralType)}
        </Badge>
        
        <Divider />
        
        {/* Source Information */}
        <Stack gap="xs">
          <Text fw={600}>Source Entity</Text>
          <Text>Name: {referral.sourceSnapshot?.name || referral.sourceId?.name || 'N/A'}</Text>
          <Text>Role: {referral.sourceSnapshot?.role || referral.sourceId?.role || 'N/A'}</Text>
          {referral.sourceSnapshot?.specialization && (
            <Text>Specialization: {referral.sourceSnapshot.specialization}</Text>
          )}
          {referral.sourceSnapshot?.location && (
            <Text>Location: {referral.sourceSnapshot.location}</Text>
          )}
        </Stack>
        
        <Divider />
        
        {/* Target Information */}
        <Stack gap="xs">
          <Text fw={600}>Target Entity</Text>
          <Text>Name: {referral.targetSnapshot?.name || referral.targetId?.name || 'N/A'}</Text>
          <Text>Role: {referral.targetSnapshot?.role || referral.targetId?.role || 'N/A'}</Text>
          {referral.targetSnapshot?.specialization && (
            <Text>Specialization: {referral.targetSnapshot.specialization}</Text>
          )}
          {referral.targetSnapshot?.location && (
            <Text>Location: {referral.targetSnapshot.location}</Text>
          )}
        </Stack>
        
        <Divider />
        
        {/* Patient Information */}
        <Stack gap="xs">
          <Text fw={600}>Patient</Text>
          <Text>Name: {referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}</Text>
          <Text>Phone: {referral.patientSnapshot?.phone || referral.patientId?.phone || 'N/A'}</Text>
          <Text>Email: {referral.patientSnapshot?.email || referral.patientId?.email || 'N/A'}</Text>
        </Stack>
        
        <Divider />
        
        {/* Referral Details */}
        <Stack gap="xs">
          <Text fw={600}>Referral Information</Text>
          <Text>Created: {formatDateForDisplay(referral.createdAt)}</Text>
          
          {referral.acceptedAt && (
            <Text c="blue">Accepted: {formatDateForDisplay(referral.acceptedAt)}</Text>
          )}
          
          {referral.completedAt && (
            <Text c="green">Completed: {formatDateForDisplay(referral.completedAt)}</Text>
          )}
          
          {referral.rejectedAt && (
            <Text c="red">Rejected: {formatDateForDisplay(referral.rejectedAt)}</Text>
          )}
          
          {referral.cancelledAt && (
            <Text c="gray">Cancelled: {formatDateForDisplay(referral.cancelledAt)}</Text>
          )}
        </Stack>
        
        <Divider />
        
        {/* Reason */}
        <Stack gap="xs">
          <Text fw={600}>Reason for Referral</Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{referral.reason}</Text>
        </Stack>
        
        {/* Notes */}
        {referral.notes && (
          <>
            <Divider />
            <Stack gap="xs">
              <Text fw={600}>Additional Notes</Text>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{referral.notes}</Text>
            </Stack>
          </>
        )}
        
        {/* Rejection Reason */}
        {referral.rejectionReason && (
          <>
            <Divider />
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Rejection Reason">
              {referral.rejectionReason}
            </Alert>
          </>
        )}
        
        {/* Cancellation Reason */}
        {referral.cancellationReason && (
          <>
            <Divider />
            <Alert icon={<IconAlertCircle size={16} />} color="gray" title="Cancellation Reason">
              {referral.cancellationReason}
            </Alert>
          </>
        )}
        
        {/* Action Buttons */}
        {renderActions()}
      </Stack>
    </Modal>
  );
};

export default ReferralDetailsModal;
