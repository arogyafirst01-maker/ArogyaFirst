import { Container, Title, Table, Modal, TextInput, NumberInput, Textarea, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Switch } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export default function DoctorsManagementPage() {
  usePageTitle('Doctors Management');
  const { user } = useAuth();
  const { fetchData, loading: apiLoading } = useAuthFetch();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [originalDoctors, setOriginalDoctors] = useState([]);

  const form = useForm({
    initialValues: {
      name: '',
      specialization: '',
      qualification: '',
      experience: 0,
      contactPhone: '',
      email: '',
      schedule: '',
      isActive: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      specialization: (value) => (!value ? 'Specialization is required' : null),
      qualification: (value) => (!value ? 'Qualification is required' : null),
      experience: (value) => (value < 0 ? 'Experience must be at least 0' : null),
      contactPhone: (value) => {
        if (!value) return 'Contact phone is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Phone must be 10 digits';
        return null;
      },
      email: (value) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email';
        return null;
      },
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData('/api/hospitals/profile');
      const hospitalData = result?.data?.user?.hospitalData || {};
      setDoctors(hospitalData.doctors || []);
      setOriginalDoctors(hospitalData.doctors || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load doctors',
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
      const result = await fetchData('/api/hospitals/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (result?.data?.list) {
        setDoctors(result.data.list);
        notifications.show({
          title: 'Success',
          message: 'Doctor added successfully',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add doctor',
        color: 'red',
      });
    }
  };

  const handleEdit = async (values) => {
    try {
      const result = await fetchData(`/api/hospitals/doctors/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (result?.data?.list) {
        setDoctors(result.data.list);
      }
      notifications.show({
        title: 'Success',
        message: 'Doctor updated successfully',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingDoctor(null);
      setEditingIndex(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update doctor',
        color: 'red',
      });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this doctor?')) return;
    try {
      const result = await fetchData(`/api/hospitals/doctors/${index}`, { method: 'DELETE' });
      if (result?.data?.list) {
        setDoctors(result.data.list);
      }
      notifications.show({
        title: 'Success',
        message: 'Doctor deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete doctor',
        color: 'red',
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setEditingDoctor(null);
    setEditingIndex(null);
    setModalOpened(true);
  };

  const openEditModal = (doctor, index) => {
    form.setValues(doctor);
    setEditingDoctor(doctor);
    setEditingIndex(index);
    setModalOpened(true);
  };

  const filteredDoctors = doctors
    .map((doctor, index) => ({ doctor, index }))
    .filter((item) => {
      const matchesSearch = 
        item.doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.doctor.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = !filterActive || item.doctor.isActive !== false;
      return matchesSearch && matchesFilter;
    });

  if (loading && doctors.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading doctors...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Title order={1}>Doctors Management</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Doctor
          </Button>
        </Group>

        <Group>
          <TextInput
            placeholder="Search by name or specialization..."
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

        {filteredDoctors.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {doctors.length === 0 ? 'No doctors added yet' : 'No doctors match your search'}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Specialization</Table.Th>
                <Table.Th>Qualification</Table.Th>
                <Table.Th>Experience</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDoctors.map((item) => (
                <Table.Tr key={item.index}>
                  <Table.Td>{item.doctor.name}</Table.Td>
                  <Table.Td>{item.doctor.specialization}</Table.Td>
                  <Table.Td>{item.doctor.qualification}</Table.Td>
                  <Table.Td>{item.doctor.experience} years</Table.Td>
                  <Table.Td>{item.doctor.contactPhone}</Table.Td>
                  <Table.Td>{item.doctor.email || '-'}</Table.Td>
                  <Table.Td>{item.doctor.schedule || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={item.doctor.isActive !== false ? 'green' : 'gray'}>
                      {item.doctor.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(item.doctor, item.index)}
                        aria-label="Edit doctor"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.index)}
                        aria-label="Delete doctor"
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
          setEditingDoctor(null);
        }}
        title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
        centered
      >
        <form
          onSubmit={form.onSubmit((values) =>
            editingDoctor ? handleEdit(values) : handleAdd(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter doctor name"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Specialization"
              placeholder="e.g., Cardiology, Neurology"
              required
              {...form.getInputProps('specialization')}
            />
            <TextInput
              label="Qualification"
              placeholder="e.g., MBBS, MD"
              required
              {...form.getInputProps('qualification')}
            />
            <NumberInput
              label="Experience (years)"
              placeholder="0"
              min={0}
              required
              {...form.getInputProps('experience')}
            />
            <TextInput
              label="Contact Phone"
              placeholder="10-digit number"
              required
              {...form.getInputProps('contactPhone')}
            />
            <TextInput
              label="Email"
              placeholder="doctor@example.com"
              {...form.getInputProps('email')}
            />
            <Textarea
              label="Schedule"
              placeholder="e.g., Mon-Fri 9AM-5PM"
              {...form.getInputProps('schedule')}
            />
            <Switch
              label="Active"
              description="Toggle doctor active status"
              {...form.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={apiLoading}>
                {editingDoctor ? 'Update' : 'Add'} Doctor
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
