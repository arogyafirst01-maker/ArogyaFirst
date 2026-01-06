import { Component } from 'react';
import { Container, Paper, Title, Text, Button, Stack, Group } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Link } from 'react-router';

const IS_DEV = import.meta.env.DEV;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState(prevState => ({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      resetKey: prevState.resetKey + 1 
    }));
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container size="sm" py="xl">
          <Paper shadow="sm" p="xl" radius="md" withBorder>
            <Stack align="center" gap="md">
              <IconAlertTriangle size={64} color="var(--mantine-color-red-6)" />
              <Title order={2} ta="center">Something went wrong</Title>
              <Text c="dimmed" ta="center">
                We're sorry, but something unexpected happened. Please try again or return to the dashboard.
              </Text>
              {IS_DEV && this.state.error && (
                <Paper p="md" bg="gray.0" w="100%">
                  <Text size="sm" ff="monospace" style={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                  </Text>
                </Paper>
              )}
              <Group>
                <Button onClick={this.handleReset} variant="light">
                  Try Again
                </Button>
                <ErrorBoundaryNavigateButton fallbackPath={this.props.fallbackPath} />
              </Group>
            </Stack>
          </Paper>
        </Container>
      );
    }

    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

function ErrorBoundaryNavigateButton({ fallbackPath = '/dashboard' }) {
  const getButtonText = () => {
    if (fallbackPath === '/') return 'Go to Home';
    if (fallbackPath === '/login') return 'Go to Login';
    if (fallbackPath === '/dashboard') return 'Go to Dashboard';
    if (fallbackPath === '/bookings') return 'Go to Bookings';
    return 'Go Back';
  };
  
  return (
    <Button component={Link} to={fallbackPath} variant="filled">
      {getButtonText()}
    </Button>
  );
}

export default ErrorBoundary;
