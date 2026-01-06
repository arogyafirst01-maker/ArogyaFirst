import { Skeleton, Stack, Group, Card, Table } from '@mantine/core';

export function SkeletonCard({ count = 1 }) {
  return (
    <Stack gap="md">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Skeleton height={24} width="60%" radius="sm" />
            <Skeleton height={16} radius="sm" />
            <Skeleton height={16} radius="sm" />
            <Skeleton height={16} width="80%" radius="sm" />
            <Group mt="md">
              <Skeleton height={36} width={100} radius="sm" />
              <Skeleton height={36} width={100} radius="sm" />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          {Array.from({ length: columns }).map((_, index) => (
            <Table.Th key={index}>
              <Skeleton height={20} width="80%" />
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Table.Tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Table.Td key={colIndex}>
                <Skeleton height={16} width="90%" />
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function SkeletonForm() {
  return (
    <Stack gap="md">
      <Skeleton height={20} width={120} radius="sm" />
      <Skeleton height={40} radius="sm" />
      
      <Skeleton height={20} width={120} radius="sm" mt="md" />
      <Skeleton height={40} radius="sm" />
      
      <Skeleton height={20} width={120} radius="sm" mt="md" />
      <Skeleton height={40} radius="sm" />
      
      <Skeleton height={20} width={120} radius="sm" mt="md" />
      <Skeleton height={100} radius="sm" />
      
      <Group mt="xl">
        <Skeleton height={40} width={100} radius="sm" />
        <Skeleton height={40} width={100} radius="sm" />
      </Group>
    </Stack>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <Group grow style={{ marginBottom: '1rem' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Skeleton height={16} width="60%" radius="sm" />
            <Skeleton height={32} width="40%" radius="sm" />
            <Skeleton height={12} width="80%" radius="sm" mt="xs" />
          </Stack>
        </Card>
      ))}
    </Group>
  );
}

export function SkeletonTimeline({ count = 5 }) {
  return (
    <Stack gap="lg">
      {Array.from({ length: count }).map((_, index) => (
        <Group key={index} align="flex-start" gap="md">
          <Skeleton height={40} width={40} circle />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Skeleton height={20} width="30%" radius="sm" />
            <Skeleton height={16} radius="sm" />
            <Skeleton height={16} width="90%" radius="sm" />
            <Skeleton height={16} width="70%" radius="sm" />
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}
