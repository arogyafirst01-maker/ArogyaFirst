import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from '@mantine/form';
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Anchor,
  Stack,
  Alert,
  Box,
  Group,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import logo from '@/assets/logo.png';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle';
import { validateEmail, validatePhone } from '@arogyafirst/shared';

export default function LoginPage() {
  usePageTitle('Login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, status } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      identifier: '',
      password: '',
    },
    validate: {
      identifier: (value) => (validateEmail(value) || validatePhone(value) ? null : 'Enter a valid email or 10-digit phone number'),
      password: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
    },
  });

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/');
    }
  }, [status, navigate]);

  const handleSubmit = form.onSubmit(async (values) => {
    setLoading(true);
    setError(null);
    try {
      await login(values);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <Container size={420} my={40}>
      <Paper withBorder shadow="md" p={30} radius="md">
        {/* Logo */}
        <Group
          justify="center"
          mb="xl"
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

        <Title order={2} ta="center" mb="md">
          Welcome back
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Login to your ArogyaFirst account
        </Text>
        {error && (
          <Alert icon={<IconAlertCircle />} color="red" mb="md" role="alert">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} aria-label="Login form">
          <Stack gap="md">
            <TextInput
              label="Email or Phone Number"
              placeholder="your@email.com or 9876543210"
              required
              aria-label="Email or Phone Number"
              aria-describedby={form.errors.identifier ? 'identifier-error' : undefined}
              {...form.getInputProps('identifier')}
            />
            {form.errors.identifier && <div id="identifier-error" className="sr-only">{form.errors.identifier}</div>}
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              aria-label="Password"
              aria-describedby={form.errors.password ? 'password-error' : undefined}
              {...form.getInputProps('password')}
            />
            {form.errors.password && <div id="password-error" className="sr-only">{form.errors.password}</div>}
            <Group justify="flex-end">
              <Anchor component={Link} to="/forgot-password" size="sm">
                Forgot Password?
              </Anchor>
            </Group>
            <Button 
              fullWidth 
              type="submit" 
              loading={loading}
              aria-label="Sign in to your account"
            >
              Login
            </Button>
          </Stack>
        </form>
        <Text ta="center" mt="md">
          Don't have an account?{' '}
          <Anchor component={Link} to="/register">
            Register
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
}