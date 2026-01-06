# ArogyaFirst - API Reference

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://api.yourdomain.com`

## Authentication

All protected endpoints require JWT Bearer token in Authorization header:

```
Authorization: Bearer <access_token>
```

Refresh tokens are sent as HttpOnly cookies.

## Common Response Formats

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message"
}
```

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication Endpoints

### POST /api/auth/register/patient

Register new patient.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "phone": "9876543210",
  "location": "Mumbai, Maharashtra",
  "dob": "1990-01-01",
  "aadhaarLast4": "1234"
}
```

**Response:** `201`

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "access_token",
    "uniqueId": "9876543210@ArogyaFirst"
  }
}
```

### POST /api/auth/register/hospital

Register new hospital (requires legal document upload).

**Request Body:**

```json
{
  "name": "City Hospital",
  "email": "hospital@example.com",
  "password": "securepass123",
  "location": "Delhi, India",
  "legalDocuments": ["cloudinary_url"]
}
```

### POST /api/auth/register/doctor

Register new doctor.

**Request Body:**

```json
{
  "name": "Dr. Smith",
  "email": "doctor@example.com",
  "password": "securepass123",
  "qualification": "MD Cardiology",
  "experience": "10 years",
  "location": "Mumbai",
  "dob": "1980-01-01",
  "aadhaarLast4": "5678",
  "hospitalId": "optional_hospital_id"
}
```

### POST /api/auth/register/lab

Register new lab.

**Request Body:**

```json
{
  "name": "City Diagnostics",
  "email": "lab@example.com",
  "password": "securepass123",
  "phone": "9876543210",
  "location": "Bangalore, Karnataka",
  "licenseNumber": "LAB123456"
}
```

**Response:** `201`

**Note:** Role automatically set to LAB. Also available at `/api/labs/register`.

### POST /api/auth/register/pharmacy

Register new pharmacy.

**Request Body:**

```json
{
  "name": "MediPlus Pharmacy",
  "email": "pharmacy@example.com",
  "password": "securepass123",
  "phone": "9876543210",
  "location": "Chennai, Tamil Nadu",
  "licenseNumber": "PHARM123456"
}
```

**Response:** `201`

**Note:** Role automatically set to PHARMACY. Also available at `/api/pharmacies/register`.

### POST /api/auth/login

Login user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "token": "access_token",
    "user": { ... }
  }
}
```

Sets refresh token as HttpOnly cookie.

### POST /api/auth/refresh

Refresh access token (requires refresh token cookie).

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "token": "new_access_token"
  }
}
```

### POST /api/auth/logout

Logout user (invalidates refresh token).

**Response:** `200`

### POST /api/auth/logout-all

Logout from all devices.

**Response:** `200`

### GET /api/auth/me

Get current user profile.

**Auth:** Required

**Response:** `200`

```json
{
  "success": true,
  "data": { "user": { ... } }
}
```

---

## Patient Endpoints

### GET /api/patients/profile

Get patient profile.

**Auth:** Required (PATIENT role)

**Response:** `200`

### PUT /api/patients/profile

Update patient profile.

**Auth:** Required (PATIENT role)

**Request Body:**

```json
{
  "name": "Updated Name",
  "phone": "9999999999",
  "location": "New City"
}
```

### GET /api/patients/medical-history

Get authenticated patient's medical history timeline.

**Auth:** Required (PATIENT role)

**Query Params:**

- `type` - Filter by type (booking, prescription, document, labReport)
- `startDate` - ISO date string (e.g., "2025-01-01")
- `endDate` - ISO date string (e.g., "2025-12-31")
- `search` - Search keyword

**Response:** `200`

```json
{
  "success": true,
  "data": [
    {
      "type": "booking",
      "date": "2025-12-01T10:00:00Z",
      "description": "OPD Consultation - Cardiology",
      "details": { ... }
    }
  ]
}
```

### GET /api/patients/health-profile

Get authenticated patient's health profile (vitals, allergies, chronic conditions).

**Auth:** Required (PATIENT role)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "bloodType": "O+",
    "height": 170,
    "weight": 70,
    "allergies": ["Penicillin"],
    "chronicConditions": ["Hypertension"],
    "emergencyContact": {
      "name": "John Doe",
      "phone": "9876543210"
    }
  }
}
```

