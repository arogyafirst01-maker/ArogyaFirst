import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Container,
  Paper,
  Title,
  Timeline,
  Text,
  Badge,
  Button,
  Loader,
  Alert,
  Group,
  Stack,
  Tabs,
  Card,
  ActionIcon,
  Collapse,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconCalendar,
  IconPill,
  IconFileText,
  IconStethoscope,
  IconShieldCheck,
  IconShieldX,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { authFetch } from '../utils/authFetch';
import { usePageTitle } from '../hooks/usePageTitle.js';

const PatientHistoryViewerPage = () => {
  usePageTitle('Patient History');
  const { id: patientId } = useParams();
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState([null, null]);
  const [expandedItems, setExpandedItems] = useState({});

  const fetchPatientHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.append('type', filterType);
      }
      if (dateRange[0]) {
        params.append('startDate', dateRange[0].toISOString());
      }
      if (dateRange[1]) {
        params.append('endDate', dateRange[1].toISOString());
      }

      const response = await authFetch(`/api/doctors/patients/${patientId}/history?${params}`);

      if (response.ok) {
        const data = await response.json();
        setPatientInfo(data.data.patient);
        setTimeline(data.data.timeline);
        setHasAccess(true);
      } else {
        if (response.status === 403) {
          setHasAccess(false);
          const errorData = await response.json();
          setError(errorData.message || 'Access denied');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch patient history');
        }
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

  useEffect(() => {
    fetchPatientHistory();
  }, [patientId, filterType, dateRange]);

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case 'booking':
        return <IconCalendar size={20} />;
      case 'prescription':
        return <IconPill size={20} />;
      case 'document':
        return <IconFileText size={20} />;
      case 'consultation':
        return <IconStethoscope size={20} />;
      default:
        return <IconFileText size={20} />;
    }
  };

  const getTimelineColor = (type) => {
    switch (type) {
      case 'booking':
        return 'blue';
      case 'prescription':
        return 'green';
      case 'document':
        return 'orange';
      case 'consultation':
        return 'teal';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTimelineDetails = (item) => {
    const isExpanded = expandedItems[item._id];

    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb={isExpanded ? 'md' : 0}>
          <div>
            <Text fw={500}>{item.title}</Text>
            <Text size="sm" c="dimmed">
              {formatDate(item.date)}
            </Text>
          </div>
          <Group>
            <Badge color={getTimelineColor(item.type)}>{item.type}</Badge>
            <ActionIcon variant="subtle" onClick={() => toggleExpand(item._id)}>
              {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
        </Group>

        <Collapse in={isExpanded}>
          <Stack gap="xs">
            {item.details && Object.entries(item.details).map(([key, value]) => (
              <Group key={key} justify="space-between">
                <Text size="sm" c="dimmed" tt="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </Text>
                <Text size="sm">{String(value)}</Text>
              </Group>
            ))}
          </Stack>
        </Collapse>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Loading patient history...</Text>
        </Stack>
      </Container>
    );
  }

  if (!hasAccess) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="lg">
          <Button leftSection={<IconArrowLeft size={16} />} variant="subtle" onClick={() => navigate(-1)}>
            Back to Patients
          </Button>

          <Alert icon={<IconShieldX />} title="Access Denied" color="red">
            {error || 'You do not have permission to view this patient\'s medical history. Please request consent or ensure there is an active booking.'}
          </Alert>

          <Paper shadow="xs" p="xl" withBorder>
            <Stack align="center" gap="md">
              <IconShieldX size={60} color="var(--mantine-color-red-6)" />
              <Title order={3}>No Access</Title>
              <Text size="sm" c="dimmed" ta="center">
                To view this patient's medical history, you need either:
              </Text>
              <ul>
                <li><Text size="sm">An active consent request approved by the patient</Text></li>
                <li><Text size="sm">A confirmed or completed booking with the patient</Text></li>
              </ul>
              <Button leftSection={<IconShieldCheck size={16} />} color="blue">
                Request Consent
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={2}>{patientInfo?.name || 'Patient History'}</Title>
              <Text size="sm" c="dimmed">
                {patientInfo?.email} • {patientInfo?.phone}
              </Text>
            </div>
          </Group>
          <Group>
            {patientInfo?.hasActiveConsent ? (
              <Badge color="green" size="lg" leftSection={<IconShieldCheck size={14} />}>
                Active Consent
              </Badge>
            ) : (
              <Badge color="blue" size="lg" leftSection={<IconCalendar size={14} />}>
                Booking Access
              </Badge>
            )}
          </Group>
        </Group>

        {/* Actions */}
        <Group>
          <Button leftSection={<IconPlus size={16} />} variant="filled">
            Schedule Consultation
          </Button>
        </Group>

        {/* Filters */}
        <Paper shadow="xs" p="md" withBorder>
          <Stack gap="md">
            <Tabs value={filterType} onChange={setFilterType}>
              <Tabs.List>
                <Tabs.Tab value="all">All</Tabs.Tab>
                <Tabs.Tab value="booking" leftSection={<IconCalendar size={14} />}>
                  Bookings
                </Tabs.Tab>
                <Tabs.Tab value="prescription" leftSection={<IconPill size={14} />}>
                  Prescriptions
                </Tabs.Tab>
                <Tabs.Tab value="document" leftSection={<IconFileText size={14} />}>
                  Documents
                </Tabs.Tab>
                <Tabs.Tab value="consultation" leftSection={<IconStethoscope size={14} />}>
                  Consultations
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            <DatePickerInput
              type="range"
              label="Date Range"
              placeholder="Select date range"
              value={dateRange}
              onChange={setDateRange}
              clearable
            />
          </Stack>
        </Paper>

        {/* Timeline */}
        <Paper shadow="xs" p="md" withBorder>
          {timeline.length === 0 ? (
            <Stack align="center" py="xl">
              <IconFileText size={60} color="var(--mantine-color-gray-5)" />
              <Text size="lg" c="dimmed">
                No medical history found
              </Text>
              <Text size="sm" c="dimmed">
                Try adjusting your filters or check back later.
              </Text>
            </Stack>
          ) : (
            <Timeline active={timeline.length} bulletSize={24} lineWidth={2}>
              {timeline.map((item) => (
                <Timeline.Item
                  key={item._id}
                  bullet={getTimelineIcon(item.type)}
                  color={getTimelineColor(item.type)}
                  title={renderTimelineDetails(item)}
                >
                  <div style={{ height: 20 }} />
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default PatientHistoryViewerPage;
