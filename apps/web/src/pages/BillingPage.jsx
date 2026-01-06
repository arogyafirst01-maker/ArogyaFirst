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
  Select,
  Stack,
  Text,
  Grid,
  Card,
  ActionIcon,
  Loader,
  Center,
  Input,
  SimpleGrid,
  Drawer,
  Divider,
  NumberInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconDownload,
  IconPlus,
  IconEye,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconFileText,
} from '@tabler/icons-react';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { useAuth } from '../contexts/AuthContext';
import InvoiceGenerationModal from '../components/InvoiceGenerationModal';
import { INVOICE_STATUS, PAYMENT_STATUS } from '@arogyafirst/shared';

const BillingPage = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modal states
  const [generationModal, setGenerationModal] = useState(false);
  const [markPaidModal, setMarkPaidModal] = useState(false);
  const [detailsDrawer, setDetailsDrawer] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { fetchData } = useAuthFetch();

  // Load invoices on mount
  useEffect(() => {
    loadInvoices();
  }, [user?._id]);

  const loadInvoices = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (activeTab !== 'all') {
        queryParams.append('status', getStatusQueryParam(activeTab));
      }
      if (dateRange.start) {
        queryParams.append('startDate', dateRange.start);
      }
      if (dateRange.end) {
        queryParams.append('endDate', dateRange.end);
      }

      const response = await fetchData(
        `/api/billing/providers/${user._id}/invoices?${queryParams.toString()}`
      );
      if (response.success) {
        setInvoices(response.data.invoices || []);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load invoices',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark as paid form
  const markPaidForm = useForm({
    initialValues: {
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      transactionId: '',
      notes: '',
    },
    validate: {
      paymentMethod: (value) => (value ? null : 'Payment method is required'),
    },
  });

  const handleMarkAsPaid = async (values) => {
    if (!selectedInvoice) return;

    try {
      const response = await fetchData(
        `/api/billing/invoices/${selectedInvoice.invoiceId}/mark-paid`,
        {
          method: 'PUT',
          body: JSON.stringify({
            paymentId: values.transactionId,
            paymentMethod: values.paymentMethod,
          }),
        }
      );

      if (response.success) {
        notifications.show({
          title: 'Success',
          message: 'Invoice marked as paid',
          color: 'green',
        });
        setMarkPaidModal(false);
        markPaidForm.reset();
        loadInvoices();
      } else {
        notifications.show({
          title: 'Error',
          message: response.error || 'Failed to mark invoice as paid',
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

  const getStatusQueryParam = (tab) => {
    // Map tab names to invoice statuses for API queries
    switch (tab) {
      case 'pending':
        return INVOICE_STATUS.ISSUED; // API expects status, not paymentStatus
      case 'paid':
        return INVOICE_STATUS.PAID;
      case 'overdue':
        return INVOICE_STATUS.ISSUED; // Handle overdue on client side
      default:
        return null;
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices.filter((inv) =>
      inv.invoiceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientSnapshot?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.patientSnapshot?.phone?.includes(searchQuery)
    );

    // Apply date range filter if set (based on invoiceDate from API)
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          if (invDate < startDate) return false;
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (invDate > endDate) return false;
        }
        return true;
      });
    }

    // Filter by status/tab on client side for more complex filtering
    switch (activeTab) {
      case 'pending':
        return filtered.filter((inv) => inv.paymentStatus === PAYMENT_STATUS.PENDING);
      case 'paid':
        return filtered.filter((inv) => inv.paymentStatus === PAYMENT_STATUS.SUCCESS);
      case 'overdue':
        const today = new Date();
        return filtered.filter((inv) => {
          if (inv.paymentStatus === PAYMENT_STATUS.SUCCESS) return false;
          const dueDate = new Date(inv.dueDate || inv.invoiceDate);
          return dueDate < today;
        });
      default:
        return filtered;
    }
  };

  const getStatusBadge = (invoice) => {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate || invoice.invoiceDate);

    if (invoice.paymentStatus === PAYMENT_STATUS.SUCCESS) {
      return <Badge color="green">Paid</Badge>;
    } else if (dueDate < today) {
      return <Badge color="red">Overdue</Badge>;
    }
    return <Badge color="yellow">Pending</Badge>;
  };

  const getSummaryStats = () => {
    const stats = {
      totalInvoices: invoices.length,
      totalRevenue: 0,
      pendingAmount: 0,
      overdueAmount: 0,
    };

    invoices.forEach((inv) => {
      const amount = inv.totalAmount || 0;
      stats.totalRevenue += amount;

      if (inv.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
        stats.pendingAmount += amount;
        const dueDate = new Date(inv.dueDate || inv.invoiceDate);
        if (dueDate < new Date()) {
          stats.overdueAmount += amount;
        }
      }
    });

    return stats;
  };

  const filteredInvoices = getFilteredInvoices();
  const stats = getSummaryStats();

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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Billing & Invoices</h1>
          <Text c="dimmed" size="sm" mt={4}>
            Manage your pharmacy invoices and billing
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setGenerationModal(true)}
        >
          Generate Invoice
        </Button>
      </Group>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Total Invoices
              </Text>
              <Text size="xl" fw={700} mt={4}>
                {stats.totalInvoices}
              </Text>
            </div>
            <Badge color="blue" variant="light" size="xl">
              📄
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Total Revenue
              </Text>
              <Text size="xl" fw={700} mt={4}>
                ₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </div>
            <Badge color="green" variant="light" size="xl">
              💰
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Pending Amount
              </Text>
              <Text size="xl" fw={700} mt={4}>
                ₹{stats.pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </div>
            <Badge color="yellow" variant="light" size="xl">
              ⏳
            </Badge>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500} c="dimmed">
                Overdue Amount
              </Text>
              <Text size="xl" fw={700} mt={4}>
                ₹{stats.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </div>
            <Badge color="red" variant="light" size="xl">
              ⚠️
            </Badge>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Group gap="md" mb="md">
        <Input
          placeholder="Search by invoice ID, patient name, or phone..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput
          type="date"
          label="From Date"
          placeholder="Start date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.currentTarget.value })}
        />
        <TextInput
          type="date"
          label="To Date"
          placeholder="End date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.currentTarget.value })}
        />
      </Group>

      {/* Tabs */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all">
            All ({invoices.length})
          </Tabs.Tab>
          <Tabs.Tab value="pending">
            Pending (
            {invoices.filter((inv) => inv.paymentStatus === PAYMENT_STATUS.PENDING)
              .length}
            )
          </Tabs.Tab>
          <Tabs.Tab value="paid">
            Paid (
            {invoices.filter((inv) => inv.paymentStatus === PAYMENT_STATUS.SUCCESS).length})
          </Tabs.Tab>
          <Tabs.Tab value="overdue">
            Overdue (
            {
              invoices.filter((inv) => {
                if (inv.paymentStatus === PAYMENT_STATUS.SUCCESS) return false;
                const dueDate = new Date(inv.dueDate || inv.invoiceDate);
                return dueDate < new Date();
              }).length
            }
            )
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="md">
          {filteredInvoices.length === 0 ? (
            <Center py={40}>
              <Text c="dimmed">No invoices found</Text>
            </Center>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice ID</Table.Th>
                    <Table.Th>Patient Name</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Due Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredInvoices.map((invoice) => (
                    <Table.Tr key={invoice._id}>
                      <Table.Td fw={500}>{invoice.invoiceId}</Table.Td>
                      <Table.Td>{invoice.patientSnapshot?.name || 'N/A'}</Table.Td>
                      <Table.Td>
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td fw={500}>
                        ₹{(invoice.totalAmount || 0).toFixed(2)}
                      </Table.Td>
                      <Table.Td>{getStatusBadge(invoice)}</Table.Td>
                      <Table.Td>
                        {new Date(invoice.dueDate || invoice.invoiceDate).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="blue"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setDetailsDrawer(true);
                            }}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                          {invoice.paymentStatus !== PAYMENT_STATUS.SUCCESS && (
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="green"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                markPaidForm.reset();
                                setMarkPaidModal(true);
                              }}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                          )}
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

      {/* Invoice Generation Modal */}
      <InvoiceGenerationModal
        opened={generationModal}
        onClose={() => setGenerationModal(false)}
        onSuccess={() => {
          loadInvoices();
          setGenerationModal(false);
        }}
        providerId={user?._id}
      />

      {/* Mark as Paid Modal */}
      <Modal
        opened={markPaidModal}
        onClose={() => {
          setMarkPaidModal(false);
          setSelectedInvoice(null);
        }}
        title="Mark Invoice as Paid"
        centered
      >
        <form onSubmit={markPaidForm.onSubmit(handleMarkAsPaid)}>
          <Stack>
            {selectedInvoice && (
              <div>
                <Text size="sm" fw={500}>
                  {selectedInvoice.invoiceId}
                </Text>
                <Text size="xs" c="dimmed">
                  Amount: ₹{(selectedInvoice.totalAmount || selectedInvoice.amount || 0).toFixed(
                    2
                  )}
                </Text>
              </div>
            )}

            <Select
              label="Payment Method"
              placeholder="Select payment method"
              data={[
                { value: 'CASH', label: 'Cash' },
                { value: 'ONLINE', label: 'Online Payment' },
                { value: 'MANUAL', label: 'Manual/Other' },
              ]}
              {...markPaidForm.getInputProps('paymentMethod')}
            />

            <TextInput
              type="date"
              label="Payment Date"
              {...markPaidForm.getInputProps('paymentDate')}
            />

            <TextInput
              label="Transaction ID (Optional)"
              placeholder="Enter transaction ID"
              {...markPaidForm.getInputProps('transactionId')}
            />

            <TextInput
              label="Notes"
              placeholder="Add any notes..."
              {...markPaidForm.getInputProps('notes')}
            />

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setMarkPaidModal(false);
                  setSelectedInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Mark as Paid</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Invoice Details Drawer */}
      <Drawer
        opened={detailsDrawer}
        onClose={() => {
          setDetailsDrawer(false);
          setSelectedInvoice(null);
        }}
        title="Invoice Details"
        position="right"
        size="md"
      >
        {selectedInvoice && (
          <Stack>
            <div>
              <Text fw={500}>Invoice ID</Text>
              <Text size="sm">{selectedInvoice.invoiceId}</Text>
            </div>

            <Divider />

            <div>
              <Text fw={500}>Patient Information</Text>
              <Stack gap="xs" mt={8}>
                <div>
                  <Text size="sm" c="dimmed">
                    Name
                  </Text>
                  <Text size="sm">{selectedInvoice.patientSnapshot?.name || 'N/A'}</Text>
                </div>
                {selectedInvoice.patientSnapshot?.phone && (
                  <div>
                    <Text size="sm" c="dimmed">
                      Phone
                    </Text>
                    <Text size="sm">{selectedInvoice.patientSnapshot.phone}</Text>
                  </div>
                )}
                {selectedInvoice.patientSnapshot?.email && (
                  <div>
                    <Text size="sm" c="dimmed">
                      Email
                    </Text>
                    <Text size="sm">{selectedInvoice.patientSnapshot.email}</Text>
                  </div>
                )}
              </Stack>
            </div>

            <Divider />

            <div>
              <Text fw={500}>Invoice Details</Text>
              <Stack gap="xs" mt={8}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Date
                  </Text>
                  <Text size="sm">
                    {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Due Date
                  </Text>
                  <Text size="sm">
                    {new Date(selectedInvoice.dueDate || selectedInvoice.invoiceDate).toLocaleDateString()}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Status
                  </Text>
                  <div>{getStatusBadge(selectedInvoice)}</div>
                </Group>
              </Stack>
            </div>

            <Divider />

            <div>
              <Text fw={500}>Amount</Text>
              <Stack gap="xs" mt={8}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Total
                  </Text>
                  <Text size="sm">
                    ₹{(selectedInvoice.totalAmount || 0).toFixed(2)}
                  </Text>
                </Group>
              </Stack>
            </div>

            {selectedInvoice.paymentStatus !== PAYMENT_STATUS.SUCCESS && (
              <Button
                fullWidth
                color="green"
                onClick={() => {
                  markPaidForm.reset();
                  setMarkPaidModal(true);
                }}
              >
                Mark as Paid
              </Button>
            )}
          </Stack>
        )}
      </Drawer>
    </Container>
  );
};

export default BillingPage;
