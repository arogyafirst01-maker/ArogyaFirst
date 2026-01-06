import React from 'react';
import { useForm } from '@mantine/form';
import {
  Stack,
  Group,
  Select,
  TextInput,
  NumberInput,
  Textarea,
  Radio,
  Button,
  Loader,
  Alert,
} from '@mantine/core';
import { BOOKING_TYPES, PAYMENT_METHODS, formatDateForDisplay } from '@arogyafirst/shared';

export default function ManualBookingForm({ user, availableSlots, fetchBookings, setManualBookingModalOpen, fetchData }) {
  const form = useForm({
    initialValues: {
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      paymentMethod: PAYMENT_METHODS.CASH,
      paymentAmount: 0,
      metadata: '',
      slotSelection: '', // Changed to store composite value: "slotId" or "slotId|windowIndex"
    },
    validate: {
      slotSelection: (v) => (!v ? 'Please select a slot' : null),
      patientName: (v) => (!v ? 'Required' : null),
      patientPhone: (v) => (!/^\d{10}$/.test(v) ? 'Enter valid 10-digit phone' : null),
      patientEmail: (v) => (v && !v.includes('@') ? 'Enter valid email' : null),
      paymentAmount: (v) => (v < 0 ? 'Amount must be >= 0' : null),
    },
  });

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');
    try {
      // Parse slotSelection to extract slotId and timeSlot
      const [slotId, windowIndex] = values.slotSelection.split('|');
      let timeSlot = null;
      
      const selectedSlot = availableSlots.find((slot) => slot._id === slotId);
      if (selectedSlot && selectedSlot.timeSlots && selectedSlot.timeSlots.length > 0 && windowIndex !== undefined) {
        // Multi-window slot: extract the specific time window
        const windowIdx = parseInt(windowIndex, 10);
        const window = selectedSlot.timeSlots[windowIdx];
        if (window) {
          timeSlot = { startTime: window.startTime, endTime: window.endTime };
        }
      }
      // For single-range slots, timeSlot remains null and backend uses slot.startTime/endTime
      
      // Prepare metadata as object
      const metadata = values.metadata ? { notes: values.metadata.trim() } : {};
      // Build payload
      const payload = {
        slotId,
        timeSlot,
        patientName: values.patientName,
        patientPhone: values.patientPhone,
        patientEmail: values.patientEmail,
        paymentMethod: values.paymentMethod,
        paymentAmount: values.paymentAmount,
        metadata,
      };
      const res = await fetchData('/api/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.success) {
        fetchBookings();
        setManualBookingModalOpen(false);
      } else {
        setError(res.message || 'Failed to create booking');
      }
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Radio.Group
          label="Available Slots"
          {...form.getInputProps('slotSelection')}
        >
          {Array.isArray(availableSlots) && availableSlots.map((slot) => {
            // Check if slot is multi-window or single-range
            if (Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0) {
              // Multi-window slot: render one option per time window
              return slot.timeSlots.map((window, idx) => (
                <Radio
                  key={`${slot._id}|${idx}`}
                  value={`${slot._id}|${idx}`}
                  label={`${formatDateForDisplay(slot.date)} - ${window.startTime} to ${window.endTime} (${window.capacity - (window.booked || 0)} available)`}
                />
              ));
            } else {
              // Single-range slot: render one option with slot's startTime/endTime
              return (
                <Radio
                  key={slot._id}
                  value={slot._id}
                  label={`${formatDateForDisplay(slot.date)} - ${slot.startTime} to ${slot.endTime} (${slot.capacity - (slot.booked || 0)} available)`}
                />
              );
            }
          })}
        </Radio.Group>
        <TextInput label="Patient Name" {...form.getInputProps('patientName')} />
        <TextInput label="Patient Phone" {...form.getInputProps('patientPhone')} />
        <TextInput label="Patient Email" {...form.getInputProps('patientEmail')} />
        <Select
          label="Payment Method"
          data={[
            { value: PAYMENT_METHODS.CASH, label: 'Cash' },
            { value: PAYMENT_METHODS.MANUAL, label: 'Manual' },
          ]}
          {...form.getInputProps('paymentMethod')}
        />
        <NumberInput label="Amount" min={0} {...form.getInputProps('paymentAmount')} />
        <Textarea label="Metadata (Symptoms/Requests)" {...form.getInputProps('metadata')} />
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="flex-end">
          <Button type="submit" loading={loading}>
            Create Booking
          </Button>
        </Group>
      </Stack>
    </form>
  );
}