# Multi-Location Hospital Chain Implementation

## Overview

This document summarizes the comprehensive implementation of multi-location support for hospital chains in the ArogyaFirst platform. This enables hospital chains to manage multiple branch locations with centralized control and location-specific operations.

## Architecture

### Parent-Child Relationship Model

- **Parent Hospital (Chain Head)**: A User document with `role: HOSPITAL` and `hospitalData.isChain: true`

  - Manages multiple branch locations
  - Has centralized dashboard showing aggregated data across all branches
  - Can create, update, and manage branch hospitals
  - Can aggregate doctors and staff across locations (shared resources)

- **Branch Hospital (Location)**: A separate User document with `role: HOSPITAL` and `hospitalData.parentHospitalId` pointing to parent
  - Independent location management
  - Can have own beds, pharmacies, and schedules
  - All bookings and slots tagged with locationId

## Database Schema Changes

### 1. User Model (`/apps/api/src/models/User.model.js`)

Added to `hospitalDataSchema`:

```javascript
{
  parentHospitalId: ObjectId,           // Reference to parent chain hospital
  isChain: Boolean (default: false),    // Marks this hospital as chain parent
  chainName: String,                    // Name of the chain
  branchCode: String (unique, sparse),  // Unique identifier (e.g., "NYC", "LA")
  branchLocations: [ObjectId]           // Array of branch hospital IDs
}
```

Added indexes:

- `{ 'hospitalData.parentHospitalId': 1, 'hospitalData.branchCode': 1 }` - Locate branches within chain
- `{ 'hospitalData.isChain': 1 }` - Find chain parents

Added virtual property:

- `isChainBranch` - Returns true if hospital is a branch (has parentHospitalId)

### 2. Slot Model (`/apps/api/src/models/Slot.model.js`)

Added field:

```javascript
{
  locationId: ObjectId,  // Reference to branch hospital location
}
```

Added indexes:

- `{ locationId: 1, date: 1, isActive: 1 }` - Location-specific slot queries
- Updated `{ providerId: 1, locationId: 1, date: 1, entityType: 1 }` - Multi-location provider queries

### 3. Booking Model (`/apps/api/src/models/Booking.model.js`)

Added field:

```javascript
{
  locationId: ObjectId,  // Reference to booking location
}
```

Extended `providerSnapshot` subdocument:

```javascript
{
  branchCode: String,         // Branch identifier if chain
  chainName: String,          // Chain name if applicable
  locationId: ObjectId,       // Location reference for audit trail
  isChainBranch: Boolean      // Flag indicating if provider is branch
}
```

Added indexes:

- `{ locationId: 1, bookingDate: 1, status: 1 }` - Location-specific booking queries
- Updated `{ providerId: 1, locationId: 1, bookingDate: 1, status: 1 }` - Provider location queries

## Validation & Constants

### Validation Schemas (`/apps/api/src/middleware/validation.middleware.js`)

```javascript
// Add location (create branch)
{
  name: String (2-100 chars),
  location: String (2-200 chars),
  branchCode: String (alphanumeric 2-20, uppercase),
  contactPhone: String (optional, 10 digits),
  contactEmail: String (optional, valid email)
}

// Update location
{
  name: String (2-100 chars, optional),
  location: String (2-200 chars, optional),
  contactPhone: String (optional),
  contactEmail: String (optional)
}
// Note: branchCode and parentHospitalId cannot be updated
```

### Constants (`/packages/shared/src/constants/index.js`)

```javascript
LOCATION_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
};

BRANCH_CODE_REGEX = /^[A-Z0-9]{2,20}$/;

MAX_LOCATIONS_PER_CHAIN = 100;
```

## API Implementation

### Hospital Routes (`/apps/api/src/routes/hospital.routes.js`)

#### Location Management Endpoints

```
POST   /api/hospitals/locations
       - Create branch hospital
       - Requires: HOSPITAL role, chain parent validation
       - Validates branch code uniqueness within chain
       - Creates User document with parentHospitalId
       - Adds to parent's branchLocations array
       - Uses transaction for atomicity

GET    /api/hospitals/locations
       - Retrieve all branches (for chain parent)
       - Returns branch details: name, location, branchCode, isActive
       - Requires: HOSPITAL role

PUT    /api/hospitals/locations/:locationId
       - Update branch details
       - Requires: Chain parent or branch itself
       - Allows: name, location, contactPhone, contactEmail
       - Blocks: branchCode, parentHospitalId, isChain updates

DELETE /api/hospitals/locations/:locationId
       - Soft-delete branch (set isActive: false)
       - Validates no active slots/bookings exist
       - Removes from parent's branchLocations array
       - Requires: Chain parent role
```

#### Updated Endpoints

