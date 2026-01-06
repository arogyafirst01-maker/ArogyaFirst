import { Container, Stack, Title, Text, Button, ThemeIcon, Paper, Loader, Alert } from '@mantine/core';
import { IconCircleCheck, IconAlertCircle } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import useAuthFetch from '../hooks/useAuthFetch';
import { PAYMENT_STATUS } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * PaymentSuccessPage
 * 
 * Displays payment success confirmation with booking details.
 * Redirected here after successful payment verification.
 * Fetches actual booking data from server to validate payment status.
 * 
 * URL Parameters:
 * - bookingId: The booking Mongo _id (required, used for API calls and routing)
 * - paymentId: Razorpay payment ID (optional, for display)
 * - amount: Payment amount (optional, for display)
 * 
 * Note: URL param 'bookingId' contains the Mongo _id, while booking.bookingId is the human-readable ID shown to users
 */
export const PaymentSuccessPage = () => {
  usePageTitle('Payment Successful');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, fetchData } = useAuthFetch();
  const [booking, setBooking] = useState(null);

  // Distinguish between Mongo _id (used in URLs/API) and human-readable bookingId (shown to users)
  const bookingObjectId = searchParams.get('bookingId'); // Actually the Mongo _id
  const paymentId = searchParams.get('paymentId');
  const amountParam = searchParams.get('amount');

  // Determine display amount with proper fallback priority:
  // 1. Server-verified booking.paymentAmount (most authoritative)
  // 2. Query param amount (from verify response amountInRupees)
  const displayAmount = booking?.paymentAmount || parseFloat(amountParam) || 0;

  useEffect(() => {
    // Redirect to bookings if no booking object ID
    if (!bookingObjectId) {
      navigate('/bookings', { replace: true });
      return;
    }

    // Fetch booking data from server to validate payment status
    const fetchBooking = async () => {
      try {
        const response = await fetchData(`/api/bookings/${bookingObjectId}`);
        if (response && response.data) {
          setBooking(response.data);
          
          // If payment status is not SUCCESS, redirect to confirmation page
          if (response.data.paymentStatus !== PAYMENT_STATUS.SUCCESS) {
            console.warn('Payment status is not SUCCESS, redirecting to confirmation');
            navigate(`/bookings/${bookingObjectId}/confirmation`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        // On error, redirect to confirmation page
        navigate(`/bookings/${bookingObjectId}/confirmation`, { replace: true });
      }
    };

    fetchBooking();
  }, [bookingObjectId, navigate, fetchData]);

  const handleViewBooking = () => {
    navigate(`/bookings/${bookingObjectId}/confirmation`);
  };

  const handleViewAllBookings = () => {
    navigate('/bookings');
  };

  // Show loader while fetching
  if (loading || !booking) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" shadow="sm" withBorder>
          <Stack align="center" spacing="lg">
            <Loader size="lg" />
            <Text color="dimmed">Verifying payment status...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Show error if fetch failed
  if (error) {
    return (
      <Container size="sm" py="xl">
        <Paper p="xl" radius="md" shadow="sm" withBorder>
          <Stack align="center" spacing="lg">
            <ThemeIcon color="red" size={80} radius="xl">
              <IconAlertCircle size={50} />
            </ThemeIcon>
            <Title order={2}>Error Loading Payment Details</Title>
            <Text color="dimmed" align="center">
              {error}
            </Text>
            <Button onClick={handleViewBooking}>View Booking Details</Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" shadow="sm" withBorder>
        <Stack align="center" spacing="lg">
          {/* Success Icon */}
          <ThemeIcon color="green" size={80} radius="xl">
            <IconCircleCheck size={50} />
          </ThemeIcon>

          {/* Success Message */}
          <Stack align="center" spacing="xs" role="status" aria-live="polite">
            <Title order={2}>Payment Successful!</Title>
            <Text color="dimmed" align="center">
              Your payment has been processed successfully.
            </Text>
          </Stack>

          {/* Payment Details - Use server data for security */}
          <Stack spacing="xs" w="100%">
            <Paper p="md" withBorder radius="md" bg="gray.0">
              <Stack spacing="xs">
                <div>
                  <Text size="xs" color="dimmed">
                    Booking ID
                  </Text>
                  <Text weight={500}>#{booking.bookingId}</Text>
                </div>

                {(booking.paymentId || paymentId) && (
                  <div>
                    <Text size="xs" color="dimmed">
                      Payment ID
                    </Text>
                    <Text size="sm" weight={500}>
                      {booking.paymentId || paymentId}
                    </Text>
                  </div>
                )}

                <div>
                  <Text size="xs" color="dimmed">
                    Amount Paid
                  </Text>
                  <Text size="lg" weight={700} color="green">
                    ₹{displayAmount.toFixed(2)}
                  </Text>
                </div>

                <div>
                  <Text size="xs" color="dimmed">
                    Payment Status
                  </Text>
                  <Text size="sm" weight={500} color="green">
                    {booking.paymentStatus}
                  </Text>
                </div>
              </Stack>
            </Paper>
          </Stack>

          {/* Action Buttons */}
          <Stack w="100%" spacing="sm">
            <Button fullWidth onClick={handleViewBooking}>
              View Booking Details
            </Button>
            <Button variant="light" fullWidth onClick={handleViewAllBookings}>
              View All Bookings
            </Button>
          </Stack>

          {/* Confirmation Notice */}
          <Text size="xs" color="dimmed" align="center">
            A confirmation email has been sent to your registered email address.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};
