# ArogyaFirst - Environment Setup Guide

## Introduction

This guide provides step-by-step instructions for setting up all third-party services required for the ArogyaFirst platform.

### Required Services

1. **MongoDB Atlas** - Database
2. **Cloudinary** - File storage
3. **Razorpay** - Payment gateway
4. **Agora** - Video consultations

### Estimated Costs

- MongoDB Atlas: Free (M0 tier) for development
- Cloudinary: Free (25 credits/month)
- Razorpay: Free for test mode, transaction fees in production
- Agora: Free (10,000 minutes/month)

### Setup Time

Total: ~45-60 minutes

---

## MongoDB Atlas Setup (Database)

**Time: ~15 minutes**

### Step 1: Create Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" and create account
3. Verify email address

### Step 2: Create Organization and Project

1. Create new organization (or use default)
2. Create new project: "ArogyaFirst"

### Step 3: Build Database

1. Click "Build a Database"
2. Select **M0 Free tier**:
   - 512MB storage
   - Shared CPU
   - Suitable for development
3. Choose cloud provider: AWS (recommended)
4. Select region: Closest to your users (e.g., Mumbai for India)
5. Cluster name: `arogyafirst-cluster`
6. Click "Create"

### Step 4: Create Database User

1. Under "Security" > "Database Access", click "Add New Database User"
2. Authentication Method: Password
3. Username: `arogyafirst-admin`
4. Password: Click "Autogenerate Secure Password" and **save it securely**
5. Database User Privileges: "Read and write to any database"
6. Click "Add User"

### Step 5: Configure Network Access

**Development:**

1. Under "Security" > "Network Access", click "Add IP Address"
2. Click "Add Current IP Address"
3. Or add `0.0.0.0/0` to allow from anywhere (less secure, dev only)

**Production:**

1. Add your server's IP address
2. Remove `0.0.0.0/0` entry

### Step 6: Get Connection String

1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Driver: Node.js
4. Version: 5.5 or later
5. Copy connection string:
   ```
   mongodb+srv://arogyafirst-admin:<password>@arogyafirst-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your database user password
7. Add database name after `.net/`:
   ```
   mongodb+srv://arogyafirst-admin:YOUR_PASSWORD@arogyafirst-cluster.xxxxx.mongodb.net/arogyafirst?retryWrites=true&w=majority
   ```

### Step 7: Update Environment Variables

In `apps/api/.env`:

```env
MONGODB_URI=mongodb+srv://arogyafirst-admin:YOUR_PASSWORD@arogyafirst-cluster.xxxxx.mongodb.net/arogyafirst?retryWrites=true&w=majority
```

### Troubleshooting

**Connection Issues:**

- Check IP whitelist in Atlas
- Verify username/password (no special characters issues)
- Ensure connection string includes database name
- Check firewall/network settings

**Performance:**

- M0 tier has connection limits (500 max connections)
- For production, upgrade to M10+ tier

---

## Cloudinary Setup (File Storage)

**Time: ~10 minutes**

### Step 1: Create Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up with email or Google
3. Verify email address

### Step 2: Complete Profile

1. Complete profile setup
2. Select use case: "Web and Mobile Development"

### Step 3: Get Credentials

1. Navigate to Dashboard: https://console.cloudinary.com/console
2. Find "Account Details" section (usually on the right side)
3. Copy the following:
   - **Cloud name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click "eye" icon to reveal)

### Step 4: Update Environment Variables

In `apps/api/.env`:

```env
CLOUDINARY_CLOUD_NAME=dxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret-here
CLOUDINARY_FOLDER=arogyafirst
```

### Step 5: (Optional) Create Upload Presets

1. Go to Settings > Upload
2. Click "Add upload preset"
3. Preset name: `arogyafirst-documents`
4. Folder: `arogyafirst/documents`
5. Resource type: Auto
6. Save

### Free Tier Limits

- 25 credits/month (sufficient for Phase 1)
- 25GB storage
- 25GB bandwidth
- Transformations included

### Troubleshooting

**Upload Failures:**

- Verify API credentials are correct
- Check file size (max 5MB in our config)
- Verify file type (PDF, JPG, PNG only)
- Check Cloudinary dashboard for error logs

---

## Razorpay Setup (Payment Gateway)

**Time: ~15 minutes**

### Test Mode (Development)

### Step 1: Create Account

1. Go to https://razorpay.com/
2. Click "Sign Up"
3. Enter business details
4. Verify email and phone

### Step 2: Access Dashboard

1. Login to https://dashboard.razorpay.com/
2. No KYC required for test mode

### Step 3: Generate Test Keys

1. Navigate to Settings > API Keys
2. Click "Generate Test Key"
3. Copy:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (click "eye" icon to reveal)

### Step 4: Update Environment Variables

In `apps/api/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-test-secret-here
PAYMENT_CURRENCY=INR
```

In `apps/web/.env`:

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

### Step 5: (Optional) Setup Webhook for Local Testing

**Using ngrok:**

1. Install ngrok: https://ngrok.com/download
2. Run ngrok:
   ```bash
   ngrok http 3000
   ```
3. Copy the HTTPS URL (e.g., `https://xxxx.ngrok.io`)

