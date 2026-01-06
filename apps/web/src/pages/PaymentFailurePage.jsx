import { Container, Stack, Title, Text, Button, ThemeIcon, Paper, Alert } from '@mantine/core';
import { IconCircleX, IconAlertCircle } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * PaymentFailurePage
 * 
 * Displays payment failure notification with retry option.
 * Redirected here after failed payment or verification.
 * 
 * URL Parameters:
 * - bookingId: The booking Mongo _id (required, used for routing)
 * - reason: Failure reason message (optional)
 * 
 * Note: bookingId param contains Mongo _id for routing; displays it as Reference ID
 */
export const PaymentFailurePage = () => {
  usePageTitle('Payment Failed');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bookingId = searchParams.get('bookingId');
  const reason = searchParams.get('reason');

  useEffect(() => {
    // Redirect to bookings if no booking ID
    if (!bookingId) {
      navigate('/bookings', { replace: true });
    }
  }, [bookingId, navigate]);

  const handleRetryPayment = () => {
    // Navigate to booking confirmation page where payment can be retried
    navigate(`/bookings/${bookingId}/confirmation`);
  };

  const handleViewAllBookings = () => {
    navigate('/bookings');
  };

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" shadow="sm" withBorder>
        <Stack align="center" spacing="lg">
          {/* Failure Icon */}
          <ThemeIcon color="red" size={80} radius="xl">
            <IconCircleX size={50} />
          </ThemeIcon>

          {/* Failure Message */}
          <Stack align="center" spacing="xs" role="alert" aria-live="assertive">
            <Title order={2}>Payment Failed</Title>
            <Text color="dimmed" align="center">
              We couldn't process your payment. Please try again.
            </Text>
          </Stack>

          {/* Failure Reason */}
          {reason && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" w="100%">
              {reason}
            </Alert>
          )}

          {/* Booking Details */}
          {bookingId && (
            <Paper p="md" withBorder radius="md" bg="gray.0" w="100%">
              <Stack spacing="xs">
                <div>
                  <Text size="xs" color="dimmed">
                    Reference ID
                  </Text>
                  <Text weight={500}>#{bookingId}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">
                    Payment Status
                  </Text>
                  <Text weight={500} color="red">
                    Failed
                  </Text>
                </div>
              </Stack>
            </Paper>
          )}

          {/* Action Buttons */}
          <Stack w="100%" spacing="sm">
            <Button fullWidth onClick={handleRetryPayment} color="blue">
              Retry Payment
            </Button>
            <Button variant="light" fullWidth onClick={handleViewAllBookings}>
              View All Bookings
            </Button>
          </Stack>

          {/* Help Notice */}
          <Text size="xs" color="dimmed" align="center">
            If the problem persists, please contact our support team for assistance.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};
