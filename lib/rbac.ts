export type Role = 'admin' | 'manager' | 'staff' | 'customer'

export type Permission = 
  | 'manage_products'
  | 'view_products'
  | 'manage_orders'
  | 'view_orders'
  | 'manage_customers'
  | 'view_customers'
  | 'manage_discounts'
  | 'view_discounts'
  | 'manage_content'
  | 'view_content'
  | 'manage_settings'
  | 'view_analytics'
  | 'manage_users'

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'manage_products',
    'view_products',
    'manage_orders',
    'view_orders',
    'manage_customers',
    'view_customers',
    'manage_discounts',
    'view_discounts',
    'manage_content',
    'view_content',
    'manage_settings',
    'view_analytics',
    'manage_users',
  ],
  manager: [
    'manage_products',
    'view_products',
    'manage_orders',
    'view_orders',
    'view_customers',
    'manage_discounts',
    'view_discounts',
    'manage_content',
    'view_content',
    'view_analytics',
  ],
  staff: [
    'view_products',
    'manage_orders',
    'view_orders',
    'view_customers',
    'view_discounts',
    'view_content',
  ],
  customer: [],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccess(userRole: string, requiredPermission: Permission): boolean {
  return hasPermission(userRole as Role, requiredPermission)
}

export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}

export function getAllRoles(): Role[] {
  return Object.keys(rolePermissions) as Role[]
}

export function getAllPermissions(): Permission[] {
  const permissions = new Set<Permission>()
  Object.values(rolePermissions).forEach((perms) => {
    perms.forEach((perm) => permissions.add(perm))
  })
  return Array.from(permissions)
}