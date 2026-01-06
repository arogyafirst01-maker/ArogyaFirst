import { Container, Title, Table, Modal, TextInput, Textarea, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Switch } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconPill } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

export default function PharmacyManagementPage() {
  usePageTitle('Pharmacy Management');
  const { user } = useAuth();
  const { fetchData, loading: apiLoading } = useAuthFetch();

  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      location: '',
      contactPhone: '',
      operatingHours: '',
      isActive: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      contactPhone: (value) => {
        if (!value) return 'Contact phone is required';
        if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Phone must be 10 digits';
        return null;
      },
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData('/api/hospitals/profile');
      const hospitalData = result?.data?.user?.hospitalData || {};
      setPharmacies(hospitalData.pharmacies || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load pharmacies',
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
      const result = await fetchData('/api/hospitals/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (Array.isArray(result?.data)) {
        setPharmacies(result.data);
        notifications.show({
          title: 'Success',
          message: 'Pharmacy added successfully',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add pharmacy',
        color: 'red',
      });
    }
  };

  const handleEdit = async (values) => {
    try {
      await fetchData(`/api/hospitals/pharmacies/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Pharmacy updated successfully',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingPharmacy(null);
      setEditingIndex(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update pharmacy',
        color: 'red',
      });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this pharmacy?')) return;
    try {
      await fetchData(`/api/hospitals/pharmacies/${index}`, { method: 'DELETE' });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Pharmacy deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete pharmacy',
        color: 'red',
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setEditingPharmacy(null);
    setEditingIndex(null);
    setModalOpened(true);
  };

  const openEditModal = (pharmacy, index) => {
    form.setValues(pharmacy);
    setEditingPharmacy(pharmacy);
    setEditingIndex(index);
    setModalOpened(true);
  };

  const filteredPharmacies = pharmacies
    .map((pharmacy, index) => ({ pharmacy, index }))
    .filter((item) => {
      const matchesSearch =
        item.pharmacy.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pharmacy.location?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = !filterActive || item.pharmacy.isActive !== false;
      return matchesSearch && matchesFilter;
    });

  if (loading && pharmacies.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading pharmacies...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Title order={1}>Pharmacy Management</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Pharmacy
          </Button>
        </Group>

        <Group>
          <TextInput
            placeholder="Search by name or location..."
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

        {filteredPharmacies.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {pharmacies.length === 0 ? 'No pharmacies added yet' : 'No pharmacies match your search'}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Operating Hours</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredPharmacies.map((item) => (
                <Table.Tr key={item.index}>
                  <Table.Td fw={500}>{item.pharmacy.name}</Table.Td>
                  <Table.Td>{item.pharmacy.location || '-'}</Table.Td>
                  <Table.Td>{item.pharmacy.contactPhone}</Table.Td>
                  <Table.Td>{item.pharmacy.operatingHours || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={item.pharmacy.isActive !== false ? 'green' : 'gray'}>
                      {item.pharmacy.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(item.pharmacy, item.index)}
                        aria-label="Edit pharmacy"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.index)}
                        aria-label="Delete pharmacy"
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
          setEditingPharmacy(null);
        }}
        title={editingPharmacy ? 'Edit Pharmacy' : 'Add Pharmacy'}
        centered
      >
        <form
          onSubmit={form.onSubmit((values) =>
            editingPharmacy ? handleEdit(values) : handleAdd(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter pharmacy name"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Location"
              placeholder="e.g., Ground Floor, Block A"
              {...form.getInputProps('location')}
            />
            <TextInput
              label="Contact Phone"
              placeholder="10-digit number"
              required
              {...form.getInputProps('contactPhone')}
            />
            <Textarea
              label="Operating Hours"
              placeholder="e.g., Mon-Sat 8AM-8PM, Sun 9AM-5PM"
              maxLength={200}
              {...form.getInputProps('operatingHours')}
            />
            <Switch
              label="Active"
              description="Toggle pharmacy active status"
              {...form.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={apiLoading}>
                {editingPharmacy ? 'Update' : 'Add'} Pharmacy
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
