# ArogyaFirst - Laboratory User Guide

## Phase 1 Scope Note

**Current Phase 1 Implementation:**

- Basic test bookings and management
- Manual report submission (individual reports)
- Invoice generation and billing
- Machine and facility inventory management
- Sample tracking and collection scheduling

**Advanced Features (Phase 2/3):**

- Bulk report upload functionality
- Quality control (QC) modules and tracking
- Automated report generation
- Integration with lab information systems (LIS)

Features marked as "Phase 2/3" or found in the Future Roadmap section are planned for upcoming releases.

---

## Welcome

ArogyaFirst enables laboratories to manage test bookings, machine inventory, sample collection, report submission, and billing seamlessly.

---

## Getting Started

### Registration

1. Visit ArogyaFirst website
2. Click "Register" and select "Lab"
3. Fill in required information:
   - Laboratory Name
   - Email Address
   - Password (minimum 8 characters)
   - Phone Number
   - Location (City/State)
   - License Number
   - Lab Type (Pathology, Radiology, Clinical, Diagnostic)
   - Specialization (Blood Tests, Imaging, Microbiology, etc.)
   - Accreditation (NABL, CAP, etc.)
   - Machines Available (list major equipment)
   - Operating Hours
4. Click "Register"
5. Your unique Lab ID: `YourPhone@ArogyaFirst`
6. You'll be automatically logged in

### Login

1. Click "Login"
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

---

## Dashboard

Your dashboard shows:

- **Today's Bookings** count
- **Pending Reports** to submit
- **Total Tests** completed (this month)
- **Revenue** (this month)
- **Machine Utilization** percentage
- **Upcoming bookings** list
- Quick action buttons

---

## Profile Management

### View Profile

1. Click lab name in top-right corner
2. Select "Profile"
3. View:
   - Lab Name, Email, Phone
   - Location, License Number
   - Lab Type, Specialization
   - Accreditation, Machines
   - Unique ID

### Edit Profile

1. Click "Edit Profile"
2. Update:
   - Name, Phone, Location
   - Lab Type, Specialization
   - Accreditation details
   - Operating hours
3. Email and License Number cannot be changed
4. Click "Save Changes"

---

## Machine & Facility Inventory

### Add Machine/Equipment

1. Click "Inventory" in navigation
2. Click "Add Machine"
3. Fill equipment information:
   - Equipment Name (e.g., "MRI Scanner", "Blood Analyzer")
   - Model Number
   - Manufacturer
   - Purchase Date
   - Maintenance Schedule
   - Capacity (tests per day)
   - Status (Operational, Under Maintenance, Out of Service)
4. Click "Add"

### Manage Machines

- View all equipment
- Filter by type/status
- Update machine status
- Schedule maintenance
- Track utilization

### Add Test to Catalog

1. Click "Tests" in navigation
2. Click "Add Test"
3. Fill test information:
   - Test Name (e.g., "Complete Blood Count", "Chest X-Ray")
   - Test Code
   - Category (Hematology, Radiology, etc.)
   - Required Machine
   - Sample Type (Blood, Urine, etc.)
   - Sample Volume
   - Preparation Instructions
   - Turnaround Time (hours)
   - Price
4. Click "Add"

### Manage Test Catalog

- View all tests offered
- Filter by category
- Edit test details
- Update prices
- Mark tests temporarily unavailable

---

## Slot Management

### Create Booking Slots

1. Click "Slots" in navigation
2. Click "Create Slots"
3. Select test type or category
4. Select date range
5. Set slot configuration:
   - Start Time
   - End Time
   - Slot Duration (15, 30, 45, 60 minutes)
   - Concurrent Bookings (how many tests per slot)
6. Set pricing (if not using test catalog price)
7. Click "Generate Slots"
8. Review generated slots
9. Click "Confirm"

### Bulk Slot Creation

1. Select "Bulk Create"
2. Set weekly schedule:
   - Days operational
   - Working hours per day
   - Break times
3. Set date range (next 30/60/90 days)
4. Define capacity per slot
5. Click "Generate"
6. Review and confirm

### Manage Slots

- View all slots by test/date
- Block slots (equipment maintenance)
- Unblock slots
- View booking status per slot

---

## Booking Management

### View Bookings

