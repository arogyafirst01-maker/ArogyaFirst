# ArogyaFirst - Pharmacy User Guide

## Phase 1 Scope Note

**Current Phase 1 Implementation:**

- Basic medicine inventory management
- Stock alerts (low stock, expiring medicines)
- Prescription fulfillment
- Invoice generation and billing
- Pharmacy linking to hospitals/doctors
- Manual stock updates

**Advanced Features (Phase 2/3):**

- Bulk medicine upload functionality
- Purchase order management and tracking
- Physical stock verification workflows
- Delivery tracking and management
- Automated reordering systems
- Integration with distributor systems

Features marked as "Phase 2/3" or found in the Future Roadmap section are planned for upcoming releases.

---

## Welcome

ArogyaFirst helps pharmacies manage medicine inventory, stock alerts, prescription fulfillment, pharmacy linking, invoicing, and billing efficiently.

---

## Getting Started

### Registration

1. Visit ArogyaFirst website
2. Click "Register" and select "Pharmacy"
3. Fill in required information:
   - Pharmacy Name
   - Email Address
   - Password (minimum 8 characters)
   - Phone Number
   - Location (City/State)
   - License Number (Drug License)
   - Registration Number
   - Pharmacy Type (Retail, Hospital, Online)
   - Operating Hours
   - Delivery Available (Yes/No)
4. Click "Register"
5. Your unique Pharmacy ID: `YourPhone@ArogyaFirst`
6. You'll be automatically logged in

### Login

1. Click "Login"
2. Enter email and password
3. Click "Sign In"
4. Redirected to dashboard

---

## Dashboard

Your dashboard shows:

- **Total Medicines** in inventory
- **Low Stock Alerts** count
- **Expiring Soon** count (within 30 days)
- **Pending Prescriptions** to fulfill
- **Today's Sales**
- **Monthly Revenue**
- Quick action buttons
- Activity feed

---

## Profile Management

### View Profile

1. Click pharmacy name in top-right corner
2. Select "Profile"
3. View:
   - Pharmacy Name, Email, Phone
   - Location, License Number
   - Pharmacy Type, Operating Hours
   - Delivery availability
   - Unique ID

### Edit Profile

1. Click "Edit Profile"
2. Update:
   - Name, Phone, Location
   - Operating Hours
   - Delivery settings
   - Additional services
3. Email and License Number cannot be changed
4. Click "Save Changes"

---

## Medicine Inventory Management

### Add Medicine to Inventory

1. Click "Inventory" in navigation
2. Click "Add Medicine"
3. Fill medicine information:
   - **Medicine Name** (e.g., "Paracetamol 500mg")
   - **Generic Name** (e.g., "Acetaminophen")
   - **Manufacturer**
   - **Medicine Type** (Tablet, Capsule, Syrup, Injection, etc.)
   - **Strength/Dosage** (e.g., "500mg")
   - **Form** (Strip, Bottle, Vial)
   - **Batch Number**
   - **Manufacturing Date**
   - **Expiry Date**
   - **Quantity in Stock** (number of strips/bottles)
   - **Units per Pack** (10 tablets per strip)
   - **Purchase Price** (per unit)
   - **Selling Price** (per unit)
   - **Minimum Stock Level** (for alerts)
   - **Storage Conditions** (if special)
   - **Prescription Required** (Yes/No)
4. Click "Add"

_Bulk medicine upload functionality is planned for Phase 2. See Future Roadmap section below._

### View Inventory

- Click "Inventory" > "All Medicines"
- View complete medicine list
- Search by name/generic name
- Filter by:
  - Medicine type
  - Manufacturer
  - Prescription required/not required
  - Stock status (In Stock, Low Stock, Out of Stock)

### Edit Medicine Details

1. Find medicine in inventory
2. Click "Edit"
3. Update details (price, quantity, etc.)
4. Click "Save"

### Delete Medicine

1. Select medicine
2. Click "Delete"
3. Confirm deletion (soft delete - keeps sales history)

