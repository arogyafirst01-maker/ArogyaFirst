import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Tabs,
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  Modal,
  TextInput,
  Select,
  Textarea,
  ActionIcon,
  Paper,
  SimpleGrid,
  Loader,
  Menu,
  Divider,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconUsers,
  IconBed,
  IconCurrencyRupee,
  IconStethoscope,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconBedFilled,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { SHIFT_TYPES, SCHEDULE_STATUS, BED_ASSIGNMENT_STATUS, PRIORITY_LEVELS, BED_TYPES } from '@arogyafirst/shared';

const COLORS = ['#228BE6', '#40C057', '#FD7E14', '#FA5252', '#BE4BDB'];

export default function HospitalDashboardPage() {
  usePageTitle('Hospital Dashboard');
  const { fetchData } = useAuthFetch();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Location selector for chain hospitals
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [locationOptions, setLocationOptions] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Split loading states for better UX
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  
  // Overview state
  const [metrics, setMetrics] = useState({
    opdCount: 0,
    ipdQueueCount: 0,
    bedOccupancy: { rate: 0, occupied: 0, total: 0 },
    monthlyRevenue: 0,
    surgeriesCount: 0
  });
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    dailyBookings: [],
    bookingsByType: [],
    bookingsByDepartment: []
  });
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return [startDate, endDate];
  });
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  // Export state
  const [exportDateRange, setExportDateRange] = useState([null, null]);
  const [exportReportType, setExportReportType] = useState('bookings');
  const [exportLoading, setExportLoading] = useState(false);
  
  // Scheduling state
  const [schedules, setSchedules] = useState([]);
  const [scheduleModalOpened, setScheduleModalOpened] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Bed Allocation & Queue Management state
  const [queueData, setQueueData] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [selectedBedIndex, setSelectedBedIndex] = useState(null);
  const [allocationModalOpened, setAllocationModalOpened] = useState(false);
  const [autoAllocateLoading, setAutoAllocateLoading] = useState(false);
  
  const scheduleForm = useForm({
    initialValues: {
      staffId: null,
      date: new Date(),
      shiftType: '',
      startTime: '',
      endTime: '',
      department: '',
      notes: ''
    },
    validate: {
      staffId: (value) => (value === null || value === undefined ? 'Staff member is required' : null),
      date: (value) => (!value ? 'Date is required' : null),
      shiftType: (value) => (!value ? 'Shift type is required' : null),
      startTime: (value) => (!value ? 'Start time is required' : null),
      endTime: (value) => (!value ? 'End time is required' : null)
    }
  });
  
  // Fetch dashboard metrics
  const fetchDashboard = useCallback(async () => {
    if (!user?._id) return;
    setLoadingMetrics(true);
    try {
      // Add cache-busting timestamp and locationId to bypass browser cache
      const timestamp = new Date().getTime();
      const locationParam = selectedLocation !== 'all' ? `&locationId=${selectedLocation}` : '';
      const url = `/api/hospitals/${user._id}/dashboard?t=${timestamp}${locationParam}`;
      console.log('[Hospital Dashboard] Fetching from:', url);
      const data = await fetchData(url);
      console.log('[Hospital Dashboard] Response:', data);
      if (data?.data?.metrics) {
        console.log('[Hospital Dashboard] Setting metrics:', data.data.metrics);
        setMetrics(data.data.metrics);
      } else {
        console.warn('[Hospital Dashboard] No metrics in response:', data);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load dashboard metrics',
        color: 'red'
      });
      // Set default metrics on error
      setMetrics({
        opdCount: 0,
        ipdQueueCount: 0,
        bedOccupancy: { rate: 0, occupied: 0, total: 0 },
        monthlyRevenue: 0,
        surgeriesCount: 0
      });
    } finally {
      setLoadingMetrics(false);
    }
  }, [user?._id, fetchData, selectedLocation]);
  
  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!user?._id) return;
    setLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange[1]) params.append('endDate', dateRange[1].toISOString());
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedLocation && selectedLocation !== 'all') params.append('locationId', selectedLocation);
      
      const data = await fetchData(`/api/hospitals/${user._id}/analytics?${params}`);
      if (data?.data) {
        setAnalyticsData({
          dailyBookings: data.data.dailyBookings || [],
          bookingsByType: data.data.bookingsByType || [],
          bookingsByDepartment: data.data.bookingsByDepartment || []
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load analytics data',
        color: 'red'
      });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [user?._id, fetchData, dateRange, selectedDepartment, selectedLocation]);
  
  // Fetch staff schedules
  const fetchSchedules = useCallback(async () => {
    if (!user?._id) return;
    setLoadingSchedules(true);
    try {
      const data = await fetchData(`/api/hospitals/${user._id}/staff-schedules`);
      if (data?.data?.schedules) {
        setSchedules(data.data.schedules);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load schedules',
        color: 'red'
      });
    } finally {
      setLoadingSchedules(false);
    }
  }, [user?._id, fetchData]);
  
  // Fetch hospital profile for staff list
  const fetchProfile = useCallback(async () => {
    try {
      const data = await fetchData('/api/hospitals/profile');
      if (data?.data?.user?.hospitalData) {
        const { staff, doctors } = data.data.user.hospitalData;
        
        // Combine staff and doctors, create indexed list
        const allStaff = [
          ...(staff || []).map((s, idx) => ({ 
            ...s, 
            id: idx.toString(),
            label: `${s.name} - ${s.role}`
          })),
          ...(doctors || []).map((d, idx) => ({ 
            ...d,
            id: ((staff?.length || 0) + idx).toString(),
            label: `${d.name} - Doctor`
          }))
        ];
        
        setStaffList(allStaff);
        
        // Extract unique departments
        const depts = [...new Set([
          ...(staff || []).map(s => s.department).filter(Boolean),
          ...(doctors || []).map(d => d.specialization).filter(Boolean)
        ])];
        setDepartments(depts);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, [fetchData]);
  
  // Load locations for chain hospitals
  const loadLocations = useCallback(async () => {
    if (!user?.hospitalData?.isChain) return;
    setLoadingLocations(true);
    try {
      const data = await fetchData('/api/hospitals/locations');
      if (data?.data?.locations) {
        const options = [
          { value: 'all', label: 'All Locations' },
          ...data.data.locations.map(loc => ({
            value: loc.locationId,
            label: `${loc.name} (${loc.branchCode})`
          }))
        ];
        setLocationOptions(options);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  }, [user?.hospitalData?.isChain, fetchData]);
  
  // Fetch queue for bed allocation
  const fetchQueue = useCallback(async () => {
    if (!user?._id) return;
    setLoadingQueue(true);
    try {
      const url = `/api/hospitals/${user._id}/queue${selectedLocation !== 'all' ? `?locationId=${selectedLocation}` : ''}`;
      const data = await fetchData(url);
      if (data?.data?.queue) {
        setQueueData(data.data.queue);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load queue',
        color: 'red'
      });
      setQueueData([]);
    } finally {
      setLoadingQueue(false);
    }
  }, [user?._id, fetchData, selectedLocation]);
  
  // Fetch available beds
  const fetchAvailableBeds = useCallback(async () => {
    if (!user?._id) return;
    setLoadingBeds(true);
    try {
      const url = `/api/hospitals/${user._id}/available-beds${selectedLocation !== 'all' ? `?locationId=${selectedLocation}` : ''}`;
      const data = await fetchData(url);
      if (data?.data?.availableBeds) {
        setAvailableBeds(data.data.availableBeds);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to load beds',
        color: 'red'
      });
      setAvailableBeds([]);
    } finally {
      setLoadingBeds(false);
    }
  }, [user?._id, fetchData, selectedLocation]);
  
  // Handle manual bed allocation
  const handleManualAllocate = async (queueItem, bedIndex) => {
    if (!user?._id || bedIndex == null) return;
    setAllocating(true);
    try {
      await fetchData(`/api/hospitals/${user._id}/allocate-bed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: queueItem._id, bedIndex })
      });
      notifications.show({
        title: 'Success',
        message: 'Bed allocated successfully',
        color: 'green'
      });
      setAllocationModalOpened(false);
      setSelectedQueueItem(null);
      await fetchQueue();
      await fetchAvailableBeds();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to allocate bed',
        color: 'red'
      });
    } finally {
      setAllocating(false);
    }
  };
  
  // Handle auto-allocation
  const handleAutoAllocate = async () => {
    if (!user?._id) return;
    setAutoAllocateLoading(true);
    try {
      const data = await fetchData(`/api/hospitals/${user._id}/auto-allocate${selectedLocation !== 'all' ? `?locationId=${selectedLocation}` : ''}`, {
        method: 'POST'
      });
      notifications.show({
        title: 'Success',
        message: `Allocated ${data.allocatedCount || 0} beds successfully`,
        color: 'green'
      });
      await fetchQueue();
      await fetchAvailableBeds();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to auto-allocate beds',
        color: 'red'
      });
    } finally {
      setAutoAllocateLoading(false);
    }
  };
  
  // Handle removal from queue
  const handleRemoveFromQueue = async (bookingId) => {
    if (!window.confirm('Are you sure you want to remove this patient from the queue?')) return;
    if (!user?._id) return;
    
    try {
      await fetchData(`/api/hospitals/${user._id}/queue/${bookingId}`, {
        method: 'DELETE'
      });
      notifications.show({
        title: 'Success',
        message: 'Patient removed from queue',
        color: 'green'
      });
      await fetchQueue();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to remove from queue',
        color: 'red'
      });
    }
  };
  
  // Handle bed release
  const handleReleaseBed = async (bookingId) => {
    if (!window.confirm('Are you sure you want to release this bed?')) return;
    if (!user?._id) return;
    
    try {
      await fetchData(`/api/hospitals/${user._id}/release-bed/${bookingId}`, {
        method: 'PUT'
      });
      notifications.show({
        title: 'Success',
        message: 'Bed released successfully',
        color: 'green'
      });
      await fetchQueue();
      await fetchAvailableBeds();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to release bed',
        color: 'red'
      });
    }
  };
  
  // Create or update schedule
  const handleScheduleSubmit = async (values) => {
    if (!user?._id) return;
    setSavingSchedule(true);
    try {
      const payload = {
        ...values,
        staffId: values.staffId,
        date: values.date.toISOString().split('T')[0]
      };
      
      if (editingSchedule) {
        await fetchData(`/api/hospitals/${user._id}/staff-schedule/${editingSchedule._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        notifications.show({
          title: 'Success',
          message: 'Schedule updated successfully',
          color: 'green'
        });
      } else {
        await fetchData(`/api/hospitals/${user._id}/staff-schedule`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        notifications.show({
          title: 'Success',
          message: 'Schedule created successfully',
          color: 'green'
        });
      }
      
      setScheduleModalOpened(false);
      setEditingSchedule(null);
      scheduleForm.reset();
      fetchSchedules();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save schedule',
        color: 'red'
      });
    } finally {
      setSavingSchedule(false);
    }
  };
  
  // Delete schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    if (!user?._id) return;
    
    setSavingSchedule(true);
    try {
      await fetchData(`/api/hospitals/${user._id}/staff-schedule/${scheduleId}`, {
        method: 'DELETE'
      });
      notifications.show({
        title: 'Success',
        message: 'Schedule deleted successfully',
        color: 'green'
      });
      fetchSchedules();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete schedule',
        color: 'red'
      });
    } finally {
      setSavingSchedule(false);
    }
  };
  
  // Open edit modal
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    scheduleForm.setValues({
      staffId: schedule.staffId,
      date: new Date(schedule.date),
      shiftType: schedule.shiftType,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      department: schedule.department || '',
      notes: schedule.notes || ''
    });
    setScheduleModalOpened(true);
  };
  
  // Open create modal
  const handleCreateSchedule = () => {
    setEditingSchedule(null);
    scheduleForm.reset();
    setScheduleModalOpened(true);
  };
  
  // Export handler
  const handleExport = async (format) => {
    if (!exportDateRange[0] || !exportDateRange[1]) {
      notifications.show({
        title: 'Error',
        message: 'Please select a date range',
        color: 'red',
      });
      return;
    }

    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        reportType: exportReportType,
        format,
        startDate: exportDateRange[0].toISOString(),
        endDate: exportDateRange[1].toISOString(),
      });
      
      if (selectedDepartment) {
        params.append('department', selectedDepartment);
      }

      // Add locationId if selected and not 'all'
      if (selectedLocation && selectedLocation !== 'all') {
        params.append('locationId', selectedLocation);
      }

      const response = await fetch(`/api/hospitals/${user._id}/export?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hospital-${exportReportType}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        notifications.show({
          title: 'Success',
          message: 'Report exported successfully',
          color: 'green',
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to export report',
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProfile();
    loadLocations();
    fetchDashboard();
  }, [fetchProfile, fetchDashboard, loadLocations]);
  
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'scheduling') {
      fetchSchedules();
    } else if (activeTab === 'bedAllocation') {
      fetchQueue();
      fetchAvailableBeds();
    }
  }, [activeTab, fetchAnalytics, fetchSchedules, fetchQueue, fetchAvailableBeds]);
  
  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Hospital Dashboard</Title>
          {user?.hospitalData?.isChain && (
            <Select
              label="Select Location"
              placeholder="Choose branch location"
              value={selectedLocation}
              onChange={(value) => {
                setSelectedLocation(value);
              }}
              data={locationOptions}
              disabled={loadingLocations || locationOptions.length === 0}
              searchable
              clearable={false}
              style={{ marginTop: '8px', maxWidth: '300px' }}
            />
          )}
        </div>
        <Menu shadow="md" width={280} closeOnItemClick={false}>
          <Menu.Target>
            <Button leftSection={<IconDownload size={16} />} loading={exportLoading}>
              Export Report
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Report Type</Menu.Label>
            <Select
              size="xs"
              value={exportReportType}
              onChange={setExportReportType}
              data={[
                { value: 'bookings', label: 'Bookings Report' },
                { value: 'revenue', label: 'Revenue Report' },
                { value: 'staff-schedules', label: 'Staff Schedules' },
                { value: 'department-analytics', label: 'Department Analytics' },
              ]}
              mb="xs"
              px="xs"
            />
            <Divider />
            <Menu.Label>Date Range</Menu.Label>
            <DatePickerInput
              type="range"
              size="xs"
              placeholder="Select date range"
              value={exportDateRange}
              onChange={setExportDateRange}
              maxDate={new Date()}
              mb="xs"
              mx="xs"
            />
            <Divider />
            <Menu.Item
              leftSection={<IconFileTypeCsv size={16} />}
              onClick={() => handleExport('csv')}
            >
              Export as CSV
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypePdf size={16} />}
              onClick={() => handleExport('pdf')}
            >
              Export as PDF
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconUsers size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="analytics" leftSection={<IconCurrencyRupee size={16} />}>
            Analytics
          </Tabs.Tab>
          <Tabs.Tab value="scheduling" leftSection={<IconCalendar size={16} />}>
            Staff Scheduling
          </Tabs.Tab>
          <Tabs.Tab value="bedAllocation" leftSection={<IconBedFilled size={16} />}>
            Bed Allocation
          </Tabs.Tab>
        </Tabs.List>
        
        <Tabs.Panel value="overview" pt="xl">
          {loadingMetrics ? (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          ) : (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="apart" mb="xs">
                    <Text size="sm" c="dimmed">Today's OPD</Text>
                    <IconUsers size={20} color="#228BE6" />
                  </Group>
                  <Text size="xl" fw={700}>{metrics.opdCount}</Text>
                  <Text size="xs" c="dimmed" mt="xs">Outpatient visits</Text>
                </Card>
                
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="apart" mb="xs">
                    <Text size="sm" c="dimmed">Bed Occupancy</Text>
                    <IconBed size={20} color="#40C057" />
                  </Group>
                  <Text size="xl" fw={700}>{metrics.bedOccupancy.rate}%</Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    {metrics.bedOccupancy.occupied}/{metrics.bedOccupancy.total} beds
                  </Text>
                </Card>
                
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="apart" mb="xs">
                    <Text size="sm" c="dimmed">IPD Queue</Text>
                    <IconBedFilled size={20} color="#A78BFA" />
                  </Group>
                  <Text size="xl" fw={700}>{metrics.ipdQueueCount || 0}</Text>
                  <Text size="xs" c="dimmed" mt="xs">Waiting for bed assignment</Text>
                </Card>
                
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="apart" mb="xs">
                    <Text size="sm" c="dimmed">Monthly Revenue</Text>
                    <IconCurrencyRupee size={20} color="#FD7E14" />
                  </Group>
                  <Text size="xl" fw={700}>₹{metrics.monthlyRevenue.toLocaleString()}</Text>
                  <Text size="xs" c="dimmed" mt="xs">This month</Text>
                </Card>
              </SimpleGrid>
              
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="apart" mb="xs">
                  <Text size="sm" c="dimmed">Surgeries</Text>
                  <IconStethoscope size={20} color="#FA5252" />
                </Group>
                <Text size="xl" fw={700}>{metrics.surgeriesCount}</Text>
                <Text size="xs" c="dimmed" mt="xs">This month</Text>
              </Card>
            </Stack>
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="analytics" pt="xl">
          {loadingAnalytics ? (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          ) : (
            <Stack gap="xl">
            <Group>
              <DatePickerInput
                type="range"
                label="Date Range"
                placeholder="Pick date range"
                value={dateRange}
                onChange={setDateRange}
                style={{ flex: 1 }}
              />
              <Select
                label="Department"
                placeholder="All departments"
                data={departments}
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                clearable
                style={{ flex: 1 }}
              />
            </Group>
            
            <Paper shadow="sm" p="md" withBorder>
              <Text size="lg" fw={600} mb="md">Daily Bookings & Revenue Trend</Text>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.dailyBookings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#228BE6" 
                    name="Bookings"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#40C057" 
                    name="Revenue (₹)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper shadow="sm" p="md" withBorder>
                  <Text size="lg" fw={600} mb="md">Bookings by Type</Text>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.bookingsByType}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {analyticsData.bookingsByType.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper shadow="sm" p="md" withBorder>
                  <Text size="lg" fw={600} mb="md">Bookings by Department</Text>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.bookingsByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#228BE6" name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid.Col>
            </Grid>
          </Stack>
          )}
        </Tabs.Panel>
        
        <Tabs.Panel value="scheduling" pt="xl">
          {loadingSchedules ? (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          ) : (
            <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Staff Schedules</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={handleCreateSchedule}>
                Create Schedule
              </Button>
            </Group>
            
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Staff</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Shift</Table.Th>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>Department</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {schedules.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} align="center">
                      <Text c="dimmed">No schedules found</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  schedules.map((schedule) => (
                    <Table.Tr key={schedule._id}>
                      <Table.Td>{schedule.staffSnapshot.name}</Table.Td>
                      <Table.Td>{new Date(schedule.date).toLocaleDateString()}</Table.Td>
                      <Table.Td>{schedule.shiftType}</Table.Td>
                      <Table.Td>{schedule.startTime} - {schedule.endTime}</Table.Td>
                      <Table.Td>{schedule.department || '-'}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            schedule.status === SCHEDULE_STATUS.SCHEDULED ? 'blue' :
                            schedule.status === SCHEDULE_STATUS.COMPLETED ? 'green' :
                            schedule.status === SCHEDULE_STATUS.CANCELLED ? 'red' : 'gray'
                          }
                        >
                          {schedule.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDeleteSchedule(schedule._id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Stack>
          )}
        </Tabs.Panel>
        
        {/* Bed Allocation & Queue Management Tab */}
        <Tabs.Panel value="bedAllocation" pt="xl">
          <Stack gap="lg">
            <Group justify="space-between">
              <Title order={3}>Bed Allocation & Queue Management</Title>
              <Button 
                onClick={handleAutoAllocate}
                loading={autoAllocateLoading}
                color="green"
              >
                Auto Allocate Beds
              </Button>
            </Group>
            
            <Grid>
              {/* Queue Section */}
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text weight={500} size="lg">Waiting Queue</Text>
                      <Group gap={4}>
                        <Badge>{queueData.length}</Badge>
                        <Text size="sm" c="dimmed">in queue</Text>
                      </Group>
                    </Group>
                    
                    {loadingQueue ? (
                      <Group justify="center" py="xl">
                        <Loader size="sm" />
                      </Group>
                    ) : queueData.length > 0 ? (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Position</Table.Th>
                            <Table.Th>Patient Name</Table.Th>
                            <Table.Th>Priority</Table.Th>
                            <Table.Th>Bed Type</Table.Th>
                            <Table.Th>Score</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {queueData.map((item, idx) => (
                            <Table.Tr key={item._id}>
                              <Table.Td>
                                <Badge variant="filled">#{item.queuePosition || idx + 1}</Badge>
                              </Table.Td>
                              <Table.Td>{item.patientSnapshot?.name || item.patientId?.name || 'N/A'}</Table.Td>
                              <Table.Td>
                                <Badge 
                                  color={
                                    item.priority === PRIORITY_LEVELS.CRITICAL ? 'red' :
                                    item.priority === PRIORITY_LEVELS.HIGH ? 'orange' :
                                    item.priority === PRIORITY_LEVELS.MEDIUM ? 'yellow' : 'blue'
                                  }
                                >
                                  {item.priority}
                                </Badge>
                              </Table.Td>
                              <Table.Td>{item.bedRequirement?.bedType || 'N/A'}</Table.Td>
                              <Table.Td>{item.priorityScore}</Table.Td>
                              <Table.Td>
                                <Group gap={4}>
                                  <ActionIcon 
                                    size="sm" 
                                    color="blue"
                                    onClick={() => {
                                      setSelectedQueueItem(item);
                                      setAllocationModalOpened(true);
                                    }}
                                  >
                                    <IconCheck size={16} />
                                  </ActionIcon>
                                  <ActionIcon 
                                    size="sm" 
                                    color="red"
                                    onClick={() => handleRemoveFromQueue(item._id)}
                                  >
                                    <IconX size={16} />
                                  </ActionIcon>
                                  {item.assignedBed && (
                                    <ActionIcon 
                                      size="sm" 
                                      color="orange"
                                      onClick={() => handleReleaseBed(item._id)}
                                    >
                                      <IconAlertTriangle size={16} />
                                    </ActionIcon>
                                  )}
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text align="center" c="dimmed">No patients in queue</Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
              
              {/* Available Beds Section */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text weight={500} size="lg">Available Beds</Text>
                      <Button 
                        size="xs" 
                        variant="subtle"
                        onClick={fetchAvailableBeds}
                        loading={loadingBeds}
                      >
                        Refresh
                      </Button>
                    </Group>
                    
                    {loadingBeds ? (
                      <Group justify="center" py="xl">
                        <Loader size="sm" />
                      </Group>
                    ) : availableBeds.length > 0 ? (
                      <Stack gap="xs">
                        {availableBeds.map((bed, idx) => (
                          <Paper key={idx} p="sm" withBorder>
                            <Group justify="space-between">
                              <div>
                                <Text size="sm" weight={500}>Bed {bed.bedNumber}</Text>
                                <Group gap={4}>
                                  <Badge size="sm" variant="dot">{bed.type}</Badge>
                                  <Text size="xs" c="dimmed">Floor {bed.floor}, Ward {bed.ward}</Text>
                                </Group>
                              </div>
                              <Badge color="green" size="sm">Available</Badge>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    ) : (
                      <Text align="center" c="dimmed" size="sm">No beds available</Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Tabs.Panel>
      </Tabs>
      
      {/* Bed Allocation Modal */}
      <Modal
        opened={allocationModalOpened}
        onClose={() => {
          setAllocationModalOpened(false);
          setSelectedQueueItem(null);
          setSelectedBedIndex(null);
        }}
        title="Allocate Bed"
        size="lg"
      >
        {selectedQueueItem && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">Patient Name</Text>
              <Text weight={500}>{selectedQueueItem.patientSnapshot?.name || selectedQueueItem.patientId?.name || 'N/A'}</Text>
            </div>
            
            <div>
              <Text size="sm" c="dimmed">Required Bed Type</Text>
              <Badge color="blue">{selectedQueueItem.bedRequirement?.bedType || 'Any'}</Badge>
            </div>
            
            <Select
              label="Select Bed"
              placeholder="Choose bed to allocate"
              value={selectedBedIndex?.toString() || null}
              data={availableBeds
                .filter(bed => !selectedQueueItem.bedRequirement?.bedType || bed.type === selectedQueueItem.bedRequirement?.bedType)
                .map((bed) => ({
                  value: bed.bedIndex?.toString(),
                  label: `Bed ${bed.bedNumber} - ${bed.type} (Floor ${bed.floor}, Ward ${bed.ward})`
                }))}
              onChange={(value) => {
                setSelectedBedIndex(value ? parseInt(value, 10) : null);
              }}
            />
            
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => {
                setAllocationModalOpened(false);
                setSelectedQueueItem(null);
                setSelectedBedIndex(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedBedIndex !== null) {
                    handleManualAllocate(selectedQueueItem, selectedBedIndex);
                  }
                }}
                loading={allocating}
                disabled={selectedBedIndex === null}
              >
                Confirm Allocation
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
      
      {/* Schedule Create/Edit Modal */}
      <Modal
        opened={scheduleModalOpened}
        onClose={() => {
          setScheduleModalOpened(false);
          setEditingSchedule(null);
          scheduleForm.reset();
        }}
        title={editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
        size="lg"
      >
        <form onSubmit={scheduleForm.onSubmit(handleScheduleSubmit)}>
          <Stack gap="md">
            <Select
              label="Staff Member"
              placeholder="Select staff member"
              data={staffList.map(s => ({ value: s.id, label: s.label }))}
              {...scheduleForm.getInputProps('staffId')}
              required
            />
            
            <DatePickerInput
              label="Date"
              placeholder="Pick date"
              {...scheduleForm.getInputProps('date')}
              required
            />
            
            <Select
              label="Shift Type"
              placeholder="Select shift type"
              data={Object.values(SHIFT_TYPES).map(s => ({ value: s, label: s }))}
              {...scheduleForm.getInputProps('shiftType')}
              required
            />
            
            <Group grow>
              <TextInput
                label="Start Time"
                placeholder="HH:MM"
                {...scheduleForm.getInputProps('startTime')}
                required
              />
              <TextInput
                label="End Time"
                placeholder="HH:MM"
                {...scheduleForm.getInputProps('endTime')}
                required
              />
            </Group>
            
            <Select
              label="Department"
              placeholder="Select department"
              data={departments}
              {...scheduleForm.getInputProps('department')}
            />
            
            <Textarea
              label="Notes"
              placeholder="Additional notes"
              {...scheduleForm.getInputProps('notes')}
              maxLength={500}
            />
            
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setScheduleModalOpened(false);
                  setEditingSchedule(null);
                  scheduleForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={savingSchedule}>
                {editingSchedule ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
