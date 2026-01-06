# ArogyaFirst - End-to-End Testing Guide

## Introduction

This guide provides comprehensive test scenarios for all user flows across the ArogyaFirst platform. Phase 1 focuses on manual testing to ensure all features work correctly before production deployment.

### Testing Philosophy

- **User-Centric:** Test from the perspective of each stakeholder type
- **Comprehensive:** Cover happy paths, edge cases, and error scenarios
- **Realistic:** Use real-world data and scenarios
- **Documented:** Record test results and issues for tracking

### Prerequisites

**Test Environment:**

- Backend API running on `http://localhost:3000`
- Frontend web app running on `http://localhost:5173`
- MongoDB Atlas connection active
- All environment variables configured (see `ENVIRONMENT_SETUP.md`)

**Test Accounts:**

Create the following test accounts for comprehensive testing:

1. **Admin:** admin@arogyafirst.com (manually created in database)
2. **Patient:** patient.test@example.com
3. **Hospital:** hospital.test@example.com
4. **Doctor (Independent):** doctor.independent@example.com
5. **Doctor (Hospital-affiliated):** doctor.hospital@example.com
6. **Lab:** lab.test@example.com
7. **Pharmacy:** pharmacy.test@example.com

**Test Data:**

- Sample legal documents (PDF)
- Sample medical documents (PDF, JPG, PNG)
- Test payment cards (Razorpay test mode):
  - Success: 4111 1111 1111 1111
  - Failure: 4000 0000 0000 0002

**Testing Tools:**

- Browser DevTools (Network, Console tabs)
- MongoDB Compass (database inspection)
- Razorpay Test Dashboard
- Cloudinary Media Library

---

## Patient Workflow Tests

### 1. Registration Flow

**Test Case 1.1: Valid Patient Registration**

**Steps:**

1. Navigate to registration page
2. Select "Patient" role
3. Fill in all required fields:
   - Name: "Test Patient"
   - Email: "patient.test@example.com"
   - Password: "SecurePass123!"
   - Phone: "9876543210"
   - Location: "Mumbai, Maharashtra"
   - Date of Birth: "01/01/1990"
   - Aadhaar Last 4: "1234"
4. Click "Register"

**Expected Outcome:**

- ✓ Registration successful
- ✓ Unique ID generated: `9876543210@ArogyaFirst`
- ✓ User automatically logged in
- ✓ Redirected to patient dashboard
- ✓ Success notification displayed

**Test Case 1.2: Duplicate Email Registration**

**Steps:**

1. Attempt to register with existing email

**Expected Outcome:**

- ✗ Registration fails
- ✓ Error message: "Email already registered"
- ✓ User remains on registration page

**Test Case 1.3: Invalid Data Validation**

Test with:

- Empty required fields
- Invalid email format
- Weak password (< 8 characters)
- Invalid phone number format
- Invalid Aadhaar (not 4 digits)

**Expected Outcome:**

- ✓ Form validation errors displayed
- ✓ Registration blocked until fixed
- ✓ Specific error messages for each field

### 2. Login and Token Management

**Test Case 2.1: Valid Login**

**Steps:**

1. Navigate to login page
2. Enter email and password
3. Click "Sign In"

**Expected Outcome:**

- ✓ Login successful
- ✓ Access token received (check DevTools Application tab)
- ✓ Refresh token set as HttpOnly cookie
- ✓ Redirected to dashboard
- ✓ User profile loaded

**Test Case 2.2: Invalid Credentials**

**Steps:**

1. Login with wrong password
2. Login with non-existent email

**Expected Outcome:**

- ✗ Login fails
- ✓ Error message: "Invalid credentials"
- ✓ No tokens stored

**Test Case 2.3: Token Refresh**

**Steps:**

1. Login successfully
2. Wait 16 minutes (access token expires at 15 min)
3. Make an authenticated API call (e.g., view profile)

**Expected Outcome:**

- ✓ Access token automatically refreshed
- ✓ API call succeeds
- ✓ New access token received
- ✓ Refresh token rotated (new refresh token set)

**Test Case 2.4: Logout**

**Steps:**

1. Click user menu > Logout

**Expected Outcome:**

- ✓ Logged out successfully
- ✓ Refresh token cookie cleared
- ✓ Redirected to login page
- ✓ Subsequent API calls fail with 401

**Test Case 2.5: Logout All Devices**

**Steps:**

1. Login on two different browsers/devices
2. On one device, click "Logout from all devices"

**Expected Outcome:**

- ✓ All refresh tokens invalidated
- ✓ Both devices logged out
- ✓ Must login again on all devices

### 3. Profile Management

**Test Case 3.1: View Profile**

**Steps:**

1. Navigate to Profile page

**Expected Outcome:**

- ✓ All profile fields displayed:
  - Name
  - Email (read-only)
  - Phone
  - Location
  - Date of Birth
  - Aadhaar Last 4 (read-only)
  - Unique ID (read-only)

**Test Case 3.2: Update Profile**

**Steps:**

