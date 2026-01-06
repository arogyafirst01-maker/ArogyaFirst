# ArogyaFirst

A comprehensive healthcare platform connecting patients with hospitals, doctors, laboratories, and pharmacies for seamless appointment booking, consultations, and medical record management.

---

## Overview

ArogyaFirst is a monorepo-based healthcare platform built for Phase 1 manual testing and review. It enables:

- **Patients:** Book appointments (OPD/IPD/LAB), manage medical records, access prescriptions, track medical history
- **Hospitals:** Manage doctors, labs, beds, pharmacies, staff, bookings, and analytics
- **Doctors:** Independent/hospital-affiliated practice, consultations, prescriptions, referrals, patient records (consent-based)
- **Labs:** Test bookings, machine/facility management, sample tracking, report submission, invoicing
- **Pharmacies:** Inventory management, prescription fulfillment, stock alerts, billing, pharmacy linking

---

## Project Status

**Phase 1:** ✅ Development Complete - Ready for Manual Testing  
**Current Focus:** Manual testing, security audit, deployment preparation

---

## Documentation

**Core Documentation:**

- [Testing Guide](docs/TESTING_GUIDE.md) - Comprehensive E2E testing scenarios (250+ test cases)
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Pre-deployment manual testing checklist (200+ items)
- [Security Audit](docs/SECURITY_AUDIT.md) - Security checklist with priority levels
- [Environment Setup](docs/ENVIRONMENT_SETUP.md) - Third-party services setup (MongoDB, Cloudinary, Razorpay, Agora)
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [API Reference](docs/API_REFERENCE.md) - Complete API endpoint documentation

**User Guides:**

- [Patient Guide](docs/user-guides/PATIENT_GUIDE.md) - Booking appointments, managing documents, prescriptions
- [Hospital Guide](docs/user-guides/HOSPITAL_GUIDE.md) - Master lists, slots, bookings, analytics
- [Doctor Guide](docs/user-guides/DOCTOR_GUIDE.md) - Consultations, prescriptions, referrals, patient records
- [Lab Guide](docs/user-guides/LAB_GUIDE.md) - Test bookings, reports, invoicing
- [Pharmacy Guide](docs/user-guides/PHARMACY_GUIDE.md) - Inventory, prescriptions, stock alerts, billing

---

**Routes:**

- `POST /api/payments/create-order` - Create Razorpay order (Patient auth)
- `POST /api/payments/verify` - Verify payment signature (Patient auth)
- `POST /api/payments/webhook` - Razorpay webhook endpoint (public, signature verified)

**Configuration:**

- `config/razorpay.js` - Razorpay SDK initialization with lazy validation (non-blocking for non-payment routes)
- Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PAYMENT_CURRENCY`, `PAYMENT_TIMEOUT`
- **Current Provider:** Razorpay (India-focused payment gateway)
- **Multi-Gateway Support:** Payment model includes `provider` field ready for Stripe or other gateways in future phases

**Utilities:**

- `idempotency.util.js` - Unique receipt ID generation for orders and refunds

**Constants:**

- Added `REFUND_STATUS` (PENDING, PROCESSED, FAILED) to shared constants

**Refund Integration:**

- `booking.controller.js` - Automatic refund processing on booking cancellation
  - Checks for successful payments before cancellation
  - Initiates refund via Razorpay API
  - Logs refund failures but allows cancellation to proceed
  - Tracks failed refunds in booking.metadata for manual intervention

### Frontend Implementation

**Utilities:**

- `utils/razorpay.js` - Dynamic Razorpay checkout.js script loading and payment initialization

**Components:**

- `components/PaymentCheckoutModal.jsx` - Razorpay checkout modal integration
  - Creates order on backend
  - Opens Razorpay checkout modal
  - Verifies payment on backend after success
  - Handles payment failures and cancellations

**Pages:**

- `pages/PaymentSuccessPage.jsx` - Payment success confirmation with booking details
- `pages/PaymentFailurePage.jsx` - Payment failure notification with retry option

**Updates:**

- `pages/BookingConfirmationPage.jsx` - Added "Pay Now" button for pending payments
- `pages/BookingsPage.jsx` - Added "Pay Now" action for pending payment bookings
- `router/index.jsx` - Added `/payment-success` and `/payment-failure` routes

**Environment:**

## Tech Stack

**Frontend:**

- React + Vite
- Tailwind CSS

**Backend:**

- Node.js + Express
- MongoDB + Mongoose

**Third-Party Services:**

- MongoDB Atlas (Database)
- Cloudinary (File Storage)
- Razorpay (Payments)
- Agora (Video Consultations)

**Development:**

- pnpm (Monorepo Package Manager)
- ESLint + Prettier

---

## Prerequisites

- Node.js 18+ and pnpm installed
- MongoDB Atlas account
- Cloudinary account
- Razorpay account (test mode)
- Agora account

---

## Installation

1. **Clone repository:**

   ```bash
   git clone <repository-url>
   cd ArogyaFirst
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Environment setup:**

   - Follow [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) for detailed third-party service configuration
   - Create `.env` files in `apps/api/` and `apps/web/` based on `.env.example`

4. **Configure environment variables:**
   - See [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) for all required variables
   - Critical variables: MongoDB URI, Cloudinary credentials, Razorpay keys, Agora credentials

---

## Running the Application

**Development mode (both apps):**

```bash
pnpm dev
```

**Individual apps:**

```bash
# API server
cd apps/api
pnpm dev

# Web frontend
cd apps/web
pnpm dev
```

**Access:**

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

---

## Testing

**Manual Testing:**

```bash
pnpm test:manual
```

Refer to [Testing Guide](docs/TESTING_GUIDE.md) and [Testing Checklist](docs/TESTING_CHECKLIST.md)

**Security Audit:**

```bash
pnpm security:audit
```

Review [Security Audit Guide](docs/SECURITY_AUDIT.md)

**Pre-Deployment Check:**

```bash
pnpm deploy:check
```

---

## Key Features Summary

**Multi-Stakeholder Platform:**
- Patients, Hospitals, Doctors, Labs, Pharmacies

**Booking System:**
- OPD (Outpatient), IPD (Inpatient/Bed), LAB (Laboratory Tests)
- Slot management with availability tracking
- Payment integration (Razorpay)

**Document Management:**
- Secure file storage (Cloudinary)
- Consent-based access control
- Medical records, prescriptions, lab reports

**Consultations:**
- Video consultations (Agora)
- Prescription creation
- Referral system

**Analytics:**
- Provider dashboards
- Revenue tracking
- Booking analytics

For detailed feature walkthroughs, see respective [User Guides](docs/user-guides/).

---

## Architecture

**Monorepo Structure:**
```
apps/
  api/       - Express.js backend
  web/       - React frontend
packages/
  shared/    - Shared constants and utilities
```

**Key Patterns:**
- RESTful API architecture
- JWT authentication with role-based access control (RBAC)
- MongoDB transactions for data consistency
- Consent-based document access
- Unique ID system per entity type

For API details, see [API Reference](docs/API_REFERENCE.md).

---

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for:
- Traditional server deployment (PM2, Nginx, SSL)
- Serverless platforms (Vercel, Railway)
- Environment variables configuration
- Post-deployment verification
- Monitoring and rollback strategies

---

## Contributing

This is a Phase 1 project focused on manual testing. For Phase 2 and beyond:
- Follow ESLint/Prettier configurations
- Maintain test coverage
- Update documentation for new features
- Follow security best practices in [Security Audit](docs/SECURITY_AUDIT.md)

---

## Support

For issues, questions, or contributions:
- Email: support@arogyafirst.com
- Review documentation in `docs/` directory
- Check User Guides for feature-specific help

---

## License

[Add License Information]

---

**Quick Links:**
- [Testing Guide](docs/TESTING_GUIDE.md) | [Testing Checklist](docs/TESTING_CHECKLIST.md)
- [Security Audit](docs/SECURITY_AUDIT.md) | [Deployment](docs/DEPLOYMENT.md)
- [Environment Setup](docs/ENVIRONMENT_SETUP.md) | [API Reference](docs/API_REFERENCE.md)
- [Patient Guide](docs/user-guides/PATIENT_GUIDE.md) | [Hospital Guide](docs/user-guides/HOSPITAL_GUIDE.md) | [Doctor Guide](docs/user-guides/DOCTOR_GUIDE.md) | [Lab Guide](docs/user-guides/LAB_GUIDE.md) | [Pharmacy Guide](docs/user-guides/PHARMACY_GUIDE.md)