---

## Hospital Endpoints

### GET /api/hospitals/profile

Get hospital profile.

**Auth:** Required (HOSPITAL role)

### PUT /api/hospitals/profile

Update hospital profile.

**Auth:** Required (HOSPITAL role)

### POST /api/hospitals/documents

Upload legal document.

**Auth:** Required (HOSPITAL role)

**Request:** `multipart/form-data`

- `document` - Document file (PDF, max 5MB)

**Response:** `201`

### DELETE /api/hospitals/documents/:index

Delete legal document by index.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/doctors

Add doctor to hospital list.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "name": "Dr. John",
  "specialization": "Cardiology",
  "qualification": "MD",
  "experience": "5 years"
}
```

**Response:** `201`

### PUT /api/hospitals/doctors/:index

Update doctor in hospital list.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/doctors/:index

Remove doctor from hospital list.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/labs

Add lab to hospital list.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "name": "Pathology Lab",
  "specialization": "Pathology",
  "facilities": ["Blood Test", "Urine Test"],
  "location": "Building A, Floor 2"
}
```

**Response:** `201`

### PUT /api/hospitals/labs/:index

Update lab in hospital list.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/labs/:index

Remove lab from hospital list.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/beds

Add bed to hospital inventory.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "bedNumber": "ICU-101",
  "ward": "ICU",
  "floor": "3",
  "pricePerDay": 5000,
  "features": ["Ventilator", "Cardiac Monitor"]
}
```

**Response:** `201`

### PUT /api/hospitals/beds/:index

Update bed details.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/beds/:index

Remove bed from inventory.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/pharmacies

Add pharmacy to hospital list.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "name": "Main Pharmacy",
  "location": "Ground Floor",
  "licenseNumber": "PHARM123"
}
```

**Response:** `201`

### PUT /api/hospitals/pharmacies/:index

Update pharmacy details.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/pharmacies/:index

Remove pharmacy from hospital list.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/staff

Add staff member to hospital.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "name": "John Nurse",
  "role": "Nurse",
  "department": "Emergency",
  "employeeId": "EMP001",
  "phone": "9876543210"
}
```

**Response:** `201`

### PUT /api/hospitals/staff/:index

Update staff member details.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/staff/:index

Remove staff member.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### POST /api/hospitals/:id/staff-schedule

Create staff schedule.

**Auth:** Required (HOSPITAL role)

**Request Body:**

```json
{
  "staffIndex": 0,
  "week": "2025-11-24",
  "shifts": [
    {
      "day": "Monday",
      "shift": "Morning",
      "startTime": "08:00",
      "endTime": "16:00"
    }
  ]
}
```

**Response:** `201`

### GET /api/hospitals/:id/staff-schedules

Get all staff schedules.

**Auth:** Required (HOSPITAL role)

**Query Params:**

- `week` - Filter by week (ISO date)
- `staffIndex` - Filter by staff member

**Response:** `200`

### PUT /api/hospitals/:id/staff-schedule/:scheduleId

Update staff schedule.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### DELETE /api/hospitals/:id/staff-schedule/:scheduleId

Delete staff schedule.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

### GET /api/hospitals/:id/analytics

Get hospital analytics data.

**Auth:** Required (HOSPITAL role)

**Query Params:**

- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `department` - Filter by department
- `metric` - Specific metric (revenue, bookings, occupancy)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 1500000,
      "byDepartment": { "Cardiology": 500000, "Neurology": 300000 }
    },
    "bookings": {
      "total": 850,
      "byType": { "OPD": 600, "IPD": 150, "LAB": 100 }
    },
    "occupancy": {
      "beds": 75,
      "icu": 90
    }
  }
}
```

### GET /api/hospitals/:id/dashboard

Get hospital dashboard metrics.

