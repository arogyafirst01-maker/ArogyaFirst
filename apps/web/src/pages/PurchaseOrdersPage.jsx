import { Container, Title, Tabs, Table, Modal, TextInput, Select, Button, ActionIcon, Badge, Group, Stack, Loader, Text, Card, NumberInput, Textarea, SimpleGrid, Divider, Alert } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconCheck, IconX, IconTruck, IconPackage, IconAlertCircle } from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import { PO_STATUS } from '@arogyafirst/shared';

const getPOStatusColor = (status) => {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'blue';
    case 'ORDERED':
      return 'cyan';
    case 'PARTIAL':
      return 'orange';
    case 'COMPLETED':
      return 'green';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
};

const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || 0}`;

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const SummaryCard = ({ label, value, color = 'blue', icon: Icon = IconPackage, loading = false }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Group justify="apart" mb="xs">
      <Text size="sm" c="dimmed" fw={500}>{label}</Text>
      {Icon && <Icon size={24} color={`var(--mantine-color-${color}-6)`} />}
    </Group>
    {loading ? (
      <Loader size="sm" />
    ) : (
      <Text size="xl" fw={700}>{value}</Text>
    )}
  </Card>
);

export default function PurchaseOrdersPage() {
  usePageTitle('Purchase Orders');
  const { user } = useAuth();
  const { fetchData, loading } = useAuthFetch();

  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('suppliers');
  const [modalOpened, setModalOpened] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedSupplierPO, setSelectedSupplierPO] = useState(null);

  // Modal states
  const [poApproveModal, setPoApproveModal] = useState(false);
  const [poReceiveModal, setPoReceiveModal] = useState(false);
  const [poCancelModal, setPoCancelModal] = useState(false);
  const [viewPoModal, setViewPoModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const supplierForm = useForm({
    initialValues: { name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '' },
    validate: {
      name: (value) => !value ? 'Name is required' : null,
      phone: (value) => !value ? 'Phone is required' : !/^\d{10}$/.test(value) ? 'Phone must be 10 digits' : null,
      email: (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email' : null,
    }
  });

  const poForm = useForm({
    initialValues: {
      supplierId: '',
      items: [{ medicineName: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: null }],
      expectedDeliveryDate: null,
      notes: ''
    },
    validate: {
      supplierId: (value) => !value ? 'Supplier is required' : null,
      items: {
        medicineName: (value) => !value ? 'Medicine name is required' : null,
        quantity: (value) => !value || value <= 0 ? 'Quantity must be greater than 0' : null,
        unitPrice: (value) => !value || value <= 0 ? 'Unit price must be greater than 0' : null,
      }
    }
  });

  const approveForm = useForm({
    initialValues: { approvedBy: '', notes: '' },
    validate: { approvedBy: (value) => !value ? 'Approved by name is required' : null }
  });

  const receiveForm = useForm({
    initialValues: { items: [], receivedBy: '', notes: '' },
    validate: { receivedBy: (value) => !value ? 'Received by name is required' : null }
  });

  const cancelForm = useForm({
    initialValues: { reason: '' }
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      const result = await fetchData('/api/pharmacies/suppliers?activeOnly=true');
      if (result?.data?.suppliers) {
        setSuppliers(result.data.suppliers);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load suppliers', color: 'red' });
    }
  }, [fetchData]);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      let url = '/api/pharmacies/purchase-orders';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (selectedSupplierPO) params.append('supplierId', selectedSupplierPO);
      if (params.toString()) url += '?' + params.toString();

      const result = await fetchData(url);
      if (result?.data?.purchaseOrders) {
        setPurchaseOrders(result.data.purchaseOrders);
      }
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Failed to load purchase orders', color: 'red' });
    }
  }, [fetchData, filterStatus, selectedSupplierPO]);

  useEffect(() => {
    const loadData = async () => {
      setPageLoading(true);
      await Promise.all([fetchSuppliers(), fetchPurchaseOrders()]);
      setPageLoading(false);
    };
    loadData();
  }, [fetchSuppliers, fetchPurchaseOrders]);

  const handleAddSupplier = async (values) => {
    try {
      const response = await fetchData('/api/pharmacies/suppliers', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      notifications.show({ title: 'Success', message: 'Supplier added successfully', color: 'green' });
      supplierForm.reset();
      setModalOpened(false);
      await fetchSuppliers();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleEditSupplier = async (id) => {
    const supplier = suppliers.find(s => s._id === id);
    if (supplier) {
      supplierForm.setValues(supplier);
      setEditingSupplier(id);
      setModalOpened(true);
    }
  };

  const handleUpdateSupplier = async (values) => {
    try {
      await fetchData(`/api/pharmacies/suppliers/${editingSupplier}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      notifications.show({ title: 'Success', message: 'Supplier updated successfully', color: 'green' });
      supplierForm.reset();
      setModalOpened(false);
      setEditingSupplier(null);
      await fetchSuppliers();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await fetchData(`/api/pharmacies/suppliers/${id}`, { method: 'DELETE' });
      notifications.show({ title: 'Success', message: 'Supplier deleted successfully', color: 'green' });
      await fetchSuppliers();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleCreatePO = async (values) => {
    try {
      const payload = {
        supplierId: values.supplierId,
        items: values.items.filter(i => i.medicineName && i.quantity && i.unitPrice),
        expectedDeliveryDate: values.expectedDeliveryDate,
        notes: values.notes
      };
      await fetchData('/api/pharmacies/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      notifications.show({ title: 'Success', message: 'Purchase order created successfully', color: 'green' });
      poForm.reset();
      setActiveTab('purchase-orders');
      await fetchPurchaseOrders();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleApprovePO = async (id) => {
    try {
      await fetchData(`/api/pharmacies/purchase-orders/${id}/approve`, {
        method: 'PUT',
        body: JSON.stringify(approveForm.values),
      });
      notifications.show({ title: 'Success', message: 'Purchase order approved', color: 'green' });
      approveForm.reset();
      setPoApproveModal(false);
      await fetchPurchaseOrders();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleReceivePO = async (id) => {
    try {
      await fetchData(`/api/pharmacies/purchase-orders/${id}/receive`, {
        method: 'PUT',
        body: JSON.stringify(receiveForm.values),
      });
      notifications.show({ title: 'Success', message: 'Purchase order items received', color: 'green' });
      receiveForm.reset();
      setPoReceiveModal(false);
      await fetchPurchaseOrders();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const handleCancelPO = async (id) => {
    try {
      await fetchData(`/api/pharmacies/purchase-orders/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify(cancelForm.values),
      });
      notifications.show({ title: 'Success', message: 'Purchase order cancelled', color: 'green' });
      cancelForm.reset();
      setPoCancelModal(false);
      await fetchPurchaseOrders();
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const query = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(query) ||
        s.phone.includes(query) ||
        (s.email && s.email.toLowerCase().includes(query));
    });
  }, [suppliers, searchQuery]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const query = searchQuery.toLowerCase();
      return po.poNumber.toLowerCase().includes(query);
    });
  }, [purchaseOrders, searchQuery]);

  const poStats = useMemo(() => ({
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => po.status === 'PENDING').length,
    approved: purchaseOrders.filter(po => po.status === 'APPROVED').length,
    completed: purchaseOrders.filter(po => po.status === 'COMPLETED').length,
    cancelled: purchaseOrders.filter(po => po.status === 'CANCELLED').length,
  }), [purchaseOrders]);

  if (pageLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading purchase orders...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>Purchase Orders Management</Title>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="suppliers" leftSection={<IconTruck size={14} />}>Suppliers</Tabs.Tab>
            <Tabs.Tab value="purchase-orders" leftSection={<IconPackage size={14} />}>Purchase Orders</Tabs.Tab>
            <Tabs.Tab value="create-po" leftSection={<IconPlus size={14} />}>Create PO</Tabs.Tab>
          </Tabs.List>

          {/* ==================== SUPPLIERS TAB ==================== */}
          <Tabs.Panel value="suppliers" pt="lg">
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Total Suppliers: {suppliers.length}</Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={() => { supplierForm.reset(); setEditingSupplier(null); setModalOpened(true); }}>
                  Add Supplier
                </Button>
              </Group>

              <TextInput
                placeholder="Search by name, phone, or email..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Contact Person</Table.Th>
                    <Table.Th>Phone</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>GSTIN</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredSuppliers.map((supplier) => (
                    <Table.Tr key={supplier._id}>
                      <Table.Td fw={500}>{supplier.name}</Table.Td>
                      <Table.Td>{supplier.contactPerson || '-'}</Table.Td>
                      <Table.Td>{supplier.phone}</Table.Td>
                      <Table.Td>{supplier.email || '-'}</Table.Td>
                      <Table.Td>{supplier.gstin || '-'}</Table.Td>
                      <Table.Td>
                        <Group gap={0}>
                          <ActionIcon size="sm" color="blue" onClick={() => handleEditSupplier(supplier._id)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon size="sm" color="red" onClick={() => handleDeleteSupplier(supplier._id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* ==================== PURCHASE ORDERS TAB ==================== */}
          <Tabs.Panel value="purchase-orders" pt="lg">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="lg">
                <SummaryCard label="Total POs" value={poStats.total} color="blue" />
                <SummaryCard label="Pending" value={poStats.pending} color="yellow" />
                <SummaryCard label="Approved" value={poStats.approved} color="blue" />
                <SummaryCard label="Completed" value={poStats.completed} color="green" />
                <SummaryCard label="Cancelled" value={poStats.cancelled} color="red" />
              </SimpleGrid>

              <Group grow>
                <TextInput
                  placeholder="Search by PO number..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Select
                  placeholder="Filter by status"
                  data={[{ value: 'all', label: 'All Statuses' }, ...Object.entries(PO_STATUS).map(([_, v]) => ({ value: v, label: v }))]}
                  value={filterStatus}
                  onChange={(value) => setFilterStatus(value || 'all')}
                />
                <Select
                  placeholder="Filter by supplier"
                  data={[{ value: '', label: 'All Suppliers' }, ...suppliers.map(s => ({ value: s._id, label: s.name }))]}
                  value={selectedSupplierPO || ''}
                  onChange={(value) => setSelectedSupplierPO(value || null)}
                />
              </Group>

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>PO Number</Table.Th>
                    <Table.Th>Supplier</Table.Th>
                    <Table.Th>Order Date</Table.Th>
                    <Table.Th>Expected Delivery</Table.Th>
                    <Table.Th>Total Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredPOs.map((po) => (
                    <Table.Tr key={po._id}>
                      <Table.Td fw={500}>{po.poNumber}</Table.Td>
                      <Table.Td>{po.supplierSnapshot.name}</Table.Td>
                      <Table.Td>{formatDate(po.orderDate)}</Table.Td>
                      <Table.Td>{formatDate(po.expectedDeliveryDate)}</Table.Td>
                      <Table.Td>{formatCurrency(po.totalAmount)}</Table.Td>
                      <Table.Td>
                        <Badge color={getPOStatusColor(po.status)}>{po.status}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={0}>
                          <ActionIcon size="sm" color="gray" onClick={() => { setSelectedPO(po); setViewPoModal(true); }}>
                            <IconSearch size={16} />
                          </ActionIcon>
                          {po.status === 'PENDING' && (
                            <>
                              <ActionIcon size="sm" color="green" onClick={() => { setSelectedPO(po); approveForm.reset(); setPoApproveModal(true); }}>
                                <IconCheck size={16} />
                              </ActionIcon>
                              <ActionIcon size="sm" color="red" onClick={() => { setSelectedPO(po); setPoCancelModal(true); }}>
                                <IconX size={16} />
                              </ActionIcon>
                            </>
                          )}
                          {(po.status === 'APPROVED' || po.status === 'PARTIAL') && (
                            <>
                              <ActionIcon size="sm" color="blue" onClick={() => {
                                setSelectedPO(po);
                                // Initialize receive form with explicit itemIndex mapping
                                // itemIndex must exactly match backend array index for correct item receipt processing
                                receiveForm.setFieldValue('items', po.items.map((_, idx) => ({
                                  itemIndex: idx,
                                  quantityReceived: 0
                                })));
                                setPoReceiveModal(true);
                              }}>
                                <IconTruck size={16} />
                              </ActionIcon>
                              {po.status === 'APPROVED' && (
                                <ActionIcon size="sm" color="red" onClick={() => { setSelectedPO(po); setPoCancelModal(true); }}>
                                  <IconX size={16} />
                                </ActionIcon>
                              )}
                            </>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Tabs.Panel>

          {/* ==================== CREATE PO TAB ==================== */}
          <Tabs.Panel value="create-po" pt="lg">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <form onSubmit={poForm.onSubmit(handleCreatePO)}>
                <Stack gap="md">
                  <Select
                    label="Supplier *"
                    placeholder="Select supplier"
                    data={suppliers.map(s => ({ value: s._id, label: s.name }))}
                    {...poForm.getInputProps('supplierId')}
                  />

                  <DatePickerInput
                    label="Expected Delivery Date"
                    placeholder="Select date"
                    {...poForm.getInputProps('expectedDeliveryDate')}
                  />

                  <Divider label="Items" labelPosition="center" my="lg" />

                  {poForm.values.items.map((item, idx) => (
                    <Card key={idx} withBorder p="md" bg="gray.0">
                      <Stack gap="sm">
                        <Group grow>
                          <TextInput
                            label="Medicine Name *"
                            placeholder="Enter medicine name"
                            {...poForm.getInputProps(`items.${idx}.medicineName`)}
                          />
                          <TextInput
                            label="Generic Name"
                            placeholder="Generic name"
                            {...poForm.getInputProps(`items.${idx}.genericName`)}
                          />
                        </Group>
                        <Group grow>
                          <NumberInput
                            label="Quantity *"
                            placeholder="Qty"
                            min={1}
                            {...poForm.getInputProps(`items.${idx}.quantity`)}
                          />
                          <NumberInput
                            label="Unit Price *"
                            placeholder="₹"
                            min={0}
                            {...poForm.getInputProps(`items.${idx}.unitPrice`)}
                          />
                          <div>
                            <Text size="sm" fw={500} mb="xs">Total Price</Text>
                            <Text fw={700}>
                              {formatCurrency((poForm.values.items[idx].quantity || 0) * (poForm.values.items[idx].unitPrice || 0))}
                            </Text>
                          </div>
                        </Group>
                        <Group grow>
                          <TextInput
                            label="Batch Number"
                            placeholder="Batch"
                            {...poForm.getInputProps(`items.${idx}.batchNumber`)}
                          />
                          <DatePickerInput
                            label="Expiry Date"
                            placeholder="Expiry"
                            {...poForm.getInputProps(`items.${idx}.expiryDate`)}
                          />
                        </Group>
                        {poForm.values.items.length > 1 && (
                          <Button
                            color="red"
                            size="sm"
                            onClick={() => poForm.removeListItem('items', idx)}
                          >
                            Remove Item
                          </Button>
                        )}
                      </Stack>
                    </Card>
                  ))}

                  <Button
                    variant="light"
                    onClick={() => poForm.insertListItem('items', { medicineName: '', quantity: '', unitPrice: '', batchNumber: '', expiryDate: null })}
                  >
                    + Add Item
                  </Button>

                  <Card withBorder p="md" bg="blue.0">
                    <Group justify="space-between">
                      <Text fw={500}>Grand Total</Text>
                      <Text fw={700} size="lg">
                        {formatCurrency(poForm.values.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0))}
                      </Text>
                    </Group>
                  </Card>

                  <Textarea
                    label="Notes"
                    placeholder="Additional notes..."
                    {...poForm.getInputProps('notes')}
                  />

                  <Button type="submit" color="blue">
                    Create Purchase Order
                  </Button>
                </Stack>
              </form>
            </Card>
          </Tabs.Panel>
        </Tabs>

        {/* ==================== SUPPLIER MODAL ==================== */}
        <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}>
          <form onSubmit={supplierForm.onSubmit(editingSupplier ? handleUpdateSupplier : handleAddSupplier)}>
            <Stack gap="md">
              <TextInput label="Name *" {...supplierForm.getInputProps('name')} />
              <TextInput label="Contact Person" {...supplierForm.getInputProps('contactPerson')} />
              <TextInput label="Phone *" {...supplierForm.getInputProps('phone')} />
              <TextInput label="Email" {...supplierForm.getInputProps('email')} />
              <TextInput label="Address" {...supplierForm.getInputProps('address')} />
              <TextInput label="GSTIN" {...supplierForm.getInputProps('gstin')} />
              <Button type="submit">{editingSupplier ? 'Update' : 'Add'} Supplier</Button>
            </Stack>
          </form>
        </Modal>

        {/* ==================== APPROVE PO MODAL ==================== */}
        <Modal opened={poApproveModal} onClose={() => setPoApproveModal(false)} title="Approve Purchase Order">
          <form onSubmit={approveForm.onSubmit(() => handleApprovePO(selectedPO._id))}>
            <Stack gap="md">
              <TextInput label="Approved By *" placeholder="Your name" {...approveForm.getInputProps('approvedBy')} />
              <Textarea label="Notes" placeholder="Optional notes..." {...approveForm.getInputProps('notes')} />
              <Button type="submit">Approve PO</Button>
            </Stack>
          </form>
        </Modal>

        {/* ==================== RECEIVE PO MODAL ==================== */}
        <Modal opened={poReceiveModal} onClose={() => setPoReceiveModal(false)} title="Receive Purchase Order Items" size="lg">
          <form onSubmit={receiveForm.onSubmit(() => handleReceivePO(selectedPO._id))}>
            <Stack gap="md">
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Medicine</Table.Th>
                    <Table.Th>Order Qty</Table.Th>
                    <Table.Th>Received Qty</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedPO?.items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>{item.medicineName}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          max={item.quantity - item.quantityReceived}
                          min={0}
                          {...receiveForm.getInputProps(`items.${idx}.quantityReceived`)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <TextInput label="Received By *" placeholder="Your name" {...receiveForm.getInputProps('receivedBy')} />
              <Textarea label="Notes" placeholder="Optional notes..." {...receiveForm.getInputProps('notes')} />
              <Button type="submit">Receive Items</Button>
            </Stack>
          </form>
        </Modal>

        {/* ==================== CANCEL PO MODAL ==================== */}
        <Modal opened={poCancelModal} onClose={() => setPoCancelModal(false)} title="Cancel Purchase Order">
          <form onSubmit={cancelForm.onSubmit(() => handleCancelPO(selectedPO._id))}>
            <Stack gap="md">
              <Textarea label="Cancellation Reason" placeholder="Enter reason..." {...cancelForm.getInputProps('reason')} />
              <Button type="submit" color="red">Cancel PO</Button>
            </Stack>
          </form>
        </Modal>

        {/* ==================== VIEW PO MODAL ==================== */}
        <Modal opened={viewPoModal} onClose={() => setViewPoModal(false)} title="Purchase Order Details" size="lg">
          {selectedPO && (
            <Stack gap="md">
              <Alert icon={<IconAlertCircle size={16} />} color={getPOStatusColor(selectedPO.status)}>
                <Badge color={getPOStatusColor(selectedPO.status)}>{selectedPO.status}</Badge>
              </Alert>

              <div>
                <Text fw={500}>PO Number: {selectedPO.poNumber}</Text>
                <Text fw={500}>Supplier: {selectedPO.supplierSnapshot.name}</Text>
                <Text fw={500}>Order Date: {formatDate(selectedPO.orderDate)}</Text>
                <Text fw={500}>Expected Delivery: {formatDate(selectedPO.expectedDeliveryDate)}</Text>
              </div>

              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Medicine</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Received</Table.Th>
                    <Table.Th>Unit Price</Table.Th>
                    <Table.Th>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedPO.items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>{item.medicineName}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>{item.quantityReceived}</Table.Td>
                      <Table.Td>{formatCurrency(item.unitPrice)}</Table.Td>
                      <Table.Td>{formatCurrency(item.totalPrice)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Card withBorder p="md" bg="blue.0">
                <Group justify="space-between">
                  <Text fw={500}>Total Amount</Text>
                  <Text fw={700}>{formatCurrency(selectedPO.totalAmount)}</Text>
                </Group>
              </Card>

              {selectedPO.notes && (
                <div>
                  <Text fw={500}>Notes:</Text>
                  <Text size="sm">{selectedPO.notes}</Text>
                </div>
              )}
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
