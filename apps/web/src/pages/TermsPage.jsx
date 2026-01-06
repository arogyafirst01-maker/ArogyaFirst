import { Container, Title, Group, Button, Box } from '@mantine/core';
import { IconDownload, IconExternalLink } from '@tabler/icons-react';
import { usePageTitle } from '../hooks/usePageTitle';

const TERMS_PDF_URL = '/terms-and-conditions.pdf';

export default function TermsPage() {
  usePageTitle('Terms & Conditions - ArogyaFirst');

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="md">
        <Title order={1}>Terms & Conditions</Title>
        <Group gap="sm">
          <Button
            component="a"
            href={TERMS_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={18} />}
            variant="light"
          >
            Open in New Tab
          </Button>
          <Button
            component="a"
            href={TERMS_PDF_URL}
            download="ArogyaFirst-Terms-and-Conditions.pdf"
            leftSection={<IconDownload size={18} />}
          >
            Download PDF
          </Button>
        </Group>
      </Group>
      
      <Box
        style={{
          width: '100%',
          height: 'calc(100vh - 200px)',
          minHeight: '600px',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <iframe
          src={TERMS_PDF_URL}
          title="Terms and Conditions"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    </Container>
  );
}
