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
  Badge,
  ActionIcon,
  Card,
  Indicator,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconPill,
  IconAlertTriangle,
  IconClock,
  IconArrowsExchange,
  IconUsers,
  IconCheck,
  IconX,
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
import { formatDateForDisplay } from '@arogyafirst/shared';
import ReferralDetailsModal from '../components/ReferralDetailsModal';
import { getReferralStatusColor, getReferralTypeLabel } from '../utils/referralHelpers';
import { REFERRAL_STATUS } from '@arogyafirst/shared';

export default function PharmacyProfilePage() {
  usePageTitle('Pharmacy Profile');
  const { user, refreshUser } = useAuth();
  const { loading: apiLoading, error: apiError, fetchData } = useAuthFetch();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [medicineModalType, setMedicineModalType] = useState('add');
  const [medicineModalData, setMedicineModalData] = useState({});
  const [filterActive, setFilterActive] = useState(true);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [expiringMedicines, setExpiringMedicines] = useState([]);
  const [medicinesData, setMedicinesData] = useState([]);
  
  // Referral states (received-only for pharmacy)
  const [receivedReferrals, setReceivedReferrals] = useState([]);
  const [referralStats, setReferralStats] = useState({ received: 0, pending: 0 });
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Doctor Links states
  const [pendingRequests, setPendingRequests] = useState([]);
  const [doctorLinks, setDoctorLinks] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const profileForm = useForm({
    initialValues: {
      name: user?.pharmacyData?.name || '',
      location: user?.pharmacyData?.location || '',
      licenseNumber: user?.pharmacyData?.licenseNumber || '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      location: (value) => (value.trim().length > 0 ? null : 'Location is required'),
      licenseNumber: (value) => (value.trim().length > 0 ? null : 'License number is required'),
    },
  });

  const medicineForm = useForm({
    initialValues: {
      name: '',
      genericName: '',
      manufacturer: '',
      stock: 0,
      reorderLevel: 10,
      price: 0,
      batchNumber: '',
      expiryDate: null,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Medicine name is required'),
      stock: (value) => (value >= 0 ? null : 'Stock must be non-negative'),
      reorderLevel: (value) => (value >= 0 ? null : 'Reorder level must be non-negative'),
      price: (value) => (value >= 0 ? null : 'Price must be non-negative'),
      expiryDate: (value) => (!value || new Date(value) > new Date() ? null : 'Expiry date must be in the future'),
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setValues({
        name: user.pharmacyData?.name || '',
        location: user.pharmacyData?.location || '',
        licenseNumber: user.pharmacyData?.licenseNumber || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'medicines') {
      fetchMedicines();
    } else if (activeTab === 'alerts') {
      fetchLowStockMedicines();
      fetchExpiringMedicines();
    } else if (activeTab === 'referrals') {
      loadReferrals();
    } else if (activeTab === 'doctors') {
      loadPendingRequests();
      loadDoctorLinks();
    }
  }, [activeTab]);

  const loadReferrals = async () => {
    if (!user?._id) return;
    setLoadingReferrals(true);
    try {
      // Fetch received referrals only (pharmacy receives only)
      const receivedResponse = await fetchData(`/api/referrals/target/${user._id}?limit=5`);
      if (receivedResponse) {
        setReceivedReferrals(receivedResponse.data || []);
      }
      
      // Calculate stats
      const receivedTotal = await fetchData(`/api/referrals/target/${user._id}`);
      const receivedPending = await fetchData(`/api/referrals/target/${user._id}?status=PENDING`);
      
      const receivedCount = receivedTotal?.data?.length || 0;
      const pendingCount = receivedPending?.data?.length || 0;
      
      setReferralStats({ received: receivedCount, pending: pendingCount });
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleReferralAction = async (referralId, action, reason = '') => {
    try {
      const endpoint = action === 'accept' 
        ? `/api/referrals/${referralId}/accept`
        : `/api/referrals/${referralId}/reject`;
      
      const data = await fetchData(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' ? { reason } : {}),
      });
      
      if (data) {
        showSuccessNotification(`Referral ${action}ed successfully`);
        loadReferrals();
      }
    } catch (error) {
      showErrorNotification(`Failed to ${action} referral`);
    }
  };

  // Doctor Links Functions
  const loadPendingRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetchData('/api/pharmacies/links/pending');
      setPendingRequests(res?.data || res || []);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
      showErrorNotification('Failed to load pending requests');
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadDoctorLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetchData('/api/pharmacies/links');
      setDoctorLinks(res?.data || res || []);
    } catch (error) {
      console.error('Failed to load doctor links:', error);
      showErrorNotification('Failed to load doctor links');
      setDoctorLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleAcceptRequest = async (linkId) => {
    try {
      await fetchData(`/api/pharmacies/links/${linkId}/accept`, {
        method: 'PUT',
      });
      showSuccessNotification('Request accepted successfully');
      loadPendingRequests();
      loadDoctorLinks();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (linkId) => {
    if (!confirm('Are you sure you want to reject this request?')) {
      return;
    }

    try {
      await fetchData(`/api/pharmacies/links/${linkId}/reject`, {
        method: 'PUT',
      });
      showSuccessNotification('Request rejected successfully');
      loadPendingRequests();
    } catch (error) {
      showErrorNotification(error.message || 'Failed to reject request');
    }
  };

  const handleUpdateProfile = async (values) => {
    const data = await fetchData('/api/pharmacies/profile', {
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

  const handleAddMedicine = async (data) => {
    const payload = {
      ...data,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
    };
    const result = await fetchData('/api/pharmacies/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (result) {
      showSuccessNotification('Medicine added successfully');
      refreshUser();
      closeModal();
    } else {
      showErrorNotification('Failed to add medicine');
    }
  };

  const handleUpdateMedicine = async (id, data) => {
    const payload = {
      ...data,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
    };
    const result = await fetchData(`/api/pharmacies/medicines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (result) {
      showSuccessNotification('Medicine updated successfully');
      fetchMedicines();
      closeModal();
    } else {
      showErrorNotification('Failed to update medicine');
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    const result = await fetchData(`/api/pharmacies/medicines/${id}`, {
      method: 'DELETE',
    });
    if (result) {
      showSuccessNotification('Medicine deleted successfully');
      fetchMedicines();
    } else {
      showErrorNotification('Failed to delete medicine');
    }
  };

  const fetchLowStockMedicines = async () => {
    const data = await fetchData('/api/pharmacies/medicines/low-stock');
    if (data) {
      setLowStockMedicines(data.data?.medicines || []);
    }
  };

  const fetchExpiringMedicines = async () => {
    const data = await fetchData('/api/pharmacies/medicines/expiring');
    if (data) {
      setExpiringMedicines(data.data?.medicines || []);
    }
  };

  const formatDate = (date) => {
    return date ? formatDateForDisplay(date) : 'N/A';
  };

  const getStockColor = (stock, reorderLevel) => {
    if (stock === 0) return 'red';
    if (stock <= reorderLevel) return 'yellow';
    return 'green';
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const formatCurrency = (price) => {
    return `₹${price.toFixed(2)}`;
  };

  const openAddMedicineModal = () => {
    setMedicineModalType('add');
    setMedicineModalData({});
    medicineForm.reset();
    setMedicineModalOpen(true);
  };

  const fetchMedicines = async () => {
    const result = await fetchData('/api/pharmacies/medicines');
    if (result?.data?.medicines) {
      setMedicinesData(result.data.medicines);
    }
  };

  const openEditMedicineModal = (medicine) => {
    setMedicineModalType('edit');
    setMedicineModalData(medicine);
    medicineForm.setValues({
      ...medicine,
      expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate) : null,
    });
    setMedicineModalOpen(true);
  };

  const closeModal = () => {
    setMedicineModalOpen(false);
    setMedicineModalData({});
    medicineForm.reset();
  };

  // Handle medicine form submission for both add and edit operations
  const handleMedicineModalSubmit = (values) => {
    if (medicineModalType === 'add') {
      handleAddMedicine(values);
    } else {
      // Use _id for updates instead of array index
      handleUpdateMedicine(medicineModalData._id, values);
    }
  };

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Loader size="lg" />
      </Container>
    );
  }

  const pharmacyData = user.pharmacyData || {};
  const medicines = medicinesData || [];
  const filteredMedicines = filterActive ? medicines.filter(m => m.isActive !== false) : medicines;

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="md">
        <Title order={2} mb="md">
          Pharmacy Profile
        </Title>
        {apiError && <Alert color="red" mb="md">{apiError}</Alert>}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="info" icon={<IconPill size={16} />}>
              Info
            </Tabs.Tab>
            <Tabs.Tab value="medicines" icon={<IconPill size={16} />}>
              Medicines
            </Tabs.Tab>
            <Tabs.Tab value="alerts" icon={<IconAlertTriangle size={16} />}>
              Alerts
              {(lowStockMedicines.length > 0 || expiringMedicines.length > 0) && (
                <Indicator size={16} color="red" />
              )}
            </Tabs.Tab>
            <Tabs.Tab value="referrals" icon={<IconArrowsExchange size={16} />}>
              Received Referrals
              {referralStats.pending > 0 && (
                <Badge size="sm" color="red" ml={4}>{referralStats.pending}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="doctors" icon={<IconUsers size={16} />}>
              Doctor Requests
              {pendingRequests.length > 0 && (
                <Badge size="sm" color="red" ml={4}>{pendingRequests.length}</Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="info" pt="md">
            {isEditing ? (
              <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                <Stack>
                  <TextInput label="Name" {...profileForm.getInputProps('name')} />
                  <TextInput label="Location" {...profileForm.getInputProps('location')} />
                  <TextInput label="License Number" {...profileForm.getInputProps('licenseNumber')} />
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
                  <Text>{pharmacyData.name || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Email:</Text>
                  <Text>{user.email}</Text>
                </Group>
                <Group>
                  <Text fw={500}>Location:</Text>
                  <Text>{pharmacyData.location || 'Not set'}</Text>
                </Group>
                <Group>
                  <Text fw={500}>License Number:</Text>
                  <Text>{pharmacyData.licenseNumber || 'Not set'}</Text>
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

          <Tabs.Panel value="medicines" pt="md">
            <Group mb="md">
              <Button leftIcon={<IconPlus size={16} />} onClick={openAddMedicineModal}>
                Add Medicine
              </Button>
              <Button variant="outline" onClick={() => setFilterActive(!filterActive)}>
                {filterActive ? 'Show All' : 'Show Active Only'}
              </Button>
            </Group>
            <Table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Generic Name</th>
                  <th>Manufacturer</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Price</th>
                  <th>Batch Number</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.length ? (
                  filteredMedicines.map((medicine) => (
                    <tr key={medicine._id || medicine.addedAt}>
                      <td>{medicine.name}</td>
                      <td>{medicine.genericName || 'N/A'}</td>
                      <td>{medicine.manufacturer || 'N/A'}</td>
                      <td>
                        <Badge color={getStockColor(medicine.stock, medicine.reorderLevel)}>
                          {medicine.stock}
                        </Badge>
                      </td>
                      <td>{medicine.reorderLevel}</td>
                      <td>{formatCurrency(medicine.price)}</td>
                      <td>{medicine.batchNumber || 'N/A'}</td>
                      <td>
                        <Badge color={isExpiringSoon(medicine.expiryDate) ? 'red' : 'gray'}>
                          {formatDate(medicine.expiryDate)}
                        </Badge>
                      </td>
                      <td>
                        <Group>
                          <ActionIcon onClick={() => openEditMedicineModal(medicine)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon color="red" onClick={() => handleDeleteMedicine(medicine._id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9}>No medicines found</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Tabs.Panel>

          <Tabs.Panel value="alerts" pt="md">
            <Stack>
              <Card shadow="sm" p="md">
                <Title order={4} mb="sm">
                  Low Stock Medicines
                  <Badge color="yellow" ml="sm">{lowStockMedicines.length}</Badge>
                </Title>
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Stock</th>
                      <th>Reorder Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockMedicines.length ? (
                      lowStockMedicines.map((medicine, index) => (
                        <tr key={index}>
                          <td>{medicine.name}</td>
                          <td>{medicine.stock}</td>
                          <td>{medicine.reorderLevel}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No low stock medicines</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card>
              <Card shadow="sm" p="md">
                <Title order={4} mb="sm">
                  Expiring Soon
                  <Badge color="red" ml="sm">{expiringMedicines.length}</Badge>
                </Title>
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringMedicines.length ? (
                      expiringMedicines.map((medicine, index) => {
                        const daysLeft = Math.ceil((new Date(medicine.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={index}>
                            <td>{medicine.name}</td>
                            <td>{formatDate(medicine.expiryDate)}</td>
                            <td>{daysLeft} days</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3}>No medicines expiring soon</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="referrals" pt="md">
            <Stack spacing="xl">
              {/* Stats */}
              <Group grow>
                <Paper p="md" withBorder>
                  <Text size="sm" color="dimmed">Total Received</Text>
                  <Text size="xl" weight={700}>{referralStats.received}</Text>
                </Paper>
                <Paper p="md" withBorder>
                  <Text size="sm" color="dimmed">Pending Actions</Text>
                  <Text size="xl" weight={700} color="orange">{referralStats.pending}</Text>
                </Paper>
              </Group>

              {/* Received Referrals */}
              <div>
                <Group mb="md" position="apart">
                  <Title order={4}>Received Referrals</Title>
                  <Button variant="outline" onClick={() => window.location.href = '/referrals'}>
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
                            <Group spacing="xs">
                              {referral.status === 'PENDING' && (
                                <>
                                  <Button 
                                    size="xs" 
                                    color="green"
                                    onClick={() => handleReferralAction(referral._id, 'accept')}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    size="xs" 
                                    color="red" 
                                    variant="outline"
                                    onClick={() => {
                                      const reason = prompt('Rejection reason (optional):');
                                      handleReferralAction(referral._id, 'reject', reason || '');
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
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
                            </Group>
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

          <Tabs.Panel value="doctors" pt="md">
            <Stack gap="lg">
              {/* Pending Requests Section */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Pending Connection Requests</Title>
                {loadingRequests ? (
                  <Group justify="center" py="xl">
                    <Loader />
                  </Group>
                ) : pendingRequests.length === 0 ? (
                  <Alert color="blue">No pending requests at the moment.</Alert>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Doctor Name</Table.Th>
                        <Table.Th>Specialization</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Requested On</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {pendingRequests.map((request) => (
                        <Table.Tr key={request._id}>
                          <Table.Td>{request.doctorId?.doctorData?.name || 'N/A'}</Table.Td>
                          <Table.Td>{request.doctorId?.doctorData?.specialization || 'N/A'}</Table.Td>
                          <Table.Td>{request.doctorId?.email || 'N/A'}</Table.Td>
                          <Table.Td>{new Date(request.createdAt).toLocaleDateString()}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Button
                                size="xs"
                                color="green"
                                leftSection={<IconCheck size={14} />}
                                onClick={() => handleAcceptRequest(request.linkId)}
                              >
                                Accept
                              </Button>
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                leftSection={<IconX size={14} />}
                                onClick={() => handleRejectRequest(request.linkId)}
                              >
                                Reject
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>

              {/* Accepted Doctor Links Section */}
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">Connected Doctors</Title>
                {loadingLinks ? (
                  <Group justify="center" py="xl">
                    <Loader />
                  </Group>
                ) : doctorLinks.length === 0 ? (
                  <Alert color="blue">No connected doctors yet. Accept requests above to connect with doctors.</Alert>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Doctor Name</Table.Th>
                        <Table.Th>Specialization</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Unique ID</Table.Th>
                        <Table.Th>Connected On</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {doctorLinks.map((link) => (
                        <Table.Tr key={link._id}>
                          <Table.Td>{link.doctorId?.doctorData?.name || 'N/A'}</Table.Td>
                          <Table.Td>{link.doctorId?.doctorData?.specialization || 'N/A'}</Table.Td>
                          <Table.Td>{link.doctorId?.email || 'N/A'}</Table.Td>
                          <Table.Td>{link.doctorId?.uniqueId || 'N/A'}</Table.Td>
                          <Table.Td>{new Date(link.respondedAt || link.createdAt).toLocaleDateString()}</Table.Td>
                          <Table.Td>
                            <Badge color="green">Active</Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={medicineModalOpen}
        onClose={closeModal}
        title={`${medicineModalType === 'add' ? 'Add' : 'Edit'} Medicine`}
        size="md"
      >
        <form onSubmit={medicineForm.onSubmit(handleMedicineModalSubmit)}>
          <Stack>
            <TextInput label="Name" {...medicineForm.getInputProps('name')} required />
            <TextInput label="Generic Name" {...medicineForm.getInputProps('genericName')} />
            <TextInput label="Manufacturer" {...medicineForm.getInputProps('manufacturer')} />
            <NumberInput label="Stock" {...medicineForm.getInputProps('stock')} required min={0} />
            <NumberInput label="Reorder Level" {...medicineForm.getInputProps('reorderLevel')} min={0} />
            <NumberInput label="Price" {...medicineForm.getInputProps('price')} required min={0} step={0.01} />
            <TextInput label="Batch Number" {...medicineForm.getInputProps('batchNumber')} />
            <DateInput label="Expiry Date" {...medicineForm.getInputProps('expiryDate')} />
            <Group>
              <Button type="submit" loading={apiLoading}>
                {medicineModalType === 'add' ? 'Add' : 'Update'}
              </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Referral Details Modal */}
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