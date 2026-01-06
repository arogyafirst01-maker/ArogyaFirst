# ArogyaFirst - Deployment Guide

## Prerequisites

- Node.js 22+ and pnpm 9+
- MongoDB Atlas account (or self-hosted MongoDB with replica set)
- Cloudinary account
- Razorpay account
- Agora account
- Domain name and SSL certificate
- Server/hosting provider (AWS, DigitalOcean, Vercel, etc.)

See `docs/ENVIRONMENT_SETUP.md` for third-party service setup.

---

## Production Environment Setup

### 1. MongoDB Atlas (Production)

1. Upgrade to M10+ cluster (from free M0)
2. Enable automated backups
3. Configure production IP whitelist (server IP only)
4. Create production database user
5. Enable monitoring and alerts

### 2. Third-Party Services (Production)

**Cloudinary:**

- Upgrade plan if needed for higher storage
- Set up CDN for faster delivery

**Razorpay:**

- Complete KYC verification
- Generate live keys (`rzp_live_*`)
- Configure production webhook URL
- Test with small real transactions

**Agora:**

- Monitor usage to stay within free tier
- Configure production project settings

---

## Backend Deployment

### Option 1: Traditional Server (AWS EC2, DigitalOcean, etc.)

#### Step 1: Provision Server

```bash
# Ubuntu 22.04 LTS recommended
# Minimum: 2 CPU, 2GB RAM for small deployments
```

#### Step 2: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm@9

# Install PM2 for process management
npm install -g pm2
```

#### Step 3: Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd ArogyaFirst

# Install dependencies
pnpm install

# Build (if needed)
pnpm build
```

#### Step 4: Configure Environment

Create `apps/api/.env`:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/arogyafirst?retryWrites=true&w=majority

JWT_SECRET=<64-char-random-production-secret>
JWT_REFRESH_SECRET=<different-64-char-production-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=https://yourdomain.com

CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=arogyafirst

RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your-live-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
PAYMENT_CURRENCY=INR

AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-certificate

# CRITICAL: Enable MongoDB transactions for atomic multi-document operations
# Requires MongoDB replica set (Atlas M10+ or self-hosted with replica set configured)
# When false, booking/slot updates will NOT be atomic and may result in data inconsistency
# Production deployments MUST set this to true and use a replica set
ENABLE_TRANSACTIONS=true
```

#### Step 5: Start with PM2

```bash
cd apps/api
pm2 start src/server.js --name arogyafirst-api
pm2 startup
pm2 save
```

#### Step 6: Configure Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 7: Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### Step 8: Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Option 2: Serverless (Railway, Render, etc.)

1. Connect GitHub repository
2. Select `apps/api` as root directory
3. Add environment variables in dashboard
4. Deploy

---

## Frontend Deployment

### Option 1: Static Hosting (Vercel, Netlify, Cloudflare Pages)

#### Step 1: Configure Environment

Create `apps/web/.env.production`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_NAME=ArogyaFirst
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
VITE_AGORA_APP_ID=your-app-id
```

#### Step 2: Build

```bash
pnpm --filter @arogyafirst/web build
```

Output: `apps/web/dist/`

#### Step 3: Deploy

**Vercel:**

```bash
vercel deploy --prod
```

**Netlify:**

1. Drag and drop `dist/` folder
2. Configure custom domain
3. Set up SPA redirects:
   ```
   /*    /index.html   200
   ```

**Cloudflare Pages:**

1. Connect GitHub
2. Build command: `pnpm --filter @arogyafirst/web build`
3. Output directory: `apps/web/dist`

#### Step 4: Configure Custom Domain and SSL

All platforms provide automatic SSL with Let's Encrypt.

### Option 2: Self-Hosted with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/arogyafirst/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Then setup SSL with certbot.

---

## Post-Deployment Steps

### 1. Create Admin User

Connect to MongoDB and insert admin user:

```javascript
// Generate password hash first
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your-admin-password', 10);
console.log(hash);

// Then insert to database
db.users.insertOne({
  email: 'admin@arogyafirst.com',
  password: '<bcrypt-hash-from-above>',
  role: 'ADMIN',
  verificationStatus: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### 2. Configure Monitoring

**Error Tracking (Sentry):**

```bash
npm install @sentry/node
```

**Uptime Monitoring:**

- UptimeRobot (free)
- Pingdom
- StatusCake

**Log Aggregation:**

- Papertrail
- Loggly
- CloudWatch (AWS)

### 3. Set Up Backups

MongoDB Atlas: Automated backups enabled by default (M10+)

### 4. Performance Monitoring

- Monitor API response times
- Check database query performance
- Monitor Cloudinary usage
- Monitor Razorpay transaction volume
- Monitor Agora video call minutes

---

## Security Checklist

Before going live, complete `docs/SECURITY_AUDIT.md`:

- [ ] Strong JWT secrets (64+ characters)
- [ ] HTTPS enabled
- [ ] CORS configured (no wildcards)
- [ ] Environment variables secured
- [ ] No secrets in client code
- [ ] Webhook signatures verified
- [ ] File uploads validated
- [ ] Rate limiting enabled
- [ ] Database backups automated
- [ ] Monitoring and alerts configured

---

## Rollback Strategy

### PM2 Rollback

```bash
# View logs
pm2 logs arogyafirst-api

# Restart
pm2 restart arogyafirst-api

# Stop
pm2 stop arogyafirst-api
```

### Database Rollback

Use MongoDB Atlas point-in-time recovery

### Git Rollback

```bash
git revert <commit-hash>
# or
git reset --hard <previous-commit>
git push --force
```

---

## Maintenance

### Regular Updates

```bash
# Update dependencies
pnpm update

# Security audit
pnpm audit

# Fix vulnerabilities
pnpm audit fix
```

### Log Rotation

Configure PM2 log rotation:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### SSL Renewal

Let's Encrypt auto-renews. Verify:

```bash
sudo certbot renew --dry-run
```

---

## Scaling

### Horizontal Scaling

1. Set up load balancer (Nginx, AWS ALB)
2. Deploy multiple API instances
3. Use Redis for session storage
4. Configure MongoDB read replicas

### Database Scaling

1. Upgrade MongoDB cluster tier
2. Enable sharding for large datasets
3. Add read replicas
4. Optimize indexes

---

## Troubleshooting

### Server Issues

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs arogyafirst-api --lines 100

# Restart
pm2 restart arogyafirst-api
```

### Database Connection

```bash
# Test connection
mongosh "mongodb+srv://..." --eval "db.adminCommand('ping')"
```

### SSL Issues

```bash
# Test SSL
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Error tracking setup
- [ ] Admin user created
- [ ] DNS configured
- [ ] Firewall rules set
- [ ] Security audit passed
- [ ] Performance testing done
- [ ] Load testing completed
- [ ] Rollback plan documented

---

_For environment setup, see `docs/ENVIRONMENT_SETUP.md`_  
_For security audit, see `docs/SECURITY_AUDIT.md`_  
_For testing checklist, see `docs/TESTING_CHECKLIST.md`_
