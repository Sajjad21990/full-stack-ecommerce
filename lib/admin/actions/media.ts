'use server'

import { db } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { mediaAssets, mediaAssociations } from '@/db/schema/media-metadata'
import { revalidatePath } from 'next/cache'
import { storage, isFirebaseConfigured } from '@/lib/firebase-admin'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createId } from '@paralleldrive/cuid2'
import sharp from 'sharp'

export interface UploadMediaData {
  file: File
  folder?: string
  tags?: string[]
  altText?: string
  title?: string
  description?: string
}

export interface UpdateMediaData {
  id: string
  altText?: string
  title?: string
  description?: string
  folder?: string
  tags?: string[]
}

/**
 * Upload media file (with Firebase or local storage fallback)
 */
export async function uploadMedia(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || undefined
    const tags = formData.get('tags') as string
    const altText = (formData.get('altText') as string) || ''
    const title = (formData.get('title') as string) || ''
    const description = (formData.get('description') as string) || ''

    if (!file || !file.size) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'application/pdf',
    ]

    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'File type not allowed' }
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 10MB' }
    }

    const fileName = `${createId()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let url: string
    let thumbnailUrl: string | undefined
    let width: number | undefined
    let height: number | undefined
    let storagePath: string
    let storageProvider: string

    if (isFirebaseConfigured()) {
      // Upload to Firebase Storage
      const folderPath = folder ? `media/${folder}` : 'media'
      storagePath = `${folderPath}/${fileName}`
      storageProvider = 'firebase'

      const bucket = storage.bucket()
      const fileRef = bucket.file(storagePath)

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            folder: folder || '',
          },
        },
      })

      // Get download URL
      const [downloadURL] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Very far future date for permanent access
      })

      url = downloadURL
    } else {
      // Fallback to local storage
      storageProvider = 'local'
      const uploadDir = join(process.cwd(), 'public', 'uploads', folder || '')
      await mkdir(uploadDir, { recursive: true })

      const filePath = join(uploadDir, fileName)
      await writeFile(filePath, buffer)

      storagePath = `/uploads/${folder ? folder + '/' : ''}${fileName}`
      url = storagePath
    }

    // Generate thumbnail for images
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const metadata = await sharp(buffer).metadata()
        width = metadata.width
        height = metadata.height

        // Generate thumbnail
        const thumbnailBuffer = await sharp(buffer)
          .resize(300, 300, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        const thumbnailFileName = `thumb_${fileName.replace(/\.[^/.]+$/, '.jpg')}`

        if (storageProvider === 'firebase') {
          const folderPath = folder ? `media/${folder}/thumbs` : 'media/thumbs'
          const thumbnailPath = `${folderPath}/${thumbnailFileName}`
          const bucket = storage.bucket()
          const thumbRef = bucket.file(thumbnailPath)

          await thumbRef.save(thumbnailBuffer, {
            metadata: { contentType: 'image/jpeg' },
          })

          const [thumbURL] = await thumbRef.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
          })

          thumbnailUrl = thumbURL
        } else {
          const thumbDir = join(
            process.cwd(),
            'public',
            'uploads',
            folder || '',
            'thumbs'
          )
          await mkdir(thumbDir, { recursive: true })

          const thumbPath = join(thumbDir, thumbnailFileName)
          await writeFile(thumbPath, thumbnailBuffer)

          thumbnailUrl = `/uploads/${folder ? folder + '/' : ''}thumbs/${thumbnailFileName}`
        }
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error)
      }
    }

    // Save to database
    const [mediaAsset] = await db
      .insert(mediaAssets)
      .values({
        fileName,
        originalFileName: file.name,
        mimeType: file.type,
        size: file.size,
        url,
        thumbnailUrl,
        width,
        height,
        altText: altText || file.name,
        title: title || file.name,
        description,
        folder,
        tags: tags
          ? tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        storageProvider,
        storagePath,
      })
      .returning()

    revalidatePath('/admin/media')
    return { success: true, media: mediaAsset }
  } catch (error) {
    console.error('Error uploading media:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}

/**
 * Update media metadata
 */
export async function updateMedia(data: UpdateMediaData) {
  try {
    const [updatedMedia] = await db
      .update(mediaAssets)
      .set({
        altText: data.altText,
        title: data.title,
        description: data.description,
        folder: data.folder,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, data.id))
      .returning()

    revalidatePath('/admin/media')
    return { success: true, media: updatedMedia }
  } catch (error) {
    console.error('Error updating media:', error)
    return { success: false, error: 'Failed to update media' }
  }
}

/**
 * Delete media asset
 */
export async function deleteMedia(id: string) {
  try {
    // Get media asset details
    const mediaAsset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, id),
    })

    if (!mediaAsset) {
      return { success: false, error: 'Media not found' }
    }

    // Check if media is being used
    const associations = await db
      .select()
      .from(mediaAssociations)
      .where(eq(mediaAssociations.mediaAssetId, id))
      .limit(1)

    if (associations.length > 0) {
      return {
        success: false,
        error: 'Cannot delete media that is currently in use',
      }
    }

    // Delete from storage
    try {
      if (mediaAsset.storageProvider === 'firebase' && isFirebaseConfigured()) {
        const bucket = storage.bucket()
        await bucket.file(mediaAsset.storagePath).delete()

        // Delete thumbnail if exists
        if (mediaAsset.thumbnailUrl) {
          const thumbnailPath = mediaAsset.storagePath
            .replace('/media/', '/media/thumbs/')
            .replace(/\.[^/.]+$/, '.jpg')
          await bucket.file(thumbnailPath).delete()
        }
      }
      // For local storage, files will be cleaned up by a separate cleanup job
    } catch (storageError) {
      console.warn('Failed to delete from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id))

    revalidatePath('/admin/media')
    return { success: true }
  } catch (error) {
    console.error('Error deleting media:', error)
    return { success: false, error: 'Failed to delete media' }
  }
}

/**
 * Bulk delete media assets
 */
export async function bulkDeleteMedia(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, error: 'No media selected' }
  }

  try {
    // Check for associations
    const associations = await db
      .select()
      .from(mediaAssociations)
      .where(sql`${mediaAssociations.mediaAssetId} = ANY(${ids})`)
      .limit(1)

    if (associations.length > 0) {
      return {
        success: false,
        error: 'Some media files are currently in use and cannot be deleted',
      }
    }

    // Get media assets for storage cleanup
    const mediaAssets_data = await db
      .select()
      .from(mediaAssets)
      .where(sql`${mediaAssets.id} = ANY(${ids})`)

    // Delete from storage (best effort)
    for (const asset of mediaAssets_data) {
      try {
        if (asset.storageProvider === 'firebase' && isFirebaseConfigured()) {
          const bucket = storage.bucket()
          await bucket.file(asset.storagePath).delete()

          if (asset.thumbnailUrl) {
            const thumbnailPath = asset.storagePath
              .replace('/media/', '/media/thumbs/')
              .replace(/\.[^/.]+$/, '.jpg')
            await bucket.file(thumbnailPath).delete()
          }
        }
      } catch (storageError) {
        console.warn(
          `Failed to delete ${asset.fileName} from storage:`,
          storageError
        )
      }
    }

    // Delete from database
    await db.delete(mediaAssets).where(sql`${mediaAssets.id} = ANY(${ids})`)

    revalidatePath('/admin/media')
    return { success: true, deletedCount: ids.length }
  } catch (error) {
    console.error('Error bulk deleting media:', error)
    return { success: false, error: 'Failed to delete media files' }
  }
}

/**
 * Associate media with an entity (product, collection, etc.)
 */
export async function associateMedia(
  mediaAssetId: string,
  entityType: string,
  entityId: string,
  type: string = 'image',
  position: number = 0,
  isPrimary: boolean = false
) {
  try {
    // If this is set as primary, remove primary flag from other associations
    if (isPrimary) {
      await db
        .update(mediaAssociations)
        .set({ isPrimary: false })
        .where(
          and(
            eq(mediaAssociations.entityType, entityType),
            eq(mediaAssociations.entityId, entityId),
            eq(mediaAssociations.type, type)
          )
        )
    }

    const [association] = await db
      .insert(mediaAssociations)
      .values({
        mediaAssetId,
        entityType,
        entityId,
        type,
        position,
        isPrimary,
      })
      .returning()

    // Update usage count
    await db
      .update(mediaAssets)
      .set({
        usageCount: sql`${mediaAssets.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaAssetId))

    revalidatePath('/admin/media')
    return { success: true, association }
  } catch (error) {
    console.error('Error associating media:', error)
    return { success: false, error: 'Failed to associate media' }
  }
}