1. Click "Edit Profile"
2. Update name, phone, location
3. Click "Save Changes"

**Expected Outcome:**

- ✓ Profile updated successfully
- ✓ Changes reflected immediately
- ✓ Unique ID updated if phone changed
- ✓ Success notification displayed

**Test Case 3.3: Invalid Profile Update**

**Steps:**

1. Try to update with invalid phone number
2. Try to clear required fields

**Expected Outcome:**

- ✗ Update fails
- ✓ Validation errors displayed
- ✓ Profile remains unchanged

### 4. Booking Flow

**Test Case 4.1: Search for Hospital**

**Steps:**

1. Click "New Booking"
2. Select "OPD" booking type
3. Enter location: "Mumbai"
4. Select date: Tomorrow
5. Click "Search"

**Expected Outcome:**

- ✓ Search results displayed
- ✓ Hospitals in Mumbai shown
- ✓ Each result shows:
  - Hospital name
  - Location
  - Available slots count
  - "View Slots" button

**Test Case 4.2: Search for Doctor by Specialization**

**Steps:**

1. Select "OPD" booking type
2. Enter specialization: "Cardiology"
3. Enter location: "Delhi"
4. Click "Search"

**Expected Outcome:**

- ✓ Cardiologists in Delhi displayed
- ✓ Both independent and hospital-affiliated doctors shown
- ✓ Qualification and experience visible

**Test Case 4.3: Search for Lab**

**Steps:**

1. Select "LAB" booking type
2. Enter location: "Bangalore"
3. Click "Search"

**Expected Outcome:**

- ✓ Labs in Bangalore displayed
- ✓ Available test types visible
- ✓ Facilities and machines listed

**Test Case 4.4: View Available Slots**

**Steps:**

1. From search results, click "View Slots" on a provider
2. View available dates and times

**Expected Outcome:**

- ✓ Calendar displayed with available dates highlighted
- ✓ Time slots for selected date shown
- ✓ Slot capacity visible (e.g., "3 slots available")
- ✓ Unavailable slots grayed out

**Test Case 4.5: Book Appointment with Payment**

**Steps:**

1. Select a slot
2. Click "Continue"
3. Enter reason for visit: "Routine checkup"
4. Click "Proceed to Payment"
5. Review payment amount
6. Click "Pay Now"
7. Razorpay modal opens
8. Select "Card" payment method
9. Enter test card: 4111 1111 1111 1111
10. Enter CVV: 123, Expiry: 12/25
11. Click "Pay"

**Expected Outcome:**

- ✓ Payment successful
- ✓ Booking confirmed
- ✓ Booking ID generated (e.g., BK-1234567890-A3F9)
- ✓ Booking status: CONFIRMED
- ✓ Payment status: SUCCESS
- ✓ Slot capacity decremented
- ✓ Confirmation page displayed with all details
- ✓ Booking appears in dashboard

**Test Case 4.6: Payment Failure Handling**

**Steps:**

1. Follow booking steps 1-8
2. Enter test failure card: 4000 0000 0000 0002
3. Complete payment attempt

**Expected Outcome:**

- ✗ Payment fails
- ✓ Error message displayed
- ✓ Booking status: PENDING
- ✓ Payment status: FAILED
- ✓ Slot capacity unchanged
- ✓ Option to retry payment

**Test Case 4.7: Cancel Booking with Refund**

**Steps:**

1. Go to Bookings page
2. Open a CONFIRMED booking
3. Click "Cancel Booking"
4. Confirm cancellation

**Expected Outcome:**

- ✓ Booking status: CANCELLED
- ✓ Refund initiated automatically
- ✓ Refund status: PROCESSING
- ✓ Slot capacity restored
- ✓ Cancellation notification displayed
- ✓ Refund notification: "5-7 business days"

### 5. Document Management

**Test Case 5.1: Upload Document**

**Steps:**

1. Navigate to Documents page
2. Click "Upload Document"
3. Select document type: "Medical Record"
4. Choose file (PDF, < 5MB)
5. Add description: "Blood test results"
6. Click "Upload"

**Expected Outcome:**

- ✓ Upload successful
- ✓ Document stored in Cloudinary
- ✓ Document URL generated
- ✓ Document listed in "My Documents"
- ✓ Success notification displayed

**Test Case 5.2: Invalid File Upload**

**Steps:**

1. Try to upload file > 5MB
2. Try to upload unsupported type (.exe, .docx)

**Expected Outcome:**

- ✗ Upload fails
- ✓ Error: "File size exceeds 5MB" or "Invalid file type"
- ✓ Supported types: PDF, JPG, PNG only

**Test Case 5.3: View Documents**

**Steps:**

1. View documents list
2. Click "View" on a document

**Expected Outcome:**

- ✓ Document preview opens in modal
- ✓ PDF rendered correctly
- ✓ Image displayed correctly
- ✓ Download option available

**Test Case 5.4: Delete Document**

**Steps:**

1. Click "Delete" on a document
2. Confirm deletion

**Expected Outcome:**

