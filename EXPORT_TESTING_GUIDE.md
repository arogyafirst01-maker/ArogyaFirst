# Export Feature - Testing Guide

## Quick Test Checklist

### Functional Tests

- [ ] Export as CSV (all types)
- [ ] Export as PDF (all types)
- [ ] Export with type=booking
- [ ] Export with type=prescription
- [ ] Export with type=document
- [ ] Download starts automatically
- [ ] File name correct: `medical-history.csv` or `medical-history.pdf`

### Authentication Tests

- [ ] Export with valid token works
- [ ] Export with expired token (should auto-refresh)
- [ ] Export with invalid token (should show error)
- [ ] Long export (token refresh during export)

### Error Handling Tests

- [ ] Invalid date range (start > end) shows error
- [ ] Missing required dates shows error
- [ ] No data in date range shows error
- [ ] Network timeout shows error
- [ ] Error messages are clear and helpful

### State Management Tests

- [ ] Loading indicator shown during export
- [ ] Export button disabled while loading
- [ ] Success notification shown on completion
- [ ] Error notification shown on failure
- [ ] Date range cleared after successful export

### Integration Tests

- [ ] Export filters by selected tab (All, Bookings, Prescriptions, Documents)
- [ ] Export respects date range filter
- [ ] Multiple exports in succession work
- [ ] Export works after page refresh
- [ ] Export works after other API calls

## Browser DevTools Testing

### Network Tab

1. Open DevTools → Network tab
2. Start export
3. Check request:
   - ✅ URL: `/api/patients/medical-history/export?format=...&startDate=...&endDate=...&type=...`
   - ✅ Method: GET
   - ✅ Headers contain `Authorization: Bearer <token>`
   - ✅ Response Content-Type: `application/octet-stream` or `text/csv`
   - ✅ Status: 200 OK

### Console Tab

1. Open DevTools → Console
2. Export should complete with no errors
3. Check for:
   - ✅ No "Uncaught" errors
   - ✅ "Export error:" log only if error occurs
   - ✅ No auth-related console warnings

## Token Refresh Test

### Setup

1. Export with token near expiry (simulate by setting short expiry)
2. Or use browser DevTools to slow down network to 4G
3. Start export
4. Wait for response

### Expected

- ✅ First request fails with 401
- ✅ App refreshes token
- ✅ Request retried
- ✅ Export completes
- ✅ No error notification

## File Content Verification

### CSV Export

```bash
# Verify file exists and contains data
file medical-history.csv
head medical-history.csv

# Should show:
Date,Type,Details,Status
2024-12-20,Booking,Provider Name (Type),Status
2024-12-19,Prescription,Prescribed by Doctor,Status
```

### PDF Export

```bash
# Verify PDF file created
file medical-history.pdf

# Check with PDF reader
open medical-history.pdf  # macOS
```

## Performance Tests

### Metrics

- [ ] CSV export < 5 seconds
- [ ] PDF export < 10 seconds
- [ ] No browser freeze during export
- [ ] Memory usage stays reasonable

### Large Export

- [ ] 1000+ records export works
- [ ] Token refresh handled during long export
- [ ] Success notification shown

## Edge Cases

- [ ] Export with start date = end date (single day)
- [ ] Export with future date range (should return empty)
- [ ] Export with past date range (should work)
- [ ] Export with special characters in filename
- [ ] Export while offline (should show error)
- [ ] Export with multiple rapid clicks (should prevent duplicates)

## Regression Tests

### Ensure No Breakage

- [ ] Medical history page loads correctly
- [ ] Timeline displays correctly
- [ ] Pagination works
- [ ] Type filtering works
- [ ] Date filtering works
- [ ] Search functionality works
- [ ] Metrics display correctly
- [ ] Charts render correctly

## Manual Testing Procedure

### Step 1: Basic Export

```
1. Open Medical History page
2. Select date range (e.g., last 30 days)
3. Click "Export as CSV"
4. Verify download in browser
5. Open file and check content
```

### Step 2: Type Filtering

```
1. Click "Bookings" tab
2. Select date range
3. Click "Export as PDF"
4. Verify PDF contains only bookings
```

### Step 3: Error Handling

```
1. Select invalid date range (start > end)
2. Try to export
3. Verify error notification shown
```

### Step 4: Token Expiry

```
1. Logout in another tab
2. Try export in current tab
3. Verify redirect to login or error
```

## Expected Results

### Success Case

```
1. User selects date range
2. Clicks export button
3. See loading indicator
4. Download starts
5. Success notification: "Medical history exported as CSV"
6. Date range cleared
7. File has correct content
```

### Error Case

```
1. User selects invalid dates
2. Clicks export button
3. See loading indicator
4. Error notification: "End date must be equal to or after start date"
5. Date range NOT cleared (user can retry)
6. No file downloaded
```

## Common Issues and Solutions

### Issue: Export not starting

**Solution:**

- Check network tab for request
- Check browser console for errors
- Verify token is valid
- Check server logs

### Issue: Empty file downloaded

**Solution:**

- Check server is returning data
- Verify date range has records
- Check server logs

### Issue: Token error during export

**Solution:**

- Verify token refresh working
- Check auth utility logs
- Test token refresh flow separately

### Issue: File has wrong content

**Solution:**

- Verify type filter passed correctly
- Check server filtering logic
- Verify date filter applied

## Sign-Off Checklist

- [ ] All functional tests pass
- [ ] All auth tests pass
- [ ] All error handling tests pass
- [ ] All state management tests pass
- [ ] Network requests verified correct
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] Regression tests pass
- [ ] Ready for production

---

**Test Date:** ******\_\_\_******  
**Tester:** ******\_\_\_******  
**Result:** ✅ PASS / ❌ FAIL  
**Issues:** ******\_\_\_******  
**Sign-Off:** ******\_\_\_******
