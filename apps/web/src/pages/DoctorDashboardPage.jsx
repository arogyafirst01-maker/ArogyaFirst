import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Title,
  Table,
  TextInput,
  Select,
  Pagination,
  Button,
  Loader,
  Alert,
  Badge,
  Group,
  Stack,
  SimpleGrid,
  Text,
  Card,
  ActionIcon,
  Tooltip,
  Menu,
  Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconSearch,
  IconUser,
  IconCalendar,
  IconStethoscope,
  IconAlertCircle,
  IconEye,
  IconPlus,
  IconShieldCheck,
  IconCalendarEvent,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { notifications } from '@mantine/notifications';
import { authFetch } from '../utils/authFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

const DoctorDashboardPage = () => {
  usePageTitle('Doctor Dashboard');
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('lastActivity');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalPatients: 0,
    seenToday: 0,
    upcomingConsultations: 0,
  });

  // Export state
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportReportType, setExportReportType] = useState('patients');
  const [exportLoading, setExportLoading] = useState(false);

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPatients = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage,
        sortBy,
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await authFetch(`/api/doctors/${user._id}/patients?${params}`);

      if (response.ok) {
        const data = await response.json();
        setPatients(data.data.patients);
        setTotalPages(data.data.pagination.totalPages);
        setStats({
          totalPatients: data.data.totalPatients,
          seenToday: data.data.seenToday || 0,
          upcomingConsultations: data.data.upcomingConsultations || 0,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch patients');
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
  }, [user?._id, currentPage, sortBy, debouncedSearch]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const getStatusBadge = (patient) => {
    if (patient.hasActiveConsent) {
      return (
        <Badge color="green" leftSection={<IconShieldCheck size={14} />}>
          Active Consent
        </Badge>
      );
    }
    if (patient.hasBooking) {
      return (
        <Badge color="blue" leftSection={<IconCalendarEvent size={14} />}>
          Booking Access
        </Badge>
      );
    }
    return <Badge color="gray">No Access</Badge>;
  };

  const maskContact = (contact) => {
    if (!contact) return 'N/A';
    if (typeof contact !== 'string') return 'N/A';
    if (contact.includes('@')) {
      const [user, domain] = contact.split('@');
      return `${user?.slice(0, 2) || ''}***@${domain || ''}`;
    }
    return `${contact.slice(0, 3)}***${contact.slice(-2)}`;
  };

  const handleExport = async (format) => {
    if (!exportDateRange[0] || !exportDateRange[1]) {
      notifications.show({
        title: 'Error',
        message: 'Please select a date range',
        color: 'red',
      });
      return;
    }

    if (!user?._id) {
      notifications.show({
        title: 'Error',
        message: 'User not authenticated',
        color: 'red',
      });
      return;
    }

    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        reportType: exportReportType,
        format,
        startDate: exportDateRange[0]?.toISOString?.() || new Date().toISOString(),
        endDate: exportDateRange[1]?.toISOString?.() || new Date().toISOString(),
      });

      const response = await authFetch(`/api/doctors/${user._id}/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `doctor-${exportReportType}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        notifications.show({
          title: 'Success',
          message: 'Report exported successfully',
          color: 'green',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to export report',
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };

  if (loading && patients.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading patients...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>My Patients</Title>
          <Menu shadow="md" width={250}>
            <Menu.Target>
              <Button leftSection={<IconDownload size={16} />} loading={exportLoading}>
                Export Reports
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Stack gap="sm" p="xs">
                <Select
                  label="Report Type"
                  value={exportReportType}
                  onChange={setExportReportType}
                  data={[
                    { value: 'patients', label: 'Patients Report' },
                    { value: 'consultations', label: 'Consultations Report' },
                    { value: 'revenue', label: 'Revenue Report' },
                  ]}
                />
                <DatePickerInput
                  type="range"
                  label="Date Range"
                  placeholder="Select range"
                  value={exportDateRange}
                  onChange={setExportDateRange}
                  maxDate={new Date()}
                />
                <Divider />
                <Button
                  leftSection={<IconFileTypeCsv size={16} />}
                  variant="light"
                  onClick={() => handleExport('csv')}
                  disabled={!exportDateRange[0] || !exportDateRange[1]}
                >
                  Export as CSV
                </Button>
                <Button
                  leftSection={<IconFileTypePdf size={16} />}
                  variant="light"
                  onClick={() => handleExport('pdf')}
                  disabled={!exportDateRange[0] || !exportDateRange[1]}
                >
                  Export as PDF
                </Button>
              </Stack>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total Patients
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalPatients}
                </Text>
              </div>
              <IconUser size={40} color="var(--mantine-color-blue-6)" style={{ opacity: 0.6 }} />
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Seen Today
                </Text>
                <Text size="xl" fw={700}>
                  {stats.seenToday}
                </Text>
              </div>
              <IconCalendar size={40} color="var(--mantine-color-green-6)" style={{ opacity: 0.6 }} />
            </Group>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Upcoming Consultations
                </Text>
                <Text size="xl" fw={700}>
                  {stats.upcomingConsultations}
                </Text>
              </div>
              <IconStethoscope size={40} color="var(--mantine-color-teal-6)" style={{ opacity: 0.6 }} />
            </Group>
          </Card>
        </SimpleGrid>

        {/* Filters */}
        <Paper shadow="xs" p="md" withBorder>
          <Group grow>
            <TextInput
              placeholder="Search by name, email, or phone..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              data={[
                { value: 'lastActivity', label: 'Last Activity' },
                { value: 'name', label: 'Name' },
              ]}
            />
          </Group>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Patients Table */}
        <Paper shadow="xs" p="md" withBorder>
          {patients.length === 0 ? (
            <Stack align="center" py="xl">
              <IconUser size={60} color="var(--mantine-color-gray-5)" />
              <Text size="lg" c="dimmed">
                No patients yet...
              </Text>
              <Text size="sm" c="dimmed">
                Patients will appear here after they book consultations or grant consent.
              </Text>
            </Stack>
          ) : (
            <>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Patient Name</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Last Visit</Table.Th>
                    <Table.Th>Total Consultations</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {patients && Array.isArray(patients) && patients.map((patient) => {
                    if (!patient) return null;
                    return (
                    <Table.Tr key={patient._id}>
                      <Table.Td>
                        <Text fw={500}>{patient.name || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {maskContact(patient.email || patient.phone)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {patient.lastActivity
                            ? new Date(patient.lastActivity).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{patient.totalConsultations || 0}</Text>
                      </Table.Td>
                      <Table.Td>{getStatusBadge(patient)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View History">
                            <ActionIcon
                              component={Link}
                              to={`/patients/${patient._id}/history`}
                              variant="light"
                              color="blue"
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Schedule Consultation">
                            <ActionIcon variant="light" color="green">
                              <IconPlus size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} />
                </Group>
              )}
            </>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default DoctorDashboardPage;