1. Click "Bookings" in navigation
2. View tabs:
   - **Today** - Today's appointments
   - **Upcoming** - Future bookings
   - **Pending Reports** - Tests done, reports pending
   - **Completed** - All done
   - **All** - All bookings

### Booking Details

Click any booking to view:

- Patient name and contact
- Test booked
- Booking ID
- Date and time
- Payment status
- Doctor referral (if any)
- Sample collection status
- Report submission status

### Manual Booking

1. Click "Create Booking"
2. Select scenario:
   - **Walk-in Patient** (create patient on spot)
   - **Registered Patient** (search by phone/email)
   - **Doctor Referral** (from referral list)
3. Fill patient details (if walk-in)
4. Select test from catalog
5. Choose slot or mark as immediate
6. Mark payment status
7. Click "Confirm"

---

## Sample Collection

### Mark Sample Collected

1. Open booking
2. Click "Mark Sample Collected"
3. Fill collection details:
   - Collection Date/Time (auto-filled to now)
   - Sample ID/Barcode
   - Collected By (staff name)
   - Sample Condition (Good, Hemolyzed, Clotted, etc.)
   - Storage Temperature (if applicable)
4. Click "Save"
5. Booking status updates to SAMPLE_COLLECTED

### Track Samples

- View all collected samples
- Filter by test type
- Search by Sample ID
- Identify pending tests

---

## Report Submission

### Upload Test Report

1. Go to booking details
2. Click "Upload Report"
3. Fill report form:
   - Test Results (enter values or attach report)
   - Reference Ranges
   - Abnormal Flags (if any)
   - Interpretation/Comments
   - Tested By (lab technician name)
   - Verified By (pathologist name)
   - Report Date
4. Attach report file (PDF, max 5MB)
5. Click "Preview" to review
6. Click "Submit Report"
7. Patient receives notification
8. Report available in patient's account

_Bulk report upload functionality is planned for Phase 2. See Future Roadmap section below._

### Manage Reports

- View all submitted reports
- Filter by test/date
- Resubmit corrected reports
- Download reports

---

## Invoice Generation

### Generate Invoice

1. After report submission, click "Generate Invoice"
2. Invoice auto-populated:
   - Lab details (name, address, GSTIN)
   - Patient details
   - Test details
   - Price breakdown
   - Taxes (GST)
   - Total amount
3. Review invoice
4. Click "Generate and Send"
5. Invoice sent to patient email
6. Saved in billing records

### Manual Invoice

1. Click "Billing" > "Create Invoice"
2. Select booking or create ad-hoc invoice
3. Add line items:
   - Test name
   - Quantity
   - Price
4. Add discounts (if any)
5. Calculate taxes
6. Click "Generate"

### View Invoices

- Go to "Billing" > "Invoices"
- View all invoices
- Filter by status (Paid, Pending, Overdue)
- Download invoice PDF
- Send reminder emails

---

## Payment Tracking

### Record Payment

1. Open booking/invoice
2. Click "Record Payment"
3. Fill payment details:
   - Payment Mode (Cash, Card, UPI, Online)
   - Amount Received
   - Transaction ID (if digital)
   - Payment Date
4. Click "Save"
5. Status changes to PAID

### Payment Reports

1. Go to "Billing" > "Payment Reports"
2. Select date range
3. View:
   - Total Revenue
   - Payments by mode
   - Outstanding payments
   - Refunds issued
4. Download report (CSV/PDF) **(Phase 2/3 - Not yet available)**

**Note:** Current Phase 1 implementation provides view-only payment summaries. Export functionality planned for Phase 2/3.

---

## Referrals

### Receive Referrals from Doctors

1. Go to "Referrals" > "Incoming"
2. View referrals from doctors
3. Each shows:
   - Patient details
   - Referring doctor
   - Tests requested
   - Clinical notes
4. Click "Accept" to create booking
5. Patient receives booking confirmation
6. Click "Decline" with reason (e.g., test not available)

### Send Results to Referring Doctor

1. After report submission
2. Check "Send to Referring Doctor"
3. Report automatically sent to doctor
4. Doctor can view in patient's medical history

---

## Analytics & Insights

### View Lab Analytics

