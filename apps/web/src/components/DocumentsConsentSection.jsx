import React from 'react';
import {
  Stack,
  Alert,
  Text,
  Table,
  Badge,
  Group,
  Button,
} from '@mantine/core';
import {
  IconShieldCheck,
  IconCheck,
  IconX,
  IconBan,
} from '@tabler/icons-react';
import { CONSENT_STATUS } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';
import { getConsentStatusColor } from '../utils/consentHelpers';

/**
 * DocumentsConsentSection
 * 
 * Presentational component for displaying consent requests table.
 * Extracted from DocumentsPage to isolate consent management UI.
 * 
 * @param {Array} consents - Array of consent objects
 * @param {boolean} loading - Loading state
 * @param {Function} onApprove - Callback when approve is clicked
 * @param {Function} onReject - Callback when reject is clicked
 * @param {Function} onRevoke - Callback when revoke is clicked
 */
export function DocumentsConsentSection({ 
  consents, 
  loading, 
  onApprove, 
  onReject, 
  onRevoke 
}) {
  const getConsentStatusBadge = (status) => {
    return <Badge color={getConsentStatusColor(status)} variant="light">{status}</Badge>;
  };

  return (
    <Stack gap="lg">
      <Alert icon={<IconShieldCheck size={16} />} color="blue" variant="light">
        <Text size="sm">
          Manage consent requests from healthcare providers who want to access your medical documents.
          You can approve, reject, or revoke access at any time.
        </Text>
      </Alert>

      {loading ? (
        <Text ta="center" py="xl">Loading consent requests...</Text>
      ) : consents.length === 0 ? (
        <Alert color="blue">
          No consent requests found.
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Requester</Table.Th>
              <Table.Th>Purpose</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Requested</Table.Th>
              <Table.Th>Expires</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {consents.map((consent) => (
              <Table.Tr key={consent.consentId}>
                <Table.Td>
                  <div>
                    <Text fw={500}>{consent.requesterId?.name || 'Unknown'}</Text>
                    <Badge size="xs" variant="outline">
                      {consent.requesterRole}
                    </Badge>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" lineClamp={2}>{consent.purpose}</Text>
                </Table.Td>
                <Table.Td>{getConsentStatusBadge(consent.status)}</Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDateForDisplay(consent.requestedAt)}</Text>
                </Table.Td>
                <Table.Td>
                  {consent.expiresAt ? (
                    <Text size="sm">{formatDateForDisplay(consent.expiresAt)}</Text>
                  ) : (
                    <Text size="sm" c="dimmed">Never</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {consent.status === CONSENT_STATUS.PENDING && (
                    <Group gap="xs">
                      <Button
                        size="xs"
                        color="green"
                        leftSection={<IconCheck size={14} />}
                        onClick={() => onApprove(consent)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        leftSection={<IconX size={14} />}
                        onClick={() => onReject(consent)}
                      >
                        Reject
                      </Button>
                    </Group>
                  )}
                  {consent.status === CONSENT_STATUS.APPROVED && (
                    <Button
                      size="xs"
                      color="orange"
                      leftSection={<IconBan size={14} />}
                      onClick={() => onRevoke(consent)}
                    >
                      Revoke
                    </Button>
                  )}
                  {(consent.status === CONSENT_STATUS.REJECTED || 
                    consent.status === CONSENT_STATUS.REVOKED || 
                    consent.status === CONSENT_STATUS.EXPIRED) && (
                    <Text size="sm" c="dimmed">-</Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
