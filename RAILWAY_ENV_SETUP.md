# Railway Environment Variables Setup

## Variables Railway Provides Automatically ✅
- `DATABASE_URL` - From PostgreSQL service
- `REDIS_URL` - From Redis service  
- `PORT` - Railway assigns this
- `RAILWAY_ENVIRONMENT` - Set to "production"

## Variables YOU MUST ADD Manually 🔧

### 1. Essential Variables (REQUIRED)
```bash
# Authentication (REQUIRED - app won't work without these)
NEXTAUTH_SECRET=<generate-with-command-below>
NEXTAUTH_URL=https://<your-app>.up.railway.app
NEXT_PUBLIC_SITE_URL=https://<your-app>.up.railway.app

# Admin Setup (REQUIRED)
ADMIN_EMAIL=your-email@example.com
ENCRYPTION_KEY=<generate-32-chars>
```

**To generate secrets:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (must be exactly 32 characters)
openssl rand -hex 16
```

### 2. Email Configuration (Choose One)

#### Option A: Disable emails for testing
```bash
EMAIL_FROM=noreply@example.com
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
```

#### Option B: Use Resend (Recommended for production)
```bash
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### 3. Payment Gateway (Optional for testing)

#### For Testing (use Razorpay test keys)
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxx
```

#### Skip payments entirely (leave empty)
```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

### 4. File Storage (Optional)

#### If you want image uploads to work:
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

#### Skip file uploads (leave empty)
```bash
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=
```

### 5. Search (Not needed for staging)
```bash
# Leave these empty - basic search will work without Meilisearch
MEILISEARCH_URL=
MEILISEARCH_MASTER_KEY=
```

## Quick Copy-Paste Template for Railway

Here's a minimal working configuration for staging:

```
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://<your-railway-app>.up.railway.app
NEXT_PUBLIC_SITE_URL=https://<your-railway-app>.up.railway.app
ADMIN_EMAIL=admin@example.com
ENCRYPTION_KEY=<run: openssl rand -hex 16>
EMAIL_FROM=noreply@example.com
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=
MEILISEARCH_URL=
MEILISEARCH_MASTER_KEY=
```

## After Deployment

1. Your app URL will be: `https://<project-name>.up.railway.app`
2. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` with this URL
3. Redeploy for changes to take effect

## Initialize Database

After deployment, run in Railway shell:

```bash
npm run db:push
npm run db:seed-admin
```

This creates tables and adds an admin user with email from `ADMIN_EMAIL`.