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
  NumberInput,
  Select,
  FileInput,
  Badge,
  ActionIcon,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconUpload,
  IconFile,
  IconUsers,
  IconBuildingHospital,
  IconFlask,
  IconPill,
  IconStethoscope,
  IconCalendar,
  IconEye,
  IconDownload,
  IconArrowsExchange,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
} from '../utils/notifications.js';
import { formatDateForDisplay } from '@arogyafirst/shared';
import SlotManagement from '../components/SlotManagement.jsx';
import { BOOKING_TYPES, DOCUMENT_TYPES } from '@arogyafirst/shared';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConsentRequestModal } from '../components/ConsentRequestModal';
import { ProviderConsentRequestModal } from '../components/ProviderConsentRequestModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { getConsentStatusColor } from '../utils/consentHelpers';
import ReferralModal from '../components/ReferralModal';
import ReferralDetailsModal from '../components/ReferralDetailsModal';
import { getReferralStatusColor, getReferralTypeLabel } from '../utils/referralHelpers';
import { REFERRAL_STATUS } from '@arogyafirst/shared';

export default function HospitalProfilePage() {
  usePageTitle('Hospital Profile');
  const { user, refreshUser } = useAuth();
  const { loading: apiLoading, error: apiError, fetchData } = useAuthFetch();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [modalData, setModalData] = useState({});
  const [selectedList, setSelectedList] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const MAX_FILE_SIZE = Number(import.meta.env.VITE_MAX_FILE_SIZE || 5 * 1024 * 1024);
  const ALLOWED_FILE_TYPES = (import.meta.env.VITE_ALLOWED_FILE_TYPES || '.pdf,.jpg,.jpeg,.png').split(',').map(s => s.trim().toLowerCase());

  // Patient document submission state
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

  // Location management states
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationModalType, setLocationModalType] = useState('add');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const profileForm = useForm({
    initialValues: {
      name: user?.hospitalData?.name || '',
      location: user?.hospitalData?.location || '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
    },
  });

  const itemForm = useForm({
    initialValues: {},
    validate: {},
  });

  const locationForm = useForm({
    initialValues: {
      name: '',
      location: '',
      branchCode: '',
      contactPhone: '',
      contactEmail: '',
    },
    validate: {
      name: (value) => (value && value.length >= 2 ? null : 'Name must be at least 2 characters'),
      location: (value) => (value && value.length >= 2 ? null : 'Location must be at least 2 characters'),
      branchCode: (value) => (/^[A-Z0-9]{2,20}$/.test(value) ? null : 'Branch code must be 2-20 alphanumeric characters (uppercase)'),
      contactPhone: (value) => (!value || /^[0-9]{10}$/.test(value.replace(/\D/g, '')) ? null : 'Phone must be 10 digits'),
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setValues({
        name: user.hospitalData?.name || '',
        location: user.hospitalData?.location || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (values) => {
    const data = await fetchData('/api/hospitals/profile', {
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

  const handleUploadDocument = async (file) => {
    if (!file) return false;
    // Client-side validation: size and extension
    if (file.size > MAX_FILE_SIZE) {
      showWarningNotification('Selected file is too large');
      return false;
    }
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(ext)) {
      showWarningNotification('Selected file type is not allowed');
      return false;
    }
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', file);
    const data = await fetchData('/api/hospitals/documents', {
      method: 'POST',
      body: formData,
    });
    setUploadingDoc(false);
    if (data) {
      showSuccessNotification('Document uploaded successfully');
      refreshUser();
      setSelectedFile(null);
      return true;
    } else {
      showErrorNotification('Failed to upload document');
      return false;
    }
  };

  // Load patient documents submitted by this hospital
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

  const loadPatientDocuments = async () => {
    if (!selectedPatientId || !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      return;
    }
    
    setLoadingPatientDocs(true);
    try {
      const res = await fetchData(`/api/documents/patient/${selectedPatientId}`);
      // Filter for documents uploaded by this provider
      const hospitalDocs = (res.data?.documents || []).filter(
        doc => doc.uploadSource === 'PROVIDER_SUBMISSION' && doc.uploadedBy?._id === user._id
      );
      setPatientDocuments(hospitalDocs);
    } catch (err) {
      console.error('Error loading patient documents:', err);
      showErrorNotification('Error', 'Failed to load patient documents');
    } finally {
      setLoadingPatientDocs(false);
    }
  };

  // Load consent requests sent by this hospital
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

  // Handle patient document upload success
  const handlePatientDocumentUploadSuccess = () => {
    setDocumentUploadModalOpened(false);
    loadPatientDocuments();
    showSuccessNotification('Success', 'Document submitted successfully');
  };

  // Load data when patient ID changes
  useEffect(() => {
    if (activeTab === 'patient-documents' && selectedPatientId && selectedPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      loadPatientDocuments();
      loadProviderConsents();
    }
    if (activeTab === 'referrals') {
      loadReferrals();
    }
    if (activeTab === 'locations') {
      loadLocations();
    }
  }, [selectedPatientId, activeTab]);

  // Load location branches for chain hospitals
  const loadLocations = async () => {
    if (!hospitalData?.isChain) return;
    setLoadingLocations(true);
    try {
      const data = await fetchData('/api/hospitals/locations');
      if (data?.locations) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      showErrorNotification('Error', 'Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  // Add location (branch hospital)
  const handleAddLocation = async (values) => {
    const data = await fetchData('/api/hospitals/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (data) {
      showSuccessNotification('Branch location added successfully');
      setLocationModalOpen(false);
      locationForm.reset();
      loadLocations();
    } else {
      showErrorNotification('Failed to add branch location');
    }
  };

  // Update location
  const handleUpdateLocation = async (values) => {
    const data = await fetchData(`/api/hospitals/locations/${selectedLocation.locationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (data) {
      showSuccessNotification('Branch location updated successfully');
      setLocationModalOpen(false);
      locationForm.reset();
      loadLocations();
    } else {
      showErrorNotification('Failed to update branch location');
    }
  };

  // Delete location
  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this branch? This will deactivate it and prevent new bookings.')) return;
    const data = await fetchData(`/api/hospitals/locations/${locationId}`, {
      method: 'DELETE',
    });
    if (data) {
      showSuccessNotification('Branch location deleted successfully');
      loadLocations();
    } else {
      showErrorNotification('Failed to delete branch location');
    }
  };

  const openAddLocationModal = () => {
    setLocationModalType('add');
    setSelectedLocation(null);
    locationForm.reset();
    setLocationModalOpen(true);
  };

  const openEditLocationModal = (location) => {
    setLocationModalType('edit');
    setSelectedLocation(location);
    locationForm.setValues({
      name: location.name,
      location: location.location,
      branchCode: location.branchCode,
      contactPhone: location.contactPhone || '',
      contactEmail: location.contactEmail || '',
    });
    setLocationModalOpen(true);
  };

  const handleDeleteDocument = async (index) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    const data = await fetchData(`/api/hospitals/documents/${index}`, {
      method: 'DELETE',
    });
    if (data) {
      showSuccessNotification('Document deleted successfully');
      refreshUser();
    } else {
      showErrorNotification('Failed to delete document');
    }
  };

  const handleAddItem = async (listType, data) => {
    const result = await fetchData(`/api/hospitals/${listType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (result) {
      showSuccessNotification(`${listType.slice(0, -1)} added successfully`);
      refreshUser();
      closeModal();
    } else {
      showErrorNotification(`Failed to add ${listType.slice(0, -1)}`);
    }
  };

  const handleUpdateItem = async (listType, index, data) => {
    const result = await fetchData(`/api/hospitals/${listType}/${index}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (result) {
      showSuccessNotification(`${listType.slice(0, -1)} updated successfully`);
      refreshUser();
      closeModal();
    } else {
      showErrorNotification(`Failed to update ${listType.slice(0, -1)}`);
    }
  };

  const handleDeleteItem = async (listType, index) => {
    if (!window.confirm(`Are you sure you want to delete this ${listType.slice(0, -1)}?`)) return;
    const result = await fetchData(`/api/hospitals/${listType}/${index}`, {
      method: 'DELETE',
    });
    if (result) {
      showSuccessNotification(`${listType.slice(0, -1)} deleted successfully`);
      refreshUser();
    } else {
      showErrorNotification(`Failed to delete ${listType.slice(0, -1)}`);
    }
  };

  const openAddModal = (listType) => {
    setSelectedList(listType);
    setModalType('add');
    setModalData({});
    itemForm.reset();
    setModalOpen(true);
  };

  const openEditModal = (listType, index, data) => {
    setSelectedList(listType);
    setModalType('edit');
    setModalData({ ...data, index });
    itemForm.setValues(data);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData({});
    itemForm.reset();
  };

  const renderModalForm = () => {
    const listType = selectedList;
    switch (listType) {
      case 'doctors':
        return (
          <>
            <TextInput label="Name" {...itemForm.getInputProps('name')} required />
            <TextInput label="Specialization" {...itemForm.getInputProps('specialization')} required />
            <TextInput label="Qualification" {...itemForm.getInputProps('qualification')} required />
            <NumberInput label="Experience (years)" {...itemForm.getInputProps('experience')} required min={0} />
            <TextInput label="Contact Phone" {...itemForm.getInputProps('contactPhone')} required />
            <TextInput label="Email" {...itemForm.getInputProps('email')} />
            <TextInput label="Schedule" {...itemForm.getInputProps('schedule')} />
          </>
        );
      case 'labs':
        return (
          <>
            <TextInput label="Name" {...itemForm.getInputProps('name')} required />
            <TextInput label="Type" {...itemForm.getInputProps('type')} required />
            <TextInput label="Location" {...itemForm.getInputProps('location')} />
            <TextInput label="Contact Phone" {...itemForm.getInputProps('contactPhone')} />
          </>
        );
      case 'beds':
        return (
          <>
            <TextInput label="Bed Number" {...itemForm.getInputProps('bedNumber')} required />
            <Select
              label="Type"
              data={['General', 'ICU', 'Private', 'Semi-Private', 'Emergency']}
              {...itemForm.getInputProps('type')}
              required
            />
            <TextInput label="Floor" {...itemForm.getInputProps('floor')} />
            <TextInput label="Ward" {...itemForm.getInputProps('ward')} />
          </>
        );
      case 'pharmacies':
        return (
          <>
            <TextInput label="Name" {...itemForm.getInputProps('name')} required />
            <TextInput label="Location" {...itemForm.getInputProps('location')} />
            <TextInput label="Contact Phone" {...itemForm.getInputProps('contactPhone')} required />
            <TextInput label="Operating Hours" {...itemForm.getInputProps('operatingHours')} />
          </>
        );
      case 'staff':
        return (
          <>
            <TextInput label="Name" {...itemForm.getInputProps('name')} required />
            <TextInput label="Role" {...itemForm.getInputProps('role')} required />
            <TextInput label="Department" {...itemForm.getInputProps('department')} />
            <TextInput label="Contact Phone" {...itemForm.getInputProps('contactPhone')} required />
            <TextInput label="Email" {...itemForm.getInputProps('email')} />
            <TextInput label="Shift" {...itemForm.getInputProps('shift')} />
          </>
        );
      default:
        return null;
    }
  };

  const handleModalSubmit = (values) => {
    if (modalType === 'add') {
      handleAddItem(selectedList, values);
    } else {
      handleUpdateItem(selectedList, modalData.index, values);
    }
  };

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  const hospitalData = user.hospitalData || {};

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="md">
        <Title order={2} mb="md">
          Hospital Profile
        </Title>
        {apiError && <Alert color="red" mb="md">{apiError}</Alert>}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="info" icon={<IconBuildingHospital size={16} />}>
              Info
            </Tabs.Tab>
            {hospitalData?.isChain && (
              <Tabs.Tab value="locations" icon={<IconBuildingHospital size={16} />}>
                Locations
              </Tabs.Tab>
            )}
            <Tabs.Tab value="legal-documents" icon={<IconFile size={16} />}>
              Legal Documents
            </Tabs.Tab>
            <Tabs.Tab value="patient-documents" icon={<IconFile size={16} />}>
              Patient Documents
            </Tabs.Tab>
            <Tabs.Tab value="doctors" icon={<IconStethoscope size={16} />}>
              Doctors
            </Tabs.Tab>
            <Tabs.Tab value="labs" icon={<IconFlask size={16} />}>
              Labs
            </Tabs.Tab>
            <Tabs.Tab value="beds" icon={<IconUsers size={16} />}>
              Beds
            </Tabs.Tab>
            <Tabs.Tab value="pharmacies" icon={<IconPill size={16} />}>
              Pharmacies
            </Tabs.Tab>
            <Tabs.Tab value="staff" icon={<IconUsers size={16} />}>
              Staff
            </Tabs.Tab>
            <Tabs.Tab value="referrals" icon={<IconArrowsExchange size={16} />}>
              Referrals
            </Tabs.Tab>
            <Tabs.Tab value="opd-slots" icon={<IconCalendar size={16} />}>
              OPD Slots
            </Tabs.Tab>
            <Tabs.Tab value="ipd-slots" icon={<IconCalendar size={16} />}>
              IPD Slots
            </Tabs.Tab>
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
                  <Text>{hospitalData.name || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Email:</Text>
                  <Text>{user.email}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Location:</Text>
                  <Text>{hospitalData.location || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Unique ID:</Text>
                  <Text>{user.uniqueId}</Text>
                </Group>
                <Button leftIcon={<IconEdit size={16} />} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </Stack>
            )}
          </Tabs.Panel>

          {hospitalData?.isChain && (
            <Tabs.Panel value="locations" pt="md">
              <Stack>
                <Group position="apart">
                  <Title order={4}>Branch Locations</Title>
                  <Button
                    leftIcon={<IconPlus size={16} />}
                    onClick={openAddLocationModal}
                    disabled={loadingLocations}
                  >
                    Add Location
                  </Button>
                </Group>
                
                {loadingLocations ? (
                  <Loader size="lg" />
                ) : locations.length === 0 ? (
                  <Text color="dimmed">No branch locations added yet</Text>
                ) : (
                  <Table striped>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Branch Code</th>
                        <th>Contact Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => (
                        <tr key={location.locationId}>
                          <td>{location.name}</td>
                          <td>{location.location}</td>
                          <td>
                            <Badge size="sm" variant="light">{location.branchCode}</Badge>
                          </td>
                          <td>{location.contactPhone || 'N/A'}</td>
                          <td>
                            <Badge
                              size="sm"
                              color={location.isActive ? 'green' : 'gray'}
                            >
                              {location.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td>
                            <Group spacing="xs">
                              <ActionIcon
                                size="sm"
                                color="blue"
                                onClick={() => openEditLocationModal(location)}
                                disabled={loadingLocations}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                size="sm"
                                color="red"
                                onClick={() => handleDeleteLocation(location.locationId)}
                                disabled={loadingLocations}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Stack>

              {/* Location Modal */}
              <Modal
                opened={locationModalOpen}
                onClose={() => {
                  setLocationModalOpen(false);
                  locationForm.reset();
                }}
                title={locationModalType === 'add' ? 'Add Branch Location' : 'Edit Branch Location'}
                centered
              >
                <form
                  onSubmit={locationForm.onSubmit((values) => {
                    if (locationModalType === 'add') {
                      handleAddLocation(values);
                    } else {
                      handleUpdateLocation(values);
                    }
                  })}
                >
                  <Stack>
                    <TextInput
                      label="Branch Name"
                      placeholder="Enter branch name"
                      {...locationForm.getInputProps('name')}
                      required
                    />
                    <TextInput
                      label="Location"
                      placeholder="Enter location address"
                      {...locationForm.getInputProps('location')}
                      required
                    />
                    <TextInput
                      label="Branch Code"
                      placeholder="e.g., NYC, LA (2-20 alphanumeric, uppercase)"
                      {...locationForm.getInputProps('branchCode')}
                      required
                      disabled={locationModalType === 'edit'}
                    />
                    <TextInput
                      label="Contact Phone"
                      placeholder="+91 10 digit phone number"
                      {...locationForm.getInputProps('contactPhone')}
                    />
                    <TextInput
                      label="Contact Email"
                      placeholder="Enter contact email"
                      type="email"
                      {...locationForm.getInputProps('contactEmail')}
                    />
                    <Group position="right" mt="md">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLocationModalOpen(false);
                          locationForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={apiLoading}>
                        {locationModalType === 'add' ? 'Add Location' : 'Update Location'}
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Modal>
            </Tabs.Panel>
          )}

          <Tabs.Panel value="legal-documents" pt="md">
            <Group mb="md">
              <FileInput
                placeholder="Select document"
                accept={import.meta.env.VITE_ALLOWED_FILE_TYPES || '.pdf,.jpg,.jpeg,.png'}
                onChange={(file) => setSelectedFile(file)}
                disabled={uploadingDoc}
              />
              <Button
                leftIcon={<IconUpload size={16} />}
                loading={uploadingDoc}
                onClick={() => handleUploadDocument(selectedFile)}
                disabled={!selectedFile || uploadingDoc}
              >
                Upload
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.legalDocuments?.length ? (
                  hospitalData.legalDocuments.map((doc, index) => (
                    <tr key={index}>
                      <td>{doc.url.split('/').pop()}</td>
                      <td>{doc.format?.toUpperCase()}</td>
                      <td>{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td>{formatDateForDisplay(doc.uploadedAt)}</td>
                      <td>
                        <ActionIcon color="red" onClick={() => handleDeleteDocument(index)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No documents uploaded</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="patient-documents" pt="md">
            <Stack gap="md">
              <Alert color="blue" variant="light">
                <Text size="sm">
                  Submit documents on behalf of patients. Active consent is required for submission.
                </Text>
              </Alert>

              {/* Patient ID Input */}
              <Group>
                <TextInput
                  label="Patient ID"
                  placeholder="Enter patient MongoDB ObjectId"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  style={{ flex: 1 }}
                  error={selectedPatientId && !selectedPatientId.match(/^[0-9a-fA-F]{24}$/) ? 'Invalid ObjectId format' : null}
                />
                <Button
                  onClick={() => setDocumentUploadModalOpened(true)}
                  disabled={!selectedPatientId || !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)}
                  leftSection={<IconUpload size={16} />}
                  style={{ marginTop: 24 }}
                >
                  Submit Document
                </Button>
                <Button
                  leftSection={<IconShieldCheck size={16} />}
                  onClick={() => setRequestConsentModalOpened(true)}
                  variant="light"
                  disabled={
                    !selectedPatientId ||
                    !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)
                  }
                  style={{ marginTop: 24 }}
                >
                  Request Consent
                </Button>
                <Button
                  onClick={() => setConsentModalOpened(true)}
                  variant="outline"
                  style={{ marginTop: 24 }}
                >
                  View Sent Requests
                </Button>
              </Group>

              {/* Submitted Documents Table */}
              {selectedPatientId && selectedPatientId.match(/^[0-9a-fA-F]{24}$/) && (
                <>
                  <Divider label="Submitted Documents" labelPosition="center" />
                  {loadingPatientDocs ? (
                    <Loader size="sm" />
                  ) : patientDocuments.length > 0 ? (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Title</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Patient</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {patientDocuments.map((doc) => (
                          <Table.Tr key={doc.documentId}>
                            <Table.Td>{doc.title}</Table.Td>
                            <Table.Td>
                              <Badge variant="light">{doc.documentType}</Badge>
                            </Table.Td>
                            <Table.Td>{formatDateForDisplay(doc.uploadedAt)}</Table.Td>
                            <Table.Td>{doc.patientId?.name || 'Unknown'}</Table.Td>
                            <Table.Td>
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
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Alert color="gray">No documents submitted for this patient yet.</Alert>
                  )}

                  {/* Consent Requests Summary */}
                  <Divider label="Recent Consent Requests" labelPosition="center" />
                  {loadingConsents ? (
                    <Loader size="sm" />
                  ) : providerConsents.length > 0 ? (
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Patient</Table.Th>
                          <Table.Th>Purpose</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Requested</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {providerConsents.slice(0, 5).map((consent) => (
                          <Table.Tr key={consent.consentId}>
                            <Table.Td>{consent.patientId?.name || 'Unknown'}</Table.Td>
                            <Table.Td>
                              <Text size="sm" lineClamp={1}>{consent.purpose}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={
                                  consent.status === 'APPROVED' ? 'green' :
                                  consent.status === 'PENDING' ? 'yellow' :
                                  consent.status === 'REJECTED' ? 'red' : 'gray'
                                }
                                variant="light"
                              >
                                {consent.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{formatDateForDisplay(consent.requestedAt)}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Alert color="gray">No consent requests sent yet.</Alert>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="doctors" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => openAddModal('doctors')}>
                Add Doctor
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Qualification</th>
                  <th>Experience</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.doctors?.length ? (
                  hospitalData.doctors.map((doctor, index) => (
                    <tr key={index}>
                      <td>{doctor.name}</td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.qualification}</td>
                      <td>{doctor.experience} years</td>
                      <td>{doctor.contactPhone}</td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditModal('doctors', index, doctor)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteItem('doctors', index)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No doctors added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="labs" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => openAddModal('labs')}>
                Add Lab
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.labs?.length ? (
                  hospitalData.labs.map((lab, index) => (
                    <tr key={index}>
                      <td>{lab.name}</td>
                      <td>{lab.type}</td>
                      <td>{lab.location}</td>
                      <td>{lab.contactPhone}</td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditModal('labs', index, lab)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteItem('labs', index)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No labs added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="beds" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => openAddModal('beds')}>
                Add Bed
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Bed Number</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>Ward</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.beds?.length ? (
                  hospitalData.beds.map((bed, index) => (
                    <tr key={index}>
                      <td>{bed.bedNumber}</td>
                      <td>{bed.type}</td>
                      <td>{bed.floor}</td>
                      <td>{bed.ward}</td>
                      <td>
                        <Badge color={bed.isOccupied ? 'red' : 'green'}>
                          {bed.isOccupied ? 'Occupied' : 'Available'}
                        </Badge>
                      </td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditModal('beds', index, bed)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteItem('beds', index)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No beds added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="pharmacies" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => openAddModal('pharmacies')}>
                Add Pharmacy
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Operating Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.pharmacies?.length ? (
                  hospitalData.pharmacies.map((pharmacy, index) => (
                    <tr key={index}>
                      <td>{pharmacy.name}</td>
                      <td>{pharmacy.location}</td>
                      <td>{pharmacy.contactPhone}</td>
                      <td>{pharmacy.operatingHours}</td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditModal('pharmacies', index, pharmacy)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteItem('pharmacies', index)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>No pharmacies added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="staff" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={() => openAddModal('staff')}>
                Add Staff
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Shift</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitalData.staff?.length ? (
                  hospitalData.staff.map((staff, index) => (
                    <tr key={index}>
                      <td>{staff.name}</td>
                      <td>{staff.role}</td>
                      <td>{staff.department}</td>
                      <td>{staff.contactPhone}</td>
                      <td>{staff.shift}</td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditModal('staff', index, staff)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteItem('staff', index)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No staff added</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="referrals" pt="md">
            <Stack spacing="xl">
              {/* Stats */}
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

              {/* Sent Referrals */}
              <div>
                <Group mb="md" position="apart">
                  <Title order={4}>Sent Referrals</Title>
                  <Group>
                    <Button 
                      leftIcon={<IconPlus size={16} />} 
                      onClick={() => setReferralModalOpen(true)}
                    >
                      Create Referral
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/referrals?tab=sent'}
                    >
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
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center' }}>
                          <Text>Loading...</Text>
                        </td>
                      </tr>
                    ) : sentReferrals.length > 0 ? (
                      sentReferrals.map((referral) => (
                        <tr key={referral._id}>
                          <td>
                            <Text size="sm" weight={500}>{referral.referralId}</Text>
                          </td>
                          <td>
                            <Badge size="sm">{getReferralTypeLabel(referral.type)}</Badge>
                          </td>
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
                          <td>
                            <Badge color={getReferralStatusColor(referral.status)}>
                              {referral.status}
                            </Badge>
                          </td>
                          <td>
                            <Text size="sm">
                              {new Date(referral.createdAt).toLocaleDateString()}
                            </Text>
                          </td>
                          <td>
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => {
                                setSelectedReferral(referral);
                                setDetailsModalOpen(true);
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center' }}>
                          <Text color="dimmed">No sent referrals</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Received Referrals */}
              <div>
                <Group mb="md" position="apart">
                  <Title order={4}>Received Referrals</Title>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/referrals?tab=received'}
                  >
                    View All
                  </Button>
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
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center' }}>
                          <Text>Loading...</Text>
                        </td>
                      </tr>
                    ) : receivedReferrals.length > 0 ? (
                      receivedReferrals.map((referral) => (
                        <tr key={referral._id}>
                          <td>
                            <Text size="sm" weight={500}>{referral.referralId}</Text>
                          </td>
                          <td>
                            <Badge size="sm">{getReferralTypeLabel(referral.referralType || referral.type)}</Badge>
                          </td>
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
                          <td>
                            <Badge color={getReferralStatusColor(referral.status)}>
                              {referral.status}
                            </Badge>
                          </td>
                          <td>
                            <Text size="sm">
                              {new Date(referral.createdAt).toLocaleDateString()}
                            </Text>
                          </td>
                          <td>
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => {
                                setSelectedReferral(referral);
                                setDetailsModalOpen(true);
                              }}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center' }}>
                          <Text color="dimmed">No received referrals</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="opd-slots" pt="md">
            <SlotManagement entityType={BOOKING_TYPES.OPD} showMetadataFields={true} />
          </Tabs.Panel>

          <Tabs.Panel value="ipd-slots" pt="md">
            <SlotManagement entityType={BOOKING_TYPES.IPD} showMetadataFields={true} />
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={`${modalType === 'add' ? 'Add' : 'Edit'} ${selectedList.slice(0, -1)}`}
        size="md"
      >
        <form onSubmit={itemForm.onSubmit(handleModalSubmit)}>
          <Stack>
            {renderModalForm()}
            <Group>
              <Button type="submit" loading={apiLoading}>
                {modalType === 'add' ? 'Add' : 'Update'}
              </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Patient Document Upload Modal */}
      <DocumentUploadModal
        opened={documentUploadModalOpened}
        onClose={() => setDocumentUploadModalOpened(false)}
        onSuccess={handlePatientDocumentUploadSuccess}
        patientId={selectedPatientId}
        isProviderSubmission={true}
      />

      {/* Provider Consent Request Modal */}
      <ProviderConsentRequestModal
        opened={requestConsentModalOpened}
        onClose={() => setRequestConsentModalOpened(false)}
        patientId={selectedPatientId}
        onSuccess={() => {
          loadProviderConsents();
        }}
      />

      {/* Consent Request Modal - View Sent Requests */}
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
};

