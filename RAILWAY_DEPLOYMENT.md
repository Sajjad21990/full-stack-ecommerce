# Railway Deployment Guide for Staging

## Quick Setup

1. **Fork/Push to GitHub**
   - Ensure your code is in a GitHub repository

2. **Create Railway Account**
   - Sign up at https://railway.app (free, no credit card needed)

3. **Deploy Services**

   ### Option A: One-Click Deploy
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
   - Railway will auto-detect Next.js

   ### Option B: Manual Services Setup
   - Create new project
   - Add PostgreSQL: New → Database → PostgreSQL
   - Add Redis: New → Database → Redis
   - Add your app: New → GitHub Repo

4. **Configure Environment Variables**

   Railway auto-injects database URLs, but you need to add:

   ```
   NEXTAUTH_SECRET=<generate-strong-secret>
   NEXTAUTH_URL=https://<your-app>.up.railway.app
   NEXT_PUBLIC_SITE_URL=https://<your-app>.up.railway.app

   # Firebase (for image uploads)
   FIREBASE_PROJECT_ID=your_id
   FIREBASE_PRIVATE_KEY=your_key
   FIREBASE_CLIENT_EMAIL=your_email
   FIREBASE_STORAGE_BUCKET=your_bucket

   # Admin
   ADMIN_EMAIL=your-email@example.com
   ENCRYPTION_KEY=32_character_key_here

   # Razorpay test keys (optional)
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=xxx
   ```

5. **Database Setup**
   ```bash
   # After deployment, run in Railway shell:
   npm run db:push
   npm run db:seed-admin
   ```

## What's Disabled for Staging

- **Meilisearch**: Product search will use basic DB queries
- **Mailhog**: OTP emails will log to console instead

## Monitoring

- Services sleep after 10 mins inactivity on free tier
- Wake automatically on request
- Check logs in Railway dashboard

## Upgrade to Production

When ready for production:

1. Upgrade to Hobby/Pro plan ($5-20/month)
2. Add Meilisearch as a service
3. Configure proper email provider (Resend/SendGrid)
4. Use production Razorpay keys
5. Set NODE_ENV=production

## Troubleshooting

- **Build fails**: Check Node version, ensure all deps in package.json
- **DB connection fails**: Railway auto-injects DATABASE_URL, don't override
- **Redis errors**: Ensure REDIS_URL uses Railway's injected variable
