# ArogyaFirst - Security Audit Checklist

## Introduction

This document provides a comprehensive security audit checklist for the ArogyaFirst platform. Use this before production deployment to ensure all security measures are in place.

**Priority Levels:**

- 🔴 **Critical:** Must be fixed before production
- 🟠 **High:** Should be fixed before production
- 🟡 **Medium:** Should be addressed soon after launch
- 🟢 **Low:** Nice to have, can be addressed in future updates

---

## Authentication & Authorization

### JWT Secret Management

- [ ] 🔴 **JWT_SECRET is at least 32 characters long** (Recommendation: 64 characters)
  - **Verification:** Check `.env` file
  - **Current:** Check `apps/api/.env.example` for guidance
  - **Remediation:** Generate using `crypto.randomBytes(32).toString('hex')`
- [ ] 🔴 **JWT_REFRESH_SECRET is different from JWT_SECRET**

  - **Verification:** Compare both secrets in `.env`
  - **Remediation:** Generate separate secret for refresh tokens

- [ ] 🔴 **Secrets are not hardcoded in source code**

  - **Verification:** Search codebase for hardcoded secrets
  - **Remediation:** Use environment variables only

- [ ] 🟠 **Secret rotation policy in place**
  - **Recommendation:** Rotate secrets quarterly
  - **Remediation:** Document rotation procedure and schedule

### Token Expiry

- [ ] 🟠 **Access token expiry set to 15 minutes or less**

  - **Verification:** Check `JWT_EXPIRES_IN` in `.env`
  - **Current:** Should be `15m`
  - **Remediation:** Short-lived access tokens reduce attack surface

- [ ] 🟠 **Refresh token expiry set to 7 days or less**
  - **Verification:** Check `JWT_REFRESH_EXPIRES_IN` in `.env`
  - **Current:** Should be `7d`
  - **Remediation:** Balance security with user experience

### Refresh Token Security

- [ ] 🔴 **Refresh token rotation implemented**

  - **Verification:** Test login flow - new refresh token should be issued on each refresh
  - **Location:** Check `auth.controller.js` refresh endpoint
  - **Remediation:** Invalidate old refresh token when issuing new one

- [ ] 🔴 **Refresh token reuse detection**

  - **Verification:** Try to use same refresh token twice
  - **Expected:** Second attempt should fail
  - **Remediation:** Track used refresh tokens, invalidate all tokens for user if reuse detected

- [ ] 🔴 **Refresh tokens stored as HttpOnly cookies**

  - **Verification:** Check browser DevTools > Application > Cookies
  - **Expected:** HttpOnly flag should be true
  - **Location:** Check `auth.controller.js` cookie options

- [ ] 🔴 **Refresh tokens have Secure flag in production**

  - **Verification:** Check cookie options, Secure should be true when NODE_ENV=production
  - **Expected:** HTTPS-only transmission
  - **Remediation:** Set `secure: process.env.NODE_ENV === 'production'`

- [ ] 🔴 **Refresh tokens have SameSite=Strict**
  - **Verification:** Check cookie SameSite attribute
  - **Expected:** Prevents CSRF attacks
  - **Remediation:** Set `sameSite: 'strict'` in cookie options

### Password Security

- [ ] 🔴 **Passwords hashed with bcrypt**

  - **Verification:** Check database - passwords should be hashed strings starting with `$2a$` or `$2b$`
  - **Location:** Check `User.model.js` pre-save hook
  - **Remediation:** Never store plaintext passwords

- [ ] 🔴 **Bcrypt salt rounds >= 10**
  - **Verification:** Check `bcrypt.hash()` calls
  - **Current:** Should be 10 or higher
  - **Remediation:** Higher rounds = more secure but slower (10 is good balance)

### Login Security

- [ ] 🟠 **Login rate limiting implemented**

  - **Verification:** Try multiple login attempts rapidly
  - **Expected:** Should be blocked after X attempts
  - **Remediation:** Use `express-rate-limit` middleware

  ```javascript
  import rateLimit from 'express-rate-limit';

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later',
  });

  router.post('/login', loginLimiter, authController.login);
  ```

