import { db } from '@/db'
import { auditLogs, auditLogBulkOperations, userSessions } from '@/db/schema/audit'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { headers } from 'next/headers'
import { createId } from '@paralleldrive/cuid2'

export interface AuditLogEntry {
  action: string
  resourceType: string
  resourceId?: string
  resourceTitle?: string
  changes?: {
    before?: any
    after?: any
  }
  metadata?: Record<string, any>
  requestId?: string
  status?: 'success' | 'error' | 'partial'
  errorMessage?: string
  duration?: string
}

export interface BulkOperationItem {
  resourceId: string
  resourceTitle?: string
  status: 'success' | 'error' | 'skipped'
  errorMessage?: string
  changes?: any
}

/**
 * Get request context (IP, User-Agent, etc.)
 */
function getRequestContext() {
  const headersList = headers()
  
  return {
    ipAddress: headersList.get('x-forwarded-for') || 
               headersList.get('x-real-ip') || 
               headersList.get('x-client-ip') || 
               'unknown',
    userAgent: headersList.get('user-agent') || 'unknown'
  }
}

/**
 * Get current user session info
 */
async function getCurrentUserInfo() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      throw new Error('No authenticated user')
    }
    
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      userRole: session.user.role
    }
  } catch (error) {
    console.error('Failed to get user info for audit log:', error)
    return {
      userId: 'system',
      userEmail: 'system@localhost',
      userName: 'System',
      userRole: 'system'
    }
  }
}

/**
 * Log a single admin action
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<string | null> {
  try {
    const startTime = Date.now()
    const userInfo = await getCurrentUserInfo()
    const requestContext = getRequestContext()
    
    const [auditLog] = await db.insert(auditLogs).values({
      ...userInfo,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      resourceTitle: entry.resourceTitle,
      changes: entry.changes,
      metadata: entry.metadata,
      requestId: entry.requestId || createId(),
      status: entry.status || 'success',
      errorMessage: entry.errorMessage,
      duration: entry.duration || `${Date.now() - startTime}ms`,
      ...requestContext
    }).returning({ id: auditLogs.id })
    
    return auditLog.id
  } catch (error) {
    console.error('Failed to log audit action:', error)
    return null
  }
}

/**
 * Log a bulk operation with individual item results
 */
export async function logBulkAuditAction(
  entry: Omit<AuditLogEntry, 'resourceId' | 'resourceTitle'>,
  items: BulkOperationItem[]
): Promise<string | null> {
  try {
    const startTime = Date.now()
    const userInfo = await getCurrentUserInfo()
    const requestContext = getRequestContext()
    
    // Create main audit log entry
    const [auditLog] = await db.insert(auditLogs).values({
      ...userInfo,
      action: entry.action,
      resourceType: entry.resourceType,
      changes: entry.changes,
      metadata: {
        ...entry.metadata,
        totalItems: items.length,
        successCount: items.filter(i => i.status === 'success').length,
        errorCount: items.filter(i => i.status === 'error').length,
        skippedCount: items.filter(i => i.status === 'skipped').length
      },
      requestId: entry.requestId || createId(),
      status: entry.status || (items.every(i => i.status === 'success') ? 'success' : 
              items.some(i => i.status === 'success') ? 'partial' : 'error'),
      errorMessage: entry.errorMessage,
      duration: entry.duration || `${Date.now() - startTime}ms`,
      ...requestContext
    }).returning({ id: auditLogs.id })
    
    // Create individual item entries
    if (items.length > 0) {
      await db.insert(auditLogBulkOperations).values(
        items.map(item => ({
          auditLogId: auditLog.id,
          resourceId: item.resourceId,
          resourceTitle: item.resourceTitle,
          status: item.status,
          errorMessage: item.errorMessage,
          changes: item.changes
        }))
      )
    }
    
    return auditLog.id
  } catch (error) {
    console.error('Failed to log bulk audit action:', error)
    return null
  }
}

/**
 * Convenience functions for common actions
 */
