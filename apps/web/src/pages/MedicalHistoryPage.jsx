import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Timeline,
  Text,
  Group,
  Badge,
  Tabs,
  TextInput,
  Button,
  Modal,
  Stack,
  Loader,
  Center,
  Alert,
  Pagination,
  Card,
  Grid,
  SegmentedControl,
  Menu,
  Divider,
  SimpleGrid
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconPill,
  IconFileText,
  IconSearch,
  IconCalendar,
  IconUser,
  IconClock,
  IconMapPin,
  IconAlertCircle,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconChartLine,
  IconTimeline,
  IconPhone
} from '@tabler/icons-react';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuthBlobFetch } from '../hooks/useAuthBlobFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { MEDICAL_HISTORY_TYPES, formatTimelineDate, groupTimelineByDate } from '@arogyafirst/shared';
import { SkeletonTimeline } from '../components/SkeletonLoader';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';

export default function MedicalHistoryPage() {
  usePageTitle('Medical History');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportLoading, setExportLoading] = useState(false);
  const [metricsData, setMetricsData] = useState(null);
  const [zoomDateRange, setZoomDateRange] = useState([null, null]);
  
  const limit = 10;
  const { loading, error, fetchData } = useAuthFetch();
  const { loading: blobLoading, error: blobError, fetchBlob } = useAuthBlobFetch();
  const [fullMedicalHistory, setFullMedicalHistory] = useState([]);

  // Fetch paginated medical history for timeline display
  const loadMedicalHistory = async () => {
    try {
      const params = new URLSearchParams();
      
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }
      
      if (startDate && startDate instanceof Date && !isNaN(startDate)) {
        params.append('startDate', startDate.toISOString().split('T')[0]);
      }
      
      if (endDate && endDate instanceof Date && !isNaN(endDate)) {
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const result = await fetchData(`/api/patients/medical-history?${params.toString()}`);
      if (result?.data) {
        setMedicalHistory(result.data.timeline || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load medical history:', err);
    }
  };

  // Fetch full medical history (non-paginated) for metrics and trends
  const loadFullMedicalHistory = async () => {
    try {
      const params = new URLSearchParams();
      
      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }
      
      if (startDate && startDate instanceof Date && !isNaN(startDate)) {
        params.append('startDate', startDate.toISOString().split('T')[0]);
      }
      
      if (endDate && endDate instanceof Date && !isNaN(endDate)) {
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      params.append('limit', '50'); // Max allowed by validation
      
      const result = await fetchData(`/api/patients/medical-history?${params.toString()}`);
      if (result?.data) {
        setFullMedicalHistory(result.data.timeline || []);
      }
    } catch (err) {
      console.error('Failed to load full medical history:', err);
    }
  };

  // Load data when filters change
  useEffect(() => {
    loadMedicalHistory();
  }, [activeTab, startDate, endDate, page]);

  // Load full medical history for metrics when filters change (not page)
  useEffect(() => {
    loadFullMedicalHistory();
  }, [activeTab, startDate, endDate]);

  // Filter by search query (client-side)
  const filteredHistory = medicalHistory.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (item.type === MEDICAL_HISTORY_TYPES.BOOKING) {
      return (
        (typeof item.details?.providerName === 'string' && item.details.providerName.toLowerCase().includes(query)) ||
        (typeof item.details?.bookingType === 'string' && item.details.bookingType.toLowerCase().includes(query)) ||
        (typeof item.details?.department === 'string' && item.details.department.toLowerCase().includes(query))
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.PRESCRIPTION) {
      const medicines = Array.isArray(item.details?.medicines) ? item.details.medicines : [];
      return (
        (typeof item.details?.prescribedBy === 'string' && item.details.prescribedBy.toLowerCase().includes(query)) ||
        medicines.some(m => typeof m === 'string' && m.toLowerCase().includes(query))
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.DOCUMENT) {
      return (
        (typeof item.details?.documentType === 'string' && item.details.documentType.toLowerCase().includes(query)) ||
        (typeof item.details?.fileName === 'string' && item.details.fileName.toLowerCase().includes(query))
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.CONSULTATION) {
      return (
        (typeof item.details?.doctorName === 'string' && item.details.doctorName.toLowerCase().includes(query)) ||
        (typeof item.details?.mode === 'string' && item.details.mode.toLowerCase().includes(query)) ||
        (typeof item.details?.notes === 'string' && item.details.notes.toLowerCase().includes(query))
      );
    }
    return false;
  });

  // Group by date
  const groupedHistory = groupTimelineByDate(filteredHistory);

  // Aggregate metrics from timeline
  // NOTE: These metrics reflect event utilization counts from the most recent records
  // (up to 1000 entries fetched in loadFullMedicalHistory) sorted in date-descending order.
  // This ensures we're capturing recent activity patterns. Clinical metrics (diagnosis, treatment outcomes)
  // are out of scope for this view - those are handled separately in clinical records.
  const aggregateMetrics = (timeline) => {
    if (!timeline || timeline.length === 0) {
      return {
        totalEvents: 0,
        bookingCount: 0,
        prescriptionCount: 0,
        documentCount: 0,
        consultationCount: 0,
        recentActivityCount: 0,
        upcomingAppointments: 0
      };
    }

    const bookings = timeline.filter(item => item.type === MEDICAL_HISTORY_TYPES.BOOKING);
    const prescriptions = timeline.filter(item => item.type === MEDICAL_HISTORY_TYPES.PRESCRIPTION);
    const documents = timeline.filter(item => item.type === MEDICAL_HISTORY_TYPES.DOCUMENT);
    const consultations = timeline.filter(item => item.type === MEDICAL_HISTORY_TYPES.CONSULTATION);

    const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
    const recentActivityCount = timeline.filter(item => new Date(item.date) >= sevenDaysAgo).length;

    const today = dayjs().startOf('day').toDate();
    const upcomingAppointments = bookings.filter(b =>
      new Date(b.date) >= today && b.details.status === 'CONFIRMED'
    ).length;

    return {
      totalEvents: timeline.length,
      bookingCount: bookings.length,
      prescriptionCount: prescriptions.length,
      documentCount: documents.length,
      consultationCount: consultations.length,
      recentActivityCount,
      upcomingAppointments
    };
  };

  // Aggregate trend data for charts (uses full history, not paginated)
  const aggregateTrendData = () => {
    if (!fullMedicalHistory || fullMedicalHistory.length === 0) return [];

    const groupedByDate = {};
    fullMedicalHistory.forEach(item => {
      const dateKey = dayjs(item.date).format('YYYY-MM-DD');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          bookings: 0,
          consultations: 0,
          prescriptions: 0,
          documents: 0,
          total: 0
        };
      }

      if (item.type === MEDICAL_HISTORY_TYPES.BOOKING) {
        groupedByDate[dateKey].bookings += 1;
      } else if (item.type === MEDICAL_HISTORY_TYPES.CONSULTATION) {
        groupedByDate[dateKey].consultations += 1;
      } else if (item.type === MEDICAL_HISTORY_TYPES.PRESCRIPTION) {
        groupedByDate[dateKey].prescriptions += 1;
      } else if (item.type === MEDICAL_HISTORY_TYPES.DOCUMENT) {
        groupedByDate[dateKey].documents += 1;
      }
      groupedByDate[dateKey].total += 1;
    });

    let trendData = Object.values(groupedByDate).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Apply zoom filter if set
    if (zoomDateRange[0] && zoomDateRange[1]) {
      const startStr = dayjs(zoomDateRange[0]).format('YYYY-MM-DD');
      const endStr = dayjs(zoomDateRange[1]).format('YYYY-MM-DD');
      trendData = trendData.filter(item => item.date >= startStr && item.date <= endStr);
    }

    return trendData;
  };

  // Update metrics when full medical history changes
  useEffect(() => {
    setMetricsData(aggregateMetrics(fullMedicalHistory));
  }, [fullMedicalHistory]);

  const handleClearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  // Handle export functionality using authenticated fetch
  const handleExport = async (format) => {
    if (!exportDateRange[0] || !exportDateRange[1]) {
      showErrorNotification('Please select both start and end dates for export', 'Export Error');
      return;
    }

    setExportLoading(true);
    try {
      const startStr = dayjs(exportDateRange[0]).format('YYYY-MM-DD');
      const endStr = dayjs(exportDateRange[1]).format('YYYY-MM-DD');
      
      // Build query params including type filter for export
      const queryParams = new URLSearchParams({
        format,
        startDate: startStr,
        endDate: endStr,
        ...(activeTab !== 'all' && { type: activeTab })
      });

      // Use authenticated blob fetch (handles auth headers, token refresh, errors)
      const blob = await fetchBlob(
        `/api/patients/medical-history/export?${queryParams.toString()}`
      );

      // Create download link from blob
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medical-history.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccessNotification(`Medical history exported as ${format.toUpperCase()}`, 'Export Successful');
      setExportDateRange([null, null]);
    } catch (err) {
      console.error('Export error:', err);
      // fetchBlob hook already calls showErrorNotification via blobError state,
      // but we also catch here for additional error message context
      if (!blobError) {
        showErrorNotification(err.message || 'Failed to export medical history', 'Export Error');
      }
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <SkeletonTimeline count={5} />
      </Container>
    );
  }

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setModalOpened(true);
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case MEDICAL_HISTORY_TYPES.BOOKING:
        return <IconCalendarEvent size={20} />;
      case MEDICAL_HISTORY_TYPES.CONSULTATION:
        return <IconPhone size={20} />;
      case MEDICAL_HISTORY_TYPES.PRESCRIPTION:
        return <IconPill size={20} />;
      case MEDICAL_HISTORY_TYPES.DOCUMENT:
        return <IconFileText size={20} />;
      default:
        return <IconFileText size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case MEDICAL_HISTORY_TYPES.BOOKING:
        return 'blue';
      case MEDICAL_HISTORY_TYPES.CONSULTATION:
        return 'violet';
      case MEDICAL_HISTORY_TYPES.PRESCRIPTION:
        return 'green';
      case MEDICAL_HISTORY_TYPES.DOCUMENT:
        return 'orange';
      default:
        return 'gray';
    }
  };

  const renderItemDetails = (item) => {
    if (item.type === MEDICAL_HISTORY_TYPES.BOOKING) {
      return (
        <>
          <Text size="sm" fw={500}>{item.details.providerName}</Text>
          <Group gap="xs" mt={4}>
            <Badge size="xs" color="blue">{item.details.bookingType}</Badge>
            <Badge size="xs" variant="outline">{item.details.status}</Badge>
          </Group>
          {item.details.department && (
            <Text size="xs" c="dimmed" mt={4}>Department: {item.details.department}</Text>
          )}
        </>
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.CONSULTATION) {
      return (
        <>
          <Text size="sm" fw={500}>Consultation</Text>
          <Text size="xs" c="dimmed" mt={4}>Doctor: {item.details.doctorName}</Text>
          <Group gap="xs" mt={4}>
            <Badge size="xs" color="violet">{item.details.mode}</Badge>
            <Badge size="xs" variant="outline">{item.details.status}</Badge>
          </Group>
        </>
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.PRESCRIPTION) {
      return (
        <>
          <Text size="sm" fw={500}>Prescription</Text>
          <Text size="xs" c="dimmed" mt={4}>Prescribed by: {item.details.prescribedBy}</Text>
          <Text size="xs" c="dimmed">Medicines: {item.details.medicines?.length || 0}</Text>
        </>
      );
    } else if (item.type === MEDICAL_HISTORY_TYPES.DOCUMENT) {
      return (
        <>
          <Text size="sm" fw={500}>{item.details.documentType}</Text>
          <Text size="xs" c="dimmed" mt={4}>{item.details.fileName}</Text>
        </>
      );
    }
  };

  const renderModalContent = () => {
    if (!selectedItem) return null;

    if (selectedItem.type === MEDICAL_HISTORY_TYPES.BOOKING) {
      return (
        <Stack gap="md">
          <Group>
            <IconUser size={20} />
            <div>
              <Text size="sm" fw={500}>Provider</Text>
              <Text size="sm">{selectedItem.details.providerName}</Text>
            </div>
          </Group>
          <Group>
            <IconCalendar size={20} />
            <div>
              <Text size="sm" fw={500}>Booking Type</Text>
              <Text size="sm">{selectedItem.details.bookingType}</Text>
            </div>
          </Group>
          <Group>
            <IconClock size={20} />
            <div>
              <Text size="sm" fw={500}>Status</Text>
              <Badge color={getTypeColor(selectedItem.type)}>{selectedItem.details.status}</Badge>
            </div>
          </Group>
          {selectedItem.details.department && (
            <Group>
              <IconMapPin size={20} />
              <div>
                <Text size="sm" fw={500}>Department</Text>
                <Text size="sm">{selectedItem.details.department}</Text>
              </div>
            </Group>
          )}
          <Group>
            <IconCalendarEvent size={20} />
            <div>
              <Text size="sm" fw={500}>Date</Text>
              <Text size="sm">{new Date(selectedItem.date).toLocaleDateString()}</Text>
            </div>
          </Group>
        </Stack>
      );
    } else if (selectedItem.type === MEDICAL_HISTORY_TYPES.CONSULTATION) {
      return (
        <Stack gap="md">
          <Group>
            <IconUser size={20} />
            <div>
              <Text size="sm" fw={500}>Doctor</Text>
              <Text size="sm">{selectedItem.details.doctorName}</Text>
            </div>
          </Group>
          <Group>
            <IconPhone size={20} />
            <div>
              <Text size="sm" fw={500}>Mode</Text>
              <Text size="sm">{selectedItem.details.mode}</Text>
            </div>
          </Group>
          <Group>
            <IconClock size={20} />
            <div>
              <Text size="sm" fw={500}>Status</Text>
              <Badge color={getTypeColor(selectedItem.type)}>{selectedItem.details.status}</Badge>
            </div>
          </Group>
          {selectedItem.details.notes && (
            <div>
              <Text size="sm" fw={500}>Notes</Text>
              <Text size="sm" c="dimmed">{selectedItem.details.notes}</Text>
            </div>
          )}
          <Group>
            <IconCalendarEvent size={20} />
            <div>
              <Text size="sm" fw={500}>Date</Text>
              <Text size="sm">{new Date(selectedItem.date).toLocaleDateString()}</Text>
            </div>
          </Group>
        </Stack>
      );
    } else if (selectedItem.type === MEDICAL_HISTORY_TYPES.PRESCRIPTION) {
      return (
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500}>Prescribed By</Text>
            <Text size="sm">{selectedItem.details.prescribedBy}</Text>
          </div>
          <div>
            <Text size="sm" fw={500} mb="xs">Medicines</Text>
            {selectedItem.details.medicines && selectedItem.details.medicines.length > 0 ? (
              selectedItem.details.medicines.map((medicine, index) => (
                <Card key={index} withBorder p="xs" mb="xs">
                  <Text size="sm">
                    {typeof medicine === 'string' 
                      ? medicine 
                      : medicine.name || medicine.medicineName || JSON.stringify(medicine)}
                  </Text>
                </Card>
              ))
            ) : (
              <Text size="sm" c="dimmed">No medicines listed</Text>
            )}
          </div>
          <div>
            <Text size="sm" fw={500}>Date</Text>
            <Text size="sm">{new Date(selectedItem.date).toLocaleDateString()}</Text>
          </div>
        </Stack>
      );
    } else if (selectedItem.type === MEDICAL_HISTORY_TYPES.DOCUMENT) {
      return (
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500}>Document Type</Text>
            <Text size="sm">{selectedItem.details.documentType}</Text>
          </div>
          <div>
            <Text size="sm" fw={500}>File Name</Text>
            <Text size="sm">{selectedItem.details.fileName}</Text>
          </div>
          <div>
            <Text size="sm" fw={500}>Upload Date</Text>
            <Text size="sm">{new Date(selectedItem.date).toLocaleDateString()}</Text>
          </div>
          {selectedItem.details.fileUrl && (
            <Button
              component="a"
              href={selectedItem.details.fileUrl}
              target="_blank"
              variant="light"
            >
              View Document
            </Button>
          )}
        </Stack>
      );
    }
  };

  const trendData = aggregateTrendData();
  const typeDistributionData = metricsData ? [
    { type: 'Bookings', count: metricsData.bookingCount },
    { type: 'Prescriptions', count: metricsData.prescriptionCount },
    { type: 'Documents', count: metricsData.documentCount }
  ] : [];

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="xl">
        <Title order={1}>Medical History</Title>
        <Menu>
          <Menu.Target>
            <Button leftSection={<IconDownload size={18} />} loading={exportLoading}>
              Export Timeline
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item disabled>
              <Text size="sm" fw={500} mb="xs">Select Date Range</Text>
            </Menu.Item>
            <DatePickerInput
              type="range"
              label="Date Range"
              value={exportDateRange}
              onChange={setExportDateRange}
              size="xs"
              maxDate={new Date()}
              placeholder="Pick dates range"
              style={{ padding: '8px 12px' }}
            />
            <Divider my="sm" />
            <Menu.Item
              leftSection={<IconFileTypeCsv size={16} />}
              onClick={() => handleExport('csv')}
              disabled={exportLoading || !exportDateRange[0] || !exportDateRange[1]}
            >
              Export as CSV
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypePdf size={16} />}
              onClick={() => handleExport('pdf')}
              disabled={exportLoading || !exportDateRange[0] || !exportDateRange[1]}
            >
              Export as PDF
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Health Metrics Cards */}
      {metricsData && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="xl">
          <Card withBorder p="md" shadow="sm">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Events</Text>
                <Text fw={700} size="lg">{metricsData.totalEvents}</Text>
              </div>
              <IconCalendarEvent size={32} style={{ opacity: 0.3 }} />
            </Group>
          </Card>

          <Card withBorder p="md" shadow="sm">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Recent Activity</Text>
                <Text fw={700} size="lg">{metricsData.recentActivityCount}</Text>
              </div>
              <IconClock size={32} style={{ opacity: 0.3 }} />
            </Group>
            <Text size="xs" c="dimmed" mt={4}>Last 7 days</Text>
          </Card>

          <Card withBorder p="md" shadow="sm">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Upcoming Appointments</Text>
                <Text fw={700} size="lg">{metricsData.upcomingAppointments}</Text>
              </div>
              <IconCalendar size={32} style={{ opacity: 0.3 }} />
            </Group>
          </Card>

          <Card withBorder p="md" shadow="sm">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Documents</Text>
                <Text fw={700} size="lg">{metricsData.documentCount}</Text>
              </div>
              <IconFileText size={32} style={{ opacity: 0.3 }} />
            </Group>
          </Card>
        </SimpleGrid>
      )}

      {/* View Mode Toggle */}
      <Group justify="center" mb="lg">
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          data={[
            { label: 'Timeline View', value: 'timeline', leftSection: <IconTimeline size={14} /> },
            { label: 'Trends View', value: 'trends', leftSection: <IconChartLine size={14} /> }
          ]}
        />
      </Group>

      {/* Filters */}
      <Paper p="md" mb="xl" withBorder>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">All Records</Tabs.Tab>
            <Tabs.Tab value={MEDICAL_HISTORY_TYPES.BOOKING} leftSection={<IconCalendarEvent size={16} />}>
              Appointments
            </Tabs.Tab>
            <Tabs.Tab value={MEDICAL_HISTORY_TYPES.CONSULTATION} leftSection={<IconPhone size={16} />}>
              Consultations
            </Tabs.Tab>
            <Tabs.Tab value={MEDICAL_HISTORY_TYPES.PRESCRIPTION} leftSection={<IconPill size={16} />}>
              Prescriptions
            </Tabs.Tab>
            <Tabs.Tab value={MEDICAL_HISTORY_TYPES.DOCUMENT} leftSection={<IconFileText size={16} />}>
              Documents
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Grid mt="md">
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <TextInput
              placeholder="Search records..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <DateInput
              placeholder="Start date"
              value={startDate}
              onChange={setStartDate}
              clearable
              maxDate={new Date()}
              valueFormat="YYYY-MM-DD"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <DateInput
              placeholder="End date"
              value={endDate}
              onChange={setEndDate}
              clearable
              maxDate={new Date()}
              valueFormat="YYYY-MM-DD"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
            <Button variant="light" fullWidth onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* Error State */}
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {error}
        </Alert>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <>
          {/* Empty State */}
          {!loading && !error && filteredHistory.length === 0 && (
            <Paper p="xl" withBorder>
              <Center>
                <Stack align="center">
                  <IconFileText size={48} stroke={1.5} color="gray" />
                  <Text size="lg" fw={500}>No medical history found</Text>
                  <Text size="sm" c="dimmed">Your medical records will appear here</Text>
                </Stack>
              </Center>
            </Paper>
          )}

          {/* Timeline */}
          {!loading && !error && filteredHistory.length > 0 && (
            <>
              {Object.keys(groupedHistory).sort((a, b) => new Date(b) - new Date(a)).map((dateKey) => (
                <div key={dateKey}>
                  <Text size="sm" fw={600} c="dimmed" mb="md">
                    {formatTimelineDate(dateKey)}
                  </Text>
                  <Timeline active={-1} bulletSize={32} lineWidth={2} mb="xl">
                    {groupedHistory[dateKey].map((item, index) => (
                      <Timeline.Item
                        key={item._id || item.id || `${item.type}-${index}`}
                        bullet={getTimelineIcon(item.type)}
                        color={getTypeColor(item.type)}
                      >
                        <Paper
                          p="md"
                          withBorder
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleItemClick(item)}
                        >
                          {renderItemDetails(item)}
                        </Paper>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <Center mt="xl">
                  <Pagination total={totalPages} value={page} onChange={setPage} />
                </Center>
              )}
            </>
          )}
        </>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && (
        <>
          {!loading && !error && fullMedicalHistory.length === 0 && (
            <Paper p="xl" withBorder>
              <Center>
                <Stack align="center">
                  <IconChartLine size={48} stroke={1.5} color="gray" />
                  <Text size="lg" fw={500}>No data available for trends</Text>
                  <Text size="sm" c="dimmed">Start adding medical records to see trend analysis</Text>
                </Stack>
              </Center>
            </Paper>
          )}

          {!loading && !error && fullMedicalHistory.length > 0 && (
            <>
              {/* Date Range Zoom Controls */}
              <Paper p="md" mb="xl" withBorder>
                <Text fw={500} mb="md">Zoom to Date Range</Text>
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="Start Date"
                      placeholder="Select start date"
                      value={zoomDateRange[0]}
                      onChange={(date) => setZoomDateRange([date, zoomDateRange[1]])}
                      clearable
                      maxDate={new Date()}
                      valueFormat="YYYY-MM-DD"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="End Date"
                      placeholder="Select end date"
                      value={zoomDateRange[1]}
                      onChange={(date) => setZoomDateRange([zoomDateRange[0], date])}
                      clearable
                      maxDate={new Date()}
                      valueFormat="YYYY-MM-DD"
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Button
                      variant="light"
                      onClick={() => setZoomDateRange([null, null])}
                      fullWidth
                    >
                      Reset Zoom
                    </Button>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Activity Over Time Chart */}
              <Paper p="md" mb="xl" withBorder>
                <Text fw={500} mb="md">Activity Over Time</Text>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => dayjs(date).format('MM/DD')}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => value}
                      labelFormatter={(label) => dayjs(label).format('MMM DD, YYYY')}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="bookings" stroke="#1971c2" name="Bookings" />
                    <Line type="monotone" dataKey="prescriptions" stroke="#51cf66" name="Prescriptions" />
                    <Line type="monotone" dataKey="documents" stroke="#ff922b" name="Documents" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>

              {/* Event Type Distribution Chart */}
              <Paper p="md" withBorder>
                <Text fw={500} mb="md">Event Type Distribution</Text>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1971c2" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </>
          )}
        </>
      )}

      {/* Details Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={selectedItem ? `${selectedItem.type} Details` : ''}
        size="md"
      >
        {renderModalContent()}
      </Modal>
    </Container>
  );
}
