import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';

const NotFoundPage = () => {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();

  return (
    <Container size="md" py={80}>
      <Stack align="center" gap="xl" role="alert">
        <Title order={1} size={120} c="brand" aria-hidden="true">404</Title>
        <Title order={2}>Page Not Found</Title>
        <Text size="lg" ta="center" c="dimmed">The page you are looking for does not exist or has been moved.</Text>
        <Group>
          <Button size="md" onClick={() => navigate('/')} aria-label="Go to home page">Go to Home</Button>
          <Button size="md" variant="outline" onClick={() => navigate(-1)} aria-label="Go back to previous page">Go Back</Button>
        </Group>
      </Stack>
    </Container>
  );
};

export default NotFoundPage;