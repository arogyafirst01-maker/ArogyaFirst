# ArogyaFirst - Hospital User Guide

## Phase 1 Scope Note

**Current Phase 1 Implementation:**

- Hospital profile and facility management
- Doctor, lab, pharmacy, and bed inventory management
- Appointment slot creation and booking management (OPD, IPD, LAB)
- Patient document access (consent-based)
- Staff and department management
- Revenue and booking analytics dashboard
- Referral management (sending and receiving)

**Advanced Features (Phase 2/3):**

- Advanced analytics and predictive insights
- Integrated electronic health records (EHR) system
- Automated bed allocation and queue management
- Multi-location hospital chain management
- Staff scheduling and shift management
- Patient satisfaction surveys and feedback system
- Insurance pre-authorization workflows

Features marked as "Phase 2/3" are planned for upcoming releases.

---

## Welcome

ArogyaFirst helps hospitals manage doctors, labs, beds, pharmacies, appointments, staff, and analytics from a centralized platform.

---

## Getting Started

### Registration

1. Visit ArogyaFirst website
2. Click "Register" and select "Hospital"
3. Fill in required information:
   - Hospital Name
   - Email Address
   - Password (minimum 8 characters)
   - Phone Number
   - Location (City/State)
   - Registration Number (Hospital License)
   - Specializations offered
   - Facilities (Emergency, ICU, etc.)
   - Admin Contact Details
4. Click "Register"
5. Your unique Hospital ID: `YourPhone@ArogyaFirst`
6. You'll be automatically logged in

### Login

1. Click "Login"
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

---

## Dashboard

Your dashboard shows:

- **Total Doctors** registered
- **Total Labs** in hospital
- **Total Beds** (available/occupied)
- **Total Pharmacies** linked
- **Total Staff** count
- **Today's Bookings**
- **Monthly Revenue**
- Quick action buttons
- Activity feed

---

## Master Lists Management

### Doctors Master List

#### Add Doctor

1. Click "Doctors" in navigation
2. Click "Add Doctor"
3. Fill doctor information:
   - Name, Email, Phone
   - Specialization (Cardiology, Neurology, etc.)
   - Qualifications (MBBS, MD, etc.)
   - Registration Number (Medical Council)
   - Experience (years)
   - Availability (days/hours)
4. Click "Add"
5. Doctor receives email invitation
6. Doctor creates their ArogyaFirst account
7. System links doctor to hospital

#### View Doctors

- See all affiliated doctors
- Filter by specialization
- Search by name
- View doctor details (profile, slots, bookings)

#### Remove Doctor

1. Select doctor from list
2. Click "Remove"
3. Confirm removal
4. Doctor unlinked from hospital (not deleted)

### Labs Master List

#### Add Lab

1. Click "Labs" in navigation
2. Click "Add Lab"
3. Fill lab information:
   - Lab Name
   - Specialization (Pathology, Radiology, etc.)
   - Machines Available
   - Tests Offered
   - Location in Hospital
   - Operating Hours
4. Click "Add"
5. Lab added to hospital network

#### Manage Labs

- View all labs
- Edit lab details
- Add/remove machines
- Update test catalog
- Set test prices

### Beds Master List

#### Add Bed

1. Click "Beds" in navigation
2. Click "Add Bed"
3. Fill bed information:
   - Bed Number
   - Ward (General, ICU, Private, etc.)
   - Floor/Building
   - Features (AC, Oxygen, etc.)
   - Price per Day
4. Click "Add"

#### Manage Beds

- View all beds with status (Available, Occupied, Maintenance)
- Filter by ward type
- Update bed status
- Assign to patient
- Mark for maintenance

#### Bed Bookings

- View IPD bookings
- Assign beds to bookings
- Track occupancy
- Discharge patient (free bed)

### Pharmacies Master List

#### Add Pharmacy

1. Click "Pharmacies" in navigation
2. Click "Add Pharmacy"
3. Fill pharmacy information:
   - Pharmacy Name
   - Location in Hospital
   - License Number
   - Operating Hours
4. Click "Add"
5. Pharmacy added to hospital network

#### Manage Pharmacies

- View all pharmacies
- Edit pharmacy details
- Link to hospital prescriptions
- View inventory summary

### Staff Management

#### Add Staff

1. Click "Staff" in navigation
2. Click "Add Staff"
3. Fill staff information:
   - Name, Email, Phone
   - Role (Nurse, Receptionist, Technician, Admin)
   - Department
   - Shift Timings
   - Employee ID
4. Click "Add"

#### Manage Staff

- View all staff
- Filter by role/department
- Edit staff details
- Assign schedules
- Remove staff

---

## Slot Management

### Create Doctor Slots

1. Go to "Slots" in navigation
2. Click "Create Slots"
3. Select doctor from dropdown
4. Select date range
5. Set slot configuration:
   - Start Time
   - End Time
   - Slot Duration (15, 30, 45, 60 minutes)
   - Break Times
6. Set pricing
7. Click "Generate Slots"
8. Review generated slots
9. Click "Confirm"
10. Slots available for booking

### Bulk Slot Creation

1. Select "Bulk Create"
2. Choose doctor
3. Set weekly schedule:
   - Monday: 9:00 AM - 5:00 PM
   - Tuesday: 9:00 AM - 5:00 PM
   - etc.
4. Set date range (next 30/60/90 days)
5. Define breaks
6. Click "Generate"
7. Review and confirm

### Manage Slots

- View all slots by doctor
- Filter by date/status
- Block slots (mark unavailable)
- Unblock slots
- View booking status per slot

---

## Booking Management

### View Bookings

