import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  TextInput,
  Alert,
  Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useAuth } from '../contexts/AuthContext';
import useAuthFetch from '../hooks/useAuthFetch';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { validatePhone, validateAadhaarLast4, formatDateForDisplay } from '@arogyafirst/shared';
import { SkeletonForm } from '../components/SkeletonLoader.jsx';

const PatientProfilePage = () => {
  usePageTitle('My Profile');
  const { user, status, refreshUser } = useAuth();
  const { fetchData } = useAuthFetch();
  const [isEditing, setIsEditing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const form = useForm({
    initialValues: {
      name: user?.patientData?.name || '',
      phone: user?.patientData?.phone || '',
      location: user?.patientData?.location || '',
      dateOfBirth: user?.patientData?.dateOfBirth ? new Date(user.patientData.dateOfBirth) : null,
      aadhaarLast4: user?.patientData?.aadhaarLast4 || '',
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Name is required'),
      phone: (value) => (validatePhone(value) ? null : 'Invalid phone number'),
      location: (value) => (value.trim() ? null : 'Location is required'),
      dateOfBirth: (value) => (value && !isNaN(new Date(value).getTime()) ? null : 'Invalid date'),
      aadhaarLast4: (value) => (validateAadhaarLast4(value) ? null : 'Invalid Aadhaar last 4 digits'),
    },
  });

  const handleSubmit = async (values) => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // Build payload: omit dateOfBirth if it's null so backend won't overwrite with epoch
      const payload = { ...values };
      if (values.dateOfBirth) {
        payload.dateOfBirth = values.dateOfBirth.toISOString();
      } else {
        // remove dateOfBirth when null/empty so no change is made server-side
        delete payload.dateOfBirth;
      }
      const result = await fetchData('/api/patients/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (result) {
        await refreshUser();
        showSuccessNotification('Profile updated successfully');
        setIsEditing(false);
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      // If the server returned field-level errors, set them on the form for better UX
      if (err && err.errors && Array.isArray(err.errors)) {
        err.errors.forEach(e => {
          if (e.field) form.setFieldError(e.field, e.message);
        });
      }
      setSubmitError(err.message || 'Update failed');
      showErrorNotification(err.message || 'Update failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <Container size="md" py="xl">
        <Paper withBorder shadow="md" p="xl" radius="md" role="status" aria-busy="true">
          <SkeletonForm />
        </Paper>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Alert color="red">Unable to load profile. Please try again.</Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        {!isEditing ? (
          <>
            <Group justify="space-between" mb="md">
              <Title order={2}>My Profile</Title>
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            </Group>
            <Stack gap="md">
              <Group>
                <Text fw={500}>Full Name:</Text>
                <Text c="dimmed">{user.patientData?.name}</Text>
              </Group>
              <Group>
                <Text fw={500}>Email:</Text>
                <Text c="dimmed">{user.email}</Text>
              </Group>
              <Group>
                <Text fw={500}>Phone:</Text>
                <Text c="dimmed">{user.patientData?.phone}</Text>
              </Group>
              <Group>
                <Text fw={500}>Location:</Text>
                <Text c="dimmed">{user.patientData?.location}</Text>
              </Group>
              <Group>
                <Text fw={500}>Date of Birth:</Text>
                <Text c="dimmed">{formatDateForDisplay(user.patientData?.dateOfBirth)}</Text>
              </Group>
              <Group>
                <Text fw={500}>Aadhaar Last 4 Digits:</Text>
                <Text c="dimmed">****{user.patientData?.aadhaarLast4}</Text>
              </Group>
              <Divider />
              <Group>
                <Text fw={500}>Unique ID:</Text>
                <Text c="dimmed">{user.uniqueId}</Text>
              </Group>
            </Stack>
          </>
        ) : (
          <>
            <Group justify="space-between" mb="md">
              <Title order={2}>Edit Profile</Title>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </Group>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Full Name"
                  required
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label="Phone"
                  required
                  {...form.getInputProps('phone')}
                />
                <TextInput
                  label="Location"
                  required
                  {...form.getInputProps('location')}
                />
                <DateInput
                  label="Date of Birth"
                  required
                  maxDate={new Date()}
                  {...form.getInputProps('dateOfBirth')}
                />
                <TextInput
                  label="Aadhaar Last 4 Digits"
                  required
                  {...form.getInputProps('aadhaarLast4')}
                />
                <TextInput
                  label="Email"
                  value={user.email}
                  disabled
                />
                {submitError && <Alert color="red">{submitError}</Alert>}
                <Group justify="flex-end">
                  <Button type="submit" loading={submitLoading}>
                    Save Changes
                  </Button>
                </Group>
              </Stack>
            </form>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default PatientProfilePage;