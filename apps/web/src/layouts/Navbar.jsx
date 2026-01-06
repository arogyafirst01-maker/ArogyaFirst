import { Group, Burger, Text, Menu, Avatar, UnstyledButton, rem, Box } from '@mantine/core';
import { IconChevronDown, IconLogout, IconUser, IconSettings } from '@tabler/icons-react';
import logo from '@/assets/logo.png';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router';
import useRole from '../hooks/useRole.js';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications.js';
import { ROLES } from '@arogyafirst/shared';

export default function Navbar({ opened, toggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { role } = useRole();

  const handleLogout = async () => {
    try {
      await logout();
      showSuccessNotification('Logged out successfully');
      navigate('/login');
    } catch (err) {
      showErrorNotification(err?.message || 'Logout failed');
    }
  };

  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : '';

  // Get user's display name based on role
  const getUserDisplayName = () => {
    if (!user) return 'User';
    // Check role-specific data objects for name
    if (user.patientData?.name) return user.patientData.name;
    if (user.doctorData?.name) return user.doctorData.name;
    if (user.hospitalData?.name) return user.hospitalData.name;
    if (user.labData?.name) return user.labData.name;
    if (user.pharmacyData?.name) return user.pharmacyData.name;
    // Fallback to email if no name found
    return user.email || 'User';
  };

  const displayName = getUserDisplayName();

  return (
    <Group justify="space-between" h="100%" px="md">
      <Group>
        <Burger 
          opened={opened} 
          onClick={toggle} 
          hiddenFrom="sm" 
          aria-label="Toggle navigation menu"
          aria-expanded={opened}
        />
        <Group 
          gap="sm" 
          component="a" 
          href="/" 
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          aria-label="ArogyaFirst home"
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img 
              src={logo} 
              alt="ArogyaFirst Logo" 
              style={{ 
                width: '130%',
                height: '130%',
                objectFit: 'contain',
              }} 
            />
          </div>
          <Text 
            size="lg" 
            fw={700} 
            c="brand"
          >
            ArogyaFirst
          </Text>
        </Group>
      </Group>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <UnstyledButton aria-label="User account menu">
            <Group gap="sm">
              <Avatar color="brand" radius="xl" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" fw={500}>
                {displayName}
              </Text>
              <IconChevronDown style={{ width: rem(12), height: rem(12) }} aria-hidden="true" />
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{displayRole}</Menu.Label>
          <Menu.Item leftSection={<IconUser style={{ width: rem(14), height: rem(14) }} />} onClick={() => navigate('/profile')}>
            Profile
          </Menu.Item>
          {role !== ROLES.ADMIN && (
            <Menu.Item leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />} onClick={() => navigate('/settings')}>
              Settings
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
            color="red"
            onClick={handleLogout}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}