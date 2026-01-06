import { Container, Title, Table, Modal, TextInput, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Switch, MultiSelect } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

const commonTests = ['Blood Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'EEG', 'Endoscopy'];

export default function LabsManagementPage() {
  usePageTitle('Labs Management');
  const { user } = useAuth();
  const { fetchData, loading: apiLoading } = useAuthFetch();

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [availableTestsOptions, setAvailableTestsOptions] = useState(
    commonTests.map((test) => ({ value: test, label: test }))
  );

  const form = useForm({
    initialValues: {
      name: '',
      type: '',
      location: '',
      contactPhone: '',
      availableTests: [],
      isActive: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      type: (value) => (!value ? 'Type is required' : null),
      contactPhone: (value) => {
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) {
          return 'Phone must be 10 digits if provided';
        }
        return null;
      },
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData('/api/hospitals/profile');
      const hospitalData = result?.data?.user?.hospitalData || {};
      setLabs(hospitalData.labs || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load labs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAdd = async (values) => {
    try {
      const result = await fetchData('/api/hospitals/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (Array.isArray(result?.data)) {
        setLabs(result.data);
        notifications.show({
          title: 'Success',
          message: 'Lab added successfully',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add lab',
        color: 'red',
      });
    }
  };

  const handleEdit = async (values) => {
    try {
      await fetchData(`/api/hospitals/labs/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Lab updated successfully',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingLab(null);
      setEditingIndex(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update lab',
        color: 'red',
      });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this lab?')) return;
    try {
      await fetchData(`/api/hospitals/labs/${index}`, { method: 'DELETE' });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Lab deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete lab',
        color: 'red',
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setEditingLab(null);
    setEditingIndex(null);
    setModalOpened(true);
  };

  const openEditModal = (lab, index) => {
    form.setValues(lab);
    setEditingLab(lab);
    setEditingIndex(index);
    setModalOpened(true);
  };

  const handleCreateTest = useCallback((testName) => {
    const newOption = { value: testName, label: testName };
    setAvailableTestsOptions((prev) => [...prev, newOption]);
    return newOption;
  }, []);

  const filteredLabs = labs
    .map((lab, index) => ({ lab, index }))
    .filter((item) => {
      const matchesSearch =
        item.lab.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lab.type?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = !filterActive || item.lab.isActive !== false;
      return matchesSearch && matchesFilter;
    });

  if (loading && labs.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading labs...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Title order={1}>Labs Management</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Lab
          </Button>
        </Group>

        <Group>
          <TextInput
            placeholder="Search by name or type..."
            leftSection={<IconSearch size={16} />}
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

        {filteredLabs.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {labs.length === 0 ? 'No labs added yet' : 'No labs match your search'}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Available Tests</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredLabs.map((item) => (
                <Table.Tr key={item.index}>
                  <Table.Td>{item.lab.name}</Table.Td>
                  <Table.Td>{item.lab.type}</Table.Td>
                  <Table.Td>{item.lab.location || '-'}</Table.Td>
                  <Table.Td>{item.lab.contactPhone || '-'}</Table.Td>
                  <Table.Td>
                    {item.lab.availableTests && item.lab.availableTests.length > 0
                      ? item.lab.availableTests.join(', ')
                      : '-'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.lab.isActive !== false ? 'green' : 'gray'}>
                      {item.lab.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(item.lab, item.index)}
                        aria-label="Edit lab"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.index)}
                        aria-label="Delete lab"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingLab(null);
        }}
        title={editingLab ? 'Edit Lab' : 'Add Lab'}
        centered
      >
        <form
          onSubmit={form.onSubmit((values) =>
            editingLab ? handleEdit(values) : handleAdd(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter lab name"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Type"
              placeholder="e.g., Pathology, Radiology"
              required
              {...form.getInputProps('type')}
            />
            <TextInput
              label="Location"
              placeholder="Enter location"
              {...form.getInputProps('location')}
            />
            <TextInput
              label="Contact Phone"
              placeholder="10-digit number"
              {...form.getInputProps('contactPhone')}
            />
            <MultiSelect
              label="Available Tests"
              placeholder="Select or add tests"
              data={availableTestsOptions}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create "${query}"`}
              onCreate={handleCreateTest}
              {...form.getInputProps('availableTests')}
            />
            <Switch
              label="Active"
              description="Toggle lab active status"
              {...form.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={apiLoading}>
                {editingLab ? 'Update' : 'Add'} Lab
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
