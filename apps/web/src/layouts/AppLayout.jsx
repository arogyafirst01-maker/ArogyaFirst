import { AppShell } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function AppLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const { status } = useAuth();

  // Check if we're on the landing page
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    if (isMobile && opened) {
      close();
    }
  }, [location.pathname, isMobile, opened, close]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && opened) {
        close();
      }
    };

    if (opened) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [opened, close]);

  // Show landing page without sidebar for both authenticated and unauthenticated users
  if (status !== 'authenticated' || isLandingPage) {
    return <Outlet />;
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 260,
          breakpoint: 'sm',
          collapsed: { mobile: !opened, desktop: false },
        }}
        footer={{ height: 60 }}
        padding="md"
      >
        <AppShell.Header role="banner">
          <Navbar opened={opened} toggle={toggle} />
        </AppShell.Header>
        <AppShell.Navbar role="navigation" aria-label="Main navigation">
          <Sidebar opened={opened} />
        </AppShell.Navbar>
        <AppShell.Main role="main" id="main-content" tabIndex={-1}>
          <Outlet />
        </AppShell.Main>
        <AppShell.Footer role="contentinfo">
          <Footer />
        </AppShell.Footer>
      </AppShell>
    </>
  );
}