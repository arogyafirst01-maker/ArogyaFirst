import React from 'react';
import {
  Modal,
  Stack,
  Alert,
  Text,
  Textarea,
  Group,
  Button,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconClock } from '@tabler/icons-react';

/**
 * ConsentActionModal
 * 
 * Presentational component for consent action modal (approve/reject/revoke).
 * Extracted from DocumentsPage to isolate consent action UI.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close callback
 * @param {Object} consent - Selected consent object
 * @param {string} actionType - Action type: 'approve', 'reject', or 'revoke'
 * @param {Date} expiryDate - Expiry date for approval
 * @param {Function} onExpiryDateChange - Callback for expiry date change
 * @param {string} notes - Notes text
 * @param {Function} onNotesChange - Callback for notes change
 * @param {Function} onSubmit - Submit callback
 */
export function ConsentActionModal({
  opened,
  onClose,
  consent,
  actionType,
  expiryDate,
  onExpiryDateChange,
  notes,
  onNotesChange,
  onSubmit,
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`${actionType?.charAt(0).toUpperCase() + actionType?.slice(1)} Consent`}
    >
      <Stack>
        {consent && (
          <Alert color="blue" variant="light">
            <Text size="sm">
              <strong>Requester:</strong> {consent.requesterId?.name}
            </Text>
            <Text size="sm">
              <strong>Purpose:</strong> {consent.purpose}
            </Text>
          </Alert>
        )}

        {actionType === 'approve' && (
          <DateTimePicker
            label="Expiry Date (Optional)"
            placeholder="Select expiry date"
            value={expiryDate}
            onChange={onExpiryDateChange}
            minDate={new Date()}
            description="Leave empty for no expiry"
            leftSection={<IconClock size={16} />}
          />
        )}

        <Textarea
          label="Notes (Optional)"
          placeholder="Add any notes..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          minRows={3}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color={actionType === 'approve' ? 'green' : actionType === 'reject' ? 'red' : 'orange'}
            onClick={onSubmit}
          >
            {actionType?.charAt(0).toUpperCase() + actionType?.slice(1)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
