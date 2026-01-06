import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Group,
  Alert,
  Loader,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { ROLES, REFERRAL_TYPES } from '@arogyafirst/shared';

/**
 * ReferralModal Component
 * 
 * Reusable modal for creating referrals.
 * Dynamically loads target providers based on referral type.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Object} sourceUser - Source user object (current user)
 * @param {Function} onSuccess - Success callback after referral creation
 */
export const ReferralModal = ({ opened, onClose, sourceUser, onSuccess }) => {
  const { fetchData } = useAuthFetch();
  const modalRef = useFocusTrap(opened);
  
  // Form state
  const [referralType, setReferralType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  
  // UI state
  const [targetOptions, setTargetOptions] = useState([]);
  const [patientOptions, setPatientOptions] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  // Get referral type options based on source role
  const getReferralTypeOptions = () => {
    if (!sourceUser) return [];
    
    const options = [];
    switch (sourceUser.role) {
      case ROLES.HOSPITAL:
        options.push({ value: REFERRAL_TYPES.INTER_DEPARTMENTAL, label: 'Inter-Departmental' });
        break;
      case ROLES.DOCTOR:
        options.push({ value: REFERRAL_TYPES.DOCTOR_TO_DOCTOR, label: 'Doctor to Specialist' });
        options.push({ value: REFERRAL_TYPES.DOCTOR_TO_PHARMACY, label: 'Doctor to Pharmacy' });
        break;
      case ROLES.LAB:
        options.push({ value: REFERRAL_TYPES.LAB_TO_LAB, label: 'Lab to Lab' });
        break;
      default:
        break;
    }
    
    // Ensure all options have value property
    return options.filter(opt => opt.value && opt.value.trim());
  };
  
  // Load target providers based on referral type
  useEffect(() => {
    if (!referralType) {
      setTargetOptions([]);
      setTargetId('');
      return;
    }
    
    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        let targets = [];
        let role = '';
        
        if (referralType === REFERRAL_TYPES.INTER_DEPARTMENTAL) {
          // For inter-departmental, load actual doctor users (not embedded)
          role = ROLES.DOCTOR;
        } else if (referralType === REFERRAL_TYPES.DOCTOR_TO_DOCTOR) {
          role = ROLES.DOCTOR;
        } else if (referralType === REFERRAL_TYPES.DOCTOR_TO_PHARMACY) {
          role = ROLES.PHARMACY;
        } else if (referralType === REFERRAL_TYPES.LAB_TO_LAB) {
          role = ROLES.LAB;
        }
        
        if (role) {
          const data = await fetchData(`/api/providers/by-role?role=${role}`);
          const providers = data?.data || data || [];
          targets = providers
            .filter(p => p._id?.toString() !== sourceUser._id?.toString()) // Exclude self
            .map(provider => ({
              value: provider._id?.toString() || '',
              label: provider.location ? `${provider.name} - ${provider.location}` : provider.name
            }))
            .filter(t => t.value); // Remove any with empty values
        }
        
        setTargetOptions(targets);
      } catch (error) {
        console.error('Error loading targets:', error);
        showErrorNotification('Failed to load target providers');
        setTargetOptions([]);
      } finally {
        setLoadingTargets(false);
      }
    };
    
    loadTargets();
  }, [referralType, sourceUser, fetchData]);
  
  // Load recent patients (from bookings or search)
  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        // Fetch all patients for selection
        const data = await fetchData('/api/patients/search?limit=100');
        const patients = data?.data || data || [];
        
        const patientOptions = patients
          .map(patient => ({
            value: patient._id?.toString() || '',
            label: `${patient.name} - ${patient.phone || patient.email || 'N/A'}`
          }))
          .filter(p => p.value); // Remove any with empty values
        
        setPatientOptions(patientOptions);
      } catch (error) {
        console.error('Error loading patients:', error);
        showErrorNotification('Failed to load patients');
        setPatientOptions([]);
      } finally {
        setLoadingPatients(false);
      }
    };
    
    if (opened) {
      loadPatients();
    }
  }, [opened, fetchData]);
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    setSubmitError(null);
    
    if (!referralType) {
      const msg = 'Please select a referral type';
      setSubmitError(msg);
      showErrorNotification(msg);
      return;
    }
    if (!targetId) {
      const msg = 'Please select a target provider';
      setSubmitError(msg);
      showErrorNotification(msg);
      return;
    }
    if (!patientId) {
      const msg = 'Please select a patient';
      setSubmitError(msg);
      showErrorNotification(msg);
      return;
    }
    if (reason.trim().length < 10) {
      const msg = 'Reason must be at least 10 characters';
      setSubmitError(msg);
      showErrorNotification(msg);
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[ReferralModal] Submitting:', { targetId, patientId, referralType, reason, priority });
      const response = await fetchData('/api/referrals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          patientId,
          referralType,
          reason: reason.trim(),
          notes: notes.trim(),
          priority,
        }),
      });
      
      console.log('[ReferralModal] Response:', response);
      showSuccessNotification('Referral created successfully');
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to create referral';
      console.error('[ReferralModal] Error:', errorMsg, error);
      setSubmitError(errorMsg);
      showErrorNotification(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setReferralType('');
    setTargetId('');
    setPatientId('');
    setReason('');
    setNotes('');
    setPriority('MEDIUM');
    setSubmitError(null);
  };
  
  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];
  
  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Create Referral"
      size="lg"
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-modal-title"
      aria-describedby="referral-modal-description"
    >
      <Stack>
        {submitError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {submitError}
          </Alert>
        )}
        
        <Select
          label="Referral Type"
          placeholder="Select referral type"
          data={getReferralTypeOptions() || []}
          value={referralType}
          onChange={setReferralType}
          required
          aria-label="Referral type (required)"
        />
        
        <Select
          label="Target Provider"
          placeholder={loadingTargets ? "Loading providers..." : "Select target provider"}
          data={targetOptions || []}
          value={targetId}
          onChange={setTargetId}
          disabled={!referralType || loadingTargets}
          searchable
          required
          rightSection={loadingTargets ? <Loader size="xs" /> : null}
          aria-label="Target provider (required)"
        />
        
        <Select
          label="Patient"
          placeholder={loadingPatients ? "Loading patients..." : "Select patient"}
          data={patientOptions || []}
          value={patientId}
          onChange={setPatientId}
          searchable
          required
          rightSection={loadingPatients ? <Loader size="xs" /> : null}
          aria-label="Patient (required)"
        />
        
        <Select
          label="Priority"
          placeholder="Select priority level"
          data={priorityOptions || []}
          value={priority}
          onChange={setPriority}
          required
        />
        
        <Textarea
          label="Reason for Referral"
          placeholder="Describe the reason for this referral..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minRows={3}
          maxRows={6}
          required
          description={`${reason.length}/1000 characters (min 10)`}
          error={reason.length > 0 && reason.length < 10 ? 'Minimum 10 characters required' : null}
        />
        
        <Textarea
          label="Additional Notes"
          placeholder="Any additional information..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          minRows={2}
          maxRows={4}
          description={`${notes.length}/500 characters`}
          error={notes.length > 500 ? 'Maximum 500 characters allowed' : null}
        />
        
        {!targetOptions.length && referralType && !loadingTargets && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            No target providers found for this referral type.
          </Alert>
        )}
        
        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={handleClose} aria-label="Cancel referral creation">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!referralType || !targetId || !patientId || reason.length < 10 || notes.length > 500}
            aria-label={submitting ? 'Creating referral, please wait' : 'Create referral'}
          >
            Create Referral
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ReferralModal;
