import { Container, Title, Table, Modal, TextInput, Select, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Switch } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconUsers } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { SHIFT_TYPES } from '@arogyafirst/shared';

const getShiftColor = (shift) => {
  switch (shift) {
    case 'MORNING':
      return 'blue';
    case 'AFTERNOON':
      return 'yellow';
    case 'EVENING':
      return 'orange';
    case 'NIGHT':
      return 'purple';
    case 'FULL_DAY':
      return 'green';
    default:
      return 'gray';
  }
};

const getShiftLabel = (shift) => {
  const labels = {
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    EVENING: 'Evening',
    NIGHT: 'Night',
    FULL_DAY: 'Full Day',
  };
  return labels[shift] || shift;
};

export default function StaffManagementPage() {
  usePageTitle('Staff Management');
  const { user } = useAuth();
  const { fetchData, loading: apiLoading } = useAuthFetch();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const form = useForm({
    initialValues: {
      name: '',
      role: '',
      department: '',
      contactPhone: '',
      email: '',
      shift: '',
      isActive: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      role: (value) => (!value ? 'Role is required' : null),
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

  const departments = useMemo(() => {
    const depts = new Set(
      staff
        .filter((s) => s.department)
        .map((s) => s.department)
    );
    return Array.from(depts).sort();
  }, [staff]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData('/api/hospitals/profile');
      const hospitalData = result?.data?.user?.hospitalData || {};
      setStaff(hospitalData.staff || []);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load staff',
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
      const result = await fetchData('/api/hospitals/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (Array.isArray(result?.data)) {
        setStaff(result.data);
        notifications.show({
          title: 'Success',
          message: 'Staff member added successfully',
          color: 'green',
        });
        setModalOpened(false);
        form.reset();
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to add staff member',
        color: 'red',
      });
    }
  };

  const handleEdit = async (values) => {
    try {
      await fetchData(`/api/hospitals/staff/${editingIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Staff member updated successfully',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingStaff(null);
      setEditingIndex(null);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update staff member',
        color: 'red',
      });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await fetchData(`/api/hospitals/staff/${index}`, { method: 'DELETE' });
      await fetchProfile();
      notifications.show({
        title: 'Success',
        message: 'Staff member deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete staff member',
        color: 'red',
      });
    }
  };

  const openAddModal = () => {
    form.reset();
    setEditingStaff(null);
    setEditingIndex(null);
    setModalOpened(true);
  };

  const openEditModal = (staffMember, index) => {
    form.setValues(staffMember);
    setEditingStaff(staffMember);
    setEditingIndex(index);
    setModalOpened(true);
  };

  const filteredStaff = staff
    .map((member, index) => ({ member, index }))
    .filter((item) => {
      const matchesSearch =
        item.member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member.department?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = !filterActive || item.member.isActive !== false;
      const matchesDept = !selectedDepartment || item.member.department === selectedDepartment;
      return matchesSearch && matchesActive && matchesDept;
    });

  if (loading && staff.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading staff...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center" mb="lg">
          <Title order={1}>Staff Management</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openAddModal}>
            Add Staff
          </Button>
        </Group>

        <Group>
          <TextInput
            placeholder="Search by name, role or department..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by department"
            data={departments}
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            clearable
            searchable
            style={{ width: 200 }}
          />
          <Switch
            label="Active only"
            checked={filterActive}
            onChange={(e) => setFilterActive(e.currentTarget.checked)}
          />
        </Group>

        {filteredStaff.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {staff.length === 0 ? 'No staff members added yet' : 'No staff members match your search'}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Shift</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredStaff.map((item) => (
                <Table.Tr key={item.index}>
                  <Table.Td>{item.member.name}</Table.Td>
                  <Table.Td>{item.member.role}</Table.Td>
                  <Table.Td>{item.member.department || '-'}</Table.Td>
                  <Table.Td>{item.member.contactPhone}</Table.Td>
                  <Table.Td>{item.member.email || '-'}</Table.Td>
                  <Table.Td>
                    {item.member.shift ? (
                      <Badge color={getShiftColor(item.member.shift)}>
                        {getShiftLabel(item.member.shift)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={item.member.isActive !== false ? 'green' : 'gray'}>
                      {item.member.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={() => openEditModal(item.member, item.index)}
                        aria-label="Edit staff member"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.index)}
                        aria-label="Delete staff member"
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
          setEditingStaff(null);
        }}
        title={editingStaff ? 'Edit Staff' : 'Add Staff'}
        centered
      >
        <form
          onSubmit={form.onSubmit((values) =>
            editingStaff ? handleEdit(values) : handleAdd(values)
          )}
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter staff name"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Role"
              placeholder="e.g., Nurse, Receptionist, Technician"
              required
              {...form.getInputProps('role')}
            />
            <TextInput
              label="Department"
              placeholder="e.g., Cardiology, Emergency"
              {...form.getInputProps('department')}
            />
            <TextInput
              label="Contact Phone"
              placeholder="10-digit number"
              required
              {...form.getInputProps('contactPhone')}
            />
            <TextInput
              label="Email"
              placeholder="staff@example.com"
              {...form.getInputProps('email')}
            />
            <Select
              label="Shift"
              placeholder="Select shift"
              data={Object.values(SHIFT_TYPES).map((shift) => ({
                value: shift,
                label: getShiftLabel(shift),
              }))}
              {...form.getInputProps('shift')}
            />
            <Switch
              label="Active"
              description="Toggle staff active status"
              {...form.getInputProps('isActive', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={apiLoading}>
                {editingStaff ? 'Update' : 'Add'} Staff
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
