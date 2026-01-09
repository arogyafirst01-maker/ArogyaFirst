import { Stack, NavLink, ScrollArea, Divider, Text, Badge, Group, Tooltip } from '@mantine/core';
import {
  IconHome,
  IconCalendar,
  IconFileText,
  IconPill,
  IconUsers,
  IconBuildingHospital,
  IconFlask,
  IconStethoscope,
  IconReportMedical,
  IconShieldCheck,
  IconArrowsExchange,
  IconChartBar,
  IconHistory,
  IconAlertCircle,
  IconTruck,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import useRole from '../hooks/useRole.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import useAuthFetch from '../hooks/useAuthFetch.js';
import { ROLES, VERIFICATION_STATUS } from '@arogyafirst/shared';

const getNavigationItems = (role) => {
  switch (role) {
    case ROLES.PATIENT:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/dashboard' },
        { label: 'Book Appointment', icon: IconCalendar, path: '/bookings/new' },
        { label: 'My Bookings', icon: IconCalendar, path: '/bookings' },
        { label: 'Medical History', icon: IconHistory, path: '/medical-history' },
        { label: 'Medical Records', icon: IconFileText, path: '/documents' },
        { label: 'Prescriptions', icon: IconPill, path: '/prescriptions' },
        { label: 'Health Awareness', icon: IconReportMedical, path: '/health-awareness' },
      ];
    case ROLES.HOSPITAL:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/hospital-dashboard' },
        { label: 'Bookings', icon: IconCalendar, path: '/bookings' },
        { label: 'Referrals', icon: IconArrowsExchange, path: '/referrals' },
        { label: 'Doctors', icon: IconStethoscope, path: '/doctors' },
        { label: 'Labs', icon: IconFlask, path: '/labs' },
        { label: 'Beds', icon: IconBuildingHospital, path: '/beds' },
        { label: 'Staff', icon: IconUsers, path: '/staff' },
        { label: 'Pharmacy', icon: IconPill, path: '/pharmacy' },
      ];
    case ROLES.DOCTOR:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/patients' },
        { label: 'My Schedule', icon: IconCalendar, path: '/schedule' },
        { label: 'Bookings', icon: IconCalendar, path: '/bookings' },
        { label: 'Prescriptions', icon: IconPill, path: '/prescriptions' },
        { label: 'Referrals', icon: IconArrowsExchange, path: '/referrals' },
        { label: 'Consultations', icon: IconStethoscope, path: '/consultations' },
      ];
    case ROLES.LAB:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/lab-dashboard' },
        { label: 'Test Bookings', icon: IconCalendar, path: '/bookings' },
        { label: 'Referrals', icon: IconArrowsExchange, path: '/referrals' },
        { label: 'Reports', icon: IconFileText, path: '/reports' },
        { label: 'Machines', icon: IconFlask, path: '/machines' },
      ];
    case ROLES.PHARMACY:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/pharmacy-dashboard' },
        { label: 'Purchase Orders', icon: IconTruck, path: '/purchase-orders' },
        { label: 'Prescriptions', icon: IconPill, path: '/prescriptions' },
        { label: 'Referrals', icon: IconArrowsExchange, path: '/referrals' },
        { label: 'Inventory', icon: IconFileText, path: '/inventory' },
        { label: 'Billing', icon: IconFileText, path: '/billing' },
      ];
    case ROLES.ADMIN:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/dashboard' },
        { label: 'Verification Queue', icon: IconShieldCheck, path: '/admin' },
      ];
    default:
      return [
        { label: 'Dashboard', icon: IconHome, path: '/dashboard' },
        { label: 'My Schedule', icon: IconCalendar, path: '/schedule' },
        { label: 'Bookings', icon: IconCalendar, path: '/bookings' },
        { label: 'Patients', icon: IconUsers, path: '/patients' },
        { label: 'Prescriptions', icon: IconPill, path: '/prescriptions' },
        { label: 'Consultations', icon: IconStethoscope, path: '/consultations' },
      ];
  }
};

const isActive = (currentPath, itemPath) => {
  // Exact match for dashboard paths
  if (itemPath === '/dashboard' || itemPath === '/hospital-dashboard' || itemPath === '/lab-dashboard' || itemPath === '/pharmacy-dashboard') {
    return currentPath === itemPath;
  }
  
  // Special handling for booking paths to prevent both being highlighted
  // /bookings/new should only match /bookings/new, not /bookings
  if (itemPath === '/bookings') {
    return currentPath === '/bookings';
  }
  if (itemPath === '/bookings/new') {
    return currentPath === '/bookings/new' || currentPath.startsWith('/bookings/new/');
  }
  
  // For other paths, use startsWith matching
  return currentPath.startsWith(itemPath);
};

function Sidebar({ opened }) {
  const { user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const { fetchData } = useAuthFetch();
  const focusTrapRef = useFocusTrap(opened);
  
  const [pendingReferralCount, setPendingReferralCount] = useState(0);
  const [referralCountError, setReferralCountError] = useState(null);

  const items = getNavigationItems(role);

  useEffect(() => {
    // Fetch pending referral count for provider roles
    if (user?._id && [ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY].includes(role)) {
      loadPendingCount();
    }
  }, [user, role]);

  const loadPendingCount = async () => {
    try {
      setReferralCountError(null); // Clear previous errors
      const response = await fetchData(`/api/referrals/target/${user._id}?status=PENDING`);
      setPendingReferralCount(response?.data?.length || 0);
    } catch (error) {
      console.error('Failed to load pending referral count:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load count';
      setReferralCountError(errorMsg);
    }
  };

  return (
    <ScrollArea h="calc(100vh - 120px)" ref={focusTrapRef}>
      <Stack gap="xs" p="md">
        <Text size="lg" fw={600}>
          {role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'User'}
        </Text>
        {user?.verificationStatus === VERIFICATION_STATUS.PENDING && (
          <Badge color="yellow">Verification Pending</Badge>
        )}
        <Divider />
        {items.map((item, index) => {
          const isReferralsLink = item.path === '/referrals';
          const showBadge = isReferralsLink && pendingReferralCount > 0;
          const showError = isReferralsLink && referralCountError;
          
          return (
            <NavLink
              key={index}
              component={Link}
              to={item.path}
              label={
                showBadge ? (
                  <Group position="apart" style={{ width: '100%' }}>
                    <Text>{item.label}</Text>
                    <Badge color="red" size="sm" aria-label={`${pendingReferralCount} pending referrals`}>{pendingReferralCount}</Badge>
                  </Group>
                ) : showError ? (
                  <Group position="apart" style={{ width: '100%' }}>
                    <Text>{item.label}</Text>
                    <Tooltip label={`Error loading count: ${referralCountError}`} withArrow>
                      <IconAlertCircle size={16} color="orange" aria-label="Error loading referral count" />
                    </Tooltip>
                  </Group>
                ) : (
                  item.label
                )
              }
              leftSection={<item.icon size={16} aria-hidden="true" />}
              active={isActive(location.pathname, item.path)}
              aria-label={`Go to ${item.label}`}
              aria-current={isActive(location.pathname, item.path) ? 'page' : undefined}
            />
          );
        })}
      </Stack>
    </ScrollArea>
  );
}

export default Sidebar;