export const auditActions = {
  // Product actions
  productCreated: (productId: string, productTitle: string, productData: any) =>
    logAuditAction({
      action: 'PRODUCT_CREATED',
      resourceType: 'product',
      resourceId: productId,
      resourceTitle: productTitle,
      changes: { after: productData }
    }),
    
  productUpdated: (productId: string, productTitle: string, before: any, after: any) =>
    logAuditAction({
      action: 'PRODUCT_UPDATED',
      resourceType: 'product', 
      resourceId: productId,
      resourceTitle: productTitle,
      changes: { before, after }
    }),
    
  productDeleted: (productId: string, productTitle: string, productData: any) =>
    logAuditAction({
      action: 'PRODUCT_DELETED',
      resourceType: 'product',
      resourceId: productId,
      resourceTitle: productTitle,
      changes: { before: productData }
    }),
    
  // Collection actions
  collectionCreated: (collectionId: string, collectionTitle: string, collectionData: any) =>
    logAuditAction({
      action: 'COLLECTION_CREATED',
      resourceType: 'collection',
      resourceId: collectionId,
      resourceTitle: collectionTitle,
      changes: { after: collectionData }
    }),
    
  collectionUpdated: (collectionId: string, collectionTitle: string, before: any, after: any) =>
    logAuditAction({
      action: 'COLLECTION_UPDATED',
      resourceType: 'collection',
      resourceId: collectionId,
      resourceTitle: collectionTitle,
      changes: { before, after }
    }),
    
  collectionDeleted: (collectionId: string, collectionTitle: string, collectionData: any) =>
    logAuditAction({
      action: 'COLLECTION_DELETED', 
      resourceType: 'collection',
      resourceId: collectionId,
      resourceTitle: collectionTitle,
      changes: { before: collectionData }
    }),
    
  // Media actions
  mediaUploaded: (mediaId: string, fileName: string, mediaData: any) =>
    logAuditAction({
      action: 'MEDIA_UPLOADED',
      resourceType: 'media',
      resourceId: mediaId,
      resourceTitle: fileName,
      changes: { after: mediaData }
    }),
    
  mediaDeleted: (mediaId: string, fileName: string, mediaData: any) =>
    logAuditAction({
      action: 'MEDIA_DELETED',
      resourceType: 'media',
      resourceId: mediaId,
      resourceTitle: fileName,
      changes: { before: mediaData }
    }),
    
  // Bulk actions
  productsBulkUpdated: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'PRODUCTS_BULK_UPDATED',
      resourceType: 'product',
      metadata
    }, items),
    
  productsBulkDeleted: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'PRODUCTS_BULK_DELETED',
      resourceType: 'product',
      metadata
    }, items),
    
  collectionsBulkUpdated: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'COLLECTIONS_BULK_UPDATED',
      resourceType: 'collection',
      metadata
    }, items),
    
  collectionsBulkDeleted: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'COLLECTIONS_BULK_DELETED',
      resourceType: 'collection',
      metadata
    }, items),
    
  categoriesBulkUpdated: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'CATEGORIES_BULK_UPDATED',
      resourceType: 'category',
      metadata
    }, items),
    
  categoriesBulkDeleted: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'CATEGORIES_BULK_DELETED',
      resourceType: 'category',
      metadata
    }, items),
    
  // User actions
  userLogin: (userId: string, userEmail: string) =>
    logAuditAction({
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail
    }),
    
  userLogout: (userId: string, userEmail: string) =>
    logAuditAction({
      action: 'USER_LOGOUT',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail
    }),
    
  // User management actions
  userCreated: (userId: string, userEmail: string, userData: any) =>
    logAuditAction({
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail,
      changes: { after: userData }
    }),
    
  userUpdated: (userId: string, userEmail: string, before: any, after: any) =>
    logAuditAction({
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail,
      changes: { before, after }
    }),
    
  userDeleted: (userId: string, userEmail: string, userData: any) =>
    logAuditAction({
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail,
      changes: { before: userData }
    }),
    
  userSuspended: (userId: string, userEmail: string, metadata: any) =>
    logAuditAction({
      action: 'USER_SUSPENDED',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail,
      metadata
    }),
    
  userReactivated: (userId: string, userEmail: string, metadata: any) =>
    logAuditAction({
      action: 'USER_REACTIVATED',
      resourceType: 'user',
      resourceId: userId,
      resourceTitle: userEmail,
      metadata
    }),
    
  usersBulkUpdated: (items: BulkOperationItem[], metadata?: any) =>
    logBulkAuditAction({
      action: 'USERS_BULK_UPDATED',
      resourceType: 'user',
      metadata
    }, items),
    
  // Settings actions
  settingsUpdated: (section: string, before: any, after: any) =>
    logAuditAction({
      action: 'SETTINGS_UPDATED',
      resourceType: 'settings',
      resourceId: section,
      resourceTitle: `Settings: ${section}`,
      changes: { before, after }
    }),
    
  // Data export/import
  dataExported: (exportType: string, recordCount: number, filters?: any) =>
    logAuditAction({
      action: 'DATA_EXPORTED',
      resourceType: exportType,
      resourceTitle: `${exportType} export`,
      metadata: { recordCount, filters }
    }),
    
  dataImported: (importType: string, recordCount: number, metadata?: any) =>
    logAuditAction({
      action: 'DATA_IMPORTED',
      resourceType: importType, 
      resourceTitle: `${importType} import`,
      metadata: { recordCount, ...metadata }
    })
}

/**
 * Track user session
 */
export async function trackUserSession(sessionToken: string) {
  try {
    const userInfo = await getCurrentUserInfo()
    const requestContext = getRequestContext()
    
    await db.insert(userSessions).values({
      userId: userInfo.userId,
      userEmail: userInfo.userEmail,
      sessionToken,
      ...requestContext
    })
  } catch (error) {
    console.error('Failed to track user session:', error)
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionToken: string) {
  try {
    await db.update(userSessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(userSessions.sessionToken, sessionToken))
  } catch (error) {
    console.error('Failed to update session activity:', error)
  }
}

/**
 * Terminate user session
 */
export async function terminateUserSession(sessionToken: string) {
  try {
    await db.update(userSessions)
      .set({ 
        status: 'terminated',
        terminatedAt: new Date()
      })
      .where(eq(userSessions.sessionToken, sessionToken))
  } catch (error) {
    console.error('Failed to terminate session:', error)
  }
}