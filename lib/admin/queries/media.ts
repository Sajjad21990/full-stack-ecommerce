import { db } from '@/db'
import { eq, ilike, sql, desc, asc, and, or, inArray, isNull } from 'drizzle-orm'
import { mediaAssets, mediaAssociations } from '@/db/schema/media-metadata'

export interface MediaFilter {
  search?: string
  folder?: string
  mimeType?: string
  tags?: string[]
  status?: 'active' | 'archived' | 'deleted'
  sortBy?: 'createdAt' | 'fileName' | 'size' | 'usageCount'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface MediaResponse {
  media: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    totalFiles: number
    totalSize: number
    byMimeType: Record<string, number>
    byFolder: Record<string, number>
  }
}

/**
 * Get media assets with filters and pagination
 */
export async function getMediaAssets(filters: MediaFilter = {}): Promise<MediaResponse> {
  const {
    search,
    folder,
    mimeType,
    tags,
    status = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 24
  } = filters

  try {
    let query = db.select({
      id: mediaAssets.id,
      fileName: mediaAssets.fileName,
      originalFileName: mediaAssets.originalFileName,
      mimeType: mediaAssets.mimeType,
      size: mediaAssets.size,
      url: mediaAssets.url,
      thumbnailUrl: mediaAssets.thumbnailUrl,
      width: mediaAssets.width,
      height: mediaAssets.height,
      altText: mediaAssets.altText,
      folder: mediaAssets.folder,
      tags: mediaAssets.tags,
      status: mediaAssets.status,
      usageCount: mediaAssets.usageCount,
      lastUsedAt: mediaAssets.lastUsedAt,
      title: mediaAssets.title,
      description: mediaAssets.description,
      createdAt: mediaAssets.createdAt,
      updatedAt: mediaAssets.updatedAt
    }).from(mediaAssets)

    // Apply filters
    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(mediaAssets.fileName, `%${search}%`),
          ilike(mediaAssets.originalFileName, `%${search}%`),
          ilike(mediaAssets.altText, `%${search}%`),
          ilike(mediaAssets.title, `%${search}%`)
        )
      )
    }

    if (folder) {
      if (folder === 'root') {
        conditions.push(isNull(mediaAssets.folder))
      } else {
        conditions.push(eq(mediaAssets.folder, folder))
      }
    }

    if (mimeType) {
      conditions.push(eq(mediaAssets.mimeType, mimeType))
    }

    if (tags && tags.length > 0) {
      // Check if any of the provided tags exist in the media tags array
      conditions.push(
        sql`${mediaAssets.tags} && ${tags}`
      )
    }

    if (status) {
      conditions.push(eq(mediaAssets.status, status))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'fileName':
        orderColumn = mediaAssets.fileName
        break
      case 'size':
        orderColumn = mediaAssets.size
        break
      case 'usageCount':
        orderColumn = mediaAssets.usageCount
        break
      default:
        orderColumn = mediaAssets.createdAt
    }

    query = sortOrder === 'desc' 
      ? query.orderBy(desc(orderColumn))
      : query.orderBy(asc(orderColumn))

    // Get paginated results and total count
    const [mediaResult, totalResult, statsResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(mediaAssets)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      getMediaStats(conditions.length > 0 ? and(...conditions) : undefined)
    ])

    const total = totalResult[0]?.count || 0

    return {
      media: mediaResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: statsResult
    }
  } catch (error) {
    console.error('Error fetching media assets:', error)
    return {
      media: [],
      pagination: { page: 1, limit: 24, total: 0, pages: 0 },
      stats: { totalFiles: 0, totalSize: 0, byMimeType: {}, byFolder: {} }
    }
  }
}

/**
 * Get media asset by ID with associations
 */
export async function getMediaAssetById(id: string) {
  try {
    const mediaAsset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, id),
      with: {
        associations: true
      }
    })

    if (mediaAsset) {
      // Get usage information
      const associations = await db.select({
        entityType: mediaAssociations.entityType,
        entityId: mediaAssociations.entityId,
        type: mediaAssociations.type,
        isPrimary: mediaAssociations.isPrimary
      })
      .from(mediaAssociations)
      .where(eq(mediaAssociations.mediaAssetId, id))

      return {
        ...mediaAsset,
        associations
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching media asset:', error)
    return null
  }
}