- [ ] 🟡 **Account lockout after failed attempts**
  - **Verification:** Try 5+ failed logins
  - **Expected:** Account temporarily locked
  - **Remediation:** Track failed attempts in User model, lock account after threshold

### Role-Based Access Control (RBAC)

- [ ] 🔴 **RBAC middleware on all protected routes**

  - **Verification:** Review `routes/*.js` files
  - **Expected:** All routes have `authenticate` and role checks
  - **Location:** Check middleware usage in route definitions

- [ ] 🔴 **Ownership validation for resource access**

  - **Verification:** Try to access another user's data (e.g., patient A accessing patient B's bookings)
  - **Expected:** 403 Forbidden
  - **Location:** Check controller functions for ownership checks

- [ ] 🔴 **Admin role cannot be created via API**

  - **Verification:** Try to register with role "ADMIN"
  - **Expected:** Should fail or default to another role
  - **Remediation:** Admin users must be created manually in database

- [ ] 🟠 **Role-specific permissions clearly defined**
  - **Documentation:** Roles and permissions documented
  - **Location:** Check `packages/shared/src/constants/index.js` for roles
  - **Remediation:** Document what each role can/cannot do

---

## Payment Security

### Razorpay Integration

- [ ] 🔴 **Webhook signature verification implemented**
  - **Verification:** Check `payment.controller.js` webhook handler
  - **Expected:** Signature verified before processing
  - **Location:** Look for `crypto.createHmac()` signature verification
- [ ] 🔴 **Raw body preserved for webhook validation**

  - **Verification:** Check middleware order in `server.js`
  - **Expected:** `rawBody.middleware.js` before `express.json()`
  - **Remediation:** Webhook signatures require raw body, not parsed JSON

- [ ] 🟠 **Idempotency key used for payment operations**

  - **Verification:** Check payment creation calls
  - **Expected:** Unique idempotency key per payment
  - **Remediation:** Prevents duplicate charges on retry

- [ ] 🔴 **Payment amount validated server-side**

  - **Verification:** Payment amount calculated on backend, not from client
  - **Location:** Check `booking.controller.js` and `payment.controller.js`
  - **Remediation:** Never trust client-side amount calculations

- [ ] 🔴 **Refund authorization checks**

  - **Verification:** Only authorized users can initiate refunds
  - **Expected:** Booking owner or admin only
  - **Location:** Check `payment.controller.js` refund endpoint

- [ ] 🟠 **Payment status tracking and audit trail**
  - **Verification:** All payment state changes logged
  - **Expected:** Created, pending, success, failed, refunded all tracked
  - **Location:** Check `Payment.model.js` status field and history

### PCI Compliance

- [ ] 🔴 **No card data stored in database**

  - **Verification:** Check Payment model schema
  - **Expected:** Only Razorpay order/payment IDs stored
  - **Remediation:** Never store card numbers, CVV, or expiry dates

- [ ] 🔴 **Razorpay-hosted checkout page used**

  - **Verification:** Payment form loaded from Razorpay
  - **Expected:** Razorpay handles all sensitive data
  - **Location:** Check frontend payment implementation

- [ ] 🔴 **Test and production keys separated**
  - **Verification:** Different keys for development and production
  - **Expected:** `rzp_test_*` in dev, `rzp_live_*` in prod
  - **Remediation:** Never use production keys in development

### Webhook Security

- [ ] 🔴 **Webhook endpoint requires signature verification**

  - **Verification:** Try sending unsigned webhook
  - **Expected:** Rejected with error
  - **Location:** Check `payment.controller.js` webhook handler

- [ ] 🟠 **Webhook events processed idempotently**
  - **Verification:** Send same webhook twice
  - **Expected:** Second processing has no effect
  - **Remediation:** Check payment status before updating

---

## File Upload Security

### Validation

- [ ] 🔴 **File type validation (magic number checking)**
  - **Verification:** Try uploading file with fake extension (e.g., .exe renamed to .pdf)
  - **Expected:** Rejected based on actual file type, not extension
  - **Remediation:** Use file-type detection libraries