**Auth:** Required (HOSPITAL role)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "opdCount": 150,
    "ipdCount": 50,
    "revenue": 500000,
    "bedOccupancy": 75
  }
}
```

---

## Doctor Endpoints

### GET /api/doctors/profile

Get doctor profile.

**Auth:** Required (DOCTOR role)

### PUT /api/doctors/profile

Update doctor profile.

**Auth:** Required (DOCTOR role)

### GET /api/doctors/:id/patients

Get doctor's patient list (consent-based).

**Auth:** Required (DOCTOR role)

**Response:** `200`

---

## Slot Endpoints

### POST /api/slots

Create new slot.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "slotType": "OPD",
  "date": "2025-12-01",
  "startTime": "10:00",
  "endTime": "11:00",
  "capacity": 5,
  "consultationFee": 500,
  "department": "Cardiology"
}
```

**Response:** `201`

### GET /api/slots

Get slots with filters.

**Auth:** Required

**Query Params:**

- `entityType` - OPD, IPD, LAB
- `providerId` - Provider ID
- `date` - Specific date
- `startDate`, `endDate` - Date range

**Response:** `200`

### POST /api/slots/bulk

Create multiple slots.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "slotType": "OPD",
  "startDate": "2025-12-01",
  "endDate": "2025-12-07",
  "timeSlots": [
    { "startTime": "10:00", "endTime": "11:00" },
    { "startTime": "11:00", "endTime": "12:00" }
  ],
  "capacity": 5,
  "consultationFee": 500
}
```

---

## Booking Endpoints

### POST /api/bookings/create

Create new booking (requires payment).

**Auth:** Required (PATIENT role)

**Request Body:**

```json
{
  "slotId": "slot_id",
  "timeSlot": "10:00-11:00",
  "reason": "Routine checkup",
  "notes": "Optional notes"
}
```

**Response:** `201`

### GET /api/bookings/patient/:patientId

Get patient bookings.

**Auth:** Required (PATIENT role, ownership check)

**Query Params:**

- `status` - PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
- `startDate`, `endDate` - Date filters

**Response:** `200`

### GET /api/bookings/provider/:providerId

Get provider bookings.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Response:** `200`

### POST /api/bookings/manual

Create manual booking for walk-in.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "slotId": "slot_id",
  "patientName": "Walk-in Patient",
  "patientPhone": "9999999999",
  "patientEmail": "optional@email.com",
  "paymentMethod": "CASH",
  "paymentAmount": 500
}
```

**Response:** `201`

### PUT /api/bookings/:id/cancel

Cancel booking (triggers refund).

**Auth:** Required (PATIENT role, ownership check)

**Response:** `200`

### PUT /api/bookings/:id/status

Update booking status.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "status": "COMPLETED",
  "note": "Optional note"
}
```

**Response:** `200`

---

## Payment Endpoints

### POST /api/payments/create-order

Create Razorpay order.

**Auth:** Required

**Request Body:**

```json
{
  "bookingId": "booking_id",
  "amount": 500
}
```

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 500,
    "currency": "INR",
    "keyId": "rzp_test_xxx"
  }
}
```

### POST /api/payments/verify

Verify payment signature.

**Auth:** Required

**Request Body:**

```json
{
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "signature_xxx",
  "bookingId": "booking_id"
}
```

**Response:** `200`

### POST /api/payments/webhook

Razorpay webhook (public, signature verified). Handles payment status updates including refund finalization.

**Request Body:** Razorpay webhook event

**Response:** `200`

**Note on Refunds:**

Refunds are automatically initiated when:

- A provider cancels a paid online booking (`PUT /api/bookings/:id/cancel` with provider auth)
- The system processes the refund via Razorpay and updates the payment and booking metadata
- Webhook events update final refund status (processed, failed)
- Patients and providers can track refund status through booking and payment records

---

## Document Endpoints

### POST /api/documents/upload

Upload document.

**Auth:** Required (PATIENT or provider roles)

**Request:** `multipart/form-data`

- `file` - Document file (PDF, JPG, PNG, max 5MB)
- `documentType` - Type of document
- `description` - Optional description

**Response:** `201`

### GET /api/documents/patient/:patientId

Get patient documents (consent required).

**Auth:** Required (consent check)

**Response:** `200`

### DELETE /api/documents/:id

