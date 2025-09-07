import { db } from '@/db'
import { eq, and } from 'drizzle-orm'
import { users, roles, permissions, userRoles, rolePermissions } from '@/db/schema'

// Permission constants for type safety
export const PERMISSIONS = {
  PRODUCTS: {
    CREATE: 'products:create',
    READ: 'products:read',
    UPDATE: 'products:update', 
    DELETE: 'products:delete',
    PUBLISH: 'products:publish'
  },
  ORDERS: {
    CREATE: 'orders:create',
    READ: 'orders:read',
    UPDATE: 'orders:update',
    DELETE: 'orders:delete'
  },
  CUSTOMERS: {
    CREATE: 'customers:create',
    READ: 'customers:read',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete'
  },
  DISCOUNTS: {
    CREATE: 'discounts:create',
    READ: 'discounts:read',
    UPDATE: 'discounts:update',
    DELETE: 'discounts:delete'
  },
  SETTINGS: {
    UPDATE: 'settings:update'
  },
  ANALYTICS: {
    READ: 'analytics:read'
  }
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][keyof typeof PERMISSIONS[keyof typeof PERMISSIONS]]

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const userPermissions = await db
    .select({
      permission: permissions.resource,
      action: permissions.action
    })
    .from(users)
    .innerJoin(userRoles, eq(users.id, userRoles.userId))
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))

  return userPermissions.map(p => `${p.permission}:${p.action}`)
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(userId: string, permission: Permission): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return userPermissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.every(permission => userPermissions.includes(permission))
}

/**
 * Get user with roles and permissions (for session)
 */
export async function getUserWithPermissions(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!user) return null

  const userPermissions = user.userRoles.flatMap(ur => 
    ur.role.rolePermissions.map(rp => `${rp.permission.resource}:${rp.permission.action}`)
  )

  const userRoleNames = user.userRoles.map(ur => ur.role.name)

  return {
    ...user,
    roles: userRoleNames,
    permissions: userPermissions
  }
}

/**
 * Simple admin check (backwards compatibility)
 */
export function isAdmin(user: any): boolean {
  return user?.role === 'admin' || user?.roles?.includes('admin')
}