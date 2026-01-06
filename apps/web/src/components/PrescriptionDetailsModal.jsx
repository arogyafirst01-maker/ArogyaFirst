import React from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Badge,
  Table,
  Divider,
  Card,
} from '@mantine/core';
import { PRESCRIPTION_STATUS } from '@arogyafirst/shared';
import { formatDateForDisplay } from '@arogyafirst/shared';

/**
 * PrescriptionDetailsModal
 * 
 * Displays complete prescription details including medicines list,
 * doctor/patient/pharmacy information, and status.
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Object} prescription - Prescription object with all data
 */
export const PrescriptionDetailsModal = ({ opened, onClose, prescription }) => {
  if (!prescription) return null;

  const getStatusBadge = (status) => {
    const colors = {
      [PRESCRIPTION_STATUS.PENDING]: 'yellow',
      [PRESCRIPTION_STATUS.FULFILLED]: 'green',
      [PRESCRIPTION_STATUS.CANCELLED]: 'red',
    };
    return <Badge color={colors[status] || 'gray'} size="lg">{status}</Badge>;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Prescription Details"
      size="lg"
    >
      <Stack>
        {/* Header */}
        <Card withBorder p="md" bg="gray.0">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Prescription ID</Text>
              <Text fw={600}>{prescription.prescriptionId}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Date</Text>
              <Text fw={600}>{formatDateForDisplay(prescription.createdAt)}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Status</Text>
              {getStatusBadge(prescription.status)}
            </div>
          </Group>
        </Card>

        {/* Doctor Info */}
        <div>
          <Text fw={600} mb="xs">Doctor Information</Text>
          <Group>
            <Text size="sm"><strong>Name:</strong> Dr. {prescription.doctorSnapshot?.name || 'Unknown'}</Text>
            {prescription.doctorSnapshot?.specialization && (
              <Badge variant="light">{prescription.doctorSnapshot.specialization}</Badge>
            )}
          </Group>
          {prescription.doctorSnapshot?.uniqueId && (
            <Text size="sm" c="dimmed">ID: {prescription.doctorSnapshot.uniqueId}</Text>
          )}
        </div>

        <Divider />

        {/* Patient Info */}
        <div>
          <Text fw={600} mb="xs">Patient Information</Text>
          <Text size="sm"><strong>Name:</strong> {prescription.patientSnapshot?.name || 'Unknown'}</Text>
          {prescription.patientSnapshot?.phone && (
            <Text size="sm"><strong>Phone:</strong> {prescription.patientSnapshot.phone}</Text>
          )}
          {prescription.patientSnapshot?.email && (
            <Text size="sm"><strong>Email:</strong> {prescription.patientSnapshot.email}</Text>
          )}
        </div>

        <Divider />

        {/* Pharmacy Info */}
        {prescription.pharmacySnapshot && (
          <>
            <div>
              <Text fw={600} mb="xs">Pharmacy Information</Text>
              <Text size="sm"><strong>Name:</strong> {prescription.pharmacySnapshot.name}</Text>
              {prescription.pharmacySnapshot.location && (
                <Text size="sm"><strong>Location:</strong> {prescription.pharmacySnapshot.location}</Text>
              )}
              {prescription.pharmacySnapshot.uniqueId && (
                <Text size="sm" c="dimmed">ID: {prescription.pharmacySnapshot.uniqueId}</Text>
              )}
            </div>
            <Divider />
          </>
        )}

        {/* Medicines Table */}
        <div>
          <Text fw={600} mb="xs">Medicines</Text>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Dosage</Table.Th>
                <Table.Th>Quantity</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Instructions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Array.isArray(prescription.medicines) && prescription.medicines.map((medicine, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{medicine.name}</Table.Td>
                  <Table.Td>{medicine.dosage}</Table.Td>
                  <Table.Td>{medicine.quantity}</Table.Td>
                  <Table.Td>{medicine.duration || '-'}</Table.Td>
                  <Table.Td>{medicine.instructions || '-'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <>
            <Divider />
            <div>
              <Text fw={600} mb="xs">Doctor's Notes</Text>
              <Text size="sm">{prescription.notes}</Text>
            </div>
          </>
        )}

        {/* Fulfillment/Cancellation Info */}
        {prescription.fulfilledAt && (
          <>
            <Divider />
            <Text size="sm" c="green">
              <strong>Fulfilled on:</strong> {formatDateForDisplay(prescription.fulfilledAt)}
            </Text>
          </>
        )}

        {prescription.cancelledAt && (
          <>
            <Divider />
            <div>
              <Text size="sm" c="red">
                <strong>Cancelled on:</strong> {formatDateForDisplay(prescription.cancelledAt)}
              </Text>
              {prescription.cancellationReason && (
                <Text size="sm" c="dimmed">Reason: {prescription.cancellationReason}</Text>
              )}
            </div>
          </>
        )}
      </Stack>
    </Modal>
  );
};