Soft delete document.

**Auth:** Required (ownership check)

**Response:** `200`

---

## Consent Endpoints

### POST /api/consent/request

Request consent to access patient documents.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "patientId": "patient_id",
  "reason": "For consultation on 15/12/2025",
  "expiryDays": 30
}
```

**Response:** `201`

### PUT /api/consent/:id/approve

Approve consent request.

**Auth:** Required (PATIENT role)

**Response:** `200`

### PUT /api/consent/:id/revoke

Revoke consent.

**Auth:** Required (PATIENT role)

**Response:** `200`

---

## Prescription Endpoints

### POST /api/prescriptions/create

Create prescription.

**Auth:** Required (DOCTOR role)

**Request Body:**

```json
{
  "patientId": "patient_id",
  "medicines": [
    {
      "name": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily",
      "duration": "30 days"
    }
  ],
  "instructions": "Take after breakfast",
  "linkedPharmacyId": "pharmacy_id"
}
```

**Response:** `201`

### GET /api/prescriptions/patient/:patientId

Get patient prescriptions.

**Auth:** Required (PATIENT role, ownership check)

**Response:** `200`

### POST /api/prescriptions/:id/prebook

Pre-book prescription at pharmacy.

**Auth:** Required (PATIENT role)

**Request Body:**

```json
{
  "pharmacyId": "pharmacy_id"
}
```

**Response:** `200`

---

## Consultation Endpoints

### POST /api/consultations/create

Create consultation.

**Auth:** Required (DOCTOR role)

**Request Body:**

```json
{
  "patientId": "patient_id",
  "bookingId": "booking_id",
  "consultationType": "VIDEO"
}
```

**Response:** `201`

### POST /api/consultations/:id/token

Generate Agora token for video call.

**Auth:** Required (ownership check)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "token": "agora_token",
    "channelName": "consultation_xxx"
  }
}
```

### POST /api/consultations/:id/messages

Send chat message.

**Auth:** Required (DOCTOR or PATIENT role)

**Request Body:**

```json
{
  "message": "Hello"
}
```

**Response:** `201`

---

## Admin Endpoints

### GET /api/admin/pending-verifications

Get pending verification queue.

**Auth:** Required (ADMIN role)

**Response:** `200`

### POST /api/admin/verify/:entityType/:id

Approve or reject verification.

**Auth:** Required (ADMIN role)

**Request Body:**

```json
{
  "action": "APPROVE",
  "comment": "Documents verified"
}
```

**Response:** `200`

---

## Referral Endpoints

### POST /api/referrals/create

