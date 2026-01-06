import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Button,
  Alert,
  Table,
  Tabs,
  Textarea,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconBan,
  IconClock,
} from '@tabler/icons-react';
import { DateTimePicker } from '@mantine/dates';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import useRole from '../hooks/useRole.js';
import { CONSENT_STATUS, ROLES } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';

/**
 * ConsentRequestModal
 * 
 * Modal for managing consent requests.
 * Patients can view, approve, reject, and revoke consents.
 * Providers can view their sent consent requests.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 */
export const ConsentRequestModal = ({ opened, onClose }) => {
  const { user } = useAuth();
  const { fetchData } = useAuthFetch();
  const { isPatient, hasRole } = useRole();

  const isProvider = hasRole([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]);
  const [activeTab, setActiveTab] = useState(isPatient ? 'received' : 'sent');
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [actionModalOpened, setActionModalOpened] = useState(false);
  
  const modalRef = useFocusTrap(opened);
  const actionModalRef = useFocusTrap(actionModalOpened);
  const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'revoke'
  const [expiryDate, setExpiryDate] = useState(null);
  const [notes, setNotes] = useState('');

  // Load consents
  const loadConsents = async () => {
    setLoading(true);
    setError(null);

    try {
      let url;
      if (activeTab === 'received' && isPatient) {
        url = `/api/consent/patient/${user._id}`;
      } else if (activeTab === 'sent' && isProvider) {
        url = `/api/consent/provider/${user._id}`;
      } else {
        setConsents([]);
        setLoading(false);
        return;
      }

      const res = await fetchData(url);
      setConsents(res.data?.consents || []);
    } catch (err) {
      console.error('Error loading consents:', err);
      setError('Failed to load consent requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened && user?._id) {
      loadConsents();
    }
  }, [opened, user?._id, activeTab]);

  // Handle action (approve, reject, revoke)
  const handleAction = async () => {
    if (!selectedConsent || !actionType) return;

    setActionLoading(actionType);
    try {
      let url = `/api/consent/${selectedConsent.consentId}/${actionType}`;
      const body = { notes };

      if (actionType === 'approve' && expiryDate) {
        body.expiresAt = expiryDate.toISOString();
      }

      await fetchData(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      showSuccessNotification('Success', `Consent ${actionType}d successfully`);
      setActionModalOpened(false);
      setSelectedConsent(null);
      setActionType(null);
      setNotes('');
      setExpiryDate(null);
      loadConsents();
    } catch (err) {
      console.error(`Error ${actionType}ing consent:`, err);
      showErrorNotification('Error', `Failed to ${actionType} consent`);
    } finally {
      setActionLoading(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const config = {
      [CONSENT_STATUS.PENDING]: { color: 'yellow', label: 'Pending' },
      [CONSENT_STATUS.APPROVED]: { color: 'green', label: 'Approved' },
      [CONSENT_STATUS.REJECTED]: { color: 'red', label: 'Rejected' },
      [CONSENT_STATUS.REVOKED]: { color: 'gray', label: 'Revoked' },
      [CONSENT_STATUS.EXPIRED]: { color: 'orange', label: 'Expired' },
    };
    const { color, label } = config[status] || { color: 'gray', label: status };
    return <Badge color={color} variant="light">{label}</Badge>;
  };

  // Open action modal
  const openActionModal = (consent, type) => {
    setSelectedConsent(consent);
    setActionType(type);
    setActionModalOpened(true);
    setNotes('');
    setExpiryDate(null);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Consent Requests"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-requests-modal-title"
        aria-describedby="consent-requests-modal-description"
        size="xl"
        padding="lg"
      >
        <Stack>
          {/* Unified Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              {isPatient && <Tabs.Tab value="received">Received Requests</Tabs.Tab>}
              {isProvider && <Tabs.Tab value="sent">Sent Requests</Tabs.Tab>}
            </Tabs.List>
          </Tabs>

          {/* Error */}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
              {error}
            </Alert>
          )}

          {/* Consents Table */}
          {loading ? (
            <Text ta="center" py="xl">Loading...</Text>
          ) : consents.length === 0 ? (
            <Alert color="blue">
              No consent requests found.
            </Alert>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{activeTab === 'received' ? 'Requester' : 'Patient'}</Table.Th>
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
                        <Text fw={500}>
                          {activeTab === 'received' 
                            ? (consent.requesterId?.name || 'Unknown')
                            : (consent.patientId?.name || 'Unknown')
                          }
                        </Text>
                        <Badge size="xs" variant="outline">
                          {activeTab === 'received' ? consent.requesterRole : 'PATIENT'}
                        </Badge>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>{consent.purpose}</Text>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(consent.status)}</Table.Td>
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
                      {isPatient && consent.status === CONSENT_STATUS.PENDING && (
                        <Group gap="xs">
                          <Button
                            size="xs"
                            color="green"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => openActionModal(consent, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            leftSection={<IconX size={14} />}
                            onClick={() => openActionModal(consent, 'reject')}
                          >
                            Reject
                          </Button>
                        </Group>
                      )}
                      {isPatient && consent.status === CONSENT_STATUS.APPROVED && (
                        <Button
                          size="xs"
                          color="orange"
                          leftSection={<IconBan size={14} />}
                          onClick={() => openActionModal(consent, 'revoke')}
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
      </Modal>

      {/* Action Modal */}
      <Modal
        opened={actionModalOpened}
        onClose={() => {
          setActionModalOpened(false);
          setSelectedConsent(null);
          setActionType(null);
          setNotes('');
          setExpiryDate(null);
        }}
        title={`${actionType?.charAt(0).toUpperCase() + actionType?.slice(1)} Consent`}
        ref={actionModalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-action-modal-title"
        aria-describedby="consent-action-modal-description"
      >
        <Stack>
          {selectedConsent && (
            <Alert color="blue" variant="light">
              <Text size="sm">
                <strong>Requester:</strong> {selectedConsent.requesterId?.name}
              </Text>
              <Text size="sm">
                <strong>Purpose:</strong> {selectedConsent.purpose}
              </Text>
            </Alert>
          )}

          {actionType === 'approve' && (
            <DateTimePicker
              label="Expiry Date (Optional)"
              placeholder="Select expiry date"
              value={expiryDate}
              onChange={setExpiryDate}
              minDate={new Date()}
              description="Leave empty for no expiry"
              leftSection={<IconClock size={16} />}
            />
          )}

          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            minRows={3}
          />

          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setActionModalOpened(false);
                setSelectedConsent(null);
                setActionType(null);
                setNotes('');
                setExpiryDate(null);
              }}
              aria-label="Cancel consent action"
            >
              Cancel
            </Button>
            <Button
              color={actionType === 'approve' ? 'green' : actionType === 'reject' ? 'red' : 'orange'}
              onClick={handleAction}
              loading={actionLoading === actionType}
              aria-label={actionLoading === actionType ? `Processing consent ${actionType}, please wait` : `${actionType?.charAt(0).toUpperCase() + actionType?.slice(1)} consent`}
            >
              {actionType?.charAt(0).toUpperCase() + actionType?.slice(1)}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
