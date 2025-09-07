import { initializeApp, getApps, App } from 'firebase-admin/app'
import { getStorage, Storage } from 'firebase-admin/storage'
import { credential } from 'firebase-admin'

let app: App

if (getApps().length === 0) {
  // Only initialize if no app exists
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Missing Firebase configuration')
    }

    app = initializeApp({
      credential: credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    })
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error)
    // Create a mock app for development
    app = initializeApp({}, 'mock')
  }
} else {
  app = getApps()[0]
}

export { app }

// Storage instance
export const storage: Storage = getStorage(app)

// Helper function to check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_STORAGE_BUCKET
  )
}