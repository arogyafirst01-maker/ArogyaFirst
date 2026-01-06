import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Link } from 'react-router';
import { Container, Title, Text, Button } from '@mantine/core';
import AppLayout from '../layouts/AppLayout.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import PageTransition from '../components/PageTransition.jsx';
import { SkeletonStats, SkeletonCard, SkeletonForm, SkeletonTable } from '../components/SkeletonLoader.jsx';
import { ROLES } from '@arogyafirst/shared';
import { useAuth } from '../contexts/AuthContext.jsx';

// Lazy load all page components
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage.jsx'));
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));
const BookingsPage = lazy(() => import('../pages/BookingsPage.jsx'));
const PrescriptionsPage = lazy(() => import('../pages/PrescriptionsPage.jsx'));
const ReferralsPage = lazy(() => import('../pages/ReferralsPage.jsx'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage.jsx'));
const NewBookingPage = lazy(() => import('../pages/NewBookingPage.jsx'));
const BookingConfirmationPage = lazy(() => import('../pages/BookingConfirmationPage.jsx'));
const PaymentSuccessPage = lazy(() => import('../pages/PaymentSuccessPage.jsx').then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = lazy(() => import('../pages/PaymentFailurePage.jsx').then(m => ({ default: m.PaymentFailurePage })));
const PatientProfilePage = lazy(() => import('../pages/PatientProfilePage.jsx'));
const HospitalProfilePage = lazy(() => import('../pages/HospitalProfilePage.jsx'));
const DoctorProfilePage = lazy(() => import('../pages/DoctorProfilePage.jsx'));
const LabProfilePage = lazy(() => import('../pages/LabProfilePage.jsx'));
const PharmacyProfilePage = lazy(() => import('../pages/PharmacyProfilePage.jsx'));
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage.jsx'));
const HospitalDashboardPage = lazy(() => import('../pages/HospitalDashboardPage.jsx'));
const MedicalHistoryPage = lazy(() => import('../pages/MedicalHistoryPage.jsx'));
const HealthAwarenessPage = lazy(() => import('../pages/HealthAwarenessPage.jsx'));
const DoctorDashboardPage = lazy(() => import('../pages/DoctorDashboardPage.jsx'));
const PatientHistoryViewerPage = lazy(() => import('../pages/PatientHistoryViewerPage.jsx'));
const ConsultationPage = lazy(() => import('../pages/ConsultationPage.jsx'));
const ConsultationsListPage = lazy(() => import('../pages/ConsultationsListPage.jsx'));
const LabDashboardPage = lazy(() => import('../pages/LabDashboardPage.jsx'));
const PharmacyDashboardPage = lazy(() => import('../pages/PharmacyDashboardPage.jsx'));
const TermsPage = lazy(() => import('../pages/TermsPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage.jsx'));
const SettingsPage = lazy(() => import('../pages/SettingsPage.jsx'));
const SchedulePage = lazy(() => import('../pages/SchedulePage.jsx'));
const DoctorsManagementPage = lazy(() => import('../pages/DoctorsManagementPage.jsx'));
const LabsManagementPage = lazy(() => import('../pages/LabsManagementPage.jsx'));
const BedsManagementPage = lazy(() => import('../pages/BedsManagementPage.jsx'));
const StaffManagementPage = lazy(() => import('../pages/StaffManagementPage.jsx'));
const PharmacyManagementPage = lazy(() => import('../pages/PharmacyManagementPage.jsx'));
const MachinesPage = lazy(() => import('../pages/MachinesPage.jsx'));
const PurchaseOrdersPage = lazy(() => import('../pages/PurchaseOrdersPage.jsx'));
const InventoryPage = lazy(() => import('../pages/InventoryPage.jsx'));
const BillingPage = lazy(() => import('../pages/BillingPage.jsx'));
const ContactPage = lazy(() => import('../pages/ContactPage.jsx'));
const ReportsPage = lazy(() => import('../pages/ReportsPage.jsx'));

const PlaceholderPage = ({ title }) => (
  <Container size="md" py="xl">
    <Title order={2}>{title}</Title>
    <Text>Coming soon...</Text>
    <Button component={Link} to="/dashboard">Back to Dashboard</Button>
  </Container>
);

// Helper to wrap components with error boundary, suspense, and page transition
const withPageWrapper = (Component, options = {}) => {
  const {
    fallback = <SkeletonStats count={4} />,
    fallbackPath = '/dashboard',
    errorFallback
  } = options;
  
  return (
    <ErrorBoundary fallbackPath={fallbackPath} fallback={errorFallback}>
      <Suspense fallback={<Container size="xl" py="xl">{fallback}</Container>}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
};

// BookingsPage and PrescriptionsPage moved to their own files under pages/

const ProfileRouter = () => {
  const { user } = useAuth();
  const role = user?.role;
  
  if (role === ROLES.HOSPITAL) {
    return <HospitalProfilePage />;
  }
  if (role === ROLES.DOCTOR) {
    return <DoctorProfilePage />;
  }
  if (role === ROLES.LAB) {
    return <LabProfilePage />;
  }
  if (role === ROLES.PHARMACY) {
    return <PharmacyProfilePage />;
  }
  return <PatientProfilePage />;
};

const WrappedProfileRouter = () => (
  <ErrorBoundary fallbackPath="/dashboard">
    <Suspense fallback={<Container size="xl" py="xl"><SkeletonForm /></Container>}>
      <ProfileRouter />
    </Suspense>
  </ErrorBoundary>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: withPageWrapper(LandingPage, { fallback: <SkeletonCard count={2} />, fallbackPath: '/' }) },
      { path: "login", element: withPageWrapper(LoginPage, { fallback: <SkeletonForm />, fallbackPath: '/' }) },
      { path: "forgot-password", element: withPageWrapper(ForgotPasswordPage, { fallback: <SkeletonForm />, fallbackPath: '/login' }) },
      { path: "register", element: withPageWrapper(RegisterPage, { fallback: <SkeletonForm />, fallbackPath: '/login' }) },
      { path: "dashboard", element: <ProtectedRoute>{withPageWrapper(DashboardPage, { fallback: <SkeletonStats count={4} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      {
        path: "profile",
        element: (
          <ProtectedRoute allowedRoles={[ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]}>
            <WrappedProfileRouter />
          </ProtectedRoute>
        )
      },
      { path: "settings", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT, ROLES.DOCTOR, ROLES.HOSPITAL, ROLES.LAB, ROLES.PHARMACY]}>{withPageWrapper(SettingsPage, { fallback: <SkeletonForm />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      {
        path: "admin",
        element: (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            {withPageWrapper(AdminDashboardPage, { fallback: <SkeletonTable rows={10} />, fallbackPath: '/dashboard' })}
          </ProtectedRoute>
        )
      },
  // Patient + Provider bookings (single route, role-aware)
  { path: "bookings", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT, ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]}>{withPageWrapper(BookingsPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
  { path: "bookings/new", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>{withPageWrapper(NewBookingPage, { fallback: <SkeletonCard count={3} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
  { 
    path: "bookings/:bookingId/confirmation", 
    element: (
      <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
        {withPageWrapper(BookingConfirmationPage, { fallback: <SkeletonCard count={1} />, fallbackPath: '/bookings' })}
      </ProtectedRoute>
    ) 
  },
  { 
    path: "payment-success", 
    element: (
      <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
        {withPageWrapper(PaymentSuccessPage, { fallback: <SkeletonCard count={1} />, fallbackPath: '/bookings' })}
      </ProtectedRoute>
    ) 
  },
  { 
    path: "payment-failure", 
    element: (
      <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
        {withPageWrapper(PaymentFailurePage, { fallback: <SkeletonCard count={1} />, fallbackPath: '/bookings' })}
      </ProtectedRoute>
    ) 
  },
  // Patient document management - patient-only route
  // Providers access patient documents via their profile pages (Patient Documents/Reports tabs)
  { path: "documents", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>{withPageWrapper(DocumentsPage, { fallback: <SkeletonCard count={4} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
  { path: "prescriptions", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT, ROLES.DOCTOR, ROLES.PHARMACY]}>{withPageWrapper(PrescriptionsPage, { fallback: <SkeletonCard count={3} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
  { path: "referrals", 
    element: (
      <ProtectedRoute allowedRoles={[ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB, ROLES.PHARMACY]}>
        {withPageWrapper(ReferralsPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/dashboard' })}
      </ProtectedRoute>
    ) 
  },
  { path: "medical-history", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>{withPageWrapper(MedicalHistoryPage, { fallback: <SkeletonCard count={5} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
  { path: "health-awareness", element: <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>{withPageWrapper(HealthAwarenessPage, { fallback: <SkeletonCard count={6} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      // Hospital routes
      { path: "hospital-dashboard", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(HospitalDashboardPage, { fallback: <SkeletonStats count={4} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      { path: "doctors", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(DoctorsManagementPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/hospital-dashboard' })}</ProtectedRoute> },
      { path: "labs", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(LabsManagementPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/hospital-dashboard' })}</ProtectedRoute> },
      { path: "beds", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(BedsManagementPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/hospital-dashboard' })}</ProtectedRoute> },
      { path: "staff", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(StaffManagementPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/hospital-dashboard' })}</ProtectedRoute> },
      { path: "pharmacy", element: <ProtectedRoute allowedRoles={[ROLES.HOSPITAL]}>{withPageWrapper(PharmacyManagementPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/hospital-dashboard' })}</ProtectedRoute> },
      // Doctor routes
      { path: "schedule", element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>{withPageWrapper(SchedulePage, { fallback: <SkeletonCard count={3} />, fallbackPath: '/patients' })}</ProtectedRoute> },
      { path: "patients", element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>{withPageWrapper(DoctorDashboardPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      { path: "patients/:id/history", element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>{withPageWrapper(PatientHistoryViewerPage, { fallback: <SkeletonCard count={5} />, fallbackPath: '/patients' })}</ProtectedRoute> },
      { path: "consultations", element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>{withPageWrapper(ConsultationsListPage, { fallback: <SkeletonCard count={3} />, fallbackPath: '/patients' })}</ProtectedRoute> },
      { path: "consultations/:id", element: <ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.PATIENT]}>{withPageWrapper(ConsultationPage, { fallback: <SkeletonCard count={2} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      // Lab routes
      { path: "lab-dashboard", element: <ProtectedRoute allowedRoles={[ROLES.LAB]}>{withPageWrapper(LabDashboardPage, { fallback: <SkeletonStats count={4} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      { path: "reports", element: <ProtectedRoute allowedRoles={[ROLES.LAB]}>{withPageWrapper(ReportsPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/lab-dashboard' })}</ProtectedRoute> },
      { path: "machines", element: <ProtectedRoute allowedRoles={[ROLES.LAB]}>{withPageWrapper(MachinesPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/lab-dashboard' })}</ProtectedRoute> },
      // Pharmacy routes
      { path: "pharmacy-dashboard", element: <ProtectedRoute allowedRoles={[ROLES.PHARMACY]}>{withPageWrapper(PharmacyDashboardPage, { fallback: <SkeletonStats count={4} />, fallbackPath: '/dashboard' })}</ProtectedRoute> },
      { path: "purchase-orders", element: <ProtectedRoute allowedRoles={[ROLES.PHARMACY]}>{withPageWrapper(PurchaseOrdersPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/pharmacy-dashboard' })}</ProtectedRoute> },
      { path: "inventory", element: <ProtectedRoute allowedRoles={[ROLES.PHARMACY]}>{withPageWrapper(InventoryPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/pharmacy-dashboard' })}</ProtectedRoute> },
      { path: "billing", element: <ProtectedRoute allowedRoles={[ROLES.PHARMACY]}>{withPageWrapper(BillingPage, { fallback: <SkeletonTable rows={5} />, fallbackPath: '/pharmacy-dashboard' })}</ProtectedRoute> },
      // Legal / informational pages
      { path: "privacy", element: withPageWrapper(PrivacyPolicyPage, { fallback: <SkeletonCard count={2} />, fallbackPath: '/' }) },
      { path: "terms", element: withPageWrapper(TermsPage, { fallback: <SkeletonCard count={2} />, fallbackPath: '/' }) },
      { path: "contact", element: withPageWrapper(ContactPage, { fallback: <SkeletonForm />, fallbackPath: '/' }) },
      { path: "*", element: withPageWrapper(NotFoundPage, { fallback: <SkeletonCard count={1} />, fallbackPath: '/' }) }
    ]
  }
]);

const Router = () => (
  <RouterProvider router={router} />
);

export default Router;
