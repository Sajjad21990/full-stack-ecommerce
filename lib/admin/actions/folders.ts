'use server'

import { db } from '@/db'
import { eq, and, sql, like, desc } from 'drizzle-orm'
import { mediaFolders } from '@/db/schema/folders'
import { mediaAssets } from '@/db/schema/media-metadata'
import { revalidatePath } from 'next/cache'
import { storage, isFirebaseConfigured } from '@/lib/firebase-admin'
import { requireAdmin } from '@/lib/auth'

/**
 * Check database connection health
 */
async function checkDatabaseConnection() {
  try {
    await db.select().from(mediaFolders).limit(1)
    console.log('[checkDatabaseConnection] Database connection is healthy')
    return true
  } catch (error) {
    console.error('[checkDatabaseConnection] Database connection failed:', {
      error: error,
      message: error.message,
      code: error.code,
    })
    return false
  }
}

interface CreateFolderData {
  name: string
  parentId?: string
}

interface MoveFolderData {
  folderId: string
  newParentId?: string
}

/**
 * Create a new folder
 */
export async function createMediaFolder(data: CreateFolderData) {
  try {
    console.log('[createMediaFolder] Starting folder creation with data:', {
      name: data.name,
      parentId: data.parentId,
      environment: process.env.NODE_ENV,
      railway: !!process.env.RAILWAY_ENVIRONMENT,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
    })

    // Check database connection first
    const dbHealthy = await checkDatabaseConnection()
    if (!dbHealthy) {
      return {
        success: false,
        error: 'Database connection failed. Please try again.',
      }
    }

    await requireAdmin()

    const { name, parentId } = data

    // Validate folder name
    if (!name.trim()) {
      console.log('[createMediaFolder] Validation failed: Empty folder name')
      return { success: false, error: 'Folder name is required' }
    }

    // Sanitize folder name
    const sanitizedName = name
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')

    console.log('[createMediaFolder] Sanitized name:', {
      original: name,
      sanitized: sanitizedName,
    })

    if (!sanitizedName) {
      console.log(
        '[createMediaFolder] Validation failed: Invalid folder name after sanitization'
      )
      return { success: false, error: 'Invalid folder name' }
    }

    // Calculate path and depth
    let fullPath = sanitizedName
    let depth = 0

    if (parentId) {
      console.log('[createMediaFolder] Looking up parent folder:', parentId)

      try {
        const parentFolder = await db
          .select()
          .from(mediaFolders)
          .where(eq(mediaFolders.id, parentId))
          .limit(1)

        if (parentFolder.length === 0) {
          console.log('[createMediaFolder] Parent folder not found:', parentId)
          return { success: false, error: 'Parent folder not found' }
        }

        const parent = parentFolder[0]
        fullPath =
          parent.path === 'root'
            ? sanitizedName
            : `${parent.path}/${sanitizedName}`
        depth = parseInt(parent.depth) + 1

        console.log('[createMediaFolder] Calculated path:', {
          fullPath,
          depth,
          parentPath: parent.path,
        })

        if (depth > 10) {
          console.log(
            '[createMediaFolder] Validation failed: Maximum depth exceeded',
            depth
          )
          return { success: false, error: 'Maximum folder depth exceeded' }
        }
      } catch (dbError) {
        console.error(
          '[createMediaFolder] Database error while fetching parent:',
          dbError
        )
        return {
          success: false,
          error: 'Database error while validating parent folder',
        }
      }
    }

    // Check for duplicate folder names in the same parent
    console.log(
      '[createMediaFolder] Checking for duplicates at path:',
      fullPath
    )

    try {
      const existingFolder = await db
        .select()
        .from(mediaFolders)
        .where(
          and(
            eq(mediaFolders.path, fullPath),
            eq(mediaFolders.isDeleted, false)
          )
        )
        .limit(1)

      if (existingFolder.length > 0) {
        console.log(
          '[createMediaFolder] Duplicate folder found:',
          existingFolder[0]
        )
        return {
          success: false,
          error: 'A folder with this name already exists',
        }
      }
    } catch (dbError) {
      console.error(
        '[createMediaFolder] Database error while checking duplicates:',
        dbError
      )
      return {
        success: false,
        error: 'Database error while checking for duplicates',
      }
    }

    // Create folder in database
    console.log(
      '[createMediaFolder] Creating folder in database with values:',
      {
        name: sanitizedName,
        path: fullPath,
        parentId: parentId || null,
        depth: depth.toString(),
      }
    )

    try {
      const [folder] = await db
        .insert(mediaFolders)
        .values({
          name: sanitizedName,
          path: fullPath,
          parentId: parentId || null,
          depth: depth.toString(),
        })
        .returning()

      console.log(
        '[createMediaFolder] Successfully created folder in database:',
        folder.id
      )

      // Create folder in Firebase Storage if configured
      if (isFirebaseConfigured()) {
        console.log('[createMediaFolder] Creating folder in Firebase Storage')
        try {
          const bucket = storage.bucket()
          const folderRef = bucket.file(`media/${fullPath}/.keep`)
          await folderRef.save('', {
            metadata: { contentType: 'text/plain' },
          })
          console.log(
            '[createMediaFolder] Successfully created folder in Firebase'
          )
        } catch (firebaseError) {
          console.warn(
            '[createMediaFolder] Failed to create folder in Firebase (non-critical):',
            firebaseError
          )
          // Don't fail the operation if Firebase creation fails
        }
      } else {
        console.log(
          '[createMediaFolder] Firebase not configured, skipping storage folder creation'
        )
      }

      revalidatePath('/admin/media')
      console.log('[createMediaFolder] Folder creation completed successfully')
      return { success: true, folder }
    } catch (dbError) {
      console.error(
        '[createMediaFolder] Database error during folder insertion:',
        {
          error: dbError,
          message: dbError.message,
          code: dbError.code,
          constraint: dbError.constraint,
          table: dbError.table,
          column: dbError.column,
        }
      )

      // Provide more specific error messages based on database errors
      if (dbError.code === '23505') {
        // Unique constraint violation
        return {
          success: false,
          error: 'A folder with this name already exists',
        }
      } else if (dbError.code === '23503') {
        // Foreign key constraint violation
        return { success: false, error: 'Invalid parent folder reference' }
      } else if (dbError.code === '23502') {
        // Not null constraint violation
        return { success: false, error: 'Missing required folder information' }
      } else {
        return {
          success: false,
          error: `Database error: ${dbError.message || 'Unknown database error'}`,
        }
      }
    }
  } catch (error) {
    console.error(
      '[createMediaFolder] Unexpected error during folder creation:',
      {
        error: error,
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    )
    return {
      success: false,
      error: `Failed to create folder: ${error.message || 'Unknown error'}`,
    }
  }
}

/**
 * Get folder tree structure
 */
export async function getFolderTree() {
  try {
    await requireAdmin()

    const folders = await db
      .select({
        id: mediaFolders.id,
        name: mediaFolders.name,
        path: mediaFolders.path,
        parentId: mediaFolders.parentId,
        depth: mediaFolders.depth,
        createdAt: mediaFolders.createdAt,
        // Count files in folder
        fileCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${mediaAssets}
          WHERE folder = ${mediaFolders.path}
          AND status = 'active'
        )`,
        // Count subfolders
        subfolderCount: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${mediaFolders} AS sub
          WHERE sub.parent_id = ${mediaFolders.id}
          AND sub.is_deleted = false
        )`,
      })
      .from(mediaFolders)
      .where(eq(mediaFolders.isDeleted, false))
      .orderBy(mediaFolders.depth, mediaFolders.name)

    // Build tree structure
    const folderMap = new Map()
    const rootFolders: any[] = []

    // First pass: create all folder objects
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        totalFiles: folder.fileCount,
        totalFolders: folder.subfolderCount,
      })
    })

    // Second pass: build hierarchy
    folders.forEach((folder) => {
      const folderObj = folderMap.get(folder.id)

      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children.push(folderObj)
        }
      } else {
        rootFolders.push(folderObj)
      }
    })

    return { success: true, folders: rootFolders }
  } catch (error) {
    console.error('Error fetching folder tree:', error)
    return { success: false, error: 'Failed to fetch folders', folders: [] }
  }
}

