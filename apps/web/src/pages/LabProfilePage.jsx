import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  TextInput,
  Alert,
  Loader,
  Divider,
  Tabs,
  Table,
  Modal,
  Select,
  Badge,
  ActionIcon,
  Card,
  Switch
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconFlask,
  IconTool,
  IconAlertCircle,
  IconCalendar,
  IconEye,
  IconUpload,
  IconDownload,
  IconArrowsExchange,
  IconFileText,
  IconShieldCheck,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import SlotManagement from '../components/SlotManagement.jsx';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { formatDateForDisplay, MACHINE_STATUS, BOOKING_TYPES, DOCUMENT_TYPES } from '@arogyafirst/shared';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConsentRequestModal } from '../components/ConsentRequestModal';
import { ProviderConsentRequestModal } from '../components/ProviderConsentRequestModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { getConsentStatusColor } from '../utils/consentHelpers';
import ReferralModal from '../components/ReferralModal';
import ReferralDetailsModal from '../components/ReferralDetailsModal';
import { getReferralStatusColor, getReferralTypeLabel } from '../utils/referralHelpers';
import { REFERRAL_STATUS } from '@arogyafirst/shared';

export default function LabProfilePage() {
  usePageTitle('Lab Profile');
  const { user, refreshUser } = useAuth();
  const { loading: apiLoading, error: apiError, fetchData } = useAuthFetch();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [machineModalType, setMachineModalType] = useState('add');
  const [machineModalData, setMachineModalData] = useState({});
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [machinesList, setMachinesList] = useState([]);

  // Patient document submission state (for lab reports)
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [documentUploadModalOpened, setDocumentUploadModalOpened] = useState(false);
  const [consentModalOpened, setConsentModalOpened] = useState(false);
  const [requestConsentModalOpened, setRequestConsentModalOpened] = useState(false);
  const [patientDocuments, setPatientDocuments] = useState([]);
  const [loadingPatientDocs, setLoadingPatientDocs] = useState(false);
  const [providerConsents, setProviderConsents] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [viewerOpened, setViewerOpened] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Referral states
  const [sentReferrals, setSentReferrals] = useState([]);
  const [receivedReferrals, setReceivedReferrals] = useState([]);
  const [referralStats, setReferralStats] = useState({ sent: 0, received: 0, pending: 0 });
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const profileForm = useForm({
    initialValues: {
      name: user?.labData?.name || '',
      location: user?.labData?.location || '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
    },
  });

  const machineForm = useForm({
    initialValues: {
      name: '',
      model: '',
      manufacturer: '',
      purchaseDate: null,
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      status: MACHINE_STATUS.OPERATIONAL,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      model: (value) => (value.trim().length > 0 ? null : 'Model is required'),
    },
  });

  const facilityForm = useForm({
    initialValues: {
      facility: '',
    },
    validate: {
      facility: (value) => (value.trim().length > 0 ? null : 'Facility name is required'),
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setValues({
        name: user.labData?.name || '',
        location: user.labData?.location || '',
      });
    }
  }, [user]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return formatDateForDisplay(date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case MACHINE_STATUS.OPERATIONAL: return 'green';
      case MACHINE_STATUS.MAINTENANCE: return 'yellow';
      case MACHINE_STATUS.OUT_OF_SERVICE: return 'red';
      default: return 'gray';
    }
  };

  const openAddMachineModal = () => {
    setMachineModalType('add');
    setMachineModalData({});
    machineForm.reset();
    setMachineModalOpen(true);
  };

  const openEditMachineModal = (machine) => {
    setMachineModalType('edit');
    setMachineModalData(machine);
    machineForm.setValues({
      name: machine.name || '',
      model: machine.model || '',
      manufacturer: machine.manufacturer || '',
      purchaseDate: machine.purchaseDate ? new Date(machine.purchaseDate) : null,
      lastMaintenanceDate: machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate) : null,
      nextMaintenanceDate: machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate) : null,
      status: machine.status || MACHINE_STATUS.OPERATIONAL,
    });
    setMachineModalOpen(true);
  };

  // Fetch machines from server to leverage server-side filtering/sorting.
  const fetchMachines = async () => {
    try {
      const url = `/api/labs/machines${filterActiveOnly ? '?activeOnly=true' : ''}`;
      const data = await fetchData(url);
      if (data) {
        setMachinesList(data.data?.machines || []);
      }
    } catch (err) {
      // error handled by fetchData hook
    }
  };

  useEffect(() => {
    if (activeTab === 'machines') {
      fetchMachines();
    }
  }, [activeTab, filterActiveOnly]);

  // Load referrals for this lab
  const loadReferrals = async () => {
    if (!user?._id) return;
    setLoadingReferrals(true);
    try {
      // Fetch sent referrals
      const sentResponse = await fetchData(`/api/referrals/source/${user._id}?limit=5`);
      if (sentResponse) {
        setSentReferrals(sentResponse.data || []);
      }
      
      // Fetch received referrals
      const receivedResponse = await fetchData(`/api/referrals/target/${user._id}?limit=5`);
      if (receivedResponse) {
        setReceivedReferrals(receivedResponse.data || []);
      }
      
      // Calculate stats
      const sentTotal = await fetchData(`/api/referrals/source/${user._id}`);
      const receivedTotal = await fetchData(`/api/referrals/target/${user._id}`);
      const receivedPending = await fetchData(`/api/referrals/target/${user._id}?status=PENDING`);
      
      const sentCount = sentTotal?.data?.length || 0;
      const receivedCount = receivedTotal?.data?.length || 0;
      const pendingCount = receivedPending?.data?.length || 0;
      
      setReferralStats({ sent: sentCount, received: receivedCount, pending: pendingCount });
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Load patient lab reports submitted by this lab
  const loadPatientDocuments = async () => {
    if (!selectedPatientId || !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      return;
    }
    
    setLoadingPatientDocs(true);
    try {
      const res = await fetchData(`/api/documents/patient/${selectedPatientId}`);
      // Filter for lab reports uploaded by this provider
      const labReports = (res.data?.documents || []).filter(
        doc => doc.uploadSource === 'PROVIDER_SUBMISSION' && 
               doc.uploadedBy?._id === user._id &&
               doc.documentType === DOCUMENT_TYPES.LAB_REPORT
      );
      setPatientDocuments(labReports);
    } catch (err) {
      console.error('Error loading patient documents:', err);
      showErrorNotification('Error', 'Failed to load patient lab reports');
    } finally {
      setLoadingPatientDocs(false);
    }
  };

  // Load consent requests sent by this lab
  const loadProviderConsents = async () => {
    setLoadingConsents(true);
    try {
      const res = await fetchData(`/api/consent/provider/${user._id}`);
      setProviderConsents(res.data?.consents || []);
    } catch (err) {
      console.error('Error loading consents:', err);
      showErrorNotification('Error', 'Failed to load consent requests');
    } finally {
      setLoadingConsents(false);
    }
  };

  // Handle patient lab report upload success
  const handlePatientDocumentUploadSuccess = () => {
    setDocumentUploadModalOpened(false);
    loadPatientDocuments();
    showSuccessNotification('Success', 'Lab report submitted successfully');
  };

  // Load data when patient ID changes
  useEffect(() => {
    if (activeTab === 'reports' && selectedPatientId && selectedPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      loadPatientDocuments();
      loadProviderConsents();
    }
    if (activeTab === 'referrals') {
      loadReferrals();
    }
  }, [selectedPatientId, activeTab]);

  const closeModal = () => {
    setMachineModalOpen(false);
    setFacilityModalOpen(false);
    setMachineModalData({});
    machineForm.reset();
    facilityForm.reset();
  };

  const handleUpdateProfile = async (values) => {
    const data = await fetchData('/api/labs/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (data) {
      showSuccessNotification('Profile updated successfully');
      refreshUser();
      setIsEditing(false);
    } else {
      showErrorNotification('Failed to update profile');
    }
  };

  const handleAddMachine = async (data) => {
    const payload = {
      ...data,
      purchaseDate: data.purchaseDate ? data.purchaseDate.toISOString() : null,
      lastMaintenanceDate: data.lastMaintenanceDate ? data.lastMaintenanceDate.toISOString() : null,
      nextMaintenanceDate: data.nextMaintenanceDate ? data.nextMaintenanceDate.toISOString() : null,
    };
    const result = await fetchData('/api/labs/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (result) {
      showSuccessNotification('Machine added successfully');
      refreshUser();
      if (activeTab === 'machines') await fetchMachines();
      closeModal();
    } else {
      showErrorNotification('Failed to add machine');
    }
  };

  const handleUpdateMachine = async (id, data) => {
    const payload = {
      ...data,
      purchaseDate: data.purchaseDate ? data.purchaseDate.toISOString() : null,
      lastMaintenanceDate: data.lastMaintenanceDate ? data.lastMaintenanceDate.toISOString() : null,
      nextMaintenanceDate: data.nextMaintenanceDate ? data.nextMaintenanceDate.toISOString() : null,
    };
    const result = await fetchData(`/api/labs/machines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (result) {
      showSuccessNotification('Machine updated successfully');
      if (activeTab === 'machines') {
        await fetchMachines();
      } else {
        await refreshUser();
      }
      closeModal();
    } else {
      showErrorNotification('Failed to update machine');
    }
  };

  const handleDeleteMachine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return;
    const result = await fetchData(`/api/labs/machines/${id}`, {
      method: 'DELETE',
    });
    if (result) {
      showSuccessNotification('Machine deleted successfully');
      if (activeTab === 'machines') {
        await fetchMachines();
      } else {
        await refreshUser();
      }
    } else {
      showErrorNotification('Failed to delete machine');
    }
  };

  const handleAddFacility = async (data) => {
    const result = await fetchData('/api/labs/facilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (result) {
      showSuccessNotification('Facility added successfully');
      refreshUser();
      closeModal();
    } else {
      showErrorNotification('Failed to add facility');
    }
  };

  const handleDeleteFacility = async (index) => {
    if (!window.confirm('Are you sure you want to delete this facility?')) return;
    const result = await fetchData(`/api/labs/facilities/${index}`, {
      method: 'DELETE',
    });
    if (result) {
      showSuccessNotification('Facility deleted successfully');
      refreshUser();
    } else {
      showErrorNotification('Failed to delete facility');
    }
  };

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  const labData = user.labData || {};
  const filteredMachines = machinesList?.filter(machine => !filterActiveOnly || machine.isActive) || [];

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="md">
        <Title order={2} mb="md">
          Lab Profile
        </Title>
        {apiError && <Alert color="red" mb="md">{apiError}</Alert>}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="info" icon={<IconFlask size={16} />}>
              Info
            </Tabs.Tab>
            <Tabs.Tab value="machines" icon={<IconTool size={16} />}>
              Machines
            </Tabs.Tab>
            <Tabs.Tab value="facilities" icon={<IconAlertCircle size={16} />}>
              Facilities
            </Tabs.Tab>
            <Tabs.Tab value="reports" icon={<IconFileText size={16} />}>
              Reports
            </Tabs.Tab>
            <Tabs.Tab value="referrals" icon={<IconArrowsExchange size={16} />}>
              Referrals
            </Tabs.Tab>
            <Tabs.Tab value="slots" icon={<IconCalendar size={16} />}>Test Slots</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="info" pt="md">
            {isEditing ? (
              <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                <Stack>
                  <TextInput label="Name" {...profileForm.getInputProps('name')} />
                  <TextInput label="Location" {...profileForm.getInputProps('location')} />
                  <TextInput label="Email" value={user.email} disabled />
                  <Group>
                    <Button type="submit" loading={apiLoading}>
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </form>
            ) : (
              <Stack>
                <Group>
                  <Text fw={500}>Name:</Text>
                  <Text>{labData.name || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Email:</Text>
                  <Text>{user.email}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Location:</Text>
                  <Text>{labData.location || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Unique ID:</Text>
                  <Text>{user.uniqueId}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Verification Status:</Text>
                  <Badge color="green">Verified</Badge>
                </Group>
                <Button leftIcon={<IconEdit size={16} />} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="machines" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={openAddMachineModal}>
                Add Machine
              </Button>
              <Switch label="Show active only" checked={filterActiveOnly} onChange={(event) => setFilterActiveOnly(event.currentTarget.checked)} />
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Model</th>
                  <th>Manufacturer</th>
                  <th>Purchase Date</th>
                  <th>Last Maintenance</th>
                  <th>Next Maintenance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMachines.length ? (
                  filteredMachines.map((machine) => (
                    <tr key={machine._id || machine.addedAt}>
                      <td>{machine.name}</td>
                      <td>{machine.model}</td>
                      <td>{machine.manufacturer || 'N/A'}</td>
                      <td>{formatDate(machine.purchaseDate)}</td>
                      <td>{formatDate(machine.lastMaintenanceDate)}</td>
                      <td>{formatDate(machine.nextMaintenanceDate)}</td>
                      <td>
                        <Badge color={getStatusColor(machine.status)}>
                          {machine.status}
                        </Badge>
                      </td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditMachineModal(machine)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteMachine(machine._id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>No machines added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="facilities" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => setFacilityModalOpen(true)}>
                Add Facility
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labData.facilities?.length ? (
                  labData.facilities.map((facility, index) => (
                    <tr key={index}>
                      <td>{facility}</td>
                      <td>
                        <ActionIcon color="red" onClick={() => handleDeleteFacility(index)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>No facilities added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="reports" pt="md">
            <Stack spacing="md">
              <Alert icon={<IconFileText size={16} />} color="blue">
                Submit lab reports directly to patient accounts. Patient must have granted you consent to submit documents.
              </Alert>

              <Group>
                <TextInput
                  label="Patient ID"
                  placeholder="Enter patient's MongoDB ID (24 characters)"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.currentTarget.value)}
                  style={{ flex: 1 }}
                  error={
                    selectedPatientId &&
                    !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)
                      ? 'Invalid Patient ID format (must be 24-character hex)'
                      : null
                  }
                />
                <Button
                  leftIcon={<IconUpload size={16} />}
                  onClick={() => setDocumentUploadModalOpened(true)}
                  disabled={
                    !selectedPatientId ||
                    !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)
                  }
                  mt={24}
                >
                  Submit Report
                </Button>
                <Button
                  leftIcon={<IconShieldCheck size={16} />}
                  onClick={() => setRequestConsentModalOpened(true)}
                  variant="light"
                  disabled={
                    !selectedPatientId ||
                    !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)
                  }
                  mt={24}
                >
                  Request Consent
                </Button>
                <Button
                  onClick={() => setConsentModalOpened(true)}
                  variant="outline"
                  mt={24}
                >
                  View Sent Requests
                </Button>
              </Group>

              <div>
                <Text weight={600} size="lg" mb="sm">
                  Submitted Lab Reports
                </Text>
                {loadingPatientDocs ? (
                  <Text color="dimmed">Loading...</Text>
                ) : selectedPatientId &&
                  selectedPatientId.match(/^[0-9a-fA-F]{24}$/) ? (
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Uploaded Date</th>
                        <th>Patient</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientDocuments.length > 0 ? (
                        patientDocuments.map((doc) => (
                          <tr key={doc._id}>
                            <td>{doc.title}</td>
                            <td>
                              <Badge>{doc.documentType}</Badge>
                            </td>
                            <td>{formatDate(doc.createdAt)}</td>
                            <td>
                              <Text size="xs" color="dimmed">
                                {doc.patientId?._id || selectedPatientId}
                              </Text>
                            </td>
                            <td>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => {
                                    setSelectedDocument(doc);
                                    setViewerOpened(true);
                                  }}
                                  title="View Document"
                                >
                                  <IconEye size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="light"
                                  color="green"
                                  onClick={() => window.open(doc.fileUrl, '_blank')}
                                  title="Download Document"
                                >
                                  <IconDownload size={16} />
                                </ActionIcon>
                              </Group>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center' }}>
                            <Text color="dimmed">
                              No lab reports submitted for this patient
                            </Text>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                ) : (
                  <Alert color="gray">
                    Enter a valid Patient ID to view submitted reports
                  </Alert>
                )}
              </div>

              <div>
                <Text weight={600} size="lg" mb="sm">
                  Recent Consent Requests
                </Text>
                {loadingConsents ? (
                  <Text color="dimmed">Loading...</Text>
                ) : (
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Purpose</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerConsents.length > 0 ? (
                        providerConsents.slice(0, 5).map((consent) => (
                          <tr key={consent._id}>
                            <td>
                              {consent.patientId?.name || 'Unknown'}
                            </td>
                            <td>{consent.purpose}</td>
                            <td>
                              <Badge color={getConsentStatusColor(consent.status)}>
                                {consent.status}
                              </Badge>
                            </td>
                            <td>{formatDate(consent.requestedAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center' }}>
                            <Text color="dimmed">
                              No consent requests sent yet
                            </Text>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                )}
              </div>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="referrals" pt="md">
            <Stack spacing="xl">
              <Group grow>
                <Paper p="md" withBorder>
                  <Text size="sm" color="dimmed">Total Sent</Text>
                  <Text size="xl" weight={700}>{referralStats.sent}</Text>
                </Paper>
                <Paper p="md" withBorder>
                  <Text size="sm" color="dimmed">Total Received</Text>
                  <Text size="xl" weight={700}>{referralStats.received}</Text>
                </Paper>
                <Paper p="md" withBorder>
                  <Text size="sm" color="dimmed">Pending Actions</Text>
                  <Text size="xl" weight={700} color="orange">{referralStats.pending}</Text>
                </Paper>
              </Group>

              <div>
                <Group mb="md" position="apart">
                  <Title order={4}>Sent Referrals</Title>
                  <Group>
                    <Button leftIcon={<IconPlus size={16} />} onClick={() => setReferralModalOpen(true)}>
                      Create Referral
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/referrals?tab=sent'}>
                      View All
                    </Button>
                  </Group>
                </Group>
                <Table highlightOnHover>
                  <thead>
                    <tr>
                      <th>Referral ID</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReferrals ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center' }}><Text>Loading...</Text></td></tr>
                    ) : sentReferrals.length > 0 ? (
                      sentReferrals.map((referral) => (
                        <tr key={referral._id}>
                          <td><Text size="sm" weight={500}>{referral.referralId}</Text></td>
                          <td><Badge size="sm">{getReferralTypeLabel(referral.type)}</Badge></td>
                          <td>
                            <div>
                              <Text size="sm" weight={500}>{referral.targetSnapshot?.name}</Text>
                              <Text size="xs" color="dimmed">{referral.targetSnapshot?.role}</Text>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Text size="sm">{referral.patientSnapshot?.name}</Text>
                              <Text size="xs" color="dimmed">{referral.patientSnapshot?.contactPhone}</Text>
                            </div>
                          </td>
                          <td><Badge color={getReferralStatusColor(referral.status)}>{referral.status}</Badge></td>
                          <td><Text size="sm">{new Date(referral.createdAt).toLocaleDateString()}</Text></td>
                          <td>
                            <Button size="xs" variant="subtle" onClick={() => {
                              setSelectedReferral(referral);
                              setDetailsModalOpen(true);
                            }}>View</Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} style={{ textAlign: 'center' }}><Text color="dimmed">No sent referrals</Text></td></tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <div>
                <Group mb="md" position="apart">
                  <Title order={4}>Received Referrals</Title>
                  <Button variant="outline" onClick={() => window.location.href = '/referrals?tab=received'}>View All</Button>
                </Group>
                <Table highlightOnHover>
                  <thead>
                    <tr>
                      <th>Referral ID</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>Patient</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingReferrals ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center' }}><Text>Loading...</Text></td></tr>
                    ) : receivedReferrals.length > 0 ? (
                      receivedReferrals.map((referral) => (
                        <tr key={referral._id}>
                          <td><Text size="sm" weight={500}>{referral.referralId}</Text></td>
                          <td><Badge size="sm">{getReferralTypeLabel(referral.referralType || referral.type)}</Badge></td>
                          <td>
                            <div>
                              <Text size="sm" weight={500}>{referral.sourceSnapshot?.name || referral.sourceId?.name || 'N/A'}</Text>
                              <Text size="xs" color="dimmed">{referral.sourceSnapshot?.role || referral.sourceId?.role || 'N/A'}</Text>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Text size="sm">{referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}</Text>
                              <Text size="xs" color="dimmed">{referral.patientSnapshot?.phone || referral.patientId?.phone || referral.patientSnapshot?.contactPhone || 'N/A'}</Text>
                            </div>
                          </td>
                          <td><Badge color={getReferralStatusColor(referral.status)}>{referral.status}</Badge></td>
                          <td><Text size="sm">{new Date(referral.createdAt).toLocaleDateString()}</Text></td>
                          <td>
                            <Button size="xs" variant="subtle" onClick={() => {
                              setSelectedReferral(referral);
                              setDetailsModalOpen(true);
                            }}>View</Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={7} style={{ textAlign: 'center' }}><Text color="dimmed">No received referrals</Text></td></tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="slots" pt="md">
            <SlotManagement entityType={BOOKING_TYPES.LAB} showMetadataFields={true} />
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={machineModalOpen}
        onClose={closeModal}
        title={`${machineModalType === 'add' ? 'Add' : 'Edit'} Machine`}
        size="md"
      >
        <form onSubmit={machineForm.onSubmit((values) => {
          if (machineModalType === 'add') {
            handleAddMachine(values);
          } else {
            handleUpdateMachine(machineModalData._id, values);
          }
        })}>
          <Stack>
            <TextInput label="Name" {...machineForm.getInputProps('name')} required />
            <TextInput label="Model" {...machineForm.getInputProps('model')} required />
            <TextInput label="Manufacturer" {...machineForm.getInputProps('manufacturer')} />
            <DateInput label="Purchase Date" {...machineForm.getInputProps('purchaseDate')} />
            {machineModalType === 'edit' && (
              <DateInput label="Last Maintenance Date" {...machineForm.getInputProps('lastMaintenanceDate')} />
            )}
            <DateInput label="Next Maintenance Date" {...machineForm.getInputProps('nextMaintenanceDate')} />
            <Select
              label="Status"
              data={Object.values(MACHINE_STATUS)}
              {...machineForm.getInputProps('status')}
            />
            <Group>
              <Button type="submit" loading={apiLoading}>
                {machineModalType === 'add' ? 'Add' : 'Update'}
              </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={facilityModalOpen}
        onClose={closeModal}
        title="Add Facility"
        size="md"
      >
        <form onSubmit={facilityForm.onSubmit(handleAddFacility)}>
          <Stack>
            <TextInput label="Facility Name" {...facilityForm.getInputProps('facility')} required />
            <Group>
              <Button type="submit" loading={apiLoading}>
                Add
              </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <DocumentUploadModal
        opened={documentUploadModalOpened}
        onClose={() => setDocumentUploadModalOpened(false)}
        onSuccess={handlePatientDocumentUploadSuccess}
        isProviderSubmission={true}
        patientId={selectedPatientId}
        defaultDocumentType={DOCUMENT_TYPES.LAB_REPORT}
      />

      <ProviderConsentRequestModal
        opened={requestConsentModalOpened}
        onClose={() => setRequestConsentModalOpened(false)}
        patientId={selectedPatientId}
        onSuccess={() => {
          loadProviderConsents();
        }}
      />

      <ConsentRequestModal
        opened={consentModalOpened}
        onClose={() => setConsentModalOpened(false)}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        opened={viewerOpened}
        onClose={() => setViewerOpened(false)}
        document={selectedDocument}
      />

      {/* Referral Modals */}
      <ReferralModal
        opened={referralModalOpen}
        onClose={() => setReferralModalOpen(false)}
        onSuccess={() => {
          setReferralModalOpen(false);
          loadReferrals();
        }}
      />
      
      <ReferralDetailsModal
        opened={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedReferral(null);
        }}
        referral={selectedReferral}
        onUpdate={loadReferrals}
      />
    </Container>
  );
}