- [ ] 🔴 **File size limit enforced (5MB)**

  - **Verification:** Try uploading 6MB file
  - **Expected:** Rejected with "File too large" error
  - **Location:** Check multer configuration

- [ ] 🔴 **Multer memory storage used (no disk writes)**
  - **Verification:** Check multer configuration
  - **Expected:** `memoryStorage()` not `diskStorage()`
  - **Remediation:** Files uploaded directly to Cloudinary, never written to server disk

### Cloudinary Security

- [ ] 🔴 **Cloudinary upload with folder isolation**

  - **Verification:** Check uploaded files in Cloudinary dashboard
  - **Expected:** Files organized in folders (arogyafirst/documents, etc.)
  - **Location:** Check upload options in document/file controllers

- [ ] 🔴 **File access control (consent-based for documents)**

  - **Verification:** Try to access patient document without consent
  - **Expected:** 403 Forbidden
  - **Location:** Check document.controller.js access checks

- [ ] 🟡 **Malware scanning consideration**
  - **Future Enhancement:** Integrate antivirus scanning for uploaded files
  - **Recommendation:** Use ClamAV or third-party service
  - **Priority:** Low for Phase 1, consider for Phase 2

### File Naming

- [ ] 🟠 **Filename sanitization**

  - **Verification:** Try uploading file with special characters in name
  - **Expected:** Sanitized to safe characters
  - **Remediation:** Remove/replace dangerous characters

- [ ] 🟠 **MIME type validation**
  - **Verification:** Check accepted MIME types
  - **Expected:** Only `application/pdf`, `image/jpeg`, `image/png`
  - **Location:** Check file upload validators

---

## API Security

### CORS Configuration

- [ ] 🔴 **CORS whitelist configured (no wildcards in production)**
  - **Verification:** Check `server.js` CORS configuration
  - **Expected:** Specific origins whitelisted, not `*`
  - **Remediation:**
  ```javascript
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'];
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  ```

### Security Headers

- [ ] 🔴 **Helmet.js security headers enabled**
  - **Verification:** Check response headers in DevTools Network tab
  - **Expected:** X-Frame-Options, X-Content-Type-Options, etc.
  - **Location:** Check `server.js` for `helmet()` middleware

### Rate Limiting

- [ ] 🟠 **Rate limiting implemented**

  - **Verification:** Make rapid API requests
  - **Expected:** Blocked after threshold
  - **Recommendation:** Use `express-rate-limit`

  ```javascript
  import rateLimit from 'express-rate-limit';

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
  });

  app.use('/api/', apiLimiter);
  ```

### Input Validation

- [ ] 🔴 **Input validation on all endpoints**

  - **Verification:** Review controller functions
  - **Expected:** Joi schemas or manual validation for all inputs
  - **Location:** Check controllers for validation logic

- [ ] 🔴 **SQL/NoSQL injection prevention**

  - **Verification:** Mongoose parameterized queries used throughout
  - **Expected:** No string concatenation for queries
  - **Remediation:** Always use Mongoose query builders

- [ ] 🔴 **XSS prevention (input sanitization)**

  - **Verification:** Try submitting `<script>alert('XSS')</script>` in forms
  - **Expected:** Sanitized or escaped
  - **Remediation:** Use libraries like `xss` or `DOMPurify`

- [ ] 🟠 **CSRF protection readiness**
  - **Current:** SameSite cookies provide protection
  - **Future:** Consider CSRF tokens for non-cookie auth
  - **Remediation:** Already protected by SameSite=Strict cookies

### Error Handling

- [ ] 🔴 **Error messages sanitized (no stack traces in production)**
  - **Verification:** Trigger error, check response
  - **Expected:** Generic error message in production, detailed in development
  - **Location:** Check error handling middleware in `server.js`
  - **Remediation:**
  ```javascript
  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });
  ```

---

## Database Security

### Connection Security

