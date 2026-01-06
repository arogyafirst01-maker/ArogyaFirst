import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  SimpleGrid,
  Badge,
  Box,
  Burger,
  Drawer,
  Divider,
  Anchor,
} from '@mantine/core';
import logo from '@/assets/logo.png';
import {
  IconActivity,
  IconUsers,
  IconBuilding,
  IconMicroscope,
  IconPill,
  IconCalendar,
  IconFileText,
  IconShield,
  IconClock,
  IconBolt,
  IconSparkles,
  IconInfoCircle,
  IconArrowRight,
  IconMail,
  IconPhone,
  IconMenu2,
  IconMailbox,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDisclosure } from '@mantine/hooks';

export default function LandingPage() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [mobileMenuOpened, { toggle: toggleMobileMenu, close: closeMobileMenu }] = useDisclosure(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: IconCalendar,
      title: 'Real-Time Booking',
      description: 'Book OPD appointments, hospital beds, and lab tests with live availability updates.',
      gradient: 'var(--gradient-primary)',
    },
    {
      icon: IconShield,
      title: 'Secure Records',
      description: 'OCR-enabled document storage with encrypted access and quick retrieval.',
      gradient: 'var(--gradient-secondary)',
    },
    {
      icon: IconClock,
      title: '24/7 Access',
      description: 'Access your health records, prescriptions, and test reports anytime, anywhere.',
      gradient: 'var(--gradient-accent)',
    },
    {
      icon: IconFileText,
      title: 'Digital Prescriptions',
      description: 'Doctors can prescribe digitally, and pharmacies receive them instantly.',
      gradient: 'var(--gradient-primary)',
    },
    {
      icon: IconUsers,
      title: 'Unified Platform',
      description: 'Connects patients, doctors, hospitals, labs, and pharmacies in one ecosystem.',
      gradient: 'var(--gradient-secondary)',
    },
    {
      icon: IconBolt,
      title: 'Instant Updates',
      description: 'Real-time notifications for appointments, reports, and prescriptions.',
      gradient: 'var(--gradient-accent)',
    },
  ];

  const portals = [
    {
      icon: IconUsers,
      title: 'For Patients',
      description: 'Book appointments, access records, and manage your health journey.',
      features: ['OPD Bookings', 'Lab Tests', 'Digital Records', 'Health Tracking'],
      gradient: 'var(--gradient-primary)',
      role: 'patient',
    },
    {
      icon: IconActivity,
      title: 'For Doctors',
      description: 'View patient history, prescribe digitally, and provide remote consultations.',
      features: ['Patient History', 'Digital Prescriptions', 'Telemedicine', 'Referrals'],
      gradient: 'var(--gradient-secondary)',
      role: 'doctor',
    },
    {
      icon: IconBuilding,
      title: 'For Hospitals',
      description: 'Manage beds, OPD slots, staff scheduling, and comprehensive dashboards.',
      features: ['Bed Management', 'Staff Scheduling', 'Revenue Analytics', 'Report Upload'],
      gradient: 'var(--gradient-accent)',
      role: 'hospital',
    },
    {
      icon: IconMicroscope,
      title: 'For Labs',
      description: 'Handle test bookings, billing, and digital report submissions.',
      features: ['Test Slot Booking', 'Billing System', 'Report Submission', 'Analytics'],
      gradient: 'var(--gradient-primary)',
      role: 'lab',
    },
    {
      icon: IconPill,
      title: 'For Pharmacies',
      description: 'Access prescriptions and manage stock with integrated billing.',
      features: ['Prescription Access', 'Stock Management', 'Billing', 'Order Tracking'],
      gradient: 'var(--gradient-secondary)',
      role: 'pharmacy',
    },
  ];

  // Helper to check if user is logged in with a specific role
  const isUserRole = (role) => {
    if (!isAuthenticated || !user) return false;
    return user.role?.toLowerCase() === role.toLowerCase();
  };

  return (
    <Box component="main">
      {/* Navigation */}
      <Box
        component="header"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.3s ease',
          boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.05)' : 'none',
        }}
      >
        <Container size="xl" py="md">
          <Group justify="space-between">
            {/* Logo */}
            <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))',
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  transition: 'all 0.3s ease',
                }}
              >
                <img 
                  src={logo} 
                  alt="ArogyaFirst Logo" 
                  style={{ 
                    width: '140%',
                    height: '140%',
                    objectFit: 'contain',
                  }} 
                  className="animate-pulse-health"
                />
              </div>
              <Text
                size="1.5rem"
                fw={800}
                c={scrolled ? 'brand' : 'white'}
                style={{
                  letterSpacing: '-0.5px',
                }}
              >
                ArogyaFirst
              </Text>
            </Group>

            {/* Desktop Navigation */}
            <Group gap="xs" visibleFrom="md">
              {[
                { icon: IconInfoCircle, label: 'About' },
                { icon: IconSparkles, label: 'Features' },
                { icon: IconMailbox, label: 'Contact' },
              ].map((item, i) => (
                <Button
                  key={i}
                  variant="subtle"
                  leftSection={<item.icon size={16} />}
                  style={{
                    color: scrolled ? 'hsl(210 15% 25%)' : 'white',
                    fontWeight: 500,
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        background: scrolled
                          ? 'rgba(0, 119, 182, 0.08)'
                          : 'rgba(255, 255, 255, 0.15)',
                      },
                    },
                  }}
                  onClick={() => {
                    const sections = {
                      'About': 'portals',
                      'Features': 'features',
                      'Contact': 'footer',
                    };
                    const section = document.getElementById(sections[item.label]);
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Group>

            {/* CTA Buttons */}
            <Group gap="sm" visibleFrom="sm">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="subtle"
                    radius="xl"
                    leftSection={<IconUsers size={16} />}
                    onClick={() => navigate('/profile')}
                    style={{
                      color: scrolled ? 'hsl(197 100% 36%)' : 'white',
                      fontWeight: 600,
                    }}
                  >
                    Profile
                  </Button>
                  <Button
                    radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, hsl(197 100% 45%), hsl(162 72% 45%))',
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(0, 119, 182, 0.3)',
                    }}
                    styles={{
                      root: {
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(0, 119, 182, 0.4)',
                        },
                      },
                    }}
                    onClick={() => navigate('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="subtle"
                    radius="xl"
                    onClick={() => navigate('/login')}
                    style={{
                      color: scrolled ? 'hsl(197 100% 36%)' : 'white',
                      fontWeight: 600,
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, hsl(197 100% 45%), hsl(162 72% 45%))',
                      color: 'white',
                      fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(0, 119, 182, 0.3)',
                    }}
                    styles={{
                      root: {
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(0, 119, 182, 0.4)',
                        },
                      },
                    }}
                    onClick={() => navigate('/register')}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </Group>

            {/* Mobile Menu */}
            <Burger
              opened={mobileMenuOpened}
              onClick={toggleMobileMenu}
              hiddenFrom="md"
              color={scrolled ? 'dark' : 'white'}
            />
          </Group>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer opened={mobileMenuOpened} onClose={closeMobileMenu} position="right" size="xs">
        <Stack gap="md" p="md">
          <Button
            variant="subtle"
            leftSection={<IconInfoCircle size={16} />}
            fullWidth
            justify="flex-start"
            onClick={() => {
              closeMobileMenu();
              const section = document.getElementById('portals');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            About
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconSparkles size={16} />}
            fullWidth
            justify="flex-start"
            onClick={() => {
              closeMobileMenu();
              const section = document.getElementById('features');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Features
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconMailbox size={16} />}
            fullWidth
            justify="flex-start"
            onClick={() => {
              closeMobileMenu();
              const section = document.getElementById('footer');
              if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Contact
          </Button>
          <Divider />
          {isAuthenticated ? (
            <>
              <Button
                variant="outline"
                radius="xl"
                leftSection={<IconUsers size={16} />}
                onClick={() => navigate('/profile')}
                fullWidth
              >
                Profile
              </Button>
              <Button
                radius="xl"
                style={{ background: 'var(--gradient-accent)' }}
                onClick={() => navigate('/dashboard')}
                fullWidth
              >
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" radius="xl" onClick={() => navigate('/login')} fullWidth>
                Sign In
              </Button>
              <Button
                radius="xl"
                style={{ background: 'var(--gradient-accent)' }}
                onClick={() => navigate('/register')}
                fullWidth
              >
                Get Started
              </Button>
            </>
          )}
        </Stack>
      </Drawer>

      {/* Hero Section */}
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: 100,
          paddingBottom: 60,
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 50%, #00B894 100%)',
        }}
      >
        {/* Animated Mesh Gradient Background */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              radial-gradient(circle at 20% 50%, rgba(0, 184, 148, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(0, 180, 216, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(0, 119, 182, 0.2) 0%, transparent 50%)
            `,
          }}
        />
        
        {/* Grid Pattern */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />
        
        {/* Floating Orbs */}
        <Box
          className="animate-float"
          style={{
            position: 'absolute',
            top: '10%',
            right: '10%',
            width: 350,
            height: 350,
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />
        <Box
          className="animate-float"
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '5%',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(70px)',
            animationDelay: '2s',
            animationDuration: '5s',
          }}
        />

        <Container size="xl">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            {/* Left Column - Content */}
            <Stack gap="xl" className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {/* Trust Badge */}
              <Badge
                size="lg"
                radius="xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
                leftSection={
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#00ff88',
                      boxShadow: '0 0 12px #00ff88',
                    }}
                    className="animate-pulse-health"
                  />
                }
              >
                Trusted by 10,000+ patients nationwide
              </Badge>

              {/* Heading */}
              <Stack gap="md">
                <Title
                  order={1}
                  style={{
                    fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
                    lineHeight: 1.15,
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-1.5px',
                  }}
                >
                  {isAuthenticated ? (
                    <>
                      Welcome back,{' '}
                      <br />
                      <Text
                        component="span"
                        inherit
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 100%)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          color: 'transparent',
                          position: 'relative',
                        }}
                      >
                        {user?.patientData?.name || user?.hospitalData?.name || user?.doctorData?.name || user?.labData?.name || user?.pharmacyData?.name || 'User'}!
                        <Box
                          component="span"
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: 'linear-gradient(90deg, #00ff88, #00b894)',
                            borderRadius: 2,
                          }}
                        />
                      </Text>
                    </>
                  ) : (
                    <>
                      Your Health,{' '}
                      <br />
                      <Text
                        component="span"
                        inherit
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 100%)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          color: 'transparent',
                          position: 'relative',
                        }}
                      >
                        Connected
                        <Box
                          component="span"
                          style={{
                            position: 'absolute',
                            bottom: -2,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: 'linear-gradient(90deg, #00ff88, #00b894)',
                            borderRadius: 2,
                          }}
                        />
                      </Text>
                    </>
                  )}
                </Title>
                <Text
                  size="lg"
                  style={{
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.65,
                    fontSize: '1.125rem',
                    maxWidth: 560,
                    fontWeight: 400,
                  }}
                >
                  {isAuthenticated 
                    ? 'Ready to manage your healthcare journey? Book appointments, access your records, or explore new health features.'
                    : 'Book appointments instantly, manage records securely, and access comprehensive healthcare services—all in one unified platform designed for modern healthcare.'
                  }
                </Text>
              </Stack>

              {/* CTA Buttons */}
              <Group gap="md" mt="lg">
                <Button
                  size="lg"
                  radius="xl"
                  h={58}
                  px={36}
                  style={{
                    background: 'white',
                    color: '#0077B6',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                    border: 'none',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
                      },
                    },
                  }}
                  rightSection={<IconArrowRight size={20} stroke={2.5} />}
                  onClick={() => navigate(isAuthenticated ? '/bookings/new' : '/register')}
                >
                  {isAuthenticated ? 'Book Appointment' : 'Get Started'}
                </Button>
                <Button
                  size="lg"
                  radius="xl"
                  h={58}
                  px={36}
                  variant="outline"
                  style={{
                    borderColor: 'rgba(255,255,255,0.4)',
                    color: 'white',
                    borderWidth: 2,
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    fontWeight: 600,
                    fontSize: '1rem',
                  }}
                  styles={{
                    root: {
                      '&:hover': {
                        background: 'rgba(255,255,255,0.18)',
                        borderColor: 'rgba(255,255,255,0.6)',
                        transform: 'translateY(-3px)',
                      },
                    },
                  }}
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/dashboard');
                    } else {
                      const featuresSection = document.getElementById('features');
                      if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Watch Demo'}
                </Button>
              </Group>

              {/* Quick Stats */}
              <SimpleGrid cols={3} spacing="md" pt="xl">
                {[
                  { value: '500+', label: 'Doctors', color: '#00ff88' },
                  { value: '50+', label: 'Hospitals', color: '#00d9ff' },
                  { value: '24/7', label: 'Support', color: '#ffba00' },
                ].map((stat, i) => (
                  <Box
                    key={i}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      borderRadius: 16,
                      padding: '20px 16px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                    }}
                    className="animate-slide-up"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    <Text
                      size="2.5rem"
                      fw={900}
                      ff="monospace"
                      style={{ color: stat.color, lineHeight: 1, letterSpacing: '-1.5px' }}
                    >
                      {stat.value}
                    </Text>
                    <Text size="xs" c="rgba(255,255,255,0.85)" fw={600} mt={8}>
                      {stat.label}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>

            {/* Right Column - Modern Hero Visual */}
            <Box
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 550,
              }}
              className="animate-fade-in"
            >
              {/* Main Hero Card */}
              <Box
                style={{
                  width: '100%',
                  height: 520,
                  borderRadius: 28,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.15)',
                  position: 'relative',
                  overflow: 'visible',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Inner glow effect */}
                <Box
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)',
                    borderRadius: 28,
                  }}
                />
                
                {/* Inner Content - Medical Icons Grid */}
                <Stack align="center" gap="xl" style={{ position: 'relative', zIndex: 1 }}>
                  <SimpleGrid cols={3} spacing="xl">
                    {[
                      { icon: IconUsers, label: 'Patients', color: '#667eea' },
                      { icon: IconActivity, label: 'Doctors', color: '#f093fb' },
                      { icon: IconBuilding, label: 'Hospitals', color: '#4facfe' },
                      { icon: IconMicroscope, label: 'Labs', color: '#43e97b' },
                      { icon: IconFileText, label: 'Records', color: '#fa709a' },
                      { icon: IconPill, label: 'Pharmacy', color: '#fee140' },
                    ].map((item, i) => (
                      <Box
                        key={i}
                        className="animate-float"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          opacity: 0.4,
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: '4s',
                        }}
                      >
                        <Box
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 16,
                            background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 8px 24px ${item.color}40`,
                          }}
                        >
                          <item.icon size={32} color="white" stroke={2} />
                        </Box>
                        <Text size="xs" c="rgba(255,255,255,0.7)" fw={600}>
                          {item.label}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                  
                  <Text
                    size="sm"
                    c="rgba(255,255,255,0.6)"
                    ta="center"
                    fw={600}
                    style={{ letterSpacing: '0.5px' }}
                  >
                    ALL CONNECTED IN ONE PLATFORM
                  </Text>
                </Stack>
                
                {/* Floating Feature Card 1 - Top Left */}
                <Card
                  className="animate-float"
                  p="md"
                  radius="xl"
                  shadow="xl"
                  style={{
                    position: 'absolute',
                    top: 30,
                    left: -16,
                    width: 220,
                    background: 'white',
                    border: 'none',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
                    zIndex: 10,
                  }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Box
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.35)',
                      }}
                    >
                      <IconCalendar size={24} color="white" stroke={2.5} />
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700} size="sm" style={{ color: '#1a1a1a', lineHeight: 1.3 }}>
                        Smart Booking
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        Real-time availability
                      </Text>
                    </Box>
                  </Group>
                </Card>

                {/* Floating Feature Card 2 - Right Middle */}
                <Card
                  className="animate-float"
                  p="md"
                  radius="xl"
                  shadow="xl"
                  style={{
                    position: 'absolute',
                    top: 180,
                    right: -16,
                    width: 220,
                    background: 'white',
                    border: 'none',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
                    animationDelay: '0.8s',
                    zIndex: 10,
                  }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Box
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 6px 20px rgba(240, 147, 251, 0.35)',
                      }}
                    >
                      <IconShield size={24} color="white" stroke={2.5} />
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700} size="sm" style={{ color: '#1a1a1a', lineHeight: 1.3 }}>
                        Secure Records
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        End-to-end encrypted
                      </Text>
                    </Box>
                  </Group>
                </Card>

                {/* Floating Feature Card 3 - Bottom Left */}
                <Card
                  className="animate-float"
                  p="md"
                  radius="xl"
                  shadow="xl"
                  style={{
                    position: 'absolute',
                    bottom: 30,
                    left: -16,
                    width: 220,
                    background: 'white',
                    border: 'none',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
                    animationDelay: '1.6s',
                    zIndex: 10,
                  }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <Box
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 6px 20px rgba(79, 172, 254, 0.35)',
                      }}
                    >
                      <IconActivity size={24} color="white" stroke={2.5} />
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700} size="sm" style={{ color: '#1a1a1a', lineHeight: 1.3 }}>
                        Live Tracking
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        Instant notifications
                      </Text>
                    </Box>
                  </Group>
                </Card>
              </Box>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" component="section" py={96} style={{ position: 'relative' }}>
        <Container size="xl">
          <Stack align="center" gap="xl" mb={64}>
            <Badge size="lg" radius="xl" variant="light" leftSection={<IconBolt size={16} />}>
              Features
            </Badge>
            <Title order={2} ta="center" size="2.5rem">
              Everything You Need for{' '}
              <Text component="span" className="gradient-text" inherit>
                Seamless Healthcare
              </Text>
            </Title>
            <Text size="xl" c="dimmed" ta="center" maw={800}>
              Our comprehensive platform connects all healthcare stakeholders with cutting-edge technology
            </Text>
          </Stack>

          <SimpleGrid 
            cols={{ base: 1, md: 2, lg: 3 }} 
            spacing="lg"
            className="features-grid"
            style={{
              '--card-blur': '0px',
              '--card-opacity': '1',
            }}
          >
            {features.map((feature, index) => (
              <Card
                key={index}
                className="glass-card animate-slide-up feature-card"
                p="xl"
                radius="xl"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '2px solid hsl(var(--border))',
                  animationDelay: `${index * 0.1}s`,
                }}
                onMouseEnter={(e) => {
                  // Scale up current card
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px hsl(var(--primary) / 0.25)';
                  e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.6)';
                  e.currentTarget.style.zIndex = '10';
                  // Dim and blur other cards
                  const allCards = e.currentTarget.parentElement.querySelectorAll('.feature-card');
                  allCards.forEach(card => {
                    if (card !== e.currentTarget) {
                      card.style.filter = 'blur(2px)';
                      card.style.opacity = '0.5';
                      card.style.transform = 'scale(0.98)';
                    }
                  });
                }}
                onMouseLeave={(e) => {
                  // Reset current card
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '';
                  e.currentTarget.style.zIndex = '';
                  // Reset all cards
                  const allCards = e.currentTarget.parentElement.querySelectorAll('.feature-card');
                  allCards.forEach(card => {
                    card.style.filter = '';
                    card.style.opacity = '';
                    card.style.transform = '';
                  });
                }}
              >
                <Box
                  w={56}
                  h={56}
                  mb="md"
                  style={{
                    borderRadius: 'var(--radius)',
                    background: feature.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <feature.icon size={28} color="white" />
                </Box>
                <Text size="xl" fw={700} mb="sm">
                  {feature.title}
                </Text>
                <Text c="dimmed">{feature.description}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>

        {/* Background Blur */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 384,
            height: 384,
            background: 'hsl(var(--primary) / 0.05)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* User Portals Section */}
      <Box id="portals" component="section" py={96} style={{ background: 'hsl(var(--muted) / 0.3)' }}>
        <Container size="xl">
          <Stack align="center" gap="xl" mb={64}>
            <Title order={2} ta="center" size="2.5rem">
              Built for Everyone in{' '}
              <Text component="span" className="gradient-text" inherit>
                Healthcare Ecosystem
              </Text>
            </Title>
            <Text size="xl" c="dimmed" ta="center" maw={800}>
              Specialized portals designed for each stakeholder's unique needs
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
            {portals.map((portal, index) => (
              <Card
                key={index}
                className="glass-card"
                p="xl"
                radius="xl"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '2px solid hsl(var(--border))',
                }}
                styles={{
                  root: {
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 'var(--shadow-elevated)',
                      borderColor: 'hsl(var(--primary) / 0.5)',
                    },
                  },
                }}
              >
                <Box
                  w={64}
                  h={64}
                  mb="md"
                  style={{
                    borderRadius: 'var(--radius)',
                    background: portal.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <portal.icon size={32} color="white" />
                </Box>
                <Text size="xl" fw={700} mb="sm">
                  {portal.title}
                </Text>
                <Text c="dimmed" mb="md">
                  {portal.description}
                </Text>
                <Stack gap="xs" mb="md">
                  {portal.features.map((feat, i) => (
                    <Group key={i} gap="xs">
                      <Box w={6} h={6} style={{ borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                      <Text size="sm">{feat}</Text>
                    </Group>
                  ))}
                </Stack>
                <Button
                  variant="subtle"
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() => navigate(isUserRole(portal.role) ? '/dashboard' : '/login')}
                >
                  {isUserRole(portal.role) ? 'Go to Dashboard' : 'Sign In'}
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box component="section" py={96}>
        <Container size="xl">
          <Card className="glass-card" p={64} radius="xl" style={{ position: 'relative', overflow: 'hidden' }}>
            <Box
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--gradient-hero)',
                opacity: 0.1,
                pointerEvents: 'none',
              }}
            />
            <Stack align="center" gap="xl" style={{ position: 'relative', zIndex: 1 }}>
              <Badge size="lg" radius="xl" variant="light" leftSection={<IconSparkles size={16} />}>
                Get Started Today
              </Badge>
              <Title order={2} ta="center" size="3rem" maw={900}>
                Ready to Transform Your{' '}
                <Text component="span" className="gradient-text" inherit>
                  Healthcare Experience?
                </Text>
              </Title>
              <Text size="xl" c="dimmed" ta="center" maw={800}>
                Join thousands of patients, doctors, and healthcare providers who trust ArogyaFirst for seamless
                healthcare coordination.
              </Text>
              <Group gap="md">
                <Button
                  size="lg"
                  radius="xl"
                  h={56}
                  px={40}
                  style={{ background: 'var(--gradient-accent)' }}
                  rightSection={<IconArrowRight size={20} />}
                  onClick={() => navigate(isAuthenticated ? '/bookings/new' : '/register')}
                >
                  {isAuthenticated ? 'Book Appointment Now' : 'Start Free Trial'}
                </Button>
                <Button
                  size="lg"
                  radius="xl"
                  h={56}
                  px={40}
                  variant="outline"
                  onClick={() => {
                    const footer = document.querySelector('footer');
                    if (footer) {
                      footer.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Schedule a Demo
                </Button>
              </Group>
              <Group gap="xl" mt="md">
                {['HIPAA Compliant', 'Bank-Grade Security', '24/7 Support'].map((item, i) => (
                  <Group key={i} gap="xs">
                    <Box
                      w={8}
                      h={8}
                      style={{ borderRadius: '50%', background: 'hsl(var(--secondary))' }}
                      className="animate-pulse-health"
                    />
                    <Text size="sm" c="dimmed">
                      {item}
                    </Text>
                  </Group>
                ))}
              </Group>
            </Stack>
          </Card>
        </Container>
      </Box>

      {/* Footer */}
      <Box id="footer" component="footer" style={{ background: 'hsl(var(--card))', borderTop: '1px solid hsl(var(--border))' }}>
        <Container size="xl" py={64}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xl">
            {/* Brand */}
            <Box>
              <Group gap="sm" mb="md">
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img 
                    src={logo} 
                    alt="ArogyaFirst Logo" 
                    style={{ 
                      width: '130%',
                      height: '130%',
                      objectFit: 'contain',
                    }} 
                  />
                </div>
                <Text size="1.35rem" fw={700} className="gradient-text">
                  ArogyaFirst
                </Text>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Connecting healthcare, empowering lives. Your unified platform for seamless medical care.
              </Text>
              <Stack gap="xs">
                <Group gap="xs">
                  <IconMail size={16} />
                  <Anchor href="mailto:support@arogyafirst.com" size="sm" c="dimmed">
                    support@arogyafirst.com
                  </Anchor>
                </Group>
                <Group gap="xs">
                  <IconPhone size={16} />
                  <Text size="sm" c="dimmed">
                    +1 (234) 567-890
                  </Text>
                </Group>
              </Stack>
            </Box>

            {/* Product */}
            <Box>
              <Text fw={700} mb="md">
                Product
              </Text>
              <Stack gap="xs">
                {['Features', 'Pricing', 'Security', 'Updates'].map((item) => (
                  <Anchor key={item} size="sm" c="dimmed">
                    {item}
                  </Anchor>
                ))}
              </Stack>
            </Box>

            {/* Portals */}
            <Box>
              <Text fw={700} mb="md">
                Portals
              </Text>
              <Stack gap="xs">
                {['Patients', 'Doctors', 'Hospitals', 'Labs', 'Pharmacies'].map((item) => (
                  <Anchor key={item} size="sm" c="dimmed">
                    {item}
                  </Anchor>
                ))}
              </Stack>
            </Box>

            {/* Company */}
            <Box>
              <Text fw={700} mb="md">
                Company
              </Text>
              <Stack gap="xs">
                {['About Us', 'Careers', 'Contact', 'Blog'].map((item) => (
                  <Anchor key={item} size="sm" c="dimmed">
                    {item}
                  </Anchor>
                ))}
              </Stack>
            </Box>

            {/* Legal */}
            <Box>
              <Text fw={700} mb="md">
                Legal
              </Text>
              <Stack gap="xs">
                {['Privacy Policy', 'Terms of Service', 'HIPAA Compliance', 'Cookie Policy'].map((item) => (
                  <Anchor key={item} size="sm" c="dimmed">
                    {item}
                  </Anchor>
                ))}
              </Stack>
            </Box>
          </SimpleGrid>

          <Divider my="xl" />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              © 2025 ArogyaFirst. All rights reserved.
            </Text>
            <Group gap="md">
              {['Twitter', 'LinkedIn', 'Facebook'].map((social) => (
                <Anchor key={social} size="sm" c="dimmed">
                  {social}
                </Anchor>
              ))}
            </Group>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}