1. Click "Bookings" in navigation
2. View tabs:
   - **All** - All bookings
   - **OPD** - Outpatient bookings
   - **IPD** - Bed bookings
   - **Today** - Today's appointments
   - **Upcoming** - Future appointments
   - **Completed** - Past appointments

### Booking Details

- Click any booking for details:
  - Patient name and contact
  - Doctor/Lab assigned
  - Date and time
  - Payment status
  - Booking ID
  - Special instructions

### Update Booking Status

1. Open booking
2. Update status:
   - **CONFIRMED** → **COMPLETED** (after appointment)
   - **CONFIRMED** → **NO_SHOW** (patient didn't arrive)
   - **CONFIRMED** → **CANCELLED** (hospital cancels)
3. Add notes if needed
4. Click "Update"

### Manual Booking

1. Click "Create Booking"
2. Search and select patient
3. Select service (OPD/IPD/LAB)
4. Select doctor/lab/bed
5. Choose slot
6. Mark payment status (Paid/Pending)
7. Click "Confirm"
8. Booking created

---

## Analytics Dashboard

### Overview Metrics

- **Total Bookings** (daily/weekly/monthly)
- **Revenue** (by service type)
- **Occupancy Rate** (beds)
- **Doctor Performance** (bookings per doctor)
- **Popular Specializations**
- **Peak Hours** (busiest times)

### Reports **(Phase 2/3)**

**This feature is not yet available in the current Phase 1 release.**

1. Click "Analytics" > "Reports"
2. Select report type:
   - Booking Report
   - Revenue Report
   - Doctor Performance
   - Bed Occupancy
   - Lab Test Volume
3. Set date range
4. Apply filters (doctor, department, etc.)
5. Click "Generate Report"
6. View or download (CSV/PDF)

**Note:** Current Phase 1 implementation provides view-only summary analytics. Export functionality planned for Phase 2/3.

### Graphs & Insights

- Revenue trend graph
- Booking volume over time
- Department-wise distribution
- Patient demographics
- Appointment no-show rates

---

## Document Submission

### Upload Hospital Documents

1. Click "Documents" in navigation
2. Click "Upload"
3. Select document type:
   - License
   - Accreditation Certificate
   - Insurance Documents
   - Staff Certifications
   - Equipment Certificates
4. Choose file
5. Add description
6. Click "Upload"

### Manage Documents

- View all documents
- Filter by type
- Download documents
- Delete outdated documents

---

## Referrals

### Receive Referrals

1. Go to "Referrals" > "Incoming"
2. View referrals from other providers
3. Each shows:
   - Patient details
   - Referring provider
   - Reason for referral
   - Medical history (if consent given)
4. Click "Accept" to schedule appointment
5. Click "Decline" with reason

### Send Referrals

1. From booking details, click "Refer Patient"
2. Select referral type:
   - To Specialist (different doctor)
   - To Lab (for tests)
   - To Other Hospital
3. Choose provider
4. Add referral notes
5. Click "Send Referral"
6. Patient notified

---

## Profile Management

### View Profile

1. Click hospital name in top-right
2. Select "Profile"
3. View:
   - Hospital Name, Email, Phone
   - Location, Registration Number
   - Specializations, Facilities
   - Unique ID

### Edit Profile

1. Click "Edit Profile"
2. Update:
   - Name, Phone, Location
   - Specializations offered
   - Facilities available
   - Operating hours
3. Email and Registration Number cannot be changed
4. Click "Save Changes"

### Change Password

1. Go to Profile > Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click "Update Password"

---

## Staff Scheduling

### Create Schedule

1. Go to "Staff" > "Schedules"
2. Click "Create Schedule"
3. Select staff member
4. Select week
5. Assign shifts:
   - Morning (6 AM - 2 PM)
   - Evening (2 PM - 10 PM)
   - Night (10 PM - 6 AM)
6. Mark weekly offs
7. Click "Save Schedule"

### View Schedules

- Calendar view of all staff schedules
- Filter by department/role
- Identify gaps in coverage
- Swap shifts if needed

---

## Tips for Best Experience

1. **Keep Master Lists Updated** - Regular updates ensure accurate information
2. **Bulk Slot Creation** - Schedule months in advance for popular doctors
3. **Monitor Analytics** - Identify trends and optimize resources
4. **Train Staff** - Ensure all staff know how to use the platform
5. **Document Everything** - Keep digital records of all hospital documents
6. **Respond to Referrals Quickly** - Maintain good relationships with other providers

---

## Troubleshooting

### Doctor Not Showing in List

- Verify doctor accepted invitation
- Check if doctor completed profile
- Ensure doctor linked to hospital

### Slots Not Available for Booking

- Check if slots are in future dates
- Verify slots not blocked
- Ensure pricing is set

### Booking Status Not Updating

- Refresh page
- Check internet connection
- Verify you have edit permissions

### Analytics Not Loading

- Clear browser cache
- Try different date range
- Check if data exists for selected period

---

## Support

- **Email:** hospital-support@arogyafirst.com
- **Phone:** [Hospital Support Number]
- **Live Chat:** 9 AM - 6 PM

---

## FAQs

**Q: Can multiple admins manage the hospital?**  
A: Yes, create multiple staff accounts with Admin role.

**Q: How do we add existing doctors?**  
A: Add doctor details, they receive email invitation to claim account.

**Q: Can we customize slot durations per doctor?**  
A: Yes, set slot duration when creating slots for each doctor.

**Q: How to handle emergency bookings?**  
A: Use manual booking feature to create immediate appointments.

**Q: Can we export patient data?**  
A: Phase 1 provides view-only analytics. Export features (CSV/PDF) planned for Phase 2/3. Individual patient data requires consent.

**Q: What if bed is marked occupied by mistake?**  
A: Edit bed status from Beds master list to mark Available.

---

_Thank you for partnering with ArogyaFirst!_
