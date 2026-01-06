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
  NumberInput,
  Badge,
  Group,
  Stack,
  Select,
  ActionIcon,
  Tabs,
  Card,
  Loader,
  Alert,
  Divider,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconX,
  IconCheck,
  IconTrash,
  IconTemplate,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { ROLES, PRESCRIPTION_STATUS, validateMedicineFormat } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { PrescriptionDetailsModal } from '../components/PrescriptionDetailsModal';
import { MedicineAutocomplete } from '../components/MedicineAutocomplete';

/**
 * Doctor Prescription View
 * Create and manage prescriptions
 */
const DoctorPrescriptionView = () => {
  usePageTitle('Prescriptions');
  const { user } = useAuth();
  const { loading, fetchData } = useAuthFetch();
  const [prescriptions, setPrescriptions] = useState([]);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  
  // Form state - with safeguards to prevent corruption
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [medicines, setMedicinesRaw] = useState([{ name: '', dosage: '', quantity: 1, instructions: '', duration: '' }]);
  
  // Wrapper to ensure medicines is always an array
  const setMedicines = (value) => {
    const corrected = Array.isArray(value) ? value : [{ name: '', dosage: '', quantity: 1, instructions: '', duration: '' }];
    setMedicinesRaw(corrected);
  };
  
  const [notes, setNotes] = useState('');
  const [pharmacyId, setPharmacyId] = useState('');
  const [linkedPharmacies, setLinkedPharmacies] = useState([]);
  
  // Template state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  useEffect(() => {
    loadPrescriptions();
    loadLinkedPharmacies();
    loadTemplates();
    loadPatients();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const response = await fetchData('/api/prescriptions/doctor');
      console.log('[Prescription.load] Response:', response);
      const prescriptionsData = response?.data || [];
      console.log('[Prescription.load] prescriptionsData:', prescriptionsData, 'isArray:', Array.isArray(prescriptionsData));
      
      // Sanitize prescriptions data to ensure medicines is always an array
      const sanitizedPrescriptions = Array.isArray(prescriptionsData)
        ? prescriptionsData.map(p => {
            console.log('[Prescription.load] Mapping prescription:', p, 'medicines type:', typeof p.medicines);
            return {
              ...p,
              medicines: Array.isArray(p.medicines) ? p.medicines : []
            };
          })
        : [];
      
      console.log('[Prescription.load] sanitizedPrescriptions:', sanitizedPrescriptions);
      setPrescriptions(sanitizedPrescriptions);
    } catch (error) {
      console.error('[Prescription.load] Error:', error);
      showErrorNotification('Failed to load prescriptions');
      setPrescriptions([]); // Default to empty array on error
    }
  };

  const loadLinkedPharmacies = async () => {
    try {
      const response = await fetchData('/api/pharmacies/links');
      const pharmaciesData = response?.data || [];
      // Filter only accepted links for prescription creation
      const acceptedLinks = Array.isArray(pharmaciesData) 
        ? pharmaciesData.filter(link => link.requestStatus === 'ACCEPTED' && link.isActive)
        : [];
      setLinkedPharmacies(acceptedLinks);
    } catch (error) {
      console.error('Failed to load linked pharmacies');
      setLinkedPharmacies([]); // Default to empty array on error
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetchData('/api/doctors/templates?activeOnly=true');
      console.log('[Prescription.loadTemplates] Response:', res);
      let templatesData = [];
      
      // Handle different response structures
      if (Array.isArray(res)) {
        templatesData = res;
      } else if (res?.data && Array.isArray(res.data)) {
        templatesData = res.data;
      } else if (res?.data?.templates && Array.isArray(res.data.templates)) {
        templatesData = res.data.templates;
      }
      
      console.log('[Prescription.loadTemplates] templatesData:', templatesData, 'isArray:', Array.isArray(templatesData));
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.templateId === templateId || templates.indexOf(t) === parseInt(templateId, 10));
    if (template) {
      // Ensure medicines is an array
      const medicinesArray = Array.isArray(template.medicines) ? template.medicines : [];
      if (medicinesArray.length > 0) {
        // Deep copy the medicines array from the template
        const copiedMedicines = medicinesArray.map(m => ({
          ...m,
        }));
        setMedicines(copiedMedicines);
      }
    }
  };

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      const response = await fetchData(`/api/doctors/${user._id}/patients?limit=100`);
      const patientsData = response?.data?.patients || [];
      console.log('[Prescription.loadPatients] Response:', response);
      console.log('[Prescription.loadPatients] patientsData:', patientsData);
      
      // Ensure patients is an array
      const sanitizedPatients = Array.isArray(patientsData)
        ? patientsData.map(p => ({
            _id: p._id || p.patientId,
            name: p.name || 'Unknown',
            email: p.email || '',
          }))
        : [];
      
      setPatients(sanitizedPatients);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleCreatePrescription = async () => {
    try {
      // Validate patient ID
      if (!patientId || patientId.trim() === '') {
        showErrorNotification('Please select a patient');
        return;
      }
      
      console.log('[Prescription] medicines state:', medicines, 'type:', typeof medicines);
      
      // Ensure medicines is always an array first
      const medicinesToValidate = Array.isArray(medicines) ? medicines : [];
      console.log('[Prescription] medicinesToValidate:', medicinesToValidate);
      
      // Log each medicine for debugging
      medicinesToValidate.forEach((m, idx) => {
        console.log(`[Prescription] Medicine ${idx}:`, { 
          name: m.name, 
          dosage: m.dosage, 
          quantity: m.quantity,
          hasBoth: !!(m.name && m.dosage),
          hasQuantity: !!(typeof m.quantity !== 'undefined' && m.quantity !== null && m.quantity !== '')
        });
      });
      
      // Filter and validate medicines
      const validMedicines = medicinesToValidate
        .filter(m => {
          const hasNameAndDosage = !!(m.name && m.dosage && m.name.trim() && m.dosage.trim());
          const hasQuantity = typeof m.quantity !== 'undefined' && m.quantity !== null && m.quantity !== '';
          console.log(`[Prescription] Filtering medicine: name='${m.name}' dosage='${m.dosage}' qty='${m.quantity}' hasNameAndDosage=${hasNameAndDosage} hasQuantity=${hasQuantity}`);
          return hasNameAndDosage && hasQuantity;
        })
        .map(m => ({
          ...m,
          quantity: Number.isInteger(m.quantity) ? m.quantity : parseInt(m.quantity, 10) || 1
        }));
      
      console.log('[Prescription] validMedicines after filtering:', validMedicines);
      
      if (validMedicines.length === 0) {
        console.error('[Prescription] No valid medicines found. Current medicines:', medicines);
        showErrorNotification('Please add at least one medicine with name, dosage, and quantity');
        return;
      }
      
      // Validate pharmacy is selected
      if (!pharmacyId) {
        showErrorNotification('Please select a pharmacy for this prescription');
        return;
      }
      
      // Validate medicine format
      for (const medicine of validMedicines) {
        const fullMedicine = `${medicine.name} ${medicine.dosage}`;
        if (!validateMedicineFormat(fullMedicine)) {
          showErrorNotification(`Invalid medicine format: ${fullMedicine}. Use "Name Dosage" (e.g., "Paracetamol 650mg")`);
          return;
        }
      }
      
      console.log('Creating prescription with data:', { patientId, validMedicines, pharmacyId, notes });
      
      const createResponse = await fetchData('/api/prescriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          medicines: validMedicines,
          pharmacyId,
          notes,
        }),
      });
      console.log('[Prescription] Create response:', createResponse);
      
      // Ensure response data is valid
      if (createResponse?.data) {
        console.log('[Prescription] Response medicines:', createResponse.data.medicines, 'type:', typeof createResponse.data.medicines);
        if (createResponse.data.medicines === true || !Array.isArray(createResponse.data.medicines)) {
          console.warn('[Prescription] Response medicines is not an array, resetting to empty array');
          createResponse.data.medicines = [];
        }
      }
      
      console.log('Prescription created successfully');
      showSuccessNotification('Prescription created successfully');
      setCreateModalOpened(false);
      resetForm();
      console.log('[Prescription] Calling loadPrescriptions...');
      await loadPrescriptions();
      console.log('[Prescription] loadPrescriptions completed');
    } catch (error) {
      console.error('Error creating prescription:', error);
      showErrorNotification(error.message || 'Failed to create prescription');
    }
  };

  const handleCancelPrescription = async (prescriptionId) => {
    try {
      await fetchData(`/api/prescriptions/${prescriptionId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: 'Cancelled by doctor' }),
      });
      showSuccessNotification('Prescription cancelled');
      loadPrescriptions();
    } catch (error) {
      showErrorNotification('Failed to cancel prescription');
    }
  };

  const resetForm = () => {
    setPatientId('');
    setMedicines([{ name: '', dosage: '', quantity: 1, instructions: '', duration: '' }]);
    setNotes('');
    setPharmacyId('');
    setSelectedTemplateId('');
  };

  const addMedicineRow = () => {
    setMedicines([...(Array.isArray(medicines) ? medicines : []), { name: '', dosage: '', quantity: 1, instructions: '', duration: '' }]);
  };

  const removeMedicineRow = (index) => {
    if (Array.isArray(medicines)) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const updateMedicine = (index, field, value) => {
    if (Array.isArray(medicines)) {
      const updated = [...medicines];
      updated[index][field] = value;
      setMedicines(updated);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      [PRESCRIPTION_STATUS.PENDING]: 'yellow',
      [PRESCRIPTION_STATUS.FULFILLED]: 'green',
      [PRESCRIPTION_STATUS.CANCELLED]: 'red',
    };
    return <Badge color={colors[status] || 'gray'}>{status}</Badge>;
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>My Prescriptions</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpened(true)}>
          Create Prescription
        </Button>
      </Group>

      {loading ? (
        <Loader />
      ) : prescriptions.length > 0 ? (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Patient</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Medicines</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.isArray(prescriptions) && prescriptions.map((prescription) => (
              <Table.Tr key={prescription.prescriptionId}>
                <Table.Td>{prescription.patientSnapshot?.name || 'Unknown'}</Table.Td>
                <Table.Td>{formatDateForDisplay(prescription.createdAt)}</Table.Td>
                <Table.Td>{Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} item(s)</Table.Td>
                <Table.Td>{getStatusBadge(prescription.status)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      color="blue"
                      variant="light"
                      onClick={() => {
                        setSelectedPrescription(prescription);
                        setViewModalOpened(true);
                      }}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    {prescription.status === PRESCRIPTION_STATUS.PENDING && (
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleCancelPrescription(prescription.prescriptionId)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Alert>No prescriptions created yet</Alert>
      )}

      {/* Create Prescription Modal */}
      <Modal
        opened={createModalOpened}
        onClose={() => {
          setCreateModalOpened(false);
          resetForm();
        }}
        title="Create Prescription"
        size="xl"
      >
        <Stack>
          {Array.isArray(templates) && templates.length > 0 && (
            <Select
              label="Use Template (Optional)"
              placeholder="Select a template to pre-fill medicines"
              data={templates.map((template, idx) => ({
                value: String(idx),
                label: `${template?.name || 'Template'} - ${template?.category || 'General'}`,
              })) || []}
              value={selectedTemplateId}
              onChange={handleTemplateSelect}
              clearable
              searchable
            />
          )}
          <Select
            label="Patient"
            placeholder="Select a patient from your list"
            data={Array.isArray(patients) ? patients.map(p => ({
              value: String(p._id),
              label: `${p.name}${p.email ? ` (${p.email})` : ''}`
            })) : []}
            value={patientId}
            onChange={setPatientId}
            searchable
            required
            loading={patientsLoading}
            disabled={patientsLoading || (Array.isArray(patients) && patients.length === 0)}
          />
          {Array.isArray(patients) && patients.length === 0 && !patientsLoading && (
            <Alert color="yellow" title="No Patients Found">
              You don't have any patients assigned yet. Patients appear here after consultations or consent requests.
            </Alert>
          )}

          <Divider label="Medicines" />
          {Array.isArray(medicines) && medicines.map((medicine, index) => (
            <Card key={index} withBorder p="sm">
              <Group align="flex-start">
                <Stack style={{ flex: 1 }}>
                  <MedicineAutocomplete
                    value={medicine.name && medicine.dosage ? `${medicine.name} ${medicine.dosage}` : ''}
                    onChange={(fullString, { name, dosage }) => {
                      updateMedicine(index, 'name', name);
                      updateMedicine(index, 'dosage', dosage);
                    }}
                    placeholder="Search or type medicine name & dosage (e.g., Paracetamol 650mg)"
                    required
                  />
                  <Group grow>
                    <NumberInput
                      label="Quantity"
                      value={medicine.quantity}
                      onChange={(val) => updateMedicine(index, 'quantity', val)}
                      min={1}
                      required
                    />
                    <TextInput
                      label="Duration"
                      placeholder="e.g., 5 days"
                      value={medicine.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                    />
                  </Group>
                  <Textarea
                    label="Instructions"
                    placeholder="e.g., Take after meals"
                    value={medicine.instructions}
                    onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                    rows={2}
                  />
                </Stack>
                <ActionIcon color="red" onClick={() => removeMedicineRow(index)} mt="xl">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
          <Button variant="outline" leftSection={<IconPlus size={16} />} onClick={addMedicineRow}>
            Add Medicine
          </Button>

          <Select
            label="Pharmacy"
            placeholder="Select pharmacy"
            data={(Array.isArray(linkedPharmacies) ? linkedPharmacies.map(link => ({
              value: String(link.pharmacyId?._id || link._id || ''),
              label: link.pharmacyId?.pharmacyData?.name || link.pharmacyData?.name || 'Unknown'
            })) : []) || []}
            value={pharmacyId}
            onChange={setPharmacyId}
            searchable
            required
            error={!pharmacyId && Array.isArray(linkedPharmacies) && linkedPharmacies.length === 0 ? 'No linked pharmacies available' : undefined}
          />
          {Array.isArray(linkedPharmacies) && linkedPharmacies.length === 0 && (
            <Alert color="yellow" title="No Linked Pharmacies">
              You need to link a pharmacy before creating prescriptions. Please go to your profile and click on the "Pharmacy Links" tab to add pharmacy connections.
            </Alert>
          )}

          <Textarea
            label="Notes"
            placeholder="Additional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setCreateModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePrescription} loading={loading}>
              Create Prescription
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Prescription Modal */}
      <PrescriptionDetailsModal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        prescription={selectedPrescription}
      />
    </Container>
  );
};

/**
 * Patient Prescription View
 * View prescriptions and pre-book at pharmacies
 */
const PatientPrescriptionView = () => {
  const { user } = useAuth();
  const { loading, fetchData } = useAuthFetch();
  const [prescriptions, setPrescriptions] = useState([]);
  const [prebookModalOpened, setPrebookModalOpened] = useState(false);
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [nearbyPharmacies, setNearbyPharmacies] = useState([]);

  useEffect(() => {
    loadPrescriptions();
    loadNearbyPharmacies();
  }, []);

  const loadPrescriptions = async () => {
    try {
      const response = await fetchData(`/api/prescriptions/patient/${user._id}`);
      const prescriptionsData = response?.data || [];
      // Sanitize prescriptions data to ensure medicines is always an array
      const sanitizedPrescriptions = Array.isArray(prescriptionsData)
        ? prescriptionsData.map(p => ({
            ...p,
            medicines: Array.isArray(p.medicines) ? p.medicines : []
          }))
        : [];
      setPrescriptions(sanitizedPrescriptions);
    } catch (error) {
      showErrorNotification('Failed to load prescriptions');
      setPrescriptions([]);
    }
  };

  const loadNearbyPharmacies = async () => {
    try {
      const response = await fetchData('/api/providers/search?entityType=PHARMACY&limit=50');
      const pharmaciesData = response?.data?.providers || [];
      setNearbyPharmacies(Array.isArray(pharmaciesData) ? pharmaciesData : []);
    } catch (error) {
      console.error('Failed to load pharmacies');
      setNearbyPharmacies([]);
    }
  };

  const handlePrebookPrescription = async () => {
    if (!selectedPharmacyId || !selectedPrescription) return;

    try {
      await fetchData(`/api/prescriptions/${selectedPrescription.prescriptionId}/prebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacyId: selectedPharmacyId }),
      });
      showSuccessNotification('Prescription pre-booked successfully');
      setPrebookModalOpened(false);
      setSelectedPharmacyId('');
      loadPrescriptions();
    } catch (error) {
      showErrorNotification('Failed to pre-book prescription');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      [PRESCRIPTION_STATUS.PENDING]: 'yellow',
      [PRESCRIPTION_STATUS.FULFILLED]: 'green',
      [PRESCRIPTION_STATUS.CANCELLED]: 'red',
    };
    return <Badge color={colors[status] || 'gray'}>{status}</Badge>;
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">My Prescriptions</Title>

      {loading ? (
        <Loader />
      ) : Array.isArray(prescriptions) && prescriptions.length > 0 ? (
        <Stack>
          {prescriptions.map((prescription) => (
            <Card key={prescription.prescriptionId} shadow="sm" p="lg" withBorder>
              <Group justify="space-between" mb="md">
                <div>
                  <Text fw={600}>Dr. {prescription.doctorSnapshot?.name}</Text>
                  <Text size="sm" c="dimmed">{prescription.doctorSnapshot?.specialization}</Text>
                </div>
                {getStatusBadge(prescription.status)}
              </Group>

              <Text size="sm" mb="xs">
                <strong>Date:</strong> {formatDateForDisplay(prescription.createdAt)}
              </Text>

              <Text size="sm" mb="xs">
                <strong>Medicines:</strong> {Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} item(s)
              </Text>

              {prescription.pharmacySnapshot && (
                <Text size="sm" mb="xs">
                  <strong>Pharmacy:</strong> {prescription.pharmacySnapshot.name}
                </Text>
              )}

              <Group mt="md">
                <Button
                  variant="light"
                  leftSection={<IconEye size={16} />}
                  onClick={() => {
                    setSelectedPrescription(prescription);
                    setViewModalOpened(true);
                  }}
                >
                  View Details
                </Button>
                {prescription.status === PRESCRIPTION_STATUS.PENDING && !prescription.pharmacyId && (
                  <Button
                    color="green"
                    onClick={() => {
                      setSelectedPrescription(prescription);
                      setPrebookModalOpened(true);
                    }}
                  >
                    Pre-book at Pharmacy
                  </Button>
                )}
              </Group>
            </Card>
          ))}
        </Stack>
      ) : (
        <Alert>No prescriptions found</Alert>
      )}

      {/* Pre-book Modal */}
      <Modal
        opened={prebookModalOpened}
        onClose={() => {
          setPrebookModalOpened(false);
          setSelectedPharmacyId('');
        }}
        title="Pre-book at Pharmacy"
      >
        <Stack>
          <Select
            label="Select Pharmacy"
            placeholder="Choose a pharmacy"
            data={(Array.isArray(nearbyPharmacies) ? nearbyPharmacies.map(pharmacy => ({
              value: String(pharmacy?._id || ''),
              label: `${pharmacy?.name || 'Pharmacy'} - ${pharmacy?.pharmacyData?.location || 'No location'}`
            })) : []) || []}
            value={selectedPharmacyId}
            onChange={setSelectedPharmacyId}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setPrebookModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrebookPrescription} loading={loading} disabled={!selectedPharmacyId}>
              Confirm Pre-booking
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* View Prescription Modal */}
      <PrescriptionDetailsModal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        prescription={selectedPrescription}
      />
    </Container>
  );
};