/**
 * Delete a folder and all its contents
 */
export async function deleteMediaFolder(folderId: string) {
  try {
    await requireAdmin()

    const folder = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, folderId))
      .limit(1)

    if (folder.length === 0) {
      return { success: false, error: 'Folder not found' }
    }

    const folderData = folder[0]

    // Get all subfolders and files
    const subfolders = await db
      .select()
      .from(mediaFolders)
      .where(
        and(
          like(mediaFolders.path, `${folderData.path}%`),
          eq(mediaFolders.isDeleted, false)
        )
      )

    const files = await db
      .select()
      .from(mediaAssets)
      .where(like(mediaAssets.folder, `${folderData.path}%`))

    // Check if any files are in use
    const filesInUse = files.filter((file) => file.usageCount > 0)
    if (filesInUse.length > 0) {
      return {
        success: false,
        error: `Cannot delete folder. ${filesInUse.length} file(s) are currently in use.`,
      }
    }

    // Delete from Firebase Storage if configured
    if (isFirebaseConfigured()) {
      try {
        const bucket = storage.bucket()

        // Delete all files in the folder
        for (const file of files) {
          try {
            await bucket.file(file.storagePath).delete()
            if (file.thumbnailUrl) {
              const thumbnailPath = file.storagePath
                .replace('/media/', '/media/thumbs/')
                .replace(/\.[^/.]+$/, '.jpg')
              await bucket.file(thumbnailPath).delete()
            }
          } catch (error) {
            console.warn(`Failed to delete file ${file.fileName}:`, error)
          }
        }

        // Delete folder placeholder files
        for (const subfolder of subfolders) {
          try {
            await bucket.file(`media/${subfolder.path}/.keep`).delete()
          } catch (error) {
            console.warn(`Failed to delete folder ${subfolder.path}:`, error)
          }
        }
      } catch (error) {
        console.warn('Failed to delete from Firebase:', error)
      }
    }

    // Mark folders as deleted
    await db
      .update(mediaFolders)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(like(mediaFolders.path, `${folderData.path}%`))

    // Delete media files
    await db
      .delete(mediaAssets)
      .where(like(mediaAssets.folder, `${folderData.path}%`))

    revalidatePath('/admin/media')
    return {
      success: true,
      message: `Deleted folder "${folderData.name}" and ${files.length} file(s)`,
    }
  } catch (error) {
    console.error('Error deleting folder:', error)
    return { success: false, error: 'Failed to delete folder' }
  }
}

