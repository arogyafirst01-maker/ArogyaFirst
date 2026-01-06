import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Table,
  Badge,
  ActionIcon,
  Loader,
  Alert,
  Select,
  Modal,
  Tabs,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconTrash,
  IconFileText,
  IconAlertCircle,
  IconDownload,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import useRole from '../hooks/useRole.js';
import { usePageTitle } from '../hooks/usePageTitle';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { DOCUMENT_TYPES, ROLES, CONSENT_STATUS } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { DocumentsConsentSection } from '../components/DocumentsConsentSection';
import { ConsentActionModal } from '../components/ConsentActionModal';
import { getConsentStatusColor } from '../utils/consentHelpers';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function DocumentsPage() {
  usePageTitle('My Documents');
  const { user } = useAuth();
  const { loading, error, fetchData } = useAuthFetch();
  const { isPatient, hasRole } = useRole();

  const [documents, setDocuments] = useState([]);
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [viewerModalOpened, setViewerModalOpened] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState('all');

  // Consent management state
  const [consents, setConsents] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [consentError, setConsentError] = useState(null); // Separate error state for consents
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [actionModalOpened, setActionModalOpened] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [notes, setNotes] = useState('');

  const isProvider = hasRole([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]);

  // Load documents
  const loadDocuments = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filterType && filterType !== 'ALL') {
        queryParams.append('documentType', filterType);
      }

      const res = await fetchData(`/api/documents/patient/${user._id}?${queryParams.toString()}`);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      showErrorNotification('Error', 'Failed to load documents');
    }
  };

  useEffect(() => {
    if (user?._id) {
      loadDocuments();
    }
  }, [user?._id, filterType]);

  // Handle document upload success
  const handleUploadSuccess = () => {
    setUploadModalOpened(false);
    loadDocuments();
    showSuccessNotification('Success', 'Document uploaded successfully');
  };

  // Handle document view
  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setViewerModalOpened(true);
  };

  // Handle document download
  const handleDownloadDocument = (document) => {
    window.open(document.fileUrl, '_blank');
  };

  // Handle document delete
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    setDeleteLoading(true);
    try {
      await fetchData(`/api/documents/${documentToDelete.documentId}`, {
        method: 'DELETE',
      });

      showSuccessNotification('Success', 'Document deleted successfully');
      setDeleteModalOpened(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      showErrorNotification('Error', 'Failed to delete document');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Load consents for patient
  const loadConsents = async () => {
    if (!isPatient || !user?._id) return;
    
    setLoadingConsents(true);
    setConsentError(null); // Clear previous consent errors
    try {
      const res = await fetchData(`/api/consent/patient/${user._id}`);
      setConsents(res.data?.consents || []);
    } catch (err) {
      console.error('Error loading consents:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load consent requests';
      setConsentError(errorMsg);
      showErrorNotification('Consent Error', errorMsg);
    } finally {
      setLoadingConsents(false);
    }
  };

  // Load consents when consent tab is active
  useEffect(() => {
    if (activeTab === 'consents' && isPatient) {
      loadConsents();
    }
  }, [activeTab, isPatient, user?._id]);

  // Handle consent action (approve, reject, revoke)
  const handleConsentAction = async () => {
    if (!selectedConsent || !actionType) return;

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
    }
  };

  // Get document type badge color
  const getDocumentTypeBadge = (type) => {
    const colors = {
      [DOCUMENT_TYPES.PRESCRIPTION]: 'blue',
      [DOCUMENT_TYPES.LAB_REPORT]: 'green',
      [DOCUMENT_TYPES.MEDICAL_RECORD]: 'orange',
      [DOCUMENT_TYPES.INSURANCE]: 'purple',
      [DOCUMENT_TYPES.ID_PROOF]: 'cyan',
      [DOCUMENT_TYPES.OTHER]: 'gray',
    };
    return colors[type] || 'gray';
  };

  // Get document source badge
  const getDocumentSourceBadge = (source) => {
    return source === 'PATIENT_UPLOAD' ? (
      <Badge color="blue" variant="light" size="sm">Self Upload</Badge>
    ) : (
      <Badge color="purple" variant="light" size="sm">Provider Submission</Badge>
    );
  };

  // Filter documents by tab
  const getFilteredDocuments = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (activeTab) {
      case 'recent':
        return documents.filter(doc => new Date(doc.uploadedAt) >= thirtyDaysAgo);
      case 'prescriptions':
        return documents.filter(doc => doc.documentType === DOCUMENT_TYPES.PRESCRIPTION);
      case 'reports':
        return documents.filter(doc => doc.documentType === DOCUMENT_TYPES.LAB_REPORT);
      default:
        return documents;
    }
  };

  const filteredDocuments = getFilteredDocuments();

  if (loading && documents.length === 0) {
    return (
      <Container size="xl" py="xl">
        <SkeletonCard count={3} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>My Documents</Title>
            <Text c="dimmed" size="sm">
              Manage your medical documents and records
            </Text>
          </div>
          {isPatient && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setUploadModalOpened(true)}
            >
              Upload Document
            </Button>
          )}
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">All Documents</Tabs.Tab>
            <Tabs.Tab value="recent">Recent (30 days)</Tabs.Tab>
            <Tabs.Tab value="prescriptions">Prescriptions</Tabs.Tab>
            <Tabs.Tab value="reports">Lab Reports</Tabs.Tab>
            {isPatient && <Tabs.Tab value="consents">Consent Requests</Tabs.Tab>}
          </Tabs.List>

          {/* Consent Requests Tab Panel */}
          {isPatient && (
            <Tabs.Panel value="consents" pt="md">
              {consentError && (
                <Alert icon={<IconAlertCircle size={16} />} title="Consent Error" color="red" mb="md">
                  {consentError}
                </Alert>
              )}
              <DocumentsConsentSection
                consents={consents}
                loading={loadingConsents}
                onApprove={(consent) => {
                  setSelectedConsent(consent);
                  setActionType('approve');
                  setActionModalOpened(true);
                }}
                onReject={(consent) => {
                  setSelectedConsent(consent);
                  setActionType('reject');
                  setActionModalOpened(true);
                }}
                onRevoke={(consent) => {
                  setSelectedConsent(consent);
                  setActionType('revoke');
                  setActionModalOpened(true);
                }}
              />
            </Tabs.Panel>
          )}
        </Tabs>

        {/* Filters */}
        <Group>
          <Select
            placeholder="Filter by type"
            value={filterType}
            onChange={setFilterType}
            data={[
              { value: 'ALL', label: 'All Types' },
              { value: DOCUMENT_TYPES.PRESCRIPTION, label: 'Prescription' },
              { value: DOCUMENT_TYPES.LAB_REPORT, label: 'Lab Report' },
              { value: DOCUMENT_TYPES.MEDICAL_RECORD, label: 'Medical Record' },
              { value: DOCUMENT_TYPES.INSURANCE, label: 'Insurance' },
              { value: DOCUMENT_TYPES.ID_PROOF, label: 'ID Proof' },
              { value: DOCUMENT_TYPES.OTHER, label: 'Other' },
            ]}
            clearable
            style={{ width: 200 }}
          />
        </Group>

        {/* Document Error Alert (separate from consent errors) */}
        {error && activeTab !== 'consents' && (
          <Alert icon={<IconAlertCircle size={16} />} title="Document Error" color="red">
            {error}
          </Alert>
        )}

        {/* Documents Table */}
        {filteredDocuments.length === 0 ? (
          <Alert icon={<IconFileText size={16} />} title="No Documents" color="blue">
            {activeTab === 'all'
              ? 'You have no documents yet. Upload your first document to get started.'
              : `No documents found in this category.`}
          </Alert>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Uploaded</Table.Th>
                  <Table.Th>Format</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
            <Table.Tbody>
              {filteredDocuments.map((doc) => (
                <Table.Tr key={doc.documentId}>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{doc.title}</Text>
                      {doc.description && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {doc.description}
                        </Text>
                      )}
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getDocumentTypeBadge(doc.documentType)} variant="light">
                      {doc.documentType}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{getDocumentSourceBadge(doc.uploadSource)}</Table.Td>
                  <Table.Td>{formatDateForDisplay(doc.uploadedAt)}</Table.Td>
                  <Table.Td>
                    <Badge variant="outline" size="sm">
                      {doc.format?.toUpperCase() || 'N/A'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {typeof doc.size === 'number' && Number.isFinite(doc.size)
                        ? `${(doc.size / 1024).toFixed(0)} KB`
                        : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleViewDocument(doc)}
                        title="View"
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Download"
                      >
                        <IconDownload size={16} />
                      </ActionIcon>
                      {isPatient && (
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDocumentToDelete(doc);
                            setDeleteModalOpened(true);
                          }}
                          title="Delete"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </motion.div>
        )}
      </Stack>

      {/* Upload Modal */}
      <DocumentUploadModal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        onSuccess={handleUploadSuccess}
        patientId={user?._id}
      />

      {/* Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          opened={viewerModalOpened}
          onClose={() => {
            setViewerModalOpened(false);
            setSelectedDocument(null);
          }}
          document={selectedDocument}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setDocumentToDelete(null);
        }}
        title="Delete Document"
      >
        <Stack>
          <Text>
            Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setDocumentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteDocument} loading={deleteLoading}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Consent Action Modal */}
      {isPatient && (
        <ConsentActionModal
          opened={actionModalOpened}
          onClose={() => {
            setActionModalOpened(false);
            setSelectedConsent(null);
            setActionType(null);
            setNotes('');
            setExpiryDate(null);
          }}
          consent={selectedConsent}
          actionType={actionType}
          expiryDate={expiryDate}
          onExpiryDateChange={setExpiryDate}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={handleConsentAction}
        />
      )}
    </Container>
  );
}