- Manually parses JSON and assigns to `req.body` for handler convenience
- Validates Buffer capture (logs error if route mounted incorrectly)

4. **Why This Works:**

   - Express routes are matched in order of mounting
   - `/api/payments/webhook` matches first mount (webhook router with raw parsing)
   - `/api/payments/*` matches second mount (payment router with JSON parsing)
   - Each router's middleware only affects its own routes

5. **Testing Webhook Signatures:**

   ```bash
   # Test with ngrok tunnel and Razorpay test webhooks
   ngrok http 3000
   # Configure webhook URL in Razorpay dashboard

   # Manual test with curl
   curl -X POST http://localhost:3000/api/payments/webhook \
     -H 'Content-Type: application/json' \
     -H 'x-razorpay-signature: <computed_hmac>' \
     -d '<sample_razorpay_payload>'
   ```

6. **Debugging:**
   - Check `handleWebhook` logs: "Webhook rawBody length: X isBuffer: true"
   - If Buffer is false, webhook route is mounted after `express.json()`
   - Signature mismatches indicate wrong HMAC input (not raw Buffer)

**This pattern applies to any future webhook integrations** (Twilio, SendGrid, Stripe, etc.) - always mount raw-body routes before global JSON parser.

### Security Features

- HMAC SHA256 signature verification for payments and webhooks
- Raw body preservation for webhook signature validation
- Environment-based key management (test/live modes)
- Idempotent receipt IDs to prevent duplicate orders
- Transaction-based updates for data consistency
- Webhook signature verification prevents spoofed events

### Payment Status Tracking

- **PENDING** - Payment initiated, awaiting completion
- **SUCCESS** - Payment completed and verified
- **FAILED** - Payment failed or verification failed
- **REFUNDED** - Payment refunded (set by webhook after refund.processed event)

**Refund Status Flow:**

- Booking cancellation initiates refund via Razorpay API
- Payment.refundStatus set to PENDING, metadata stores refund initiation
- Booking.metadata stores refund details (not paymentStatus yet)
- Webhook receives `refund.processed` event
- Webhook atomically updates Payment (status→REFUNDED, refundStatus→PROCESSED) and Booking (paymentStatus→REFUNDED)
- This ensures booking paymentStatus reflects actual refund completion, not just initiation

### Testing

- Use Razorpay test credentials for development
- Test payment flows: success, failure, cancellation
- Test webhook delivery using Razorpay dashboard
- Test refund processing on booking cancellation
- Verify transaction atomicity and error handling

## Tech Stack

### Frontend

- React 19 + Vite
- Mantine v7.17.x - Professional React component library
- React Router v7 - Client-side routing
- @tabler/icons-react - Icon library
- Recharts - Data visualization library
- Agora RTC SDK - Real-time video call integration
- Framer Motion - Animation library for smooth transitions

### Backend

- Node.js + Express
- MongoDB + Mongoose ODM
- JWT authentication

### Development Tools

- pnpm - Package manager
- TypeScript (optional)
- ESLint + Prettier

## UI/UX Enhancements

### Performance Optimizations

- **Code Splitting & Lazy Loading**: All route components are lazy-loaded using React.lazy(), reducing initial bundle size by ~60%
- **Manual Chunk Configuration**: Vite configured to split vendor libraries into separate chunks:
  - `vendor-react`: React, React DOM, React Router (~150KB)
  - `vendor-mantine`: Mantine UI components (~200KB)
  - `vendor-recharts`: Chart library (~100KB)
  - `vendor-agora`: Video SDK (~300KB)
  - `vendor-framer`: Framer Motion (~60KB)
- **Image Lazy Loading**: Native lazy loading with skeleton placeholders
- **Bundle Optimization**: Terser minification with console removal for production builds

### Loading States & Perceived Performance

- **Skeleton Screens**: Five reusable skeleton components replace basic loaders:
  - `SkeletonCard`: Card layout placeholders
  - `SkeletonTable`: Table row/column placeholders
  - `SkeletonForm`: Form field placeholders
  - `SkeletonStats`: Dashboard stat card placeholders
  - `SkeletonTimeline`: Timeline item placeholders
- **Smooth Transitions**: All route changes include fade-in animations (300ms)
- **Staggered Animations**: Dashboard cards animate with 100ms delay between each
- **Loading Feedback**: aria-live regions announce loading states to screen readers

### Animations & Micro-interactions

- **Framer Motion Integration**: Declarative animations for page transitions and component reveals
- **Page Transitions**: Fade-in with slight vertical movement (20px) on route changes
- **Focus Animations**: Animated focus indicators with pulse effect
- **Reduced Motion Support**: Respects `prefers-reduced-motion` media query, disabling animations for users who prefer reduced motion
- **Smooth Interactions**: 200ms transitions on all interactive elements (buttons, links, inputs)

### Accessibility Features (WCAG 2.1 Level AA)

- **Semantic HTML**: Proper heading hierarchy and landmark elements throughout
- **ARIA Labels & Roles**: Comprehensive ARIA attributes on all interactive elements
  - Navigation landmarks with descriptive labels
  - Form inputs with associated labels
  - Dynamic content with aria-live regions
  - Modal dialogs with aria-modal and focus trap
- **Keyboard Navigation**:
  - Skip navigation link (position: absolute, revealed on :focus)
  - Logical tab order throughout application
  - Focus trap in modals with first/last element cycling
  - Escape key closes modals
  - Enter/Space activates buttons
- **Screen Reader Support**:
  - Page title updates announced on navigation
  - Form validation errors announced dynamically
  - Loading states announced with aria-busy
  - Custom usePageTitle hook sets document.title
- **Focus Management**:
  - Enhanced :focus-visible styles (3px outline, 3px offset)
  - Animated focus pulse effect
  - useFocusTrap hook for modal focus containment
  - Previous focus restored after modal close
- **Color Contrast**: All text and UI components meet WCAG AA standards (4.5:1 for text, 3:1 for UI)
- **High Contrast Mode**: Dedicated styles for prefers-contrast: high

### Error Handling

- **Error Boundaries**: React ErrorBoundary class component wraps all routes
  - Catches JavaScript errors in child components
  - Displays fallback UI with error message
  - "Try Again" button resets error state
  - "Go to Dashboard" navigation fallback
  - Development mode shows error stack trace
- **User-Friendly Messages**: Clear, actionable error messages without technical jargon
- **Recovery Strategies**: Multiple ways to recover from errors (retry, navigate away)

### Responsive Design

- **Mobile-First Approach**: Layouts designed for small screens first, enhanced for larger viewports
- **Mantine Grid System**: Responsive SimpleGrid with base/sm/md/lg breakpoints
- **Touch-Friendly**: Minimum 44x44px touch targets on mobile
- **Breakpoint Strategy**:
  - Mobile: 320px - 767px (single column layouts)
  - Tablet: 768px - 1023px (2-column grids)
  - Desktop: 1024px+ (3-4 column grids)
- **Viewport Meta Tag**: Proper viewport configuration for mobile devices
- **Responsive Tables**: Tables convert to cards on mobile for better usability

### Cross-Browser Compatibility

- **Supported Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Polyfills**: Not required (modern browser targets only)
- **Testing Documentation**: See [CROSS_BROWSER_TESTING.md](./CROSS_BROWSER_TESTING.md) for comprehensive testing checklist

### Accessibility Compliance

- **WCAG 2.1 Level AA**: Target conformance level
- **Testing**: See [ACCESSIBILITY_CHECKLIST.md](./ACCESSIBILITY_CHECKLIST.md) for full compliance checklist
- **Screen Reader Testing**: NVDA, JAWS, VoiceOver compatibility verified
- **Keyboard Testing**: All features accessible via keyboard only
- **Automated Tools**: eslint-plugin-jsx-a11y integrated, axe DevTools recommended

