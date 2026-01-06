import React, { useState, useEffect } from 'react';
import {
  Container,
  Tabs,
  Table,
  Badge,
  Button,
  Group,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Stack,
  Text,
  Grid,
  Card,
  ActionIcon,
  Loader,
  Center,
  Input,
  Checkbox,
  SimpleGrid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconDownload,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconCalendarDue,
} from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';

const InventoryPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [expiringMedicines, setExpiringMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Modal states
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [verificationModal, setVerificationModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [verificationSummary, setVerificationSummary] = useState(null);

  const { fetchData } = useAuthFetch();

  // Load medicines on mount and when tab changes
  useEffect(() => {
    loadMedicines();
  }, [activeTab]);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const response = await fetchData('/api/pharmacies/medicines');
      if (response.success) {
        setMedicines(response.data?.medicines || []);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load medicines',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockMedicines = async () => {
    try {
      const response = await fetchData('/api/pharmacies/medicines?lowStock=true');
      if (response.success) {
        setLowStockMedicines(response.data?.medicines || []);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load low stock medicines',
        color: 'red',
      });
    }
  };

  const loadExpiringMedicines = async () => {
    try {
      const response = await fetchData('/api/pharmacies/medicines?expiringSoon=true');
      if (response.success) {
        setExpiringMedicines(response.data?.medicines || []);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load expiring medicines',
        color: 'red',
      });
    }
  };

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'low-stock') {
      loadLowStockMedicines();
    } else if (activeTab === 'expiring') {
      loadExpiringMedicines();
    }
  }, [activeTab]);

  // Adjustment form
  const adjustmentForm = useForm({
    initialValues: {
      adjustmentType: 'ADD',
      quantity: '',
      reason: '',
      performedBy: '',
    },
    validate: {
      quantity: (value) =>
        value && value > 0 ? null : 'Quantity must be greater than 0',
      reason: (value) =>
        value && value.length >= 3 ? null : 'Reason must be at least 3 characters',
      performedBy: (value) =>
        value && value.length >= 2 ? null : 'Name must be at least 2 characters',
    },
  });

  const handleAdjustmentSubmit = async (values) => {
    if (!selectedMedicine) return;

    try {
      const response = await fetchData('/api/pharmacies/medicines/adjust-stock', {
        method: 'POST',
        body: JSON.stringify({
          medicineId: selectedMedicine._id,
          ...values,
        }),
      });

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Stock adjusted successfully',
          color: 'green',
        });
        setAdjustmentModal(false);
        adjustmentForm.reset();
        loadMedicines();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to adjust stock',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    }
  };

  const handleVerificationSubmit = async () => {
    if (verifications.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'Please add at least one medicine for verification',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetchData('/api/pharmacies/medicines/physical-verification', {
        method: 'POST',
        body: JSON.stringify({
          verifications,
          verifiedBy: localStorage.getItem('userName') || 'Unknown',
          autoAdjust,
        }),
      });

      if (response.success) {
        setVerificationSummary(response.data);
        notifications.show({
          title: 'Success',
          message: `Physical verification completed. Discrepancies found: ${response.data.discrepancies}`,
          color: 'green',
        });
        loadMedicines();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to verify inventory',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    }
  };

  // Filter medicines based on tab and search
  const getFilteredMedicines = () => {
    let dataSource = medicines;

    // Use API-fetched data for specific tabs, fall back to client-side filtering if needed
    switch (activeTab) {
      case 'low-stock':
        dataSource = lowStockMedicines.length > 0 ? lowStockMedicines : medicines;
        break;
      case 'expiring':
        dataSource = expiringMedicines.length > 0 ? expiringMedicines : medicines;
        break;
      default:
        dataSource = medicines;
    }

    let filtered = dataSource.filter((m) =>
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeTab) {
      case 'low-stock':
        // Use API data directly if available, otherwise fall back to client-side filter
        return lowStockMedicines.length > 0 ? filtered : medicines.filter(
          (m) =>
            (m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.category?.toLowerCase().includes(searchQuery.toLowerCase())) &&
            m.stock <= (m.reorderLevel || 10)
        );
      case 'expiring':
        // Use API data directly if available, otherwise fall back to client-side filter
        return expiringMedicines.length > 0
          ? filtered
          : medicines.filter((m) => {
              if (
                !m.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
                !m.category?.toLowerCase().includes(searchQuery.toLowerCase())
              )
                return false;
              if (!m.expiryDate) return false;
              const expiryDate = new Date(m.expiryDate);
              const thirtyDaysFromNow = new Date(today);
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
              return expiryDate <= thirtyDaysFromNow;
            });
      case 'adjustments':
        return filtered.filter((m) => m.notes && m.notes.length > 0);
      case 'verification':
        return filtered;
      default:
        return filtered;
    }
  };

  const getStockBadge = (medicine) => {
    const reorderLevel = medicine.reorderLevel || 10;
    if (medicine.stock === 0) {
      return <Badge color="red">Out of Stock</Badge>;
    } else if (medicine.stock <= reorderLevel) {
      return <Badge color="yellow">Low Stock</Badge>;
    }
    return <Badge color="green">In Stock</Badge>;
  };

  const getExpiryBadge = (expiryDate) => {
    if (!expiryDate) return <Badge color="gray">N/A</Badge>;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge color="red">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge color="orange">Expiring Soon</Badge>;
    }
    return <Badge color="green">Valid</Badge>;
  };

  const filteredMedicines = getFilteredMedicines();

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Inventory Management</h1>
          <Text c="dimmed" size="sm" mt={4}>
            Manage your pharmacy medicines and inventory
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="light"
            leftSection={<IconCheck size={16} />}
            onClick={() => {
              setVerifications([]);
              setVerificationSummary(null);
              setAutoAdjust(true);
              setVerificationModal(true);
            }}
          >
            Physical Verification
          </Button>
        </Group>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Total Medicines
              </Text>
              <Text size="xl" fw={700} mt={4}>
                {medicines.length}
              </Text>
            </div>
            <Badge color="blue" variant="light" size="xl">
              {medicines.length}
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Low Stock
              </Text>
              <Text size="xl" fw={700} mt={4}>
                {lowStockMedicines.length > 0 ? lowStockMedicines.length : medicines.filter((m) => m.stock <= (m.reorderLevel || 10)).length}
              </Text>
            </div>
            <Badge color="yellow" variant="light" size="xl">
              ⚠️
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Expiring Soon
              </Text>
              <Text size="xl" fw={700} mt={4}>
                {expiringMedicines.length > 0 ? expiringMedicines.length : medicines.filter((m) => {
                    if (!m.expiryDate) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expiry = new Date(m.expiryDate);
                    const daysUntilExpiry = Math.floor(
                      (expiry - today) / (1000 * 60 * 60 * 24)
                    );
                    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
                  }).length}
              </Text>
            </div>
            <Badge color="orange" variant="light" size="xl">
              📅
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Total Value
              </Text>
              <Text size="xl" fw={700} mt={4}>
                ₹
                {medicines
                  .reduce((sum, m) => sum + (m.price * m.stock || 0), 0)
                  .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </div>
            <Badge color="green" variant="light" size="xl">
              💰
            </Badge>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Search Bar */}
      <Input
        placeholder="Search medicines by name or category..."
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        mb="md"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all">All Medicines ({medicines.length})</Tabs.Tab>
          <Tabs.Tab value="low-stock">
            Low Stock ({lowStockMedicines.length > 0 ? lowStockMedicines.length : medicines.filter((m) => m.stock <= (m.reorderLevel || 10)).length})
          </Tabs.Tab>
          <Tabs.Tab value="expiring">
            Expiring (
            {expiringMedicines.length > 0 ? expiringMedicines.length : medicines.filter((m) => {
                if (!m.expiryDate) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expiry = new Date(m.expiryDate);
                const daysUntilExpiry = Math.floor(
                  (expiry - today) / (1000 * 60 * 60 * 24)
                );
                return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
              }).length}
            )
          </Tabs.Tab>
          <Tabs.Tab value="adjustments">Adjustments</Tabs.Tab>
          <Tabs.Tab value="verification">For Verification</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="md">
          {filteredMedicines.length === 0 ? (
            <Center py={40}>
              <Text c="dimmed">No medicines found</Text>
            </Center>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Medicine Name</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Stock</Table.Th>
                    <Table.Th>Price</Table.Th>
                    <Table.Th>Expiry Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredMedicines.map((medicine) => (
                    <Table.Tr key={medicine._id}>
                      <Table.Td fw={500}>{medicine.name}</Table.Td>
                      <Table.Td>{medicine.category}</Table.Td>
                      <Table.Td>{medicine.stock}</Table.Td>
                      <Table.Td>₹{medicine.price?.toFixed(2)}</Table.Td>
                      <Table.Td>
                        {medicine.expiryDate
                          ? new Date(medicine.expiryDate).toLocaleDateString()
                          : 'N/A'}
                      </Table.Td>
                      <Table.Td>{getStockBadge(medicine)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="blue"
                            onClick={() => {
                              setSelectedMedicine(medicine);
                              adjustmentForm.reset();
                              setAdjustmentModal(true);
                            }}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Stock Adjustment Modal */}
      <Modal
        opened={adjustmentModal}
        onClose={() => {
          setAdjustmentModal(false);
          setSelectedMedicine(null);
        }}
        title="Adjust Medicine Stock"
        centered
      >
        <Stack>
          {!selectedMedicine ? (
            <Text c="red" size="sm">
              No medicine selected. Please click on a medicine row to adjust its stock.
            </Text>
          ) : (
            <div>
              <Text size="sm" fw={500}>
                {selectedMedicine.name}
              </Text>
              <Text size="xs" c="dimmed">
                Current Stock: {selectedMedicine.stock}
              </Text>
            </div>
          )}

          {selectedMedicine && (
            <form onSubmit={adjustmentForm.onSubmit(handleAdjustmentSubmit)}>
              <Stack>
                <Select
                  label="Adjustment Type"
                  placeholder="Select type"
                  data={[
                    { value: 'ADD', label: 'Add Stock' },
                    { value: 'SUBTRACT', label: 'Remove Stock' },
                  ]}
                  {...adjustmentForm.getInputProps('adjustmentType')}
                />

                <NumberInput
                  label="Quantity"
                  placeholder="Enter quantity"
                  min={1}
                  {...adjustmentForm.getInputProps('quantity')}
                />

                <TextInput
                  label="Reason"
                  placeholder="Enter reason for adjustment"
                  {...adjustmentForm.getInputProps('reason')}
                />

                <TextInput
                  label="Performed By"
                  placeholder="Your name"
                  {...adjustmentForm.getInputProps('performedBy')}
                />

                <Group justify="flex-end">
                  <Button variant="light" onClick={() => setAdjustmentModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Submit Adjustment</Button>
                </Group>
              </Stack>
            </form>
          )}
        </Stack>
      </Modal>

      {/* Physical Verification Modal */}
      <Modal
        opened={verificationModal}
        onClose={() => {
          setVerificationModal(false);
          setVerifications([]);
          setVerificationSummary(null);
          setAutoAdjust(true);
        }}
        title="Physical Inventory Verification"
        centered
        size="lg"
      >
        <Stack>
          {verificationSummary ? (
            // Show verification summary after successful submission
            <>
              <Text size="sm" c="dimmed">
                Verification completed successfully!
              </Text>
              <Card withBorder p="md" bg="blue.0">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>Total Verifications</Text>
                    <Badge size="lg">{verificationSummary.totalVerifications}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text fw={500}>Discrepancies Found</Text>
                    <Badge size="lg" color="yellow">
                      {verificationSummary.discrepancies}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text fw={500}>Stock Adjusted</Text>
                    <Badge size="lg" color="green">
                      {verificationSummary.adjustments}
                    </Badge>
                  </Group>
                </Stack>
              </Card>

              {verificationSummary.details.length > 0 && (
                <>
                  <Text fw={500} size="sm" mt="md">
                    Details
                  </Text>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {verificationSummary.details.map((detail, idx) => (
                      <Card key={idx} withBorder p="xs" mb="xs">
                        <Group justify="space-between">
                          <div>
                            <Text size="sm" fw={500}>
                              {detail.medicineName || detail.medicineId}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Discrepancy: {detail.discrepancy} units
                            </Text>
                          </div>
                          {detail.adjusted && (
                            <Badge color="green" size="sm">
                              Adjusted
                            </Badge>
                          )}
                          {detail.discrepancy !== 0 && !detail.adjusted && (
                            <Badge color="orange" size="sm">
                              Not Adjusted
                            </Badge>
                          )}
                        </Group>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              <Button
                fullWidth
                onClick={() => {
                  setVerificationModal(false);
                  setVerifications([]);
                  setVerificationSummary(null);
                  setAutoAdjust(true);
                }}
              >
                Close
              </Button>
            </>
          ) : (
            // Show verification form for input
            <>
              <Text size="sm" c="dimmed">
                Compare system stock with actual physical count for each medicine
              </Text>

              <Group justify="space-between" mb="md">
                <Text fw={500}>Auto-adjust discrepancies</Text>
                <Checkbox
                  checked={autoAdjust}
                  onChange={(e) => setAutoAdjust(e.currentTarget.checked)}
                  label="Automatically adjust stock to actual count"
                />
              </Group>

              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {medicines.map((medicine) => (
                  <Card key={medicine._id} withBorder p="md" mb="xs">
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={500}>{medicine.name}</Text>
                        <Text size="sm" c="dimmed">
                          System Stock: {medicine.stock}
                        </Text>
                      </div>
                      <Checkbox
                        checked={verifications.some((v) => v.medicineId === medicine._id)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setVerifications([
                              ...verifications,
                              {
                                medicineId: medicine._id,
                                systemStock: medicine.stock,
                                actualStock: medicine.stock,
                                notes: '',
                              },
                            ]);
                          } else {
                            setVerifications(
                              verifications.filter((v) => v.medicineId !== medicine._id)
                            );
                          }
                        }}
                      />
                    </Group>

                    {verifications.some((v) => v.medicineId === medicine._id) && (
                      <Stack gap="xs">
                        <NumberInput
                          label="Actual Stock Count"
                          placeholder="Enter actual stock"
                          min={0}
                          value={
                            verifications.find((v) => v.medicineId === medicine._id)
                              ?.actualStock || 0
                          }
                          onChange={(value) => {
                            setVerifications(
                              verifications.map((v) =>
                                v.medicineId === medicine._id
                                  ? { ...v, actualStock: value }
                                  : v
                              )
                            );
                          }}
                        />
                        <TextInput
                          label="Notes"
                          placeholder="Any discrepancies or notes..."
                          value={
                            verifications.find((v) => v.medicineId === medicine._id)
                              ?.notes || ''
                          }
                          onChange={(e) => {
                            setVerifications(
                              verifications.map((v) =>
                                v.medicineId === medicine._id
                                  ? { ...v, notes: e.currentTarget.value }
                                  : v
                              )
                            );
                          }}
                        />
                      </Stack>
                    )}
                  </Card>
                ))}
              </div>

              <Group justify="flex-end">
                <Button
                  variant="light"
                  onClick={() => {
                    setVerificationModal(false);
                    setVerifications([]);
                    setVerificationSummary(null);
                    setAutoAdjust(true);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleVerificationSubmit}>Submit Verification</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default InventoryPage;