- ✓ Document soft-deleted (not removed from Cloudinary)
- ✓ Document removed from list
- ✓ isDeleted flag set to true in database

### 6. Consent Management

**Test Case 6.1: Approve Consent Request**

**Steps:**

1. Navigate to Documents > Consent Requests tab
2. View pending consent request from a doctor
3. Click "Review"
4. Read request details (doctor name, reason)
5. Click "Approve"
6. Set expiry: 30 days (optional)
7. Confirm

**Expected Outcome:**

- ✓ Consent approved
- ✓ Status: APPROVED
- ✓ Expiry date set (if provided)
- ✓ Doctor can now access documents
- ✓ Consent moved to "Active Consents" tab

**Test Case 6.2: Reject Consent Request**

**Steps:**

1. View pending consent request
2. Click "Reject"
3. Confirm

**Expected Outcome:**

- ✓ Consent rejected
- ✓ Status: REJECTED
- ✓ Doctor cannot access documents
- ✓ Request removed from pending list

**Test Case 6.3: Revoke Active Consent**

**Steps:**

1. Go to "Active Consents" tab
2. Click "Revoke" on an approved consent
3. Confirm

**Expected Outcome:**

- ✓ Consent revoked
- ✓ Status: REVOKED
- ✓ Doctor immediately loses access
- ✓ Consent removed from active list

### 7. Prescription Management

**Test Case 7.1: View Prescriptions**

**Steps:**

1. Navigate to Prescriptions page
2. View list of prescriptions

**Expected Outcome:**

- ✓ All prescriptions displayed
- ✓ Each shows:
  - Doctor name and specialization
  - Date prescribed
  - Medicines list with dosage
  - Instructions
  - Linked pharmacy (if any)

**Test Case 7.2: Pre-book Prescription at Pharmacy**

**Steps:**

1. Open prescription details
2. Click "Pre-book at Pharmacy"
3. Select pharmacy from list
4. Confirm

**Expected Outcome:**

- ✓ Pre-booking created
- ✓ Pharmacy notified
- ✓ Prescription status: PRE_BOOKED
- ✓ Pharmacy name linked to prescription
- ✓ Instruction to visit pharmacy displayed

### 8. Medical History

**Test Case 8.1: View Timeline**

**Steps:**

1. Navigate to Medical History page
2. View chronological timeline

**Expected Outcome:**

- ✓ All events displayed in reverse chronological order
- ✓ Event types:
  - Bookings (OPD, IPD, LAB)
  - Prescriptions
  - Documents uploaded
- ✓ Each entry shows date, type, and summary

**Test Case 8.2: Filter by Type**

**Steps:**

1. Select "Bookings only" filter
2. Apply

**Expected Outcome:**

- ✓ Only booking events displayed
- ✓ Prescriptions and documents hidden
- ✓ Filter indicator visible

**Test Case 8.3: Filter by Date Range**

**Steps:**

1. Select "Last 30 days" filter
2. Apply

**Expected Outcome:**

- ✓ Only events from last 30 days shown
- ✓ Older events hidden
- ✓ Date range indicator visible

**Test Case 8.4: Search History**

**Steps:**

1. Enter search term: "Cardiology"
2. Search

**Expected Outcome:**

- ✓ Results filtered by keyword
- ✓ Matches in doctor name, specialization, test type, etc.
- ✓ Results update in real-time

### 9. Health Awareness

**Test Case 9.1: Browse Articles**

**Steps:**

1. Navigate to Health Awareness page
2. View articles list

**Expected Outcome:**

- ✓ Articles displayed as cards
- ✓ Each shows title, category, excerpt
- ✓ Categories: General Health, Nutrition, Exercise, etc.

**Test Case 9.2: Read Article**

**Steps:**

1. Click on an article
2. Read full content

**Expected Outcome:**

- ✓ Article opens in full view
- ✓ Content readable and formatted
- ✓ Images displayed correctly

---

## Hospital Workflow Tests

### 1. Registration with Documents

**Test Case 1.1: Hospital Registration**

**Steps:**

1. Navigate to registration page
2. Select "Hospital" role
3. Fill in required fields:
   - Name: "Test Hospital"
   - Email: "hospital.test@example.com"
   - Password: "SecurePass123!"
   - Location: "Delhi, India"
4. Upload legal document (PDF of registration certificate)
5. Click "Register"

**Expected Outcome:**

- ✓ Registration successful
- ✓ Document uploaded to Cloudinary
- ✓ Verification status: PENDING
- ✓ Redirected to hospital dashboard
- ✓ Notice: "Your account is pending admin verification"

**Test Case 1.2: Without Legal Document**

**Steps:**

1. Try to register without uploading document

**Expected Outcome:**

- ✗ Registration blocked
- ✓ Error: "Legal document is required"

### 2. Profile and Master Lists

**Test Case 2.1: Add Doctor to Hospital**

**Steps:**