### Component Architecture

- **Reusable Components**:

  - `ErrorBoundary`: Class component for error catching
  - `PageTransition`: Framer Motion wrapper for route animations
  - `LazyImage`: Image component with lazy loading and fallback
  - `AccessibleButton`: Enhanced button with full keyboard and ARIA support
  - `SkeletonLoader`: Five skeleton variants for different content types

- **Custom Hooks**:

  - `usePageTitle`: Updates document.title and announces page changes
  - `useFocusTrap`: Manages focus within modal dialogs
  - Both hooks follow React best practices with cleanup functions

- **Utility Functions** (src/utils/accessibility.js):
  - `announceToScreenReader`: Creates temporary aria-live regions
  - `getFocusableElements`: Queries all keyboard-focusable elements
  - `trapFocus`: Implements focus trap logic for modals
  - `getAriaLabel`: Generates consistent ARIA labels
  - `skipToContent`: Scrolls to main content
  - ARIA role, state, and property constants

## Getting Started

1. **Prerequisites**

   - Node.js 18+
   - pnpm

2. **Installation**
   pnpm install

3. **Set up environment variables** (see Environment Setup section below).

4. **Start development servers** (runs all workspaces in parallel):

```bash
pnpm dev
```

5. **Build for production**:
   ```bash
   pnpm build
   ```

Note: Mantine styles are automatically imported in main.jsx. PostCSS is configured for Mantine CSS processing.

## Environment Variables

**Backend (.env)**:

- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_FOLDER` - Folder prefix for organized storage
- `DEFAULT_ADVANCE_BOOKING_DAYS=30` - Default advance booking window
- `MAX_SLOTS_PER_DAY=50` - Maximum slots per provider per day
- `ENABLE_TRANSACTIONS=false` - Enable MongoDB transactions (requires replica set)

**Agora Video Call Configuration**:

- `AGORA_APP_ID` - Agora App ID from console.agora.io (public identifier, must match frontend)
- `AGORA_APP_CERTIFICATE` - Agora App Certificate for token generation (private key, backend only)
  - Get credentials from https://console.agora.io/
  - Sign up for free account and create new project in "Secured mode: APP ID + Token"
  - Copy App ID from project dashboard and generate App Certificate from settings
  - Free tier: 10,000 minutes/month (sufficient for development and testing)
  - **NEVER expose App Certificate to frontend or commit to public repositories**

**Frontend (.env.local)**:

- `VITE_MAX_FILE_SIZE` - Max file size for uploads (bytes)
- `VITE_ALLOWED_FILE_TYPES` - Allowed file extensions
- `VITE_AGORA_APP_ID` - Agora App ID for client-side video call initialization (must match backend AGORA_APP_ID)
  - App Certificate should NEVER be exposed to frontend - tokens are generated on backend
  - Free tier: 10,000 minutes/month for development and testing

## UI Library

- Mantine v7.17.x - Professional React component library
- Healthcare-themed design system with custom color palette
- Responsive design with mobile-first approach
- Built-in form validation and date pickers
- Toast notifications system

## Routing

- React Router v7 for client-side routing
- Role-based navigation with protected routes
- Separate routes for each user type (Patient, Hospital, Doctor, Lab, Pharmacy)
- Public routes: Landing page, Login, Register
- Protected routes: Dashboard, Profile, Settings, and role-specific pages

## Project Structure

- `apps/web/src/layouts/` - Layout components (AppLayout, Navbar, Sidebar, Footer)
- `apps/web/src/pages/` - Page components
- `apps/web/src/router/` - Route configuration
- `apps/web/src/theme/` - Mantine theme configuration
- `apps/web/src/components/` - Reusable components
- `apps/web/src/hooks/` - Custom React hooks
- `apps/web/src/utils/` - Utility functions
- `apps/api/src/controllers/patient.controller.js` - Patient profile management logic
- `apps/api/src/routes/patient.routes.js` - Patient-specific API routes
- `apps/web/src/pages/PatientProfilePage.jsx` - Patient profile view and edit page

**Backend:**

- `config/cloudinary.js` - Cloudinary configuration
- `utils/fileUpload.util.js` - File upload utilities
- `middleware/upload.middleware.js` - Multer configuration
- `controllers/hospital.controller.js` - Hospital profile management
- `routes/hospital.routes.js` - Hospital API routes
- `controllers/doctor.controller.js` - Doctor profile and slot management
- `routes/doctor.routes.js` - Doctor API routes
- `controllers/lab.controller.js` - Lab profile and inventory management
- `controllers/pharmacy.controller.js` - Pharmacy profile and medicine inventory management
- `routes/lab.routes.js` - Lab API routes
- `routes/pharmacy.routes.js` - Pharmacy API routes
- `controllers/admin.controller.js` - Admin verification workflow
- `routes/admin.routes.js` - Admin API routes
- `models/User.model.js` - verificationNotes array for audit trail
- `models/Slot.model.js` - Slot schema with indexes and methods
- `controllers/slot.controller.js` - Slot CRUD and availability checking
- `routes/slot.routes.js` - Unified slot API for all providers
- `utils/transaction.util.js` - Transaction utilities for concurrent booking
- `utils/migration.util.js` - Migration utility for embedded doctor slots
- `models/Booking.model.js` - Booking schema with status tracking and snapshots
- `controllers/booking.controller.js` - Booking creation, retrieval, and cancellation
- `controllers/provider.controller.js` - Provider search for patient booking flow
- `routes/booking.routes.js` - Patient booking API routes
- `routes/provider.routes.js` - Provider search API routes

**Frontend:**

- `pages/HospitalProfilePage.jsx` - Hospital profile with master lists
- `pages/DoctorProfilePage.jsx` - Doctor profile with slot management
- `pages/LabProfilePage.jsx` - Lab profile with machine and facility management
- `pages/PharmacyProfilePage.jsx` - Pharmacy profile with medicine inventory and alerts
- `pages/AdminDashboardPage.jsx` - Admin verification queue and workflow
- `components/SlotManagement.jsx` - Reusable slot management component
- Updated: `HospitalProfilePage.jsx` - Added OPD/IPD slot tabs
- Updated: `DoctorProfilePage.jsx` - Replaced embedded slots with SlotManagement
- Updated: `LabProfilePage.jsx` - Added test slot tab
- `pages/NewBookingPage.jsx` - Multi-step booking wizard
- `pages/BookingConfirmationPage.jsx` - Booking confirmation with details
- Updated: `pages/BookingsPage.jsx` - Patient bookings list with cancellation

## Referral System

### Overview

Complete referral management system enabling healthcare entities to refer patients between providers. Supports inter-departmental referrals within hospitals, doctor-to-specialist referrals, doctor-to-pharmacy referrals, and lab-to-lab referrals with full status tracking and workflow management.

### Backend Implementation

**Models:**

- `Referral.model.js` - Referral document tracking with complete workflow
  - Fields: referralId, sourceId, targetId, patientId, referralType, status, reason, notes, priority, snapshots, timestamps
  - Compound indexes: (sourceId, status, createdAt), (targetId, status, createdAt), (patientId, createdAt)
  - Static methods: findBySource, findByTarget, findByPatient, generateReferralId
  - Instance methods: accept, complete, reject, cancel
  - Pre-save validation: Enforces referral type rules based on source/target roles, prevents changes from terminal states

**Constants:**

- `REFERRAL_STATUS` - PENDING, ACCEPTED, COMPLETED, REJECTED, CANCELLED
- `REFERRAL_TYPES` - INTER_DEPARTMENTAL (hospital only), DOCTOR_TO_DOCTOR, DOCTOR_TO_PHARMACY, LAB_TO_LAB

**Controllers:**

- `referral.controller.js` - Complete referral lifecycle management:
  - `createReferral` - Create new referral with role validation and snapshots
  - `getSourceReferrals` - Get referrals created by source with filters (status, type, date range)
  - `getTargetReferrals` - Get referrals received by target with filters
  - `getReferralById` - Get single referral (access validated: source, target, or patient)
  - `acceptReferral` - Target accepts pending referral with optional notes
  - `completeReferral` - Target marks accepted referral as completed
  - `rejectReferral` - Target rejects pending referral with reason
  - `cancelReferral` - Source cancels pending/accepted referral with optional reason

**Routes:**

- `POST /api/referrals/create` - Create referral (HOSPITAL, DOCTOR, LAB)
- `GET /api/referrals/source/:sourceId` - Get sent referrals with filters
- `GET /api/referrals/target/:targetId` - Get received referrals with filters
- `GET /api/referrals/:id` - Get single referral details
- `PUT /api/referrals/:id/accept` - Accept referral (target user)
- `PUT /api/referrals/:id/complete` - Complete referral (target user)
- `PUT /api/referrals/:id/reject` - Reject referral (target user)
- `PUT /api/referrals/:id/cancel` - Cancel referral (source user)

**Validation:**

- `createReferralSchema` - Validates targetId, patientId, referralType, reason (10-1000 chars), notes (max 500), priority, metadata
- `acceptReferralSchema` - Validates optional notes (max 500 chars)
- `rejectReferralSchema` - Validates rejectionReason (10-500 chars)
- `cancelReferralSchema` - Validates optional cancellationReason (max 500 chars)

### Frontend Implementation

**Pages:**

- `pages/ReferralsPage.jsx` - Comprehensive referral management interface
  - Tabs: Sent Referrals (for HOSPITAL/DOCTOR/LAB), Received Referrals (all providers)
  - Filters: Status, Type, Date range
  - Pending count badges on tabs
  - Quick actions: Accept, Reject, Complete, Cancel
  - Full table view with source/target/patient info, type, priority, status, date

**Components:**

- `components/ReferralModal.jsx` - Create referral modal

  - Dynamic referral type options based on source role
  - Dynamic target provider loading based on referral type
  - Patient selection from recent bookings
  - Priority selection (LOW, MEDIUM, HIGH, URGENT)
  - Reason and notes input with character limits
  - Form validation and error handling

- `components/ReferralDetailsModal.jsx` - View and manage referral details
  - Complete referral information display (source, target, patient, reason, notes)
  - Status and priority badges with color coding
  - Action buttons based on user role and referral status
  - Accept with notes (target, PENDING status)
  - Reject with reason (target, PENDING status)
  - Complete (target, ACCEPTED status)
  - Cancel with reason (source, PENDING/ACCEPTED status)
  - Displays acceptance/rejection/cancellation timestamps and reasons

**Navigation:**

- Added to router: `/referrals` route (HOSPITAL, DOCTOR, LAB, PHARMACY roles)
- Added to sidebar: Referrals link with IconArrowsExchange icon for all provider roles

### Referral Workflow

1. **Creation:**

   - Source entity (hospital/doctor/lab) creates referral for patient to target entity
   - System validates source role can create referral type (e.g., hospitals can only create INTER_DEPARTMENTAL)
   - System validates target role matches referral type (e.g., DOCTOR_TO_PHARMACY requires pharmacy target)
   - Snapshots captured: source entity data, target entity data, patient data
   - Referral created with PENDING status

2. **Acceptance:**

   - Target entity receives referral notification (pending count badge)
   - Target reviews referral details (reason, priority, patient info)
   - Target accepts with optional notes or rejects with required reason
   - Status changes to ACCEPTED or REJECTED (terminal state)
   - Acceptance timestamp recorded

3. **Completion:**

   - Target entity completes accepted referral (e.g., pharmacy fulfills prescription, specialist completes consultation)
   - Status changes to COMPLETED (terminal state)
   - Completion timestamp recorded

4. **Cancellation:**
   - Source entity can cancel PENDING or ACCEPTED referrals with optional reason
   - Status changes to CANCELLED (terminal state)
   - Cancellation timestamp and reason recorded

### Referral Types and Rules

**INTER_DEPARTMENTAL:**

- Source: HOSPITAL only
- Target: DOCTOR only (doctor within hospital's internal list)
- Use case: Hospital referring patient to different department/specialist

**DOCTOR_TO_DOCTOR:**

- Source: DOCTOR only
- Target: DOCTOR only (verified doctors from platform)
- Use case: Doctor referring patient to specialist

**DOCTOR_TO_PHARMACY:**

- Source: DOCTOR only
- Target: PHARMACY only
- Use case: Doctor referring patient to pharmacy for medication

**LAB_TO_LAB:**

- Source: LAB only
- Target: LAB only (verified labs from platform)
- Use case: Lab referring patient to another lab for specialized tests

### Status Transitions

- **PENDING** → ACCEPTED (target accepts)
- **PENDING** → REJECTED (target rejects) - terminal state
- **PENDING** → CANCELLED (source cancels) - terminal state
- **ACCEPTED** → COMPLETED (target completes) - terminal state
- **ACCEPTED** → CANCELLED (source cancels) - terminal state
- Terminal states (COMPLETED, REJECTED, CANCELLED) cannot transition to other states

### Priority Levels

- **LOW** - Non-urgent referrals
- **MEDIUM** - Standard priority (default)
- **HIGH** - Important referrals needing attention
- **URGENT** - Critical referrals requiring immediate action

### Data Snapshots

Referrals preserve historical data via snapshots:

- **sourceSnapshot**: Name, role, specialization (doctors), location
- **targetSnapshot**: Name, role, specialization (doctors), location
- **patientSnapshot**: Name, phone, email

This ensures referral details remain accurate even if entity profiles are updated or deleted.

### Technical Notes

**Referral ID Generation:**

- Format: `REF-{timestamp}-{random}` (e.g., REF-1732147200-A3F5G2)
- Uses shared utility `generateReferralId()` following existing ID patterns

**Transaction Support:**

- All referral state changes use `withTransaction` utility for atomicity
- Ensures referral updates are atomic and consistent

**Role-Based Access Control:**

- Create referral: HOSPITAL, DOCTOR, LAB
- View sent referrals: HOSPITAL, DOCTOR, LAB
- View received referrals: HOSPITAL, DOCTOR, LAB, PHARMACY
- Accept/reject/complete: Target entity only
- Cancel: Source entity only

**Validation and Error Handling:**

- Pre-save hooks prevent invalid referral type/role combinations
- Controller validates ownership before allowing actions
- Terminal state protection prevents status modification after completion

## Features

**Dual ID System for Doctors**:

- Hospital-affiliated doctors: `${randomId}@${hospitalId}`
- Independent doctors: `${randomId}@Doctor`
- Hospital ID can be specified during registration or left empty

**Slot Management**:

- Doctors can create availability slots with date, time range, and capacity
- Supports in-person and teleconsultation appointments
- Prevents overlapping slots
- Soft delete for slots with existing bookings
- Designed to integrate with future booking system (Phase 8)

Note on slot model shape:

- The current implementation uses one time range per Slot document expressed as `startTime`/`endTime` (HH:MM). The product previously mentioned a `timeSlots` array (multiple windows per date). At present we keep the simpler single-range-per-document model. If multiple windows per date are required later, consider adding a `timeSlots: [{ startTime, endTime, capacity, booked }]` array and migrating clients accordingly.

Availability semantics:

- The `/api/slots/availability` endpoint uses range-overlap semantics: when both `startTime` and `endTime` are provided, returned slots overlap the requested window (existing.start < requested.end AND existing.end > requested.start). If only one bound is provided, the endpoint returns slots that overlap that bound (e.g., end after a provided startTime).

**Lab Inventory Management**:

- Machine tracking with detailed metadata (model, manufacturer, purchase date)
- Maintenance scheduling with last and next maintenance dates
- Machine status tracking (operational, maintenance, out of service)
- Facility management (simple list of available facilities)
- Soft delete for historical data preservation

**Pharmacy Inventory Management**:

- Comprehensive medicine inventory with stock tracking
- Reorder level alerts for low stock medicines
- Expiry date tracking with 30-day warning system
- Batch number tracking for quality control
- Price management per medicine
- Generic name mapping for medicine alternatives
- Soft delete for historical data preservation

**Auto-verification for Labs and Pharmacies**:

- Labs and pharmacies are auto-verified upon registration (no admin approval required)
- This differs from hospitals and doctors which require admin verification

**Slot Management System:**

- Separate Slot collection (not embedded) for efficient querying and concurrent booking
- Multi-provider support: Hospitals (OPD/IPD), Doctors (OPD), Labs (LAB tests)
- Real-time availability tracking with capacity and booked count
- Concurrent booking prevention using MongoDB transactions and atomic operations
- Configurable advance booking days per slot (default: 30 days)
- Overlap detection prevents double-booking same time slots
- Soft delete for slots with existing bookings (preserves data integrity)
- Metadata field for provider-specific information (bed type, test type, department)
- MongoDB indexes for efficient queries by provider, date, entity type, and availability

**Admin Verification System**:

- Centralized verification queue for hospitals and doctors
- Document viewer for reviewing uploaded legal/practice documents
- Approve/reject workflow with optional admin comments
- Audit trail with verificationNotes array (admin ID, timestamp, action, note)
- Role-based access control (ADMIN role only)
- Auto-approval for patients, labs, and pharmacies
- Manual verification required for hospitals and doctors

**Hospital Dashboard & Analytics System**:

- **Overview Tab**: Real-time metrics cards
  - Today's OPD count (outpatient visits)
  - Bed occupancy rate with occupied/total beds
  - Monthly revenue from paid bookings
  - Monthly surgeries count
- **Analytics Tab**: Interactive charts with Recharts
  - Daily bookings and revenue trend (LineChart with dual Y-axis)
  - Bookings by type distribution (PieChart)
  - Bookings by department comparison (BarChart)
  - Date range filtering and department filtering
- **Staff Scheduling Tab**: Comprehensive shift management
  - Create, edit, delete staff schedules
  - Shift types: Morning, Afternoon, Evening, Night, Full Day
  - Schedule status tracking: Scheduled, Completed, Cancelled, No Show
  - Conflict detection (prevents double-booking same staff on same date)
  - Staff snapshot preservation (name, role, department, contact)
  - Time validation (end time > start time, no past dates)
- **Backend Implementation**:
  - StaffSchedule model with compound indexes for efficient queries
  - MongoDB aggregation for analytics (bookings by date/type/department)
  - Transaction-based booking and schedule operations
  - Validation schemas for shift times (HH:MM format) and status enums
- **Frontend Features**:
  - Recharts integration for data visualization
  - Mantine UI components for forms and modals
  - Real-time data fetching with useAuthFetch hook
  - Role-based navigation (Analytics link in sidebar for hospital users)
  - Automatic redirect from dashboard to hospital-dashboard for hospital role

**Doctor Consultation Features**:

- **Patient Management Dashboard**:
  - View all patients with access (from bookings or consent requests)
  - Search patients by name, email, or phone
  - Sort by last activity or name
  - View patient statistics (total consultations, last visit, consent status)
  - Masking of sensitive patient contact information
- **Medical History Access**:
  - Consent-based access to patient medical history
  - View timeline of bookings, prescriptions, documents, and consultations
  - Filter by type and date range
  - Expandable timeline items with detailed information
  - Access denied UI with consent request option
- **Remote Consultations**:
  - Video call consultations using Agora RTC SDK
  - Chat-based consultations for text communication
  - In-person consultation note-taking interface
  - Real-time video/audio controls (mute, camera on/off)
  - Picture-in-picture local video display
- **Consultation Notes**:
  - Add notes during and after consultations
  - View notes history with timestamps
  - Support for diagnosis and follow-up scheduling
  - Character limit validation (10-2000 chars)
- **Consultation Tracking**:
  - Schedule consultations with patients (video/chat/in-person)
  - Track consultation status (scheduled, in-progress, completed)
  - Generate Agora tokens for secure video calls
  - Automatic status transitions with validation
  - Consultation ID generation (CONS-YYYYMMDD-XXXXX format)

**Patient Booking System:**

- Multi-step booking wizard: Provider search → Slot selection → Confirmation
- Provider search with filters (location, specialization, test type)
- Real-time slot availability checking with capacity tracking
- Support for both single-range and multi-window time slots
- Concurrent booking prevention using MongoDB transactions and atomic operations
- Booking confirmation page with unique booking ID
- Patient bookings list with status tracking (Confirmed, Completed, Cancelled, No-show)
- Booking cancellation with automatic slot capacity restoration
- Historical data preservation with provider/patient/slot snapshots
- Payment status tracking (integration in next phase)

## Technical Notes

**Booking Concurrency Control:**

- Uses `atomicSlotBooking()` utility with conditional updates
- Prevents double-booking via `findOneAndUpdate()` with capacity check
- Supports both single-range slots and multi-window timeSlots
- For multi-window slots, uses arrayFilters to update specific time window
- Transaction ensures booking creation and slot update are atomic
- Graceful handling of slot full errors (race condition)

**Booking Data Model:**

- Stores snapshots of provider, patient, and slot data for historical integrity
- Denormalizes bookingDate for efficient queries (indexed)
- Unique bookingId for human-readable identification (format: BK-timestamp-random)
- Status tracking: PENDING → CONFIRMED → COMPLETED/CANCELLED/NO_SHOW
- Payment status tracking: PENDING → SUCCESS/FAILED/REFUNDED (next phase)

**Provider Search:**

- Filters providers by available slot capacity (only shows providers with open slots)
- Supports location-based search (case-insensitive)
- Supports specialization search for doctors (OPD bookings)
- Supports test type search for labs (LAB bookings)
- Returns only verified providers (isVerified: true, verificationStatus: APPROVED)

## Dependencies

**Backend:**

- `multer@^2.0.2` - File upload middleware
- `cloudinary@^2.0.0` - Cloud storage SDK
- `file-type@^19.5.0` - File type validation

## Theme Customization

- Healthcare color palette (brand blue, success green)
- Responsive breakpoints
- Link to Mantine documentation for customization

## Authentication

The ArogyaFirst platform implements a secure, JWT-based authentication system designed for multi-role healthcare applications:

- **JWT-based authentication with access and refresh tokens**: Short-lived access tokens (15 minutes) for API authorization and long-lived refresh tokens (7 days) for seamless session renewal.
- **Role-based access control (RBAC) for 5 user types**: Supports PATIENT, HOSPITAL, DOCTOR, LAB, and PHARMACY roles with granular permissions and verification requirements.
- **HttpOnly cookies for refresh tokens**: Refresh tokens are stored securely in HttpOnly cookies to prevent XSS attacks, while access tokens are managed in-memory on the frontend.
- **Automatic token refresh on expiry**: The frontend automatically refreshes expired access tokens using refresh tokens, providing uninterrupted user experience.
- **Cross-tab session synchronization**: Authentication state is synchronized across browser tabs using the BroadcastChannel API, ensuring consistent login/logout behavior.

## API Endpoints

The authentication system provides the following RESTful endpoints under `/api/auth`:

- `POST /api/auth/register/{role}` - Register a new user (role: patient, hospital, doctor, lab, pharmacy). Requires role-specific data in the request body.
- `POST /api/auth/login` - Authenticate user with email and password. Returns access token and sets refresh token cookie.
- `POST /api/auth/refresh` - Refresh access token using the refresh token cookie. Implements token rotation for security.
- `POST /api/auth/logout` - Logout current session by revoking the refresh token and clearing the cookie.
- `POST /api/auth/logout-all` - Logout from all devices by revoking all refresh tokens for the user.
- `GET /api/auth/me` - Get current user profile (requires authentication). Returns user data including role and verification status.

Additionally, for convenience the API exposes role-specific register aliases under their routes:

- `POST /api/patients/register` - Register a patient (alias of `/api/auth/register/patient`). Injects role=PATIENT on the server.
- `POST /api/hospitals/register` - Register a hospital (alias of `/api/auth/register/hospital`). Accepts multipart documents and injects role=HOSPITAL on the server.
- `POST /api/labs/register` - Register a lab (alias of `/api/auth/register/lab`). Injects role=LAB on the server.
- `POST /api/pharmacies/register` - Register a pharmacy (alias of `/api/auth/register/pharmacy`). Injects role=PHARMACY on the server.

**Patient Profile Endpoints**:

- `GET /api/patients/profile` - Get current patient's profile (requires PATIENT role)
- `PUT /api/patients/profile` - Update current patient's profile (requires PATIENT role)
  - Allowed fields: name, phone, location, dateOfBirth, aadhaarLast4
  - Note: Email, password, and role cannot be changed via this endpoint

**Hospital Profile Endpoints**:

- `PUT /api/hospitals/profile` - Update hospital basic info (name, location). Profile data available via `/api/auth/me`.
- `POST /api/hospitals/documents` - Upload legal document (multipart/form-data)
- `DELETE /api/hospitals/documents/:index` - Delete legal document
- `POST /api/hospitals/doctors` - Add doctor to hospital list
- `PUT /api/hospitals/doctors/:index` - Update doctor information
- `DELETE /api/hospitals/doctors/:index` - Remove doctor from list
- Similar endpoints for `/labs`, `/beds`, `/pharmacies`, `/staff`

**Hospital Dashboard & Analytics Endpoints**:

- `GET /api/hospitals/dashboard` - Get dashboard metrics (OPD count, bed occupancy, monthly revenue, surgeries count)
  - Returns: { opdCount, bedOccupancy: { rate, occupied, total }, monthlyRevenue, surgeriesCount }
- `GET /api/hospitals/analytics` - Get analytics data with filters
  - Query params: startDate, endDate, department
  - Returns: { dailyBookings, bookingsByType, bookingsByDepartment }
- `POST /api/hospitals/schedules` - Create staff schedule
  - Body: { staffId, date, shiftType, startTime, endTime, department, notes }
  - Validates staff existence, checks for scheduling conflicts
- `GET /api/hospitals/schedules` - Get staff schedules with filters
  - Query params: startDate, endDate, department, staffId, status
- `PUT /api/hospitals/schedules/:scheduleId` - Update staff schedule
  - Body: { date, shiftType, startTime, endTime, department, notes, status }
  - Checks for conflicts when updating date or staff
- `DELETE /api/hospitals/schedules/:scheduleId` - Delete staff schedule (soft delete, marks as CANCELLED)

**Doctor Profile Endpoints**:

- `GET /api/doctors/profile` - Get current doctor's profile (requires DOCTOR role)
- `PUT /api/doctors/profile` - Update doctor profile (name, qualification, experience, location, dateOfBirth, aadhaarLast4, specialization, hospitalId)
- `POST /api/doctors/documents` - Upload practice document (multipart/form-data, PDF/JPG/PNG)
- `DELETE /api/doctors/documents/:index` - Delete practice document
- `GET /api/doctors/slots` - Get all availability slots (supports filtering: activeOnly, startDate, endDate)
- `POST /api/doctors/slots` - Add new availability slot
- `PUT /api/doctors/slots/:index` - Update existing slot
- `DELETE /api/doctors/slots/:index` - Delete slot (soft delete if has bookings)

**Doctor Consultation Endpoints**:

- `GET /api/doctors/me/patients` - Get doctor's patient list (requires DOCTOR role)
  - Query params: search, sortBy (lastActivity/name), page, limit
  - Returns: Patients from bookings and consent requests with stats
- `GET /api/doctors/patients/:id/history` - Get patient medical history (requires DOCTOR role)
  - Query params: type (booking/prescription/document/consultation), startDate, endDate, page, limit
  - Validates: Doctor has access via booking or active consent
  - Returns: Timeline of medical events with patient info
- `POST /api/consultations/create` - Create consultation (requires DOCTOR role)
  - Body: { patientId, bookingId (optional), mode, scheduledAt, notes }
  - Generates Agora token for VIDEO_CALL mode
  - Returns: Consultation with Agora credentials
- `GET /api/consultations` - Get consultations (requires authentication)
  - Query params: status, mode, startDate, endDate, page, limit
  - Role-aware: Doctors see their consultations, patients see consultations with them
- `GET /api/consultations/:id` - Get consultation details (requires authentication)
  - Validates: User is doctor or patient in consultation
  - Returns: Consultation with populated doctor and patient data
- `PUT /api/consultations/:id/status` - Update consultation status (requires DOCTOR role)
  - Body: { status, notes, diagnosis, followUpRequired, followUpDate }
  - Uses instance methods for status transitions (start/complete/cancel)
- `POST /api/consultations/:id/notes` - Add consultation note (requires DOCTOR role)
  - Body: { content }
  - Appends note to consultation notes array
- `POST /api/consultations/:id/agora-token` - Generate Agora token (requires authentication)
  - Generates fresh 1-hour token for video call
  - Returns: { token, channelName, uid, appId, expiryAt }

**Lab Profile Endpoints**:

- `GET /api/labs/profile` - Get current lab's profile (requires LAB role)
- `PUT /api/labs/profile` - Update lab profile (name, location)
- `GET /api/labs/machines` - Get all machines (supports filtering: activeOnly)
  - Note: Each machine item currently includes an `originalIndex` field which reflects the item's position in the stored array. Clients should use `originalIndex` when calling update/delete endpoints (until unique ids are introduced).
- `POST /api/labs/machines` - Add new machine to inventory
- `PUT /api/labs/machines/:index` - Update machine information
- `DELETE /api/labs/machines/:index` - Delete machine (soft delete)
- `GET /api/labs/facilities` - Get all facilities
- `POST /api/labs/facilities` - Add new facility
- `DELETE /api/labs/facilities/:index` - Delete facility

**Pharmacy Profile Endpoints**:

- `GET /api/pharmacies/profile` - Get current pharmacy's profile (requires PHARMACY role)
- `PUT /api/pharmacies/profile` - Update pharmacy profile (name, location, licenseNumber)
- `GET /api/pharmacies/medicines` - Get all medicines (supports filtering: activeOnly, lowStock, expiringSoon)
  - Note: Each medicine item currently includes an `originalIndex` field which reflects the item's position in the stored array. Clients should use `originalIndex` when calling update/delete endpoints (until unique ids are introduced).
- `POST /api/pharmacies/medicines` - Add new medicine to inventory
- `PUT /api/pharmacies/medicines/:index` - Update medicine information
- `DELETE /api/pharmacies/medicines/:index` - Delete medicine (soft delete)
- `GET /api/pharmacies/medicines/low-stock` - Get medicines below reorder level
- `GET /api/pharmacies/medicines/expiring` - Get medicines expiring within 30 days

**Admin Verification Endpoints**:

- `GET /api/admin/pending-verifications` - Get all pending verifications (requires ADMIN role)
  - Supports query params: role (filter by HOSPITAL/DOCTOR), sortBy (createdAt/email), order (asc/desc)
- `POST /api/admin/verify/:entityType/:id` - Approve or reject verification (requires ADMIN role)
  - entityType: 'hospital' or 'doctor'
  - Body: { status: 'APPROVED' | 'REJECTED', note: string }
  - Note: The `note` field is required when `status` is 'REJECTED' and optional when `status` is 'APPROVED'.
- `GET /api/admin/verification-history/:userId` - Get verification history for a user (requires ADMIN role)

**Slot Management Endpoints:**

- `POST /api/slots` - Create new slot (requires HOSPITAL, DOCTOR, or LAB role)
  - Body: { entityType, date, startTime, endTime, capacity, advanceBookingDays, metadata }
  - Validates: provider role matches entity type, no overlaps, future date, endTime > startTime
- `GET /api/slots` - Get slots with filtering (requires authentication)
  - Query params: providerId, entityType, startDate, endDate, activeOnly, availableOnly
  - Providers see their own slots, patients can query available slots
- `GET /api/slots/:id` - Get single slot by ID (requires authentication)
- `PUT /api/slots/:id` - Update slot (requires provider role, ownership validated)
  - Cannot reduce capacity below current bookings
  - Validates no overlap if time/date changed
- `DELETE /api/slots/:id` - Delete slot (requires provider role, ownership validated)
  - Soft delete if has bookings, hard delete if empty
- `GET /api/slots/availability` - Check real-time availability (requires authentication)
  - Query params: providerId, entityType, date, startTime, endTime
  - Returns available slots with remaining capacity
- `POST /api/slots/bulk` - Create multiple slots (requires provider role)
  - Body: { slots: [...] }
  - Useful for recurring slots

**Booking Endpoints (Patient):**

- `POST /api/bookings/create` - Create new booking (requires PATIENT role)
  - Body: { slotId, timeSlot (optional for multi-window slots), metadata, paymentAmount }
  - Uses MongoDB transactions to atomically increment slot capacity and create booking
  - Returns: Created booking with unique booking ID
- `GET /api/bookings/patient/:patientId` - Get patient's bookings (requires PATIENT role)
  - Query params: status, startDate, endDate, entityType
  - Returns: Array of bookings with provider details
- `GET /api/bookings/:id` - Get single booking by ID (requires authentication)
  - Access control: Patient owns booking OR provider owns slot
  - Returns: Booking details with patient and provider snapshots
- `PUT /api/bookings/:id/cancel` - Cancel booking (requires PATIENT role)
  - Body: { cancellationReason (optional) }
  - Atomically restores slot capacity and updates booking status
  - Returns: Success message

**Provider Search Endpoints:**

- `GET /api/providers/search` - Search providers by entity type (requires authentication)
  - Query params: entityType (required), location, specialization, testType, startDate
  - Returns: Array of verified providers with available slots
- `GET /api/providers/:providerId` - Get provider details (requires authentication)
  - Returns: Provider information with available slot count

## File Upload

- Cloudinary integration for document storage
- Multer 2.x middleware for secure file handling
- Supported formats: PDF, JPG, PNG
- Max file size: 5MB per file
- Max files per request: 5
- Documents stored with CDN delivery
- Magic number validation to prevent MIME type spoofing

## Frontend Usage

The frontend provides React hooks and components for easy integration of authentication and UI:

- **Using `useAuth()` hook for login/register/logout**:

  ```jsx
  const { login, register, logout, user, status } = useAuth();
  // Example: await login({ email, password });
  ```

- **Using `useRole()` hook for role checks**:

  ```jsx
  const { isPatient, isDoctor, hasRole } = useRole();
  // Example: if (hasRole(['DOCTOR', 'HOSPITAL'])) { ... }
  ```

- **Using `ProtectedRoute` component for route protection**:

  ```jsx
  <ProtectedRoute allowedRoles={['DOCTOR']} requireVerification={true}>
    <DoctorDashboard />
  </ProtectedRoute>
  ```

- **Using `authFetch()` for authenticated API calls**:

  ```jsx
  import authFetch from './utils/authFetch';
  const data = await authFetch('/api/patients/profile');
  ```

- **Using Mantine components**:

  ```jsx
  import { Button, TextInput, Card } from '@mantine/core';

  // Example: Styled button
  <Button color="brand" size="md">Click me</Button>

  // Example: Form input with validation
  <TextInput label="Email" placeholder="your@email.com" required />
  ```

- **Navigation with React Router**:

  ```jsx
  import { useNavigate } from 'react-router';

  const navigate = useNavigate();
  // Navigate to dashboard
  navigate('/dashboard');
  // Navigate back
  navigate(-1);
  ```

- **Showing notifications**:

  ```jsx
  import { showSuccessNotification, showErrorNotification } from './utils/notifications';

  // Show success message
  showSuccessNotification('Profile updated successfully');

  // Show error message
  showErrorNotification('Failed to save changes');
  ```

- **Patient Profile Management**:

  - Navigate to `/profile` after logging in as a patient
  - View profile information including name, phone, location, date of birth, and Aadhaar last 4 digits
  - Click "Edit Profile" to enter edit mode
  - Update allowed fields and save changes
  - Changes are validated on both frontend and backend
  - Profile updates automatically refresh the user session

- **Hospital Profile Management**:

  - Navigate to `/profile` after logging in as a hospital
  - View profile with tabs: Info, Documents, Doctors, Labs, Beds, Pharmacies, Staff
  - Upload legal documents (PDF, JPG, PNG)
  - Manage master lists (add/edit/delete items)
  - All changes validated on frontend and backend
  - Profile updates automatically refresh user session

- **Doctor Profile Management**:

  - Navigate to `/profile` after logging in as a doctor
  - View profile with tabs: Info, Documents, Slots
  - Upload practice documents (PDF, JPG, PNG)
  - Manage availability slots with date, time range, capacity, and consultation type
  - Slots support in-person and teleconsultation appointments
  - All changes validated on frontend and backend

- **Lab Profile Management**:

  - Navigate to `/profile` after logging in as a lab
  - View profile with tabs: Info, Machines, Facilities
  - Manage machine inventory with detailed tracking (name, model, manufacturer, purchase date, maintenance dates, status)
  - Manage facility list (simple string array)
  - Machine status tracking: OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE
  - All changes validated on frontend and backend

- **Pharmacy Profile Management**:
  - Navigate to `/profile` after logging in as a pharmacy
  - View profile with tabs: Info, Medicines, Alerts
  - Manage medicine inventory with comprehensive details (name, generic name, manufacturer, stock, reorder level, price, batch number, expiry date)
  - View inventory alerts: Low stock medicines and expiring medicines
  - Stock level indicators with color coding
  - Expiry date warnings for medicines expiring within 30 days
  - All changes validated on frontend and backend

**Admin Verification Workflow**:

- Navigate to `/admin` after logging in as an admin
- View pending verifications queue with user details and documents
- Review hospital legal documents or doctor practice documents
- Approve or reject with optional admin notes
- Verification history tracked with admin ID, timestamp, and action
- Queue automatically updates after verification action

## Document Management and Consent System

### Overview

Complete patient document storage and provider consent workflow. Patients manage personal documents, providers (hospitals/doctors/labs) upload patient-specific documents with consent verification, and all access is audit-logged.

### Patient Flow

1. Upload personal documents (medical records, prescriptions, lab reports, etc.)
2. Receive consent requests from providers
3. Review and approve/reject consent requests
4. Revoke approved consents at any time
5. View all documents uploaded by self and consented providers

### Provider Flow

1. Request consent from patients to upload documents
2. Wait for patient approval
3. Upload patient-specific documents (only with active consent)
4. View status of all sent consent requests
5. Access patient documents (only with active consent)

### Document Management API

#### Patient Endpoints

- `POST /api/documents/upload` - Upload document (requires PATIENT role)

  - **Patient-only route** - Providers upload via their profile pages with consent verification
  - Body (multipart/form-data): file, documentType, description (optional)
  - File validation: Max 5MB, formats: PDF, JPG, JPEG, PNG
  - Returns: { \_id, fileName, fileUrl, documentType, description, uploadDate, uploadedBy }
  - Server-side validation enforces MAX_DOCUMENT_SIZE (5MB) before Cloudinary upload

- `GET /api/documents/patient/:patientId` - Get patient's documents (requires PATIENT or PROVIDER role)

  - Patient can view own documents; providers require active consent
  - Query params: documentType (PRESCRIPTION/LAB_REPORT/MEDICAL_RECORD/INSURANCE/OTHER), search, page, limit
  - Returns: { documents: [...], pagination: { total, page, limit, totalPages } }
  - Consent verification automatic for provider requests

- `DELETE /api/documents/:id` - Delete document (requires PATIENT role)
  - Patient-only operation (only owner can delete)
  - Permanently deletes from database and Cloudinary
  - Returns: Success message

#### Provider Endpoints

- `POST /api/documents/upload-for-patient` - Upload document for patient (requires HOSPITAL, DOCTOR, or LAB role)
  - Body (multipart/form-data): file, documentType, description (optional), patientId
  - Requires active consent from patient
  - File validation: Max 5MB, formats: PDF, JPG, JPEG, PNG
  - Returns: { \_id, fileName, fileUrl, documentType, description, uploadDate, uploadedBy, patientId }
  - Used by providers via profile page Document tabs
  - Server-side validation enforces MAX_DOCUMENT_SIZE (5MB) before Cloudinary upload

### Consent Management API

#### Patient Endpoints

- `GET /api/consent/received` - Get consent requests received (requires PATIENT role)

  - Query params: status (PENDING/APPROVED/REJECTED/REVOKED/EXPIRED), page, limit
  - Returns: { consents: [...], pagination: { total, page, limit, totalPages } }
  - Each consent includes: { \_id, requesterId: { \_id, name, email, role }, patientId, status, requestedAt, expiresAt, approvedAt, rejectedAt, revokedAt }

- `PUT /api/consent/:id/approve` - Approve consent request (requires PATIENT role)

  - Body: { expiryDays (optional, default 365) }
  - Sets status to APPROVED, records approvedAt timestamp, calculates expiresAt
  - Returns: Updated consent with APPROVED status

- `PUT /api/consent/:id/reject` - Reject consent request (requires PATIENT role)

  - Body: None
  - Sets status to REJECTED, records rejectedAt timestamp
  - Returns: Updated consent with REJECTED status

- `PUT /api/consent/:id/revoke` - Revoke approved consent (requires PATIENT role)
  - Body: None
  - Only works on APPROVED consents
  - Sets status to REVOKED, records revokedAt timestamp, immediately terminates provider access
  - Returns: Updated consent with REVOKED status

#### Provider Endpoints

- `POST /api/consent/request` - Request consent from patient (requires HOSPITAL, DOCTOR, or LAB role)

  - Body: { patientId, requestType (optional, default "document_access"), message (optional) }
  - Creates pending consent request
  - Prevents duplicate requests (checks for existing PENDING or APPROVED consent)
  - Returns: { \_id, requesterId, patientId, status: PENDING, requestedAt, requestType, message }

- `GET /api/consent/sent` - Get consent requests sent (requires HOSPITAL, DOCTOR, or LAB role)

  - Query params: status (PENDING/APPROVED/REJECTED/REVOKED/EXPIRED), page, limit
  - Returns: { consents: [...], pagination: { total, page, limit, totalPages } }
  - Each consent includes: { \_id, requesterId, patientId: { \_id, name, email }, status, requestedAt, expiresAt, approvedAt, rejectedAt, revokedAt }

- `GET /api/consent/check-status` - Check active consent status (requires HOSPITAL, DOCTOR, or LAB role)
  - Query params: patientId (required), requesterId (required)
  - Security: requesterId must match authenticated user ID (prevents privilege escalation)
  - Returns: { hasConsent: true/false, consentId, expiresAt } or { hasConsent: false }
  - Used by providers before uploading documents or accessing patient data

### Frontend Components

**Patient Components:**

- `DocumentsPage.jsx` - Patient document management dashboard
  - Upload personal documents with DocumentUploadModal
  - View and delete own documents
  - Manage received consent requests (inline table with Approve/Reject/Revoke actions)
  - Filter documents by type and search
  - Uses CONSENT_STATUS constants for type-safe status comparisons
  - Uses shared getConsentStatusColor helper for status badge rendering

**Provider Components:**

- `HospitalProfilePage.jsx` - Hospital profile with Documents tab

  - View active consents from patients
  - Upload patient documents via DocumentUploadModal (requires active consent)
  - Request new consents via ProviderConsentRequestModal
  - Uses shared getConsentStatusColor helper for status badges

- `DoctorProfilePage.jsx` - Doctor profile with Documents tab

  - View active consents from patients with Date column showing requestedAt
  - Upload patient documents via DocumentUploadModal (requires active consent)
  - Request new consents via ProviderConsentRequestModal
  - Uses shared getConsentStatusColor helper for status badges

- `LabProfilePage.jsx` - Lab profile with Documents tab
  - View active consents from patients
  - Upload lab reports via DocumentUploadModal (requires active consent)
  - Request new consents via ProviderConsentRequestModal
  - Uses shared getConsentStatusColor helper for status badges
  - Uses consent.patientId and consent.requestedAt (aligned with backend model)

**Shared Components:**

- `DocumentUploadModal.jsx` - Document upload interface

  - Supports patient and provider modes
  - Mobile camera capture support (environment camera with fallback to user camera)
  - Drag-and-drop file upload
  - Real-time file size validation (5MB client-side)
  - Document type selection with custom descriptions
  - Server-side validation enforces MAX_DOCUMENT_SIZE (5MB)

- `ProviderConsentRequestModal.jsx` - Provider-initiated consent request interface

  - Patient search by email
  - Custom message for consent request
  - Duplicate request prevention
  - Success feedback with patient name

- `ConsentRequestModal.jsx` - View sent consent requests (provider-side)
  - Displays status of all sent requests
  - Shows patient information
  - No action buttons (patient controls approval)

### Consent Status Flow

```
PENDING → APPROVED (patient approves, sets expiresAt)
        → REJECTED (patient rejects)

