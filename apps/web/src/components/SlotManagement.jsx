import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  Stack,
  Group,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Badge,
  ActionIcon,
  Alert,
  Loader,
  Switch,
  ScrollArea,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconClock,
} from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext.jsx';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import {
  showSuccessNotification,
  showErrorNotification,
} from '../utils/notifications.js';
import { BOOKING_TYPES, CONSULTATION_TYPES } from '@arogyafirst/shared';
import { formatDateForDisplay, timeToMinutes } from '@arogyafirst/shared';

const SlotManagement = ({ entityType, providerId, showMetadataFields }) => {
  const { user } = useAuth();
  const { loading: apiLoading, error: apiError, fetchData } = useAuthFetch();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useFocusTrap(modalOpen);
  const [modalType, setModalType] = useState('add');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);

  const [useTimeWindows, setUseTimeWindows] = useState(false);
  
  const validateTimeWindow = (value) => {
    if (!value || !Array.isArray(value)) return 'At least one time window required';
    for (const ts of value) {
      if (!ts.startTime || !ts.endTime || !ts.capacity) return 'Each time window must have start time, end time and capacity';
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.startTime)) return 'Start time must be in HH:MM format';
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(ts.endTime)) return 'End time must be in HH:MM format';
      if (timeToMinutes(ts.endTime) <= timeToMinutes(ts.startTime)) return 'End time must be after start time';
      if (!Number.isInteger(ts.capacity) || ts.capacity < 1) return 'Capacity must be a positive integer';
    }
    // Check for overlaps
    const sorted = [...value].sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (timeToMinutes(sorted[i].startTime) < timeToMinutes(sorted[i-1].endTime)) {
        return 'Time windows cannot overlap';
      }
    }
    return null;
  };

  const slotForm = useForm({
    initialValues: {
      date: null,
      startTime: '',
      endTime: '',
      capacity: 1,
      advanceBookingDays: 30,
      timeSlots: [],
      // Metadata fields
      bedType: '',
      bedNumber: '',
      floor: '',
      ward: '',
      testType: '',
      testName: '',
      department: '',
      consultationType: CONSULTATION_TYPES.IN_PERSON,
    },
    validate: {
      date: (value) => {
        if (!value) return 'Date must be a valid future date';
        const d = new Date(value);
        if (isNaN(d.getTime())) return 'Date must be a valid future date';
        d.setUTCHours(0, 0, 0, 0);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime() ? null : 'Date must be a valid future date';
      },
      startTime: (value) => !useTimeWindows ? (/^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? null : 'Start time must be in HH:MM format (24-hour)') : null,
      endTime: (value) => !useTimeWindows ? (/^([01]\d|2[0-3]):([0-5]\d)$/.test(value) ? null : 'End time must be in HH:MM format (24-hour)') : null,
      capacity: (value) => !useTimeWindows ? (Number.isInteger(value) && value >= 1 ? null : 'Capacity must be a positive integer') : null,
      timeSlots: (value) => useTimeWindows ? validateTimeWindow(value) : null,
      advanceBookingDays: (value) => (Number.isInteger(value) && value >= 0 ? null : 'Advance booking days must be non-negative'),
    },
  });

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    fetchSlots();
  }, [entityType, filterActiveOnly, filterAvailableOnly, providerId]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        entityType,
        activeOnly: filterActiveOnly,
        availableOnly: filterAvailableOnly,
      });
      if (providerId) {
        queryParams.append('providerId', providerId);
      }
      const data = await fetchData(`/api/slots?${queryParams.toString()}`);
      if (data) {
        // API responses are wrapped as { success, message, data }
        // normalize to an array of slots for the component
        setSlots(data?.data?.slots || data?.data || []);
      }
    } catch (err) {
      showErrorNotification('Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const validateTimeRange = (start, end) => {
    const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return endMinutes > startMinutes;
  };

  const buildMetadata = (values) => {
    const metadata = {};
    if (entityType === BOOKING_TYPES.IPD) {
      metadata.bedType = values.bedType;
      metadata.bedNumber = values.bedNumber;
      metadata.floor = values.floor;
      metadata.ward = values.ward;
    } else if (entityType === BOOKING_TYPES.LAB) {
      metadata.testType = values.testType;
      metadata.testName = values.testName;
    } else if (entityType === BOOKING_TYPES.OPD) {
      metadata.department = values.department;
      metadata.consultationType = values.consultationType;
    }
    return metadata;
  };

  const handleAddSlot = async (values) => {
    if (!useTimeWindows && !validateTimeRange(values.startTime, values.endTime)) {
      showErrorNotification('End time must be after start time');
      return;
    }
    // Format date as YYYY-MM-DD using local date (not UTC)
    const date = values.date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    const dataToSend = {
      entityType,
      date: formattedDate,
      advanceBookingDays: values.advanceBookingDays,
      metadata: buildMetadata(values),
      ...(useTimeWindows 
        ? { timeSlots: values.timeSlots }
        : { 
            startTime: values.startTime,
            endTime: values.endTime,
            capacity: values.capacity
          }
      ),
    };
    try {
      const data = await fetchData('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (data) {
        showSuccessNotification('Slot added successfully');
        fetchSlots();
        closeModal();
      }
    } catch (err) {
      showErrorNotification(err.message || 'Failed to add slot');
    }
  };

  const handleUpdateSlot = async (values) => {
    if (!useTimeWindows && !validateTimeRange(values.startTime, values.endTime)) {
      showErrorNotification('End time must be after start time');
      return;
    }

    try {
      // First fetch current slot to get booked counts
      const currentSlotResponse = await fetchData(`/api/slots/${selectedSlot._id}`, {
        method: 'GET'
      });

      // Unwrap the response data
      const currentSlot = currentSlotResponse?.data;

      if (!currentSlot) {
        showErrorNotification('Failed to fetch current slot data');
        return;
      }

      // Create map of existing timeSlots with booked counts
      const existingTimeSlotsMap = new Map();
      if (Array.isArray(currentSlot.timeSlots)) {
        currentSlot.timeSlots.forEach(ts => {
          existingTimeSlotsMap.set(`${ts.startTime}-${ts.endTime}`, ts);
        });
      }

      // Format date as YYYY-MM-DD using local date (not UTC)
      const date = values.date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      // Merge timeSlots with booked counts
      const dataToSend = {
        date: formattedDate,
        advanceBookingDays: values.advanceBookingDays,
        metadata: buildMetadata(values),
        ...(useTimeWindows 
          ? { 
              timeSlots: values.timeSlots.map(ts => {
                const key = `${ts.startTime}-${ts.endTime}`;
                const existing = existingTimeSlotsMap.get(key);
                // Preserve booked count for existing slots
                return existing ? { ...ts, booked: existing.booked } : { ...ts, booked: 0 };
              })
            }
          : { 
              startTime: values.startTime,
              endTime: values.endTime,
              capacity: values.capacity,
              booked: currentSlot.booked // Preserve booked count for legacy slots
            }
        ),
      };

      const data = await fetchData(`/api/slots/${selectedSlot._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (data) {
        showSuccessNotification('Slot updated successfully');
        fetchSlots();
        closeModal();
      }
    } catch (err) {
      showErrorNotification(err.message || 'Failed to update slot');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;
    try {
      const data = await fetchData(`/api/slots/${slotId}`, {
        method: 'DELETE',
      });
      if (data) {
        showSuccessNotification('Slot deleted successfully');
        fetchSlots();
      }
    } catch (err) {
      showErrorNotification(err.message || 'Failed to delete slot');
    }
  };

  const openAddModal = () => {
    setModalType('add');
    slotForm.reset();
    setModalOpen(true);
  };

  const openEditModal = (slot) => {
    setModalType('edit');
    setSelectedSlot(slot);
    const hasTimeSlots = Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0;
    setUseTimeWindows(hasTimeSlots);
    
    slotForm.setValues({
      date: new Date(slot.date),
      startTime: hasTimeSlots ? '' : slot.startTime,
      endTime: hasTimeSlots ? '' : slot.endTime,
      capacity: hasTimeSlots ? 1 : slot.capacity,
      timeSlots: hasTimeSlots ? slot.timeSlots : [],
      advanceBookingDays: slot.advanceBookingDays || 30,
      // Metadata
      bedType: slot.metadata?.bedType || '',
      bedNumber: slot.metadata?.bedNumber || '',
      floor: slot.metadata?.floor || '',
      ward: slot.metadata?.ward || '',
      testType: slot.metadata?.testType || '',
      testName: slot.metadata?.testName || '',
      department: slot.metadata?.department || '',
      consultationType: slot.metadata?.consultationType || CONSULTATION_TYPES.IN_PERSON,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    slotForm.reset();
    setSelectedSlot(null);
  };

  const handleSubmit = (values) => {
    if (modalType === 'add') {
      handleAddSlot(values);
    } else {
      handleUpdateSlot(values);
    }
  };

  if (loading) {
    return <Loader size="lg" />;
  }

  return (
    <Stack>
      {apiError && <Alert color="red">{apiError}</Alert>}
      <Group position="apart" sx={{ flexWrap: 'wrap' }}>
        <Group sx={{ flexWrap: 'wrap' }}>
          <Switch
            label="Active only"
            checked={filterActiveOnly}
            onChange={(event) => setFilterActiveOnly(event.currentTarget.checked)}
          />
          <Switch
            label="Available only"
            checked={filterAvailableOnly}
            onChange={(event) => setFilterAvailableOnly(event.currentTarget.checked)}
          />
        </Group>
        <Button leftIcon={<IconPlus size={16} />} onClick={openAddModal}>
          Add Slot
        </Button>
      </Group>
      <ScrollArea>
        <Table striped highlightOnHover sx={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Capacity</th>
              <th>Booked</th>
              <th>Available</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.length ? (
              slots.map((slot) => {
                const hasSub = Array.isArray(slot.timeSlots) && slot.timeSlots.length > 0;
                const totalCapacity = hasSub ? slot.timeSlots.reduce((s, ts) => s + (ts.capacity || 0), 0) : (slot.capacity || 0);
                const totalBooked = hasSub ? slot.timeSlots.reduce((s, ts) => s + (ts.booked || 0), 0) : (slot.booked || 0);
                const remaining = (typeof slot.availableCapacity === 'number') ? slot.availableCapacity : (totalCapacity - totalBooked);
                return (
                  <tr key={slot._id}>
                    <td>{formatDateForDisplay(slot.date)}</td>
                    <td>
                      {hasSub ? (
                        <div>
                          {slot.timeSlots.map((ts, idx) => (
                            <div key={idx} style={{ marginBottom: 4 }}>
                              {formatTime(ts.startTime)} - {formatTime(ts.endTime)} ({(ts.capacity || 0) - (ts.booked || 0)} available)
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</>
                      )}
                    </td>
                    <td>{totalCapacity}</td>
                    <td>{totalBooked}</td>
                    <td>
                      <Badge color={remaining > 0 ? 'green' : 'red'}>
                        {remaining}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={slot.isActive ? 'green' : 'gray'}>
                        {slot.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <Group>
                        <ActionIcon onClick={() => openEditModal(slot)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" onClick={() => handleDeleteSlot(slot._id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>No slots found</td>
              </tr>
            )}
          </tbody>
        </Table>
      </ScrollArea>
      <Modal
        opened={modalOpen}
        onClose={closeModal}
        title={`${modalType === 'add' ? 'Add' : 'Edit'} Slot`}
        size="md"
        fullScreen={isMobile}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-modal-title"
        aria-describedby="slot-modal-description"
      >
        <form onSubmit={slotForm.onSubmit(handleSubmit)}>
          <Stack>
            <DateInput
              label="Date"
              {...slotForm.getInputProps('date')}
              minDate={new Date()}
            />
            <Switch 
              label="Use multiple time windows"
              checked={useTimeWindows}
              onChange={(event) => {
                setUseTimeWindows(event.currentTarget.checked);
                if (event.currentTarget.checked) {
                  // Initialize timeSlots with one window
                  slotForm.setFieldValue('timeSlots', [{
                    startTime: '',
                    endTime: '',
                    capacity: 1
                  }]);
                } else {
                  slotForm.setFieldValue('timeSlots', []);
                }
              }}
            />
            {!useTimeWindows ? (
              <>
                <TextInput
                  label="Start Time"
                  placeholder="09:00"
                  description="Use 24-hour format (e.g., 09:00 for 9 AM, 14:00 for 2 PM)"
                  {...slotForm.getInputProps('startTime')}
                />
                <TextInput
                  label="End Time"
                  placeholder="17:00"
                  description="Use 24-hour format (e.g., 17:00 for 5 PM, 22:00 for 10 PM)"
                  {...slotForm.getInputProps('endTime')}
                />
                <NumberInput
                  label="Capacity"
                  {...slotForm.getInputProps('capacity')}
                  min={1}
                />
              </>
            ) : (
              <Stack spacing="xs">
                {slotForm.values.timeSlots.map((_, index) => (
                  <Group key={index} align="flex-start" noWrap>
                    <Stack spacing={4} style={{ flex: 1 }}>
                      <Group grow>
                        <TextInput
                          size="sm"
                          placeholder="09:00"
                          label={index === 0 ? "Start Time" : ""}
                          description={index === 0 ? "24-hour format" : ""}
                          {...slotForm.getInputProps(`timeSlots.${index}.startTime`)}
                        />
                        <TextInput
                          size="sm"
                          placeholder="10:30"
                          label={index === 0 ? "End Time" : ""}
                          description={index === 0 ? "24-hour format" : ""}
                          {...slotForm.getInputProps(`timeSlots.${index}.endTime`)}
                        />
                        <NumberInput
                          size="sm"
                          min={(slotForm.values.timeSlots[index].booked || 0)}
                          label={index === 0 ? "Capacity" : ""}
                          {...slotForm.getInputProps(`timeSlots.${index}.capacity`)}
                        />
                      </Group>
                      {slotForm.values.timeSlots[index].booked > 0 && (
                        <Badge size="sm" color="blue">
                          {slotForm.values.timeSlots[index].booked} slots booked
                        </Badge>
                      )}
                    </Stack>
                    <ActionIcon
                      color="red"
                      onClick={() => {
                        const timeSlots = [...slotForm.values.timeSlots];
                        timeSlots.splice(index, 1);
                        slotForm.setFieldValue('timeSlots', timeSlots);
                      }}
                      mt={index === 0 ? 25 : 0}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  leftIcon={<IconPlus size={16} />}
                  variant="outline"
                  onClick={() => {
                    const timeSlots = [...slotForm.values.timeSlots];
                    timeSlots.push({ startTime: '', endTime: '', capacity: 1 });
                    slotForm.setFieldValue('timeSlots', timeSlots);
                  }}
                >
                  Add Time Window
                </Button>
              </Stack>
            )}
            <NumberInput
              label="Advance Booking Days"
              {...slotForm.getInputProps('advanceBookingDays')}
              min={0}
            />
            {showMetadataFields && entityType === BOOKING_TYPES.IPD && (
              <>
                <Select
                  label="Bed Type"
                  data={[
                    { value: 'ICU', label: 'ICU' },
                    { value: 'General', label: 'General' },
                    { value: 'Private', label: 'Private' },
                    { value: 'Semi-Private', label: 'Semi-Private' },
                  ]}
                  {...slotForm.getInputProps('bedType')}
                />
                <TextInput
                  label="Bed Number"
                  {...slotForm.getInputProps('bedNumber')}
                />
                <TextInput
                  label="Floor"
                  {...slotForm.getInputProps('floor')}
                />
                <TextInput
                  label="Ward"
                  {...slotForm.getInputProps('ward')}
                />
              </>
            )}
            {showMetadataFields && entityType === BOOKING_TYPES.LAB && (
              <>
                <TextInput
                  label="Test Type"
                  {...slotForm.getInputProps('testType')}
                />
                <TextInput
                  label="Test Name"
                  {...slotForm.getInputProps('testName')}
                />
              </>
            )}
            {showMetadataFields && entityType === BOOKING_TYPES.OPD && (
              <>
                <TextInput
                  label="Department"
                  {...slotForm.getInputProps('department')}
                />
                <Select
                  label="Consultation Type"
                  data={[
                    { value: CONSULTATION_TYPES.IN_PERSON, label: 'In-Person' },
                    { value: CONSULTATION_TYPES.TELECONSULTATION, label: 'Teleconsultation' },
                    { value: CONSULTATION_TYPES.BOTH, label: 'Both' },
                  ]}
                  {...slotForm.getInputProps('consultationType')}
                />
              </>
            )}
            <Group>
              <Button type="submit" loading={apiLoading}>
                {modalType === 'add' ? 'Add' : 'Update'}
              </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default SlotManagement;