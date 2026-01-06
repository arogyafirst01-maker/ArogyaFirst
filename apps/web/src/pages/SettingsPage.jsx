import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Switch,
  Select,
  Alert,
  Divider,
  Tabs,
  LoadingOverlay,
} from '@mantine/core';
import { IconBell, IconShield } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import useAuthFetch from '../hooks/useAuthFetch';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { SkeletonForm } from '../components/SkeletonLoader.jsx';
import { ROLES } from '@arogyafirst/shared';

const SettingsPage = () => {
  usePageTitle('Settings');
  const { user, status, refreshUser } = useAuth();
  const { fetchData } = useAuthFetch();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Determine the API endpoint based on user role
  const getApiEndpoint = () => {
    switch (user?.role) {
      case ROLES.PATIENT:
        return '/api/patients/settings';
      case ROLES.DOCTOR:
        return '/api/doctors/settings';
      case ROLES.HOSPITAL:
        return '/api/hospitals/settings';
      case ROLES.LAB:
        return '/api/labs/settings';
      case ROLES.PHARMACY:
        return '/api/pharmacies/settings';
      default:
        return null;
    }
  };

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      const endpoint = getApiEndpoint();
      if (!endpoint) {
        setError('Invalid user role');
        setLoading(false);
        return;
      }

      try {
        const result = await fetchData(endpoint);
        if (result?.data?.settings) {
          setSettings(result.data.settings);
        } else {
          // Initialize with defaults if no settings exist
          setSettings({
            notificationPreferences: {
              emailNotifications: { bookings: true, prescriptions: true, referrals: true, reminders: true, promotions: false },
              smsNotifications: { bookings: true, prescriptions: true, referrals: true, reminders: true, promotions: false },
              pushNotifications: { bookings: true, prescriptions: true, referrals: true, reminders: true, promotions: true }
            },
            language: 'en',
            privacy: {
              profileVisibility: 'PUBLIC',
              shareDataForResearch: false,
              allowMarketingCommunications: false
            },
            accessibility: {
              highContrast: false,
              fontSize: 'MEDIUM'
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Update settings handler
  const handleUpdateSettings = async (updatedSettings) => {
    const endpoint = getApiEndpoint();
    if (!endpoint) return;

    setSaving(true);
    try {
      const result = await fetchData(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (result?.data?.settings) {
        setSettings(result.data.settings);
        await refreshUser();
        showSuccessNotification('Settings updated successfully');
      }
    } catch (err) {
      showErrorNotification(err.message || 'Failed to update settings');
      // Revert the optimistic update by refetching
      const result = await fetchData(endpoint);
      if (result?.data?.settings) {
        setSettings(result.data.settings);
      }
    } finally {
      setSaving(false);
    }
  };

  // Helper to update notification preferences
  const updateNotificationPreference = (channel, type, value) => {
    const newSettings = {
      ...settings,
      notificationPreferences: {
        ...settings.notificationPreferences,
        [channel]: {
          ...settings.notificationPreferences?.[channel],
          [type]: value
        }
      }
    };
    setSettings(newSettings);
    handleUpdateSettings({ notificationPreferences: newSettings.notificationPreferences });
  };

  // Helper to update privacy settings
  const updatePrivacy = (field, value) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [field]: value
      }
    };
    setSettings(newSettings);
    handleUpdateSettings({ privacy: newSettings.privacy });
  };

  

  if (status === 'loading' || loading) {
    return (
      <Container size="md" py="xl">
        <Paper withBorder shadow="md" p="xl" radius="md" role="status" aria-busy="true">
          <SkeletonForm />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Error">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!settings) {
    return (
      <Container size="md" py="xl">
        <Alert color="yellow" title="No Settings">
          Unable to load settings. Please try again.
        </Alert>
      </Container>
    );
  }

  const NotificationSection = ({ title, channel }) => (
    <Stack gap="sm">
      <Text fw={500} size="sm" c="dimmed">{title}</Text>
      <Switch
        label="Bookings"
        description="Receive notifications about appointment bookings"
        checked={settings.notificationPreferences?.[channel]?.bookings ?? true}
        onChange={(e) => updateNotificationPreference(channel, 'bookings', e.currentTarget.checked)}
        aria-label={`${title} for bookings`}
      />
      <Switch
        label="Prescriptions"
        description="Receive notifications about prescriptions"
        checked={settings.notificationPreferences?.[channel]?.prescriptions ?? true}
        onChange={(e) => updateNotificationPreference(channel, 'prescriptions', e.currentTarget.checked)}
        aria-label={`${title} for prescriptions`}
      />
      <Switch
        label="Referrals"
        description="Receive notifications about referrals"
        checked={settings.notificationPreferences?.[channel]?.referrals ?? true}
        onChange={(e) => updateNotificationPreference(channel, 'referrals', e.currentTarget.checked)}
        aria-label={`${title} for referrals`}
      />
      <Switch
        label="Reminders"
        description="Receive appointment reminders"
        checked={settings.notificationPreferences?.[channel]?.reminders ?? true}
        onChange={(e) => updateNotificationPreference(channel, 'reminders', e.currentTarget.checked)}
        aria-label={`${title} for reminders`}
      />
      <Switch
        label="Promotions"
        description="Receive promotional notifications"
        checked={settings.notificationPreferences?.[channel]?.promotions ?? false}
        onChange={(e) => updateNotificationPreference(channel, 'promotions', e.currentTarget.checked)}
        aria-label={`${title} for promotions`}
      />
    </Stack>
  );

  return (
    <Container size="md" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md" pos="relative">
        <LoadingOverlay visible={saving} overlayProps={{ blur: 2 }} />
        
        <Title order={2} mb="lg">Settings</Title>

        <Tabs defaultValue="notifications">
          <Tabs.List mb="lg">
            <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
              Notifications
            </Tabs.Tab>
            <Tabs.Tab value="privacy" leftSection={<IconShield size={16} />}>
              Privacy & Security
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="notifications">
            <Stack gap="xl">
              <div>
                <Title order={4} mb="md">Notification Preferences</Title>
                <Text size="sm" c="dimmed" mb="lg">
                  Choose how you want to receive notifications about your healthcare activities.
                </Text>
              </div>

              <NotificationSection title="Email Notifications" channel="emailNotifications" />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="privacy">
            <Stack gap="lg">
              <div>
                <Title order={4} mb="md">Privacy & Security</Title>
                <Text size="sm" c="dimmed" mb="lg">
                  Control your privacy settings and how your data is used.
                </Text>
              </div>

              <Select
                label="Profile Visibility"
                description="Control who can see your profile information"
                data={[
                  { value: 'PUBLIC', label: 'Public' },
                  { value: 'PRIVATE', label: 'Private' },
                  { value: 'CONTACTS_ONLY', label: 'Contacts Only' }
                ]}
                value={settings.privacy?.profileVisibility || 'PUBLIC'}
                onChange={(value) => updatePrivacy('profileVisibility', value)}
                aria-label="Profile visibility setting"
              />

              <Divider />

              <Switch
                label="Share Data for Research"
                description="Allow anonymized health data to be used for medical research to improve healthcare outcomes"
                checked={settings.privacy?.shareDataForResearch ?? false}
                onChange={(e) => updatePrivacy('shareDataForResearch', e.currentTarget.checked)}
                aria-label="Share data for research"
              />

              <Switch
                label="Marketing Communications"
                description="Receive promotional emails about new features and healthcare services"
                checked={settings.privacy?.allowMarketingCommunications ?? false}
                onChange={(e) => updatePrivacy('allowMarketingCommunications', e.currentTarget.checked)}
                aria-label="Allow marketing communications"
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