1. Click "Analytics" in navigation
2. View metrics:
   - **Total Tests** conducted (daily/monthly/yearly)
   - **Revenue** breakdown by test type
   - **Machine Utilization** (percentage usage)
   - **Turnaround Time** (average TAT)
   - **Popular Tests** (most booked)
   - **Referral Sources** (doctors referring most)
   - **Patient Demographics**

### Generate Reports **(Phase 2/3)**

**This feature is not yet available in the current Phase 1 release.**

1. Click "Generate Report"
2. Select report type:
   - Test Volume Report
   - Revenue Report
   - Machine Utilization Report
   - Referral Analysis
3. Set date range
4. Apply filters
5. Click "Generate"
6. Download PDF or CSV

**Note:** Current Phase 1 implementation provides view-only analytics. Export functionality planned for Phase 2/3.

---

## Tips for Best Experience

1. **Keep Test Catalog Updated** - Add new tests as equipment upgrades
2. **Accurate Turnaround Times** - Set realistic TAT, update patients if delayed
3. **Bulk Slots** - Create slots months in advance for planning
4. **Prompt Report Submission** - Upload reports quickly for patient satisfaction
5. **Machine Maintenance** - Block slots during scheduled maintenance
6. **Doctor Relationships** - Accept referrals promptly to build trust

---

## Troubleshooting

### Slots Not Showing to Patients

- Check if slots are in future dates
- Verify slots not blocked
- Ensure pricing is set

### Report Upload Failed

- Check file size (max 5MB)
- Verify file type (PDF only)
- Check internet connection

### Invoice Not Generating

- Verify all booking details filled
- Check if report submitted
- Ensure tax configuration correct

### Payment Not Recorded

- Verify payment amount matches invoice
- Check transaction ID format
- Refresh page and retry

---

## Support

- **Email:** lab-support@arogyafirst.com
- **Phone:** [Lab Support Number]
- **Live Chat:** 9 AM - 6 PM

---

## Future Roadmap (Phase 2/3)

**Note:** The features described in this section are planned for Phase 2/3 and are not currently available in the Phase 1 release.

### Bulk Report Upload (Planned in Phase 2/3)

**This feature is not yet available in the current release.**

Automated bulk upload functionality for high-volume labs:

1. Download CSV template with booking IDs
2. Fill template with test results and report file paths
3. Upload CSV along with PDF reports
4. System automatically matches and uploads reports
5. Batch processing with error reporting

**Benefits:** Save time for labs processing 50+ reports daily, reduce manual entry errors

### Quality Control Module (Planned in Phase 2/3)

**This feature is not yet available in the current release.**

Comprehensive QC tracking and compliance:

**QC Recording:**

- Record QC results for each machine/test
- Track control levels (Low, Normal, High)
- Log expected vs observed values
- Automatic pass/fail status
- QC performer and date tracking

**QC Reporting:**

- View QC history and trends
- Identify failing QC patterns
- Track machine performance over time
- Generate compliance reports for accreditation
- Alert system for repeated QC failures

**Benefits:** Ensure result accuracy, maintain accreditation compliance, identify equipment issues early

### Additional Planned Features

- **Lab Information System (LIS) Integration:** Seamless data exchange with existing LIS
- **Test Panels:** Book multiple tests together as packages
- **Automated Result Import:** Import results directly from analyzers
- **Advanced Analytics:** Predictive maintenance, demand forecasting

---

## FAQs

**Q: Can we offer home sample collection?**  
A: Yes, mark booking as "Home Collection" and assign collection staff.

**Q: How to handle urgent/STAT tests?**  
A: Create immediate slot or use manual booking. Mark report priority.

**Q: Can we edit report after submission?**  
A: Yes, resubmit corrected report with version number. Patient notified.

**Q: What if machine breaks down?**  
A: Mark machine "Out of Service", block affected slots, notify patients to reschedule.

**Q: Can multiple tests be in one booking?**  
A: Currently one test per booking. Phase 2 will support test panels.

**Q: How to handle patient no-shows?**  
A: Mark booking as NO_SHOW. No refund for no-shows per policy.

**Q: Can we integrate with LIMS?**  
A: API integration available. Contact support for integration guide.

**Q: How to manage discounts/packages?**  
A: Apply discount when generating invoice. Package feature coming soon.

---

_Thank you for partnering with ArogyaFirst to deliver quality diagnostics!_
