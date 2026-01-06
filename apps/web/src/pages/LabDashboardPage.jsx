import { Container, Title, Tabs, Grid, Card, Text, Group, Badge, Stack, Table, Loader, Button, Select, Menu, Divider, FileInput, Alert, Badge as MantineBadge } from '@mantine/core';
import { IconFlask, IconCalendar, IconFileText, IconCurrencyRupee, IconAlertCircle, IconUpload, IconDownload, IconFileTypeCsv, IconFileTypePdf, IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { notifications } from '@mantine/notifications';
import { BOOKING_STATUS } from '@arogyafirst/shared';
import { DatePickerInput } from '@mantine/dates';

const MetricCard = ({ icon: Icon, label, value, loading, color = 'blue' }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Group justify="apart" mb="xs">
      <Text size="sm" c="dimmed" fw={500}>
        {label}
      </Text>
      <Icon size={24} color={color} />
    </Group>
    {loading ? (
      <Loader size="sm" />
    ) : (
      <Text size="xl" fw={700}>
        {value}
      </Text>
    )}
  </Card>
);

const getStatusColor = (status) => {
  switch (status) {
    case BOOKING_STATUS.CONFIRMED:
      return 'blue';
    case BOOKING_STATUS.COMPLETED:
      return 'green';
    case BOOKING_STATUS.PENDING:
      return 'yellow';
    case BOOKING_STATUS.CANCELLED:
      return 'red';
    case BOOKING_STATUS.NO_SHOW:
      return 'gray';
    default:
      return 'gray';
  }
};

export default function LabDashboardPage() {
  usePageTitle('Lab Dashboard');
  const { user } = useAuth();
  const { fetchData, loading } = useAuthFetch();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30'); // Last 30 days
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportReportType, setExportReportType] = useState('bookings');
  const [exportLoading, setExportLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  
  const loadDashboard = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      let url = `/api/labs/${user._id}/dashboard`;
      
      // Add date range filters if not default
      if (dateRange !== '30') {
        const now = new Date();
        const daysAgo = parseInt(dateRange);
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        url += `?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`;
      }
      
      const result = await fetchData(url);
      if (result?.data?.dashboard) {
        setDashboard(result.data.dashboard);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load dashboard data',
        color: 'red',
      });
    }
  }, [user, dateRange, fetchData]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || 0}`;
  };

  // Export handler
  const handleExport = async (format) => {
    if (!exportDateRange[0] || !exportDateRange[1]) {
      notifications.show({
        title: 'Error',
        message: 'Please select a date range',
        color: 'red',
      });
      return;
    }

    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        reportType: exportReportType,
        format,
        startDate: exportDateRange[0].toISOString(),
        endDate: exportDateRange[1].toISOString(),
      });

      const response = await fetch(`/api/labs/${user._id}/export?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lab-${exportReportType}-${Date.now()}.${format}`;
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

  // CSV Template download
  const downloadCsvTemplate = () => {
    const template = 'bookingId,reportTitle,reportDescription,reportUrl\nBK-2025-001,Blood Test Report,Complete blood count,https://res.cloudinary.com/example/sample.pdf\nBK-2025-002,X-Ray Report,Chest X-ray,https://res.cloudinary.com/example/xray.pdf\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab_reports_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    notifications.show({
      title: 'Success',
      message: 'CSV template downloaded',
      color: 'green',
    });
  };

  // Bulk upload handler
  const handleBulkUpload = async () => {
    if (!csvFile) {
      notifications.show({
        title: 'Error',
        message: 'Please select a CSV file',
        color: 'red',
      });
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await fetch('/api/labs/bulk-upload-reports', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setUploadResults(data.data);
        setCsvFile(null);
        notifications.show({
          title: 'Success',
          message: data.message || 'Reports uploaded successfully',
          color: 'green',
        });
        // Refresh dashboard metrics after successful upload
        await loadDashboard();
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to upload reports',
        color: 'red',
      });
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading dashboard...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Lab Dashboard</Title>
          <Group>
            <Select
              value={dateRange}
              onChange={(value) => setDateRange(value)}
              data={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
              style={{ width: 150 }}
            />
            <Menu shadow="md" width={280} closeOnItemClick={false}>
              <Menu.Target>
                <Button leftSection={<IconDownload size={16} />} loading={exportLoading}>
                  Export Report
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Report Type</Menu.Label>
                <Select
                  size="xs"
                  value={exportReportType}
                  onChange={setExportReportType}
                  data={[
                    { value: 'bookings', label: 'Bookings Report' },
                    { value: 'tests', label: 'Tests Report' },
                    { value: 'revenue', label: 'Revenue Report' },
                  ]}
                  mb="xs"
                  px="xs"
                />
                <Divider />
                <Menu.Label>Date Range</Menu.Label>
                <DatePickerInput
                  type="range"
                  size="xs"
                  placeholder="Select date range"
                  value={exportDateRange}
                  onChange={setExportDateRange}
                  maxDate={new Date()}
                  mb="xs"
                  mx="xs"
                />
                <Divider />
                <Menu.Item
                  leftSection={<IconFileTypeCsv size={16} />}
                  onClick={() => handleExport('csv')}
                >
                  Export as CSV
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconFileTypePdf size={16} />}
                  onClick={() => handleExport('pdf')}
                >
                  Export as PDF
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="bookings">Bookings</Tabs.Tab>
            <Tabs.Tab value="reports">Reports</Tabs.Tab>
            <Tabs.Tab value="billing">Billing</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              {/* Metrics Cards */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconCalendar}
                    label="Total Bookings"
                    value={dashboard?.metrics?.totalBookingsThisMonth || 0}
                    loading={loading}
                    color="var(--mantine-color-blue-6)"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconFlask}
                    label="Completed Tests"
                    value={dashboard?.metrics?.statusBreakdown?.COMPLETED || 0}
                    loading={loading}
                    color="var(--mantine-color-green-6)"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconFileText}
                    label="Pending Reports"
                    value={dashboard?.metrics?.pendingReports || 0}
                    loading={loading}
                    color="var(--mantine-color-yellow-6)"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconCurrencyRupee}
                    label="Monthly Revenue"
                    value={formatCurrency(dashboard?.metrics?.revenueThisMonth)}
                    loading={loading}
                    color="var(--mantine-color-teal-6)"
                  />
                </Grid.Col>
              </Grid>

              {/* Bookings Over Time Chart */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Bookings Over Time</Title>
                {dashboard?.bookingsOverTime?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboard.bookingsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="var(--mantine-color-blue-6)" name="Bookings" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">No data available</Text>
                )}
              </Card>

              {/* Upcoming Bookings */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Upcoming Bookings (Next 7 Days)</Title>
                {dashboard?.upcomingBookings?.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Booking ID</Table.Th>
                        <Table.Th>Patient</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.upcomingBookings.map((booking) => (
                        <Table.Tr key={booking._id}>
                          <Table.Td>{booking.bookingId}</Table.Td>
                          <Table.Td>{booking.patientId?.name || 'N/A'}</Table.Td>
                          <Table.Td>{formatDate(booking.bookingDate)}</Table.Td>
                          <Table.Td>
                            <Badge color={getStatusColor(booking.status)}>{booking.status}</Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center">No upcoming bookings</Text>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="bookings" pt="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">Recent Completed Bookings</Title>
              {dashboard?.recentCompletedBookings?.length > 0 ? (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Booking ID</Table.Th>
                      <Table.Th>Patient</Table.Th>
                      <Table.Th>Completed On</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {dashboard.recentCompletedBookings.map((booking) => (
                      <Table.Tr key={booking._id}>
                        <Table.Td>{booking.bookingId}</Table.Td>
                        <Table.Td>{booking.patientId?.name || 'N/A'}</Table.Td>
                        <Table.Td>{formatDate(booking.updatedAt)}</Table.Td>
                        <Table.Td>
                          <Badge color={getStatusColor(booking.status)}>{booking.status}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconUpload size={14} />}
                            onClick={() => {
                              // Navigate to reports page where they can upload reports
                              navigate('/reports');
                            }}
                          >
                            Upload Report
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed" ta="center">No completed bookings</Text>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="reports" pt="lg">
            <Stack gap="lg">
              {/* Bulk Upload Section */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <div>
                    <Title order={4} mb="xs">Bulk Upload Lab Reports</Title>
                    <Text size="sm" c="dimmed">
                      Upload multiple lab reports at once using a CSV file. Each row should contain: Booking ID, Report Title, Report Description, and Cloudinary Report URL.
                    </Text>
                  </div>

                  <Group>
                    <Button
                      variant="outline"
                      leftSection={<IconDownload size={16} />}
                      onClick={downloadCsvTemplate}
                    >
                      Download CSV Template
                    </Button>
                  </Group>

                  {!uploadResults && (
                    <Group gap="md" align="flex-end">
                      <FileInput
                        label="Select CSV File"
                        placeholder="Choose a CSV file"
                        icon={<IconFileTypeCsv size={14} />}
                        accept=".csv"
                        value={csvFile}
                        onChange={setCsvFile}
                        style={{ flex: 1 }}
                      />
                      <Button
                        leftSection={uploadLoading ? <Loader size={14} /> : <IconUpload size={16} />}
                        onClick={handleBulkUpload}
                        loading={uploadLoading}
                        disabled={!csvFile || uploadLoading}
                      >
                        Upload Reports
                      </Button>
                    </Group>
                  )}

                  {uploadResults && (
                    <Stack gap="sm">
                      <Alert icon={<IconCheck size={16} />} color="green" title="Upload Completed">
                        <Group gap="lg">
                          <div>
                            <MantineBadge color="green" size="lg">
                              {uploadResults.successCount} Success
                            </MantineBadge>
                          </div>
                          {uploadResults.failureCount > 0 && (
                            <div>
                              <MantineBadge color="red" size="lg">
                                {uploadResults.failureCount} Failed
                              </MantineBadge>
                            </div>
                          )}
                        </Group>
                      </Alert>

                      {uploadResults.details.length > 0 && (
                        <div>
                          <Text fw={600} mb="xs">Upload Details:</Text>
                          <Table striped highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Row</Table.Th>
                                <Table.Th>Booking ID</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Message</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {uploadResults.details.map((detail, idx) => (
                                <Table.Tr key={idx}>
                                  <Table.Td>{detail.rowNumber}</Table.Td>
                                  <Table.Td>{detail.bookingId}</Table.Td>
                                  <Table.Td>
                                    {detail.status === 'success' ? (
                                      <MantineBadge
                                        leftSection={<IconCheck size={12} />}
                                        color="green"
                                      >
                                        Success
                                      </MantineBadge>
                                    ) : (
                                      <MantineBadge
                                        leftSection={<IconX size={12} />}
                                        color="red"
                                      >
                                        Error
                                      </MantineBadge>
                                    )}
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm">
                                      {detail.message || detail.error}
                                    </Text>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                      )}

                      <Button
                        variant="light"
                        onClick={() => {
                          setUploadResults(null);
                          setCsvFile(null);
                        }}
                      >
                        Clear Results
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>

              {/* Pending Reports Section */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Pending Reports</Title>
                  {dashboard?.metrics?.pendingReports > 0 && (
                    <Badge color="yellow" size="lg">
                      {dashboard.metrics.pendingReports} Pending
                    </Badge>
                  )}
                </Group>
                <Stack gap="md">
                  {dashboard?.metrics?.pendingReports > 0 ? (
                    <Group>
                      <IconAlertCircle color="var(--mantine-color-yellow-6)" />
                      <Text>
                        You have {dashboard.metrics.pendingReports} completed test(s) waiting for report submission.
                      </Text>
                      <Button component="a" href="/bookings" variant="light">
                        View Bookings
                      </Button>
                    </Group>
                  ) : (
                    <Text c="dimmed" ta="center">All reports submitted!</Text>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="billing" pt="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={4} mb="md">Billing Overview</Title>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="lg" fw={500}>Total Revenue This Period</Text>
                  <Text size="xl" fw={700} c="teal">
                    {formatCurrency(dashboard?.metrics?.revenueThisMonth)}
                  </Text>
                </Group>
                <Text c="dimmed" size="sm">
                  Revenue is calculated from completed bookings. Use the invoice generation feature to create detailed invoices for your clients.
                </Text>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
