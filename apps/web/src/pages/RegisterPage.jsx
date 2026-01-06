import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Stepper,
  SimpleGrid,
  ThemeIcon,
  Box,
  Group,
} from '@mantine/core';
import { IconUser, IconBuildingHospital, IconStethoscope, IconFlask, IconPill } from '@tabler/icons-react';
import logo from '@/assets/logo.png';
import { useAuth } from '../contexts/AuthContext.jsx';
import RoleForm from './RoleForm.jsx';
import { ROLES } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle';
// validateDateFormat not needed in this file

const roleIcons = {
  [ROLES.PATIENT]: IconUser,
  [ROLES.HOSPITAL]: IconBuildingHospital,
  [ROLES.DOCTOR]: IconStethoscope,
  [ROLES.LAB]: IconFlask,
  [ROLES.PHARMACY]: IconPill,
};

const roleNames = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.HOSPITAL]: 'Hospital',
  [ROLES.DOCTOR]: 'Doctor',
  [ROLES.LAB]: 'Lab',
  [ROLES.PHARMACY]: 'Pharmacy',
};

function RegisterPage() {
  usePageTitle('Register');
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { register, status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/dashboard');
    }
  }, [status, navigate]);

  

  const handleRoleSelect = (selectedRole) => {
    setError(null);
    setRole(selectedRole);
    setActive(1);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    try {
      // If values is a FormData (hospital registration with files), do not spread it
      if (values instanceof FormData) {
        await register(values);
      } else {
        await register({ role, ...values });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSelection = () => (
    <Stack gap="xl">
      {/* Logo */}
      <Group
        justify="center"
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/')}
      >
        <img 
          src={logo} 
          alt="ArogyaFirst Logo" 
          style={{ 
            width: 72, 
            height: 72, 
            objectFit: 'contain',
          }} 
        />
        <Text
          size="xl"
          fw={800}
          style={{
            background: 'linear-gradient(135deg, hsl(197 100% 36%), hsl(162 72% 36%))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}
        >
          ArogyaFirst
        </Text>
      </Group>

      <Title order={2} ta="center">Choose Your Role</Title>
      <SimpleGrid cols={2} spacing="md">
        {Object.values(ROLES).filter(r => r !== ROLES.ADMIN).map((r) => {
          const IconComponent = roleIcons[r];
          return (
            <Paper
              key={r}
              withBorder
              p="md"
              radius="md"
              style={{ cursor: 'pointer' }}
              onClick={() => handleRoleSelect(r)}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon size={60} radius="md" variant="light" color="brand">
                  <IconComponent size={32} />
                </ThemeIcon>
                <Text fw={500} size="lg">{roleNames[r]}</Text>
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );

  

  return (
    <Container size={600} my={40}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Stepper active={active} allowNextStepsSelect={false}>
          <Stepper.Step label="Select Role" description="Choose your role">
            {renderRoleSelection()}
          </Stepper.Step>
          <Stepper.Step label="Account Details" description="Fill in your details">
            {role && (
              <RoleForm
                key={role}
                role={role}
                onBack={() => setActive(0)}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
              />
            )}
          </Stepper.Step>
        </Stepper>
      </Paper>
    </Container>
  );
}

export default RegisterPage;