/**
 * Move a folder to a new parent
 */
export async function moveMediaFolder(data: MoveFolderData) {
  try {
    await requireAdmin()

    const { folderId, newParentId } = data

    const folder = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, folderId))
      .limit(1)

    if (folder.length === 0) {
      return { success: false, error: 'Folder not found' }
    }

    const folderData = folder[0]
    let newPath = folderData.name
    let newDepth = 0

    if (newParentId) {
      // Check if trying to move to a descendant (would create a loop)
      const descendants = await db
        .select()
        .from(mediaFolders)
        .where(like(mediaFolders.path, `${folderData.path}/%`))

      if (descendants.some((desc) => desc.id === newParentId)) {
        return {
          success: false,
          error: 'Cannot move folder to its own descendant',
        }
      }

      const newParent = await db
        .select()
        .from(mediaFolders)
        .where(eq(mediaFolders.id, newParentId))
        .limit(1)

      if (newParent.length === 0) {
        return { success: false, error: 'New parent folder not found' }
      }

      const parent = newParent[0]
      newPath =
        parent.path === 'root'
          ? folderData.name
          : `${parent.path}/${folderData.name}`
      newDepth = parseInt(parent.depth) + 1

      if (newDepth > 10) {
        return { success: false, error: 'Maximum folder depth exceeded' }
      }
    }

    // Check for duplicate names
    const duplicate = await db
      .select()
      .from(mediaFolders)
      .where(
        and(eq(mediaFolders.path, newPath), eq(mediaFolders.isDeleted, false))
      )
      .limit(1)

    if (duplicate.length > 0 && duplicate[0].id !== folderId) {
      return {
        success: false,
        error: 'A folder with this name already exists in the destination',
      }
    }

    // Update folder and all its descendants
    const oldPath = folderData.path
    const pathDifference = newPath.length - oldPath.length

    // Get all descendants
    const descendants = await db
      .select()
      .from(mediaFolders)
      .where(like(mediaFolders.path, `${oldPath}%`))

    // Update each descendant's path
    for (const desc of descendants) {
      const updatedPath = desc.path.replace(oldPath, newPath)
      const updatedDepth =
        parseInt(desc.depth) + (newDepth - parseInt(folderData.depth))

      await db
        .update(mediaFolders)
        .set({
          path: updatedPath,
          depth: updatedDepth.toString(),
          parentId: desc.id === folderId ? newParentId : desc.parentId,
          updatedAt: new Date(),
        })
        .where(eq(mediaFolders.id, desc.id))
    }

    // Update media files
    await db
      .update(mediaAssets)
      .set({
        folder: sql`REPLACE(folder, ${oldPath}, ${newPath})`,
        updatedAt: new Date(),
      })
      .where(like(mediaAssets.folder, `${oldPath}%`))

    revalidatePath('/admin/media')
    return { success: true, message: 'Folder moved successfully' }
  } catch (error) {
    console.error('Error moving folder:', error)
    return { success: false, error: 'Failed to move folder' }
  }
}