- [ ] 🔴 **MongoDB connection string secure (no hardcoded credentials)**

  - **Verification:** Check `database.js` config
  - **Expected:** Reads from `MONGODB_URI` environment variable
  - **Remediation:** Never commit connection strings to version control

- [ ] 🔴 **Database user with least privilege**
  - **Verification:** Check MongoDB Atlas user permissions
  - **Expected:** Read/write only, not admin
  - **Remediation:** Create dedicated user for application, not using root/admin

### Connection Configuration

- [ ] 🟠 **Connection pooling configured**

  - **Verification:** Check Mongoose connection options
  - **Expected:** Appropriate pool size for load
  - **Remediation:** Configure `maxPoolSize` option

- [ ] 🟠 **Index optimization for query performance**
  - **Verification:** Check models for indexes
  - **Expected:** Indexes on frequently queried fields (email, phone, userId, etc.)
  - **Location:** Check model schemas for `.index()` calls

### Backup & Recovery

- [ ] 🔴 **Backup strategy in place (automated daily backups)**

  - **Verification:** Check MongoDB Atlas backup settings
  - **Expected:** Automated backups enabled
  - **Remediation:** Enable continuous backup in MongoDB Atlas

- [ ] 🟠 **Data encryption at rest**
  - **Verification:** Check MongoDB Atlas encryption settings
  - **Expected:** Encryption enabled (default in Atlas)
  - **Remediation:** MongoDB Atlas encrypts by default

### Audit Logging

- [ ] 🟡 **Audit logging for sensitive operations**
  - **Verification:** Check if verification, payments logged
  - **Expected:** Admin actions, payment changes logged with timestamps
  - **Remediation:** Add logging middleware for sensitive endpoints

---

## Environment & Configuration

### Environment Variables

- [ ] 🔴 **.env file excluded from version control**

  - **Verification:** Check `.gitignore` includes `.env`
  - **Expected:** `.env` listed in `.gitignore`
  - **Remediation:** Add if missing, remove any committed `.env` files from history

- [ ] 🟠 **Separate .env files for dev/staging/production**

  - **Verification:** Different configurations per environment
  - **Expected:** `.env.development`, `.env.production`
  - **Remediation:** Document environment-specific configurations

- [ ] 🟠 **Environment variable validation on startup**
  - **Verification:** Start server without required env vars
  - **Expected:** Server fails to start with clear error
  - **Remediation:** Add startup validation in `server.js`
  ```javascript
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
  ```

### Third-Party API Keys

- [ ] 🔴 **Cloudinary API keys secure**

  - **Verification:** Not exposed in client-side code
  - **Expected:** Only used on backend
  - **Remediation:** Cloudinary credentials server-side only

- [ ] 🔴 **Razorpay keys secure**

  - **Verification:** Secret key not in client code
  - **Expected:** Only Key ID in frontend (VITE_RAZORPAY_KEY_ID), secret on backend
  - **Remediation:** Secret keys backend only

- [ ] 🔴 **Agora keys secure**
  - **Verification:** App Certificate not exposed
  - **Expected:** App ID in frontend (public), Certificate on backend (secret)
  - **Remediation:** Certificate used for token generation on backend only

### Client-Side Security

- [ ] 🔴 **No secrets in client-side code**
  - **Verification:** Check frontend .env files
  - **Expected:** Only public keys with VITE\_ prefix
  - **Remediation:** Never expose API secrets, database credentials, JWT secrets in frontend

---

## Session Management

### Token Storage

- [ ] 🔴 **Access tokens stored in memory (not localStorage)**

  - **Verification:** Check frontend auth implementation
  - **Expected:** In-memory storage, not persisted
  - **Remediation:** Use React state/context, not localStorage for access tokens

- [ ] 🔴 **Refresh tokens in HttpOnly cookies only**
  - **Verification:** Cannot access refresh token via JavaScript
  - **Expected:** `document.cookie` doesn't show refresh token
  - **Remediation:** Set HttpOnly flag on cookie

### Logout

