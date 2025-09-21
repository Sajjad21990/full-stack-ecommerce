import { db } from '@/db'
import { eq, ilike, sql, desc, asc, and, or, count } from 'drizzle-orm'
import { users } from '@/db/schema/auth'

export interface UsersFilter {
  search?: string
  role?: 'admin' | 'manager' | 'staff' | 'customer'
  status?: 'active' | 'inactive' | 'suspended'
  sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface UsersResponse {
  users: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    totalUsers: number
    adminUsers: number
    activeUsers: number
    byRole: Record<string, number>
  }
}

/**
 * Get users with filters, search, and pagination
 */
export async function getUsers(
  filters: UsersFilter = {}
): Promise<UsersResponse> {
  const {
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = filters

  try {
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)

    // Apply filters
    const conditions = []

    if (search) {
      conditions.push(
        or(ilike(users.email, `%${search}%`), ilike(users.name, `%${search}%`))
      )
    }

    if (role) {
      conditions.push(eq(users.role, role))
    }

    // Note: status field doesn't exist in current schema, but keeping interface for future compatibility
    // if (status) {
    //   conditions.push(eq(users.status, status))
    // }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'name':
        orderColumn = users.name
        break
      case 'email':
        orderColumn = users.email
        break
      case 'role':
        orderColumn = users.role
        break
      // Note: lastLoginAt field doesn't exist in current schema
      // case 'lastLoginAt':
      //   orderColumn = users.lastLoginAt
      //   break
      default:
        orderColumn = users.createdAt
    }

    query =
      sortOrder === 'desc'
        ? query.orderBy(desc(orderColumn))
        : query.orderBy(asc(orderColumn))

    // Get paginated results and stats
    const [usersResult, totalResult, statsResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      db
        .select({ count: count() })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
      getUserStats(),
    ])

    const total = totalResult[0]?.count || 0

    return {
      users: usersResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: statsResult,
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    return {
      users: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      stats: { totalUsers: 0, adminUsers: 0, activeUsers: 0, byRole: {} },
    }
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return user[0] || null
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    return null
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  try {
    const [totalUsers, adminUsers, activeUsers, roleStats] = await Promise.all([
      // Total users
      db.select({ count: count() }).from(users),

      // Admin users (admin, manager, staff)
      db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.role} IN ('admin', 'manager', 'staff')`),

      // Active users (approximated as users with verified email)
      db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.emailVerified} IS NOT NULL`),

      // By role
      db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .groupBy(users.role),
    ])

    const byRole = (roleStats || []).reduce(
      (acc, item) => {
        if (item && item.role) {
          acc[item.role] = item.count
        }
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalUsers: totalUsers[0]?.count || 0,
      adminUsers: adminUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      byRole,
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      totalUsers: 0,
      adminUsers: 0,
      activeUsers: 0,
      byRole: {},
    }
  }
}

/**
 * Search users for assignment/selection
 */
export async function searchUsers(
  query?: string,
  roles?: string[],
  limit: number = 20
) {
  try {
    let searchQuery = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.status, 'active'))
      .orderBy(users.name)

    const conditions = [eq(users.status, 'active')]

    if (query) {
      conditions.push(
        or(ilike(users.email, `%${query}%`), ilike(users.name, `%${query}%`))
      )
    }

    if (roles && roles.length > 0) {
      conditions.push(sql`${users.role} = ANY(${roles})`)
    }

    if (conditions.length > 0) {
      searchQuery = searchQuery.where(and(...conditions))
    }

    return await searchQuery.limit(limit)
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

/**
 * Get admin users for assignment
 */
export async function getAdminUsers() {
  try {
    return await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          sql`${users.role} IN ('admin', 'manager', 'staff')`
        )
      )
      .orderBy(users.name)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return []
  }
}

/**
 * Check if email is available
 */
export async function isEmailAvailable(email: string, excludeUserId?: string) {
  try {
    const conditions = [eq(users.email, email)]

    if (excludeUserId) {
      conditions.push(sql`${users.id} != ${excludeUserId}`)
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1)

    return existing.length === 0
  } catch (error) {
    console.error('Error checking email availability:', error)
    return false
  }
}

/**
 * Get user activity summary
 */
export async function getUserActivity(userId: string, days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // This would typically query audit logs, sessions, etc.
    // For now, return basic user info with placeholder activity
    const user = await getUserById(userId)

    if (!user) {
      return null
    }

    return {
      user,
      activitySummary: {
        totalActions: 0, // Would come from audit logs
        lastLogin: user.lastLoginAt,
        accountCreated: user.createdAt,
        status: user.status,
      },
    }
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return null
  }
}