Create new referral from source entity to target entity.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "targetId": "user_id",
  "patientId": "patient_user_id",
  "referralType": "DOCTOR_TO_DOCTOR",
  "reason": "Referral reason (10-1000 chars)",
  "notes": "Optional notes (max 500 chars)",
  "priority": "MEDIUM",
  "metadata": {}
}
```

**Referral Types:**

- `INTER_DEPARTMENTAL` - Hospital to internal doctor
- `DOCTOR_TO_DOCTOR` - Doctor to specialist
- `DOCTOR_TO_PHARMACY` - Doctor to pharmacy
- `LAB_TO_LAB` - Lab to specialized lab

**Priority Levels:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

**Response:** `201`

```json
{
  "success": true,
  "data": {
    "referralId": "REF-1732147200-A3F5G2",
    "status": "PENDING",
    "sourceSnapshot": { "name": "...", "role": "...", ... },
    "targetSnapshot": { "name": "...", "role": "...", ... },
    "patientSnapshot": { "name": "...", "phone": "...", "email": "..." }
  }
}
```

### GET /api/referrals/source/:sourceId

Get all referrals created by source entity.

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Query Params:**

- `status` - Filter by status (PENDING, ACCEPTED, COMPLETED, REJECTED, CANCELLED)
- `type` - Filter by referral type
- `startDate` - Filter by date range (ISO 8601)
- `endDate` - Filter by date range (ISO 8601)

**Ownership:** sourceId must match authenticated user ID

**Response:** `200`

### GET /api/referrals/target/:targetId

Get all referrals received by target entity.

**Auth:** Required (HOSPITAL, DOCTOR, LAB, or PHARMACY role)

**Query Params:** Same as source endpoint

**Ownership:** targetId must match authenticated user ID

**Response:** `200`

### GET /api/referrals/:id

Get single referral by ID.

**Auth:** Required (authenticated user)

**Access Control:** User must be source, target, or patient of referral

**Response:** `200`

### PUT /api/referrals/:id/accept

Accept pending referral (target only).

**Auth:** Required (HOSPITAL, DOCTOR, LAB, or PHARMACY role)

**Request Body:**

```json
{
  "notes": "Optional acceptance notes (max 500 chars)"
}
```

**Ownership:** Only target entity can accept

**Response:** `200`

### PUT /api/referrals/:id/complete

Mark accepted referral as completed (target only).

**Auth:** Required (HOSPITAL, DOCTOR, LAB, or PHARMACY role)

**Ownership:** Only target entity can complete

**Response:** `200`

### PUT /api/referrals/:id/reject

Reject pending referral (target only).

**Auth:** Required (HOSPITAL, DOCTOR, LAB, or PHARMACY role)

**Request Body:**

```json
{
  "rejectionReason": "Reason for rejection (10-500 chars)"
}
```

**Ownership:** Only target entity can reject

**Response:** `200`

### PUT /api/referrals/:id/cancel

Cancel pending or accepted referral (source only).

**Auth:** Required (HOSPITAL, DOCTOR, or LAB role)

**Request Body:**

```json
{
  "cancellationReason": "Optional reason (max 500 chars)"
}
```

**Ownership:** Only source entity can cancel

**Response:** `200`

---

## Billing/Invoice Endpoints

### POST /api/billing/invoices

Generate new invoice for lab test or pharmacy prescription.

**Auth:** Required (LAB, PHARMACY, or ADMIN role)

**Aliases:** Also available at `/api/billing/generate-invoice`

**Request Body:**

```json
{
  "providerId": "user_id",
  "patientId": "patient_user_id",
  "bookingId": "booking_id (for lab tests)",
  "prescriptionId": "prescription_id (for pharmacy)",
  "items": [
    {
      "description": "Test/Medicine name",
      "quantity": 1,
      "unitPrice": 500,
      "total": 500
    }
  ],
  "taxDetails": [
    {
      "taxName": "GST",
      "taxRate": 18,
      "taxAmount": 90
    }
  ],
  "dueDate": "2025-12-31",
  "notes": "Additional notes"
}
```

**Ownership:** providerId must match authenticated user (unless ADMIN)

**Response:** `201`

```json
{
  "success": true,
  "data": {
    "invoice": {
      "invoiceNumber": "INV-20251123-X7Y2",
      "status": "ISSUED",
      "paymentStatus": "PENDING",
      "subtotal": 500,
      "totalTax": 90,
      "totalAmount": 590,
      ...
    }
  }
}
```

### GET /api/billing/providers/:providerId/invoices

Get all invoices for a provider.

**Auth:** Required (LAB, PHARMACY, or ADMIN role)

**Aliases:** Also available at `/api/billing/provider/:providerId`

**Query Params:**

- `status` - Filter by invoice status (ISSUED, PAID, CANCELLED, OVERDUE)
- `paymentStatus` - Filter by payment status (PENDING, PAID, FAILED, REFUNDED)
- `startDate` - Filter by date range
- `endDate` - Filter by date range

**Ownership:** providerId must match authenticated user (unless ADMIN)

**Response:** `200`

### GET /api/billing/invoices/:invoiceId

Get single invoice by ID.

**Auth:** Required (LAB, PHARMACY, PATIENT, or ADMIN role)

**Access Control:** Only provider, patient, or admin can view

**Response:** `200`

### PATCH /api/billing/invoices/:invoiceId/status

Update invoice status.

**Auth:** Required (LAB, PHARMACY, or ADMIN role)

**Request Body:**

```json
{
  "status": "PAID"
}
```

**Ownership:** Only invoice provider or admin can update

**Response:** `200`

### PATCH /api/billing/invoices/:invoiceId/mark-paid

Mark invoice as paid with payment details.

**Auth:** Required (LAB, PHARMACY, or ADMIN role)

**Request Body:**

```json
{
  "paymentMethod": "CASH",
  "paymentDate": "2025-11-23",
  "transactionId": "optional",
  "notes": "optional"
}
```

**Ownership:** Only invoice provider or admin can mark paid

**Response:** `200`

### PATCH /api/billing/invoices/:invoiceId/cancel

Cancel issued invoice.

**Auth:** Required (LAB, PHARMACY, or ADMIN role)

**Request Body:**

```json
{
  "cancellationReason": "Reason for cancellation"
}
```

**Ownership:** Only invoice provider or admin can cancel

**Response:** `200`

---

## Provider Search Endpoints

### GET /api/providers/search

Search for verified providers with available slots.

**Auth:** Required (authenticated user)

**Query Params:**

- `entityType` - **Required**: `OPD`, `IPD`, or `LAB`
- `location` - Optional: Filter by location (case-insensitive substring)
- `specialization` - Optional: For OPD, filter doctors by specialization
- `testType` - Optional: For LAB, filter by test/facility type
- `startDate` - Optional: Check slots from this date (defaults to today)

**Response:** `200`

```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "name": "Provider Name",
      "role": "DOCTOR",
      "uniqueId": "...",
      "location": "City, State",
      "specialization": "Cardiology",
      "experience": 10
    }
  ]
}
```

### GET /api/providers/:providerId

Get detailed provider information with available slot count.

**Auth:** Required (authenticated user)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "Provider Name",
    "role": "DOCTOR",
    "availableSlotCount": 15,
    "doctorData": { ... }
  }
}
```