- [ ] 🟠 **Cross-tab logout synchronization**

  - **Verification:** Logout in one tab, check other tabs
  - **Expected:** All tabs logged out
  - **Remediation:** Use BroadcastChannel API

  ```javascript
  const logoutChannel = new BroadcastChannel('logout');
  logoutChannel.addEventListener('message', () => {
    // Logout current tab
  });

  // On logout:
  logoutChannel.postMessage('logout');
  ```

- [ ] 🟠 **Session timeout handling**

  - **Verification:** Leave application idle for 15+ minutes
  - **Expected:** Access token expires, auto-refresh or prompt to re-login
  - **Remediation:** Implement activity tracking and token refresh

- [ ] 🔴 **Logout endpoint clears refresh tokens**

  - **Verification:** After logout, old refresh token shouldn't work
  - **Expected:** Refresh token invalidated
  - **Location:** Check `auth.controller.js` logout function

- [ ] 🟠 **Logout all devices functionality**
  - **Verification:** Test logout-all endpoint
  - **Expected:** All refresh tokens for user invalidated
  - **Location:** Check `auth.controller.js` logoutAll function

---

## Data Privacy & Compliance

### Consent Management

- [ ] 🔴 **Consent-based document access enforced**

  - **Verification:** Try to access documents without consent
  - **Expected:** 403 Forbidden
  - **Location:** Check document controllers for consent validation

- [ ] 🟡 **Patient data access logging**
  - **Verification:** Log who accessed what and when
  - **Expected:** Audit trail for patient data access
  - **Remediation:** Add logging middleware for document/medical history access

### GDPR Considerations

- [ ] 🟡 **Right to data deletion**

  - **Future Enhancement:** Allow users to request account/data deletion
  - **Remediation:** Implement account deletion endpoint with data anonymization

- [ ] 🟡 **Data retention policies**
  - **Documentation:** Define how long data is kept
  - **Recommendation:** Document retention periods for bookings, payments, etc.

### Audit Trail

- [ ] 🟠 **Audit trail for sensitive operations**

  - **Verification:** Verification actions, payment changes logged
  - **Expected:** Who did what, when, with what result
  - **Location:** Check admin controllers and payment controllers

- [ ] 🟡 **Anonymization for analytics (future)**
  - **Phase 2/3:** Remove PII from analytics data
  - **Recommendation:** Aggregate data, remove identifying information

---

## Infrastructure Security

### HTTPS

- [ ] 🔴 **HTTPS enforced in production**

  - **Verification:** HTTP requests redirect to HTTPS
  - **Expected:** All traffic encrypted
  - **Remediation:** Configure SSL/TLS certificates, redirect HTTP to HTTPS

- [ ] 🟠 **SSL/TLS certificate management**
  - **Verification:** Valid certificate from trusted CA
  - **Recommendation:** Use Let's Encrypt for free certificates
  - **Remediation:** Set up auto-renewal

### Server Hardening

- [ ] 🟠 **Firewall configured**

  - **Verification:** Only necessary ports open (80, 443, 22)
  - **Remediation:** Use UFW or cloud provider firewall rules

- [ ] 🟠 **SSH key-only access (no password authentication)**
  - **Verification:** SSH password login disabled
  - **Remediation:** Edit `/etc/ssh/sshd_config`, set `PasswordAuthentication no`

### Dependency Management

- [ ] 🔴 **Regular dependency vulnerability scanning**

  - **Verification:** Run `pnpm audit`
  - **Expected:** No high/critical vulnerabilities
  - **Remediation:** Update vulnerable packages regularly

- [ ] 🟠 **Automated dependency updates**
  - **Recommendation:** Use Dependabot or Renovate
  - **Remediation:** Configure automated PR creation for updates

### Monitoring

- [ ] 🟠 **Error tracking configured (Sentry, LogRocket)**

  - **Verification:** Errors logged and tracked
  - **Expected:** Real-time error notifications
  - **Remediation:** Integrate error tracking service

- [ ] 🟠 **Uptime monitoring (UptimeRobot, Pingdom)**
  - **Verification:** Alerts on downtime
  - **Expected:** 99.9% uptime target
  - **Remediation:** Configure uptime monitoring service

