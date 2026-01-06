import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Alert,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconShieldCheck } from '@tabler/icons-react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';

/**
 * ProviderConsentRequestModal
 * 
 * Modal for providers to request consent from patients to access their documents.
 * Sends POST request to /api/consent/request with patientId and purpose.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {string} patientId - Patient ID for consent request
 * @param {string} patientName - Optional patient name for display
 * @param {Function} onSuccess - Optional callback after successful consent request
 */
export const ProviderConsentRequestModal = ({ 
  opened, 
  onClose, 
  patientId, 
  patientName = '',
  onSuccess 
}) => {
  const { fetchData } = useAuthFetch();
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (!loading) {
      setPurpose('');
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async () => {
    // Validate purpose
    if (!purpose || purpose.trim().length < 10) {
      setError('Purpose must be at least 10 characters long');
      return;
    }

    if (!patientId || !patientId.match(/^[0-9a-fA-F]{24}$/)) {
      setError('Invalid patient ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchData('/api/consent/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          purpose: purpose.trim(),
        }),
      });

      showSuccessNotification('Success', res.message || 'Consent request sent successfully');
      setPurpose('');
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error requesting consent:', err);
      setError(err.message || 'Failed to send consent request');
      showErrorNotification('Error', err.message || 'Failed to send consent request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Request Patient Consent"
      size="md"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack>
        <Alert icon={<IconShieldCheck size={16} />} color="blue" variant="light">
          <Text size="sm">
            Request consent from the patient to access and manage their medical documents.
            The patient will be able to approve or reject this request.
          </Text>
        </Alert>

        {patientName && (
          <TextInput
            label="Patient"
            value={patientName}
            disabled
            description={`Patient ID: ${patientId}`}
          />
        )}

        {!patientName && (
          <TextInput
            label="Patient ID"
            value={patientId}
            disabled
          />
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Textarea
          label="Purpose"
          placeholder="Enter the purpose for requesting access (minimum 10 characters)"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          disabled={loading}
          required
          minRows={4}
          description="Explain why you need access to this patient's medical documents"
          error={purpose && purpose.trim().length < 10 ? 'Purpose must be at least 10 characters long' : null}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            leftSection={<IconShieldCheck size={16} />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!purpose || purpose.trim().length < 10 || !patientId}
          >
            Send Request
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
