
import { useNavigate } from 'react-router';
import { Container, Paper, Title, Text, Button, Alert } from '@mantine/core';
import { motion } from 'framer-motion';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import useRole from '../hooks/useRole.js';
import { VERIFICATION_STATUS } from '@arogyafirst/shared';
import { SkeletonStats } from './SkeletonLoader';

const ProtectedRoute = ({
  children,
  allowedRoles,
  requireVerification = false,
  fallback
}) => {
  const { status, user } = useAuth();
  const { hasRole } = useRole();
  const navigate = useNavigate();

  if (status === 'loading' || status === 'idle') {
    return (
      <Container 
        size="xl" 
        py="xl"
        role="status" 
        aria-live="polite" 
        aria-busy="true"
        aria-label="Loading page content"
      >
        <SkeletonStats count={4} />
      </Container>
    );
  }

  if (status === 'unauthenticated') {
    if (fallback) return fallback;
    return (
      <Container size="sm" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Paper withBorder shadow="md" p="xl" radius="md" style={{ textAlign: 'center' }} role="alert">
            <Title order={2} mb="md">Authentication Required</Title>
            <Text mb="lg">Please log in to access this page.</Text>
            <Button onClick={() => navigate('/login')} aria-label="Go to login page">Go to Login</Button>
          </Paper>
        </motion.div>
      </Container>
    );
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    if (fallback) return fallback;
    return (
      <Container size="sm" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Paper withBorder shadow="md" p="xl" radius="md" style={{ textAlign: 'center' }} role="alert">
            <Title order={2} mb="md">Access Denied</Title>
            <Text mb="lg">You don't have permission to access this page.</Text>
            <Button onClick={() => navigate('/dashboard')} aria-label="Go to dashboard">Go to Dashboard</Button>
          </Paper>
        </motion.div>
      </Container>
    );
  }

  if (requireVerification && user?.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle />} color="yellow" title="Verification Pending">
          Your account is pending verification. Please check back later or contact support.
        </Alert>
      </Container>
    );
  }

  return children;
};

export default ProtectedRoute;