**Configure Webhook:**

1. In Razorpay Dashboard, go to Settings > Webhooks
2. Click "Add New Webhook"
3. Webhook URL: `https://xxxx.ngrok.io/api/payments/webhook`
4. Active Events: Select all or these specific ones:
   - `payment.authorized`
   - `payment.failed`
   - `refund.processed`
5. Click "Create Webhook"
6. Copy the **Webhook Secret**

In `apps/api/.env`:

```env
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

### Test Cards

Use these cards in test mode:

**Success:**

- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)

**Failure:**

- Card Number: `4000 0000 0000 0002`

**UPI (Auto-success):**

- UPI ID: `success@razorpay`

### Live Mode (Production)

### Step 1: Complete KYC

1. Navigate to Settings > Configuration
2. Click "Activate your account"
3. Submit:
   - Business details
   - Bank account details
   - PAN card
   - GST certificate (if applicable)
4. Wait for approval (1-2 business days)

### Step 2: Generate Live Keys

1. After KYC approval, go to Settings > API Keys
2. Click "Generate Live Key"
3. Copy Key ID (starts with `rzp_live_`) and Key Secret

### Step 3: Configure Production Webhook

1. Settings > Webhooks
2. Add webhook with your production domain
3. URL: `https://yourdomain.com/api/payments/webhook`

