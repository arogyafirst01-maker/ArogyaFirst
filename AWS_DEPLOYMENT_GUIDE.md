# ArogyaFirst AWS Deployment Guide

## Architecture: Elastic Beanstalk + Amplify (Recommended)

### Prerequisites

- AWS Account with admin access
- AWS CLI installed (`brew install awscli`)
- Elastic Beanstalk CLI installed (`brew install aws-elasticbeanstalk`)
- MongoDB Atlas account (for production database)

---

## Part 1: MongoDB Atlas Setup (5 minutes)

1. **Create MongoDB Atlas Cluster**

   - Go to https://cloud.mongodb.com
   - Create free cluster (M0)
   - Choose AWS as provider
   - Select region closest to your Elastic Beanstalk region

2. **Get Connection String**

   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/arogyafirst`

3. **Whitelist IP Addresses**
   - Database Access → Add "0.0.0.0/0" (allow from anywhere)
   - Or use AWS Elastic Beanstalk IP ranges

---

## Part 2: Backend Deployment (Elastic Beanstalk)

### Step 1: Prepare Backend for Deployment

1. **Navigate to API directory**

   ```bash
   cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
   ```

2. **Create `.ebignore` file**

   ```bash
   cat > .ebignore << 'EOF'
   node_modules/
   .env
   .env.local
   *.log
   .DS_Store
   EOF
   ```

3. **Update package.json scripts** (add this to apps/api/package.json)
   ```json
   {
     "scripts": {
       "start": "node src/server.js",
       "dev": "nodemon src/server.js"
     }
   }
   ```

### Step 2: Initialize Elastic Beanstalk

1. **Configure AWS CLI**

   ```bash
   aws configure
   ```

   Enter:

   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., `us-east-1`)
   - Default output format: `json`

2. **Initialize EB application**

   ```bash
   cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
   eb init
   ```

   Choose:

   - Application name: `arogyafirst-api`
   - Platform: Node.js
   - Platform version: Node.js 20 (latest)
   - SSH: Yes (for debugging)

### Step 3: Create Environment

1. **Create production environment**

   ```bash
   eb create arogyafirst-prod
   ```

   This will:

   - Create EC2 instance
   - Set up load balancer
   - Configure auto-scaling
   - Deploy your code
   - Takes ~5-10 minutes

2. **Set environment variables**

   ```bash
   eb setenv \
     NODE_ENV=production \
     PORT=8080 \
     MONGODB_URI="your-mongodb-atlas-uri" \
     JWT_SECRET="your-jwt-secret-key" \
     JWT_REFRESH_SECRET="your-refresh-secret-key" \
     CLOUDINARY_CLOUD_NAME="your-cloudinary-name" \
     CLOUDINARY_API_KEY="your-cloudinary-key" \
     CLOUDINARY_API_SECRET="your-cloudinary-secret" \
     FRONTEND_URL="https://your-amplify-domain.amplifyapp.com" \
     EMAIL_HOST="smtp.gmail.com" \
     EMAIL_PORT=587 \
     EMAIL_USER="your-email@gmail.com" \
     EMAIL_PASSWORD="your-app-password" \
     EMAIL_FROM="ArogyaFirst <your-email@gmail.com>"
   ```

3. **Open application**

   ```bash
   eb open
   ```

   Copy the URL (e.g., `http://arogyafirst-prod.us-east-1.elasticbeanstalk.com`)

### Step 4: Configure Health Checks

1. **Update health check path**

   ```bash
   eb config
   ```

   Find `aws:elasticbeanstalk:application:environment:` and add:

   ```yaml
   HealthCheckPath: /api/health
   ```

### Step 5: Future Deployments

```bash
cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
git add .
git commit -m "Update backend"
git push origin main
eb deploy
```

---

## Part 3: Frontend Deployment (AWS Amplify)

### Step 1: Prepare Frontend

1. **Update API URL in frontend**

   Edit `apps/web/src/config/api.js` (or wherever API URL is defined):

   ```javascript
   export const API_URL =
     import.meta.env.VITE_API_URL || 'http://arogyafirst-prod.us-east-1.elasticbeanstalk.com';
   ```

2. **Create environment file for Amplify**

   Create `apps/web/.env.production`:

   ```env
   VITE_API_URL=http://arogyafirst-prod.us-east-1.elasticbeanstalk.com
   ```

