# 🚀 Backend Deployment Guide - ArogyaFirst API

Deploy your Express + MongoDB backend to Render (Free tier available)

---

## 📋 **What You'll Need Before Starting**

### 1. **MongoDB Atlas Database** (Free)

- Sign up at: https://www.mongodb.com/cloud/atlas/register
- Create a free cluster (M0 Sandbox - 512MB)
- Get connection string

### 2. **Cloudinary Account** (Free)

- Sign up at: https://cloudinary.com/users/register/free
- Get Cloud Name, API Key, API Secret

### 3. **Razorpay Account** (Live Keys)

- Login: https://dashboard.razorpay.com
- Get **LIVE** Key ID and Key Secret (not test keys!)

### 4. **Agora Account** (Free)

- Sign up: https://console.agora.io/
- Create project → Get App ID and App Certificate

### 5. **Vercel Frontend URL**

- Your deployed frontend URL (e.g., `https://arogyafirst.vercel.app`)

---

## ✅ **STEP 1: Set Up MongoDB Atlas**

### 1.1 Create Free Cluster

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google/GitHub
3. Choose **FREE** M0 cluster
4. Provider: **AWS**
5. Region: Choose closest to you (e.g., `Mumbai` for India, `Singapore` for Asia)
6. Cluster Name: `ArogyaFirst`
7. Click "Create Cluster" (takes 3-5 minutes)

### 1.2 Create Database User

1. Security → Database Access → "Add New Database User"
2. Authentication: **Password**
3. Username: `arogyafirst-admin`
4. Password: Click "Autogenerate" → **SAVE THIS PASSWORD!**
5. Database User Privileges: **Read and write to any database**
6. Click "Add User"

### 1.3 Whitelist IP Addresses

1. Security → Network Access → "Add IP Address"
2. Click "Allow Access from Anywhere" (for Render deployment)
3. IP Address: `0.0.0.0/0`
4. Click "Confirm"

### 1.4 Get Connection String

1. Database → Connect → "Connect your application"
2. Driver: **Node.js**, Version: **5.5 or later**
3. Copy connection string:
   ```
   mongodb+srv://arogyafirst-admin:<password>@arogyafirst.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with the password you saved
5. Add database name: `arogyafirst`
   ```
   mongodb+srv://arogyafirst-admin:YOUR_PASSWORD@arogyafirst.xxxxx.mongodb.net/arogyafirst?retryWrites=true&w=majority
   ```

**Save this connection string!** You'll need it for Render.

---

## ✅ **STEP 2: Prepare Backend for Deployment**

### 2.1 Verify Backend Starts Locally

```bash
cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
pnpm start
```

Should see: `Server running on http://localhost:3000`

Press `Ctrl+C` to stop.

---

## ✅ **STEP 3: Deploy to Render**

### 3.1 Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with **GitHub** (easiest)
4. Authorize Render to access your repositories

### 3.2 Create New Web Service

1. Dashboard → Click "New +" → "Web Service"
2. Connect your GitHub repo: `ArogyaFirst`
3. If not listed, click "Configure account" → Grant access to repository

### 3.3 Configure Service Settings

| Setting            | Value                                    |
| ------------------ | ---------------------------------------- |
| **Name**           | `arogyafirst-api`                        |
| **Region**         | Choose closest (e.g., Singapore, Oregon) |
| **Branch**         | `main`                                   |
| **Root Directory** | `apps/api`                               |
| **Runtime**        | `Node`                                   |
| **Build Command**  | `pnpm install`                           |
| **Start Command**  | `pnpm start`                             |
| **Instance Type**  | **Free** (0.5 GB RAM)                    |

### 3.4 Add Environment Variables

Click "Advanced" → "Add Environment Variable"

Add **ALL** these variables:

```env
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# MongoDB Atlas - REPLACE with your connection string
MONGODB_URI=mongodb+srv://arogyafirst-admin:YOUR_PASSWORD@arogyafirst.xxxxx.mongodb.net/arogyafirst?retryWrites=true&w=majority

# JWT Secrets - GENERATE STRONG RANDOM STRINGS
JWT_SECRET=your-super-secret-jwt-key-production-random-string-here
JWT_REFRESH_SECRET=your-refresh-token-secret-production-different-random-string

# Token Expiry
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS - REPLACE with your Vercel URL
CORS_ORIGIN=https://arogyafirst.vercel.app

# Cookie Settings
COOKIE_SAMESITE=none

# Cloudinary - REPLACE with your credentials
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=arogyafirst-prod

# Razorpay - REPLACE with LIVE keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret_key
RAZORPAY_WEBHOOK_SECRET=
PAYMENT_CURRENCY=INR
PAYMENT_TIMEOUT=900

# Agora - REPLACE with your credentials
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# Slot Configuration
DEFAULT_ADVANCE_BOOKING_DAYS=30
MAX_SLOTS_PER_DAY=50
ENABLE_TRANSACTIONS=true

# Version
APP_VERSION=0.1.0
```