```
GET    /api/hospitals/:id/dashboard
       - Added locationId query parameter
       - If locationId specified: returns metrics for that location
       - If locationId='all' and isChain: aggregates all branches
       - Returns: opdCount, bedOccupancy, monthlyRevenue, surgeriesCount

GET    /api/hospitals/:id/analytics
       - Added locationId query parameter
       - Supports location-specific analytics
       - Returns: dailyBookings, bookingsByType, bookingsByDepartment

GET    /api/hospitals/:id/export
       - Added locationId filtering
       - Exports location-specific data
```

### Slot Controller (`/apps/api/src/controllers/slot.controller.js`)

#### createSlot

- Extracts locationId from request body
- Chain detection logic:
  - If provider is branch: enforces locationId = self (req.user.\_id)
  - If provider is chain parent: requires locationId to be specified
  - If provider is standalone: allows optional locationId
- Passes locationId to overlap checks
- Includes locationId in slotPayload

#### getSlots

- Extracts locationId from query parameters
- Applies locationId filtering to query
- If requester is chain branch: overrides to show only own location's slots
- Ensures data isolation between branches

### Booking Controller (`/apps/api/src/controllers/booking.controller.js`)

#### createBooking

- Extracts locationId from slot document
- If provider is non-chain: derives from slot.providerId
- Includes locationId in booking document
- Passes to providerSnapshot builder

#### createManualBooking

- Extracts locationId from slot
- Manual bookings inherit location from slot
- Includes in booking document

#### getProviderBookings

- Added locationId query parameter support
- If locationId specified and valid: filters to that location
- If provider is chain branch: automatically filters to own location
- Maintains backward compatibility with existing code

#### rescheduleBooking

- Updates locationId when switching slots
- Inherits locationId from new slot
- Maintains location consistency

#### buildProviderSnapshot

- Extended with location details:
  - `branchCode`: Branch identifier if chain
  - `chainName`: Chain name if applicable
  - `locationId`: Location reference (if branch)
  - `isChainBranch`: Boolean flag for chain branches
- Used for audit trail and booking context

### Provider Controller (`/apps/api/src/controllers/provider.controller.js`)

#### searchProviders

- Added locationId query parameter support
- Filters Slot.find() to include locationId when specified
- Supports locationId='all' for all locations or specific locationId
- Returns providers with available slots in specified location

#### extractProviderInfo

- Extended returned object with:
  - `branchCode`: Branch code if hospital
  - `chainName`: Chain name if hospital
  - `isChainBranch`: Boolean indicating branch status
  - `locationId`: Location reference if branch
- Enables UI to display location context for bookings

#### getProviderDetails

- Automatically includes location details via extractProviderInfo
- Provides complete provider context including chain information

## Frontend Implementation

### HospitalProfilePage (`/apps/web/src/pages/HospitalProfilePage.jsx`)

#### New Location Management Tab

- **Visibility**: Only shown for chain hospitals (isChain: true)
- **Features**:
  - Displays table of all branch locations
  - Shows: Name, Location, Branch Code, Contact Phone, Status
  - Add Location button → opens modal with form
  - Edit button → pre-fills form for updates
  - Delete button → soft-deletes with confirmation

#### Location Management Modal

- Form fields:
  - Branch Name (required, 2-100 chars)
  - Location Address (required, 2-200 chars)
  - Branch Code (required, 2-20 alphanumeric, uppercase, read-only when editing)
  - Contact Phone (optional, 10 digits)
  - Contact Email (optional, valid email)

#### Functions

```javascript
loadLocations(); // Fetch branches from API
handleAddLocation(); // POST to /api/hospitals/locations
handleUpdateLocation(); // PUT to /api/hospitals/locations/:locationId
handleDeleteLocation(); // DELETE to /api/hospitals/locations/:locationId
openAddLocationModal(); // Open form for new location
openEditLocationModal(); // Pre-fill form with existing data
```

### HospitalDashboardPage (`/apps/web/src/pages/HospitalDashboardPage.jsx`)

#### Location Selector (Chain Hospitals Only)

- Dropdown showing:
  - "All Locations" option
  - Each branch with format: "Branch Name (CODE)"
- Positioned in header below dashboard title
- Disabled until locations load

#### Updated Data Fetching

- `fetchDashboard()`: Includes locationId in URL query
  - `?locationId=all` for aggregated view
  - `?locationId=<branchId>` for specific location
- `fetchAnalytics()`: Includes locationId parameter
- `loadLocations()`: Fetches available branches

#### Effects

- Dashboard refetches when selectedLocation changes
- Automatically loads location list on mount
- Uses loadingLocations state for spinner

### NewBookingPage (No Changes Required)

- Patients book appointments across all providers
- Provider search inherits location filtering via API
- locationId automatically captured from slot when booking
- Works seamlessly with chain structure

## Query Patterns

### Location-Specific Queries

