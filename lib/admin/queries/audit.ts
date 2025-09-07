import { db } from '@/db'
import { eq, desc, asc, and, or, gte, lte, ilike, sql, count } from 'drizzle-orm'
import { auditLogs, auditLogBulkOperations, userSessions } from '@/db/schema/audit'

export interface AuditLogFilter {
  search?: string
  userId?: string
  action?: string
  resourceType?: string
  status?: 'success' | 'error' | 'partial'
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'timestamp' | 'action' | 'userId' | 'resourceType'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AuditLogResponse {
  logs: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filters: AuditLogFilter = {}): Promise<AuditLogResponse> {
  const {
    search,
    userId,
    action,
    resourceType,
    status,
    dateFrom,
    dateTo,
    sortBy = 'timestamp',
    sortOrder = 'desc',
    page = 1,
    limit = 50
  } = filters

  try {
    let query = db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userEmail: auditLogs.userEmail,
      userName: auditLogs.userName,
      userRole: auditLogs.userRole,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      resourceTitle: auditLogs.resourceTitle,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      ipAddress: auditLogs.ipAddress,
      status: auditLogs.status,
      errorMessage: auditLogs.errorMessage,
      timestamp: auditLogs.timestamp,
      duration: auditLogs.duration
    }).from(auditLogs)

    // Apply filters
    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.userEmail, `%${search}%`),
          ilike(auditLogs.userName, `%${search}%`),
          ilike(auditLogs.action, `%${search}%`),
          ilike(auditLogs.resourceType, `%${search}%`),
          ilike(auditLogs.resourceTitle, `%${search}%`),
          ilike(auditLogs.ipAddress, `%${search}%`)
        )
      )
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId))
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action))
    }

    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType))
    }

    if (status) {
      conditions.push(eq(auditLogs.status, status))
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.timestamp, dateFrom))
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.timestamp, dateTo))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'action':
        orderColumn = auditLogs.action
        break
      case 'userId':
        orderColumn = auditLogs.userId
        break
      case 'resourceType':
        orderColumn = auditLogs.resourceType
        break
      default:
        orderColumn = auditLogs.timestamp
    }

    query = sortOrder === 'desc' 
      ? query.orderBy(desc(orderColumn))
      : query.orderBy(asc(orderColumn))

    // Get paginated results and total count
    const [logsResult, totalResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      db.select({ count: count() })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    ])

    const total = totalResult[0]?.count || 0

    return {
      logs: logsResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    // Return empty results if table doesn't exist or has schema issues
    return {
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 }
    }
  }
}

/**
 * Get audit log by ID with bulk operation details
 */
export async function getAuditLogById(id: string) {
  try {
    const auditLog = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1)
    
    if (!auditLog[0]) {
      return null
    }

    // Get bulk operation items if this was a bulk operation
    const bulkItems = await db.select()
      .from(auditLogBulkOperations)
      .where(eq(auditLogBulkOperations.auditLogId, id))
      .orderBy(auditLogBulkOperations.createdAt)

    return {
      ...auditLog[0],
      bulkItems: bulkItems.length > 0 ? bulkItems : undefined
    }
  } catch (error) {
    console.error('Error fetching audit log by ID:', error)
    return null
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats(days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [
      totalActions,
      actionsByType,
      actionsByUser,
      errorActions,
      recentActions
    ] = await Promise.all([
      // Total actions in period
      db.select({ count: count() })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate)),

      // Actions by type
      db.select({ 
        action: auditLogs.action, 
        count: count() 
      })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate))
        .groupBy(auditLogs.action)
        .orderBy(desc(count()))
        .limit(10),

      // Actions by user
      db.select({ 
        userEmail: auditLogs.userEmail,
        userName: auditLogs.userName, 
        count: count() 
      })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate))
        .groupBy(auditLogs.userEmail, auditLogs.userName)
        .orderBy(desc(count()))
        .limit(10),

      // Error actions
      db.select({ count: count() })
        .from(auditLogs)
        .where(and(
          gte(auditLogs.timestamp, startDate),
          eq(auditLogs.status, 'error')
        )),

      // Recent actions (last 10)
      db.select({
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        userEmail: auditLogs.userEmail,
        timestamp: auditLogs.timestamp
      })
        .from(auditLogs)
        .orderBy(desc(auditLogs.timestamp))
        .limit(10)
    ])

    return {
      totalActions: totalActions[0]?.count || 0,
      errorActions: errorActions[0]?.count || 0,
      successRate: totalActions[0]?.count 
        ? ((totalActions[0].count - (errorActions[0]?.count || 0)) / totalActions[0].count * 100)
        : 100,
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item.count
      })),
      actionsByUser: actionsByUser.map(item => ({
        user: item.userName || item.userEmail,
        email: item.userEmail,
        count: item.count
      })),
      recentActions
    }
  } catch (error) {
    console.error('Error fetching audit stats:', error)
    // Return default stats if table doesn't exist or has schema issues
    return {
      totalActions: 0,
      errorActions: 0,
      successRate: 100,
      actionsByType: [],
      actionsByUser: [],
      recentActions: []
    }
  }
}

/**
 * Get user sessions with filtering
 */
export async function getUserSessions(filters: {
  userId?: string
  status?: 'active' | 'expired' | 'terminated'
  page?: number
  limit?: number
} = {}) {
  const {
    userId,
    status,
    page = 1,
    limit = 50
  } = filters

  try {
    let query = db.select().from(userSessions)

    const conditions = []

    if (userId) {
      conditions.push(eq(userSessions.userId, userId))
    }

    if (status) {
      conditions.push(eq(userSessions.status, status))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    query = query.orderBy(desc(userSessions.lastActiveAt))

    const [sessions, total] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      db.select({ count: count() })
        .from(userSessions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    ])

    return {
      sessions,
      pagination: {
        page,
        limit,
        total: total[0]?.count || 0,
        pages: Math.ceil((total[0]?.count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return {
      sessions: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 }
    }
  }
}

/**
 * Get unique action types for filtering
 */
export async function getAuditActionTypes() {
  try {
    const result = await db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .orderBy(auditLogs.action)

    return result.map(r => r.action).filter(Boolean)
  } catch (error) {
    console.error('Error fetching audit action types:', error)
    // Return empty array if table doesn't exist or has schema issues
    return []
  }
}

/**
 * Get unique resource types for filtering
 */
export async function getAuditResourceTypes() {
  try {
    const result = await db
      .selectDistinct({ resourceType: auditLogs.resourceType })
      .from(auditLogs)
      .orderBy(auditLogs.resourceType)

    return result.map(r => r.resourceType).filter(Boolean)
  } catch (error) {
    console.error('Error fetching audit resource types:', error)
    // Return empty array if table doesn't exist or has schema issues
    return []
  }
}