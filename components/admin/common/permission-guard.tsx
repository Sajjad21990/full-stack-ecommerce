'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { Permission } from '@/lib/admin/permissions'

interface PermissionGuardProps {
  permission: Permission | Permission[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean // For multiple permissions, require all (AND) vs any (OR)
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null,
  requireAll = false 
}: PermissionGuardProps) {
  const { data: session } = useSession()
  
  if (!session?.user) {
    return <>{fallback}</>
  }

  // For now, use simple role-based check (can be enhanced with actual permissions)
  const isAdmin = session.user.role === 'admin'
  
  // Admin users have all permissions
  if (isAdmin) {
    return <>{children}</>
  }

  // TODO: Implement actual permission checking here
  // For now, non-admin users see fallback
  return <>{fallback}</>
}

interface RoleGuardProps {
  roles: string | string[]
  children: ReactNode
  fallback?: ReactNode
  requireAll?: boolean
}

export function RoleGuard({
  roles,
  children,
  fallback = null,
  requireAll = false
}: RoleGuardProps) {
  const { data: session } = useSession()
  
  if (!session?.user) {
    return <>{fallback}</>
  }

  const userRole = session.user.role
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  
  const hasAccess = allowedRoles.includes(userRole)
  
  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Simple unauthorized message component
 */
export function UnauthorizedMessage() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-1">
          You don't have permission to view this content.
        </p>
      </div>
    </div>
  )
}