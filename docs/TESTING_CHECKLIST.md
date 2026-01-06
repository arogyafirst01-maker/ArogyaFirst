# ArogyaFirst - Pre-Deployment Testing Checklist

## Introduction

This checklist ensures all features are tested before production deployment. Use this in conjunction with `TESTING_GUIDE.md` for detailed test scenarios.

---

## Pre-Testing Setup

- [ ] All environment variables configured correctly
- [ ] MongoDB connection successful
- [ ] Cloudinary uploads working
- [ ] Razorpay test mode configured
- [ ] Agora video calls initialized
- [ ] Backend server running without errors
- [ ] Frontend dev server running
- [ ] Admin user created in database
- [ ] Test data prepared (sample users, slots, etc.)

---

## Authentication & Authorization

- [ ] Patient registration with valid data succeeds
- [ ] Hospital registration with document upload succeeds
- [ ] Doctor registration (independent) succeeds
- [ ] Doctor registration (hospital-affiliated) succeeds
- [ ] Lab registration succeeds
- [ ] Pharmacy registration succeeds
- [ ] Duplicate email registration fails with proper error
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails
- [ ] Access token expires after 15 minutes
- [ ] Refresh token automatically refreshes access token
- [ ] Logout clears refresh token cookie
- [ ] Logout all devices invalidates all refresh tokens
- [ ] Protected routes require authentication
- [ ] Role-based access control enforced (e.g., patient can't access hospital endpoints)
- [ ] Ownership checks prevent unauthorized access (e.g., patient A can't view patient B's data)

---

## Patient Workflows

- [ ] View and edit profile
- [ ] Search for hospitals by location
- [ ] Search for doctors by specialization
- [ ] Search for labs by test type
- [ ] View available slots for selected provider
- [ ] Book OPD appointment with payment
- [ ] Book IPD (bed) with payment
- [ ] Book lab test with payment
- [ ] Receive booking confirmation with booking ID
- [ ] View booking list (upcoming, past, cancelled)
- [ ] Cancel booking and receive refund
- [ ] Upload document (PDF, JPG, PNG)
- [ ] View uploaded documents
- [ ] Approve consent request from provider
- [ ] Revoke consent
- [ ] View prescriptions
- [ ] Pre-book prescription at pharmacy
- [ ] View medical history timeline
- [ ] Filter medical history by type and date
- [ ] Search medical history
- [ ] Browse health awareness articles
- [ ] Filter articles by category
- [ ] View dashboard with health metrics

---

## Hospital Workflows

- [ ] View and edit profile
- [ ] Upload legal documents
- [ ] Add doctor to hospital list
- [ ] Add lab to hospital list
- [ ] Add bed with type (General, ICU, etc.)
- [ ] Add pharmacy to hospital list
- [ ] Add staff member
- [ ] Create OPD slots
- [ ] Create IPD (bed) slots
- [ ] View booking dashboard (all, today, upcoming, past)
- [ ] Create manual booking for walk-in patient
- [ ] Update booking status (Confirm, Complete, No-show)
- [ ] View patient details (with consent)
- [ ] Request consent to access patient documents
- [ ] Submit document to patient account
- [ ] Create staff schedule
- [ ] View staff schedules
- [ ] View hospital dashboard metrics (OPD count, bed occupancy, revenue)
- [ ] View analytics with date range filter
- [ ] View analytics with department filter
- [ ] Create inter-departmental referral

---

## Doctor Workflows

- [ ] View and edit profile
- [ ] Upload practice documents
- [ ] Add specialization
- [ ] Create OPD slots
- [ ] View booking dashboard
- [ ] Create manual booking for walk-in
- [ ] Update booking status
- [ ] View patient list (consent-based)
- [ ] View patient medical history (with consent)
- [ ] Request consent to access patient documents
- [ ] Create prescription with medicine search
- [ ] View prescriptions created
- [ ] Create consultation (video/chat/in-person)
- [ ] Start video consultation with Agora
- [ ] Send chat messages during consultation
- [ ] Add consultation notes
- [ ] Complete consultation
- [ ] Create referral to specialist
- [ ] Create referral to pharmacy
- [ ] View sent referrals
- [ ] View received referrals

---

## Lab Workflows

- [ ] View and edit profile
- [ ] Add machine to inventory
- [ ] Update machine status
- [ ] Add facility details
- [ ] Create lab test slots
- [ ] View booking dashboard
- [ ] Create manual booking for walk-in
- [ ] Update booking status
- [ ] Submit lab report to patient account
- [ ] Generate invoice for lab test
- [ ] Mark invoice as paid
- [ ] View lab dashboard metrics
- [ ] Create referral to another lab
- [ ] View sent/received referrals

---

## Pharmacy Workflows

- [ ] View and edit profile
- [ ] Add medicine to inventory
- [ ] Update medicine stock
- [ ] View low stock alerts
- [ ] View expiring medicines alerts
- [ ] View prescription queue
- [ ] Fulfill prescription
- [ ] Generate invoice for prescription
- [ ] Mark invoice as paid
- [ ] View pharmacy dashboard metrics
- [ ] Link with doctor (pharmacy linking)
- [ ] View linked doctors

---

## Admin Workflows

- [ ] Login as admin
- [ ] View pending verification queue
- [ ] Filter queue by role (Hospital, Doctor)
- [ ] View hospital details and documents
- [ ] View doctor details and documents
- [ ] Approve hospital verification with comment
- [ ] Reject hospital verification with reason
- [ ] Approve doctor verification
- [ ] Reject doctor verification
- [ ] View verification history for user
- [ ] Verify audit trail (all actions logged with timestamp)

---

## Payment Integration

- [ ] Create Razorpay order for booking
- [ ] Razorpay checkout modal opens
- [ ] Payment with test card succeeds
- [ ] Payment verification succeeds
- [ ] Booking status updates to CONFIRMED
- [ ] Payment status updates to SUCCESS
- [ ] Payment with test failure card fails
- [ ] Payment failure handled gracefully
- [ ] Booking cancellation triggers refund
- [ ] Refund status tracked correctly
- [ ] Webhook receives payment notifications
- [ ] Webhook signature verification works
- [ ] Idempotency prevents duplicate payments

---

## Document Management

- [ ] Patient uploads document successfully
- [ ] Provider submits document to patient account
- [ ] Document stored in Cloudinary
- [ ] Document URL accessible
- [ ] Provider requests consent to access documents
- [ ] Patient receives consent request notification
- [ ] Patient approves consent
- [ ] Provider can view documents after approval
- [ ] Patient revokes consent
- [ ] Provider loses access after revocation
- [ ] Consent expires after set duration
- [ ] File type validation (only PDF, JPG, PNG)
- [ ] File size validation (max 5MB)
- [ ] Malicious file upload rejected

---

## Slot Management

- [ ] Create single slot
- [ ] Create bulk slots
- [ ] View available slots
- [ ] Check slot availability
- [ ] Update slot capacity
- [ ] Delete slot without bookings
- [ ] Prevent slot deletion with bookings
- [ ] Concurrent booking prevention (two users booking same slot)
- [ ] Slot capacity decrements on booking
- [ ] Slot capacity increments on cancellation

---

## Referral System

- [ ] Hospital creates inter-departmental referral
- [ ] Doctor creates referral to specialist
- [ ] Doctor creates referral to pharmacy
- [ ] Lab creates referral to another lab
- [ ] Receiving entity sees referral in queue
- [ ] Accept referral
- [ ] Reject referral with reason
- [ ] Complete referral
- [ ] Cancel referral
- [ ] View referral history
- [ ] Referral status tracking

---

## Consultation System

- [ ] Create video consultation
- [ ] Generate Agora token
- [ ] Join video call (doctor)
- [ ] Join video call (patient)
- [ ] Video/audio working
- [ ] Send chat messages
- [ ] Receive chat messages in real-time
- [ ] Add consultation notes
- [ ] Complete consultation
- [ ] View consultation history

---

## Billing System

- [ ] Generate invoice for lab test
- [ ] Generate invoice for prescription
- [ ] Invoice includes line items
- [ ] Tax calculation correct (GST/CGST/SGST)
- [ ] Total amount calculated correctly
- [ ] Mark invoice as paid
- [ ] View invoice list
- [ ] Filter invoices by status

---

## UI/UX

- [ ] All pages load without errors
- [ ] Loading states show during API calls
- [ ] Skeleton screens display while loading
- [ ] Error messages user-friendly
- [ ] Success notifications appear
- [ ] Forms validate input
- [ ] Required fields marked
- [ ] Date pickers work correctly
- [ ] File upload UI intuitive
- [ ] Tables sortable and filterable
- [ ] Pagination works
- [ ] Modals open and close properly
- [ ] Responsive on mobile (320px width)
- [ ] Responsive on tablet (768px width)
- [ ] Responsive on desktop (1920px width)

---

## Accessibility

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader compatible (test with NVDA/JAWS)
- [ ] Color contrast meets WCAG AA standards
- [ ] Form errors announced to screen readers
- [ ] Skip to main content link present

---

## Cross-Browser Testing

- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance

- [ ] Initial page load < 3 seconds
- [ ] API response times < 500ms
- [ ] Images optimized and lazy loaded
- [ ] No console errors
- [ ] No memory leaks (check DevTools)
- [ ] Bundle size reasonable (< 500KB gzipped)

---

## Security

- [ ] Passwords hashed (not visible in database)
- [ ] JWT tokens secure (HttpOnly cookies for refresh)
- [ ] CORS configured correctly
- [ ] Helmet security headers present
- [ ] File upload validation working
- [ ] SQL/NoSQL injection prevented
- [ ] XSS prevention working
- [ ] CSRF protection ready (SameSite cookies)
- [ ] Rate limiting implemented (if applicable)
- [ ] Sensitive data not logged
- [ ] Environment variables not exposed to client

---

## Edge Cases

- [ ] Network failure during booking
- [ ] Payment timeout
- [ ] Expired token handling
- [ ] Concurrent slot booking
- [ ] Large file upload (> 5MB rejected)
- [ ] Invalid file type upload rejected
- [ ] Booking past date prevented
- [ ] Slot deletion with bookings prevented
- [ ] Consent revocation during active access
- [ ] Refund for already refunded payment prevented

---

## Final Checks

- [ ] All environment variables documented
- [ ] README.md up to date
- [ ] API documentation complete
- [ ] User guides created
- [ ] Deployment guide ready
- [ ] Security audit completed
- [ ] No hardcoded credentials
- [ ] No console.log in production code
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring configured (uptime, performance)
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## Sign-off

- [ ] Developer tested all features
- [ ] QA team reviewed (if applicable)
- [ ] Product owner approved
- [ ] Security team reviewed
- [ ] Ready for production deployment

---

## Notes

Document any issues found during testing:

**Issue 1:**

- Description:
- Severity:
- Status:

**Issue 2:**

- Description:
- Severity:
- Status:

---

_For detailed test scenarios, see `docs/TESTING_GUIDE.md`_  
_For security checklist, see `docs/SECURITY_AUDIT.md`_  
_For deployment instructions, see `docs/DEPLOYMENT.md`_
