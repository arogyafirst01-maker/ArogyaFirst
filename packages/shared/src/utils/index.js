/**
 * Validates a date string in YYYY-MM-DD format
 * @param {string} dateStr - The date string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function validateDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  // Check format using regex
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  // Check if it's a valid date
  const [year, month, day] = dateStr.split('-').map(n => parseInt(n, 10));
  const date = new Date(year, month - 1, day);

  // Verify that the date components match what we created
  // This checks for invalid dates like 2024-02-30
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

/**
 * Formats a date to YYYY-MM-DD string.
 * @param {Date|string} date - The date to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return d.toISOString().split('T')[0];
}

/**
 * Generates a patient ID from phone number.
 * @param {string} phone - The phone number.
 * @returns {string} The generated patient ID.
 */
export function generatePatientId(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Invalid phone number');
  }
  return `${phone}@ArogyaFirst`;
}

/**
 * Generates a hospital ID with a random component.
 * @returns {string} The generated hospital ID.
 */
export function generateHospitalId() {
  const randomId = Math.random().toString(36).slice(2, 11).toUpperCase();
  return `${randomId}@Hospital`;
}

/**
 * Generates a lab ID with a random component.
 * @returns {string} The generated lab ID.
 */
export function generateLabId() {
  const randomId = Math.random().toString(36).slice(2, 11).toUpperCase();
  return `${randomId}@Lab`;
}

/**
 * Generates a pharmacy ID with a random component.
 * @returns {string} The generated pharmacy ID.
 */
export function generatePharmacyId() {
  const randomId = Math.random().toString(36).slice(2, 11).toUpperCase();
  return `${randomId}@Pharmacy`;
}

/**
 * Generates a doctor ID with a random component.
 * @param {string} [hospitalId] - Optional hospital ID for affiliated doctors.
 * @returns {string} The generated doctor ID.
 */
export function generateDoctorId(hospitalId) {
  const randomId = Math.random().toString(36).slice(2, 11).toUpperCase();
  return hospitalId ? `${randomId}@${hospitalId}` : `${randomId}@Doctor`;
}

/**
 * Validates an email format.
 * @param {string} email - The email to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Normalizes an email to lowercase and trims whitespace.
 * @param {string} email - The email to normalize.
 * @returns {string} The normalized email.
 */
export function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

/**
 * Validates password strength.
 * @param {string} password - The password to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validatePassword(password) {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /\d/.test(password);
}

/**
 * Validates the last 4 digits of Aadhaar number.
 * @param {string} aadhaarLast4 - The last 4 digits.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateAadhaarLast4(aadhaarLast4) {
  return /^\d{4}$/.test(aadhaarLast4);
}

/**
 * Validates an Indian phone number (10 digits).
 * @param {string} phone - The phone number.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

/**
 * Formats a date for user-friendly display.
 * @param {Date|string} date - The date to format.
 * @returns {string} The formatted date string or "Invalid date" if invalid.
 */
export function formatDateForDisplay(date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return "Invalid date";
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (error) {
    return "Invalid date";
  }
}

/**
 * Converts a time string in HH:MM format to total minutes.
 * @param {string} time - The time string (e.g., "09:30").
 * @returns {number} The total minutes since midnight.
 */
export function timeToMinutes(time) {
  if (!time || typeof time !== 'string') {
    throw new Error('Invalid time format');
  }
  const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time format');
  }
  return hours * 60 + minutes;
}

/**
 * Converts total minutes since midnight to HH:MM format.
 * @param {number} minutes - The total minutes (e.g., 570 for 09:30).
 * @returns {string} The formatted time string (e.g., "09:30").
 */
