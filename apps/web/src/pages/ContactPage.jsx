import React, { useState } from 'react';
import {
  Container,
  Paper,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Grid,
  Accordion,
  Group,
  Text,
  ThemeIcon,
  Badge,
  Loader,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail, IconPhone, IconClock } from '@tabler/icons-react';
import { CONTACT_SUBJECTS } from '@arogyafirst/shared';
import { usePageTitle } from '../hooks/usePageTitle';
import { showSuccessNotification, showErrorNotification } from '../utils/notifications';
import { SUPPORT_CONTACT } from '../config/support.config';

const ContactPage = () => {
  usePageTitle('Contact Us - ArogyaFirst');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
    validate: {
      name: (value) => {
        if (!value) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters long';
        return null;
      },
      email: (value) => {
        if (!value) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Valid email address is required';
        return null;
      },
      subject: (value) => {
        if (!value) return 'Subject is required';
        if (!CONTACT_SUBJECTS.includes(value)) return 'Invalid subject selected';
        return null;
      },
      message: (value) => {
        if (!value) return 'Message is required';
        if (value.trim().length < 10) return 'Message must be at least 10 characters long';
        if (value.trim().length > 1000) return 'Message must not exceed 1000 characters';
        return null;
      },
    },
  });

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        showErrorNotification(
          data.message || 'Failed to submit contact form. Please try again later.',
          'Error'
        );
        return;
      }

      showSuccessNotification(
        'Your message has been sent successfully! Check your email for confirmation.',
        'Success'
      );

      form.reset();
    } catch (error) {
      console.error('Contact form submission error:', error);
      showErrorNotification(
        'Failed to submit contact form. Please try again later.',
        'Error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjectOptions = CONTACT_SUBJECTS.map((subject) => ({
    value: subject,
    label: subject,
  }));

  const faqItems = [
    {
      question: 'How do I book an appointment?',
      answer: 'To book an appointment, navigate to the "Book Appointment" section, select your preferred doctor or healthcare provider, choose an available time slot, and confirm your booking. You will receive a confirmation email with all the details.',
    },
    {
      question: 'How can I access my medical records?',
      answer: 'Your medical records are available in the "My Records" section of your profile. You can view, download, and share them with other healthcare providers as needed. All records are securely encrypted and stored.',
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit cards, debit cards, net banking, and digital wallets. You can also choose to pay through our secure payment gateway powered by Razorpay.',
    },
    {
      question: 'How do I cancel or reschedule an appointment?',
      answer: 'You can cancel or reschedule your appointment from the "My Appointments" section at least 24 hours before the scheduled time. Please note that cancellations made within 24 hours may incur charges as per our policy.',
    },
    {
      question: 'Is my health data secure?',
      answer: 'Yes, your health data is highly secure. We use end-to-end encryption, follow HIPAA compliance standards, and implement multi-layer security measures. Your data is never shared without your explicit consent.',
    },
    {
      question: 'How do I get a prescription refill?',
      answer: 'You can request prescription refills through the "My Prescriptions" section. Your healthcare provider will review and approve refills within 24 hours. You will receive a notification once it is approved.',
    },
    {
      question: 'What should I do if I forgot my password?',
      answer: 'Click on "Forgot Password" on the login page and enter your registered email address. We will send you a password reset link. Click the link and create a new password. The link expires in 24 hours for security.',
    },
    {
      question: 'How can I add family members to my account?',
      answer: 'In your account settings, go to "Family Members" and click "Add Family Member". Enter their details and send an invitation. They can accept the invitation to access shared health features.',
    },
  ];

  const messageCharCount = form.values.message.length;
  const maxChars = 1000;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Page Header */}
        <Stack gap="sm" mb="lg">
          <h1 style={{ marginBottom: 0, marginTop: 0 }}>Contact Us</h1>
          <Text c="dimmed" size="lg">
            Have a question or feedback? We'd love to hear from you. Get in touch with our support team.
          </Text>
        </Stack>

        {/* Contact Form Section */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <h2 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Send us a Message</h2>
              <Text c="dimmed" size="sm">
                Fill out the form below and we'll get back to you as soon as possible.
              </Text>
            </div>

            <div style={{ position: 'relative' }}>
              {isSubmitting && (
                <Center style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1000, borderRadius: 'var(--mantine-radius-md)' }}>
                  <Loader />
                </Center>
              )}

              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">

                <TextInput
                  label="Full Name"
                  placeholder="Your name"
                  {...form.getInputProps('name')}
                  disabled={isSubmitting}
                  required
                  aria-label="Full Name"
                />

                <TextInput
                  label="Email Address"
                  placeholder="your.email@example.com"
                  type="email"
                  {...form.getInputProps('email')}
                  disabled={isSubmitting}
                  required
                  aria-label="Email Address"
                />

                <Select
                  label="Subject"
                  placeholder="Select a subject"
                  data={subjectOptions}
                  {...form.getInputProps('subject')}
                  disabled={isSubmitting}
                  required
                  aria-label="Subject"
                />

                <div>
                  <Textarea
                    label="Message"
                    placeholder="Tell us more about your inquiry..."
                    minRows={5}
                    maxRows={8}
                    {...form.getInputProps('message')}
                    disabled={isSubmitting}
                    required
                    aria-label="Message"
                  />
                  <Group justify="flex-end" mt={5}>
                    <Text size="xs" c={messageCharCount > maxChars ? 'red' : 'dimmed'}>
                      {messageCharCount}/{maxChars}
                    </Text>
                  </Group>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || messageCharCount > maxChars}
                  loading={isSubmitting}
                  fullWidth
                >
                  Send Message
                </Button>
                </Stack>
              </form>
            </div>
          </Stack>
        </Paper>

        {/* Support Information Section */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <h2 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Support Information</h2>
              <Text c="dimmed" size="sm">
                Reach out to our support team directly
              </Text>
            </div>

            <Grid gutter="lg">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Group gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconMail size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      General Support
                    </Text>
                    <a href={`mailto:${SUPPORT_CONTACT.emails.support}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Text size="sm" c="blue">
                        {SUPPORT_CONTACT.emails.support}
                      </Text>
                    </a>
                  </div>
                </Group>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Group gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconMail size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      Technical Support
                    </Text>
                    <a href={`mailto:${SUPPORT_CONTACT.emails.technical}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Text size="sm" c="blue">
                        {SUPPORT_CONTACT.emails.technical}
                      </Text>
                    </a>
                  </div>
                </Group>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Group gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconMail size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      Billing Support
                    </Text>
                    <a href={`mailto:${SUPPORT_CONTACT.emails.billing}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Text size="sm" c="blue">
                        {SUPPORT_CONTACT.emails.billing}
                      </Text>
                    </a>
                  </div>
                </Group>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Group gap="sm">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    <IconPhone size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      Phone Support
                    </Text>
                    <a href={`tel:${SUPPORT_CONTACT.phone}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Text size="sm" c="blue">
                        {SUPPORT_CONTACT.phone}
                      </Text>
                    </a>
                  </div>
                </Group>
              </Grid.Col>
            </Grid>

            <Stack gap="xs" mt="md" p="md" style={{ backgroundColor: '#f5f5f5', borderRadius: 'var(--mantine-radius-md)' }}>
              <Group gap="xs">
                <IconClock size={20} />
                <Text fw={500} size="sm">
                  Business Hours
                </Text>
              </Group>
              <Stack gap={4} ml={28}>
                <Text size="sm">
                  <strong>Monday - Friday:</strong> {SUPPORT_CONTACT.businessHours.weekdays}
                </Text>
                <Text size="sm">
                  <strong>Saturday:</strong> {SUPPORT_CONTACT.businessHours.saturday}
                </Text>
                <Text size="sm">
                  <strong>Sunday:</strong> {SUPPORT_CONTACT.businessHours.sunday}
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* FAQ Section */}
        <Paper p="lg" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <h2 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Frequently Asked Questions</h2>
              <Text c="dimmed" size="sm">
                Find answers to common questions about ArogyaFirst
              </Text>
            </div>

            <Accordion>
              {faqItems.map((item, index) => (
                <Accordion.Item key={index} value={`faq-${index}`}>
                  <Accordion.Control>{item.question}</Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" c="dimmed">
                      {item.answer}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Paper>

        {/* Additional Info */}
        <Paper p="lg" radius="md" style={{ backgroundColor: '#f0f8ff' }}>
          <Stack gap="sm">
            <Text fw={500}>Still need help?</Text>
            <Text size="sm" c="dimmed">
              Check out our detailed documentation and user guides, or reach out to our support team. We're here to help you get the most out of ArogyaFirst.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default ContactPage;
