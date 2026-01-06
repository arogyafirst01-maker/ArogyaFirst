import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Modal,
  Tabs,
  Alert,
  Loader,
  ActionIcon,
  Tooltip,
  NumberInput,
  TextInput,
  Checkbox,
  Grid,
  Card,
  Divider,
  Box,
  Center,
  Select,
} from '@mantine/core';
import { Calendar, DateInput } from '@mantine/dates';
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconLock,
  IconLockOpen,
  IconChevronLeft,
  IconChevronRight,
  IconAlertCircle,
  IconTrash,
  IconTemplate,
  IconList,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import useAuthFetch from '../hooks/useAuthFetch';
import { usePageTitle } from '../hooks/usePageTitle.js';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { BOOKING_STATUS, BOOKING_TYPES, CONSULTATION_TYPES } from '@arogyafirst/shared';
import SlotManagement from '../components/SlotManagement.jsx';

const SchedulePage = () => {
  usePageTitle('My Schedule');
  const { user } = useAuth();
  const { fetchData } = useAuthFetch();

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetailsModalOpen, setDayDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  // Weekly Templates state
  const [templateName, setTemplateName] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [templateStartDate, setTemplateStartDate] = useState(null);
  const [templateEndDate, setTemplateEndDate] = useState(null);
  const [timeWindows, setTimeWindows] = useState([
    { startTime: '09:00', endTime: '12:00', capacity: 10 },
  ]);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [department, setDepartment] = useState('');
  const [consultationType, setConsultationType] = useState(CONSULTATION_TYPES.IN_PERSON);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  // Helper functions
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
      case BOOKING_STATUS.PENDING:
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getDateKey = (date) => {
    return dayjs(date).format('YYYY-MM-DD');
  };

  // Fetch slots and bookings for the selected month
  const fetchCalendarData = useCallback(async () => {
    if (!user?._id) return;

    setLoading(true);
    setError(null);

    try {
      const monthStart = dayjs(selectedMonth).startOf('month').format('YYYY-MM-DD');
      const monthEnd = dayjs(selectedMonth).endOf('month').format('YYYY-MM-DD');

      // Fetch slots
      const slotsParams = new URLSearchParams({
        providerId: user._id,
        startDate: monthStart,
        endDate: monthEnd,
        entityType: BOOKING_TYPES.OPD,
      });
      const slotsResponse = await fetchData(`/api/slots?${slotsParams.toString()}`);
      const fetchedSlots = slotsResponse?.data?.slots || slotsResponse?.data || [];
      setSlots(fetchedSlots);

      // Fetch bookings
      const bookingsParams = new URLSearchParams({
        startDate: monthStart,
        endDate: monthEnd,
      });
      const bookingsResponse = await fetchData(`/api/bookings/provider/${user._id}?${bookingsParams.toString()}`);
      const fetchedBookings = bookingsResponse?.data?.bookings || bookingsResponse?.data || [];
      setBookings(fetchedBookings);
    } catch (err) {
      setError(err.message || 'Failed to fetch schedule data');
      showErrorNotification('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [user?._id, selectedMonth, fetchData]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Build day data map for calendar rendering - memoized to avoid recomputation on every render
  const dayDataMap = useMemo(() => {
    const map = {};

    // Add slots
    slots.forEach((slot) => {
      const dateKey = getDateKey(slot.date);
      if (!map[dateKey]) {
        map[dateKey] = { slots: [], bookings: [] };
      }
      map[dateKey].slots.push(slot);
    });

    // Add bookings
    bookings.forEach((booking) => {
      const dateKey = getDateKey(booking.bookingDate);
      if (!map[dateKey]) {
        map[dateKey] = { slots: [], bookings: [] };
      }
      map[dateKey].bookings.push(booking);
    });

    return map;
  }, [slots, bookings]);

  const getDayData = (date) => {
    const dateKey = getDateKey(date);
    return dayDataMap[dateKey] || { slots: [], bookings: [] };
  };

  // Handle day click
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setDayDetailsModalOpen(true);
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setSelectedMonth(dayjs(selectedMonth).subtract(1, 'month').toDate());
  };

  const goToNextMonth = () => {
    setSelectedMonth(dayjs(selectedMonth).add(1, 'month').toDate());
  };

  // Toggle slot active status
  const toggleSlotStatus = async (slot) => {
    try {
      const newStatus = !slot.isActive;
      await fetchData(`/api/slots/${slot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      showSuccessNotification(newStatus ? 'Slot unblocked' : 'Slot blocked');
      fetchCalendarData();
    } catch (err) {
      showErrorNotification(err.message || 'Failed to update slot');
    }
  };

  // Custom day rendering for calendar
  const renderDay = (date) => {
    const day = date.getDate();
    const dayData = getDayData(date);
    const hasSlots = dayData.slots.length > 0;
    const hasActiveSlots = dayData.slots.some((s) => s.isActive);
    const hasBookings = dayData.bookings.length > 0;

    // Count bookings by status
    const statusCounts = {};
    dayData.bookings.forEach((b) => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });

    return (
      <Tooltip
        label={
          hasSlots || hasBookings
            ? `${dayData.slots.length} slot(s), ${dayData.bookings.length} booking(s)`
            : 'No slots'
        }
        position="top"
        withArrow
      >
        <Box
          onClick={() => handleDayClick(date)}
          style={{
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Text size="sm">{day}</Text>
          <Group gap={2} justify="center" style={{ position: 'absolute', bottom: 2 }}>
            {hasActiveSlots && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-teal-6)',
                }}
              />
            )}
            {statusCounts[BOOKING_STATUS.CONFIRMED] > 0 && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-blue-6)',
                }}
              />
            )}
            {statusCounts[BOOKING_STATUS.COMPLETED] > 0 && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-green-6)',
                }}
              />
            )}
            {statusCounts[BOOKING_STATUS.CANCELLED] > 0 && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-red-6)',
                }}
              />
            )}
            {statusCounts[BOOKING_STATUS.PENDING] > 0 && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-yellow-6)',
                }}
              />
            )}
            {statusCounts[BOOKING_STATUS.NO_SHOW] > 0 && (
              <Box
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-gray-6)',
                }}
              />
            )}
          </Group>
        </Box>
      </Tooltip>
    );
  };

  // Weekly Templates functions
  const handleDayToggle = (dayValue) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const addTimeWindow = () => {
    setTimeWindows([...timeWindows, { startTime: '09:00', endTime: '17:00', capacity: 5 }]);
  };

  const removeTimeWindow = (index) => {
    setTimeWindows(timeWindows.filter((_, i) => i !== index));
  };

  const updateTimeWindow = (index, field, value) => {
    const updated = [...timeWindows];
    updated[index][field] = value;
    setTimeWindows(updated);
  };

  const generatePreview = () => {
    if (!templateStartDate || !templateEndDate || selectedDays.length === 0) {
      setPreviewCount(0);
      return;
    }

    let count = 0;
    let current = dayjs(templateStartDate);
    const end = dayjs(templateEndDate);

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      if (selectedDays.includes(current.day())) {
        count++;
      }
      current = current.add(1, 'day');
    }

    setPreviewCount(count);
  };

  useEffect(() => {
    generatePreview();
  }, [templateStartDate, templateEndDate, selectedDays]);

  const generateSlotsFromTemplate = () => {
    const generatedSlots = [];

    if (!templateStartDate || !templateEndDate || selectedDays.length === 0 || timeWindows.length === 0) {
      return generatedSlots;
    }

    let current = dayjs(templateStartDate);
    const end = dayjs(templateEndDate);

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      if (selectedDays.includes(current.day())) {
        generatedSlots.push({
          entityType: BOOKING_TYPES.OPD,
          date: current.format('YYYY-MM-DD'),
          timeSlots: timeWindows.map((tw) => ({
            startTime: tw.startTime,
            endTime: tw.endTime,
            capacity: tw.capacity,
          })),
          advanceBookingDays,
          metadata: {
            department,
            consultationType,
          },
        });
      }
      current = current.add(1, 'day');
    }

    return generatedSlots;
  };

  const handleBulkCreate = async () => {
    const slotsToCreate = generateSlotsFromTemplate();

    if (slotsToCreate.length === 0) {
      showErrorNotification('Please fill in all template fields');
      return;
    }

    // Validate time windows
    for (const tw of timeWindows) {
      if (!tw.startTime || !tw.endTime || !tw.capacity) {
        showErrorNotification('Each time window must have start time, end time, and capacity');
        return;
      }
      if (tw.capacity < 1) {
        showErrorNotification('Capacity must be at least 1');
        return;
      }
    }

    setBulkCreating(true);
    try {
      await fetchData('/api/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsToCreate }),
      });
      showSuccessNotification(`Successfully created ${slotsToCreate.length} slots`);
      fetchCalendarData();
      // Reset form
      setTemplateName('');
      setSelectedDays([]);
      setTemplateStartDate(null);
      setTemplateEndDate(null);
      setTimeWindows([{ startTime: '09:00', endTime: '12:00', capacity: 10 }]);
      setPreviewCount(0);
    } catch (err) {
      showErrorNotification(err.message || 'Failed to create slots');
    } finally {
      setBulkCreating(false);
    }
  };

  // Selected day details
  const selectedDayData = selectedDate ? getDayData(selectedDate) : { slots: [], bookings: [] };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>My Schedule</Title>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="calendar" leftSection={<IconCalendar size={16} />}>
              Calendar View
            </Tabs.Tab>
            <Tabs.Tab value="slots" leftSection={<IconList size={16} />}>
              Slot Management
            </Tabs.Tab>
            <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
              Weekly Templates
            </Tabs.Tab>
          </Tabs.List>

          {/* Calendar View Tab */}
          <Tabs.Panel value="calendar" pt="md">
            <Paper withBorder shadow="sm" p="md" radius="md">
              <Stack gap="md">
                {/* Month Navigation */}
                <Group justify="space-between" align="center">
                  <ActionIcon variant="subtle" onClick={goToPreviousMonth} aria-label="Previous month">
                    <IconChevronLeft size={20} />
                  </ActionIcon>
                  <Title order={4}>{dayjs(selectedMonth).format('MMMM YYYY')}</Title>
                  <ActionIcon variant="subtle" onClick={goToNextMonth} aria-label="Next month">
                    <IconChevronRight size={20} />
                  </ActionIcon>
                </Group>

                {/* Legend */}
                <Group gap="md" justify="center" wrap="wrap">
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-teal-6)' }} />
                    <Text size="xs">Available Slots</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-yellow-6)' }} />
                    <Text size="xs">Pending</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-blue-6)' }} />
                    <Text size="xs">Confirmed</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-green-6)' }} />
                    <Text size="xs">Completed</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-red-6)' }} />
                    <Text size="xs">Cancelled</Text>
                  </Group>
                  <Group gap={4}>
                    <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-gray-6)' }} />
                    <Text size="xs">No Show</Text>
                  </Group>
                </Group>

                {/* Calendar */}
                {loading ? (
                  <Center py="xl">
                    <Loader size="lg" />
                  </Center>
                ) : (
                  <Center>
                    <Calendar
                      date={selectedMonth}
                      onDateChange={setSelectedMonth}
                      renderDay={renderDay}
                      size="xl"
                      styles={{
                        day: {
                          height: 60,
                          width: 60,
                        },
                      }}
                    />
                  </Center>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Slot Management Tab */}
          <Tabs.Panel value="slots" pt="md">
            <SlotManagement
              entityType={BOOKING_TYPES.OPD}
              providerId={user?._id}
              showMetadataFields={true}
            />
          </Tabs.Panel>

          {/* Weekly Templates Tab */}
          <Tabs.Panel value="templates" pt="md">
            <Paper withBorder shadow="sm" p="md" radius="md">
              <Stack gap="lg">
                <Title order={4}>Create Weekly Schedule Template</Title>
                <Text size="sm" c="dimmed">
                  Define a recurring schedule pattern and create multiple slots at once.
                </Text>

                <Divider />

                {/* Template Name */}
                <TextInput
                  label="Template Name (optional)"
                  placeholder="e.g., Regular Week Schedule"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.currentTarget.value)}
                />

                {/* Days of Week Selection */}
                <Stack gap="xs">
                  <Text fw={500} size="sm">Select Days of Week</Text>
                  <Group gap="sm">
                    {daysOfWeek.map((day) => (
                      <Checkbox
                        key={day.value}
                        label={day.label}
                        checked={selectedDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                      />
                    ))}
                  </Group>
                </Stack>

                {/* Date Range */}
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="Start Date"
                      placeholder="Select start date"
                      value={templateStartDate}
                      onChange={setTemplateStartDate}
                      minDate={new Date()}
                      leftSection={<IconCalendar size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <DateInput
                      label="End Date"
                      placeholder="Select end date"
                      value={templateEndDate}
                      onChange={setTemplateEndDate}
                      minDate={templateStartDate || new Date()}
                      leftSection={<IconCalendar size={16} />}
                    />
                  </Grid.Col>
                </Grid>

                {/* Time Windows */}
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <Text fw={500} size="sm">Time Windows</Text>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={addTimeWindow}
                    >
                      Add Window
                    </Button>
                  </Group>
                  {timeWindows.map((tw, index) => (
                    <Card key={index} withBorder padding="sm">
                      <Group gap="sm" align="flex-end">
                        <TextInput
                          label="Start Time"
                          placeholder="HH:MM"
                          value={tw.startTime}
                          onChange={(e) => updateTimeWindow(index, 'startTime', e.currentTarget.value)}
                          style={{ flex: 1 }}
                          leftSection={<IconClock size={14} />}
                        />
                        <TextInput
                          label="End Time"
                          placeholder="HH:MM"
                          value={tw.endTime}
                          onChange={(e) => updateTimeWindow(index, 'endTime', e.currentTarget.value)}
                          style={{ flex: 1 }}
                          leftSection={<IconClock size={14} />}
                        />
                        <NumberInput
                          label="Capacity"
                          value={tw.capacity}
                          onChange={(val) => updateTimeWindow(index, 'capacity', val)}
                          min={1}
                          style={{ flex: 1 }}
                        />
                        {timeWindows.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => removeTimeWindow(index)}
                            aria-label="Remove time window"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>

                {/* Additional Settings */}
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Advance Booking Days"
                      description="How many days in advance patients can book"
                      value={advanceBookingDays}
                      onChange={setAdvanceBookingDays}
                      min={1}
                      max={365}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Department (optional)"
                      placeholder="e.g., General Medicine"
                      value={department}
                      onChange={(e) => setDepartment(e.currentTarget.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Consultation Type"
                      description="Type of consultations for these slots"
                      value={consultationType}
                      onChange={setConsultationType}
                      data={[
                        { value: CONSULTATION_TYPES.IN_PERSON, label: 'In-Person' },
                        { value: CONSULTATION_TYPES.TELECONSULTATION, label: 'Teleconsultation' },
                        { value: CONSULTATION_TYPES.BOTH, label: 'Both' },
                      ]}
                    />
                  </Grid.Col>
                </Grid>

                <Divider />

                {/* Preview and Create */}
                <Group justify="space-between" align="center">
                  <Text size="sm">
                    <Text span fw={500}>Preview:</Text> {previewCount} slots will be created
                  </Text>
                  <Button
                    onClick={handleBulkCreate}
                    loading={bulkCreating}
                    disabled={previewCount === 0}
                    leftSection={<IconPlus size={16} />}
                  >
                    Create {previewCount} Slots
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Day Details Modal */}
        <Modal
          opened={dayDetailsModalOpen}
          onClose={() => setDayDetailsModalOpen(false)}
          title={selectedDate ? dayjs(selectedDate).format('dddd, MMMM D, YYYY') : 'Day Details'}
          size="lg"
        >
          <Stack gap="md">
            {/* Slots Section */}
            <div>
              <Title order={5} mb="xs">Slots ({selectedDayData.slots.length})</Title>
              {selectedDayData.slots.length === 0 ? (
                <Text size="sm" c="dimmed">No slots for this day</Text>
              ) : (
                <Stack gap="xs">
                  {selectedDayData.slots.map((slot) => {
                    const totalCapacity = slot.timeSlots?.reduce((sum, ts) => sum + (ts.capacity || 0), 0) || slot.capacity || 0;
                    const bookedCount = Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0
                      ? slot.timeSlots.reduce((sum, ts) => sum + (ts.booked || 0), 0)
                      : slot.booked || 0;
                    const availableCount = totalCapacity - bookedCount;

                    return (
                      <Card key={slot._id} withBorder padding="sm">
                        <Group justify="space-between" align="center">
                          <div>
                            {slot.timeSlots?.length > 0 ? (
                              slot.timeSlots.map((ts, i) => (
                                <Text key={i} size="sm">
                                  {formatTime(ts.startTime)} - {formatTime(ts.endTime)} (Cap: {ts.capacity})
                                </Text>
                              ))
                            ) : (
                              <Text size="sm">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </Text>
                            )}
                            <Group gap="xs" mt={4}>
                              <Badge size="xs" color={slot.isActive ? 'green' : 'red'}>
                                {slot.isActive ? 'Active' : 'Blocked'}
                              </Badge>
                              <Text size="xs" c="dimmed">
                                {bookedCount}/{totalCapacity} booked • {availableCount} available
                              </Text>
                            </Group>
                          </div>
                          <Tooltip label={slot.isActive ? 'Block this slot' : 'Unblock this slot'}>
                            <ActionIcon
                              variant="light"
                              color={slot.isActive ? 'red' : 'green'}
                              onClick={() => toggleSlotStatus(slot)}
                              aria-label={slot.isActive ? 'Block slot' : 'Unblock slot'}
                            >
                              {slot.isActive ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </div>

            <Divider />

            {/* Bookings Section */}
            <div>
              <Title order={5} mb="xs">Bookings ({selectedDayData.bookings.length})</Title>
              {selectedDayData.bookings.length === 0 ? (
                <Text size="sm" c="dimmed">No bookings for this day</Text>
              ) : (
                <Stack gap="xs">
                  {selectedDayData.bookings.map((booking) => {
                    const bookingTimeDisplay = booking.bookingTime?.startTime && booking.bookingTime?.endTime
                      ? `${formatTime(booking.bookingTime.startTime)} - ${formatTime(booking.bookingTime.endTime)}`
                      : 'Time not set';
                    return (
                      <Card key={booking._id} withBorder padding="sm">
                        <Group justify="space-between" align="center">
                          <div>
                            <Text size="sm" fw={500}>
                              {booking.patientSnapshot?.name || 'Patient'}
                            </Text>
                            <Group gap="xs">
                              <Text size="xs" c="dimmed">
                                {bookingTimeDisplay}
                              </Text>
                              <Text size="xs" c="dimmed">
                                ID: {booking.bookingId}
                              </Text>
                            </Group>
                          </div>
                          <Badge color={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </div>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default SchedulePage;
