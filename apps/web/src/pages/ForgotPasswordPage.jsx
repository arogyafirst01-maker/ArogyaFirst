import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from '@mantine/form';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Stepper,
  Group,
  PinInput,
  Box,
  Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconActivity } from '@tabler/icons-react';
import { validatePhone } from '@arogyafirst/shared';
import logo from '@/assets/logo.png';
import { api } from '../utils/api.js';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  
  // Multi-step state
  const [activeStep, setActiveStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Loading and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Resend cooldown
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const navigate = useNavigate();

  // Step 0: Phone number form
  const phoneForm = useForm({
    initialValues: {
      phone: '',
    },
    validate: {
      phone: (value) => (validatePhone(value) ? null : 'Enter a valid 10-digit phone number'),
    },
  });

  // Step 1: OTP form
  const otpForm = useForm({
    initialValues: {
      otp: '',
    },
    validate: {
      otp: (value) => (/^\d{6}$/.test(value) ? null : 'OTP must be exactly 6 digits'),
    },
  });

  // Step 2: Password form
  const passwordForm = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (value) => {
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
        if (!/\d/.test(value)) return 'Password must contain a number';
        return null;
      },
      confirmPassword: (value, values) => 
        value === values.newPassword ? null : 'Passwords do not match',
    },
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Send OTP to phone
  const handleSendOTP = async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Trim and strip whitespace from phone number
    const trimmedPhone = values.phone.replace(/\s/g, '').trim();

    try {
      await api.post('/api/auth/forgot-password', { phone: trimmedPhone });
      
      setPhone(trimmedPhone);
      setActiveStep(1);
      setResendCooldown(60);
      setSuccess('OTP sent successfully! Check your phone.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/api/auth/verify-phone-otp', { phone, otp });
      
      setActiveStep(2);
      setSuccess('OTP verified successfully! Set your new password.');
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Trim phone number for consistency
    const trimmedPhone = phone.replace(/\s/g, '').trim();

    try {
      await api.post('/api/auth/reset-password', {
        phone: trimmedPhone,
        newPassword: values.newPassword,
      });
      
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/forgot-password', { phone });
      setResendCooldown(60);
      setSuccess('OTP resent successfully!');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Change phone number (go back to step 0)
  const handleChangePhone = () => {
    setActiveStep(0);
    setOtp('');
    setError(null);
    setSuccess(null);
  };

  return (
    <Container size={460} my={40}>
      <Paper radius="md" p="xl" withBorder shadow="md">
        {/* Logo and Title */}
        <Box ta="center" mb="xl">
          <Group justify="center" mb="xs">
            <img 
              src={logo} 
              alt="ArogyaFirst Logo" 
              style={{ 
                width: 48, 
                height: 48, 
                objectFit: 'contain',
              }} 
            />
            <Title order={2} fw={700}>
              ArogyaFirst
            </Title>
          </Group>
          <Title order={3} fw={600}>
            Reset Password
          </Title>
          <Text c="dimmed" size="sm" mt="xs">
            Enter your phone number to receive a verification code
          </Text>
        </Box>

        {/* Stepper */}
        <Stepper active={activeStep} size="sm" mb="xl">
          <Stepper.Step label="Phone" description="Enter number" />
          <Stepper.Step label="Verify" description="Enter OTP" />
          <Stepper.Step label="Reset" description="New password" />
        </Stepper>

        {/* Error Alert */}
        {error && (
          <Alert icon={<IconAlertCircle />} color="red" mb="md" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert icon={<IconCheck />} color="green" mb="md" onClose={() => setSuccess(null)} withCloseButton>
            {success}
          </Alert>
        )}

        {/* Step 0: Phone Number Input */}
        {activeStep === 0 && (
          <form onSubmit={phoneForm.onSubmit(handleSendOTP)}>
            <Stack gap="md">
              <TextInput
                label="Phone Number"
                placeholder="Enter your 10-digit phone number"
                required
                {...phoneForm.getInputProps('phone')}
              />
              <Text size="xs" c="dimmed">
                Phone-based password reset is available for patient accounts only.
              </Text>
              <Button fullWidth type="submit" loading={loading}>
                Send OTP
              </Button>
              <Text ta="center" size="sm">
                <Anchor component={Link} to="/login">
                  Back to Login
                </Anchor>
              </Text>
            </Stack>
          </form>
        )}

        {/* Step 1: OTP Verification */}
        {activeStep === 1 && (
          <Stack gap="md">
            <Text size="sm" ta="center">
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </Text>
            <Group justify="center">
              <PinInput
                length={6}
                type="number"
                value={otp}
                onChange={setOtp}
                size="lg"
                oneTimeCode
              />
            </Group>
            <Button fullWidth onClick={handleVerifyOTP} loading={loading} disabled={otp.length !== 6}>
              Verify OTP
            </Button>
            <Group justify="space-between">
              <Button variant="subtle" size="sm" onClick={handleChangePhone}>
                Change Phone
              </Button>
              <Button
                variant="subtle"
                size="sm"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
              </Button>
            </Group>
          </Stack>
        )}

        {/* Step 2: New Password */}
        {activeStep === 2 && (
          <form onSubmit={passwordForm.onSubmit(handleResetPassword)}>
            <Stack gap="md">
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                required
                {...passwordForm.getInputProps('newPassword')}
              />
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm new password"
                required
                {...passwordForm.getInputProps('confirmPassword')}
              />
              <Text size="xs" c="dimmed">
                Password must be at least 8 characters with uppercase, lowercase, and a number.
              </Text>
              <Button fullWidth type="submit" loading={loading}>
                Reset Password
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
