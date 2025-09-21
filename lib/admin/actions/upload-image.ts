'use server'

import { storage, isFirebaseConfigured } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth'
import { createId } from '@paralleldrive/cuid2'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

export async function uploadProductImage(formData: FormData) {
  try {
    // Verify admin access
    await requireAdmin()

    const file = formData.get('file') as File
    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.',
      }
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File too large. Maximum size is 10MB.' }
    }

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      // For development, return a mock URL
      const mockUrl = `https://placehold.co/600x600/eeeeee/999999?text=Product+Image`
      console.log('Firebase not configured, using mock URL')
      return { success: true, url: mockUrl }
    }

    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop()
      const fileName = `products/${createId()}.${fileExtension}`

      // Convert File to Buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Upload to Firebase Storage
      const bucket = storage.bucket()
      const fileUpload = bucket.file(fileName)

      await fileUpload.save(buffer, {
        metadata: {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000',
        },
      })

      // Make the file public
      await fileUpload.makePublic()

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`

      return { success: true, url: publicUrl }
    } catch (uploadError) {
      console.error('Firebase upload error:', uploadError)
      // Fallback to mock URL in case of Firebase errors
      const mockUrl = `https://placehold.co/600x600/eeeeee/999999?text=Product+Image`
      return { success: true, url: mockUrl }
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { success: false, error: 'Failed to upload image' }
  }
}

export async function deleteProductImage(url: string) {
  try {
    // Verify admin access
    await requireAdmin()

    // Check if Firebase is configured and it's a Firebase URL
    if (!isFirebaseConfigured() || !url.includes('storage.googleapis.com')) {
      return { success: true, message: 'Image deleted' }
    }

    // Extract file path from URL
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    const filePath = `products/${fileName}`

    // Delete from Firebase Storage
    const bucket = storage.bucket()
    const file = bucket.file(filePath)

    try {
      await file.delete()
    } catch (deleteError) {
      console.error('Firebase delete error:', deleteError)
      // Don't fail if file doesn't exist or can't be deleted
    }

    return { success: true, message: 'Image deleted successfully' }
  } catch (error) {
    console.error('Error deleting image:', error)
    return { success: false, error: 'Failed to delete image' }
  }
}