---

## Testing & Validation

### Penetration Testing

- [ ] 🟡 **Penetration testing checklist**
  - **Testing Areas:**
    - Authentication bypass attempts
    - SQL/NoSQL injection
    - XSS attacks
    - CSRF attacks
    - File upload vulnerabilities
    - API abuse
  - **Recommendation:** Hire security professionals for comprehensive audit

### Security Regression Tests

- [ ] 🟡 **Automated security tests**
  - **Future Enhancement:** Add security-focused tests to CI/CD
  - **Recommendation:** Test auth flows, RBAC, payment security automatically

### Dependency Audits

- [ ] 🔴 **Dependency audit before deployment**
  - **Command:** `pnpm audit --audit-level=moderate`
  - **Expected:** No moderate/high/critical vulnerabilities
  - **Remediation:** Update or replace vulnerable packages

### Code Review

- [ ] 🟠 **Security code review**
  - **Verification:** Peer review for security issues
  - **Focus Areas:** Auth, payments, file uploads, database queries
  - **Remediation:** Document security review checklist

### Static Analysis

- [ ] 🟡 **ESLint security plugins**

  - **Recommendation:** Add `eslint-plugin-security`
  - **Remediation:**

  ```bash
  pnpm add -D eslint-plugin-security
  ```

  Add to `eslint.config.js`:

  ```javascript
  import security from 'eslint-plugin-security';

  export default [
    security.configs.recommended,
    // ... other configs
  ];
  ```

---

## Security Audit Summary

### Critical Issues (Must Fix Before Production)

1. JWT secrets (length, randomness, separation)
2. Refresh token rotation and reuse detection
3. Cookie security (HttpOnly, Secure, SameSite)
4. Password hashing with bcrypt
5. RBAC middleware on all routes
6. Admin role creation (manual only)
7. Webhook signature verification
8. Payment amount validation (server-side)
9. No card data storage
10. File type validation
11. CORS whitelist (no wildcards)
12. Helmet security headers
13. No stack traces in production
14. Database connection security
15. .env excluded from git
16. HTTPS enforcement in production
17. Dependency vulnerability audit

### High Priority (Should Fix Before Production)

1. Access/refresh token expiry times
2. Login rate limiting
3. Idempotency for payments
4. Razorpay key separation (test/prod)
5. File size limits
6. Cloudinary folder isolation
7. Rate limiting (general API)
8. Filename sanitization
9. Database user least privilege
10. Separate .env per environment
11. Cross-tab logout
12. Audit trail for sensitive ops
13. Server hardening (firewall, SSH)
14. Error tracking
15. Uptime monitoring

### Medium Priority (Address Soon After Launch)

1. Account lockout on failed logins
2. Environment variable validation
3. Connection pooling
4. Index optimization
5. Secret rotation policy
6. Webhook idempotency
7. MIME type validation
8. CSRF token consideration (future)
9. Data retention policies
10. Anonymization for analytics

### Low Priority (Future Enhancements)

1. Malware scanning for uploads
2. Patient data access logging
3. Right to data deletion (GDPR)
4. Penetration testing
5. Automated security tests
6. ESLint security plugins

---

## Remediation Timeline

**Week 1 (Pre-Production):**

- Fix all Critical issues
- Implement High priority items

**Week 2-4 (Post-Launch):**

- Address Medium priority items
- Set up monitoring and logging

**Month 2-3:**

- Implement Low priority enhancements
- Schedule regular security audits

---

## Sign-off Checklist

Before production deployment:

- [ ] All Critical issues resolved
- [ ] 90% of High priority issues resolved
- [ ] Security code review completed
- [ ] Dependency audit passed
- [ ] Penetration testing considered/scheduled
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] Security team sign-off obtained

---

_For deployment instructions, see `docs/DEPLOYMENT.md`_  
_For testing checklist, see `docs/TESTING_CHECKLIST.md`_  
_For environment setup, see `docs/ENVIRONMENT_SETUP.md`_
