import { Container, Title, Tabs, Grid, Card, Text, Group, Badge, Stack, Table, Loader, Button, Select, Modal, Menu, Divider, FileInput, Progress, Alert, Accordion } from '@mantine/core';
import { IconPill, IconCalendar, IconFileText, IconCurrencyRupee, IconAlertCircle, IconCheck, IconPackage, IconDownload, IconFileTypeCsv, IconFileTypePdf, IconUpload, IconFileDownload } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { notifications } from '@mantine/notifications';
import InvoiceGenerationModal from '../components/InvoiceGenerationModal.jsx';
import { DatePickerInput } from '@mantine/dates';

const MetricCard = ({ icon: Icon, label, value, loading, color = 'blue', alert = false }) => (
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
      <Group>
        <Text size="xl" fw={700}>
          {value}
        </Text>
        {alert && <IconAlertCircle size={20} color="var(--mantine-color-red-6)" />}
      </Group>
    )}
  </Card>
);

const getPrescriptionStatusColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'FULFILLED':
      return 'green';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
};

export default function PharmacyDashboardPage() {
  usePageTitle('Pharmacy Dashboard');
  const { user } = useAuth();
  const { fetchData, loading } = useAuthFetch();
  
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30'); // Last 30 days
  const [invoiceModalOpened, setInvoiceModalOpened] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportReportType, setExportReportType] = useState('prescriptions');
  const [exportLoading, setExportLoading] = useState(false);
  
  // Bulk upload states
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  
  const loadDashboard = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      let url = `/api/pharmacies/${user._id}/dashboard`;
      
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

  const handleFulfillPrescription = async (prescriptionBusinessId, prescriptionMongoId) => {
    // prescriptionBusinessId is the business identifier for the fulfill API route
    // prescriptionMongoId is the MongoDB _id for invoice generation
    try {
      await fetchData(`/api/prescriptions/${prescriptionBusinessId}/fulfill`, {
        method: 'PUT',
      });

      notifications.show({
        title: 'Success',
        message: 'Prescription fulfilled successfully',
        color: 'green',
      });

      // Open invoice modal for this prescription (pass MongoDB _id for backend validation)
      setSelectedPrescription(prescriptionMongoId);
      setInvoiceModalOpened(true);

      // Reload dashboard
      loadDashboard();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fulfill prescription',
        color: 'red',
      });
    }
  };

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
    // Inventory doesn't require date range
    if (exportReportType !== 'inventory' && (!exportDateRange[0] || !exportDateRange[1])) {
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
      });
      
      if (exportReportType !== 'inventory') {
        params.append('startDate', exportDateRange[0].toISOString());
        params.append('endDate', exportDateRange[1].toISOString());
      }

      const response = await fetch(`/api/pharmacies/${user._id}/export?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharmacy-${exportReportType}-${Date.now()}.${format}`;
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

  // CSV Template Generator
  const generateCSVTemplate = () => {
    const headers = ['name', 'genericName', 'manufacturer', 'stock', 'reorderLevel', 'price', 'batchNumber', 'expiryDate'];
    const sampleRow = ['Aspirin', 'Acetylsalicylic Acid', 'ABC Pharma', '100', '20', '50', 'BATCH001', '2025-12-31'];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medicine-bulk-upload-template.csv';
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

  // Bulk Upload Handler
  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      notifications.show({
        title: 'Error',
        message: 'Please select a CSV file',
        color: 'red',
      });
      return;
    }

    setBulkUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', bulkUploadFile);

      const response = await fetch('/api/pharmacies/bulk-upload-medicines', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setBulkUploadResults(result.data);
        setBulkUploadFile(null);

        notifications.show({
          title: 'Success',
          message: `Upload completed: ${result.data.successCount} success, ${result.data.failureCount} failures`,
          color: 'green',
        });
        loadDashboard();
      } else {
        const errorMessage = result.message || (result.errors && result.errors[0]) || 'Upload failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to upload medicines',
        color: 'red',
      });
    } finally {
      setBulkUploadLoading(false);
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
          <Title order={2}>Pharmacy Dashboard</Title>
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
                    { value: 'prescriptions', label: 'Prescriptions Report' },
                    { value: 'inventory', label: 'Inventory Report' },
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
                  disabled={exportReportType === 'inventory'}
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
            <Tabs.Tab value="prescriptions">Prescriptions</Tabs.Tab>
            <Tabs.Tab value="billing">Billing</Tabs.Tab>
            <Tabs.Tab value="inventory">Inventory Alerts</Tabs.Tab>
            <Tabs.Tab value="bulk-upload">Bulk Upload</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <Stack gap="lg">
              {/* Metrics Cards */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconPill}
                    label="Total Prescriptions"
                    value={dashboard?.metrics?.totalPrescriptionsThisMonth || 0}
                    loading={loading}
                    color="var(--mantine-color-blue-6)"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconCalendar}
                    label="Pending"
                    value={dashboard?.metrics?.pendingPrescriptions || 0}
                    loading={loading}
                    color="var(--mantine-color-yellow-6)"
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    icon={IconCheck}
                    label="Fulfilled"
                    value={dashboard?.metrics?.statusBreakdown?.FULFILLED || 0}
                    loading={loading}
                    color="var(--mantine-color-green-6)"
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

              {/* Inventory Alerts Summary */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <MetricCard
                    icon={IconPackage}
                    label="Low Stock Items"
                    value={dashboard?.metrics?.lowStockCount || 0}
                    loading={loading}
                    color="var(--mantine-color-red-6)"
                    alert={dashboard?.metrics?.lowStockCount > 0}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <MetricCard
                    icon={IconAlertCircle}
                    label="Expiring Soon"
                    value={dashboard?.metrics?.expiringCount || 0}
                    loading={loading}
                    color="var(--mantine-color-orange-6)"
                    alert={dashboard?.metrics?.expiringCount > 0}
                  />
                </Grid.Col>
              </Grid>

              {/* Prescriptions Over Time Chart */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Prescriptions Over Time</Title>
                {dashboard?.prescriptionsOverTime?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboard.prescriptionsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="var(--mantine-color-blue-6)" name="Prescriptions" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">No data available</Text>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="prescriptions" pt="lg">
            <Stack gap="lg">
              {/* Pending Prescriptions Queue */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Pending Prescriptions Queue</Title>
                {dashboard?.pendingPrescriptions?.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Prescription ID</Table.Th>
                        <Table.Th>Patient</Table.Th>
                        <Table.Th>Doctor</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.pendingPrescriptions.map((prescription) => (
                        <Table.Tr key={prescription._id}>
                          <Table.Td>{prescription.prescriptionId}</Table.Td>
                          <Table.Td>{prescription.patientId?.name || 'N/A'}</Table.Td>
                          <Table.Td>{prescription.doctorId?.name || 'N/A'}</Table.Td>
                          <Table.Td>{formatDate(prescription.createdAt)}</Table.Td>
                          <Table.Td>
                            <Badge color={getPrescriptionStatusColor(prescription.status)}>
                              {prescription.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                color="blue"
                              >
                                View
                              </Button>
                              <Button
                                size="xs"
                                variant="filled"
                                color="green"
                                leftSection={<IconCheck size={14} />}
                                onClick={() => handleFulfillPrescription(prescription.prescriptionId, prescription._id)}
                              >
                                Fulfill
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center">No pending prescriptions</Text>
                )}
              </Card>

              {/* Recent Fulfilled Prescriptions */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Recently Fulfilled Prescriptions</Title>
                {dashboard?.recentFulfilledPrescriptions?.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Prescription ID</Table.Th>
                        <Table.Th>Patient</Table.Th>
                        <Table.Th>Fulfilled On</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.recentFulfilledPrescriptions.map((prescription) => (
                        <Table.Tr key={prescription._id}>
                          <Table.Td>{prescription.prescriptionId}</Table.Td>
                          <Table.Td>{prescription.patientId?.name || 'N/A'}</Table.Td>
                          <Table.Td>{formatDate(prescription.updatedAt)}</Table.Td>
                          <Table.Td>
                            <Badge color={getPrescriptionStatusColor(prescription.status)}>
                              {prescription.status}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center">No fulfilled prescriptions</Text>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="billing" pt="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={4}>Billing Overview</Title>
                <Button
                  variant="filled"
                  leftSection={<IconFileText size={16} />}
                  onClick={() => {
                    setSelectedPrescription(null);
                    setInvoiceModalOpened(true);
                  }}
                >
                  Generate Invoice
                </Button>
              </Group>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="lg" fw={500}>Total Revenue This Period</Text>
                  <Text size="xl" fw={700} c="teal">
                    {formatCurrency(dashboard?.metrics?.revenueThisMonth)}
                  </Text>
                </Group>
                <Text c="dimmed" size="sm">
                  Revenue is calculated from fulfilled prescriptions. Click "Generate Invoice" to create detailed invoices for your clients.
                </Text>
              </Stack>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="inventory" pt="lg">
            <Stack gap="lg">
              {/* Low Stock Alerts */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Low Stock Medicines</Title>
                  {dashboard?.inventoryAlerts?.lowStock?.length > 0 && (
                    <Badge color="red" size="lg">
                      {dashboard.inventoryAlerts.lowStock.length} Items
                    </Badge>
                  )}
                </Group>
                {dashboard?.inventoryAlerts?.lowStock?.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Medicine Name</Table.Th>
                        <Table.Th>Current Stock</Table.Th>
                        <Table.Th>Reorder Level</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.inventoryAlerts.lowStock.map((item) => (
                        <Table.Tr key={item._id || item.id || item.name}>
                          <Table.Td>{item.medicineName || item.name}</Table.Td>
                          <Table.Td>
                            <Text c="red" fw={500}>{item.currentStock ?? item.stock ?? 0}</Text>
                          </Table.Td>
                          <Table.Td>{item.reorderLevel ?? item.reorder_level ?? '-'}</Table.Td>
                          <Table.Td>
                            <Badge color="red" leftSection={<IconAlertCircle size={12} />}>
                              Low Stock
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center">No low stock alerts</Text>
                )}
              </Card>

              {/* Expiring Soon Alerts */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={4}>Medicines Expiring Soon (Next 30 Days)</Title>
                  {dashboard?.inventoryAlerts?.expiring?.length > 0 && (
                    <Badge color="orange" size="lg">
                      {dashboard.inventoryAlerts.expiring.length} Items
                    </Badge>
                  )}
                </Group>
                {dashboard?.inventoryAlerts?.expiring?.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Medicine Name</Table.Th>
                        <Table.Th>Current Stock</Table.Th>
                        <Table.Th>Expiry Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {dashboard.inventoryAlerts.expiring.map((item) => (
                        <Table.Tr key={item._id || item.id || item.name}>
                          <Table.Td>{item.medicineName || item.name}</Table.Td>
                          <Table.Td>{item.currentStock ?? item.stock ?? 0}</Table.Td>
                          <Table.Td>
                            <Text c="orange" fw={500}>{formatDate(item.expiryDate ?? item.expiry)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="orange" leftSection={<IconAlertCircle size={12} />}>
                              Expiring Soon
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center">No expiring medicines</Text>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>

          {/* Bulk Upload Tab */}
          <Tabs.Panel value="bulk-upload" pt="lg">
            <Stack gap="lg">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={4} mb="xs">Bulk Upload Medicines</Title>
                      <Text size="sm" c="dimmed">Upload multiple medicines at once using a CSV file</Text>
                    </div>
                    <Button
                      leftSection={<IconFileDownload size={16} />}
                      onClick={generateCSVTemplate}
                      variant="light"
                    >
                      Download Template
                    </Button>
                  </Group>

                  <Card withBorder p="md" radius="md" bg="blue.0">
                    <Stack gap="sm">
                      <Text fw={500} size="sm">CSV Format Requirements:</Text>
                      <Text size="xs" c="dimmed">
                        • Column names: <strong>name</strong>, <strong>genericName</strong>, <strong>manufacturer</strong>, <strong>stock</strong>, <strong>reorderLevel</strong>, <strong>price</strong>, <strong>batchNumber</strong>, <strong>expiryDate</strong>
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Required fields: <strong>name</strong>, <strong>stock</strong>, <strong>reorderLevel</strong>, <strong>price</strong>
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Numeric fields (stock, reorderLevel, price) must be valid numbers ≥ 0
                      </Text>
                      <Text size="xs" c="dimmed">
                        • Expiry date (if provided) must be in format YYYY-MM-DD and in the future
                      </Text>
                    </Stack>
                  </Card>

                  <FileInput
                    label="Select CSV File"
                    placeholder="Choose file"
                    accept="text/csv,.csv"
                    value={bulkUploadFile}
                    onChange={setBulkUploadFile}
                    leftSection={<IconUpload size={16} />}
                  />

                  <Button
                    onClick={handleBulkUpload}
                    loading={bulkUploadLoading}
                    disabled={!bulkUploadFile}
                    leftSection={<IconUpload size={16} />}
                  >
                    Upload Medicines
                  </Button>

                  {bulkUploadResults && (
                    <Stack gap="md">
                      <Alert
                        color={bulkUploadResults.failureCount === 0 ? 'green' : 'yellow'}
                        title={bulkUploadResults.failureCount === 0 ? 'Upload Successful' : 'Upload Completed with Errors'}
                      >
                        <Stack gap="xs">
                          <Text size="sm">
                            <strong>Successful:</strong> {bulkUploadResults.successCount} medicines
                          </Text>
                          {bulkUploadResults.failureCount > 0 && (
                            <Text size="sm">
                              <strong>Failed:</strong> {bulkUploadResults.failureCount} records
                            </Text>
                          )}
                        </Stack>
                      </Alert>

                      {bulkUploadResults.details?.length > 0 && (
                        <Accordion>
                          <Accordion.Item value="details" label={`Detailed Results (${bulkUploadResults.details.length} rows)`}>
                            <Table striped highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Row</Table.Th>
                                  <Table.Th>Medicine Name</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                  <Table.Th>Message</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {bulkUploadResults.details.map((detail, idx) => (
                                  <Table.Tr key={idx} bg={detail.status === 'success' ? 'green.0' : 'red.0'}>
                                    <Table.Td>{detail.rowNumber}</Table.Td>
                                    <Table.Td fw={500}>{detail.medicineName}</Table.Td>
                                    <Table.Td>
                                      <Badge color={detail.status === 'success' ? 'green' : 'red'}>
                                        {detail.status === 'success' ? 'Success' : 'Error'}
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td size="sm">{detail.message || detail.error}</Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </Accordion.Item>
                        </Accordion>
                      )}

                      <Button
                        variant="light"
                        onClick={() => setBulkUploadResults(null)}
                      >
                        Clear Results
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <InvoiceGenerationModal
        opened={invoiceModalOpened}
        onClose={() => {
          setInvoiceModalOpened(false);
          setSelectedPrescription(null);
          loadDashboard();
        }}
        providerId={user?._id}
        prescriptionId={selectedPrescription}
      />
    </Container>
  );
}
