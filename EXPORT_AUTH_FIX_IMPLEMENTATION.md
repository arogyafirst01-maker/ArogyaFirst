# Authentication Export Fix - Implementation Summary

## Overview

Fixed the export authentication inconsistency by creating a dedicated `useAuthBlobFetch` hook for blob responses and refactoring the export functionality to use it instead of raw fetch.

## Changes Made

### 1. Created New Hook: `useAuthBlobFetch.js`

**File:** `apps/web/src/hooks/useAuthBlobFetch.js`

**Purpose:** Mirrors `useAuthFetch` but handles blob responses instead of JSON, maintaining authentication consistency while supporting file downloads.

**Key Features:**

- ✅ Uses `authFetch` utility (same auth token management and refresh logic as `useAuthFetch`)
- ✅ Returns `response.blob()` instead of `response.json()`
- ✅ Handles loading and error states
- ✅ Preserves error message extraction from JSON/text error responses
- ✅ Maintains token refresh and 401 handling via `authFetch`

**Interface:**

```javascript
const { loading, error, fetchBlob } = useAuthBlobFetch();
const blob = await fetchBlob(url, options);
```

**Benefits:**

- Single authentication source (uses `authFetch` like all other API calls)
- Automatic token refresh handling
- Consistent error handling and state management
- No duplication of auth logic

### 2. Updated `MedicalHistoryPage.jsx`

#### Added Import

```javascript
import { useAuthBlobFetch } from '../hooks/useAuthBlobFetch';
```

#### Initialized Hook

```javascript
const { loading: blobLoading, error: blobError, fetchBlob } = useAuthBlobFetch();
```

#### Refactored `handleExport` Function

**Before (Lines 259-290):**

```javascript
const response = await fetch(`/api/patients/medical-history/export?${queryParams.toString()}`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`, // ❌ Direct token access
  },
});
if (!response.ok) throw new Error('Export failed');
const blob = await response.blob();
```

**After (Lines 241-295):**

```javascript
// Use authenticated blob fetch (handles auth headers, token refresh, errors)
const blob = await fetchBlob(`/api/patients/medical-history/export?${queryParams.toString()}`);
```

**Key Improvements:**

- ✅ Removes direct `localStorage.getItem('accessToken')` access
- ✅ Uses centralized auth token management via `authFetch`
- ✅ Automatic token refresh on 401 responses
- ✅ Consistent with other API calls (`loadMedicalHistory`, `loadFullMedicalHistory`)
- ✅ Better error handling and state management
- ✅ Maintains same query parameters (format, dates, type from activeTab)
- ✅ Download functionality unchanged

## Authentication Flow

### Old Flow (Before)

```
handleExport()
  └─→ fetch() with manual localStorage token
      └─→ No token refresh
      └─→ Duplication of auth logic
      └─→ Fragile to auth changes
```

### New Flow (After)

```
handleExport()
  └─→ useAuthBlobFetch.fetchBlob()
      └─→ authFetch() with automatic token management
          ├─→ getValidAccessToken() (with refresh if needed)
          ├─→ Automatic 401 retry with token refresh
          ├─→ Consistent error handling
          └─→ Maintains credentials
```

## Testing Checklist

- [x] Code compiles without errors (verified via `npm run build`)
- [x] Import statements are correct
- [x] Hook initialization follows codebase patterns
- [x] `fetchBlob` replaces raw fetch call
- [x] Query parameters unchanged (format, dates, type filter)
- [x] Download link creation unchanged
- [x] Error handling preserved

### Manual Testing Required:

- [ ] Export as CSV with all types
- [ ] Export as PDF with specific type (e.g., booking)
- [ ] Export without type filter
- [ ] Verify token refresh works during long export
- [ ] Verify error notification on export failure
- [ ] Verify success notification on export completion

## Benefits

### Security

✅ No direct `localStorage` access in component  
✅ Token managed centrally via `authFetch`  
✅ Automatic token refresh on expiry

### Maintainability

✅ Single authentication source  
✅ Easier to audit and update auth logic  
✅ Follows codebase patterns  
✅ No code duplication

### Consistency

✅ Matches other hooks (`useAuthFetch`)  
✅ Same error handling pattern  
✅ Same loading state management  
✅ Centralized token refresh logic

### Reliability

✅ Automatic token refresh on 401  
✅ Error messages extracted from responses  
✅ Consistent with broadcast system  
✅ Handles network errors gracefully

## Files Modified

| File                                        | Lines   | Change                    |
| ------------------------------------------- | ------- | ------------------------- |
| `apps/web/src/hooks/useAuthBlobFetch.js`    | 1-60    | **Created**               |
| `apps/web/src/pages/MedicalHistoryPage.jsx` | 48      | Import added              |
| `apps/web/src/pages/MedicalHistoryPage.jsx` | 72      | Hook initialization       |
| `apps/web/src/pages/MedicalHistoryPage.jsx` | 241-295 | `handleExport` refactored |

## Backward Compatibility

✅ **Fully Compatible**

- No API changes
- No URL parameter changes
- No response format changes
- Download behavior identical
- Error handling improved

## Future Improvements

### 1. Generic Blob Fetch Utility

If other parts of the app need blob downloads, consider adding `responseType` option to `useAuthFetch`:

```javascript
const { fetchData } = useAuthFetch();
const blob = await fetchData(url, { responseType: 'blob' });
```

### 2. Reusable Download Function

Create a utility function for common file download patterns:

```javascript
async function downloadFile(url, filename, fetchBlob) {
  const blob = await fetchBlob(url);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
```

## Implementation Notes

1. **Hook Naming:** `useAuthBlobFetch` clearly indicates blob response handling
2. **State Names:** Used `blobLoading` and `blobError` to avoid conflicts with other hooks
3. **Error Handling:** Catches error from `fetchBlob` and checks `blobError` state before showing duplicate notifications
4. **Consistency:** Follows same pattern as `useAuthFetch` for familiarity and maintainability

## Verification

✅ **Build Status:** Successful (no errors)
✅ **Import Paths:** Correct and verified
✅ **Hook Usage:** Matches established patterns
✅ **Error Handling:** Preserved from original implementation
✅ **Query Parameters:** Unchanged and functional

---

**Status:** ✅ READY FOR TESTING

**Implementation Date:** 2024-12-26

**Related:** Comment 6 from Code Review (Auth Pattern Consistency)
