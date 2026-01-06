import { Modal, Stack, Table, Button, Group, Select, TextInput, NumberInput, Text, ActionIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { notifications } from '@mantine/notifications';
import { INVOICE_ITEM_TYPE, TAX_TYPES } from '@arogyafirst/shared';

export default function InvoiceGenerationModal({ opened, onClose, providerId, bookingId, prescriptionId }) {
  const { fetchData, loading } = useAuthFetch();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      items: [
        {
          // default to PRESCRIPTION as a neutral common type; caller may adjust
          itemType: INVOICE_ITEM_TYPE.PRESCRIPTION,
          description: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      taxDetails: [
        {
          taxType: TAX_TYPES.GST,
          taxRate: 18,
        },
      ],
    },
    validate: {
      items: {
        description: (value) => (!value ? 'Description is required' : null),
        quantity: (value) => (value < 1 ? 'Quantity must be at least 1' : null),
        unitPrice: (value) => (value < 0 ? 'Price cannot be negative' : null),
      },
      taxDetails: {
        taxRate: (value) => (value < 0 || value > 100 ? 'Tax rate must be between 0 and 100' : null),
      },
    },
  });

  const addItem = () => {
    form.insertListItem('items', {
      itemType: INVOICE_ITEM_TYPE.OTHER,
      description: '',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeItem = (index) => {
    form.removeListItem('items', index);
  };

  const addTax = () => {
    form.insertListItem('taxDetails', {
      taxType: TAX_TYPES.GST,
      taxRate: 0,
    });
  };

  const removeTax = (index) => {
    form.removeListItem('taxDetails', index);
  };

  const calculateSubtotal = () => {
    return form.values.items.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);
  };

  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    return form.values.taxDetails.reduce((sum, tax) => {
      return sum + (subtotal * (tax.taxRate || 0)) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxes();
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const subtotal = calculateSubtotal();
      
      const payload = {
        providerId,
        items: values.items.map((item) => ({
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        })),
        taxDetails: values.taxDetails.map((tax) => ({
          taxType: tax.taxType,
          taxRate: tax.taxRate,
          taxAmount: (subtotal * (tax.taxRate || 0)) / 100,
        })),
        ...(bookingId && { bookingId }),
        ...(prescriptionId && { prescriptionId }),
      };

      await fetchData('/api/billing/generate-invoice', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      notifications.show({
        title: 'Success',
        message: 'Invoice generated successfully',
        color: 'green',
      });

      form.reset();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to generate invoice',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Generate Invoice"
      size="xl"
      closeOnClickOutside={!submitting}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* Items Section */}
          <div>
            <Group justify="space-between" mb="sm">
              <Text fw={500}>Invoice Items</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={addItem}
              >
                Add Item
              </Button>
            </Group>
            
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {form.values.items.map((item, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Select
                        {...form.getInputProps(`items.${index}.itemType`)}
                        data={Object.values(INVOICE_ITEM_TYPE).map((type) => ({
                          value: type,
                          label: type,
                        }))}
                        style={{ minWidth: 120 }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        {...form.getInputProps(`items.${index}.description`)}
                        placeholder="Item description"
                        style={{ minWidth: 200 }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        {...form.getInputProps(`items.${index}.quantity`)}
                        min={1}
                        style={{ width: 80 }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        {...form.getInputProps(`items.${index}.unitPrice`)}
                        min={0}
                        decimalScale={2}
                        prefix="₹"
                        style={{ width: 100 }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>
                        {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {form.values.items.length > 1 && (
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => removeItem(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          {/* Tax Details Section */}
          <div>
            <Group justify="space-between" mb="sm">
              <Text fw={500}>Tax Details</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={addTax}
              >
                Add Tax
              </Button>
            </Group>
            
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tax Type</Table.Th>
                  <Table.Th>Tax Rate (%)</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {form.values.taxDetails.map((tax, index) => {
                  const subtotal = calculateSubtotal();
                  const taxAmount = (subtotal * (tax.taxRate || 0)) / 100;
                  
                  return (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Select
                          {...form.getInputProps(`taxDetails.${index}.taxType`)}
                          data={Object.values(TAX_TYPES).map((type) => ({
                            value: type,
                            label: type,
                          }))}
                          style={{ minWidth: 150 }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          {...form.getInputProps(`taxDetails.${index}.taxRate`)}
                          min={0}
                          max={100}
                          decimalScale={2}
                          suffix="%"
                          style={{ width: 100 }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatCurrency(taxAmount)}</Text>
                      </Table.Td>
                      <Table.Td>
                        {form.values.taxDetails.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => removeTax(index)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </div>

          {/* Totals Section */}
          <Stack gap="xs" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Group justify="space-between">
              <Text size="lg">Subtotal:</Text>
              <Text size="lg" fw={500}>{formatCurrency(calculateSubtotal())}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="lg">Total Taxes:</Text>
              <Text size="lg" fw={500}>{formatCurrency(calculateTaxes())}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="xl" fw={700}>Total:</Text>
              <Text size="xl" fw={700} c="teal">{formatCurrency(calculateTotal())}</Text>
            </Group>
          </Stack>

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Generate Invoice
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
