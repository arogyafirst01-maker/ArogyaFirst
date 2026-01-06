import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Stepper,
  Radio,
  TextInput,
  Card,
  SimpleGrid,
  Badge,
  Alert,
  Textarea,
  Select,
} from '@mantine/core';
import {
  IconSearch,
  IconCalendar,
  IconBuildingHospital,
  IconStethoscope,
  IconFlask,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { BOOKING_TYPES, ROLES } from '@arogyafirst/shared';
import { PAYMENT_METHODS } from '@arogyafirst/shared';
import { formatDateForDisplay, formatTimeRange } from '@arogyafirst/shared';
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal';
import { SkeletonForm } from '../components/SkeletonLoader';
import { AccessibleButton } from '../components/AccessibleButton';
import { getAriaLabel } from '../utils/accessibility';

  // Component
  const NewBookingPage = () => {
  usePageTitle('Book Appointment');
  // Fetch helper (provides fetchData, loading and error)
  const { loading: fetchLoading, error: apiError, fetchData } = useAuthFetch();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [bookingMetadata, setBookingMetadata] = useState({});
  const [loading, setLoading] = useState(false);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  const searchForm = useForm({
    initialValues: {
      search: '',
      specialization: '',
      testType: '',
    },
  });

  const metadataForm = useForm({
    initialValues: {
      symptoms: '',
    },
  });

  useEffect(() => {
    if (activeStep === 1 && selectedProvider) {
      // Pre-fetch slots for today or something, but wait for date selection
    }
  }, [activeStep, selectedProvider]);

  const handleProviderSearch = async () => {
    if (!selectedEntityType) {
      showErrorNotification('Please select a booking type');
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        entityType: selectedEntityType,
        ...(searchForm.values.search && { search: searchForm.values.search }),
        ...(selectedEntityType === BOOKING_TYPES.OPD && searchForm.values.specialization && { specialization: searchForm.values.specialization }),
        ...(selectedEntityType === BOOKING_TYPES.LAB && searchForm.values.testType && { testType: searchForm.values.testType }),
        startDate: new Date().toISOString().split('T')[0],
      });
      
      console.log('Searching providers with params:', queryParams.toString());
      
      const data = await fetchData(`/api/providers/search?${queryParams.toString()}`);
      
      console.log('Provider search response:', data);
      
      if (data && data.data) {
        setProviders(data.data);
        console.log('Set providers:', data.data.length);
      } else {
        setProviders([]);
        console.log('No providers found in response');
      }
    } catch (err) {
      console.error('Provider search error:', err);
      showErrorNotification(err.message || 'Failed to search providers');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setActiveStep(1);
    // Immediately fetch available slots for this provider (next 7 days)
    fetchProviderSlots(provider._id);
  };

  const fetchProviderSlots = async (providerId, selectedDate = null) => {
    setLoading(true);
    try {
      const startDate = selectedDate || new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Next 7 days
      
      const queryParams = new URLSearchParams({
        providerId: providerId,
        entityType: selectedEntityType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        availableOnly: 'true',
      });
      const data = await fetchData(`/api/slots?${queryParams.toString()}`);
      if (data && data.data) {
        setAvailableSlots(data.data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      showErrorNotification('Failed to fetch slots');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (date) => {
    if (!selectedProvider || !date) return;
    // Re-fetch slots for the specific date selected
    fetchProviderSlots(selectedProvider._id, date);
  };

  const handleSlotSelect = (slot, timeSlot = null) => {
    // Check if user is logged in before allowing slot selection
    if (!user) {
      showErrorNotification('Please log in to book an appointment');
      navigate('/login', { state: { from: '/book-appointment' } });
      return;
    }
    setSelectedSlot(slot);
    setSelectedTimeSlot(timeSlot);
    setActiveStep(2);
  };

  // Calculate payment amount based on booking type and provider
  // Uses default pricing structure - can be extended to fetch from provider.pricing field when added to schema
  const calculatePaymentAmount = () => {
    // Default pricing structure (in rupees)
    const defaultPricing = {
      [BOOKING_TYPES.OPD]: 500,
      [BOOKING_TYPES.IPD]: 2000,
      [BOOKING_TYPES.LAB]: 300,
    };
    
    const baseFee = defaultPricing[selectedEntityType] || 0;
    const taxRate = 0; // 0% tax for healthcare services in India
    const totalAmount = baseFee + (baseFee * taxRate);
    
    return Math.round(totalAmount * 100) / 100; // Round to 2 decimals
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    
    // Check if user is logged in
    if (!user) {
      showErrorNotification('Please log in to complete your booking');
      navigate('/login', { state: { from: '/book-appointment' } });
      return;
    }
    
    setLoading(true);
    try {
      // Calculate payment amount based on booking type
      const paymentAmount = calculatePaymentAmount();
      const paymentMethod = paymentAmount > 0 ? PAYMENT_METHODS.ONLINE : PAYMENT_METHODS.CASH;
      
      const bookingData = {
        slotId: selectedSlot._id,
        ...(selectedTimeSlot && { 
          timeSlot: {
            startTime: selectedTimeSlot.startTime,
            endTime: selectedTimeSlot.endTime
          }
        }),
        metadata: bookingMetadata || {},
        paymentAmount: paymentAmount,
        paymentMethod: paymentMethod,
      };
      
      console.log('Creating booking with data:', bookingData);
      
      const data = await fetchData('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      
      console.log('Booking response:', data);
      
      if (data && data.data) {
        const booking = data.data;
        showSuccessNotification('Booking created successfully');
        
        // Check if payment is required and method is ONLINE
        if (booking.paymentAmount > 0 && booking.paymentMethod === PAYMENT_METHODS.ONLINE) {
          // Open payment modal for immediate payment
          setCreatedBooking(booking);
          setPaymentModalOpened(true);
        } else {
          // Navigate directly to confirmation for cash/free bookings
          navigate(`/bookings/${booking._id}/confirmation`);
        }
      }
    } catch (err) {
      console.error('Booking creation error:', err);
      showErrorNotification(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (bookingId, paymentData) => {
    setPaymentModalOpened(false);
    showSuccessNotification('Payment successful!');
    // Navigate to payment success page with query parameters
    // Use amountInRupees from API response (already in rupees)
    // Note: bookingId param contains Mongo _id (used for routing), not human-readable bookingId
    const amountInRupees = paymentData.amountInRupees || createdBooking?.paymentAmount || 0;
    const params = new URLSearchParams({
      bookingId: bookingId, // Mongo _id
      paymentId: paymentData.paymentId || '',
      amount: amountInRupees,
    });
    navigate(`/payment-success?${params.toString()}`);
  };

  const handlePaymentFailure = (error) => {
    setPaymentModalOpened(false);
    showErrorNotification('Payment failed. You can retry from the confirmation page.');
    // Navigate to confirmation page even on payment failure so user can retry
    if (createdBooking) {
      navigate(`/bookings/${createdBooking._id}/confirmation`);
    }
  };

  // Prefer flattened fields returned by provider APIs (name, location, specialization)
  const getProviderName = (provider) => {
    return provider?.name || provider?.hospitalData?.name || provider?.doctorData?.name || provider?.labData?.name || 'Provider';
  };

  const getProviderLocation = (provider) => {
    return provider?.location || provider?.hospitalData?.location || provider?.doctorData?.location || provider?.labData?.location || '';
  };

  const getProviderSpecialization = (provider) => {
    return provider?.specialization || provider?.doctorData?.specialization || '';
  };

  const formatSlotTime = (slot, timeSlot) => {
    if (timeSlot) {
      return formatTimeRange(timeSlot.startTime, timeSlot.endTime);
    }
    return formatTimeRange(slot.startTime, slot.endTime);
  };

  const renderProviderCard = (provider) => {
    const name = getProviderName(provider);
    const location = getProviderLocation(provider);
    const specialization = getProviderSpecialization(provider);
    let badge = 'Provider';
    let icon = <IconBuildingHospital />;
    if (provider.role === ROLES.HOSPITAL) {
      badge = 'Hospital';
      icon = <IconBuildingHospital />;
    } else if (provider.role === ROLES.DOCTOR) {
      badge = 'Doctor';
      icon = <IconStethoscope />;
    } else if (provider.role === ROLES.LAB) {
      badge = 'Lab';
      icon = <IconFlask />;
    }
    return (
      <Card key={provider._id} shadow="sm" padding="lg" radius="md" withBorder>
        <Group position="apart" mb="xs">
          <Text weight={500}>{name}</Text>
          <Badge color="blue" variant="light">
            {badge}
          </Badge>
        </Group>
        {specialization && <Text size="sm" c="dimmed">Specialization: {specialization}</Text>}
        <Text size="sm" c="dimmed">Location: {location}</Text>
        {provider.hospitalData?.branchCode && (
          <Group spacing={4} mt={4}>
            <Badge size="sm" variant="dot" color="green">
              {provider.hospitalData.branchCode}
            </Badge>
            {provider.hospitalData?.isChainBranch && (
              <Badge size="sm" variant="dot" color="orange">
                Branch
              </Badge>
            )}
          </Group>
        )}
        <Button
          variant="light"
          color="blue"
          fullWidth
          mt="md"
          radius="md"
          onClick={() => handleProviderSelect(provider)}
          aria-label={`Select ${name}${specialization ? ', ' + specialization : ''}${location ? ' in ' + location : ''}`}
        >
          Select
        </Button>
      </Card>
    );
  };

  const renderSlotCard = (slot) => {
    const hasTimeSlots = slot.timeSlots && slot.timeSlots.length > 0;
    if (hasTimeSlots) {
      return slot.timeSlots.map((ts, idx) => {
        const available = (ts.capacity || 0) - (ts.booked || 0);
        if (available <= 0) return null;
        return (
          <Card key={`${slot._id}-${idx}`} shadow="sm" padding="lg" radius="md" withBorder>
            <Text weight={500}>{formatSlotTime(slot, ts)}</Text>
            <Text size="sm" c="dimmed">Available: {available}</Text>
            <Button
              variant="light"
              color="blue"
              fullWidth
              mt="md"
              radius="md"
              onClick={() => handleSlotSelect(slot, ts)}
            >
              Select
            </Button>
          </Card>
        );
      });
    } else {
      const available = (slot.capacity || 0) - (slot.booked || 0);
      if (available <= 0) return null;
      return (
        <Card key={slot._id} shadow="sm" padding="lg" radius="md" withBorder>
          <Text weight={500}>{formatSlotTime(slot)}</Text>
          <Text size="sm" c="dimmed">Available: {available}</Text>
          <Button
            variant="light"
            color="blue"
            fullWidth
            mt="md"
            radius="md"
            onClick={() => handleSlotSelect(slot)}
          >
            Select
          </Button>
        </Card>
      );
    }
  };

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="xl">
        Book an Appointment
      </Title>

      <Stepper 
        active={activeStep} 
        breakpoint="sm"
        aria-label="Appointment booking wizard"
        aria-describedby="booking-wizard-description"
      >
        <Stepper.Step label="Provider Search" description="Find a provider" />
        <Stepper.Step label="Slot Selection" description="Choose date and time" />
        <Stepper.Step label="Confirmation" description="Review and confirm" />
      </Stepper>

      {/* Step 1: Provider Search */}
      {activeStep === 0 && (
        <Paper shadow="xs" p="md" mt="xl">
          <Stack>
            <Radio.Group
              value={selectedEntityType}
              onChange={setSelectedEntityType}
              label="Select Booking Type"
              required
            >
              <Group mt="xs">
                <Radio value={BOOKING_TYPES.OPD} label="OPD (Outpatient)" />
                <Radio value={BOOKING_TYPES.IPD} label="IPD (Inpatient)" />
                <Radio value={BOOKING_TYPES.LAB} label="Lab Test" />
              </Group>
            </Radio.Group>
            <TextInput
              label="Search by Name or Location"
              placeholder="Enter provider name, city, or area (e.g., Apollo, Mumbai, Bangalore)"
              {...searchForm.getInputProps('search')}
            />
            {selectedEntityType === BOOKING_TYPES.OPD && (
              <TextInput
                label="Specialization"
                placeholder="e.g., Cardiology"
                {...searchForm.getInputProps('specialization')}
              />
            )}
            {selectedEntityType === BOOKING_TYPES.LAB && (
              <TextInput
                label="Test Type"
                placeholder="e.g., Blood Test"
                {...searchForm.getInputProps('testType')}
              />
            )}
            <Button leftIcon={<IconSearch />} onClick={handleProviderSearch} loading={loading}>
              Search Providers
            </Button>
            {loading && <SkeletonForm />}
            {apiError && <Alert color="red">{apiError}</Alert>}
            {providers.length > 0 && (
              <div role="status" aria-live="polite" aria-atomic="true">
                <span className="sr-only">{providers.length} providers found</span>
              </div>
            )}
            {providers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }, { maxWidth: 'md', cols: 2 }]}>
                  {providers.map(renderProviderCard)}
                </SimpleGrid>
              </motion.div>
            )}
            {providers.length === 0 && !loading && (
              <Text align="center" c="dimmed">
                No providers found. Try adjusting your search criteria.
              </Text>
            )}
          </Stack>
        </Paper>
      )}

      {/* Step 2: Slot Selection */}
      {activeStep === 1 && (
        <Paper shadow="xs" p="md" mt="xl">
          <Stack>
            {selectedProvider && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text weight={500}>{getProviderName(selectedProvider)}</Text>
                {getProviderSpecialization(selectedProvider) && (
                  <Text size="sm" c="dimmed">Specialization: {getProviderSpecialization(selectedProvider)}</Text>
                )}
                <Text size="sm" c="dimmed">Location: {getProviderLocation(selectedProvider)}</Text>
              </Card>
            )}
            <DateInput
              label="Filter by Date (Optional)"
              placeholder="Pick a date to filter slots"
              minDate={new Date()}
              maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
              onChange={handleDateSelect}
              clearable
              description="Leave empty to see all available slots in the next 7 days"
            />
            {loading && <SkeletonForm />}
            {apiError && <Alert color="red">{apiError}</Alert>}
            {!user && (
              <Alert color="yellow" title="Login Required">
                Please <Button variant="subtle" size="xs" onClick={() => navigate('/login', { state: { from: '/book-appointment' } })}>log in</Button> to book an appointment
              </Alert>
            )}
            {availableSlots.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Title order={4} mb="md">Available Slots</Title>
                <Stack spacing="md">
                  {/* Group slots by date */}
                  {Object.entries(
                    availableSlots.reduce((acc, slot) => {
                      const dateKey = formatDateForDisplay(slot.date);
                      if (!acc[dateKey]) acc[dateKey] = [];
                      acc[dateKey].push(slot);
                      return acc;
                    }, {})
                  ).map(([dateStr, slotsForDate]) => (
                    <div key={dateStr}>
                      <Text weight={500} mb="xs">{dateStr}</Text>
                      <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'sm', cols: 1 }, { maxWidth: 'md', cols: 2 }]}>
                        {slotsForDate.map(renderSlotCard)}
                      </SimpleGrid>
                    </div>
                  ))}
                </Stack>
              </motion.div>
            )}
            {availableSlots.length === 0 && !loading && (
              <Alert color="blue" title="No available slots">
                This provider doesn't have any available slots in the next 7 days. Please try another provider or contact them directly.
              </Alert>
            )}
            <Button variant="outline" onClick={() => setActiveStep(0)}>
              Back to Provider Search
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Step 3: Confirmation */}
      {activeStep === 2 && (
        <Paper shadow="xs" p="md" mt="xl">
          <Stack>
            {selectedProvider && selectedSlot && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4} mb="md">
                  Booking Summary
                </Title>
                <Text weight={500}>Provider: {getProviderName(selectedProvider)}</Text>
                {getProviderSpecialization(selectedProvider) && (
                  <Text size="sm" c="dimmed">Specialization: {getProviderSpecialization(selectedProvider)}</Text>
                )}
                <Text size="sm" c="dimmed">Location: {getProviderLocation(selectedProvider)}</Text>
                <Text size="sm" c="dimmed">Type: {selectedEntityType}</Text>
                <Text size="sm" c="dimmed">Date: {formatDateForDisplay(selectedSlot.date)}</Text>
                <Text size="sm" c="dimmed">Time: {formatSlotTime(selectedSlot, selectedTimeSlot)}</Text>
                <Text size="sm" c="dimmed">Payment Method: {calculatePaymentAmount() > 0 ? 'Online Payment' : 'Free/Cash'}</Text>
                <Text size="sm" weight={500} c="blue">Payment Amount: ₹{calculatePaymentAmount().toFixed(2)}</Text>
                {calculatePaymentAmount() > 0 && (
                  <Text size="xs" c="dimmed">You will be redirected to payment gateway after booking confirmation</Text>
                )}
              </Card>
            )}
            <Textarea
              label="Symptoms or Special Requests (Optional)"
              placeholder="Describe your symptoms or any special requests"
              value={bookingMetadata.symptoms || ''}
              onChange={(e) => setBookingMetadata({ ...bookingMetadata, symptoms: e.target.value })}
            />
            <Group>
              <AccessibleButton 
                onClick={handleConfirmBooking} 
                loading={loading}
                aria-label={getAriaLabel('booking', 'create')}
              >
                Confirm Booking
              </AccessibleButton>
              <Button variant="outline" onClick={() => setActiveStep(1)}>
                Back to Slot Selection
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Payment Modal */}
      {createdBooking && (
        <PaymentCheckoutModal
          opened={paymentModalOpened}
          onClose={() => setPaymentModalOpened(false)}
          booking={{
            id: createdBooking._id,
            amount: createdBooking.paymentAmount,
            patient: {
              name: user?.name || user?.patientData?.name || '',
              email: user?.email || '',
              phone: user?.phone || user?.patientData?.phone || '',
            },
          }}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
    </Container>
  );
};

export default NewBookingPage;