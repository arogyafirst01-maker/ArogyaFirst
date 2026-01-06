import { useState, useEffect, useCallback } from 'react';
import {
  Container, Title, Tabs, Table, Modal, TextInput, Select, Textarea, Button, ActionIcon, Badge, Group, Stack, Loader, Text,
  Switch, Card, Grid, NumberInput, Alert, Pagination
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconFlask, IconAlertCircle, IconCheck, IconX, IconTrendingUp } from '@tabler/icons-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuthFetch } from '../hooks/useAuthFetch.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { ROLES, MACHINE_STATUS, QC_RESULT, QC_PARAMETER_STATUS } from '@arogyafirst/shared';

export default function MachinesPage() {
  usePageTitle('Machines & QC Management');
  const { user } = useAuth();
  const { fetchData } = useAuthFetch();

  // State Management
  const [activeTab, setActiveTab] = useState('inventory');
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [qcModalOpened, setQcModalOpened] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [qcRecords, setQcRecords] = useState([]);
  const [qcTrends, setQcTrends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [dynamicParameters, setDynamicParameters] = useState([
    { name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }
  ]);
  const [qcLoading, setQcLoading] = useState(false);
  const [qcDateRange, setQcDateRange] = useState([null, null]);
  const [qcTestTypeFilter, setQcTestTypeFilter] = useState(null);
  const [editingQCRecord, setEditingQCRecord] = useState(null);
  const [qcRecordPage, setQcRecordPage] = useState(1);
  const recordsPerPage = 10;

  // Machine Form
  const machineForm = useForm({
    initialValues: {
      name: '',
      model: '',
      manufacturer: '',
      purchaseDate: null,
      lastMaintenanceDate: null,
      nextMaintenanceDate: null,
      status: MACHINE_STATUS.OPERATIONAL,
      isActive: true
    },
    validate: {
      name: (value) => (!value || value.trim().length === 0 ? 'Machine name is required' : null),
      model: (value) => (!value || value.trim().length === 0 ? 'Model is required' : null)
    }
  });

  // QC Form
  const qcForm = useForm({
    initialValues: {
      date: new Date(),
      testType: '',
      result: QC_RESULT.PASS,
      performedBy: '',
      notes: ''
    },
    validate: {
      date: (value) => (!value ? 'Date is required' : null),
      testType: (value) => (!value || value.trim().length === 0 ? 'Test type is required' : null),
      performedBy: (value) => (!value || value.trim().length === 0 ? 'Performed by is required' : null),
      result: (value) => (!value ? 'Result is required' : null)
    }
  });

  // Fetch Machines
  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchData('/api/labs/machines', { method: 'GET' });
      if (response.success && Array.isArray(response.data?.machines)) {
        setMachines(response.data.machines);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch machines',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  // Fetch QC Records
  const fetchQCRecords = useCallback(async (machineId) => {
    setQcLoading(true);
    try {
      const response = await fetchData(`/api/labs/machines/${machineId}/qc?limit=1000`, { method: 'GET' });
      if (response.success && Array.isArray(response.data.qcRecords)) {
        setQcRecords(response.data.qcRecords);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch QC records',
        color: 'red',
        icon: <IconX />
      });
    } finally {
      setQcLoading(false);
    }
  }, [fetchData]);

  // Fetch QC Trends
  const fetchQCTrends = useCallback(async (machineId) => {
    try {
      const params = new URLSearchParams();
      if (qcDateRange[0]) params.append('startDate', qcDateRange[0].toISOString());
      if (qcDateRange[1]) params.append('endDate', qcDateRange[1].toISOString());
      if (qcTestTypeFilter) params.append('testType', qcTestTypeFilter);

      const response = await fetchData(`/api/labs/machines/${machineId}/qc/trends?${params.toString()}`, { method: 'GET' });
      if (response.success && Array.isArray(response.data.trendData)) {
        setQcTrends(response.data.trendData);
      }
    } catch (error) {
      console.error('Failed to fetch QC trends', error);
    }
  }, [fetchData, qcDateRange, qcTestTypeFilter]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  useEffect(() => {
    if (selectedMachine && activeTab === 'qc') {
      fetchQCRecords(selectedMachine._id);
      fetchQCTrends(selectedMachine._id);
    }
  }, [selectedMachine, activeTab, fetchQCRecords, fetchQCTrends]);

  // Machine CRUD Operations
  const handleAddMachine = useCallback(async (values) => {
    try {
      const response = await fetchData('/api/labs/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Machine added successfully',
          color: 'green',
          icon: <IconCheck />
        });
        machineForm.reset();
        setModalOpened(false);
        await fetchMachines();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add machine',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [fetchData, fetchMachines, machineForm]);

  const handleEditMachine = useCallback(async (values) => {
    try {
      const response = await fetchData(`/api/labs/machines/${editingMachine._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Machine updated successfully',
          color: 'green',
          icon: <IconCheck />
        });
        machineForm.reset();
        setModalOpened(false);
        setEditingMachine(null);
        await fetchMachines();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update machine',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [fetchData, fetchMachines, editingMachine, machineForm]);

  const handleDeleteMachine = useCallback(async (machineId) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    try {
      const response = await fetchData(`/api/labs/machines/${machineId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Machine deleted successfully',
          color: 'green',
          icon: <IconCheck />
        });
        await fetchMachines();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete machine',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [fetchData, fetchMachines]);

  const openMachineModal = (machine = null) => {
    if (machine) {
      setEditingMachine(machine);
      machineForm.setValues({
        name: machine.name,
        model: machine.model,
        manufacturer: machine.manufacturer || '',
        purchaseDate: machine.purchaseDate ? new Date(machine.purchaseDate) : null,
        lastMaintenanceDate: machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate) : null,
        nextMaintenanceDate: machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate) : null,
        status: machine.status,
        isActive: machine.isActive
      });
    } else {
      machineForm.reset();
      setEditingMachine(null);
    }
    setModalOpened(true);
  };

  const submitMachine = machineForm.onSubmit((values) => {
    if (editingMachine) {
      handleEditMachine(values);
    } else {
      handleAddMachine(values);
    }
  });

  // QC Operations
  const handleAddQC = useCallback(async (values) => {
    if (dynamicParameters.some(p => !p.name || !p.value || !p.status)) {
      notifications.show({
        title: 'Error',
        message: 'All parameter fields are required',
        color: 'red',
        icon: <IconX />
      });
      return;
    }

    try {
      const payload = {
        ...values,
        date: values.date.toISOString(),
        parameters: dynamicParameters
      };

      const response = await fetchData(`/api/labs/machines/${selectedMachine._id}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'QC record added successfully',
          color: 'green',
          icon: <IconCheck />
        });
        qcForm.reset();
        setDynamicParameters([{ name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }]);
        setQcModalOpened(false);
        await fetchQCRecords(selectedMachine._id);
        await fetchQCTrends(selectedMachine._id);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add QC record',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [selectedMachine, dynamicParameters, fetchData, fetchQCRecords, fetchQCTrends, qcForm]);

  const handleEditQC = useCallback(async (qcRecord) => {
    setEditingQCRecord(qcRecord);
    qcForm.setValues({
      date: new Date(qcRecord.date),
      testType: qcRecord.testType,
      result: qcRecord.result,
      performedBy: qcRecord.performedBy,
      notes: qcRecord.notes || ''
    });
    setDynamicParameters(qcRecord.parameters || []);
    setQcModalOpened(true);
  }, [qcForm]);

  const handleUpdateQC = useCallback(async (values) => {
    if (dynamicParameters.some(p => !p.name || !p.value || !p.status)) {
      notifications.show({
        title: 'Error',
        message: 'All parameter fields are required',
        color: 'red',
        icon: <IconX />
      });
      return;
    }

    try {
      const payload = {
        ...values,
        date: values.date.toISOString(),
        parameters: dynamicParameters
      };

      const response = await fetchData(`/api/labs/machines/${selectedMachine._id}/qc/${editingQCRecord.qcId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'QC record updated successfully',
          color: 'green',
          icon: <IconCheck />
        });
        qcForm.reset();
        setDynamicParameters([{ name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }]);
        setQcModalOpened(false);
        setEditingQCRecord(null);
        await fetchQCRecords(selectedMachine._id);
        await fetchQCTrends(selectedMachine._id);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update QC record',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [selectedMachine, dynamicParameters, fetchData, fetchQCRecords, fetchQCTrends, editingQCRecord, qcForm]);

  const handleDeleteQC = useCallback(async (qcId) => {
    if (!confirm('Are you sure you want to delete this QC record?')) return;

    try {
      const response = await fetchData(`/api/labs/machines/${selectedMachine._id}/qc/${qcId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'QC record deleted successfully',
          color: 'green',
          icon: <IconCheck />
        });
        await fetchQCRecords(selectedMachine._id);
        await fetchQCTrends(selectedMachine._id);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete QC record',
        color: 'red',
        icon: <IconX />
      });
    }
  }, [selectedMachine, fetchData, fetchQCRecords, fetchQCTrends]);

  // Helper Functions
  const getStatusColor = (status) => {
    const colorMap = {
      [MACHINE_STATUS.OPERATIONAL]: 'green',
      [MACHINE_STATUS.MAINTENANCE]: 'yellow',
      [MACHINE_STATUS.OUT_OF_SERVICE]: 'red'
    };
    return colorMap[status] || 'gray';
  };

  const getResultColor = (result) => {
    const colorMap = {
      [QC_RESULT.PASS]: 'green',
      [QC_RESULT.FAIL]: 'red',
      [QC_RESULT.WARNING]: 'yellow'
    };
    return colorMap[result] || 'gray';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Filtered Machines
  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (machine.manufacturer || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterActive || machine.isActive;
    return matchesSearch && matchesFilter;
  });

  // Paginated QC Records
  const startIdx = (qcRecordPage - 1) * recordsPerPage;
  const paginatedQcRecords = qcRecords.slice(startIdx, startIdx + recordsPerPage);
  const totalPages = Math.ceil(qcRecords.length / recordsPerPage);

  return (
    <Container size="xl" py="xl">
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value)}>
        <Tabs.List>
          <Tabs.Tab value="inventory" leftSection={<IconFlask size={14} />}>Machine Inventory</Tabs.Tab>
          <Tabs.Tab value="qc" leftSection={<IconTrendingUp size={14} />}>Quality Control</Tabs.Tab>
        </Tabs.List>

        {/* Machine Inventory Tab */}
        <Tabs.Panel value="inventory" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Machine Inventory</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => openMachineModal()}
              >
                Add Machine
              </Button>
            </Group>

            <Group gap="md">
              <TextInput
                placeholder="Search machines..."
                leftSection={<IconSearch size={14} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Switch
                label="Active only"
                checked={filterActive}
                onChange={(e) => setFilterActive(e.currentTarget.checked)}
              />
            </Group>

            {loading ? (
              <Group justify="center" py="xl">
                <Loader />
              </Group>
            ) : filteredMachines.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="blue">
                No machines found. Start by adding a new machine.
              </Alert>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Manufacturer</Table.Th>
                    <Table.Th>Purchase Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Last Maintenance</Table.Th>
                    <Table.Th>Next Maintenance</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredMachines.map((machine) => (
                    <Table.Tr key={machine._id}>
                      <Table.Td>{machine.name}</Table.Td>
                      <Table.Td>{machine.model}</Table.Td>
                      <Table.Td>{machine.manufacturer || '-'}</Table.Td>
                      <Table.Td>{formatDate(machine.purchaseDate)}</Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(machine.status)}>
                          {machine.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatDate(machine.lastMaintenanceDate)}</Table.Td>
                      <Table.Td>{formatDate(machine.nextMaintenanceDate)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="blue"
                            onClick={() => openMachineModal(machine)}
                            title="Edit"
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteMachine(machine._id)}
                            title="Delete"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => {
                              setSelectedMachine(machine);
                              setActiveTab('qc');
                            }}
                          >
                            View QC
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Quality Control Tab */}
        <Tabs.Panel value="qc" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={3}>Quality Control Management</Title>
            </Group>

            <Card withBorder p="md" radius="md">
              <Select
                label="Select Machine"
                placeholder="Choose a machine to manage QC records"
                data={machines.map(m => ({ value: m._id, label: m.name }))}
                value={selectedMachine?._id || null}
                onChange={(machineId) => {
                  const machine = machines.find(m => m._id === machineId);
                  if (machine) {
                    setSelectedMachine(machine);
                    fetchQCRecords(machine._id);
                    fetchQCTrends(machine._id);
                  }
                }}
                searchable
                clearable
              />
            </Card>

            {!selectedMachine ? (
              <Alert icon={<IconAlertCircle size={16} />} color="blue">
                Please select a machine to manage QC records.
              </Alert>
            ) : (
              <Stack gap="md">
                <Card withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={500}>Selected Machine: <Badge>{selectedMachine.name}</Badge></Text>
                      <Button
                        size="sm"
                        leftSection={<IconPlus size={16} />}
                        onClick={() => {
                          setEditingQCRecord(null);
                          qcForm.reset();
                          setDynamicParameters([{ name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }]);
                          setQcModalOpened(true);
                        }}
                      >
                        Record QC Check
                      </Button>
                    </Group>
                  </Stack>
                </Card>

                <Card withBorder p="md" radius="md">
                  <Stack gap="md">
                    <Title order={4}>Record Quality Control Check</Title>
                    <form onSubmit={editingQCRecord ? qcForm.onSubmit((v) => handleUpdateQC(v)) : qcForm.onSubmit((v) => handleAddQC(v))}>
                      <Stack gap="md">
                        <DatePickerInput
                          label="Date"
                          placeholder="Select date"
                          value={qcForm.values.date}
                          onChange={(date) => qcForm.setFieldValue('date', date)}
                          maxDate={new Date()}
                          error={qcForm.errors.date}
                        />
                        <TextInput
                          label="Test Type"
                          placeholder="e.g., Calibration, Performance Check"
                          {...qcForm.getInputProps('testType')}
                        />
                        <Select
                          label="Result"
                          placeholder="Select result"
                          data={Object.values(QC_RESULT)}
                          value={qcForm.values.result}
                          onChange={(value) => qcForm.setFieldValue('result', value)}
                          error={qcForm.errors.result}
                        />
                        <Stack gap="xs">
                          <Text fw={500}>Parameters (min 1 required)</Text>
                          {dynamicParameters.map((param, idx) => (
                            <Card key={idx} withBorder p="xs" radius="md">
                              <Stack gap="xs">
                                <Group gap="xs" grow>
                                  <TextInput
                                    label="Name"
                                    placeholder="e.g., Temperature"
                                    value={param.name}
                                    onChange={(e) => {
                                      const newParams = [...dynamicParameters];
                                      newParams[idx].name = e.currentTarget.value;
                                      setDynamicParameters(newParams);
                                    }}
                                    error={!param.name ? 'Required' : null}
                                  />
                                  <TextInput
                                    label="Value"
                                    placeholder="e.g., 25.5"
                                    value={param.value}
                                    onChange={(e) => {
                                      const newParams = [...dynamicParameters];
                                      newParams[idx].value = e.currentTarget.value;
                                      setDynamicParameters(newParams);
                                    }}
                                    error={!param.value ? 'Required' : null}
                                  />
                                </Group>
                                <Group gap="xs" grow>
                                  <TextInput
                                    label="Unit"
                                    placeholder="e.g., °C"
                                    value={param.unit}
                                    onChange={(e) => {
                                      const newParams = [...dynamicParameters];
                                      newParams[idx].unit = e.currentTarget.value;
                                      setDynamicParameters(newParams);
                                    }}
                                  />
                                  <TextInput
                                    label="Reference Range"
                                    placeholder="e.g., 20-25"
                                    value={param.referenceRange}
                                    onChange={(e) => {
                                      const newParams = [...dynamicParameters];
                                      newParams[idx].referenceRange = e.currentTarget.value;
                                      setDynamicParameters(newParams);
                                    }}
                                  />
                                </Group>
                                <Group gap="xs" grow>
                                  <Select
                                    label="Status"
                                    placeholder="Select status"
                                    data={Object.values(QC_PARAMETER_STATUS)}
                                    value={param.status}
                                    onChange={(value) => {
                                      const newParams = [...dynamicParameters];
                                      newParams[idx].status = value;
                                      setDynamicParameters(newParams);
                                    }}
                                    error={!param.status ? 'Required' : null}
                                  />
                                  <Group>
                                    {dynamicParameters.length > 1 && (
                                      <Button
                                        size="sm"
                                        color="red"
                                        variant="light"
                                        onClick={() => {
                                          const newParams = dynamicParameters.filter((_, i) => i !== idx);
                                          setDynamicParameters(newParams);
                                        }}
                                        mt="xl"
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </Group>
                                </Group>
                              </Stack>
                            </Card>
                          ))}
                          <Button
                            size="sm"
                            variant="light"
                            onClick={() => {
                              setDynamicParameters([
                                ...dynamicParameters,
                                { name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }
                              ]);
                            }}
                          >
                            Add Parameter
                          </Button>
                        </Stack>
                        <TextInput
                          label="Performed By"
                          placeholder="Technician name"
                          {...qcForm.getInputProps('performedBy')}
                        />
                        <Textarea
                          label="Notes (optional)"
                          placeholder="Additional observations"
                          {...qcForm.getInputProps('notes')}
                          rows={3}
                        />
                        <Group>
                          <Button type="submit">
                            {editingQCRecord ? 'Update QC Record' : 'Record QC Check'}
                          </Button>
                          {editingQCRecord && (
                            <Button
                              variant="light"
                              onClick={() => {
                                setEditingQCRecord(null);
                                qcForm.reset();
                                setDynamicParameters([{ name: '', value: '', unit: '', referenceRange: '', status: QC_PARAMETER_STATUS.WITHIN_RANGE }]);
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                        </Group>
                      </Stack>
                    </form>
                  </Stack>
                </Card>

                <Card withBorder p="md" radius="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>QC History ({qcRecords.length} records)</Title>
                    </Group>
                    {qcLoading ? (
                      <Group justify="center">
                        <Loader />
                      </Group>
                    ) : qcRecords.length === 0 ? (
                      <Alert icon={<IconAlertCircle size={16} />} color="blue">
                        No QC records found for this machine.
                      </Alert>
                    ) : (
                      <>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Date</Table.Th>
                              <Table.Th>Test Type</Table.Th>
                              <Table.Th>Result</Table.Th>
                              <Table.Th>Performed By</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {paginatedQcRecords.map((record) => (
                              <Table.Tr key={record.qcId}>
                                <Table.Td>{formatDate(record.date)}</Table.Td>
                                <Table.Td>{record.testType}</Table.Td>
                                <Table.Td>
                                  <Badge color={getResultColor(record.result)}>
                                    {record.result}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>{record.performedBy}</Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    <ActionIcon
                                      size="sm"
                                      variant="light"
                                      color="blue"
                                      onClick={() => handleEditQC(record)}
                                      title="Edit"
                                    >
                                      <IconEdit size={14} />
                                    </ActionIcon>
                                    <ActionIcon
                                      size="sm"
                                      variant="light"
                                      color="red"
                                      onClick={() => handleDeleteQC(record.qcId)}
                                      title="Delete"
                                    >
                                      <IconTrash size={14} />
                                    </ActionIcon>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                        {totalPages > 1 && (
                          <Group justify="center">
                            <Pagination
                              value={qcRecordPage}
                              onChange={setQcRecordPage}
                              total={totalPages}
                              size="sm"
                            />
                          </Group>
                        )}
                      </>
                    )}
                  </Stack>
                </Card>

                <Card withBorder p="md" radius="md">
                  <Stack gap="md">
                    <Title order={4}>QC Trends & Analytics</Title>
                    <Group gap="md" grow>
                      <DatePickerInput
                        label="From Date"
                        placeholder="Start date"
                        value={qcDateRange[0]}
                        onChange={(date) => setQcDateRange([date, qcDateRange[1]])}
                      />
                      <DatePickerInput
                        label="To Date"
                        placeholder="End date"
                        value={qcDateRange[1]}
                        onChange={(date) => setQcDateRange([qcDateRange[0], date])}
                      />
                      <Select
                        label="Test Type (Optional)"
                        placeholder="Filter by test type"
                        data={[...new Set(qcRecords.map(r => r.testType))]}
                        value={qcTestTypeFilter}
                        onChange={setQcTestTypeFilter}
                        clearable
                      />
                      <Button onClick={() => fetchQCTrends(selectedMachine._id)}>
                        Update Charts
                      </Button>
                    </Group>

                    {qcTrends.length === 0 ? (
                      <Alert icon={<IconAlertCircle size={16} />} color="blue">
                        No trend data available for the selected filters.
                      </Alert>
                    ) : (
                      <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Text fw={500} mb="md">Pass Rate Trend</Text>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={qcTrends}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="passRate" stroke="#51cf66" name="Pass Rate (%)" />
                            </LineChart>
                          </ResponsiveContainer>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                          <Text fw={500} mb="md">Test Results Distribution</Text>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={qcTrends.map(item => ({
                                date: item.date,
                                PASS: item.pass,
                                FAIL: item.fail,
                                WARNING: item.warning
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="PASS" stackId="a" fill="#51cf66" />
                              <Bar dataKey="WARNING" stackId="a" fill="#ffd43b" />
                              <Bar dataKey="FAIL" stackId="a" fill="#ff6b6b" />
                            </BarChart>
                          </ResponsiveContainer>
                        </Grid.Col>
                      </Grid>
                    )}

                    {qcTrends.length > 0 && (
                      <Grid>
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                          <Card withBorder p="md">
                            <Text size="sm" c="dimmed">Total Tests</Text>
                            <Text fw={500} size="lg">{qcTrends.reduce((sum, item) => sum + item.total, 0)}</Text>
                          </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                          <Card withBorder p="md">
                            <Text size="sm" c="dimmed">Overall Pass Rate</Text>
                            <Text fw={500} size="lg">
                              {qcTrends.length > 0
                                ? Math.round(
                                  (qcTrends.reduce((sum, item) => sum + item.pass, 0) /
                                    qcTrends.reduce((sum, item) => sum + item.total, 0)) * 100
                                )
                                : 0}%
                            </Text>
                          </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                          <Card withBorder p="md">
                            <Text size="sm" c="dimmed">Passed</Text>
                            <Text fw={500} size="lg" c="green">{qcTrends.reduce((sum, item) => sum + item.pass, 0)}</Text>
                          </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                          <Card withBorder p="md">
                            <Text size="sm" c="dimmed">Failed</Text>
                            <Text fw={500} size="lg" c="red">{qcTrends.reduce((sum, item) => sum + item.fail, 0)}</Text>
                          </Card>
                        </Grid.Col>
                      </Grid>
                    )}
                  </Stack>
                </Card>
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Machine Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingMachine(null);
          machineForm.reset();
        }}
        title={editingMachine ? 'Edit Machine' : 'Add Machine'}
        centered
      >
        <form onSubmit={submitMachine}>
          <Stack gap="md">
            <TextInput
              label="Machine Name"
              placeholder="Enter machine name"
              {...machineForm.getInputProps('name')}
            />
            <TextInput
              label="Model"
              placeholder="Enter model"
              {...machineForm.getInputProps('model')}
            />
            <TextInput
              label="Manufacturer"
              placeholder="Enter manufacturer"
              {...machineForm.getInputProps('manufacturer')}
            />
            <DatePickerInput
              label="Purchase Date"
              placeholder="Select purchase date"
              value={machineForm.values.purchaseDate}
              onChange={(date) => machineForm.setFieldValue('purchaseDate', date)}
            />
            <DatePickerInput
              label="Last Maintenance Date"
              placeholder="Select last maintenance date"
              value={machineForm.values.lastMaintenanceDate}
              onChange={(date) => machineForm.setFieldValue('lastMaintenanceDate', date)}
            />
            <DatePickerInput
              label="Next Maintenance Date"
              placeholder="Select next maintenance date"
              value={machineForm.values.nextMaintenanceDate}
              onChange={(date) => machineForm.setFieldValue('nextMaintenanceDate', date)}
            />
            <Select
              label="Status"
              placeholder="Select status"
              data={Object.values(MACHINE_STATUS)}
              value={machineForm.values.status}
              onChange={(value) => machineForm.setFieldValue('status', value)}
            />
            <Switch
              label="Active"
              {...machineForm.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setModalOpened(false);
                  setEditingMachine(null);
                  machineForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingMachine ? 'Update Machine' : 'Add Machine'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
