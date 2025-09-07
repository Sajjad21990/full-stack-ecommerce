# Firebase Setup Guide for E-commerce App

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "ecommerce-app")
4. Disable Google Analytics (optional, not needed for storage)
5. Click "Create project"

## Step 2: Enable Firebase Storage

1. In Firebase Console, click on "Storage" in left sidebar
2. Click "Get Started"
3. Choose "Start in production mode" for security
4. Select your Cloud Storage location (choose closest to your users)
5. Click "Done"

## Step 3: Set Storage Rules

1. In Storage, go to "Rules" tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read access to all files
    match /{allPaths=**} {
      allow read: if true;
    }

    // Allow write access only to authenticated users
    // and limit file size to 5MB
    match /products/{allPaths=**} {
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    match /categories/{allPaths=**} {
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }

    match /banners/{allPaths=**} {
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

3. Click "Publish"

## Step 4: Create Service Account & Get Credentials

### For Server-Side (Admin SDK):

1. Go to Project Settings (gear icon) → "Service accounts"
2. Click "Generate new private key"
3. Save the downloaded JSON file securely
4. Extract these values from the JSON:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
}
```

### For Client-Side (Web SDK):

1. Go to Project Settings → "General"
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register app with a nickname (e.g., "ecommerce-web")
5. Copy the configuration:

```javascript
const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
}
```

## Step 5: Add Environment Variables to Railway

Add these environment variables in your Railway app:

### Required Variables:

```bash
# From the service account JSON (for server-side uploads)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# From the web app config (for client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### How to add in Railway:

1. Go to your app service in Railway
2. Click "Variables" tab
3. Click "Raw Editor"
4. Paste all variables in format: `KEY=value`
5. Click "Update Variables"

## Step 6: Important Notes

### About FIREBASE_PRIVATE_KEY:

The private key is multi-line. When adding to Railway:

1. **Option 1 - Raw Editor (Recommended):**
   - Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Paste it with quotes: `FIREBASE_PRIVATE_KEY="-----BEGIN...-----END PRIVATE KEY-----\n"`

2. **Option 2 - Single Line:**
   - Replace all `\n` with actual `\\n`
   - Keep it as one line with escaped newlines

### Test Your Setup:

After deployment, test image upload in your admin panel:

1. Go to `/admin/products`
2. Try creating a product with an image
3. Check Firebase Console → Storage to see if image uploaded

## Step 7: CORS Configuration (if needed)

If you face CORS issues, create a `cors.json` file:

```json
[
  {
    "origin": ["https://your-railway-app.up.railway.app"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Apply it using gsutil:

```bash
gsutil cors set cors.json gs://your-project-id.appspot.com
```

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors:**
   - Check Firebase Storage rules
   - Verify service account has "Storage Admin" role

2. **"Invalid private key" errors:**
   - Ensure private key newlines are properly escaped
   - Try using Raw Editor in Railway

3. **Images not displaying:**
   - Check if storage bucket name is correct
   - Verify NEXT_PUBLIC variables are set

4. **CORS errors:**
   - Add your Railway domain to Firebase authorized domains
   - Apply CORS configuration as shown above

## Security Best Practices

1. **Never commit credentials to Git**
2. **Use separate Firebase projects for staging/production**
3. **Regularly rotate service account keys**
4. **Monitor Firebase usage to prevent abuse**
5. **Set up Firebase App Check for additional security**

## Useful Links

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Storage Docs](https://firebase.google.com/docs/storage)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Railway Variables Docs](https://docs.railway.app/develop/variables)
