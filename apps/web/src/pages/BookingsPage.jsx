import { useState, useEffect } from 'react';
import ManualBookingForm from './ManualBookingForm.jsx';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Table,
  Badge,
  ActionIcon,
  Loader,
  Alert,
  Tabs,
  Select,
  Modal,
  Textarea,
} from '@mantine/core';
import { IconPlus, IconX, IconCalendar, IconMapPin, IconCreditCard, IconCalendarEvent } from '@tabler/icons-react';
import { DatePickerInput } from '@mantine/dates';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import useRole from '../hooks/useRole.js';
import { usePageTitle } from '../hooks/usePageTitle';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPES, ROLES } from '@arogyafirst/shared';
import { formatDateForDisplay, formatTimeRange } from '@arogyafirst/shared';
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal';
import { SkeletonTable, SkeletonCard } from '../components/SkeletonLoader';
import { AccessibleButton } from '../components/AccessibleButton';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { getAriaLabel } from '../utils/accessibility';


export default function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, error, fetchData } = useAuthFetch();
  const { isPatient, hasRole } = useRole();
  
  const isProvider = hasRole([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]);
  const title = isPatient ? 'My Bookings' : 'Bookings';
  
  usePageTitle(title);

  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [filterEntityType, setFilterEntityType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState(''); // Provider status filter
  const [startDate, setStartDate] = useState(null); // Provider date range start
  const [endDate, setEndDate] = useState(null); // Provider date range end
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [manualBookingModalOpen, setManualBookingModalOpen] = useState(false);
  const [bookingDetailsModalOpen, setBookingDetailsModalOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [availableSlotsForReschedule, setAvailableSlotsForReschedule] = useState([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [selectedNewTimeSlot, setSelectedNewTimeSlot] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [paymentAdjustmentNeeded, setPaymentAdjustmentNeeded] = useState(null);
  
  const cancelModalRef = useFocusTrap(cancelModalOpen);
  const manualBookingModalRef = useFocusTrap(manualBookingModalOpen);
  const bookingDetailsModalRef = useFocusTrap(bookingDetailsModalOpen);
  const rescheduleModalRef = useFocusTrap(rescheduleModalOpen);

  // Normalize date to start of day
  const normalizeToStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Provider tabs configuration
  const providerTabs = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
  ];

  // Load available slots for manual booking
  const loadAvailableSlots = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // For hospitals, don't filter by providerId to get all doctors' slots
      // For doctors/labs, filter by their own ID
      if (user.role !== 'Hospital') {
        queryParams.append('providerId', user._id);
      }
      
      queryParams.append('isActive', 'true');
      queryParams.append('availableOnly', 'true'); // Changed from isBookable to availableOnly
      
      // Add date filter to show only future slots
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      queryParams.append('startDate', today.toISOString());
      
      const res = await fetchData(`/api/slots?${queryParams.toString()}`);
      setAvailableSlots(res.data?.slots || []);
    } catch (err) {
      console.error('Failed to load available slots:', err);
      setAvailableSlots([]);
    }
  };

  const handleOpenManualBookingModal = () => {
    setManualBookingModalOpen(true);
    loadAvailableSlots();
  };

  const handleOpenBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setBookingDetailsModalOpen(true);
  };

  const handleUpdateStatus = async (bookingId, newStatus, note) => {
    setStatusUpdateLoading(true);
    try {
      await fetchData(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note }),
      });
      showSuccessNotification('Booking status updated');
      setBookingDetailsModalOpen(false);
      await fetchBookings();
    } catch (err) {
      showErrorNotification('Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handlePayNow = (booking) => {
    setSelectedPaymentBooking(booking);
    setPaymentModalOpened(true);
  };

  const handlePaymentSuccess = (bookingObjectId, paymentData) => {
    // Capture booking before clearing state to avoid using null reference
    const booking = selectedPaymentBooking;
    setPaymentModalOpened(false);
    setSelectedPaymentBooking(null);
    // Navigate to payment success page
    // Use amountInRupees from API response (already in rupees)
    // Note: bookingObjectId is the Mongo _id (used for routing/API), not human-readable booking.bookingId
    const amountInRupees = paymentData.amountInRupees || booking?.paymentAmount || 0;
    const params = new URLSearchParams({
      bookingId: bookingObjectId, // URL param key stays 'bookingId' for backward compatibility, but value is Mongo _id
      paymentId: paymentData.paymentId || '',
      amount: amountInRupees,
    });
    navigate(`/payment-success?${params.toString()}`);
  };

  const handlePaymentFailure = (error) => {
    setPaymentModalOpened(false);
    const bookingId = selectedPaymentBooking?._id;
    setSelectedPaymentBooking(null);
    // Navigate to payment failure page
    if (bookingId) {
      navigate(`/payment-failure?bookingId=${bookingId}&reason=${encodeURIComponent(error.message || 'Payment failed')}`);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, filterEntityType, filterStatus, startDate, endDate]);

  const fetchBookings = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterEntityType !== 'ALL') {
        queryParams.append('entityType', filterEntityType);
      }
      
      // Add provider-specific filters
      if (isProvider) {
        if (filterStatus) {
          queryParams.append('status', filterStatus);
        }
        if (startDate) {
          queryParams.append('startDate', startDate.toISOString());
        }
        if (endDate) {
          queryParams.append('endDate', endDate.toISOString());
        }
      }
      
      let url;
      if (isProvider) {
        url = `/api/bookings/provider/${user._id}?${queryParams.toString()}`;
      } else if (isPatient) {
        url = `/api/bookings/patient/${user._id}?${queryParams.toString()}`;
      } else {
        url = `/api/bookings/patient/${user._id}?${queryParams.toString()}`;
      }
      const data = await fetchData(url);
      setBookings(data.data || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (!selectedBooking) return;

    setCancelLoading(true);
    try {
      await fetchData(`/api/bookings/${selectedBooking._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason }),
      });
      showSuccessNotification('Booking cancelled successfully');
      setCancelModalOpen(false);
      setSelectedBooking(null);
      setCancellationReason('');
      fetchBookings(); // Refresh the list
    } catch (err) {
      showErrorNotification('Failed to cancel booking: ' + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  const filterBookingsByTab = (bookings, tab) => {
    const today = normalizeToStartOfDay(new Date());
    switch (tab) {
      case 'upcoming':
        return bookings.filter(
          (b) => b.status === BOOKING_STATUS.CONFIRMED && normalizeToStartOfDay(b.bookingDate) >= today
        );
      case 'past':
        return bookings.filter((b) => normalizeToStartOfDay(b.bookingDate) < today);
      case 'cancelled':
        return bookings.filter((b) => b.status === BOOKING_STATUS.CANCELLED);
      default:
        return bookings;
    }
  };

  const filterBookingsByProviderTab = (bookings, tab) => {
    const today = normalizeToStartOfDay(new Date());
    switch (tab) {
      case 'today':
        return bookings.filter((b) => normalizeToStartOfDay(b.bookingDate).getTime() === today.getTime());
      case 'upcoming':
        return bookings.filter((b) => normalizeToStartOfDay(b.bookingDate) > today);
      case 'past':
        return bookings.filter((b) => normalizeToStartOfDay(b.bookingDate) < today);
      default:
        return bookings;
    }
  };

  const filterBookingsByEntityType = (bookings, entityType) => {
    if (entityType === 'ALL') return bookings;
    return bookings.filter((b) => b.entityType === entityType);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case BOOKING_STATUS.CONFIRMED:
        return 'blue';
      case BOOKING_STATUS.COMPLETED:
        return 'green';
      case BOOKING_STATUS.CANCELLED:
        return 'red';
      case BOOKING_STATUS.NO_SHOW:
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case PAYMENT_STATUS.PENDING:
        return 'yellow';
      case PAYMENT_STATUS.SUCCESS:
        return 'green';
      case PAYMENT_STATUS.FAILED:
        return 'red';
      case PAYMENT_STATUS.REFUNDED:
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'ONLINE': return 'blue';
      case 'CASH': return 'green';
      case 'MANUAL': return 'yellow';
      default: return 'gray';
    }
  };

  const isCancellable = (booking) => {
    const today = normalizeToStartOfDay(new Date());
    const bookingDay = normalizeToStartOfDay(booking.bookingDate);
    return booking.status === BOOKING_STATUS.CONFIRMED && bookingDay >= today;
  };

  const isReschedulable = (booking) => {
    const today = normalizeToStartOfDay(new Date());
    const bookingDay = normalizeToStartOfDay(booking.bookingDate);
    return booking.status === BOOKING_STATUS.CONFIRMED && bookingDay >= today;
  };

  const handleOpenRescheduleModal = async (booking) => {
    setRescheduleBooking(booking);
    setRescheduleReason('');
    setSelectedNewSlot(null);
    setSelectedNewTimeSlot(null);
    setPaymentAdjustmentNeeded(null);
    setRescheduleModalOpen(true);
    await loadAvailableSlotsForReschedule(booking);
  };

  const loadAvailableSlotsForReschedule = async (booking) => {
    try {
      const queryParams = new URLSearchParams();
      const providerId = booking.providerId?._id || booking.providerId;
      queryParams.append('providerId', providerId);
      queryParams.append('entityType', booking.entityType);
      queryParams.append('isActive', 'true');
      queryParams.append('availableOnly', 'true');
      const today = new Date();
      queryParams.append('startDate', today.toISOString());
      const res = await fetchData(`/api/slots?${queryParams.toString()}`);
      // Filter out the current slot - response is wrapped in { slots }
      const slots = res.data?.slots || [];
      const filtered = slots.filter(slot => slot._id !== booking.slotId);
      setAvailableSlotsForReschedule(filtered);
    } catch (err) {
      console.error('Failed to load available slots for reschedule:', err);
      setAvailableSlotsForReschedule([]);
      showErrorNotification('Failed to load available slots');
    }
  };

  const handleSlotSelection = (slot, timeSlot = null) => {
    setSelectedNewSlot(slot);
    setSelectedNewTimeSlot(timeSlot);
    
    // Calculate payment adjustment
    const oldAmount = rescheduleBooking?.paymentAmount || 0;
    const newAmount = slot.metadata?.fee || slot.metadata?.price || 0;
    const difference = newAmount - oldAmount;
    
    if (difference > 0) {
      setPaymentAdjustmentNeeded({ type: 'additional', amount: difference });
    } else if (difference < 0) {
      setPaymentAdjustmentNeeded({ type: 'refund', amount: Math.abs(difference) });
    } else {
      setPaymentAdjustmentNeeded(null);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleBooking || !selectedNewSlot) {
      showErrorNotification('Please select a new slot');
      return;
    }

    setRescheduleLoading(true);
    try {
      const payload = {
        newSlotId: selectedNewSlot._id,
        rescheduleReason: rescheduleReason || undefined,
      };
      
      if (selectedNewTimeSlot) {
        payload.newTimeSlot = selectedNewTimeSlot;
      }

      // fetchData returns { success, message, data } where data is the controller payload
      const response = await fetchData(`/api/bookings/${rescheduleBooking._id}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Extract payload from response.data (successResponse wraps controller data in data field)
      const { booking, paymentAdjustment, partialRefund, partialRefundError } = response.data || {};

      // Refresh bookings list immediately so UI reflects new slot/time
      await fetchBookings();

      // Check if additional payment is needed
      if (paymentAdjustment?.type === 'additional' && paymentAdjustment.amount > 0) {
        // Close reschedule modal and open payment modal
        setRescheduleModalOpen(false);
        setRescheduleBooking(null);
        setSelectedPaymentBooking(booking);
        setPaymentModalOpened(true);
        showSuccessNotification('Appointment rescheduled. Please complete the additional payment.');
      } else {
        // Show refund info if partial refund was processed
        if (partialRefund?.initiated) {
          showSuccessNotification(`Appointment rescheduled successfully. Refund of ₹${partialRefund.amount} initiated.`);
        } else if (partialRefundError) {
          showSuccessNotification('Appointment rescheduled. ' + partialRefundError);
        } else {
          showSuccessNotification('Appointment rescheduled successfully');
        }
        setRescheduleModalOpen(false);
        setRescheduleBooking(null);
      }
    } catch (err) {
      showErrorNotification('Failed to reschedule appointment: ' + (err.message || 'Unknown error'));
    } finally {
      setRescheduleLoading(false);
    }
  };

  const isToday = (date) => {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  // Helper: check if provider owns booking (handles both string and populated object)
  const canUpdateStatus = (booking) => {
    if (!user?._id || !booking?.providerId) return false;
    if (typeof booking.providerId === 'object' && booking.providerId._id) {
      return String(booking.providerId._id) === String(user._id);
    }
    return String(booking.providerId) === String(user._id);
  };

  // Helper functions for status action availability
  const canMarkComplete = (booking) => {
    return booking.status === BOOKING_STATUS.CONFIRMED && isToday(booking.bookingDate);
  };

  const canMarkNoShow = (booking) => {
    const bookingDate = new Date(booking.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    bookingDate.setHours(0, 0, 0, 0);
    return booking.status === BOOKING_STATUS.CONFIRMED && bookingDate <= today;
  };

  const canCancelBooking = (booking) => {
    return booking.status === BOOKING_STATUS.CONFIRMED;
  };

  // Use provider tab filtering for providers
  const filteredBookings = isProvider
    ? filterBookingsByEntityType(filterBookingsByProviderTab(bookings, activeTab), filterEntityType)
    : filterBookingsByEntityType(filterBookingsByTab(bookings, activeTab), filterEntityType);

  const rows = filteredBookings.map((booking) => (
    <Table.Tr key={booking._id}>
      <Table.Td>
        {isProvider ? (
          <Button size="xs" variant="subtle" onClick={() => handleOpenBookingDetails(booking)}>
            {booking.bookingId}
          </Button>
        ) : (
          <Link
            to={`/bookings/${booking._id}/confirmation`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {booking.bookingId}
          </Link>
        )}
      </Table.Td>
      {isProvider ? (
        <Table.Td>
          <>
            <Text size="sm">{booking.patientSnapshot?.name || 'Walk-in'}</Text>
            <Text size="xs" c="dimmed">{booking.patientSnapshot?.phone}</Text>
          </>
        </Table.Td>
      ) : (
        <Table.Td>
          <Group gap="xs">
            <Text size="sm">{booking.providerSnapshot.name}</Text>
            <Badge size="xs" variant="light">
              {booking.providerSnapshot.role}
            </Badge>
          </Group>
        </Table.Td>
      )}
      <Table.Td>
        <Badge color="blue" variant="light">
          {booking.entityType}
        </Badge>
      </Table.Td>
      <Table.Td>{formatDateForDisplay(booking.bookingDate)}</Table.Td>
      <Table.Td>{formatTimeRange(booking.bookingTime.startTime, booking.bookingTime.endTime)}</Table.Td>
      <Table.Td>
        <Badge color={getStatusColor(booking.status)} variant="light">
          {booking.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group>
          <Badge color={getPaymentStatusColor(booking.paymentStatus)} variant="light">
            {booking.paymentStatus}
          </Badge>
          <Badge color={getPaymentMethodColor(booking.paymentMethod)} variant="light">
            {booking.paymentMethod}
          </Badge>
          {/* Show refund status indicator */}
          {booking.paymentStatus === PAYMENT_STATUS.SUCCESS && booking.metadata?.refundInitiated && !booking.metadata?.refundFailed && (
            <Badge color="yellow" variant="filled" size="xs">Refund Initiated</Badge>
          )}
          {booking.paymentStatus === PAYMENT_STATUS.REFUNDED && (
            <Badge color="orange" variant="filled" size="xs">Refunded</Badge>
          )}
          {booking.metadata?.refundFailed && (
            <Badge color="red" variant="filled" size="xs">Refund Failed - Contact Support</Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        {isProvider ? (
          <Group gap="xs">
            <Button size="xs" onClick={() => handleOpenBookingDetails(booking)}>
              View Details
            </Button>
            {canUpdateStatus(booking) && canMarkComplete(booking) && (
              <Button size="xs" variant="light" loading={statusUpdateLoading} onClick={() => handleUpdateStatus(booking._id, BOOKING_STATUS.COMPLETED)}>
                Complete
              </Button>
            )}
            {canUpdateStatus(booking) && canMarkNoShow(booking) && (
              <Button size="xs" variant="light" onClick={() => handleUpdateStatus(booking._id, BOOKING_STATUS.NO_SHOW, 'Patient did not arrive')}>
                No-show
              </Button>
            )}
            {canUpdateStatus(booking) && canCancelBooking(booking) && (
              <Button size="xs" variant="light" color="red" onClick={() => handleUpdateStatus(booking._id, BOOKING_STATUS.CANCELLED, prompt('Reason for cancellation?'))}>
                Cancel
              </Button>
            )}
          </Group>
        ) : (
          <Group gap="xs">
            {(booking.paymentStatus === PAYMENT_STATUS.PENDING || booking.paymentStatus === PAYMENT_STATUS.FAILED) && booking.paymentAmount > 0 && (
              <Button
                size="xs"
                leftSection={<IconCreditCard size={14} />}
                onClick={() => handlePayNow(booking)}
                color="green"
              >
                Pay Now
              </Button>
            )}
            {isReschedulable(booking) && (
              <Button
                size="xs"
                leftSection={<IconCalendarEvent size={14} />}
                onClick={() => handleOpenRescheduleModal(booking)}
                color="blue"
                variant="light"
              >
                Reschedule
              </Button>
            )}
            {isCancellable(booking) && (
              <ActionIcon
                color="red"
                variant="light"
                onClick={() => handleCancelBooking(booking)}
                loading={cancelLoading && selectedBooking?._id === booking._id}
              >
                <IconX size={16} />
              </ActionIcon>
            )}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header Section */}
        <Group justify="space-between" align="center">
          <Title order={2}>{title}</Title>
          <Group>
            {isPatient && (
              <AccessibleButton 
                leftSection={<IconPlus size={16} />} 
                onClick={() => navigate('/bookings/new')}
                aria-label={getAriaLabel('booking', 'create')}
              >
                Book New Appointment
              </AccessibleButton>
            )}
            {isProvider && (
              <AccessibleButton 
                leftSection={<IconPlus size={16} />} 
                onClick={handleOpenManualBookingModal}
                aria-label="Create manual booking for walk-in patient"
              >
                Manual Booking
              </AccessibleButton>
            )}
            <Select
              placeholder="Filter by type"
              data={[
                { value: 'ALL', label: 'All Types' },
                { value: BOOKING_TYPES.OPD, label: 'OPD' },
                { value: BOOKING_TYPES.IPD, label: 'IPD' },
                { value: BOOKING_TYPES.LAB, label: 'Lab' },
              ]}
              value={filterEntityType}
              onChange={setFilterEntityType}
              style={{ width: 150 }}
            />
            {isProvider && (
              <>
                <Select
                  placeholder="Filter by status"
                  clearable
                  data={[
                    { value: BOOKING_STATUS.CONFIRMED, label: 'Confirmed' },
                    { value: BOOKING_STATUS.COMPLETED, label: 'Completed' },
                    { value: BOOKING_STATUS.CANCELLED, label: 'Cancelled' },
                    { value: BOOKING_STATUS.NO_SHOW, label: 'No Show' },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  style={{ width: 150 }}
                />
                <DatePickerInput
                  placeholder="Start date"
                  clearable
                  value={startDate}
                  onChange={setStartDate}
                  style={{ width: 150 }}
                />
                <DatePickerInput
                  placeholder="End date"
                  clearable
                  value={endDate}
                  onChange={setEndDate}
                  style={{ width: 150 }}
                />
              </>
            )}
          </Group>
        </Group>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} aria-label="Filter bookings by status or time period">
          <Tabs.List>
            {(isProvider ? providerTabs : [
              { value: 'all', label: 'All Bookings' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
              { value: 'cancelled', label: 'Cancelled' },
            ]).map(tab => (
              <Tabs.Tab key={tab.value} value={tab.value}>{tab.label}</Tabs.Tab>
            ))}
          </Tabs.List>

          <Tabs.Panel value={activeTab} pt="md">
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {loading ? 'Loading bookings' : `${filteredBookings.length} bookings found`}
            </div>
            {loading ? (
              <SkeletonTable rows={5} columns={8} />
            ) : error ? (
              <Alert color="red" title="Error">
                Failed to load bookings: {error}
              </Alert>
            ) : filteredBookings.length === 0 ? (
              <Stack align="center" py="xl" gap="md">
                <Text size="lg" c="dimmed">
                  No bookings found
                </Text>
                {isPatient && (
                  <AccessibleButton 
                    leftSection={<IconPlus size={16} />} 
                    onClick={() => navigate('/bookings/new')}
                    aria-label={getAriaLabel('booking', 'create')}
                  >
                    Book Your First Appointment
                  </AccessibleButton>
                )}
              </Stack>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div role="region" aria-label="Bookings list">
                  <Table.ScrollContainer minWidth={800}>
                    <Table striped highlightOnHover aria-label="Bookings table">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Booking ID</Table.Th>
                        <Table.Th>Provider</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Time</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Payment</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                      <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                </div>
              </motion.div>
            )}
          </Tabs.Panel>
        </Tabs>

        {/* Cancellation Modal */}
        <Modal
          opened={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Booking"
          size="md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          aria-describedby="cancel-modal-description"
        >
          <div ref={cancelModalRef}>
            <Stack gap="md">
              {selectedBooking && (
                <>
                  <Text id="cancel-modal-description">
                  Are you sure you want to cancel this booking?
                </Text>
                <Group gap="xs">
                  <IconCalendar size={16} />
                  <Text size="sm">
                    {formatDateForDisplay(selectedBooking.bookingDate)} at{' '}
                    {formatTimeRange(
                      selectedBooking.bookingTime.startTime,
                      selectedBooking.bookingTime.endTime
                    )}
                  </Text>
                </Group>
                <Group gap="xs">
                  <IconMapPin size={16} />
                  <Text size="sm">
                    {selectedBooking.providerSnapshot.name} ({selectedBooking.providerSnapshot.role})
                  </Text>
                </Group>
                <Textarea
                  label="Cancellation Reason (Optional)"
                  placeholder="Please provide a reason for cancellation..."
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.currentTarget.value)}
                  minRows={3}
                />
              </>
            )}
            <Group justify="flex-end" gap="sm">
              <Button variant="light" onClick={() => setCancelModalOpen(false)}>
                Keep Booking
              </Button>
              <Button
                color="red"
                onClick={confirmCancellation}
                loading={cancelLoading}
              >
                Cancel Booking
              </Button>
            </Group>
          </Stack>
          </div>
        </Modal>


        {/* ManualBookingModal */}
        <Modal
          opened={manualBookingModalOpen}
          onClose={() => setManualBookingModalOpen(false)}
          title="Create Manual Booking"
          size="lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-booking-modal-title"
        >
          <div ref={manualBookingModalRef}>
            <Stack gap="md">
              <ManualBookingForm
                user={user}
                availableSlots={availableSlots}
                fetchBookings={fetchBookings}
                setManualBookingModalOpen={setManualBookingModalOpen}
                fetchData={fetchData}
              />
            </Stack>
          </div>
        </Modal>


        {/* BookingDetailsModal */}
        <Modal
          opened={bookingDetailsModalOpen}
          onClose={() => setBookingDetailsModalOpen(false)}
          title={selectedBooking ? `Booking #${selectedBooking.bookingId}` : 'Booking Details'}
          size="lg"
          fullScreen
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-details-modal-title"
        >
          <div ref={bookingDetailsModalRef}>
          {selectedBooking ? (
            <Stack gap="md" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Group justify="space-between">
                <Text fw={700} size="lg">Booking #{selectedBooking.bookingId}</Text>
                <Badge color={getStatusColor(selectedBooking.status)}>{selectedBooking.status}</Badge>
              </Group>
              <Group gap="md">
                <Stack>
                  <Text fw={600}>Patient</Text>
                  <Text>{selectedBooking.patientSnapshot?.name || '-'}</Text>
                  <Text size="sm">{selectedBooking.patientSnapshot?.phone || '-'}</Text>
                  <Text size="sm">{selectedBooking.patientSnapshot?.email || '-'}</Text>
                </Stack>
                <Stack>
                  <Text fw={600}>Provider</Text>
                  <Text>{selectedBooking.providerSnapshot?.name || '-'}</Text>
                  <Text size="sm">{selectedBooking.providerSnapshot?.role || '-'}</Text>
                  <Text size="sm">{selectedBooking.providerSnapshot?.location || '-'}</Text>
                </Stack>
              </Group>
              <Group gap="md">
                <Stack>
                  <Text fw={600}>Appointment</Text>
                  <Badge color="gray">{selectedBooking.entityType}</Badge>
                  <Text>{formatDateForDisplay(selectedBooking.bookingDate)}</Text>
                  <Text>{formatTimeRange(selectedBooking.bookingTime?.startTime, selectedBooking.bookingTime?.endTime)}</Text>
                </Stack>
                <Stack>
                  <Text fw={600}>Payment</Text>
                  <Badge color={getPaymentStatusColor(selectedBooking.paymentStatus)}>{selectedBooking.paymentStatus}</Badge>
                  <Badge color="gray">{selectedBooking.paymentMethod}</Badge>
                  <Text>Amount: ₹{selectedBooking.paymentAmount}</Text>
                </Stack>
              </Group>
              {selectedBooking.metadata && typeof selectedBooking.metadata === 'object' && (
                <Stack>
                  <Text fw={600}>Metadata</Text>
                  {selectedBooking.metadata.symptoms && (
                    <Text>Symptoms: {selectedBooking.metadata.symptoms}</Text>
                  )}
                  {/* Render other known fields here if needed */}
                  <Text size="sm" c="dimmed">
                    {JSON.stringify(selectedBooking.metadata, null, 2)}
                  </Text>
                </Stack>
              )}
              {/* Status Actions for provider */}
              {isProvider && canUpdateStatus(selectedBooking) && selectedBooking.status === BOOKING_STATUS.CONFIRMED && (
                <Stack gap="md">
                  <Text fw={600}>Status Actions</Text>
                  <Group gap="md">
                    {canMarkComplete(selectedBooking) && (
                      <AccessibleButton
                        color="green"
                        loading={statusUpdateLoading}
                        onClick={() => handleUpdateStatus(selectedBooking._id, BOOKING_STATUS.COMPLETED)}
                        aria-label="Mark booking as completed"
                      >
                        Mark Complete
                      </AccessibleButton>
                    )}
                    {canMarkNoShow(selectedBooking) && (
                      <AccessibleButton
                        color="gray"
                        loading={statusUpdateLoading}
                        onClick={() => handleUpdateStatus(selectedBooking._id, BOOKING_STATUS.NO_SHOW)}
                        aria-label="Mark booking as no-show"
                      >
                        Mark No-show
                      </AccessibleButton>
                    )}
                    {canCancelBooking(selectedBooking) && (
                      <AccessibleButton
                        color="red"
                        loading={statusUpdateLoading}
                        onClick={() => handleUpdateStatus(selectedBooking._id, BOOKING_STATUS.CANCELLED, cancellationReason)}
                        aria-label={getAriaLabel('booking', 'cancel')}
                      >
                        Cancel
                      </AccessibleButton>
                    )}
                  </Group>
                  <Textarea
                    label="Cancellation Note (Optional)"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.currentTarget.value)}
                  />
                </Stack>
              )}
            </Stack>
          ) : (
            <SkeletonCard count={1} />
          )}
          </div>
        </Modal>

        {/* Payment Modal */}
        {selectedPaymentBooking && (
          <PaymentCheckoutModal
            opened={paymentModalOpened}
            onClose={() => {
              setPaymentModalOpened(false);
              setSelectedPaymentBooking(null);
            }}
            booking={{
              id: selectedPaymentBooking._id,
              amount: selectedPaymentBooking.paymentAmount,
              patient: {
                name: selectedPaymentBooking.patientSnapshot?.name || '',
                email: selectedPaymentBooking.patientSnapshot?.email || '',
                phone: selectedPaymentBooking.patientSnapshot?.phone || '',
              },
            }}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
          />
        )}

        {/* Reschedule Modal */}
        <Modal
          opened={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title="Reschedule Appointment"
          size="lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
        >
          <div ref={rescheduleModalRef}>
            <Stack gap="md">
              {rescheduleBooking && (
                <>
                  <Alert color="blue" title="Current Appointment">
                    <Text size="sm">
                      {formatDateForDisplay(rescheduleBooking.bookingDate)} at{' '}
                      {formatTimeRange(rescheduleBooking.bookingTime.startTime, rescheduleBooking.bookingTime.endTime)}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {rescheduleBooking.providerSnapshot?.name}
                    </Text>
                  </Alert>

                  <Text fw={600}>Select New Appointment Slot:</Text>
                  
                  {availableSlotsForReschedule.length === 0 ? (
                    <Alert color="yellow" title="No Available Slots">
                      No alternative slots are currently available. Please try again later.
                    </Alert>
                  ) : (
                    <Stack gap="xs" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {availableSlotsForReschedule.map((slot) => (
                        <div key={slot._id} style={{ padding: '8px', border: '1px solid #eee', borderRadius: '8px' }}>
                          <Text size="sm" fw={500}>{formatDateForDisplay(slot.date)}</Text>
                          {slot.timeSlots && slot.timeSlots.length > 0 ? (
                            <Group gap="xs" mt="xs">
                              {slot.timeSlots.filter(ts => (ts.booked || 0) < ts.capacity).map((ts, idx) => (
                                <Button
                                  key={idx}
                                  size="xs"
                                  variant={selectedNewSlot?._id === slot._id && selectedNewTimeSlot?.startTime === ts.startTime ? 'filled' : 'light'}
                                  onClick={() => handleSlotSelection(slot, ts)}
                                >
                                  {formatTimeRange(ts.startTime, ts.endTime)}
                                </Button>
                              ))}
                            </Group>
                          ) : (
                            <Button
                              size="xs"
                              mt="xs"
                              variant={selectedNewSlot?._id === slot._id ? 'filled' : 'light'}
                              onClick={() => handleSlotSelection(slot)}
                            >
                              {formatTimeRange(slot.startTime, slot.endTime)}
                            </Button>
                          )}
                        </div>
                      ))}
                    </Stack>
                  )}

                  {paymentAdjustmentNeeded && (
                    <Alert color={paymentAdjustmentNeeded.type === 'additional' ? 'orange' : 'green'}>
                      {paymentAdjustmentNeeded.type === 'additional' ? (
                        <Text size="sm">Additional payment of ₹{paymentAdjustmentNeeded.amount} required</Text>
                      ) : (
                        <Text size="sm">Refund of ₹{paymentAdjustmentNeeded.amount} will be processed</Text>
                      )}
                    </Alert>
                  )}

                  <Textarea
                    label="Reason for Rescheduling (Optional)"
                    placeholder="Please provide a reason for rescheduling..."
                    value={rescheduleReason}
                    onChange={(event) => setRescheduleReason(event.currentTarget.value)}
                    minRows={3}
                  />
                </>
              )}

              <Group justify="flex-end" gap="sm">
                <Button variant="light" onClick={() => setRescheduleModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmReschedule}
                  loading={rescheduleLoading}
                  disabled={!selectedNewSlot}
                >
                  Confirm Reschedule
                </Button>
              </Group>
            </Stack>
          </div>
        </Modal>
      </Stack>
    </Container>
  );
}