/**
 * Rename a folder
 */
export async function renameMediaFolder(folderId: string, newName: string) {
  try {
    await requireAdmin()

    const sanitizedName = newName
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')

    if (!sanitizedName) {
      return { success: false, error: 'Invalid folder name' }
    }

    const folder = await db
      .select()
      .from(mediaFolders)
      .where(eq(mediaFolders.id, folderId))
      .limit(1)

    if (folder.length === 0) {
      return { success: false, error: 'Folder not found' }
    }

    const folderData = folder[0]
    const pathParts = folderData.path.split('/')
    pathParts[pathParts.length - 1] = sanitizedName
    const newPath = pathParts.join('/')

    // Check for duplicates
    const duplicate = await db
      .select()
      .from(mediaFolders)
      .where(
        and(eq(mediaFolders.path, newPath), eq(mediaFolders.isDeleted, false))
      )
      .limit(1)

    if (duplicate.length > 0) {
      return { success: false, error: 'A folder with this name already exists' }
    }

    // Update folder and descendants
    const oldPath = folderData.path
    const descendants = await db
      .select()
      .from(mediaFolders)
      .where(like(mediaFolders.path, `${oldPath}%`))

    for (const desc of descendants) {
      const updatedPath = desc.path.replace(oldPath, newPath)

      await db
        .update(mediaFolders)
        .set({
          name: desc.id === folderId ? sanitizedName : desc.name,
          path: updatedPath,
          updatedAt: new Date(),
        })
        .where(eq(mediaFolders.id, desc.id))
    }

    // Update media files
    await db
      .update(mediaAssets)
      .set({
        folder: sql`REPLACE(folder, ${oldPath}, ${newPath})`,
        updatedAt: new Date(),
      })
      .where(like(mediaAssets.folder, `${oldPath}%`))

    revalidatePath('/admin/media')
    return { success: true, message: 'Folder renamed successfully' }
  } catch (error) {
    console.error('Error renaming folder:', error)
    return { success: false, error: 'Failed to rename folder' }
  }
}