---

## Stock Alerts

### Low Stock Alerts

1. Go to "Alerts" > "Low Stock"
2. View medicines below minimum stock level
3. Each shows:
   - Medicine name
   - Current stock
   - Minimum stock level
   - Suggested reorder quantity
4. Manually update stock as needed

### Expiring Soon Alerts

1. Go to "Alerts" > "Expiring Soon"
2. View medicines expiring within 30/60/90 days
3. Each shows:
   - Medicine name
   - Batch number
   - Expiry date
   - Days until expiry
   - Quantity
4. Actions:
   - Mark for discount sale
   - Return to distributor
   - Remove from stock

### Alert Notifications

- Email alerts sent weekly for low stock
- Daily email for medicines expiring in 7 days
- In-app notifications in real-time

---

## Prescription Queue

### View Prescription Queue

1. Click "Prescriptions" in navigation
2. View tabs:
   - **Pending** - New prescriptions to fulfill
   - **In Progress** - Being prepared
   - **Ready** - Ready for pickup/delivery
   - **Completed** - Fulfilled and delivered
   - **All** - All prescriptions

### Prescription Details

Click any prescription to view:

- Patient name and contact
- Doctor name and specialization
- Prescription date
- Medicines list with dosage
- Instructions
- Pre-booking status
- Payment status

### Pre-booked Prescriptions

When patient pre-books prescription:

1. Prescription appears in "Pending" tab
2. Badge shows "Pre-booked"
3. Patient expects medicines ready when they visit

---

## Prescription Fulfillment

### Fulfill Prescription

1. Open prescription from queue
2. Review medicines list
3. For each medicine:
   - Check inventory availability
   - If available, click "Add to Cart"
   - If unavailable, mark "Out of Stock"
4. For out-of-stock items:
   - Suggest alternatives (generic substitutes)
   - Contact patient for approval
5. Click "Generate Bill"
6. Status changes to "Ready"
7. Notify patient

### Partial Fulfillment

If some medicines unavailable:

1. Fulfill available medicines
2. Generate bill for available items
3. Mark prescription as "Partially Fulfilled"
4. Patient can collect available medicines
5. Send notification when remaining stock arrives

### Substitution

1. When medicine unavailable, click "Suggest Substitute"
2. System shows medicines with same generic name
3. Select substitute
4. Mark "Substitute - Requires Doctor/Patient Approval"
5. Contact patient/doctor for approval
6. Proceed after approval

---

## Pharmacy Linking

### What is Pharmacy Linking?

Doctors can link prescriptions to your pharmacy. When linked:

- Patient sees your pharmacy on prescription
- You receive pre-booking notification
- Helps you prepare medicines in advance

### Manage Linked Prescriptions

1. Go to "Linked Prescriptions"
2. View prescriptions linked to your pharmacy
3. Prepare medicines proactively
4. Patient visits to collect

### Link Your Pharmacy to Hospitals

1. Go to "Partnerships" > "Hospitals"
2. Click "Request Partnership"
3. Search and select hospital
4. Submit request
5. Hospital approves
6. Your pharmacy appears in hospital's pharmacy list
7. Hospital doctors can link prescriptions to you

---

## Invoice Generation

### Generate Invoice for Prescription

1. After fulfilling prescription, click "Generate Invoice"
2. Invoice auto-populated:
   - Pharmacy details (name, address, GSTIN)
   - Patient details
   - Prescription details
   - Medicine line items with quantities and prices
   - Subtotal
   - Taxes (GST)
   - Discounts (if any)
   - Total amount
3. Review invoice
4. Click "Generate and Print"
5. Invoice saved in billing records

### Walk-in Sale (Without Prescription)

1. Click "New Sale"
2. Select patient (or create new)
3. Search and add medicines to cart
4. For prescription-required medicines:
   - Verify physical prescription
   - Upload prescription image
5. Apply discounts if any
6. Click "Generate Invoice"
7. Process payment

### Invoice with Discounts

