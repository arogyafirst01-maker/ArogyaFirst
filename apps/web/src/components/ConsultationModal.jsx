import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Select,
  Textarea,
  Button,
  Alert,
  Group,
  Text,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import {
  IconAlertCircle,
  IconVideo,
  IconMessage,
  IconUser,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authFetch } from '../utils/authFetch';
import { CONSULTATION_MODE } from '@arogyafirst/shared';

const ConsultationModal = ({ opened, onClose, patientId, onSuccess }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '');
  const [mode, setMode] = useState(CONSULTATION_MODE.VIDEO_CALL);
  const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 30 * 60 * 1000)); // Default: +30 minutes
  const [initialNotes, setInitialNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (opened && !patientId) {
      fetchPatients();
    }
  }, [opened, patientId]);

  const fetchPatients = async () => {
    try {
      const response = await authFetch('/api/doctors/me/patients?limit=100');
      if (response.ok) {
        const data = await response.json();
        setPatients(
          data.data.patients.map((p) => ({
            value: p._id,
            label: p.name,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedPatientId) {
      setError('Please select a patient');
      return;
    }

    if (!mode) {
      setError('Please select a consultation mode');
      return;
    }

    if (!scheduledAt || scheduledAt <= new Date()) {
      setError('Scheduled time must be in the future');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authFetch('/api/consultations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          mode,
          scheduledAt: scheduledAt.toISOString(),
          notes: initialNotes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'Success',
          message: 'Consultation scheduled successfully',
          color: 'green',
        });

        // Reset form
        setSelectedPatientId(patientId || '');
        setMode(CONSULTATION_MODE.VIDEO_CALL);
        setScheduledAt(new Date(Date.now() + 30 * 60 * 1000));
        setInitialNotes('');

        if (onSuccess) {
          onSuccess(data.data);
        }

        onClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to schedule consultation');
      }
    } catch (err) {
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: err.message,
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  };

  const modeOptions = [
    {
      value: CONSULTATION_MODE.VIDEO_CALL,
      label: 'Video Call',
      icon: <IconVideo size={16} />,
    },
    {
      value: CONSULTATION_MODE.CHAT,
      label: 'Chat',
      icon: <IconMessage size={16} />,
    },
    {
      value: CONSULTATION_MODE.IN_PERSON,
      label: 'In-Person',
      icon: <IconUser size={16} />,
    },
  ];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Schedule Consultation"
      size="md"
      centered
    >
      <Stack gap="md">
        {error && (
          <Alert icon={<IconAlertCircle />} color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {!patientId && (
          <Select
            label="Patient"
            placeholder="Select a patient"
            value={selectedPatientId}
            onChange={setSelectedPatientId}
            data={patients}
            searchable
            required
            leftSection={<IconUser size={16} />}
          />
        )}

        <Select
          label="Consultation Mode"
          placeholder="Select consultation mode"
          value={mode}
          onChange={setMode}
          data={modeOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          required
        />

        {mode && (
          <Group gap="xs" mt={-8}>
            {modeOptions.find((opt) => opt.value === mode)?.icon}
            <Text size="xs" c="dimmed">
              {mode === CONSULTATION_MODE.VIDEO_CALL && 'Video consultation with Agora SDK'}
              {mode === CONSULTATION_MODE.CHAT && 'Text-based consultation'}
              {mode === CONSULTATION_MODE.IN_PERSON && 'Face-to-face consultation'}
            </Text>
          </Group>
        )}

        <DateTimePicker
          label="Scheduled Time"
          placeholder="Select date and time"
          value={scheduledAt}
          onChange={setScheduledAt}
          minDate={new Date()}
          required
          valueFormat="DD MMM YYYY hh:mm A"
        />

        <Textarea
          label="Initial Notes (Optional)"
          placeholder="Add any initial notes or instructions..."
          value={initialNotes}
          onChange={(e) => setInitialNotes(e.target.value)}
          minRows={3}
          maxLength={500}
        />

        <Text size="xs" c="dimmed" ta="right">
          {initialNotes.length}/500 characters
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Schedule Consultation
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ConsultationModal;
