import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Button,
  Stack,
  Group,
  Table,
  Badge,
  ActionIcon,
  Loader,
  Alert,
  Tabs,
  Select,
  Indicator,
  Text,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconCheck,
  IconX,
  IconBan,
} from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import useRole from '../hooks/useRole.js';
import {
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
} from '../utils/notifications.js';
import { ROLES, REFERRAL_STATUS, REFERRAL_TYPES, formatDateForDisplay } from '@arogyafirst/shared';
import { ReferralModal } from '../components/ReferralModal';
import { ReferralDetailsModal } from '../components/ReferralDetailsModal';

export default function ReferralsPage() {
  const { user } = useAuth();
  const { fetchData } = useAuthFetch();
  const { hasRole } = useRole();
  
  const canCreateReferrals = hasRole([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]);
  
  // State
  const [activeTab, setActiveTab] = useState('sent');
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  
  // Pending counts
  const [pendingSentCount, setPendingSentCount] = useState(0);
  const [pendingReceivedCount, setPendingReceivedCount] = useState(0);
  
  // Load referrals
  const loadReferrals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      if (filterStatus) {
        queryParams.append('status', filterStatus);
      }
      if (filterType) {
        queryParams.append('referralType', filterType);
      }
      if (startDate) {
        queryParams.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        queryParams.append('endDate', endDate.toISOString());
      }
      
      const endpoint = activeTab === 'sent'
        ? `/api/referrals/source/${user._id}?${queryParams.toString()}`
        : `/api/referrals/target/${user._id}?${queryParams.toString()}`;
      
      const data = await fetchData(endpoint);
      setReferrals(data?.data || data || []);
    } catch (err) {
      console.error('Error loading referrals:', err);
      setError('Failed to load referrals');
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load pending counts
  const loadPendingCounts = async () => {
    try {
      if (canCreateReferrals) {
        const sentData = await fetchData(`/api/referrals/source/${user._id}?status=${REFERRAL_STATUS.PENDING}`);
        setPendingSentCount(sentData?.data?.length || sentData?.length || 0);
      }
      
      const receivedData = await fetchData(`/api/referrals/target/${user._id}?status=${REFERRAL_STATUS.PENDING}`);
      setPendingReceivedCount(receivedData?.data?.length || receivedData?.length || 0);
    } catch (err) {
      console.error('Error loading pending counts:', err);
      setPendingSentCount(0);
      setPendingReceivedCount(0);
    }
  };
  
  // Load data on mount and when filters/tab change
  useEffect(() => {
    loadReferrals();
  }, [activeTab, filterStatus, filterType, startDate, endDate, user._id]);
  
  useEffect(() => {
    loadPendingCounts();
  }, [user._id]);
  
  // Show notification for pending referrals
  useEffect(() => {
    if (pendingReceivedCount > 0) {
      showInfoNotification(
        `You have ${pendingReceivedCount} pending referral${pendingReceivedCount > 1 ? 's' : ''} to review`,
        'Pending Referrals'
      );
    }
  }, [pendingReceivedCount]);
  
  // Handle referral created
  const handleReferralCreated = () => {
    loadReferrals();
    loadPendingCounts();
  };
  
  // Handle referral updated
  const handleReferralUpdated = () => {
    loadReferrals();
    loadPendingCounts();
  };
  
  // Open details modal
  const handleViewDetails = (referral) => {
    setSelectedReferral(referral);
    setDetailsModalOpen(true);
  };
  
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
  
  // Get type badge color
  const getTypeColor = (type) => {
    return 'blue';
  };
  
  // Get type label
  const getTypeLabel = (type) => {
    if (!type) return 'Unknown';
    
    switch (type) {
      case REFERRAL_TYPES.INTER_DEPARTMENTAL:
        return 'Inter-Dept';
      case REFERRAL_TYPES.DOCTOR_TO_DOCTOR:
        return 'Dr to Dr';
      case REFERRAL_TYPES.DOCTOR_TO_PHARMACY:
        return 'Dr to Pharmacy';
      case REFERRAL_TYPES.LAB_TO_LAB:
        return 'Lab to Lab';
      default:
        // If it's not a recognized type, return it as-is with better formatting
        if (typeof type === 'string') {
          // Convert DOCTOR_TO_DOCTOR -> Doctor to Doctor format
          return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        }
        return 'Unknown';
    }
  };
  
  // Check if user can perform actions
  const canAccept = (referral) => {
    return referral.targetId?._id === user._id && referral.status === REFERRAL_STATUS.PENDING;
  };
  
  const canComplete = (referral) => {
    return referral.targetId?._id === user._id && referral.status === REFERRAL_STATUS.ACCEPTED;
  };
  
  const canCancel = (referral) => {
    return referral.sourceId?._id === user._id && 
           [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.ACCEPTED].includes(referral.status);
  };
  
  // Quick actions
  const handleQuickAccept = async (referral) => {
    try {
      await fetchData(`/api/referrals/${referral._id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });
      showSuccessNotification('Referral accepted');
      loadReferrals();
      loadPendingCounts();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to accept referral');
    }
  };
  
  const handleQuickReject = async (referral) => {
    const reason = prompt('Enter rejection reason (min 10 characters):');
    if (!reason || reason.trim().length < 10) {
      showErrorNotification('Rejection reason must be at least 10 characters');
      return;
    }
    
    try {
      await fetchData(`/api/referrals/${referral._id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason.trim() }),
      });
      showSuccessNotification('Referral rejected');
      loadReferrals();
      loadPendingCounts();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to reject referral');
    }
  };
  
  const handleQuickComplete = async (referral) => {
    try {
      await fetchData(`/api/referrals/${referral._id}/complete`, {
        method: 'PUT',
      });
      showSuccessNotification('Referral completed');
      loadReferrals();
      loadPendingCounts();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to complete referral');
    }
  };
  
  const handleQuickCancel = async (referral) => {
    const reason = prompt('Enter cancellation reason (optional):');
    
    try {
      await fetchData(`/api/referrals/${referral._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: reason?.trim() || '' }),
      });
      showSuccessNotification('Referral cancelled');
      loadReferrals();
      loadPendingCounts();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to cancel referral');
    }
  };
  
  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: REFERRAL_STATUS.PENDING, label: 'Pending' },
    { value: REFERRAL_STATUS.ACCEPTED, label: 'Accepted' },
    { value: REFERRAL_STATUS.COMPLETED, label: 'Completed' },
    { value: REFERRAL_STATUS.REJECTED, label: 'Rejected' },
    { value: REFERRAL_STATUS.CANCELLED, label: 'Cancelled' },
  ];
  
  // Type filter options
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: REFERRAL_TYPES.INTER_DEPARTMENTAL, label: 'Inter-Departmental' },
    { value: REFERRAL_TYPES.DOCTOR_TO_DOCTOR, label: 'Doctor to Specialist' },
    { value: REFERRAL_TYPES.DOCTOR_TO_PHARMACY, label: 'Doctor to Pharmacy' },
    { value: REFERRAL_TYPES.LAB_TO_LAB, label: 'Lab to Lab' },
  ];
  
  return (
    <Container size="xl" py="xl">
      <Stack>
        {/* Header */}
        <Group justify="space-between">
          <Title order={2}>Referrals</Title>
          {canCreateReferrals && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Referral
            </Button>
          )}
        </Group>
        
        {/* Filters */}
        <Group>
          <Select
            placeholder="Filter by status"
            data={statusOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            clearable
            style={{ minWidth: 150 }}
          />
          
          <Select
            placeholder="Filter by type"
            data={typeOptions}
            value={filterType}
            onChange={setFilterType}
            clearable
            style={{ minWidth: 200 }}
          />
          
          <DatePickerInput
            placeholder="Start date"
            value={startDate}
            onChange={setStartDate}
            clearable
          />
          
          <DatePickerInput
            placeholder="End date"
            value={endDate}
            onChange={setEndDate}
            clearable
          />
        </Group>
        
        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            {canCreateReferrals && (
              <Tabs.Tab value="sent">
                Sent Referrals
                {pendingSentCount > 0 && (
                  <Badge color="yellow" size="sm" ml="xs" circle>
                    {pendingSentCount}
                  </Badge>
                )}
              </Tabs.Tab>
            )}
            <Tabs.Tab value="received">
              Received Referrals
              {pendingReceivedCount > 0 && (
                <Badge color="red" size="sm" ml="xs" circle>
                  {pendingReceivedCount}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>
          
          {/* Sent Referrals Tab */}
          {canCreateReferrals && (
            <Tabs.Panel value="sent" pt="md">
              {loading ? (
                <Loader />
              ) : error ? (
                <Alert color="red">{error}</Alert>
              ) : referrals.length > 0 ? (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Referral ID</Table.Th>
                      <Table.Th>Target</Table.Th>
                      <Table.Th>Patient</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Priority</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {referrals.map((referral) => (
                      <Table.Tr key={referral._id}>
                        <Table.Td>
                          <Text
                            size="sm"
                            c="blue"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewDetails(referral)}
                          >
                            {referral.referralId}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                          <Text size="sm">{referral.targetSnapshot?.name || referral.targetId?.name || 'N/A'}</Text>
                          <Badge size="xs" variant="light">
                            {referral.targetSnapshot?.role || referral.targetId?.role || 'N/A'}
                          </Badge>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}</Text>
                          <Text size="xs" c="dimmed">{referral.patientSnapshot?.phone || referral.patientId?.phone || 'N/A'}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getTypeColor(referral.referralType)} variant="light">
                          {getTypeLabel(referral.referralType || referral.type)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getPriorityColor(referral.priority)}>
                            {referral.priority}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getStatusColor(referral.status)}>
                            {referral.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{formatDateForDisplay(referral.createdAt)}</Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => handleViewDetails(referral)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                            {canCancel(referral) && (
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => handleQuickCancel(referral)}
                              >
                                <IconBan size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Alert>
                  No sent referrals found.
                  {canCreateReferrals && (
                    <Button
                      variant="light"
                      size="sm"
                      mt="sm"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      Create First Referral
                    </Button>
                  )}
                </Alert>
              )}
            </Tabs.Panel>
          )}
          
          {/* Received Referrals Tab */}
          <Tabs.Panel value="received" pt="md">
            {loading ? (
              <Loader />
            ) : error ? (
              <Alert color="red">{error}</Alert>
            ) : referrals.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Referral ID</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Patient</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Priority</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {referrals.map((referral) => {
                    console.log('[ReferralsPage] Received referral:', {
                      id: referral._id,
                      referralId: referral.referralId,
                      referralType: referral.referralType,
                      type: referral.type,
                      sourceSnapshot: referral.sourceSnapshot,
                      sourceId: referral.sourceId,
                    });
                    
                    return (
                    <Table.Tr key={referral._id}>
                      <Table.Td>
                        <Text
                          size="sm"
                          c="blue"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleViewDetails(referral)}
                        >
                          {referral.referralId}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{referral.sourceSnapshot?.name || referral.sourceId?.name || 'N/A'}</Text>
                          <Badge size="xs" variant="light">
                            {referral.sourceSnapshot?.role || referral.sourceId?.role || 'N/A'}
                          </Badge>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text size="sm">{referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}</Text>
                          <Text size="xs" c="dimmed">{referral.patientSnapshot?.phone || referral.patientId?.phone || 'N/A'}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getTypeColor(referral.referralType)} variant="light">
                          {(() => {
                            const typeLabel = getTypeLabel(referral.referralType || referral.type);
                            console.log('[ReferralsPage] Rendering type:', referral.referralType, '-> label:', typeLabel);
                            return typeLabel;
                          })()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getPriorityColor(referral.priority)}>
                          {referral.priority}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(referral.status)}>
                          {referral.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatDateForDisplay(referral.createdAt)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => handleViewDetails(referral)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          {canAccept(referral) && (
                            <ActionIcon
                              color="green"
                              variant="light"
                              onClick={() => handleQuickAccept(referral)}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          )}
                          {canAccept(referral) && (
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleQuickReject(referral)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          )}
                          {canComplete(referral) && (
                            <ActionIcon
                              color="green"
                              variant="light"
                              onClick={() => handleQuickComplete(referral)}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            ) : (
              <Alert>No received referrals found</Alert>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
      
      {/* Create Referral Modal */}
      <ReferralModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        sourceUser={user}
        onSuccess={handleReferralCreated}
      />
      
      {/* Referral Details Modal */}
      <ReferralDetailsModal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        referral={selectedReferral}
        userRole={user?.role}
        userId={user?._id}
        onUpdate={handleReferralUpdated}
      />
    </Container>
  );
}
