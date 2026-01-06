import { Modal, Stack, Text, Button, Alert, Loader } from '@mantine/core';
import { IconAlertCircle, IconCreditCard } from '@tabler/icons-react';
import { useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { initializeRazorpayPayment } from '../utils/razorpay';
import { api } from '../utils/api';

const IS_DEV = import.meta.env.DEV;

/**
 * PaymentCheckoutModal
 * 
 * Modal component for handling Razorpay payment checkout flow.
 * Creates Razorpay order, opens checkout modal, verifies payment on backend.
 * 
 * REQUIRED BOOKING SHAPE:
 * Callers MUST provide booking object with the following structure:
 * {
 *   id: string,              // Booking ID
 *   amount: number,          // Amount in rupees
 *   patient: {               // Patient details for Razorpay prefill
 *     name: string,          // REQUIRED - Patient full name
 *     email: string,         // Optional but recommended
 *     phone: string,         // REQUIRED - Patient contact number
 *   }
 * }
 * 
 * Alternative flat structure (legacy support):
 * {
 *   id: string,
 *   amount: number,
 *   patientName: string,     // Falls back if patient.name missing
 *   patientEmail: string,    // Falls back if patient.email missing
 *   patientPhone: string,    // Falls back if patient.phone missing
 * }
 * 
 * @param {boolean} opened - Modal open state
 * @param {Function} onClose - Close modal callback
 * @param {Object} booking - Booking object containing payment details (REQUIRED when opened=true)
 * @param {string} booking.id - Booking ID
 * @param {number} booking.amount - Total amount in rupees (backend handles paise conversion)
 * @param {Object} booking.patient - Patient details (preferred structure)
 * @param {string} booking.patient.name - Patient name (REQUIRED)
 * @param {string} booking.patient.email - Patient email (optional)
 * @param {string} booking.patient.phone - Patient phone (REQUIRED)
 * @param {string} [booking.patientName] - Fallback patient name if booking.patient missing
 * @param {string} [booking.patientEmail] - Fallback patient email if booking.patient missing
 * @param {string} [booking.patientPhone] - Fallback patient phone if booking.patient missing
 * @param {Function} onSuccess - Success callback (receives booking ID and payment response)
 * @param {Function} onFailure - Failure callback (receives error)
 */
export function PaymentCheckoutModal({ opened, onClose, booking, onSuccess, onFailure }) {
  const focusTrapRef = useFocusTrap(opened);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Defensive guard: ensure booking exists when modal is opened
  // Only validate when the component is actually supposed to display
  if (opened && !booking) {
    console.error('PaymentCheckoutModal: booking prop is required when opened=true');
    return null;
  }

  // Validate amount is a number
  const bookingAmount = typeof booking?.amount === 'number' ? booking.amount : 0;

  // Normalize patient details with defensive fallbacks
  // Supports both booking.patient.name and flat booking.patientName structures
  const patientName = booking?.patient?.name || booking?.patientName || '';
  const patientEmail = booking?.patient?.email || booking?.patientEmail || '';
  const patientPhone = booking?.patient?.phone || booking?.patientPhone || '';

  // Warn if expected structure is not provided
  if (opened && !booking?.patient && IS_DEV) {
    console.warn(
      'PaymentCheckoutModal: booking.patient object not found, falling back to flat fields (patientName, patientEmail, patientPhone). ' +
      'Please update caller to provide booking.patient object for better consistency.'
    );
  }

  /**
   * Handle payment process
   * 
   * 1. Create Razorpay order on backend
   * 2. Open Razorpay checkout modal
   * 3. On payment success, verify payment on backend
   * 4. Call onSuccess callback with booking ID and payment response
   */
  const handlePayment = async () => {
    // Early validation
    if (!booking || !booking.id) {
      const err = new Error('Invalid booking data');
      console.error('PaymentCheckoutModal: missing booking or booking.id');
      setError(err.message);
      onFailure(err);
      return;
    }

    if (typeof bookingAmount !== 'number' || bookingAmount <= 0) {
      const err = new Error('Invalid booking amount');
      console.error('PaymentCheckoutModal: invalid amount', bookingAmount);
      setError(err.message);
      onFailure(err);
      return;
    }

    // Validate patient details required for Razorpay prefill using normalized fields
    if (!patientName || !patientPhone) {
      const err = new Error('Cannot process payment: Patient name and phone are required. Please contact support.');
      console.error('PaymentCheckoutModal: missing required patient fields', {
        hasPatientObject: !!booking.patient,
        patientName,
        patientPhone,
        rawBooking: booking,
      });
      setError(err.message);
      onFailure(err);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Create Razorpay order on backend
      // Send amount in rupees - backend will convert to paise for Razorpay
      const orderResponse = await api.post('/api/payments/create-order', {
        bookingId: booking.id,
        amount: bookingAmount, // Amount in rupees
      });

      const { orderId, amount, currency, keyId } = orderResponse.data;
      
      // Guard: Validate received amount matches expected booking amount
      // Convert paise (from backend) to rupees for comparison
      const receivedAmountInRupees = Math.round(amount / 100);
      const expectedAmountInRupees = Math.round(bookingAmount);
      
      if (receivedAmountInRupees !== expectedAmountInRupees) {
        throw new Error(
          `Payment amount mismatch detected. Expected ₹${expectedAmountInRupees} but received ₹${receivedAmountInRupees}. ` +
          'Please refresh and try again or contact support.'
        );
      }

      // Step 2: Initialize Razorpay checkout
      await initializeRazorpayPayment(
        {
          key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID, // Prefer keyId from API, fallback to env
          amount, // Amount in paise
          currency,
          order_id: orderId,
          name: 'ArogyaFirst',
          description: `Payment for Booking #${booking.id}`,
          prefill: {
            name: patientName,
            email: patientEmail || undefined, // Omit if empty
            contact: patientPhone,
          },
        },
        // Success handler
        async (response) => {
          try {
            // Step 3: Verify payment on backend
            const verifyResponse = await api.post('/api/payments/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            setLoading(false);
            onClose();
            onSuccess(booking.id, verifyResponse.data);
          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            setError(verifyError.response?.data?.message || verifyError.message || 'Payment verification failed. Please contact support.');
            setLoading(false);
            onFailure(verifyError);
          }
        },
        // Failure handler
        (failureError) => {
          console.error('Payment failed:', failureError);
          setError(failureError.message || 'Payment failed. Please try again.');
          setLoading(false);
          onFailure(failureError);
        }
      );

    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
      onFailure(err);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Complete Payment"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      withCloseButton={!loading}
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      aria-describedby="payment-modal-description"
    >
      <Stack spacing="md">
        {/* Payment Details */}
        <div>
          <Text size="sm" color="dimmed">
            Booking ID
          </Text>
          <Text weight={500}>#{booking.id}</Text>
        </div>

        <div>
          <Text size="sm" color="dimmed">
            Amount to Pay
          </Text>
          <Text size="xl" weight={700}>
            ₹{Number.isFinite(bookingAmount) ? bookingAmount.toFixed(2) : '0.00'}
          </Text>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} title="Payment Error" color="red">
            {error}
          </Alert>
        )}

        {/* Payment Button */}
        <Button
          leftIcon={loading ? <Loader size="xs" color="white" /> : <IconCreditCard size={18} />}
          onClick={handlePayment}
          loading={loading}
          fullWidth
          size="lg"
          aria-label={loading ? 'Processing payment, please wait' : 'Proceed to payment'}
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </Button>

        {/* Security Notice */}
        <Text size="xs" color="dimmed" align="center">
          Secure payment powered by Razorpay
        </Text>
      </Stack>
    </Modal>
  );
};
