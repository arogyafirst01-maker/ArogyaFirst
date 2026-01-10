import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
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
  ActionIcon,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
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
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconMenu2,
  IconMailbox,
  IconHeart,
  IconBrain,
  IconApple,
  IconRun,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDisclosure } from '@mantine/hooks';

export default function LandingPage() {
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [mobileMenuOpened, { toggle: toggleMobileMenu, close: closeMobileMenu }] = useDisclosure(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthenticated = status === 'authenticated';
  
  // Compute display name once - only valid if authenticated AND has a real name
  const displayName = (() => {
    if (status !== 'authenticated' || !user) return '';
    const name = 
      user.patientData?.name ||
      user.hospitalData?.name ||
      user.doctorData?.name ||
      user.labData?.name ||
      user.pharmacyData?.name ||
      user.name ||
      '';
    return typeof name === 'string' ? name.trim() : '';
  })();
  
  // Only show personalized greeting if we have BOTH authentication AND a valid name
  const showPersonalizedGreeting = isAuthenticated && displayName.length > 0;

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

  // Get dashboard path based on role
  const getDashboardPath = (role) => {
    switch (role?.toLowerCase()) {
      case 'patient':
      case 'admin':
        return '/dashboard';
      case 'doctor':
        return '/patients';
      case 'hospital':
        return '/hospital-dashboard';
      case 'lab':
        return '/lab-dashboard';
      case 'pharmacy':
        return '/pharmacy-dashboard';
      default:
        return '/dashboard';
    }
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: scrolled ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
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
                  transition: 'color 0.3s ease',
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
                    color: scrolled ? 'hsl(210 15% 15%)' : 'white',
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
                  {showPersonalizedGreeting && displayName ? (
                    <>
                      Welcome back,{' '}
                      <br />
                      <span
                        style={{
                          fontSize: 'clamp(2.5rem, 7vw, 5rem)',
                          fontWeight: 900,
                          color: '#FFB347',
                          position: 'relative',
                          display: 'inline',
                          letterSpacing: '-2px',
                          textShadow: '0 2px 10px rgba(255, 165, 0, 0.3)',
                        }}
                      >
                        {displayName}!
                      </span>
                    </>
                  ) : (
                    <>
                      Your Health,{' '}
                      <br />
                      <span
                        style={{
                          color: '#00ff88',
                          position: 'relative',
                          fontSize: 'inherit',
                          fontWeight: 'inherit',
                          textShadow: '0 2px 10px rgba(0, 255, 136, 0.3)',
                        }}
                      >
                        Connected
                      </span>
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
                  {showPersonalizedGreeting 
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
                  onClick={() => navigate('/bookings/new')}
                  style={{
                    position: 'absolute',
                    top: 30,
                    left: -16,
                    width: 220,
                    background: 'white',
                    border: 'none',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
                    zIndex: 10,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.18)';
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
                  onClick={() => navigate('/dashboard')}
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
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.18)';
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
                  onClick={() => navigate('/dashboard')}
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
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.18)';
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

          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg" className="features-grid">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="glass-card animate-slide-up feature-card"
                p="xl"
                radius="xl"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  border: '2px solid hsl(var(--border))',
                  animationDelay: `${index * 0.1}s`,
                  position: 'relative',
                  transformOrigin: 'center bottom',
                }}
                onMouseEnter={(e) => {
                  // Lift card upward with focus effect
                  e.currentTarget.style.transform = 'translateY(-16px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px -10px hsl(var(--primary) / 0.3), 0 10px 20px -5px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.5)';
                  e.currentTarget.style.zIndex = '10';
                  e.currentTarget.style.background = 'hsl(var(--card))';
                  // Blur and dim other cards for focus effect
                  const allCards = e.currentTarget.parentElement.querySelectorAll('.feature-card');
                  allCards.forEach(card => {
                    if (card !== e.currentTarget) {
                      card.style.filter = 'blur(1.5px) grayscale(30%)';
                      card.style.opacity = '0.6';
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
                  e.currentTarget.style.background = '';
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
                  e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.borderColor = '';
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
                  onClick={() => {
                    if (!isAuthenticated) {
                      // Not logged in - go to login
                      navigate('/login');
                    } else if (isUserRole(portal.role)) {
                      // Logged in as this role - go to dashboard
                      navigate(getDashboardPath(portal.role));
                    } else {
                      // Logged in but as different role - show notification
                      notifications.show({
                        title: 'Access Restricted',
                        message: `You are logged in as ${user?.role}. Please log in as ${portal.role} to access this portal.`,
                        color: 'orange',
                        position: 'bottom-left',
                        autoClose: 4000,
                      });
                    }
                  }}
                >
                  {isUserRole(portal.role) ? 'Go to Dashboard' : 'Sign In'}
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Health Awareness Section */}
      <Box id="health-awareness" component="section" py={96} style={{ background: 'hsl(var(--muted) / 0.2)' }}>
        <Container size="xl">
          <Stack align="center" gap="xl" mb={64}>
            <Badge size="lg" radius="xl" variant="light" color="pink" leftSection={<IconHeart size={16} />}>
              Health Awareness
            </Badge>
            <Title order={2} ta="center" size="2.5rem">
              Stay Informed About{' '}
              <Text component="span" className="gradient-text" inherit>
                Your Health
              </Text>
            </Title>
            <Text size="xl" c="dimmed" ta="center" maw={800}>
              Explore articles and resources to help you maintain a healthy lifestyle
            </Text>
          </Stack>

          <Carousel
            slideSize={{ base: '100%', sm: '50%', md: '33.333%' }}
            slideGap="lg"
            loop
            align="start"
            slidesToScroll={1}
            withIndicators
            nextControlIcon={<IconChevronRight size={20} />}
            previousControlIcon={<IconChevronLeft size={20} />}
            styles={{
              control: {
                backgroundColor: 'white',
                border: '2px solid hsl(var(--border))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                width: 44,
                height: 44,
                '&:hover': {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'white',
                },
              },
              indicator: {
                width: 12,
                height: 12,
                transition: 'all 0.3s ease',
                backgroundColor: 'hsl(var(--border))',
                '&[data-active]': {
                  backgroundColor: 'hsl(var(--primary))',
                  width: 24,
                },
              },
              indicators: {
                bottom: -40,
              },
            }}
          >
            {[
              {
                image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop',
                title: 'Understanding Diabetes Management',
                category: 'CHRONIC DISEASES',
                categoryColor: 'red',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                description: 'Learn essential tips for managing diabetes effectively through diet, exercise, and medication.',
                author: 'Dr. Sarah Johnson',
                date: '15/1/2024',
                tags: ['DIABETES', 'LIFESTYLE', 'DIET'],
              },
              {
                image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=250&fit=crop',
                title: 'Heart-Healthy Diet Guidelines',
                category: 'NUTRITION',
                categoryColor: 'green',
                gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                description: 'Discover the best foods to support cardiovascular health and reduce heart disease risk.',
                author: 'Dr. Michael Chen',
                date: '20/1/2024',
                tags: ['HEART-HEALTH', 'DIET', 'NUTRITION'],
              },
              {
                image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=250&fit=crop',
                title: 'Benefits of Regular Exercise',
                category: 'EXERCISE',
                categoryColor: 'orange',
                gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
                description: 'Explore how physical activity improves overall health and prevents chronic diseases.',
                author: 'Dr. Emily Rodriguez',
                date: '25/1/2024',
                tags: ['EXERCISE', 'FITNESS', 'WELLNESS'],
              },
              {
                image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop',
                title: 'Mental Health & Stress Management',
                category: 'MENTAL HEALTH',
                categoryColor: 'purple',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                description: 'Discover effective strategies for managing stress and improving your mental well-being.',
                author: 'Dr. Lisa Park',
                date: '28/1/2024',
                tags: ['MENTAL-HEALTH', 'STRESS', 'WELLNESS'],
              },
              {
                image: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&h=250&fit=crop',
                title: 'Importance of Sleep Hygiene',
                category: 'GENERAL HEALTH',
                categoryColor: 'blue',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                description: 'Learn how quality sleep impacts your overall health and tips for better rest.',
                author: 'Dr. James Wilson',
                date: '02/2/2024',
                tags: ['SLEEP', 'LIFESTYLE', 'WELLNESS'],
              },
              {
                image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
                title: 'Preventive Health Screenings',
                category: 'PREVENTIVE CARE',
                categoryColor: 'teal',
                gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                description: 'Essential health screenings you should not miss at different stages of life.',
                author: 'Dr. Amanda Foster',
                date: '05/2/2024',
                tags: ['SCREENING', 'PREVENTION', 'HEALTH-CHECK'],
              },
            ].map((article, index) => (
              <Carousel.Slide key={index}>
                <Card
                  shadow="sm"
                  padding={0}
                  radius="lg"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    background: 'white',
                    height: '100%',
                  }}
                  onClick={() => navigate('/health-awareness')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <Card.Section style={{ minHeight: 200, background: article.gradient }}>
                    <Box
                      component="img"
                      src={article.image}
                      alt={article.title}
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken image - gradient background will show through
                        e.currentTarget.style.display = 'none';
                      }}
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                      }}
                    />
                  </Card.Section>

                  <Box p="lg">
                    <Text size="lg" fw={700} mb="xs" lineClamp={2}>
                      {article.title}
                    </Text>

                    <Badge color={article.categoryColor} variant="light" mb="sm">
                      {article.category}
                    </Badge>

                    <Text size="sm" c="dimmed" lineClamp={3} mb="md">
                      {article.description}
                    </Text>

                    <Group gap="xs" mb="md">
                      <IconUsers size={14} color="gray" />
                      <Text size="xs" c="dimmed">{article.author}</Text>
                      <IconCalendar size={14} color="gray" />
                      <Text size="xs" c="dimmed">{article.date}</Text>
                    </Group>

                    <Group gap={6}>
                      {article.tags.map((tag) => (
                        <Badge key={tag} size="xs" variant="dot" color="blue">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Box>
                </Card>
              </Carousel.Slide>
            ))}
          </Carousel>

          <Group justify="center" mt={80}>
            <Button
              size="lg"
              radius="xl"
              rightSection={<IconArrowRight size={18} />}
              onClick={() => navigate('/health-awareness')}
              style={{
                background: 'var(--gradient-hero)',
                boxShadow: '0 8px 32px rgba(0, 119, 182, 0.35)',
              }}
            >
              Explore All Health Topics
            </Button>
          </Group>
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
                  <Anchor href="mailto:arogya.first.01@gmail.com" size="sm" c="dimmed">
                    arogya.first.01@gmail.com
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
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const features = document.getElementById('features');
                    if (features) features.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Features
                </Anchor>
                <Anchor size="sm" c="dimmed" style={{ cursor: 'pointer' }}>
                  Pricing
                </Anchor>
                <Anchor size="sm" c="dimmed" style={{ cursor: 'pointer' }}>
                  Security
                </Anchor>
                <Anchor size="sm" c="dimmed" style={{ cursor: 'pointer' }}>
                  Updates
                </Anchor>
              </Stack>
            </Box>

            {/* Portals */}
            <Box>
              <Text fw={700} mb="md">
                Portals
              </Text>
              <Stack gap="xs">
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const portals = document.getElementById('portals');
                    if (portals) portals.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Patients
                </Anchor>
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const portals = document.getElementById('portals');
                    if (portals) portals.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Doctors
                </Anchor>
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const portals = document.getElementById('portals');
                    if (portals) portals.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Hospitals
                </Anchor>
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const portals = document.getElementById('portals');
                    if (portals) portals.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Labs
                </Anchor>
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const portals = document.getElementById('portals');
                    if (portals) portals.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Pharmacies
                </Anchor>
              </Stack>
            </Box>

            {/* Company */}
            <Box>
              <Text fw={700} mb="md">
                Company
              </Text>
              <Stack gap="xs">
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const about = document.getElementById('about');
                    if (about) about.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  About Us
                </Anchor>
                <Anchor size="sm" c="dimmed" href="mailto:careers@arogyafirst.com">
                  Careers
                </Anchor>
                <Anchor 
                  size="sm" 
                  c="dimmed" 
                  href="mailto:arogya.first.01@gmail.com"
                >
                  Contact
                </Anchor>
                <Anchor size="sm" c="dimmed" style={{ cursor: 'pointer' }}>
                  Blog
                </Anchor>
              </Stack>
            </Box>

            {/* Legal */}
            <Box>
              <Text fw={700} mb="md">
                Legal
              </Text>
              <Stack gap="xs">
                <Anchor size="sm" c="dimmed" href="/privacy">Privacy Policy</Anchor>
                <Anchor size="sm" c="dimmed" href="/terms">Terms of Service</Anchor>
                <Anchor size="sm" c="dimmed" href="mailto:hipaa@arogyafirst.com">HIPAA Compliance</Anchor>
                <Anchor size="sm" c="dimmed" href="/privacy">Cookie Policy</Anchor>
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