export function minutesToTime(minutes) {
  if (typeof minutes !== 'number' || minutes < 0 || minutes >= 1440) {
    throw new Error('Invalid minutes value');
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats a time range for display in 12-hour format with AM/PM.
 * @param {string} startTime - The start time in HH:MM format.
 * @param {string} endTime - The end time in HH:MM format.
 * @returns {string} The formatted time range (e.g., "09:00 AM - 05:00 PM").
 */
export function formatTimeRange(startTime, endTime) {
  const formatTime12Hour = (time) => {
    const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

/**
 * Checks if a given time is within a specified time range.
 * @param {string} time - The time to check in HH:MM format.
 * @param {string} startTime - The start of the range in HH:MM format.
 * @param {string} endTime - The end of the range in HH:MM format.
 * @returns {boolean} True if the time is within the range (inclusive start, exclusive end).
 */
export function isTimeInRange(time, startTime, endTime) {
  const timeMins = timeToMinutes(time);
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  return timeMins >= startMins && timeMins < endMins;
}

/**
 * Adds a specified number of days to a given date.
 * @param {Date} date - The original date.
 * @param {number} days - The number of days to add (can be negative).
 * @returns {Date} The new date with days added.
 */
export function addDaysToDate(date, days) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }
  if (typeof days !== 'number') {
    throw new Error('Invalid days value');
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Checks if a given date is within a specified date range.
 * @param {Date} date - The date to check.
 * @param {Date} startDate - The start of the range.
 * @param {Date} endDate - The end of the range.
 * @returns {boolean} True if the date is within the range (inclusive).
 */
export function isDateInRange(date, startDate, endDate) {
  if (!(date instanceof Date) || !(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Invalid date arguments');
  }
  if (isNaN(date.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date values');
  }
  // Normalize to start of day for accurate comparison
  const normalizeToStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const normalizedDate = normalizeToStartOfDay(date);
  const normalizedStart = normalizeToStartOfDay(startDate);
  const normalizedEnd = normalizeToStartOfDay(endDate);
  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

/**
 * Generates a unique booking ID.
 * @returns {string} The generated booking ID in format BK-{timestamp}-{random}.
 */
export function generateBookingId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${timestamp}-${random}`;
}

/**
 * Generates a unique prescription ID.
 * @returns {string} The generated prescription ID in format RX-{timestamp}-{random}.
 */
export function generatePrescriptionId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RX-${timestamp}-${random}`;
}

/**
 * Generates a unique invoice ID.
 * @returns {string} The generated invoice ID in format INV-{timestamp}-{random4digits}.
 */
export function generateInvoiceId() {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
  return `INV-${timestamp}-${random}`;
}

/**
 * Generates a unique pharmacy link ID.
 * @returns {string} The generated link ID in format LINK-{timestamp}-{random}.
 */
export function generatePharmacyLinkId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LINK-${timestamp}-${random}`;
}

/**
 * Generates a unique referral ID.
 * @returns {string} The generated referral ID in format REF-{timestamp}-{random}.
 */
export function generateReferralId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REF-${timestamp}-${random}`;
}

/**
 * Validates medicine format (Name Dosage).
 * @param {string} medicine - The medicine string to validate (e.g., "Paracetamol 650mg").
 * @returns {boolean} True if valid format, false otherwise.
 */
export function validateMedicineFormat(medicine) {
  if (!medicine || typeof medicine !== 'string') {
    return false;
  }
  // Format: Name Dosage (e.g., "Paracetamol 650mg")
  const regex = /^[A-Za-z0-9\s]+\s+\d+(\.\d+)?(mg|ml|g|mcg|IU|%)$/i;
  return regex.test(medicine.trim());
}

/**
 * Parses medicine name from full string.
 * @param {string} medicine - The medicine string (e.g., "Paracetamol 650mg").
 * @returns {string} The medicine name (e.g., "Paracetamol").
 */
export function parseMedicineName(medicine) {
  if (!medicine || typeof medicine !== 'string') {
    return '';
  }
  const match = medicine.trim().match(/^([A-Za-z0-9\s]+)\s+\d+(\.\d+)?(mg|ml|g|mcg|IU|%)$/i);
  return match ? match[1].trim() : medicine.trim();
}

/**
 * Parses medicine dosage from full string.
 * @param {string} medicine - The medicine string (e.g., "Paracetamol 650mg").
 * @returns {string} The dosage (e.g., "650mg").
 */
export function parseMedicineDosage(medicine) {
  if (!medicine || typeof medicine !== 'string') {
    return '';
  }
  const match = medicine.trim().match(/\d+(\.\d+)?(mg|ml|g|mcg|IU|%)$/i);
  return match ? match[0] : '';
}

/**
 * Validates if a document type is valid.
 * @param {string} type - The document type to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateDocumentType(type) {
  const validTypes = ['PRESCRIPTION', 'LAB_REPORT', 'MEDICAL_RECORD', 'INSURANCE', 'ID_PROOF', 'OTHER'];
  return validTypes.includes(type);
}

/**
 * Validates if a consent status is valid.
 * @param {string} status - The consent status to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateConsentStatus(status) {
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'];
  return validStatuses.includes(status);
}

/**
 * Generates a unique document ID.
 * @returns {string} The generated document ID in format DOC-{timestamp}-{random}.
 */
export function generateDocumentId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DOC-${timestamp}-${random}`;
}

/**
 * Generates a unique consent ID.
 * @returns {string} The generated consent ID in format CONSENT-{timestamp}-{random}.
 */
export function generateConsentId() {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CONSENT-${timestamp}-${random}`;
}

/**
 * Checks if a consent has expired.
 * @param {Date|string} expiresAt - The expiry date to check.
 * @returns {boolean} True if expired, false otherwise.
 */
export function isConsentExpired(expiresAt) {
  if (!expiresAt) {
    return false;
  }
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  return expiryDate < now;
}

/**
 * Formats a date for timeline display with relative time support.
 * @param {Date|string} date - The date to format.
 * @returns {string} Formatted date string (e.g., "Today", "Yesterday", "2 days ago", "Jan 15, 2024").
 */
export function formatTimelineDate(date) {
  if (!date) return '';
  
  const targetDate = new Date(date);
  const now = new Date();
  
  // Reset time parts for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  
  const diffTime = today - target;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as "Jan 15, 2024"
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return targetDate.toLocaleDateString('en-US', options);
  }
}

/**
 * Groups an array of timeline items by date.
 * @param {Array} items - Array of items with a 'date' property.
 * @returns {Object} Object with date keys (YYYY-MM-DD) and arrays of items.
 */
export function groupTimelineByDate(items) {
  if (!Array.isArray(items)) {
    return {};
  }
  
  return items.reduce((groups, item) => {
    if (!item.date) return groups;
    
    const dateKey = formatDate(item.date); // Use existing formatDate for YYYY-MM-DD
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
    
    return groups;
  }, {});
}

/**
 * Returns the icon name for a medical history item type.
 * @param {string} type - The medical history type (booking, prescription, document).
 * @returns {string} Icon name for Tabler Icons.
 */
export function getMedicalHistoryIcon(type) {
  const iconMap = {
    booking: 'IconCalendarEvent',
    prescription: 'IconPill',
    document: 'IconFileText'
  };
  
  return iconMap[type] || 'IconFileText';
}

/**
 * Generates a unique consultation ID.
 * @returns {string} The generated consultation ID in format CONS-YYYYMMDD-XXXXX.
 */
export function generateConsultationId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = `${year}${month}${day}`;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CONS-${timestamp}-${random}`;
}