---

## Lab Profile Endpoints

### POST /api/labs/register

Register new lab account (public endpoint).

**Request Body:**

```json
{
  "name": "Lab Name",
  "email": "lab@example.com",
  "password": "password",
  "phone": "1234567890",
  "location": "City, State",
  "licenseNumber": "LAB123456"
}
```

**Note:** Role automatically set to LAB. Auto-verified upon registration.

**Response:** `201`

### GET /api/labs/profile

Get current lab profile.

**Auth:** Required (LAB role)

**Response:** `200`

### PUT /api/labs/profile

Update lab profile.

**Auth:** Required (LAB role)

**Request Body:**

```json
{
  "name": "Updated Lab Name",
  "location": "Updated Location"
}
```

**Response:** `200`

### GET /api/labs/machines

Get all lab machines/equipment.

**Auth:** Required (LAB role)

**Query Params:**

- `activeOnly` - Filter to show only non-deleted machines

**Response:** `200`

### POST /api/labs/machines

Add new machine to lab inventory.

**Auth:** Required (LAB role)

**Request Body:**

```json
{
  "name": "MRI Scanner",
  "model": "Model X",
  "manufacturer": "Company",
  "purchaseDate": "2023-01-01",
  "maintenanceSchedule": "Quarterly",
  "status": "OPERATIONAL"
}
```

**Response:** `201`

### PUT /api/labs/machines/:id

Update machine information.

**Auth:** Required (LAB role)

**Response:** `200`

### DELETE /api/labs/machines/:id

Delete machine (soft delete).

**Auth:** Required (LAB role)

**Response:** `200`

### GET /api/labs/facilities

Get lab facilities list.

**Auth:** Required (LAB role)

**Response:** `200`

### POST /api/labs/facilities

Add facility to lab.

**Auth:** Required (LAB role)

**Request Body:**

```json
{
  "facility": "X-Ray"
}
```

**Response:** `201`

### DELETE /api/labs/facilities/:index

Delete facility from lab.

**Auth:** Required (LAB role)

**Response:** `200`

### GET /api/labs/:id/dashboard

Get lab dashboard metrics.

**Auth:** Required (LAB or ADMIN role)

**Response:** `200`

---

## Pharmacy Profile Endpoints

### POST /api/pharmacies/register

Register new pharmacy account (public endpoint).

**Request Body:**

