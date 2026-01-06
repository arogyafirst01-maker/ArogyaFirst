import { Container, Title, Text, Stack, Paper } from '@mantine/core';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy - ArogyaFirst');

  return (
    <Container size="lg" py="xl">
      <Paper shadow="sm" p="xl" radius="md">
        <Stack gap="lg">
          <Title order={1}>Privacy Policy</Title>
          <Text size="sm" c="dimmed">Last updated: December 2024</Text>
          
          <Stack gap="md">
            <div>
              <Title order={2} size="h3" mb="sm">1. Information We Collect</Title>
              <Text>We collect information you provide directly to us, including personal details during registration (name, email, phone number), health-related information for medical records, and usage data to improve our services.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">2. How We Use Your Information</Title>
              <Text>We use your information to provide and improve our healthcare management services, facilitate communication between patients and healthcare providers, send important notifications, and ensure platform security.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">3. Data Security</Title>
              <Text>We implement industry-standard security measures to protect your personal and health information. All data is encrypted in transit and at rest. We regularly audit our security practices to ensure compliance with healthcare data protection standards.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">4. Data Sharing and Disclosure</Title>
              <Text>We share your information only with healthcare providers you choose to connect with through our platform, and as required by law. We do not sell your personal information to third parties.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">5. Your Rights</Title>
              <Text>You have the right to access, correct, or delete your personal information. You can manage your data preferences through your account settings or by contacting our support team.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">6. Cookies and Tracking</Title>
              <Text>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and personalize content. You can manage cookie preferences through your browser settings.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">7. Changes to Privacy Policy</Title>
              <Text>We may update this Privacy Policy periodically. We will notify you of significant changes via email or through our platform. Your continued use of our services constitutes acceptance of the updated policy.</Text>
            </div>
            
            <div>
              <Title order={2} size="h3" mb="sm">8. Contact Us</Title>
              <Text>For questions about this Privacy Policy or our data practices, please contact us at privacy@arogyafirst.com</Text>
            </div>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