**IMPORTANT:**

- Generate strong random strings for JWT secrets: https://www.random.org/strings/
- Use **LIVE** Razorpay keys (not test keys!)
- Set `COOKIE_SAMESITE=none` for cross-origin cookies
- Set `ENABLE_TRANSACTIONS=true` for MongoDB Atlas

### 3.5 Deploy

1. Click "Create Web Service"
2. Wait 3-5 minutes for deployment
3. You'll get a URL like: `https://arogyafirst-api.onrender.com`

---

## ✅ **STEP 4: Update Frontend Environment Variables**

### 4.1 Update Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Find `VITE_API_BASE_URL`
5. Click "Edit" → Update value:
   ```
   https://arogyafirst-api.onrender.com
   ```
6. Click "Save"
7. Click "Redeploy" in Deployments tab

---

## ✅ **STEP 5: Test Backend Deployment**

### 5.1 Health Check

Visit: `https://arogyafirst-api.onrender.com/api/health`

Should return:

```json
{
  "status": "ok",
  "timestamp": "2025-12-08T..."
}
```

### 5.2 Test from Frontend

1. Open your Vercel app: `https://arogyafirst.vercel.app`
2. Try to register a new account
3. Try to login
4. Check browser console for errors

---

## ✅ **STEP 6: Seed Database (Optional)**

### 6.1 Add Seed Script to Render

1. Render Dashboard → Your service
2. Shell tab
3. Run:
   ```bash
   cd /opt/render/project/src/apps/api
   node src/scripts/seedDatabase.js
   ```

Or run locally:

```bash
cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
MONGODB_URI="your-atlas-connection-string" node src/scripts/seedDatabase.js
```

---

## 🔧 **Important Render Notes**

### Free Tier Limitations:

- ✓ 750 hours/month (always on)
- ✓ 512MB RAM
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes 30-60 seconds

### Auto-Deploy:

- Every push to `main` branch auto-deploys! 🚀

### View Logs:

- Render Dashboard → Your service → "Logs" tab

---

## ✅ **Alternative: Deploy to Railway**

If you prefer Railway over Render:

### Railway Setup:

1. Go to https://railway.app
2. Sign up with GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Select `ArogyaFirst`
5. Root directory: `apps/api`
6. Start command: `cd apps/api && pnpm install && pnpm start`
7. Add same environment variables
8. Deploy!

**URL**: `https://arogyafirst-api.up.railway.app`

---

## 🆘 **Troubleshooting**

### Build Fails:

- Check Render logs for errors
- Verify `pnpm` is available (it should auto-detect)
- Ensure `package.json` has correct scripts

### MongoDB Connection Error:

- Verify connection string is correct
- Check password has no special characters (if so, URL encode them)
- Ensure IP whitelist includes `0.0.0.0/0`

### CORS Errors:

- Verify `CORS_ORIGIN` matches your Vercel URL exactly
- Check `COOKIE_SAMESITE=none` is set
- Ensure frontend `VITE_API_BASE_URL` is updated

### Razorpay Errors:

- Verify using **LIVE** keys (not test keys)
- Check keys are correctly copied (no spaces)

---

## ✅ **Deployment Checklist**

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password saved
- [ ] IP whitelist set to `0.0.0.0/0`
- [ ] MongoDB connection string obtained
- [ ] Cloudinary credentials ready
- [ ] Razorpay LIVE keys ready
- [ ] Agora App ID and Certificate ready
- [ ] Render account created
- [ ] Web service created on Render
- [ ] All environment variables added
- [ ] Backend deployed successfully
- [ ] Health check endpoint works
- [ ] Frontend `VITE_API_BASE_URL` updated
- [ ] Frontend redeployed on Vercel
- [ ] Registration works from frontend
- [ ] Login works from frontend
- [ ] No CORS errors in browser console

---

## 📊 **Your Deployment URLs**

- **Frontend**: `https://arogyafirst.vercel.app`
- **Backend**: `https://arogyafirst-api.onrender.com`
- **Health Check**: `https://arogyafirst-api.onrender.com/api/health`

---

## 🎉 **You're Done!**

Your full-stack ArogyaFirst application is now live!

**Share with client**:

- Frontend URL: `https://arogyafirst.vercel.app`
- API Docs: `https://arogyafirst-api.onrender.com/api/health`

**Next Steps**:

- Set up custom domain (optional)
- Configure SSL (Render does this automatically)
- Set up monitoring (Render has built-in metrics)
- Add error tracking (Sentry, LogRocket, etc.)

---

**Need help?** Check Render logs or Vercel deployment logs for errors.
