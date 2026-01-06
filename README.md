# ArogyaFirst - Healthcare Management Platform

**Current Status:** Phase 1 Development Complete - Manual Testing Phase

ArogyaFirst is a comprehensive healthcare management platform connecting patients, hospitals, doctors, labs, and pharmacies. This monorepo contains the full stack application with backend API and frontend web application.

---

## Documentation

**Setup & Development:**

- [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) - Database, services, and environment variables
- [Testing Guide](docs/TESTING_GUIDE.md) - Manual testing procedures
- [Testing Checklist](docs/TESTING_CHECKLIST.md) - Systematic verification checklists

**Security & Deployment:**

- [Security Audit Guide](docs/SECURITY_AUDIT.md) - Security features and verification
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions

**API & User Guides:**

- [API Reference](docs/API_REFERENCE.md) - Complete endpoint documentation
- [Patient Guide](docs/user-guides/PATIENT_GUIDE.md) - Booking, payments, documents
- [Hospital Guide](docs/user-guides/HOSPITAL_GUIDE.md) - Provider management, analytics
- [Doctor Guide](docs/user-guides/DOCTOR_GUIDE.md) - Consultations, prescriptions
- [Lab Guide](docs/user-guides/LAB_GUIDE.md) - Test management, reports
- [Pharmacy Guide](docs/user-guides/PHARMACY_GUIDE.md) - Inventory, prescriptions

---

## Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose  
**Frontend:** React, Vite  
**Authentication:** JWT with role-based access control  
**Payments:** Razorpay  
**Storage:** Cloudinary (documents, images)  
**Video:** Agora (consultations)  
**Package Manager:** pnpm (workspace monorepo)

---

## Prerequisites

- **Node.js 22+** and pnpm installed
- **MongoDB** running locally or cloud instance
- **Razorpay** account (test/live keys)
- **Cloudinary** account
- **Agora** account (for video consultations)

See [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md) for detailed configuration.

---

## Installation

```bash
# Clone repository
git clone <repository-url>
cd ArogyaFirst

# Install dependencies
pnpm install

# Configure environment variables
# Copy .env.example to .env in apps/api/ and apps/web/
# Fill in MongoDB, Razorpay, Cloudinary, Agora credentials

# Start development servers
pnpm dev
```

**Ports:**

- API: http://localhost:3000
- Web: http://localhost:5173

---

## Running the Application

**Development Mode:**

```bash
# Start both API and Web (recommended)
pnpm dev

# Start API only
pnpm --filter @arogyafirst/api dev

# Start Web only
pnpm --filter @arogyafirst/web dev
```

**Production Build:**

```bash
# Build all apps
pnpm build

# Start API production server
pnpm --filter @arogyafirst/api start
```

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