1. Navigate to Profile > Doctors tab
2. Click "Add Doctor"
3. Fill in doctor details:
   - Name: "Dr. John Doe"
   - Specialization: "Cardiology"
   - Qualification: "MD, DM Cardiology"
   - Experience: "10 years"
4. Click "Add"

**Expected Outcome:**

- ✓ Doctor added to hospital's doctor list
- ✓ Doctor appears in list with all details
- ✓ Edit and Delete options available

**Test Case 2.2: Add Lab to Hospital**

**Steps:**

1. Navigate to Profile > Labs tab
2. Click "Add Lab"
3. Fill in lab details:
   - Name: "Pathology Lab"
   - Tests: ["Blood Test", "Urine Test"]
4. Click "Add"

**Expected Outcome:**

- ✓ Lab added to hospital's lab list
- ✓ Tests displayed as tags

**Test Case 2.3: Add Bed**

**Steps:**

1. Navigate to Profile > Beds tab
2. Click "Add Bed"
3. Fill in bed details:
   - Bed Number: "ICU-101"
   - Type: "ICU"
   - Floor: "3"
   - Wing: "A"
4. Click "Add"

**Expected Outcome:**

- ✓ Bed added to hospital's bed inventory
- ✓ Available for IPD bookings

**Test Case 2.4: Add Pharmacy**

**Steps:**

1. Navigate to Profile > Pharmacies tab
2. Click "Add Pharmacy"
3. Fill in pharmacy details:
   - Name: "Main Pharmacy"
   - Contact: "9876543211"
4. Click "Add"

**Expected Outcome:**

- ✓ Pharmacy added to hospital's pharmacy list

**Test Case 2.5: Add Staff Member**

**Steps:**

1. Navigate to Profile > Staff tab
2. Click "Add Staff"
3. Fill in staff details:
   - Name: "Nurse Jane"
   - Role: "Nurse"
   - Department: "Cardiology"
   - Contact: "9876543212"
4. Click "Add"

**Expected Outcome:**

- ✓ Staff member added
- ✓ Available for scheduling

### 3. Slot Management

**Test Case 3.1: Create OPD Slot**

**Steps:**

1. Navigate to Slots page
2. Click "Create Slot"
3. Select slot type: "OPD"
4. Fill in details:
   - Date: Tomorrow
   - Start Time: "10:00 AM"
   - End Time: "11:00 AM"
   - Capacity: 5
   - Consultation Fee: 500
   - Department: "Cardiology"
5. Click "Create"

**Expected Outcome:**

- ✓ Slot created successfully
- ✓ Available for patient bookings
- ✓ Visible in provider search

**Test Case 3.2: Create IPD (Bed) Slot**

**Steps:**

1. Create slot with type: "IPD"
2. Select bed from dropdown
3. Set daily charge

**Expected Outcome:**

- ✓ Bed slot created
- ✓ Linked to specific bed
- ✓ Available for IPD bookings

**Test Case 3.3: Bulk Slot Creation**

**Steps:**

1. Click "Create Bulk Slots"
2. Set date range: Next 7 days
3. Set time slots: 10 AM - 5 PM (1-hour slots)
4. Set capacity: 5 per slot
5. Click "Create All"

**Expected Outcome:**

- ✓ Multiple slots created (7 days × 7 hours = 49 slots)
- ✓ All visible in slot list
- ✓ Success notification with count

### 4. Booking Dashboard

**Test Case 4.1: View All Bookings**

**Steps:**

1. Navigate to Bookings page
2. View "All" tab

**Expected Outcome:**

- ✓ All bookings displayed (past, present, future)
- ✓ Each shows:
  - Patient name and phone
  - Date and time
  - Booking type (OPD/IPD)
  - Status
  - Payment status

**Test Case 4.2: View Today's Bookings**

**Steps:**

1. Click "Today" tab

**Expected Outcome:**

- ✓ Only today's bookings displayed
- ✓ Sorted by time
- ✓ Action buttons enabled

**Test Case 4.3: Manual Booking for Walk-in**

**Steps:**

1. Click "Create Manual Booking"
2. Select slot
3. Fill in patient details:
   - Name: "Walk-in Patient"
   - Phone: "9999999999"
   - Email: "walkin@example.com" (optional)
4. Select payment method: "CASH"
5. Enter amount: 500
6. Click "Create"

**Expected Outcome:**

- ✓ Booking created without patient account
- ✓ Patient data stored in snapshot
- ✓ patientId is null
- ✓ Payment status: SUCCESS (for CASH)
- ✓ Slot capacity decremented

**Test Case 4.4: Update Booking Status to Complete**

**Steps:**

