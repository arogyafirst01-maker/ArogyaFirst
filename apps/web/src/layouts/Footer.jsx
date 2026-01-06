import { Group, Text, Anchor, Stack } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Link } from 'react-router';

export default function Footer() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  const leftSection = (
    <Text size="sm" c="dimmed">
      © 2025 ArogyaFirst. All rights reserved.
    </Text>
  );

  const rightSection = (
    <Group gap="md">
      <Anchor size="sm" c="dimmed" component={Link} to="/privacy">
        Privacy Policy
      </Anchor>
      <Anchor size="sm" c="dimmed" component={Link} to="/terms">
        Terms of Service
      </Anchor>
      <Anchor size="sm" c="dimmed" component={Link} to="/contact">
        Contact
      </Anchor>
      <Text size="sm" c="dimmed">
        Version 0.1.0
      </Text>
    </Group>
  );

  if (isMobile) {
    return (
      <Stack
        align="center"
        gap="md"
        h="100%"
        px="md"
        bg="gray.0"
        style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
      >
        {leftSection}
        {rightSection}
      </Stack>
    );
  }

  return (
    <Group
      justify="space-between"
      h="100%"
      px="md"
      align="center"
      bg="gray.0"
      style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}
    >
      {leftSection}
      {rightSection}
    </Group>
  );
}