```javascript
// Get all slots for a specific location
Slot.find({ locationId: branchId, providerId, isActive: true });

// Get all branches of a chain
User.find({ 'hospitalData.parentHospitalId': chainId });

// Get bookings for provider at specific location
Booking.find({ providerId, locationId });

// Get all slots (chain parent sees all branches)
// If provider.isChain, query includes all branchLocations
Slot.find({
  $or: [
    { providerId: chainId, locationId: { $in: branchLocations } },
    { locationId: { $in: branchLocations } },
  ],
});
```

## Access Control

### Chain Parent

- Can create, read, update, delete locations
- Can view aggregated dashboard across all locations
- Can select specific location for location-specific view
- Can manage shared resources (doctors, staff shared across locations)

### Branch Hospital

- Cannot create new locations
- Can only view own location data
- Requests automatically scoped to own location
- Cannot access other branches' data

### Standalone Hospital

- No location management features
- Single location implicit
- No locationId constraints

## Data Isolation

### Automatic Isolation for Branches

When a branch hospital makes requests:

- Slot queries automatically filtered to own location
- Booking queries automatically filtered to own location
- Dashboard data scoped to own location
- Analytics data reflects only own location

### Implemented In

- `slot.controller.js` getSlots()
- `booking.controller.js` getProviderBookings()
- Route middleware validation

## Backward Compatibility

All changes maintain backward compatibility:

- `locationId` fields default to `null`
- Queries function with or without locationId
- Existing single-location hospitals unaffected
- Optional parameters in all new APIs
- No breaking changes to existing endpoints

## Testing Scenarios

### Scenario 1: Create a Chain Hospital

1. Existing hospital marks `isChain: true` and sets `chainName`
2. Portal displays "Locations" tab
3. Can add first branch location

### Scenario 2: Add Branch Location

1. Chain hospital clicks "Add Location"
2. Enters: Name, Location, BranchCode, Phone, Email
3. System creates new User with parentHospitalId
4. Location appears in table and dashboard selector

### Scenario 3: View Location-Specific Dashboard

1. Chain hospital selects location from dropdown
2. Dashboard metrics reflect only that location
3. Analytics filter to location
4. Can export location-specific reports

### Scenario 4: Book at Branch Location

1. Patient searches for providers
2. Sees branch hospitals with available slots
3. Booking captures locationId from slot
4. Branch hospital sees booking in their location queue

### Scenario 5: Staff/Doctor Management

1. Doctors/staff assigned to specific locations (optional)
2. Chain can manage centrally or per-location
3. Slot creation filters to location-specific resources

## Files Modified

### Backend

- [User.model.js](apps/api/src/models/User.model.js) - Chain fields, indexes, validation
- [Slot.model.js](apps/api/src/models/Slot.model.js) - locationId field, indexes
- [Booking.model.js](apps/api/src/models/Booking.model.js) - locationId, providerSnapshot extension
- [validation.middleware.js](apps/api/src/middleware/validation.middleware.js) - Location schemas
- [hospital.controller.js](apps/api/src/controllers/hospital.controller.js) - Location CRUD, dashboard/analytics updates
- [slot.controller.js](apps/api/src/controllers/slot.controller.js) - createSlot, getSlots with locationId
- [booking.controller.js](apps/api/src/controllers/booking.controller.js) - createBooking, getProviderBookings, buildProviderSnapshot
- [provider.controller.js](apps/api/src/controllers/provider.controller.js) - searchProviders, extractProviderInfo
- [hospital.routes.js](apps/api/src/routes/hospital.routes.js) - 4 new location endpoints

### Frontend

- [HospitalProfilePage.jsx](apps/web/src/pages/HospitalProfilePage.jsx) - Location management UI
- [HospitalDashboardPage.jsx](apps/web/src/pages/HospitalDashboardPage.jsx) - Location selector, updated fetching

### Shared

- [constants/index.js](packages/shared/src/constants/index.js) - Location constants

## Build Status

✅ All builds successful

- Backend TypeScript compilation: ✓
- Frontend Vite build: ✓ (13.28s)
- No errors or breaking changes

## Future Enhancements

1. **Location-Based Billing**: Separate billing streams per location
2. **Inter-Location Transfers**: Move patients between branch hospitals
3. **Consolidated Reporting**: Advanced analytics across locations
4. **Location-Specific Policies**: Different operational policies per location
5. **Doctor Availability By Location**: Assign doctors to specific locations
6. **Inventory Management**: Track beds, medicines per location
7. **Staff Scheduling By Location**: Location-specific staff assignments

## Notes

- All locationId fields are optional (null) to maintain backward compatibility
- Soft-delete used for branches to preserve data integrity
- Transaction support for atomic branch creation
- Compound indexes optimized for typical query patterns
- Frontend changes minimal and non-breaking
- API changes maintain existing behavior when locationId not specified