1. Open a CONFIRMED booking (today's date)
2. Click "Mark Complete"
3. Confirm

**Expected Outcome:**

- ✓ Status: COMPLETED
- ✓ Slot capacity NOT restored (patient attended)
- ✓ Status button hidden

**Test Case 4.5: Mark Booking as No-show**

**Steps:**

1. Open a CONFIRMED booking (past date)
2. Click "Mark No-show"
3. Confirm

**Expected Outcome:**

- ✓ Status: NO_SHOW
- ✓ Slot capacity restored
- ✓ No refund (patient didn't show up)

### 5. Staff Scheduling

**Test Case 5.1: Create Staff Schedule**

**Steps:**

1. Navigate to Staff Schedule page
2. Click "Create Schedule"
3. Select staff member
4. Select date
5. Set shift time: 9 AM - 5 PM
6. Select department
7. Click "Create"

**Expected Outcome:**

- ✓ Schedule created
- ✓ Visible in calendar view
- ✓ Staff member assigned

**Test Case 5.2: View Staff Schedules**

**Steps:**

1. View calendar
2. Filter by department

**Expected Outcome:**

- ✓ All schedules displayed
- ✓ Color-coded by department
- ✓ Shift details visible on hover

### 6. Dashboard and Analytics

**Test Case 6.1: View Dashboard Metrics**

**Steps:**

1. Navigate to Dashboard

**Expected Outcome:**

- ✓ Metrics cards displayed:
  - Total OPD bookings (today, this week, this month)
  - Total IPD bookings
  - Total revenue
  - Bed occupancy rate
- ✓ Charts and graphs visible

**Test Case 6.2: Analytics with Date Filter**

**Steps:**

1. Navigate to Analytics page
2. Select date range: Last 30 days
3. Apply filter

**Expected Outcome:**

- ✓ Data filtered to date range
- ✓ Charts updated
- ✓ Metrics recalculated

**Test Case 6.3: Analytics with Department Filter**

**Steps:**

1. Select department: "Cardiology"
2. Apply filter

**Expected Outcome:**

- ✓ Only Cardiology data shown
- ✓ Bookings, revenue filtered

### 7. Document Submission

**Test Case 7.1: Submit Document to Patient**

**Steps:**

1. Navigate to Patients page (requires consent)
2. Select patient
3. Click "Submit Document"
4. Upload document (e.g., discharge summary PDF)
5. Select type: "Medical Record"
6. Add description
7. Click "Submit"

**Expected Outcome:**

- ✓ Document uploaded to Cloudinary
- ✓ Document linked to patient account
- ✓ Patient can view in their Documents page
- ✓ Success notification

### 8. Referrals

**Test Case 8.1: Create Inter-departmental Referral**

**Steps:**

1. Navigate to Referrals page
2. Click "Create Referral"
3. Fill in details:
   - Patient name and phone
   - From department: "General Medicine"
   - To department: "Cardiology"
   - Reason: "Suspected heart condition"
   - Notes: "Patient complains of chest pain"
4. Click "Create"

**Expected Outcome:**

- ✓ Referral created
- ✓ Status: PENDING
- ✓ Receiving department sees referral
- ✓ Patient details included

---

## Doctor Workflow Tests

### 1. Registration

**Test Case 1.1: Independent Doctor Registration**

**Steps:**

1. Select "Doctor" role
2. Fill in details (no hospital ID)
3. Upload practice license
4. Register

**Expected Outcome:**

- ✓ Registration successful
- ✓ Verification status: PENDING
- ✓ Dual ID system:
  - User ID: Generated
  - Doctor ID: Generated separately
- ✓ Independent doctor flag set

**Test Case 1.2: Hospital-affiliated Doctor Registration**

**Steps:**

1. Select "Doctor" role
2. Fill in details
3. Enter hospital ID (from hospital's doctor list)
4. Upload documents
5. Register

**Expected Outcome:**

- ✓ Registration successful
- ✓ Hospital link established
- ✓ Hospital name visible in profile

### 2. Slot and Booking Management

**Test Case 2.1: Create Consultation Slot**

**Steps:**

1. Create OPD slot as doctor
2. Set consultation fee
3. Set consultation type: "Video" or "In-person"

**Expected Outcome:**

- ✓ Slot created
- ✓ Available for bookings

**Test Case 2.2: View Bookings**

**Steps:**

1. Navigate to Bookings
2. View today's appointments

**Expected Outcome:**

- ✓ All bookings visible
- ✓ Patient details (from snapshot)
- ✓ Action buttons available

### 3. Patient List (Consent-based)

**Test Case 3.1: Request Consent**

**Steps:**

1. Navigate to Patients page
2. Click "Request Consent"
3. Enter patient phone/email
4. Add reason: "For consultation on 15/01/2025"
5. Submit

**Expected Outcome:**

- ✓ Consent request created
- ✓ Patient receives notification
- ✓ Status: PENDING
- ✓ Cannot access patient data yet

**Test Case 3.2: View Patient After Consent Approval**

**Steps:**

1. Wait for patient to approve consent
2. Refresh patient list
3. Click on patient

**Expected Outcome:**

- ✓ Patient details visible
- ✓ Medical history accessible
- ✓ Documents viewable
- ✓ All interactions logged

### 4. Prescription Creation

**Test Case 4.1: Create Prescription**

**Steps:**

1. Open patient details (with consent)
2. Click "Create Prescription"
3. Search and add medicines:
   - Medicine: "Aspirin"
   - Dosage: "75mg"
   - Frequency: "Once daily"
   - Duration: "30 days"
4. Add instructions: "Take after breakfast"
5. Select linked pharmacy (optional)
6. Click "Create"

**Expected Outcome:**

- ✓ Prescription created
- ✓ Linked to patient
- ✓ Patient can view in their prescriptions
- ✓ Pharmacy notified (if linked)

**Test Case 4.2: Medicine Search**

**Steps:**

1. During prescription creation
2. Click "Search Medicines"
3. Enter medicine name
4. Select from results

**Expected Outcome:**

- ✓ Search results from linked pharmacies
- ✓ Stock availability shown
- ✓ Price displayed
- ✓ Auto-fill dosage options

### 5. Remote Consultation

**Test Case 5.1: Start Video Consultation**

**Steps:**

1. Open confirmed booking (today)
2. Click "Start Consultation"
3. Select type: "Video"
4. Click "Join Call"

**Expected Outcome:**

- ✓ Agora token generated
- ✓ Video call interface opens
- ✓ Camera and microphone active
- ✓ Patient can join with same token
- ✓ Consultation status: IN_PROGRESS

**Test Case 5.2: Chat During Consultation**

**Steps:**

1. During video call
2. Open chat panel
3. Send message: "How are you feeling?"
4. Receive patient response

**Expected Outcome:**

- ✓ Messages sent and received in real-time
- ✓ Chat history preserved
- ✓ Timestamps visible

**Test Case 5.3: Add Consultation Notes**

**Steps:**

1. During or after consultation
2. Click "Add Notes"
3. Enter notes: "Patient stable, prescribed medication"
4. Save

**Expected Outcome:**

- ✓ Notes saved
- ✓ Visible in consultation history
- ✓ Accessible for future reference

**Test Case 5.4: Complete Consultation**

**Steps:**

1. Click "Complete Consultation"
2. Confirm

**Expected Outcome:**

- ✓ Status: COMPLETED
- ✓ Video call ends
- ✓ Notes finalized
- ✓ Consultation summary available

### 6. Referrals

**Test Case 6.1: Refer to Specialist**

**Steps:**

1. Create referral
2. Select target: Specialist doctor
3. Select specialization: "Cardiology"
4. Add reason and notes
5. Submit

**Expected Outcome:**

- ✓ Referral created
- ✓ Cardiologist receives referral
- ✓ Patient notified

**Test Case 6.2: Refer to Pharmacy**

**Steps:**

1. Create referral to pharmacy
2. Attach prescription
3. Submit

**Expected Outcome:**

- ✓ Pharmacy receives referral
- ✓ Prescription linked
- ✓ Pharmacy prepares medicines

---

## Lab Workflow Tests

### 1. Registration and Profile

**Test Case 1.1: Lab Registration**

**Steps:**

1. Register as lab
2. Add machine list:
   - "X-Ray Machine"
   - "Blood Analyzer"
3. Add facilities:
   - "Blood Test"
   - "Urine Test"
   - "X-Ray"

**Expected Outcome:**

- ✓ Registration successful
- ✓ Machines and facilities listed
- ✓ Available for bookings

### 2. Slot and Booking Management

**Test Case 2.1: Create Test Slot**

**Steps:**

1. Create LAB slot
2. Set test type: "Blood Test"
3. Set price
4. Set capacity

**Expected Outcome:**

- ✓ Slot created
- ✓ Available for patient bookings

**Test Case 2.2: Manual Booking for Walk-in**

**Steps:**

1. Create manual booking
2. Enter patient details
3. Select test type
4. Mark payment as CASH

**Expected Outcome:**

- ✓ Booking created
- ✓ Test scheduled

### 3. Report Submission

**Test Case 3.1: Submit Lab Report**

**Steps:**

1. Open completed booking
2. Click "Submit Report"
3. Upload PDF report
4. Add notes (optional)
5. Submit

**Expected Outcome:**

- ✓ Report uploaded to Cloudinary
- ✓ Linked to patient account
- ✓ Patient can view and download
- ✓ Booking status updated

### 4. Billing

**Test Case 4.1: Generate Invoice**

**Steps:**

1. Open completed booking
2. Click "Generate Invoice"
3. Add line items:
   - Test: "Blood Test"
   - Quantity: 1
   - Rate: 500
4. Add GST (18%)
5. Generate

**Expected Outcome:**

- ✓ Invoice created
- ✓ Tax calculated correctly
- ✓ Total: ₹590 (500 + 90)
- ✓ Invoice number generated

**Test Case 4.2: Mark Invoice as Paid**

**Steps:**

1. Open invoice
2. Click "Mark as Paid"
3. Confirm

**Expected Outcome:**

- ✓ Payment status: PAID
- ✓ Payment date recorded
- ✓ Invoice finalized

---

## Pharmacy Workflow Tests

### 1. Inventory Management

**Test Case 1.1: Add Medicine**

**Steps:**

1. Navigate to Inventory
2. Click "Add Medicine"
3. Fill in details:
   - Name: "Aspirin"
   - Manufacturer: "XYZ Pharma"
   - Stock: 100
   - Price: 10
   - Expiry Date: 31/12/2025
4. Add

**Expected Outcome:**

- ✓ Medicine added
- ✓ Available for prescription fulfillment

**Test Case 1.2: Update Stock**

**Steps:**

1. Edit medicine
2. Update stock: 50
3. Save

**Expected Outcome:**

- ✓ Stock updated
- ✓ Available quantity reflects change

### 2. Stock Alerts

**Test Case 2.1: Low Stock Alert**

**Steps:**

1. Set medicine stock below threshold (e.g., 10)
2. View "Low Stock" page

**Expected Outcome:**

- ✓ Medicine appears in low stock list
- ✓ Alert badge visible
- ✓ Reorder suggestion

**Test Case 2.2: Expiring Medicines Alert**

**Steps:**

1. View "Expiring Soon" page
2. Check medicines expiring in next 30 days

**Expected Outcome:**

- ✓ Expiring medicines listed
- ✓ Days until expiry shown
- ✓ Alert color-coded by urgency

### 3. Prescription Fulfillment

**Test Case 3.1: View Prescription Queue**

**Steps:**

1. Navigate to Prescriptions page
2. View pending prescriptions

**Expected Outcome:**

- ✓ All pre-booked prescriptions listed
- ✓ Patient details visible
- ✓ Medicine list shown

**Test Case 3.2: Fulfill Prescription**

**Steps:**

1. Open prescription
2. Verify medicine availability
3. Click "Mark as Fulfilled"
4. Confirm

**Expected Outcome:**

- ✓ Status: FULFILLED
- ✓ Stock decremented
- ✓ Patient notified
- ✓ Ready for invoice generation

### 4. Pharmacy Linking

**Test Case 4.1: Link with Doctor**

**Steps:**

1. Navigate to Pharmacy Linking page
2. Click "Send Link Request"
3. Enter doctor email
4. Submit

**Expected Outcome:**

- ✓ Link request sent
- ✓ Doctor can accept/reject
- ✓ Upon acceptance, doctor can see pharmacy medicines

---

## Admin Workflow Tests

### 1. Pending Verifications

**Test Case 1.1: View Verification Queue**

**Steps:**

1. Login as admin
2. Navigate to Verifications page

**Expected Outcome:**

- ✓ List of pending verifications
- ✓ Grouped by role (Hospital, Doctor)
- ✓ Each shows name, email, registration date

**Test Case 1.2: Review Hospital Documents**

**Steps:**

1. Click on pending hospital
2. View profile details
3. Open legal documents
4. Review

**Expected Outcome:**

- ✓ All hospital details visible
- ✓ Documents viewable in modal
- ✓ Approve/Reject buttons enabled

**Test Case 1.3: Approve Hospital**

**Steps:**

1. Click "Approve"
2. Add comment: "Documents verified"
3. Confirm

**Expected Outcome:**

- ✓ Verification status: APPROVED
- ✓ Hospital can now create slots
- ✓ Hospital receives notification
- ✓ Removed from pending queue

**Test Case 1.4: Reject Doctor**

**Steps:**

1. Review doctor application
2. Click "Reject"
3. Add reason: "Invalid practice license"
4. Confirm

**Expected Outcome:**

- ✓ Verification status: REJECTED
- ✓ Doctor notified with reason
- ✓ Doctor cannot create slots
- ✓ Removed from pending queue

### 2. Verification History

**Test Case 2.1: View History**

**Steps:**

1. Click "Verification History"
2. View all past verifications

**Expected Outcome:**

- ✓ All actions listed with timestamps
- ✓ Shows who verified, when, and decision
- ✓ Comments visible
- ✓ Audit trail complete

---

## Cross-Cutting Tests

### 1. RBAC (Role-Based Access Control)

**Test Case 1.1: Unauthorized Access Attempts**

**Steps:**

1. Login as patient
2. Try to access hospital dashboard URL directly
3. Try to access admin panel

**Expected Outcome:**

- ✗ Access denied
- ✓ 403 Forbidden error
- ✓ Redirected to appropriate page
- ✓ Error message: "Access denied"

**Test Case 1.2: Role-specific Features**

**Steps:**

1. Verify each role can only access their features
2. Test API endpoints with wrong roles

**Expected Outcome:**

- ✓ Patients: Cannot create slots
- ✓ Hospitals: Cannot approve verifications
- ✓ Doctors: Cannot access pharmacy inventory
- ✓ All unauthorized API calls return 403

### 2. Concurrent Booking Prevention

**Test Case 2.1: Race Condition Test**

**Steps:**

1. Open same slot in two browser tabs
2. Attempt to book simultaneously

**Expected Outcome:**

- ✓ Only one booking succeeds
- ✓ Other fails with "Slot no longer available"
- ✓ Slot capacity correctly decremented once
- ✓ No overbooking

### 3. Payment Webhook

**Test Case 3.1: Webhook Processing**

**Steps:**

1. Trigger test webhook from Razorpay dashboard
2. Send payment.captured event

**Expected Outcome:**

- ✓ Webhook received
- ✓ Signature verified
- ✓ Payment status updated
- ✓ Booking status updated

### 4. Mobile Responsiveness

**Test Case 4.1: Mobile View (320px)**

**Steps:**

1. Resize browser to 320px width
2. Navigate all pages

**Expected Outcome:**

- ✓ All pages responsive
- ✓ No horizontal scrolling
- ✓ Buttons accessible
- ✓ Forms usable
- ✓ Modals fit screen

### 5. Accessibility

**Test Case 5.1: Keyboard Navigation**

**Steps:**

1. Navigate using Tab key only
2. Try to complete a booking flow

**Expected Outcome:**

- ✓ All interactive elements focusable
- ✓ Focus indicators visible
- ✓ Tab order logical
- ✓ Can complete all actions

**Test Case 5.2: Screen Reader**

**Steps:**

1. Enable NVDA/JAWS
2. Navigate application

**Expected Outcome:**

- ✓ All content announced
- ✓ ARIA labels present
- ✓ Form errors announced
- ✓ Navigation clear

### 6. Cross-Browser Testing

**Test browsers:**

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Expected Outcome:**

- ✓ Consistent behavior across all browsers
- ✓ No browser-specific bugs
- ✓ UI renders correctly

---

## Edge Cases and Error Scenarios

### 1. Network Failures

**Test Case 1.1: Network Failure During Booking**

**Steps:**

1. Start booking process
2. Disconnect network before payment
3. Attempt to pay

**Expected Outcome:**

- ✗ Payment fails
- ✓ Error: "Network error"
- ✓ Booking remains in PENDING
- ✓ Can retry when network restored

### 2. Expired Tokens

**Test Case 2.1: Access with Expired Token**

**Steps:**

1. Wait for access token to expire (15+ min)
2. Make API call

**Expected Outcome:**

- ✓ Token auto-refreshed
- ✓ API call succeeds
- ✓ User not logged out

**Test Case 2.2: Expired Refresh Token**

**Steps:**

1. Wait 7+ days for refresh token to expire
2. Try to use application

**Expected Outcome:**

- ✗ Auto-refresh fails
- ✓ User logged out
- ✓ Redirected to login
- ✓ Message: "Session expired"

### 3. Slot Deletion with Bookings

**Test Case 3.1: Attempt to Delete Booked Slot**

**Steps:**

1. Create slot
2. Have patient book it
3. Try to delete slot

**Expected Outcome:**

- ✗ Deletion blocked
- ✓ Error: "Cannot delete slot with existing bookings"
- ✓ Slot remains

### 4. Consent Revocation During Access

**Test Case 4.1: Revoke While Provider Viewing**

**Steps:**

1. Patient approves consent
2. Doctor views documents
3. Patient revokes consent
4. Doctor tries to access document

**Expected Outcome:**

- ✗ Access denied immediately
- ✓ Error: "Consent has been revoked"
- ✓ Real-time access control

---

## Test Results Documentation

### Test Execution Log Template

```
Test Case ID: [e.g., PATIENT-1.1]
Test Case Name: [e.g., Valid Patient Registration]
Date: [DD/MM/YYYY]
Tester: [Name]
Environment: [Development/Staging]

Steps Executed: [Brief summary]

Actual Result:
- [What actually happened]

Expected Result:
- [What should have happened]

Status: [PASS/FAIL/BLOCKED]

Issues Found:
- [List any bugs or issues]
- [Include screenshots if applicable]

Notes:
- [Any additional observations]
```

### Bug Report Template

```
Bug ID: [BUG-001]
Title: [Short description]
Severity: [Critical/High/Medium/Low]
Priority: [P1/P2/P3]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Environment:
- Browser: [Chrome 120]
- OS: [macOS 14]
- Screen Size: [1920x1080]

Screenshots/Logs:
[Attach relevant files]

Additional Notes:
[Any other relevant information]
```

---

## Summary

This testing guide covers:

- **5 stakeholder workflows:** Patient, Hospital, Doctor, Lab, Pharmacy
- **1 admin workflow:** Verification management
- **Cross-cutting concerns:** RBAC, payments, consent, responsiveness, accessibility
- **Edge cases:** Network failures, token expiry, concurrent access
- **250+ test cases** across all features

**Next Steps:**

1. Execute all test cases systematically
2. Document results using templates provided
3. Create bug reports for any issues found
4. Retest after fixes
5. Get stakeholder sign-off
6. Proceed to deployment (see `DEPLOYMENT.md`)

**Testing Checklist:**

Refer to `TESTING_CHECKLIST.md` for a comprehensive pre-deployment checklist covering all areas.

---

_For detailed deployment instructions, see `docs/DEPLOYMENT.md`_  
_For API reference, see `docs/API_REFERENCE.md`_  
_For security audit, see `docs/SECURITY_AUDIT.md`_
