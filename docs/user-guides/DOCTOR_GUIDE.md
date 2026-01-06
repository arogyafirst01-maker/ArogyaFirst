# ArogyaFirst - Doctor User Guide

## Phase 1 Scope Note

**Current Phase 1 Implementation:**

- Independent and hospital-affiliated practice management
- Appointment scheduling with slot management
- Video consultations with patients (Agora integration)
- Digital prescription creation and sharing
- Patient document access (consent-based)
- Referral system (to doctors, labs, hospitals)
- Consultation history and notes
- Revenue tracking and analytics

**Advanced Features (Phase 2/3):**

- AI-assisted diagnosis and treatment suggestions
- Automated prescription refills
- Patient health monitoring dashboards
- Template-based consultation notes
- Voice-to-text for faster documentation
- Integration with external lab systems
- Continuing medical education (CME) tracking
- Multi-clinic management for doctors with multiple practices

Features marked as "Phase 2/3" are planned for upcoming releases.

---

## Welcome

ArogyaFirst empowers doctors to manage appointments, consultations, prescriptions, patient records, and referrals efficiently.

---

## Getting Started

### Registration Options

Doctors can register in two ways:

#### Option 1: Independent Doctor

1. Visit ArogyaFirst website
2. Click "Register" and select "Doctor"
3. Fill in required information:
   - Full Name
   - Email Address
   - Password (minimum 8 characters)
   - Phone Number
   - Location (City/State)
   - Specialization (Cardiology, Neurology, etc.)
   - Qualifications (MBBS, MD, DNB, etc.)
   - Registration Number (Medical Council)
   - Years of Experience
   - Consultation Fee
4. Click "Register"
5. Your unique Doctor ID: `YourPhone@ArogyaFirst`
6. You'll be automatically logged in

#### Option 2: Hospital-Affiliated Doctor

1. Hospital admin adds you to their doctors master list
2. You receive email invitation
3. Click link in email
4. Complete profile:
   - Verify pre-filled information
   - Set password
   - Add additional qualifications
   - Set availability
5. Click "Complete Registration"
6. Account linked to hospital

### Dual ID System

Hospital-affiliated doctors have two IDs:

- **Personal Doctor ID:** `YourPhone@ArogyaFirst` (for independent practice)
- **Hospital Doctor ID:** `HospitalPhone-YourPhone@ArogyaFirst` (for hospital appointments)

Patients can book with either ID depending on where they want the consultation.

### Login

1. Click "Login"
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

---

## Dashboard

Your dashboard shows:

- **Today's Appointments** count
- **Total Patients** (unique)
- **Prescriptions Written** (this month)
- **Revenue** (this month)
- **Upcoming appointments** list
- **Pending consultations**
- Quick action buttons

---

## Profile Management

### View Profile

1. Click your name in top-right corner
2. Select "Profile"
3. View:
   - Name, Email, Phone
   - Specialization, Qualifications
   - Registration Number
   - Experience, Consultation Fee
   - Affiliated Hospital (if any)

### Edit Profile

1. Click "Edit Profile"
2. Update:
   - Name, Phone, Location
   - Specialization, Qualifications
   - Experience, Consultation Fee
   - Bio/About section
3. Email and Registration Number cannot be changed
4. Click "Save Changes"

### Set Availability

1. Go to Profile > Availability
2. Set weekly schedule:
   - Days available (Mon-Sun)
   - Working hours per day
   - Break times
3. Mark holidays/leaves
4. Click "Save Availability"

---

## Slot Management

### Create Slots

1. Click "Slots" in navigation
2. Click "Create Slots"
3. Select date range
4. Set slot configuration:
   - Start Time
   - End Time
   - Slot Duration (15, 30, 45, 60 minutes)
   - Break Times (lunch, etc.)
5. Set or verify consultation fee
6. Click "Generate Slots"
7. Review generated slots
8. Click "Confirm"
9. Slots available for patient booking

### Bulk Slot Creation

1. Select "Bulk Create"
2. Set weekly schedule:
   - Monday: 9:00 AM - 1:00 PM, 4:00 PM - 8:00 PM
   - Tuesday: 9:00 AM - 1:00 PM
   - etc.