/**
 * Get media stats for dashboard
 */
async function getMediaStats(whereCondition?: any) {
  try {
    const baseCondition = whereCondition ? whereCondition : undefined

    const [totalStats, mimeTypeStats, folderStats] = await Promise.all([
      // Total files and size
      db.select({
        count: sql<number>`count(*)`,
        totalSize: sql<number>`sum(${mediaAssets.size})`
      })
      .from(mediaAssets)
      .where(baseCondition)
      .limit(1),
      
      // By MIME type
      db.select({
        mimeType: mediaAssets.mimeType,
        count: sql<number>`count(*)`
      })
      .from(mediaAssets)
      .where(baseCondition)
      .groupBy(mediaAssets.mimeType),
      
      // By folder
      db.select({
        folder: mediaAssets.folder,
        count: sql<number>`count(*)`
      })
      .from(mediaAssets)
      .where(baseCondition)
      .groupBy(mediaAssets.folder)
    ])

    const total = totalStats[0]
    const byMimeType = mimeTypeStats.reduce((acc, item) => {
      acc[item.mimeType] = item.count
      return acc
    }, {} as Record<string, number>)

    const byFolder = folderStats.reduce((acc, item) => {
      const folder = item.folder || 'root'
      acc[folder] = item.count
      return acc
    }, {} as Record<string, number>)

    return {
      totalFiles: total?.count || 0,
      totalSize: total?.totalSize || 0,
      byMimeType,
      byFolder
    }
  } catch (error) {
    console.error('Error fetching media stats:', error)
    return {
      totalFiles: 0,
      totalSize: 0,
      byMimeType: {},
      byFolder: {}
    }
  }
}

/**
 * Get available folders
 */
export async function getMediaFolders() {
  try {
    const folders = await db
      .selectDistinct({ folder: mediaAssets.folder })
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.status, 'active'),
        sql`${mediaAssets.folder} IS NOT NULL`
      ))
      .orderBy(asc(mediaAssets.folder))

    return folders.map(f => f.folder).filter(Boolean)
  } catch (error) {
    console.error('Error fetching media folders:', error)
    return []
  }
}

/**
 * Get available tags
 */
export async function getMediaTags() {
  try {
    const result = await db
      .select({ tags: mediaAssets.tags })
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.status, 'active'),
        sql`${mediaAssets.tags} IS NOT NULL AND array_length(${mediaAssets.tags}, 1) > 0`
      ))

    // Flatten and deduplicate tags
    const allTags = result
      .flatMap(r => r.tags || [])
      .filter(Boolean)
    
    return [...new Set(allTags)].sort()
  } catch (error) {
    console.error('Error fetching media tags:', error)
    return []
  }
}

/**
 * Search media for product assignment
 */
export async function searchMediaForProducts(query?: string, limit: number = 20) {
  try {
    let searchQuery = db.select({
      id: mediaAssets.id,
      fileName: mediaAssets.fileName,
      originalFileName: mediaAssets.originalFileName,
      url: mediaAssets.url,
      thumbnailUrl: mediaAssets.thumbnailUrl,
      mimeType: mediaAssets.mimeType,
      width: mediaAssets.width,
      height: mediaAssets.height,
      altText: mediaAssets.altText
    })
    .from(mediaAssets)
    .where(and(
      eq(mediaAssets.status, 'active'),
      sql`${mediaAssets.mimeType} LIKE 'image/%'` // Only images for products
    ))
    .orderBy(desc(mediaAssets.createdAt))

    if (query) {
      searchQuery = searchQuery.where(
        and(
          eq(mediaAssets.status, 'active'),
          sql`${mediaAssets.mimeType} LIKE 'image/%'`,
          or(
            ilike(mediaAssets.fileName, `%${query}%`),
            ilike(mediaAssets.originalFileName, `%${query}%`),
            ilike(mediaAssets.altText, `%${query}%`)
          )
        )
      )
    }

    return await searchQuery.limit(limit)
  } catch (error) {
    console.error('Error searching media for products:', error)
    return []
  }
}