1. In invoice generation screen
2. Click "Apply Discount"
3. Choose discount type:
   - Percentage (e.g., 10%)
   - Fixed amount (e.g., ₹50)
   - Loyalty points
4. Enter discount value
5. Total recalculates automatically

---

## Billing & Payment

### Record Payment

1. After generating invoice, click "Record Payment"
2. Fill payment details:
   - Payment Mode (Cash, Card, UPI, Online)
   - Amount Received
   - Transaction ID (if digital payment)
   - Payment Date
3. If amount < total, mark as "Partial Payment"
4. Click "Save"
5. Status updates to PAID or PARTIALLY_PAID
6. Print receipt

### Payment Tracking

1. Go to "Billing" > "Payments"
2. View all transactions
3. Filter by:
   - Status (Paid, Pending, Partial)
   - Date range
   - Payment mode
4. Track outstanding payments

### Daily Sales Summary

1. At end of day, go to "Reports" > "Daily Summary"
2. View:
   - Total sales amount
   - Number of prescriptions fulfilled
   - Number of walk-in sales
   - Payment breakdown (cash, card, UPI)
   - Taxes collected
3. Download PDF for records

---

## Delivery Management

### Mark for Delivery

1. If pharmacy offers delivery and patient requests
2. Open prescription/invoice
3. Click "Mark for Delivery"
4. Fill delivery details:
   - Delivery Address
   - Patient Phone
   - Delivery Date/Time
   - Delivery Charge
5. Assign delivery person
6. Click "Save"

### Track Deliveries

1. Go to "Deliveries" in navigation
2. View tabs:
   - Pending - To be delivered
   - Out for Delivery - In transit
   - Delivered - Completed
3. Update delivery status as medicines move

### Delivery Confirmation

1. After delivery, open delivery
2. Click "Mark Delivered"
3. Fill:
   - Delivered Date/Time
   - Received By (patient name)
   - Signature (optional upload)
4. Click "Confirm"
5. Patient receives confirmation

---

## Analytics & Insights

### View Pharmacy Analytics

1. Click "Analytics" in navigation
2. View metrics:
   - **Total Revenue** (daily/monthly/yearly)
   - **Prescriptions Fulfilled** (count)
   - **Top-Selling Medicines** (by quantity and revenue)
   - **Inventory Turnover** (how fast stock moves)
   - **Average Sale Value**
   - **Payment Mode Distribution**
   - **Stock-out Rate** (how often unavailable)
   - **Customer Retention** (repeat customers)

### Generate Reports **(Phase 2/3)**

**This feature is not yet available in the current Phase 1 release.**

1. Click "Generate Report"
2. Select report type:
   - Sales Report
   - Inventory Report
   - Medicine-wise Sales
   - Doctor-wise Prescriptions
   - Tax Report (GSTR)
3. Set date range
4. Apply filters
5. Click "Generate"
6. Download PDF or CSV

**Note:** Current Phase 1 implementation provides view-only analytics. Export functionality planned for Phase 2/3.

---

## Stock Management

### Stock Adjustment

1. Go to "Inventory" > "Stock Adjustment"
2. Select medicine
3. Choose adjustment type:
   - **Add Stock** (new purchase)
   - **Remove Stock** (damage, expiry, theft)
   - **Adjust** (reconciliation after physical count)
4. Enter quantity
5. Enter reason
6. Click "Adjust"
7. Stock updated, history maintained

## Tips for Best Experience

1. **Regular Stock Updates** - Update inventory after every sale and purchase
2. **Set Accurate Minimum Levels** - Avoid stock-outs by setting realistic minimums
3. **Monitor Expiry Dates** - Weekly checks on expiring medicines
4. **Pre-booking Priority** - Prepare pre-booked prescriptions first
5. **Link with Hospitals** - More referrals from hospital doctors
6. **Accurate Invoicing** - Double-check GST and totals

---

## Troubleshooting

### Medicine Not Showing in Inventory

- Check if deleted (go to deleted items)
- Verify spelling
- Use generic name to search

