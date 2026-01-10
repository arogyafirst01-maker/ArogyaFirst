import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
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
  Card,
  SimpleGrid,
  Textarea,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconUpload,
  IconFile,
  IconCalendar,
  IconClock,
  IconUsers,
  IconEye,
  IconDownload,
  IconArrowsExchange,
  IconStethoscope,
  IconShieldCheck,
  IconTemplate,
  IconPill,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
} from '../utils/notifications.js';
import { formatDateForDisplay, validateAadhaarLast4, BOOKING_TYPES, DOCUMENT_TYPES, TEMPLATE_CATEGORIES } from '@arogyafirst/shared';
import SlotManagement from '../components/SlotManagement.jsx';
import { DocumentUploadModal } from '../components/DocumentUploadModal';
import { ConsentRequestModal } from '../components/ConsentRequestModal';
import { ProviderConsentRequestModal } from '../components/ProviderConsentRequestModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { getConsentStatusColor } from '../utils/consentHelpers';
import ReferralModal from '../components/ReferralModal';
import ReferralDetailsModal from '../components/ReferralDetailsModal';
import { getReferralStatusColor, getReferralTypeLabel } from '../utils/referralHelpers';
import { REFERRAL_STATUS } from '@arogyafirst/shared';

const DoctorProfilePage = () => {
  usePageTitle('Doctor Profile');
  const { user, refreshUser } = useAuth();
  const { loading: apiLoading, error: apiError, fetchData } = useAuthFetch();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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

  // Prescription Template states
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateModalOpened, setTemplateModalOpened] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Pharmacy Links states
  const [pharmacyLinks, setPharmacyLinks] = useState([]);
  const [loadingPharmacyLinks, setLoadingPharmacyLinks] = useState(false);
  const [addPharmacyModalOpened, setAddPharmacyModalOpened] = useState(false);
  const [availablePharmacies, setAvailablePharmacies] = useState([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');

  const profileForm = useForm({
    initialValues: {
      name: '',
      qualification: '',
      experience: 0,
      location: '',
      dateOfBirth: null,
      aadhaarLast4: '',
      specialization: '',
      hospitalId: '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      qualification: (value) => (value.trim().length > 0 ? null : 'Qualification is required'),
      experience: (value) => (Number.isInteger(value) && value >= 0 ? null : 'Experience must be a non-negative integer'),
      location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
      dateOfBirth: (value) => (!isNaN(new Date(value).getTime()) ? null : 'Date of birth must be a valid date'),
      aadhaarLast4: (value) => (validateAadhaarLast4(value) ? null : 'Aadhaar last 4 digits must be 4 digits'),
      specialization: (value) => (value.trim().length > 0 ? null : 'Specialization is required'),
    },
  });

  const templateForm = useForm({
    initialValues: {
      name: '',
      category: '',
      medicines: [],
      notes: '',
    },
    validate: {
      name: (value) => (value.trim().length >= 3 ? null : 'Template name must be at least 3 characters'),
      category: (value) => (value ? null : 'Category is required'),
      medicines: (value) => (Array.isArray(value) && value.length > 0 ? null : 'At least one medicine is required'),
    },
  });



  useEffect(() => {
    if (user && user.doctorData) {
      profileForm.setValues({
        name: user.doctorData.name || '',
        qualification: user.doctorData.qualification || '',
        experience: user.doctorData.experience || 0,
        location: user.doctorData.location || '',
        dateOfBirth: user.doctorData.dateOfBirth ? new Date(user.doctorData.dateOfBirth) : null,
        aadhaarLast4: user.doctorData.aadhaarLast4 || '',
        specialization: user.doctorData.specialization || '',
        hospitalId: user.doctorData.hospitalId || '',
      });
    }
  }, [user]);

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    return formatDateForDisplay(date);
  };

  const validateTimeRange = (start, end) => {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return endMinutes > startMinutes;
  };

  const checkSlotOverlap = (newSlot, existingSlots) => {
    const newDate = new Date(newSlot.date).toDateString();
    const newStart = parseInt(newSlot.startTime.split(':')[0]) * 60 + parseInt(newSlot.startTime.split(':')[1]);
    const newEnd = parseInt(newSlot.endTime.split(':')[0]) * 60 + parseInt(newSlot.endTime.split(':')[1]);

    return existingSlots.some(slot => {
      if (new Date(slot.date).toDateString() !== newDate) return false;
      const slotStart = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
      const slotEnd = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);
      return (newStart < slotEnd && newEnd > slotStart);
    });
  };

  const handleUpdateProfile = async (values) => {
    const dataToSend = {
      ...values,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString().split('T')[0] : null,
    };
    const data = await fetchData('/api/doctors/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend),
    });
    if (data) {
      showSuccessNotification('Profile updated successfully');
      refreshUser();
      setIsEditing(false);
    } else {
      showErrorNotification('Failed to update profile');
    }
  };

  // Load referrals for this doctor
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

  // Load prescription templates
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetchData('/api/doctors/templates');
      console.log('[DoctorProfile] Templates response:', res);
      if (res?.data?.templates) {
        const templatesData = Array.isArray(res.data.templates) ? res.data.templates : [];
        console.log('[DoctorProfile] Loaded templates:', templatesData);
        templatesData.forEach((t, idx) => {
          console.log(`[DoctorProfile] Template ${idx}:`, JSON.stringify(t, null, 2));
        });
        setTemplates(templatesData);
      } else {
        console.warn('[DoctorProfile] No templates in response:', res);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      showErrorNotification('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreateTemplate = async (values) => {
    try {
      const res = await fetchData('/api/doctors/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res) {
        showSuccessNotification('Template created successfully');
        setTemplateModalOpened(false);
        templateForm.reset();
        setEditingTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      showErrorNotification('Failed to create template');
    }
  };

  const handleUpdateTemplate = async (values) => {
    if (editingTemplate === null) return;
    try {
      const res = await fetchData(`/api/doctors/templates/${editingTemplate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res) {
        showSuccessNotification('Template updated successfully');
        setTemplateModalOpened(false);
        templateForm.reset();
        setEditingTemplate(null);
        loadTemplates();
      }
    } catch (error) {
      showErrorNotification('Failed to update template');
    }
  };

  const handleDeleteTemplate = (index) => {
    if (confirm('Are you sure you want to delete this template?')) {
      handleDeleteTemplateConfirm(index);
    }
  };

  const handleDeleteTemplateConfirm = async (index) => {
    try {
      const res = await fetchData(`/api/doctors/templates/${index}`, {
        method: 'DELETE',
      });
      if (res) {
        showSuccessNotification('Template deleted successfully');
        loadTemplates();
      }
    } catch (error) {
      showErrorNotification('Failed to delete template');
    }
  };

  const handleEditTemplate = (index) => {
    const template = templates[index];
    if (template) {
      templateForm.setValues({
        name: template.name,
        category: template.category,
        medicines: template.medicines || [],
        notes: template.notes || '',
      });
      setEditingTemplate(index);
      setTemplateModalOpened(true);
    }
  };

  const handleAddMedicineRow = () => {
    const currentMedicines = templateForm.values.medicines || [];
    templateForm.setFieldValue('medicines', [
      ...currentMedicines,
      { name: '', dosage: '', quantity: 1, instructions: '', duration: '' },
    ]);
  };

  const handleRemoveMedicineRow = (medIndex) => {
    const currentMedicines = templateForm.values.medicines || [];
    templateForm.setFieldValue(
      'medicines',
      currentMedicines.filter((_, i) => i !== medIndex)
    );
  };

  const handleMedicineChange = (medIndex, field, value) => {
    const currentMedicines = templateForm.values.medicines || [];
    currentMedicines[medIndex][field] = value;
    templateForm.setFieldValue('medicines', [...currentMedicines]);
  };

  // Pharmacy Links Functions
  const loadPharmacyLinks = async () => {
    setLoadingPharmacyLinks(true);
    try {
      const res = await fetchData('/api/pharmacies/links');
      setPharmacyLinks(res?.data || res || []);
    } catch (error) {
      console.error('Failed to load pharmacy links:', error);
      showErrorNotification('Failed to load pharmacy links');
      setPharmacyLinks([]);
    } finally {
      setLoadingPharmacyLinks(false);
    }
  };

  const loadAvailablePharmacies = async () => {
    setLoadingPharmacies(true);
    try {
      const res = await fetchData('/api/pharmacies/all?limit=100');
      setAvailablePharmacies(res?.data?.pharmacies || []);
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
      showErrorNotification('Failed to load pharmacies');
      setAvailablePharmacies([]);
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const handleAddPharmacyLink = async () => {
    if (!selectedPharmacyId) {
      showWarningNotification('Please select a pharmacy');
      return;
    }

    try {
      await fetchData('/api/pharmacies/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: user._id,
          pharmacyId: selectedPharmacyId,
        }),
      });
      showSuccessNotification('Pharmacy linked successfully');
      setAddPharmacyModalOpened(false);
      setSelectedPharmacyId('');
      loadPharmacyLinks();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to link pharmacy');
    }
  };

  const handleDeletePharmacyLink = async (linkId) => {
    if (!confirm('Are you sure you want to remove this pharmacy link?')) {
      return;
    }

    try {
      await fetchData(`/api/pharmacies/links/${linkId}`, {
        method: 'DELETE',
      });
      showSuccessNotification('Pharmacy link removed successfully');
      loadPharmacyLinks();
    } catch (error) {
      showErrorNotification('Failed to remove pharmacy link');
    }
  };

  // Load patient documents submitted by this doctor
  const loadPatientDocuments = async () => {
    if (!selectedPatientId || !selectedPatientId.match(/^[0-9a-fA-F]{24}$/)) {
      return;
    }
    
    setLoadingPatientDocs(true);
    try {
      const res = await fetchData(`/api/documents/patient/${selectedPatientId}`);
      // Filter for documents uploaded by this provider
      const doctorDocs = (res.data?.documents || []).filter(
        doc => doc.uploadSource === 'PROVIDER_SUBMISSION' && doc.uploadedBy?._id === user._id
      );
      setPatientDocuments(doctorDocs);
    } catch (err) {
      console.error('Error loading patient documents:', err);
      showErrorNotification('Error', 'Failed to load patient documents');
    } finally {
      setLoadingPatientDocs(false);
    }
  };

  // Load consent requests sent by this doctor
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
    if (activeTab === 'templates') {
      loadTemplates();
    }
    if (activeTab === 'pharmacies') {
      loadPharmacyLinks();
    }
  }, [selectedPatientId, activeTab]);

  const handleUploadDocument = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', file);
    const data = await fetchData('/api/doctors/documents', {
      method: 'POST',
      body: formData,
    });
    setUploadingDoc(false);
    if (data) {
      showSuccessNotification('Document uploaded successfully');
      refreshUser();
      setSelectedFile(null);
    } else {
      showErrorNotification('Failed to upload document');
    }
  };

  const handleDeleteDocument = async (index) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    const data = await fetchData(`/api/doctors/documents/${index}`, {
      method: 'DELETE',
    });
    if (data) {
      showSuccessNotification('Document deleted successfully');
      refreshUser();
    } else {
      showErrorNotification('Failed to delete document');
    }
  };





  if (!user) {
    return (
      <Container size="md" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  const doctorData = user.doctorData || {};

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="md">
        <Title order={2} mb="md">
          Doctor Profile
        </Title>
        {apiError && <Alert color="red" mb="md">{apiError}</Alert>}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="info" icon={<IconUsers size={16} />}>
              Info
            </Tabs.Tab>
            <Tabs.Tab value="practice-documents" icon={<IconFile size={16} />}>
              Practice Documents
            </Tabs.Tab>
            <Tabs.Tab value="patient-documents" icon={<IconFile size={16} />}>
              Patient Documents
            </Tabs.Tab>
            <Tabs.Tab value="consultations" icon={<IconStethoscope size={16} />}>
              Consultations
            </Tabs.Tab>
            <Tabs.Tab value="referrals" icon={<IconArrowsExchange size={16} />}>
              Referrals
            </Tabs.Tab>
            <Tabs.Tab value="templates" icon={<IconTemplate size={16} />}>
              Templates
            </Tabs.Tab>
            <Tabs.Tab value="pharmacies" icon={<IconPill size={16} />}>
              Pharmacy Links
            </Tabs.Tab>
            <Tabs.Tab value="slots" icon={<IconCalendar size={16} />}>
              Slots
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="info" pt="md">
            {isEditing ? (
              <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                <Stack>
                  <TextInput label="Name" {...profileForm.getInputProps('name')} />
                  <TextInput label="Qualification" {...profileForm.getInputProps('qualification')} />
                  <NumberInput label="Experience (years)" {...profileForm.getInputProps('experience')} min={0} />
                  <TextInput label="Location" {...profileForm.getInputProps('location')} />
                  <DateInput label="Date of Birth" maxDate={new Date()} {...profileForm.getInputProps('dateOfBirth')} />
                  <TextInput label="Aadhaar Last 4 Digits" {...profileForm.getInputProps('aadhaarLast4')} />
                  <TextInput label="Specialization" {...profileForm.getInputProps('specialization')} />
                  <TextInput label="Hospital ID" {...profileForm.getInputProps('hospitalId')} disabled={!!doctorData.hospitalId} />
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
                  <Text>{doctorData.name || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Email:</Text>
                  <Text>{user.email}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Qualification:</Text>
                  <Text>{doctorData.qualification || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Experience:</Text>
                  <Text>{doctorData.experience ? `${doctorData.experience} years` : 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Specialization:</Text>
                  <Text>{doctorData.specialization || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Location:</Text>
                  <Text>{doctorData.location || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Date of Birth:</Text>
                  <Text>{doctorData.dateOfBirth ? formatDate(doctorData.dateOfBirth) : 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Aadhaar Last 4 Digits:</Text>
                  <Text>{doctorData.aadhaarLast4 || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Unique ID:</Text>
                  <Text>{user.uniqueId}</Text>
                </Group>
                {doctorData.hospitalId && (
                  <Group>
                    <Text fw={500}>Hospital ID:</Text>
                    <Text>{doctorData.hospitalId}</Text>
                  </Group>
                )}
                <Group>
                  <Text fw={500}>Verification Status:</Text>
                  <Badge color={user.verificationStatus === 'APPROVED' ? 'green' : user.verificationStatus === 'REJECTED' ? 'red' : 'yellow'}>
                    {user.verificationStatus || 'PENDING'}
                  </Badge>
                </Group>
                <Button leftSection={<IconEdit size={16} />} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="practice-documents" pt="md">
            <Group mb="md">
              <FileInput
                placeholder="Select document"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(file) => setSelectedFile(file)}
                disabled={uploadingDoc}
              />
              <Button
                leftSection={<IconUpload size={16} />}
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
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctorData.practiceDocuments?.length ? (
                  doctorData.practiceDocuments.map((doc, index) => (
                    <tr key={index}>
                      <td>{doc.url.split('/').pop()}</td>
                      <td>{doc.format?.toUpperCase()}</td>
                      <td>{(doc.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td>{formatDate(doc.uploadedAt)}</td>
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
                  Submit documents on behalf of patients (e.g., prescriptions, medical records). Active consent is required.
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

              {/* Submitted Documents */}
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
                            <Table.Td>{formatDate(doc.uploadedAt)}</Table.Td>
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

                  {/* Recent Consents */}
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
                          <Table.Th>Date</Table.Th>
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
                              <Badge color={getConsentStatusColor(consent.status)} variant="light">
                                {consent.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{formatDateForDisplay(consent.requestedAt)}</Text>
                            </Table.Td>
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

          <Tabs.Panel value="consultations" pt="md">
            <Stack spacing="lg">
              <Group position="apart">
                <Title order={4}>Recent Consultations</Title>
                <Button 
                  component={Link} 
                  to="/consultations" 
                  variant="outline"
                >
                  View All
                </Button>
              </Group>

              <Alert color="blue" icon={<IconStethoscope />}>
                Manage your patient consultations, view medical histories, and conduct video calls from the Consultations section.
              </Alert>

              <Card shadow="sm" p="lg" withBorder>
                <Stack spacing="md" align="center">
                  <IconStethoscope size={48} color="var(--mantine-color-blue-6)" />
                  <Title order={5}>Consultation Features</Title>
                  <Text size="sm" color="dimmed" ta="center">
                    Access your patient list, review medical histories with consent, and schedule or join video consultations.
                  </Text>
                  <Group>
                    <Button 
                      component={Link} 
                      to="/patients" 
                      leftSection={<IconUsers size={16} />}
                      variant="light"
                    >
                      My Patients
                    </Button>
                    <Button 
                      component={Link} 
                      to="/consultations" 
                      leftSection={<IconStethoscope size={16} />}
                    >
                      View Consultations
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
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
                      leftSection={<IconPlus size={16} />} 
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
                            <Badge size="sm">{referral.referralType || getReferralTypeLabel(referral.type)}</Badge>
                          </td>
                          <td>
                            <div>
                              <Text size="sm" weight={500}>
                                {referral.targetSnapshot?.name || referral.targetId?.name || 'N/A'}
                              </Text>
                              <Text size="xs" color="dimmed">
                                {referral.targetSnapshot?.role || referral.targetId?.role || ''}
                              </Text>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Text size="sm">
                                {referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}
                              </Text>
                              <Text size="xs" color="dimmed">
                                {referral.patientSnapshot?.phone || referral.patientId?.phone || ''}
                              </Text>
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
                            <Badge size="sm">{referral.referralType || getReferralTypeLabel(referral.type)}</Badge>
                          </td>
                          <td>
                            <div>
                              <Text size="sm" weight={500}>
                                {referral.sourceSnapshot?.name || referral.sourceId?.name || 'N/A'}
                              </Text>
                              <Text size="xs" color="dimmed">
                                {referral.sourceSnapshot?.role || referral.sourceId?.role || ''}
                              </Text>
                            </div>
                          </td>
                          <td>
                            <div>
                              <Text size="sm">
                                {referral.patientSnapshot?.name || referral.patientId?.name || 'N/A'}
                              </Text>
                              <Text size="xs" color="dimmed">
                                {referral.patientSnapshot?.phone || referral.patientId?.phone || ''}
                              </Text>
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

          <Tabs.Panel value="templates" pt="md">
            <Stack>
              <Group justify="space-between" mb="md">
                <Title order={4}>Prescription Templates</Title>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    templateForm.reset();
                    setEditingTemplate(null);
                    setTemplateModalOpened(true);
                  }}
                >
                  Create Template
                </Button>
              </Group>

              {loadingTemplates ? (
                <Loader />
              ) : templates.length === 0 ? (
                <Alert title="No Templates" color="blue">
                  You haven't created any prescription templates yet. Create one to speed up prescription creation.
                </Alert>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Template Name</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Medicines</Table.Th>
                      <Table.Th>Created</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {templates.map((template, idx) => {
                      console.log(`[DoctorProfile] Rendering template ${idx}:`, template);
                      
                      // Get template name - access directly from the object
                      const templateName = template?.name || `Template ${idx + 1}`;
                      const category = template?.category || 'General';
                      const medicinesCount = Array.isArray(template?.medicines) ? template.medicines.length : 0;
                      const createdDate = template?.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A';
                      const isActive = template?.isActive ?? true;
                      
                      console.log(`[DoctorProfile] Rendered template ${idx}: name="${templateName}" category="${category}"`);
                      
                      return (
                        <Table.Tr key={idx}>
                          <Table.Td fw={500}>{templateName}</Table.Td>
                          <Table.Td>
                            <Badge size="sm">{category}</Badge>
                          </Table.Td>
                          <Table.Td>{medicinesCount} medicine{medicinesCount !== 1 ? 's' : ''}</Table.Td>
                          <Table.Td>{createdDate}</Table.Td>
                          <Table.Td>
                            <Badge color={isActive ? 'green' : 'gray'}>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon.Group>
                              <ActionIcon
                                color="blue"
                                variant="subtle"
                                onClick={() => handleEditTemplate(idx)}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => handleDeleteTemplate(idx)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </ActionIcon.Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="pharmacies" pt="md">
            <Stack>
              <Group justify="space-between">
                <Title order={3}>Pharmacy Links</Title>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    loadAvailablePharmacies();
                    setAddPharmacyModalOpened(true);
                  }}
                >
                  Add Pharmacy
                </Button>
              </Group>

              {loadingPharmacyLinks ? (
                <Group justify="center" py="xl">
                  <Loader />
                </Group>
              ) : pharmacyLinks.length === 0 ? (
                <Alert color="blue" title="No Pharmacy Links">
                  You haven't sent any pharmacy link requests yet. Send a request to connect with pharmacies.
                </Alert>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Pharmacy Name</Table.Th>
                      <Table.Th>Location</Table.Th>
                      <Table.Th>Unique ID</Table.Th>
                      <Table.Th>Request Status</Table.Th>
                      <Table.Th>Requested On</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pharmacyLinks.map((link) => (
                      <Table.Tr key={link._id}>
                        <Table.Td>{link.pharmacyId?.pharmacyData?.name || 'N/A'}</Table.Td>
                        <Table.Td>{link.pharmacyId?.pharmacyData?.location || 'N/A'}</Table.Td>
                        <Table.Td>{link.pharmacyId?.uniqueId || 'N/A'}</Table.Td>
                        <Table.Td>
                          <Badge 
                            color={
                              link.requestStatus === 'ACCEPTED' ? 'green' : 
                              link.requestStatus === 'PENDING' ? 'yellow' : 
                              'red'
                            }
                          >
                            {link.requestStatus}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{new Date(link.createdAt).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                          {link.requestStatus === 'PENDING' ? (
                            <Text size="sm" c="dimmed">Waiting for approval</Text>
                          ) : link.requestStatus === 'REJECTED' ? (
                            <Button
                              size="xs"
                              variant="light"
                              onClick={() => handleDeletePharmacyLink(link.linkId)}
                            >
                              Resend
                            </Button>
                          ) : (
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDeletePharmacyLink(link.linkId)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="slots" pt="md">
            <SlotManagement entityType={BOOKING_TYPES.OPD} showMetadataFields={false} />
          </Tabs.Panel>
        </Tabs>
      </Paper>

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

      {/* Prescription Template Modal */}
      <Modal
        opened={templateModalOpened}
        onClose={() => {
          setTemplateModalOpened(false);
          templateForm.reset();
          setEditingTemplate(null);
        }}
        title={editingTemplate !== null ? 'Edit Template' : 'Create Template'}
        size="lg"
      >
        <form
          onSubmit={templateForm.onSubmit(
            editingTemplate !== null ? handleUpdateTemplate : handleCreateTemplate
          )}
        >
          <Stack>
            <TextInput
              label="Template Name"
              placeholder="e.g., Common Cold Treatment"
              {...templateForm.getInputProps('name')}
            />
            <Select
              label="Category"
              placeholder="Select category"
              data={Object.entries(TEMPLATE_CATEGORIES).map(([key, value]) => ({
                value: value,
                label: value,
              }))}
              {...templateForm.getInputProps('category')}
              searchable
            />
            <div>
              <Group justify="space-between" mb="md">
                <Text fw={500}>Medicines</Text>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleAddMedicineRow}
                >
                  Add Medicine
                </Button>
              </Group>
              <Stack>
                {(templateForm.values.medicines || []).map((medicine, medIdx) => (
                  <Card key={medIdx} withBorder p="md">
                    <Stack>
                      <Group grow>
                        <TextInput
                          label="Medicine Name"
                          placeholder="e.g., Amoxicillin"
                          value={medicine.name}
                          onChange={(e) =>
                            handleMedicineChange(medIdx, 'name', e.currentTarget.value)
                          }
                        />
                        <TextInput
                          label="Dosage"
                          placeholder="e.g., 500mg"
                          value={medicine.dosage}
                          onChange={(e) =>
                            handleMedicineChange(medIdx, 'dosage', e.currentTarget.value)
                          }
                        />
                        <NumberInput
                          label="Quantity"
                          placeholder="e.g., 10"
                          value={medicine.quantity}
                          onChange={(val) =>
                            handleMedicineChange(medIdx, 'quantity', val)
                          }
                          min={1}
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label="Duration"
                          placeholder="e.g., 5 days"
                          value={medicine.duration}
                          onChange={(e) =>
                            handleMedicineChange(medIdx, 'duration', e.currentTarget.value)
                          }
                        />
                      </Group>
                      <Group grow>
                        <Textarea
                          label="Instructions"
                          placeholder="e.g., Take with food"
                          value={medicine.instructions}
                          onChange={(e) =>
                            handleMedicineChange(medIdx, 'instructions', e.currentTarget.value)
                          }
                          rows={3}
                        />
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleRemoveMedicineRow(medIdx)}
                          mt="auto"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </div>
            <Textarea
              label="Template Notes (Optional)"
              placeholder="Any additional notes about this template"
              {...templateForm.getInputProps('notes')}
              rows={3}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => {
                  setTemplateModalOpened(false);
                  templateForm.reset();
                  setEditingTemplate(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate !== null ? 'Update' : 'Create'} Template
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Add Pharmacy Link Modal */}
      <Modal
        opened={addPharmacyModalOpened}
        onClose={() => {
          setAddPharmacyModalOpened(false);
          setSelectedPharmacyId('');
        }}
        title="Link Pharmacy"
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Send a connection request to a pharmacy. Once the pharmacy accepts your request, you can send prescriptions directly to them.
          </Text>
          
          {loadingPharmacies ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : (
            <Select
              label="Select Pharmacy"
              placeholder="Choose a pharmacy"
              data={availablePharmacies.map(pharmacy => ({
                value: pharmacy._id,
                label: `${pharmacy.pharmacyData?.name || 'Unknown'} - ${pharmacy.pharmacyData?.location || 'Location not set'}`,
              }))}
              value={selectedPharmacyId}
              onChange={setSelectedPharmacyId}
              searchable
              required
            />
          )}

          {availablePharmacies.length === 0 && !loadingPharmacies && (
            <Alert color="yellow" title="No Pharmacies Available">
              No pharmacies found in the system. Please contact support or try again later.
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setAddPharmacyModalOpened(false);
                setSelectedPharmacyId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPharmacyLink}
              disabled={!selectedPharmacyId || loadingPharmacies}
            >
              Send Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default DoctorProfilePage;
