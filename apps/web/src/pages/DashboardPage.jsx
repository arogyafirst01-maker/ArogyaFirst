import { Container, Title, Text, Card, SimpleGrid, Stack, Badge, Group, Button } from '@mantine/core';
import { IconArrowsExchange, IconPlus } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import useRole from '../hooks/useRole.js';
import { Link, useNavigate, useLocation } from 'react-router';
import { ROLES } from '@arogyafirst/shared';
import { useState, useEffect } from 'react';
import useAuthFetch from '../hooks/useAuthFetch.js';
import ReferralModal from '../components/ReferralModal';
import { SkeletonStats } from '../components/SkeletonLoader';
import { usePageTitle } from '../hooks/usePageTitle';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { fetchData } = useAuthFetch();
  
  const [referralStats, setReferralStats] = useState({ sent: 0, received: 0, pending: 0 });
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [healthProfile, setHealthProfile] = useState({ totalBookings: 0, upcomingAppointments: 0, totalDocuments: 0, totalPrescriptions: 0 });
  const [loadingHealthProfile, setLoadingHealthProfile] = useState(false);

  // Redirect hospital, lab, and pharmacy users to their dedicated dashboards
  // Only redirect if currently on /dashboard path to avoid blocking navigation to other pages
  const location = useLocation();
  useEffect(() => {
    // Only redirect if we're actually on the /dashboard route
    if (location.pathname !== '/dashboard') return;
    
    if (role === ROLES.HOSPITAL) {
      navigate('/hospital-dashboard', { replace: true });
      return;
    }
    if (role === ROLES.DOCTOR) {
      navigate('/patients', { replace: true });
      return;
    }
    if (role === ROLES.LAB) {
      navigate('/lab-dashboard', { replace: true });
      return;
    }
    if (role === ROLES.PHARMACY) {
      navigate('/pharmacy-dashboard', { replace: true });
      return;
    }
  }, [role, navigate, location.pathname]);

  useEffect(() => {
    // Don't load data if we're redirecting to a specialized dashboard
    if (location.pathname !== '/dashboard') return;
    if ([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY].includes(role)) return;
    
    // Only patients remain on this dashboard
    if (user?._id && role === ROLES.PATIENT) {
      // No referral stats for patients
    }
  }, [user, role, location.pathname]);

  useEffect(() => {
    // Don't load data if we're redirecting to a specialized dashboard
    if (location.pathname !== '/dashboard') return;
    
    if (user?._id && role === ROLES.PATIENT) {
      loadHealthProfile();
    }
  }, [user, role, location.pathname]);

  const loadReferralStats = async () => {
    try {
      setLoadingStats(true);
      const sentTotal = await fetchData(`/api/referrals/source/${user._id}`);
      const receivedTotal = await fetchData(`/api/referrals/target/${user._id}`);
      const receivedPending = await fetchData(`/api/referrals/target/${user._id}?status=PENDING`);
      
      setReferralStats({
        sent: sentTotal?.data?.length || 0,
        received: receivedTotal?.data?.length || 0,
        pending: receivedPending?.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load referral stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadHealthProfile = async () => {
    try {
      setLoadingHealthProfile(true);
      const result = await fetchData('/api/patients/health-profile');
      
      if (result?.data) {
        setHealthProfile({
          totalBookings: result.data.totalBookings || 0,
          upcomingAppointments: result.data.upcomingAppointments || 0,
          totalDocuments: result.data.totalDocuments || 0,
          totalPrescriptions: result.data.totalPrescriptions || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load health profile:', error);
    } finally {
      setLoadingHealthProfile(false);
    }
  };

  if (role === ROLES.ADMIN) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Title order={2}>Admin Dashboard</Title>
          <Text size="lg">Welcome, {user.email}!</Text>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500} size="lg" mb="md">Quick Actions</Text>
            <Button component={Link} to="/admin">View Verification Queue</Button>
          </Card>
        </Stack>
      </Container>
    );
  }

  // Generic dashboard for patients and doctors (role-specific dashboards exist for hospitals, labs, pharmacies)
  // Hospitals, labs, and pharmacies are automatically redirected to their dedicated dashboards above
  // Hospitals, labs, and pharmacies are automatically redirected to their dedicated dashboards above

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Title order={2}>Dashboard</Title>
          <Badge color="brand" size="lg">
            {role}
          </Badge>
        </Group>
        <Text size="lg">Welcome back, {user.email}!</Text>
        
        {role === ROLES.PATIENT && (
          <>
            {loadingHealthProfile ? (
              <SkeletonStats count={4} />
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" role="region" aria-label="Dashboard statistics">
                {[
                  { label: 'Total Bookings', value: healthProfile.totalBookings, ariaLabel: `Total bookings: ${healthProfile.totalBookings}` },
                  { label: 'Upcoming Appointments', value: healthProfile.upcomingAppointments, ariaLabel: `Upcoming appointments: ${healthProfile.upcomingAppointments}` },
                  { label: 'Documents', value: healthProfile.totalDocuments, ariaLabel: `Total documents: ${healthProfile.totalDocuments}` },
                  { label: 'Prescriptions', value: healthProfile.totalPrescriptions, ariaLabel: `Total prescriptions: ${healthProfile.totalPrescriptions}` },
                ].map((stat, index) => (
                  <Card key={index} shadow="sm" padding="lg" radius="md" withBorder aria-label={stat.ariaLabel}>
                    <Text fw={500} size="lg">{stat.label}</Text>
                    <Text size="xl" mt="sm" aria-live="polite">{stat.value}</Text>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </>
        )}

        {/* Quick Actions for Patients */}
        {role === ROLES.PATIENT && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={500} size="lg" mb="md">Quick Actions</Text>
            <Group>
              <Button 
                component={Link}
                to="/bookings/new"
                leftSection={<IconPlus size={16} />}
              >
                Book Appointment
              </Button>
              <Button 
                component={Link}
                to="/bookings"
                variant="outline"
              >
                View Bookings
              </Button>
              <Button 
                component={Link}
                to="/documents"
                variant="outline"
              >
                My Documents
              </Button>
              <Button 
                component={Link}
                to="/prescriptions"
                variant="outline"
              >
                Prescriptions
              </Button>
            </Group>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
