import { Container, Title, Table, Modal, TextInput, Select, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Switch, SimpleGrid, Card } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconBed } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

const bedTypes = ['General', 'ICU', 'Private', 'Semi-Private', 'Emergency'];

const getBedTypeColor = (type) => {
  switch (type) {
    case 'ICU':
      return 'blue';
    case 'General':
      return 'green';
    case 'Private':
      return 'orange';
    case 'Semi-Private':
      return 'yellow';
    case 'Emergency':
      return 'red';
    default:
      return 'gray';
  }
};

export default function BedsManagementPage() {
  usePageTitle('Beds Management');
  const { user } = useAuth();
  const { fetchData, loading: apiLoading } = useAuthFetch();

  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingBed, setEditingBed] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [filterOccupied, setFilterOccupied] = useState(false);

  const form = useForm({
    initialValues: {
      bedNumber: '',
      type: '',
      floor: '',
      ward: '',
      isOccupied: false,
      isActive: true,
    },
    validate: {
      bedNumber: (value) => (!value ? 'Bed number is required' : null),
      type: (value) => {
        if (!value) return 'Type is required';
        if (!bedTypes.includes(value)) return 'Invalid bed type';
        return null;
      },
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData('/api/hospitals/profile');
      const hospitalData = result?.data?.user?.hospitalData || {};
      setBeds(hospitalData.beds || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load beds',
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
      const result = await fetchData('/api/hospitals/beds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (Array.isArray(result?.data)) {
        setBeds(result.data);
        notifications.show({
          title: 'Success',
          message: 'Bed added successfully',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
      }
    } catch (error) {
      const errorMessage = error.message?.includes('Bed number already exists')
        ? 'Bed number already exists'
        : error.message || 'Failed to add bed';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    }
  };

  const handleEdit = async (values) => {
    try {
      await fetchData(`/api/hospitals/beds/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Bed updated successfully',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingBed(null);
      setEditingIndex(null);
    } catch (error) {
      const errorMessage = error.message?.includes('Bed number already exists')
        ? 'Bed number already exists'
        : error.message || 'Failed to update bed';
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this bed?')) return;
    try {
      await fetchData(`/api/hospitals/beds/${index}`, { method: 'DELETE' });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Bed deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete bed',
        color: 'red',
      });
    }
  };

  const handleToggleOccupancy = async (index, currentBed) => {
    try {
      await fetchData(`/api/hospitals/beds/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentBed, isOccupied: !currentBed.isOccupied }),
      });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: `Bed marked as ${!currentBed.isOccupied ? 'occupied' : 'available'}`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update occupancy',
        color: 'red',
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setEditingBed(null);
    setEditingIndex(null);
    setModalOpened(true);
  };

  const openEditModal = (bed, index) => {
    form.setValues(bed);
    setEditingBed(bed);
    setEditingIndex(index);
    setModalOpened(true);
  };

  const filteredBeds = beds
    .map((bed, index) => ({ bed, index }))
    .filter((item) => {
      const matchesSearch =
        item.bed.bedNumber?.toUpperCase().includes(searchQuery.toUpperCase()) ||
        item.bed.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bed.floor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bed.ward?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = !filterActive || item.bed.isActive !== false;
      const matchesOccupied = !filterOccupied || item.bed.isOccupied;
      return matchesSearch && matchesActive && matchesOccupied;
    });

  const metrics = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.isOccupied).length;
    const available = total - occupied;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, available, occupancyRate };
  }, [beds]);

  const getOccupancyColor = (rate) => {
    if (rate < 70) return 'green';
    if (rate < 90) return 'yellow';
    return 'red';
  };

  if (loading && beds.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading beds...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Title order={1}>Beds Management</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Bed
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Total Beds
              </Text>
              <IconBed size={24} color="var(--mantine-color-blue-6)" />
            </Group>
            <Text size="xl" fw={700}>
              {metrics.total}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Occupied Beds
              </Text>
              <IconBed size={24} color="var(--mantine-color-red-6)" />
            </Group>
            <Text size="xl" fw={700}>
              {metrics.occupied} ({Math.round((metrics.occupied / (metrics.total || 1)) * 100)}%)
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Available Beds
              </Text>
              <IconBed size={24} color="var(--mantine-color-green-6)" />
            </Group>
            <Text size="xl" fw={700}>
              {metrics.available}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>
                Occupancy Rate
              </Text>
            </Group>
            <Badge color={getOccupancyColor(metrics.occupancyRate)} size="lg">
              {metrics.occupancyRate}%
            </Badge>
          </Card>
        </SimpleGrid>

        <Group>
          <TextInput
            placeholder="Search by bed number, type, floor or ward..."
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
          <Switch
            label="Occupied only"
            checked={filterOccupied}
            onChange={(e) => setFilterOccupied(e.currentTarget.checked)}
          />
        </Group>

        {filteredBeds.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {beds.length === 0 ? 'No beds added yet' : 'No beds match your search'}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Bed Number</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Floor</Table.Th>
                <Table.Th>Ward</Table.Th>
                <Table.Th>Occupancy</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredBeds.map((item) => (
                <Table.Tr key={item.index}>
                  <Table.Td fw={500}>{item.bed.bedNumber}</Table.Td>
                  <Table.Td>
                    <Badge color={getBedTypeColor(item.bed.type)}>{item.bed.type}</Badge>
                  </Table.Td>
                  <Table.Td>{item.bed.floor || '-'}</Table.Td>
                  <Table.Td>{item.bed.ward || '-'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge color={item.bed.isOccupied ? 'red' : 'green'}>
                        {item.bed.isOccupied ? 'Occupied' : 'Available'}
                      </Badge>
                      <Switch
                        checked={item.bed.isOccupied}
                        onChange={() => handleToggleOccupancy(item.index, item.bed)}
                        size="xs"
                      />
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.bed.isActive !== false ? 'green' : 'gray'}>
                      {item.bed.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(item.bed, item.index)}
                        aria-label="Edit bed"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.index)}
                        aria-label="Delete bed"
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
          setEditingBed(null);
        }}
        title={editingBed ? 'Edit Bed' : 'Add Bed'}
        centered
      >
        <form
          onSubmit={form.onSubmit((values) =>
            editingBed ? handleEdit(values) : handleAdd(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label="Bed Number"
              placeholder="e.g., A1, ICU-101"
              required
              onBlur={(e) => {
                const value = e.currentTarget.value.toUpperCase();
                form.setFieldValue('bedNumber', value);
              }}
              {...form.getInputProps('bedNumber')}
            />
            <Select
              label="Type"
              placeholder="Select bed type"
              data={bedTypes}
              required
              {...form.getInputProps('type')}
            />
            <TextInput
              label="Floor"
              placeholder="e.g., 1st Floor, Ground"
              {...form.getInputProps('floor')}
            />
            <TextInput
              label="Ward"
              placeholder="e.g., Ward A, Cardiology"
              {...form.getInputProps('ward')}
            />
            {editingBed && (
              <Switch
                label="Mark as Occupied"
                {...form.getInputProps('isOccupied', { type: 'checkbox' })}
              />
            )}
            <Switch
              label="Active"
              description="Toggle bed active status"
              {...form.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={apiLoading}>
                {editingBed ? 'Update' : 'Add'} Bed
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
