import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Container,
  Title,
  Text,
  Button,
  Table,
  Badge,
  Group,
  Stack,
  Paper,
  Loader,
  Alert,
  Tabs,
  Card,
  Avatar,
  ActionIcon,
  TextInput,
  Select,
} from '@mantine/core';
import {
  IconStethoscope,
  IconAlertCircle,
  IconSearch,
  IconVideo,
  IconMessage,
  IconUserPlus,
  IconCalendar,
  IconClock,
  IconEye,
  IconFilter,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authFetch } from '../utils/authFetch';
import { useAuth } from '../contexts/AuthContext';
import { CONSULTATION_STATUS, CONSULTATION_MODE } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle.js';

const ConsultationsListPage = () => {
  usePageTitle('My Consultations');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);
  const [filteredConsultations, setFilteredConsultations] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchConsultations();
  }, []);

  useEffect(() => {
    filterConsultations();
  }, [consultations, activeTab, searchQuery, statusFilter]);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch consultations - endpoint is role-aware
      const response = await authFetch('/api/consultations');

      if (response.ok) {
        const data = await response.json();
        setConsultations(data.data.consultations || []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch consultations');
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

  const filterConsultations = () => {
    let filtered = consultations;

    // Filter by tab (consultation mode)
    if (activeTab !== 'all') {
      filtered = filtered.filter(c => c.mode === activeTab);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filter by search query (patient name or doctor name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const patientName = c.patientId?.name?.toLowerCase() || '';
        const doctorName = c.doctorId?.name?.toLowerCase() || '';
        return patientName.includes(query) || doctorName.includes(query);
      });
    }

    setFilteredConsultations(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case CONSULTATION_STATUS.SCHEDULED:
        return 'blue';
      case CONSULTATION_STATUS.IN_PROGRESS:
        return 'green';
      case CONSULTATION_STATUS.COMPLETED:
        return 'gray';
      case CONSULTATION_STATUS.CANCELLED:
        return 'red';
      case CONSULTATION_STATUS.NO_SHOW:
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case CONSULTATION_MODE.VIDEO_CALL:
        return <IconVideo size={16} />;
      case CONSULTATION_MODE.CHAT:
        return <IconMessage size={16} />;
      case CONSULTATION_MODE.IN_PERSON:
        return <IconUserPlus size={16} />;
      default:
        return <IconStethoscope size={16} />;
    }
  };

  const handleViewConsultation = (consultationId) => {
    navigate(`/consultations/${consultationId}`);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading consultations...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconAlertCircle />} title="Error" color="red">
          {error}
          <Button mt="md" onClick={fetchConsultations}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>My Consultations</Title>
            <Text c="dimmed">
              {user.role === 'Doctor' 
                ? 'View and manage your patient consultations'
                : 'View your consultation history'}
            </Text>
          </div>
          {consultations.length > 0 && (
            <Badge size="lg" variant="filled">
              {consultations.length} Total
            </Badge>
          )}
        </Group>

        {/* Search and Filters */}
        <Paper shadow="xs" p="md" withBorder>
          <Group>
            <TextInput
              placeholder="Search by patient or doctor name..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filter by status"
              leftSection={<IconFilter size={16} />}
              value={statusFilter}
              onChange={setStatusFilter}
              data={[
                { value: 'all', label: 'All Statuses' },
                { value: CONSULTATION_STATUS.SCHEDULED, label: 'Scheduled' },
                { value: CONSULTATION_STATUS.IN_PROGRESS, label: 'In Progress' },
                { value: CONSULTATION_STATUS.COMPLETED, label: 'Completed' },
                { value: CONSULTATION_STATUS.CANCELLED, label: 'Cancelled' },
              ]}
              style={{ width: 200 }}
            />
          </Group>
        </Paper>

        {/* Tabs for Consultation Modes */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<IconStethoscope size={16} />}>
              All ({consultations.length})
            </Tabs.Tab>
            <Tabs.Tab value={CONSULTATION_MODE.VIDEO_CALL} leftSection={<IconVideo size={16} />}>
              Video Calls ({consultations.filter(c => c.mode === CONSULTATION_MODE.VIDEO_CALL).length})
            </Tabs.Tab>
            <Tabs.Tab value={CONSULTATION_MODE.CHAT} leftSection={<IconMessage size={16} />}>
              Chat ({consultations.filter(c => c.mode === CONSULTATION_MODE.CHAT).length})
            </Tabs.Tab>
            <Tabs.Tab value={CONSULTATION_MODE.IN_PERSON} leftSection={<IconUserPlus size={16} />}>
              In-Person ({consultations.filter(c => c.mode === CONSULTATION_MODE.IN_PERSON).length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            {filteredConsultations.length === 0 ? (
              <Paper shadow="xs" p="xl" withBorder>
                <Stack align="center" gap="md">
                  <IconStethoscope size={48} color="var(--mantine-color-gray-5)" />
                  <Title order={4}>No consultations found</Title>
                  <Text c="dimmed" ta="center">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Your consultations will appear here once scheduled'}
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Paper shadow="xs" withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        {user.role === 'Doctor' ? 'Patient' : 'Doctor'}
                      </Table.Th>
                      <Table.Th>Mode</Table.Th>
                      <Table.Th>Scheduled At</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredConsultations.map((consultation) => {
                      const otherUser = user.role === 'Doctor' 
                        ? consultation.patientId 
                        : consultation.doctorId;
                      
                      const scheduledDate = new Date(consultation.scheduledAt);
                      const isValid = !isNaN(scheduledDate.getTime());
                      
                      return (
                        <Table.Tr key={consultation._id}>
                          <Table.Td>
                            <Group gap="sm">
                              <Avatar 
                                src={otherUser?.profilePicture} 
                                radius="xl" 
                                size="sm"
                              />
                              <div>
                                <Text size="sm" fw={500}>
                                  {otherUser?.name || 'Unknown'}
                                </Text>
                                {user.role === 'Doctor' && otherUser?.email && (
                                  <Text size="xs" c="dimmed">
                                    {otherUser.email}
                                  </Text>
                                )}
                              </div>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              {getModeIcon(consultation.mode)}
                              <Text size="sm" tt="capitalize">
                                {consultation.mode?.replace('_', ' ')}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <IconCalendar size={14} />
                              <Text size="sm">
                                {isValid ? scheduledDate.toLocaleString() : 'N/A'}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getStatusColor(consultation.status)} variant="filled">
                              {consultation.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <IconClock size={14} />
                              <Text size="sm">
                                {consultation.duration || 30} min
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon
                              variant="filled"
                              color="blue"
                              onClick={() => handleViewConsultation(consultation._id)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>
        </Tabs>

        {/* Stats Cards */}
        {consultations.length > 0 && (
          <Group grow>
            <Card shadow="sm" p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Scheduled</Text>
                <Title order={3}>
                  {consultations.filter(c => c.status === CONSULTATION_STATUS.SCHEDULED).length}
                </Title>
              </Stack>
            </Card>
            <Card shadow="sm" p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">Completed</Text>
                <Title order={3}>
                  {consultations.filter(c => c.status === CONSULTATION_STATUS.COMPLETED).length}
                </Title>
              </Stack>
            </Card>
            <Card shadow="sm" p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">In Progress</Text>
                <Title order={3}>
                  {consultations.filter(c => c.status === CONSULTATION_STATUS.IN_PROGRESS).length}
                </Title>
              </Stack>
            </Card>
          </Group>
        )}
      </Stack>
    </Container>
  );
};

export default ConsultationsListPage;