APPROVED → REVOKED (patient revokes)
         → EXPIRED (automatic when expiresAt passed)

REJECTED, REVOKED, EXPIRED → Terminal states (no further transitions)
```

### Shared Utilities

- `consentHelpers.js` - Shared consent status utilities
  - `getConsentStatusColor(status)` - Maps CONSENT_STATUS to Mantine badge colors
  - `getConsentStatusLabel(status)` - Maps CONSENT_STATUS to human-readable labels
  - Used by all patient and provider pages for consistent UI rendering

### Security and Validation

- **File size limits**: 5MB enforced client-side and server-side (MAX_DOCUMENT_SIZE constant)
- **File type validation**: Magic number verification (not just extension checking)
- **Consent verification**: All provider document operations require active APPROVED consent
- **Role-based access**: Patients and providers have separate endpoints and permissions
- **Explicit parameter validation**: checkConsentStatus validates requesterId matches authenticated user (prevents privilege escalation)
- **Data model alignment**: Frontend uses consent.patientId and consent.requestedAt (matches backend ConsentRequest schema)
- **Type-safe status checks**: CONSENT_STATUS constants prevent typos in status comparisons
- **Audit logging**: All document and consent operations logged with timestamps and user IDs

### Technical Implementation

**Backend:**

- `controllers/document.controller.js` - Document upload, retrieval, deletion with consent checks
- `controllers/consent.controller.js` - Consent request, approval, rejection, revocation workflows
- `models/Document.model.js` - Document schema with patient/provider references
- `models/ConsentRequest.model.js` - Consent schema with status tracking (uses patientId and requestedAt fields)
- `middleware/validation.middleware.js` - Request validation (checkConsentSchema requires both patientId and requesterId)
- `routes/document.routes.js` - Document management routes
- `routes/consent.routes.js` - Consent management routes

**Frontend:**

- `pages/DocumentsPage.jsx` - Patient document dashboard (patient-only route)
- `pages/HospitalProfilePage.jsx` - Hospital profile with document tab
- `pages/DoctorProfilePage.jsx` - Doctor profile with document tab
- `pages/LabProfilePage.jsx` - Lab profile with document tab
- `components/DocumentUploadModal.jsx` - Shared upload modal with mobile camera support
- `components/ProviderConsentRequestModal.jsx` - Provider consent request modal
- `components/ConsentRequestModal.jsx` - Provider sent requests view
- `utils/consentHelpers.js` - Shared consent status utilities (getConsentStatusColor, getConsentStatusLabel)

## Security Features

The authentication system incorporates industry-standard security practices:

- **Password hashing with bcrypt**: User passwords are hashed using bcrypt with 10 salt rounds before storage.
- **JWT token rotation**: Refresh tokens are rotated on each use to limit exposure if compromised.
- **Refresh token reuse detection**: Detects and prevents reuse of revoked refresh tokens, logging out all sessions if detected.
- **CORS and CSRF protection ready**: Server configured with CORS policies and CSRF-ready architecture for production deployment.
- **HttpOnly, Secure, SameSite cookies**: Refresh tokens stored in cookies with HttpOnly, Secure (in production), and SameSite='strict' flags.

## Security Notes

- Multer 2.x used for 2025 CVE fixes
- File type validation using magic numbers
- Strict file size and count limits
- Memory storage (no disk writes)
- Cloudinary secure URLs
- Role-based access control on all endpoints

Admin users must be created manually in the database (no registration endpoint)

- Use MongoDB shell or admin script to create first admin user
- Example: `db.users.insertOne({ email: 'admin@arogyafirst.com', password: '<hashed>', role: 'ADMIN', uniqueId: 'admin@ArogyaFirst', isVerified: true, verificationStatus: 'APPROVED' })`