/**
 * Remove media association
 */
export async function removeMediaAssociation(
  mediaAssetId: string,
  entityType: string,
  entityId: string
) {
  try {
    await db
      .delete(mediaAssociations)
      .where(
        and(
          eq(mediaAssociations.mediaAssetId, mediaAssetId),
          eq(mediaAssociations.entityType, entityType),
          eq(mediaAssociations.entityId, entityId)
        )
      )

    // Update usage count
    await db
      .update(mediaAssets)
      .set({
        usageCount: sql`GREATEST(${mediaAssets.usageCount} - 1, 0)`,
        lastUsedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaAssetId))

    revalidatePath('/admin/media')
    return { success: true }
  } catch (error) {
    console.error('Error removing media association:', error)
    return { success: false, error: 'Failed to remove media association' }
  }
}

/**
 * Create folder
 */
export async function createMediaFolder(name: string, parentFolder?: string) {
  try {
    const folderPath = parentFolder ? `${parentFolder}/${name}` : name

    // Create folder in storage if using Firebase
    if (isFirebaseConfigured()) {
      const bucket = storage.bucket()
      const folderRef = bucket.file(`media/${folderPath}/.keep`)
      await folderRef.save('', {
        metadata: { contentType: 'text/plain' },
      })
    }

    return { success: true, folder: folderPath }
  } catch (error) {
    console.error('Error creating folder:', error)
    return { success: false, error: 'Failed to create folder' }
  }
}