3. Set date range (next 30/60/90 days)
4. Define breaks
5. Click "Generate"
6. Review and confirm

### Manage Slots

- View all your slots
- Filter by date/status
- **Block slots** (mark unavailable for emergencies/personal time)
- **Unblock slots**
- View booking status per slot

---

## Booking Management

### View Bookings

1. Click "Bookings" in navigation
2. View tabs:
   - **Today** - Today's appointments
   - **Upcoming** - Future appointments
   - **Past** - Completed appointments
   - **All** - All bookings

### Booking Details

Click any booking to view:

- Patient name and contact
- Booking ID
- Date and time
- Payment status
- Reason for visit
- Patient notes
- Medical history (if consent approved)

### Update Booking Status

1. Open booking
2. After appointment, update status:
   - **CONFIRMED** → **COMPLETED**
   - **CONFIRMED** → **NO_SHOW** (patient didn't arrive)
3. Add consultation notes
4. Click "Update"

---

## Patient List (Consent-Based Access)

### View Patient List

1. Click "Patients" in navigation
2. View only patients who have:
   - Approved your consent request, OR
   - Had consultation with you
3. Each patient card shows:
   - Name, Age, Contact
   - Last visit date
   - Total consultations
   - Active prescriptions

### Request Document Access

1. Select patient from booking
2. Click "Request Document Access"
3. Enter reason for request
4. Click "Send Request"
5. Patient receives notification
6. If approved, you can view patient documents

---

## Medical History Viewer

### Access Patient History

1. Go to patient details
2. Click "Medical History"
3. View chronological timeline:
   - Previous consultations
   - Prescriptions
   - Lab reports
   - Uploaded documents
   - Diagnoses

**Note:** Only visible if patient approved consent.

### Filter History

- By date range
- By document type
- By diagnosis
- Search by keyword

---

## Prescription Creation

### Create Prescription

1. From booking details, click "Create Prescription"
2. Fill prescription form:

   **Patient Information:** (auto-filled)

   - Name, Age, Gender

   **Diagnosis:**

   - Primary diagnosis
   - Secondary diagnosis (if any)
   - ICD codes (optional)

   **Medicines:** (Click "Add Medicine")

   - Medicine name
   - Dosage (e.g., 500mg)
   - Frequency (e.g., Twice daily)
   - Duration (e.g., 7 days)
   - Instructions (e.g., After food)
   - Repeat for all medicines

   **Additional Instructions:**

   - Diet recommendations
   - Activity restrictions
   - Follow-up date
   - Special notes

3. Click "Preview" to review
4. Click "Save and Send to Patient"
5. Prescription sent to patient's account

### Link Prescription to Pharmacy

1. After creating prescription, click "Link to Pharmacy"
2. Select pharmacy from list (hospital pharmacies or nearby)
3. Click "Link"
4. Patient can pre-book at linked pharmacy

### View Past Prescriptions

- Go to "Prescriptions" in navigation
- View all prescriptions you've created
- Filter by patient/date
- Search by medicine name

---

## Consultations (Video/Chat)

### Start Video Consultation

1. Go to today's bookings
2. At appointment time, click "Start Consultation"
3. Video call window opens (Agora integration)
4. Wait for patient to join
5. Conduct consultation
6. Click "End Call" when done
7. Add consultation notes

### Chat Consultation

1. From booking, click "Chat"
2. Chat window opens
3. Text-based consultation
4. Share documents if needed
5. Click "End Chat" when done
6. Add consultation summary

### Post-Consultation

After video/chat consultation:

1. Add consultation notes
2. Create prescription if needed
3. Order lab tests if required
4. Schedule follow-up
5. Send referral if needed
6. Mark booking as COMPLETED

---

## Referrals

### Refer Patient to Specialist

1. From patient booking, click "Create Referral"
2. Select referral type: **To Specialist**
3. Search and select specialist doctor
4. Enter referral reason:
   - Diagnosis so far
   - Reason for referral
   - Tests done
   - Current medications
5. Attach relevant documents
6. Click "Send Referral"
7. Patient and specialist both notified

### Refer Patient for Tests

1. Click "Create Referral"
2. Select referral type: **To Lab**
3. Search and select lab
4. Select tests required:
   - Blood Test
   - X-Ray
   - MRI
   - etc.
5. Add clinical notes
6. Click "Send Referral"
7. Patient can book directly with lab

### Receive Referrals

1. Go to "Referrals" > "Incoming"
2. View referrals from other doctors
3. Each shows:
   - Patient details
   - Referring doctor
   - Referral reason
   - Medical history
4. Click "Accept" to schedule appointment
5. Click "Decline" with reason

### Track Referrals

- View "Sent Referrals" - referrals you made
- View "Received Referrals" - referrals to you
- Track referral status (Pending, Accepted, Declined)

---

## Appointment Notifications

### Email Notifications

You receive emails for:

- New booking confirmed
- Booking cancelled by patient
- Upcoming appointment reminder (1 day before)
- Consent request approved/denied
- Referral received

### In-App Notifications

Real-time notifications for:

- Patient joined waiting room (for video consultation)
- New chat message
- Emergency booking

---

## Analytics & Insights

### View Your Analytics

1. Click "Analytics" in navigation
2. View metrics:
   - **Total Consultations** (monthly/yearly)
   - **Revenue** (earnings breakdown)
   - **Patient Distribution** (by age, gender, location)
   - **Common Diagnoses** (top conditions treated)
   - **Prescription Patterns** (most prescribed medicines)
   - **Consultation Mode** (in-person vs video vs chat)

### Generate Reports **(Phase 2/3)**

**This feature is not yet available in the current Phase 1 release.**

1. Click "Generate Report"
2. Select report type:
   - Consultation Report
   - Revenue Report
   - Patient Demographics
3. Set date range
4. Click "Generate"
5. Download PDF or CSV

**Note:** Current Phase 1 implementation provides view-only analytics. Export functionality planned for Phase 2/3.

---

## Change Password

1. Go to Profile > Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click "Update Password"

---

## Tips for Best Experience

1. **Create Slots in Advance** - Schedule 30-60 days ahead for patient convenience
2. **Keep Availability Updated** - Block slots for holidays/conferences
3. **Detailed Prescriptions** - Include all dosage instructions clearly
4. **Request Consent Early** - Better patient care with access to history
5. **Timely Referrals** - Don't delay referring when needed
6. **Consultation Notes** - Maintain detailed notes for future reference
7. **Link Pharmacies** - Help patients get medicines easily

---

## Troubleshooting

### Slots Not Visible to Patients

- Check if slots are in future dates
- Verify slots not blocked
- Ensure consultation fee is set

### Video Call Not Starting

- Check internet connection
- Allow camera/microphone permissions
- Try different browser (Chrome recommended)
- Refresh page

### Patient History Not Visible

- Verify patient approved consent
- Check consent expiry date
- Request consent again if expired

### Prescription Not Saving

- Check all required fields filled
- Verify at least one medicine added
- Check internet connection

---

## Support

- **Email:** doctor-support@arogyafirst.com
- **Phone:** [Doctor Support Number]
- **Live Chat:** 9 AM - 6 PM

---

## FAQs

**Q: Can I practice independently and with hospital simultaneously?**  
A: Yes, you'll have two doctor IDs. Manage both from one account.

**Q: How do I set different fees for hospital vs independent practice?**  
A: Set fees separately when creating slots for each ID.

**Q: Can I access patient documents without consent?**  
A: No, patient consent is mandatory for privacy compliance.

**Q: What if patient doesn't approve consent?**  
A: You can still consult but won't see previous medical history. Request again with clear reason.

**Q: Can I block recurring time slots?**  
A: Yes, use bulk slot blocking feature to block weekly patterns.

**Q: How to handle emergency consultations?**  
A: Keep some slots unbooked or use manual override to create immediate slots.

**Q: Can I edit prescription after sending?**  
A: No, prescriptions are immutable. Create new prescription if changes needed.

**Q: What happens to my data if I leave hospital?**  
A: Your personal doctor ID and data remain. Only hospital-affiliated ID is unlinked.

---

_Thank you for being a valued healthcare provider on ArogyaFirst!_