/**
 * Pharmacy Prescription View
 * View incoming prescriptions and fulfill them
 */
const PharmacyPrescriptionView = () => {
  const { loading, fetchData } = useAuthFetch();
  const [prescriptions, setPrescriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, [activeTab]);

  const loadPrescriptions = async () => {
    try {
      const status = activeTab === 'all' ? undefined : activeTab.toUpperCase();
      const url = status ? `/api/prescriptions/pharmacy?status=${status}` : '/api/prescriptions/pharmacy';
      const response = await fetchData(url);
      const prescriptionsData = response?.data || [];
      // Sanitize prescriptions data to ensure medicines is always an array
      const sanitizedPrescriptions = Array.isArray(prescriptionsData)
        ? prescriptionsData.map(p => ({
            ...p,
            medicines: Array.isArray(p.medicines) ? p.medicines : []
          }))
        : [];
      setPrescriptions(sanitizedPrescriptions);
    } catch (error) {
      showErrorNotification('Failed to load prescriptions');
      setPrescriptions([]);
    }
  };

  const handleFulfillPrescription = async (prescriptionId) => {
    try {
      await fetchData(`/api/prescriptions/${prescriptionId}/fulfill`, {
        method: 'PUT',
      });
      showSuccessNotification('Prescription fulfilled successfully');
      loadPrescriptions();
    } catch (error) {
      showErrorNotification('Failed to fulfill prescription');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      [PRESCRIPTION_STATUS.PENDING]: 'yellow',
      [PRESCRIPTION_STATUS.FULFILLED]: 'green',
      [PRESCRIPTION_STATUS.CANCELLED]: 'red',
    };
    return <Badge color={colors[status] || 'gray'}>{status}</Badge>;
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">Incoming Prescriptions</Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="pending">Pending</Tabs.Tab>
          <Tabs.Tab value="fulfilled">Fulfilled</Tabs.Tab>
          <Tabs.Tab value="all">All</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {loading ? (
        <Loader mt="lg" />
      ) : prescriptions.length > 0 ? (
        <Table striped highlightOnHover mt="lg">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Patient</Table.Th>
              <Table.Th>Doctor</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Medicines</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.isArray(prescriptions) && prescriptions.map((prescription) => (
              <Table.Tr key={prescription.prescriptionId}>
                <Table.Td>{prescription.patientSnapshot?.name || 'Unknown'}</Table.Td>
                <Table.Td>Dr. {prescription.doctorSnapshot?.name || 'Unknown'}</Table.Td>
                <Table.Td>{formatDateForDisplay(prescription.createdAt)}</Table.Td>
                <Table.Td>{Array.isArray(prescription.medicines) ? prescription.medicines.length : 0} item(s)</Table.Td>
                <Table.Td>{getStatusBadge(prescription.status)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      color="blue"
                      variant="light"
                      onClick={() => {
                        setSelectedPrescription(prescription);
                        setViewModalOpened(true);
                      }}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    {prescription.status === PRESCRIPTION_STATUS.PENDING && (
                      <ActionIcon
                        color="green"
                        variant="light"
                        onClick={() => handleFulfillPrescription(prescription.prescriptionId)}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Alert mt="lg">No prescriptions found</Alert>
      )}

      {/* View Prescription Modal */}
      <PrescriptionDetailsModal
        opened={viewModalOpened}
        onClose={() => setViewModalOpened(false)}
        prescription={selectedPrescription}
      />
    </Container>
  );
};

/**
 * Main PrescriptionsPage component
 * Role-aware rendering
 */
export default function PrescriptionsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Alert color="red">Please log in to view prescriptions</Alert>
      </Container>
    );
  }

  if (user.role === ROLES.DOCTOR) {
    return <DoctorPrescriptionView />;
  }

  if (user.role === ROLES.PHARMACY) {
    return <PharmacyPrescriptionView />;
  }

  return <PatientPrescriptionView />;
}
