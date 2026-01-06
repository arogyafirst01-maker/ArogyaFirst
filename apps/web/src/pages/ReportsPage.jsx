import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Table,
  Modal,
  TextInput,
  Textarea,
  Select,
  FileInput,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Paper,
  Loader,
  Alert,
  Tabs,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconDownload,
  IconTrash,
  IconAlertCircle,
  IconFileTypePdf,
  IconUpload,
  IconSearch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import useAuthFetch from '../hooks/useAuthFetch';
import { usePageTitle } from '../hooks/usePageTitle';
import { DOCUMENT_TYPES, formatDateForDisplay } from '@arogyafirst/shared';

export default function ReportsPage() {
  usePageTitle('Lab Reports');
  const { user } = useAuth();
  const { fetchData, loading } = useAuthFetch();

  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [bookingId, setBookingId] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('LAB_REPORT');
  const [file, setFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, activeTab]);

  const loadReports = async () => {
    try {
      const response = await fetchData('/api/documents/lab');
      setReports(response.data?.documents || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load reports',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(r => r.documentType === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const patientName = r.patientId?.name?.toLowerCase() || '';
        const title = r.title?.toLowerCase() || '';
        const bookingId = r.bookingId?.bookingId?.toLowerCase() || '';
        return patientName.includes(query) || title.includes(query) || bookingId.includes(query);
      });
    }

    setFilteredReports(filtered);
  };

  const handleUploadReport = async () => {
    if (!file || !title || !patientEmail) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please fill all required fields',
        color: 'red',
      });
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file); // Changed from 'file' to 'document'
      formData.append('patientEmail', patientEmail);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('documentType', documentType);
      if (bookingId) formData.append('bookingId', bookingId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        
        // Handle validation errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          throw new Error(errorMessages);
        }
        
        throw new Error(errorData.message || errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      notifications.show({
        title: 'Success',
        message: 'Report uploaded successfully',
        color: 'green',
      });

      resetForm();
      setModalOpened(false);
      loadReports();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to upload report',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteReport = async (documentId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      await fetchData(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      notifications.show({
        title: 'Success',
        message: 'Report deleted successfully',
        color: 'green',
      });

      loadReports();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete report',
        color: 'red',
        icon: <IconAlertCircle />,
      });
    }
  };

  const resetForm = () => {
    setBookingId('');
    setPatientEmail('');
    setTitle('');
    setDescription('');
    setDocumentType('LAB_REPORT');
    setFile(null);
  };

  const getDocumentTypeBadge = (type) => {
    const colors = {
      'LAB_REPORT': 'blue',
      'MEDICAL_RECORD': 'cyan',
      'PRESCRIPTION': 'green',
      'INSURANCE': 'grape',
      'ID_PROOF': 'violet',
      'OTHER': 'gray',
    };
    return <Badge color={colors[type] || 'gray'}>{type?.replace('_', ' ')}</Badge>;
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Lab Reports Management</Title>
          <Text c="dimmed">Upload and manage patient lab reports</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          Upload Report
        </Button>
      </Group>

      <Paper shadow="xs" p="md" withBorder mb="lg">
        <TextInput
          placeholder="Search by patient name, title, or booking ID..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Paper>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all">
            All Reports ({reports.length})
          </Tabs.Tab>
          <Tabs.Tab value="LAB_REPORT">
            Lab Reports ({reports.filter(r => r.documentType === 'LAB_REPORT').length})
          </Tabs.Tab>
          <Tabs.Tab value="MEDICAL_RECORD">
            Medical Records ({reports.filter(r => r.documentType === 'MEDICAL_RECORD').length})
          </Tabs.Tab>
          <Tabs.Tab value="PRESCRIPTION">
            Prescriptions ({reports.filter(r => r.documentType === 'PRESCRIPTION').length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Single dynamic panel for all tabs */}
        {['all', 'LAB_REPORT', 'MEDICAL_RECORD', 'PRESCRIPTION'].map(tabValue => (
          <Tabs.Panel key={tabValue} value={tabValue} pt="md">
            {loading ? (
              <Group justify="center" py="xl">
                <Loader size="lg" />
              </Group>
            ) : filteredReports.length === 0 ? (
              <Paper shadow="xs" p="xl" withBorder>
                <Stack align="center" gap="md">
                  <IconFileTypePdf size={48} color="var(--mantine-color-gray-5)" />
                  <Title order={4}>No reports found</Title>
                  <Text c="dimmed" ta="center">
                    {searchQuery ? 'Try adjusting your search' : 'Upload your first report to get started'}
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Paper shadow="xs" withBorder>
                <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Patient</Table.Th>
                    <Table.Th>Report Title</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Booking ID</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredReports.map((report) => (
                    <Table.Tr key={report._id}>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>{report.patientId?.name || 'Unknown'}</Text>
                          <Text size="xs" c="dimmed">{report.patientId?.email}</Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>{report.title}</Text>
                          {report.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>{report.description}</Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>{getDocumentTypeBadge(report.documentType)}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{report.bookingId?.bookingId || 'N/A'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateForDisplay(report.createdAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            component="a"
                            href={report.fileUrl}
                            target="_blank"
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="green"
                            component="a"
                            href={report.fileUrl}
                            download
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteReport(report.documentId)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}
          </Tabs.Panel>
        ))}
      </Tabs>

      {/* Upload Report Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          resetForm();
        }}
        title="Upload Lab Report"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Patient Email"
            placeholder="patient@example.com"
            type="email"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            required
          />

          <TextInput
            label="Booking ID (Optional)"
            placeholder="BK-2025-001"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          />

          <Select
            label="Document Type"
            value={documentType}
            onChange={setDocumentType}
            data={[
              { value: 'LAB_REPORT', label: 'Lab Report' },
              { value: 'MEDICAL_RECORD', label: 'Medical Record' },
              { value: 'PRESCRIPTION', label: 'Prescription' },
              { value: 'INSURANCE', label: 'Insurance' },
              { value: 'ID_PROOF', label: 'ID Proof' },
              { value: 'OTHER', label: 'Other' },
            ]}
            required
          />

          <TextInput
            label="Report Title"
            placeholder="e.g., Complete Blood Count"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Description"
            placeholder="Additional details about the report..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <FileInput
            label="Upload File"
            placeholder="Select PDF file"
            value={file}
            onChange={setFile}
            accept="application/pdf,image/*"
            leftSection={<IconUpload size={16} />}
            required
          />

          <Alert color="blue" icon={<IconAlertCircle />}>
            Accepted formats: PDF, JPEG, PNG. Max size: 10MB
          </Alert>

          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadReport}
              loading={uploadLoading}
              leftSection={<IconUpload size={16} />}
            >
              Upload Report
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