```json
{
  "name": "Pharmacy Name",
  "email": "pharmacy@example.com",
  "password": "password",
  "phone": "1234567890",
  "location": "City, State",
  "licenseNumber": "PHARM123456"
}
```

**Note:** Role automatically set to PHARMACY. Auto-verified upon registration.

**Response:** `201`

### GET /api/pharmacies/profile

Get current pharmacy profile.

**Auth:** Required (PHARMACY role)

**Response:** `200`

### PUT /api/pharmacies/profile

Update pharmacy profile.

**Auth:** Required (PHARMACY role)

**Request Body:**

```json
{
  "name": "Updated Pharmacy Name",
  "location": "Updated Location",
  "licenseNumber": "PHARM999999"
}
```

**Response:** `200`

### GET /api/pharmacies/medicines

Get all medicines in inventory.

**Auth:** Required (PHARMACY role)

**Query Params:**

- `activeOnly` - Filter to show only non-deleted medicines
- `lowStock` - Filter medicines below reorder level
- `expiringSoon` - Filter medicines expiring within 30 days

**Response:** `200`

### POST /api/pharmacies/medicines

Add new medicine to inventory.

**Auth:** Required (PHARMACY role)

**Request Body:**

```json
{
  "name": "Medicine Name",
  "genericName": "Generic Name",
  "manufacturer": "Company",
  "batchNumber": "BATCH123",
  "expiryDate": "2026-12-31",
  "quantity": 100,
  "reorderLevel": 20,
  "price": 50
}
```

**Response:** `201`

### PUT /api/pharmacies/medicines/:id

Update medicine information.

**Auth:** Required (PHARMACY role)

**Response:** `200`

### DELETE /api/pharmacies/medicines/:id

Delete medicine (soft delete).

**Auth:** Required (PHARMACY role)

**Response:** `200`

### GET /api/pharmacies/medicines/low-stock

Get medicines below reorder level.

**Auth:** Required (PHARMACY role)

**Response:** `200`

### GET /api/pharmacies/medicines/expiring

Get medicines expiring within 30 days.

**Auth:** Required (PHARMACY role)

**Response:** `200`

### GET /api/pharmacies/:id/dashboard

Get pharmacy dashboard metrics.

**Auth:** Required (PHARMACY or ADMIN role)

**Response:** `200`

### POST /api/pharmacies/link

Create pharmacy link (doctor-pharmacy association).

**Auth:** Required (DOCTOR or PHARMACY role)

**Request Body:**

```json
{
  "doctorId": "doctor_user_id",
  "pharmacyId": "pharmacy_user_id"
}
```

**Response:** `201`

### GET /api/pharmacies/links

Get pharmacy links for authenticated user.

**Auth:** Required (DOCTOR or PHARMACY role)

**Response:** `200`

### DELETE /api/pharmacies/links/:linkId

Delete pharmacy link.

**Auth:** Required (DOCTOR or PHARMACY role)

**Response:** `200`

---

## Health Awareness Endpoints

### GET /api/health-awareness/articles

Get health awareness articles (public endpoint).

**Auth:** Not required

**Query Params:**

- `category` - Filter by category (chronic-diseases, nutrition, exercise, mental-health, preventive-care, general)
- `search` - Search in title, summary, content, tags
- `limit` - Number of articles per page (default: 10, max: 50)
- `page` - Page number (default: 1)

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "article-1",
        "title": "Article Title",
        "summary": "Brief summary",
        "category": "nutrition",
        "imageUrl": "https://...",
        "author": "Dr. Name",
        "publishedDate": "2024-01-15",
        "tags": ["tag1", "tag2"]
      }
    ],
    "pagination": {
      "total": 20,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

**Note:** Phase 1 uses static data. Future phases will integrate with CMS/database.

---

## Health Check Endpoints

### GET /api/health

API health check.

**Response:** `200`

```json
{
  "status": "ok",
  "timestamp": "2025-11-23T10:00:00Z"
}
```

### GET /api/health/db

Database health check.

**Response:** `200`

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

_For detailed testing scenarios, see `docs/TESTING_GUIDE.md`_  
_For deployment instructions, see `docs/DEPLOYMENT.md`_