### Low Stock Alert Not Working

- Check minimum stock level is set
- Verify email notifications enabled
- Check current stock vs minimum

### Invoice Not Generating

- Verify all medicine prices are set
- Check GST configuration
- Ensure patient details filled

### Prescription Fulfillment Blocked

- Check if prescription-required medicine sold without prescription
- Verify stock availability
- Check if patient consent approved (for digital prescriptions)

---

## Support

- **Email:** pharmacy-support@arogyafirst.com
- **Phone:** [Pharmacy Support Number]
- **Live Chat:** 9 AM - 6 PM

---

## Future Roadmap (Phase 2/3)

**Note:** The features described in this section are planned for Phase 2/3 and are not currently available in the Phase 1 release.

### Bulk Medicine Upload (Planned in Phase 2/3)

**This feature is not yet available in the current release.**

Automated bulk upload for rapid inventory setup:

1. Download CSV template
2. Fill with medicine details (name, generic, manufacturer, pricing, stock, batch, expiry)
3. Upload CSV file
4. System validates and imports medicines
5. Review and confirm additions

**Benefits:** Quickly populate inventory for new pharmacies, save time during restocking

### Purchase Order Management

Streamlined procurement workflow:

**Create Purchase Orders:**

- Select distributor/supplier from database
- Add medicines with quantities and expected delivery dates
- System calculates totals
- Send PO to supplier via email/integration

**Receive Stock:**

- Track pending POs
- Record received quantities
- Capture batch numbers and expiry dates
- Upload supplier invoices
- Automatic inventory updates

**PO Tracking:**

- Monitor order status (Pending, Partial, Completed)
- Track delivery timelines
- Supplier performance analytics

**Benefits:** Reduce manual work, prevent stock-outs, maintain supplier relationships, audit trail for purchases

### Physical Stock Verification

Periodic inventory reconciliation:

1. Initiate verification cycle
2. Count actual stock for each medicine
3. System compares counted vs recorded quantities
4. Highlight discrepancies with variance reports
5. Adjust stock with reason codes
6. Generate verification reports for compliance

**Benefits:** Identify shrinkage, maintain accurate inventory, meet regulatory requirements

### Delivery Tracking

End-to-end order fulfillment visibility:

**Features:**

- Assign deliveries to staff
- Real-time status updates (Pending, Out for Delivery, Delivered)
- SMS/email notifications to patients
- Delivery confirmation with signatures
- Route optimization for multiple deliveries

**Benefits:** Improve customer satisfaction, reduce delivery errors, optimize logistics

### Additional Planned Features

- **Automated Reordering:** Trigger purchase orders when stock reaches minimum levels
- **Distributor Integration:** Direct ordering through integrated systems
- **Advanced Analytics:** Sales forecasting, seasonal demand patterns
- **Subscription Management:** Recurring medication orders for chronic patients
- **Insurance Claims:** Direct billing integration with insurance providers

---

## FAQs

**Q: Can we sell medicines without prescription on platform?**  
A: Yes, for non-prescription medicines. Prescription-required medicines need uploaded prescription.

**Q: How to handle expired medicines?**  
A: Mark for removal, record in stock adjustment, follow disposal regulations.

**Q: Can patients order online for home delivery?**  
A: Not in Phase 1. Patients pre-book, then pharmacy arranges delivery offline.

**Q: How to manage multiple batches of same medicine?**  
A: Add each batch separately with unique batch number and expiry date.

**Q: Can we offer discounts on medicines?**  
A: Yes, apply discount during invoice generation. Set rules in settings.

**Q: What if patient wants partial prescription?**  
A: Fulfill available medicines, generate bill, mark as partial fulfillment.

**Q: How to handle returns?**  
A: Create return invoice, adjust stock, process refund. Maintain return policy.

**Q: Can we integrate with accounting software?**  
A: API available for integration. Contact support for integration guide.

---

_Thank you for partnering with ArogyaFirst to serve patients better!_
