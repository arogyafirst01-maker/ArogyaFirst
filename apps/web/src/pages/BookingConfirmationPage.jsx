import React, { useState, useEffect } from 'react';
import { Container, Paper, Title, Text, Button, Stack, Group, Badge, Divider, Card, Loader, Alert, ActionIcon } from '@mantine/core';
import { IconCheck, IconCalendar, IconClock, IconMapPin, IconUser, IconCopy, IconCreditCard, IconAlertCircle } from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router';
import useAuthFetch from '../hooks/useAuthFetch';
import { formatDateForDisplay, formatTimeRange } from '@arogyafirst/shared';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@arogyafirst/shared';
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal';
import { usePageTitle } from '../hooks/usePageTitle.js';

const BookingConfirmationPage = () => {
  usePageTitle('Booking Confirmation');
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { loading, error, fetchData } = useAuthFetch();
  const [booking, setBooking] = useState(null);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await fetchData(`/api/bookings/${bookingId}`);
        // fetchData returns { data, message, ... } — we only need the payload
        setBooking(data.data);
      } catch (err) {
        // Error handled in useAuthFetch
      }
    };
    fetchBooking();
  }, [bookingId, fetchData]);

  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(booking.bookingId);
    // Optionally show a notification, but for now, just copy
  };

  const handlePayNow = () => {
    setPaymentModalOpened(true);
  };

  const handlePaymentSuccess = (bookingId, paymentData) => {
    // Navigate to payment success page
    // Use amountInRupees from API response (already in rupees)
    // Note: bookingId param contains Mongo _id (used for routing), not human-readable bookingId
    const amountInRupees = paymentData.amountInRupees || booking?.paymentAmount || 0;
    const params = new URLSearchParams({
      bookingId: bookingId, // Mongo _id
      paymentId: paymentData.paymentId || '',
      amount: amountInRupees,
    });
    navigate(`/payment-success?${params.toString()}`);
  };

  const handlePaymentFailure = (error) => {
    // Navigate to payment failure page
    navigate(`/payment-failure?bookingId=${booking._id}&reason=${encodeURIComponent(error.message || 'Payment failed')}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED: return 'blue';
      case BOOKING_STATUS.COMPLETED: return 'green';
      case BOOKING_STATUS.CANCELLED: return 'red';
      case BOOKING_STATUS.NO_SHOW: return 'gray';
      default: return 'gray';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case PAYMENT_STATUS.PENDING: return 'yellow';
      case PAYMENT_STATUS.SUCCESS: return 'green';
      case PAYMENT_STATUS.FAILED: return 'red';
      case PAYMENT_STATUS.REFUNDED: return 'orange';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Group justify="center">
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Error">
          {error}
        </Alert>
        <Group justify="center" mt="md">
          <Button onClick={() => navigate('/bookings')}>Go to Bookings</Button>
        </Group>
      </Container>
    );
  }

  if (!booking) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Booking Not Found">
          The booking could not be found.
        </Alert>
        <Group justify="center" mt="md">
          <Button onClick={() => navigate('/bookings')}>Go to Bookings</Button>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack align="center" spacing="lg">
        {/* Success Header */}
        <Group spacing="sm" role="status" aria-live="polite">
          <IconCheck size={48} color="green" />
          <div>
            <Title order={1} color="green">Booking Confirmed!</Title>
            <Text size="lg">Your appointment has been successfully booked</Text>
          </div>
        </Group>

        {/* Booking Details Card */}
        <Paper shadow="md" p="lg" radius="md" withBorder style={{ width: '100%', maxWidth: 600 }}>
          <Stack spacing="md">
            {/* Booking ID */}
            <Group position="apart">
              <Text weight={500}>Booking ID</Text>
              <Group spacing="xs">
                <Text>{booking.bookingId}</Text>
                <ActionIcon onClick={handleCopyBookingId}>
                  <IconCopy size={16} />
                </ActionIcon>
              </Group>
            </Group>
            <Divider />

            {/* Provider Information */}
            <div>
              <Text weight={500} mb="xs">Provider Information</Text>
              <Group spacing="xs" mb="xs">
                <IconUser size={16} />
                <Text>{booking.providerSnapshot?.name || '-'}</Text>
                <Badge color="blue">{booking.providerSnapshot?.role || '-'}</Badge>
              </Group>
              {booking.providerSnapshot.specialization && (
                <Text size="sm" color="dimmed">Specialization: {booking.providerSnapshot?.specialization}</Text>
              )}
              <Group spacing="xs">
                <IconMapPin size={16} />
                <Text size="sm">{booking.providerSnapshot?.location || '-'}</Text>
              </Group>
            </div>
            <Divider />

            {/* Appointment Details */}
            <div>
              <Text weight={500} mb="xs">Appointment Details</Text>
              <Group spacing="xs" mb="xs">
                <Badge color="teal">{booking.entityType}</Badge>
              </Group>
              <Group spacing="xs" mb="xs">
                <IconCalendar size={16} />
                <Text>{formatDateForDisplay(booking.bookingDate)}</Text>
              </Group>
              <Group spacing="xs">
                <IconClock size={16} />
                <Text>{formatTimeRange(booking.bookingTime.startTime, booking.bookingTime.endTime)}</Text>
              </Group>
            </div>
            <Divider />

            {/* Patient Information */}
            <div>
              <Text weight={500} mb="xs">Patient Information</Text>
              <Group spacing="xs" mb="xs">
                <IconUser size={16} />
                <Text>{booking.patientSnapshot?.name || '-'}</Text>
              </Group>
              <Text size="sm" color="dimmed">Phone: {booking.patientSnapshot?.phone || '-'}</Text>
            </div>
            <Divider />

            {/* Status Information */}
            <div>
              <Text weight={500} mb="xs">Status Information</Text>
              <Group spacing="xs" mb="xs">
                <Text size="sm">Booking Status:</Text>
                <Badge color={getStatusColor(booking.status)}>{booking.status}</Badge>
              </Group>
              <Group spacing="xs" mb="xs">
                <Text size="sm">Payment Status:</Text>
                <Badge color={getPaymentStatusColor(booking.paymentStatus)}>{booking.paymentStatus}</Badge>
                {booking.paymentStatus === PAYMENT_STATUS.PENDING && (
                  <Text size="sm" color="yellow.7">Payment due at appointment</Text>
                )}
                {booking.paymentStatus === PAYMENT_STATUS.REFUNDED && (
                  <Text size="sm" color="orange.7">Refund processed - funds will appear in 5-7 business days</Text>
                )}
                {booking.paymentStatus === PAYMENT_STATUS.SUCCESS && booking.metadata?.refundInitiated && !booking.metadata?.refundFailed && (
                  <Alert color="yellow" mt="xs">
                    <Text size="sm" weight={500}>Refund Initiated</Text>
                    <Text size="xs">Your refund of ₹{booking.metadata.refundAmountInRupees?.toFixed(2) || '0.00'} is being processed. It will be reflected in your account within 5-7 business days.</Text>
                  </Alert>
                )}
                {booking.metadata?.refundFailed && (
                  <Alert color="red" mt="xs" icon={<IconAlertCircle size={16} />}>
                    <Text size="sm" weight={500}>Refund Failed</Text>
                    <Text size="xs">{booking.metadata.refundErrorMessage || 'Refund processing failed. Please contact support for assistance.'}</Text>
                  </Alert>
                )}
              </Group>
              {booking.paymentAmount > 0 && (
                <Text size="sm">Payment Amount: ₹{booking.paymentAmount}</Text>
              )}
            </div>
          </Stack>
        </Paper>

        {/* Action Buttons */}
        <Group spacing="md" style={{ flexDirection: 'column', width: '100%', maxWidth: 400 }}>
          {/* Show Pay Now button if payment is pending/failed and amount > 0 */}
          {(booking.paymentStatus === PAYMENT_STATUS.PENDING || booking.paymentStatus === PAYMENT_STATUS.FAILED) && booking.paymentAmount > 0 && (
            <Button
              fullWidth
              leftIcon={<IconCreditCard size={18} />}
              onClick={handlePayNow}
              color="green"
            >
              Pay Now (₹{booking.paymentAmount.toFixed(2)})
            </Button>
          )}
          <Button fullWidth onClick={() => navigate('/bookings')}>View My Bookings</Button>
          <Button fullWidth variant="outline" onClick={() => navigate('/bookings/new')}>Book Another Appointment</Button>
          <Button 
            fullWidth 
            variant="subtle" 
            disabled={booking.paymentStatus !== PAYMENT_STATUS.SUCCESS}
          >
            Download Receipt
          </Button>
        </Group>
      </Stack>

      {/* Payment Modal */}
      <PaymentCheckoutModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        booking={{
          id: booking._id,
          amount: booking.paymentAmount,
          patient: {
            name: booking.patientSnapshot?.name || '',
            email: booking.patientSnapshot?.email || '',
            phone: booking.patientSnapshot?.phone || '',
          },
        }}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
    </Container>
  );
};

export default BookingConfirmationPage;