### Step 4: Update Production Environment

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-live-secret
RAZORPAY_WEBHOOK_SECRET=your-production-webhook-secret
```

### Troubleshooting

**Payment Failures:**

- Verify test/live key mode matches environment
- Check webhook URL is accessible (use ngrok for local)
- Verify webhook secret is correct
- Check Razorpay dashboard logs for errors

---

## Agora Setup (Video Consultations)

**Time: ~10 minutes**

### Step 1: Create Account

1. Go to https://console.agora.io/
2. Click "Sign Up"
3. Create account with email
4. Verify email address

### Step 2: Create Project

1. Navigate to "Projects" in console
2. Click "Create" > "Create a new project"
3. Project name: `ArogyaFirst`
4. **Authentication mechanism:** Select "Secured mode: APP ID + Token"
5. Click "Submit"

### Step 3: Get App ID

1. Find your project in the list
2. Copy the **App ID** from the project card

### Step 4: Generate App Certificate

1. Click on project name to open details
2. Find "App Certificate" section
3. Click "Generate" (or "Enable" if not generated)
4. Copy the **App Certificate** (keep it secret!)

### Step 5: Update Environment Variables

In `apps/api/.env`:

```env
AGORA_APP_ID=your-app-id-here
AGORA_APP_CERTIFICATE=your-app-certificate-here
```

In `apps/web/.env`:

```env
VITE_AGORA_APP_ID=your-app-id-here
```

### Free Tier Limits

- 10,000 minutes/month
- Sufficient for ~166 hours of video calls
- Up to 50 concurrent users

### Step 6: Configure Token Settings (Optional)

1. In project settings, configure:
   - Token expiration: 24 hours (recommended)
   - Enable/disable features as needed

### Testing Agora

1. Visit Agora Web Demo: https://webdemo.agora.io/
2. Enter your App ID
3. Test video/audio in browser
4. Verify camera and microphone permissions

### Troubleshooting

**Video Call Issues:**

- Verify App ID and Certificate are correct
- Check browser permissions (camera/microphone)
- Test with Agora demo first
- Check browser console for errors
- Verify token generation on backend
- Ensure HTTPS in production (required for camera access)

### Monitor Usage

1. Go to Console > Usage
2. View minutes consumed
3. Set up alerts for quota limits

---

## Email Service (Optional - Future Enhancement)

For sending verification emails, password resets, notifications:

### SendGrid Setup

1. Sign up at https://sendgrid.com/
2. Verify domain
3. Create API key
4. Add to `.env`:
   ```env
   EMAIL_SERVICE=sendgrid
   EMAIL_API_KEY=your-sendgrid-api-key
   EMAIL_FROM=noreply@arogyafirst.com
   ```

### Mailgun Setup

1. Sign up at https://www.mailgun.com/
2. Verify domain
3. Get API key
4. Add to `.env`:
   ```env
   EMAIL_SERVICE=mailgun
   EMAIL_API_KEY=your-mailgun-api-key
   EMAIL_DOMAIN=mg.yourdomain.com
   EMAIL_FROM=noreply@arogyafirst.com
   ```

---

## Environment Variables Checklist

### Backend (`apps/api/.env`)

- [ ] `NODE_ENV=development`
- [ ] `PORT=3000`
- [ ] `HOST=0.0.0.0`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=<64-char-random-string>`
- [ ] `JWT_REFRESH_SECRET=<different-64-char-random-string>`
- [ ] `JWT_EXPIRES_IN=15m`
- [ ] `JWT_REFRESH_EXPIRES_IN=7d`
- [ ] `CORS_ORIGIN=http://localhost:5173`
- [ ] `CLOUDINARY_CLOUD_NAME=...`
- [ ] `CLOUDINARY_API_KEY=...`
- [ ] `CLOUDINARY_API_SECRET=...`
- [ ] `CLOUDINARY_FOLDER=arogyafirst`
- [ ] `RAZORPAY_KEY_ID=rzp_test_...`
- [ ] `RAZORPAY_KEY_SECRET=...`
- [ ] `RAZORPAY_WEBHOOK_SECRET=...` (optional for dev)
- [ ] `PAYMENT_CURRENCY=INR`
- [ ] `AGORA_APP_ID=...`
- [ ] `AGORA_APP_CERTIFICATE=...`
- [ ] `ENABLE_TRANSACTIONS=false` (true for production with replica set)

### Frontend (`apps/web/.env`)

- [ ] `VITE_API_BASE_URL=http://localhost:3000`
- [ ] `VITE_APP_NAME=ArogyaFirst`
- [ ] `VITE_RAZORPAY_KEY_ID=rzp_test_...`
- [ ] `VITE_AGORA_APP_ID=...`

---

## Generating Strong Secrets

For `JWT_SECRET` and `JWT_REFRESH_SECRET`, generate strong random strings:

**Using Node.js:**

```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex')); // 64 characters
```

**Using online tool:**

- Visit https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

---

## Next Steps

After completing environment setup:

1. **Install dependencies:**

   ```bash
   cd /path/to/ArogyaFirst
   pnpm install
   ```

2. **Start backend:**

   ```bash
   pnpm --filter @arogyafirst/api dev
   ```

3. **Start frontend:**

   ```bash
   pnpm --filter @arogyafirst/web dev
   ```

4. **Create admin user** (see `DEPLOYMENT.md`)

5. **Test all features** with test accounts

6. **Review testing guide:** `docs/TESTING_GUIDE.md`

---

## Summary

You should now have:

- ✅ MongoDB Atlas database configured
- ✅ Cloudinary file storage ready
- ✅ Razorpay payment gateway (test mode)
- ✅ Agora video consultations configured
- ✅ All environment variables set
- ✅ Application ready to run

**Total Cost: $0** (all free tiers for development)

For production deployment, see `docs/DEPLOYMENT.md`

For security checklist, see `docs/SECURITY_AUDIT.md`