3. **Commit and push changes**
   ```bash
   cd /Users/anubhavtiwari/Desktop/ArogyaFirst
   git add .
   git commit -m "Configure production API URL"
   git push origin main
   ```

### Step 2: Deploy to Amplify

1. **Go to AWS Amplify Console**

   - https://console.aws.amazon.com/amplify

2. **Click "New app" → "Host web app"**

3. **Connect GitHub**

   - Choose GitHub
   - Authorize AWS Amplify
   - Select repository: `arogyafirst01-maker/ArogyaFirst`
   - Select branch: `main`

4. **Configure build settings**

   Amplify should auto-detect, but verify:

   ```yaml
   version: 1
   applications:
     - appRoot: apps/web
       frontend:
         phases:
           preBuild:
             commands:
               - cd ../..
               - npm install -g pnpm
               - pnpm install
           build:
             commands:
               - cd apps/web
               - pnpm run build
         artifacts:
           baseDirectory: apps/web/dist
           files:
             - '**/*'
         cache:
           paths:
             - node_modules/**/*
   ```

5. **Add environment variables**

   - Go to "Environment variables"
   - Add:
     - `VITE_API_URL`: Your Elastic Beanstalk URL

6. **Deploy**
   - Click "Save and deploy"
   - Wait 5-10 minutes
   - Get your Amplify URL (e.g., `https://main.d1234567890.amplifyapp.com`)

### Step 3: Update Backend CORS

1. **Update Elastic Beanstalk environment variable**
   ```bash
   cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
   eb setenv FRONTEND_URL="https://main.d1234567890.amplifyapp.com"
   eb deploy
   ```

---

## Part 4: Custom Domain (Optional)

### For Backend (Elastic Beanstalk)

1. Go to Route 53
2. Create hosted zone for your domain
3. Create A record pointing to Elastic Beanstalk environment
4. Or use CloudFront for HTTPS

### For Frontend (Amplify)

1. Go to Amplify Console → Domain management
2. Add custom domain
3. Follow DNS verification steps
4. Amplify automatically provisions SSL certificate

---

## Part 5: Monitoring & Logs

### Elastic Beanstalk Logs

```bash
eb logs
eb logs --stream  # Real-time logs
```

### Amplify Logs

- Go to Amplify Console
- Click on your app
- Go to "Build settings" → "View logs"

### CloudWatch (Both)

- Go to CloudWatch Console
- View metrics, logs, and set up alarms

---

## Estimated Costs

- **MongoDB Atlas**: Free (M0 tier, 512MB)
- **Elastic Beanstalk**: ~$15-30/month (t3.micro instance)
- **Amplify Hosting**: ~$1-5/month (hosting + build minutes)
- **Data Transfer**: Variable (~$5-20/month)

**Total: ~$20-60/month**

---

## Troubleshooting

### Backend not accessible

```bash
eb health
eb logs
```

### Frontend build fails

- Check build logs in Amplify Console
- Verify VITE_API_URL is set correctly
- Check pnpm workspace configuration

### CORS errors

- Verify FRONTEND_URL in Elastic Beanstalk
- Check CORS middleware in backend

### Database connection fails

- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure environment variables are set correctly

---

## Security Checklist

- ✅ Use strong JWT secrets
- ✅ Enable HTTPS (use CloudFront or ALB with SSL)
- ✅ Whitelist specific IPs for MongoDB (not 0.0.0.0/0 in production)
- ✅ Rotate access tokens regularly
- ✅ Enable AWS CloudTrail for audit logs
- ✅ Set up AWS WAF for additional protection
- ✅ Use AWS Secrets Manager for sensitive credentials

---

## Alternative: Lambda + Amplify (If you still prefer)

**Note**: Requires significant code refactoring. Lambda is not ideal for Express.js monoliths.

Would require:

1. Serverless Framework or AWS SAM
2. Breaking Express routes into individual Lambda functions
3. API Gateway configuration
4. MongoDB connection pooling adjustments
5. File upload handling changes (use S3 directly instead of memory)

**Not recommended for this project** due to complexity.

---

## Quick Start Commands Summary

```bash
# 1. Backend
cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
eb init
eb create arogyafirst-prod
eb setenv [all environment variables]

# 2. Frontend
# Go to AWS Amplify Console and connect GitHub repo

# 3. Deploy updates
cd /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/api
eb deploy  # Backend

# Frontend auto-deploys on git push to main
```

---

Good luck with your deployment! 🚀
