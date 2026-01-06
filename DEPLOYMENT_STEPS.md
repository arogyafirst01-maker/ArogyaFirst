# 🚀 Complete Vercel Deployment Guide for ArogyaFirst Frontend

Follow these steps **exactly** to deploy your frontend to Vercel.

---

## ✅ **STEP 1: Verify Build Works Locally**

Already completed! ✓ Build succeeded with output in `apps/web/dist/`

---

## ✅ **STEP 2: Environment Variables Setup**

### What you need to collect:

1. **Backend API URL** (deployed backend)

   - Example: `https://arogyafirst-api.onrender.com`
   - Or: `https://api.yourdomain.com`

2. **Razorpay LIVE Keys** (not test keys!)

   - Login to: https://dashboard.razorpay.com
   - Navigate to: Settings → API Keys
   - Copy: **Key ID** (starts with `rzp_live_`)
   - ⚠️ **Never use test keys in production**

3. **Agora App ID** (for video calls)
   - Login to: https://console.agora.io/
   - Select your project
   - Copy: **App ID**

### Environment variables to set in Vercel:

```
VITE_API_BASE_URL=https://your-backend-url.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
VITE_AGORA_APP_ID=your_agora_app_id
VITE_APP_NAME=ArogyaFirst
VITE_APP_VERSION=0.1.0
VITE_MAX_FILE_SIZE=5242880
VITE_ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png
VITE_PAYMENT_TIMEOUT=900000
VITE_ENABLE_ANALYTICS=true
```

---

## ✅ **STEP 3: Push to GitHub**

### 3.1 Initialize Git (if not already done)

```bash
cd /Users/anubhavtiwari/Desktop/ArogyaFirst
git init
```

### 3.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `ArogyaFirst` (or your choice)
3. Keep it **Private** (recommended)
4. **DO NOT** initialize with README (we already have one)
5. Click "Create repository"

### 3.3 Add and Commit Files

```bash
# Add all files
git add .

# Commit
git commit -m "Initial commit - ArogyaFirst Healthcare Platform"

# Set main branch
git branch -M main
```

### 3.4 Push to GitHub

```bash
# Replace with YOUR GitHub username and repo name
git remote add origin https://github.com/YOUR_USERNAME/ArogyaFirst.git

# Push
git push -u origin main
```

**If prompted for credentials:**

- Use **Personal Access Token** instead of password
- Create token at: https://github.com/settings/tokens

---

## ✅ **STEP 4: Create Vercel Account & Deploy**

### 4.1 Sign Up

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub" (easiest)
4. Authorize Vercel to access your repositories

### 4.2 Import Project

1. Click "Add New..." → "Project"
2. Find your `ArogyaFirst` repository
3. Click "Import"

### 4.3 Configure Build Settings

Vercel should auto-detect Vite, but **verify these settings**:

| Setting              | Value                        |
| -------------------- | ---------------------------- |
| **Framework Preset** | Vite                         |
| **Root Directory**   | `apps/web`                   |
| **Build Command**    | `pnpm install && pnpm build` |
| **Output Directory** | `dist`                       |
| **Install Command**  | `pnpm install`               |

### 4.4 Add Environment Variables

Click "Environment Variables" and add **each one**:

For **Production** environment:

```
VITE_API_BASE_URL → https://your-backend-url.com
VITE_RAZORPAY_KEY_ID → rzp_live_xxxxxxxxxxxxx
VITE_AGORA_APP_ID → your_agora_app_id
VITE_APP_NAME → ArogyaFirst
VITE_APP_VERSION → 0.1.0
VITE_MAX_FILE_SIZE → 5242880
VITE_ALLOWED_FILE_TYPES → .pdf,.jpg,.jpeg,.png
VITE_PAYMENT_TIMEOUT → 900000
VITE_ENABLE_ANALYTICS → true
```

**Important:** Add variables for all three environments (Production, Preview, Development) or just Production for now.

### 4.5 Deploy

Click **"Deploy"**

⏳ Wait 2-5 minutes for build to complete...

🎉 You'll get a URL like: `https://arogyafirst.vercel.app`

---

## ✅ **STEP 5: Configure Backend CORS**

### 5.1 Update Backend Environment Variables

Add your Vercel URL to backend `.env`:

```env
FRONTEND_URL=https://arogyafirst.vercel.app
CORS_ORIGIN=https://arogyafirst.vercel.app
```

### 5.2 Update Backend CORS Code

In `apps/api/src/server.js`, update CORS:

```javascript
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN,
      'http://localhost:5173', // Keep for local dev
    ],
    credentials: true,
  })
);
```

### 5.3 Redeploy Backend

Deploy your backend again with updated CORS settings.

---

## ✅ **STEP 6: Test Your Deployment**

### Critical Tests:

1. **Landing Page** ✓

   - Visit: `https://your-project.vercel.app`
   - Should load with hero section, features

2. **Registration** ✓

   - Click "Get Started"
   - Select role → Fill form
   - Check if API call succeeds

3. **Login** ✓

   - Try logging in with registered account
   - Should redirect to landing page with personalized message

4. **Dashboard** ✓

   - Click "Go to Dashboard"
   - Should load role-specific dashboard

5. **Book Appointment** ✓

   - Test booking flow
   - Check provider search works

6. **Browser Console** ✓
   - Press F12 → Console tab
   - Should see NO CORS errors
   - Should see NO API connection errors

### Common Issues:

❌ **Blank page**: Check browser console for errors  
❌ **API errors**: Verify `VITE_API_BASE_URL` is correct  
❌ **CORS errors**: Check backend CORS configuration  
❌ **404 on refresh**: Vercel should handle this automatically with SPA routing

---

## ✅ **STEP 7: Share with Client**

Your deployment URL: `https://arogyafirst.vercel.app` (or custom domain)

**Test Credentials** (create these in your app):

- **Patient**: patient@test.com / Test@123456
- **Doctor**: doctor@test.com / Test@123456
- **Hospital**: hospital@test.com / Test@123456

---

## 🔄 **Future Updates**

### Automatic Deployments:

Every push to `main` branch auto-deploys! 🚀

### Manual Redeploy:

1. Go to Vercel Dashboard
2. Select project
3. Click "Deployments" tab
4. Click "..." → "Redeploy"

### Update Environment Variables:

1. Vercel Dashboard → Project → Settings
2. Environment Variables → Edit
3. Click "Redeploy" after changes

---

## 📊 **Monitoring**

- **Analytics**: Vercel Dashboard → Analytics
- **Logs**: Deployments → Select deployment → "Building" tab
- **Performance**: Vercel automatically provides Web Vitals

---

## ✅ **Deployment Checklist**

- [ ] Frontend builds successfully locally
- [ ] `.gitignore` configured correctly
- [ ] `.env.production` created (not committed)
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] First deployment succeeded
- [ ] Backend CORS updated
- [ ] Landing page loads
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard accessible
- [ ] No console errors
- [ ] Shared URL with client

---

## 🆘 **Need Help?**

If deployment fails, check:

1. **Build logs** in Vercel dashboard
2. **Browser console** for frontend errors
3. **Network tab** for API call failures
4. Environment variables are spelled correctly
5. Backend is deployed and accessible

---

**You're ready to deploy! 🎉**

Start with **STEP 3** (Push to GitHub) since Steps 1-2 are complete.
