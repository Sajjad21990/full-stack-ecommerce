'use server'

import { db } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { users } from '@/db/schema/auth'
import { revalidatePath } from 'next/cache'
import { hash } from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import { auditActions } from '@/lib/admin/audit'

export interface CreateUserData {
  email: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'customer'
  status?: 'active' | 'inactive' | 'suspended'
  password?: string
  sendInvite?: boolean
}

export interface UpdateUserData {
  id: string
  name?: string
  role?: 'admin' | 'manager' | 'staff' | 'customer'
  status?: 'active' | 'inactive' | 'suspended'
  password?: string
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData) {
  try {
    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
    
    if (existing.length > 0) {
      return { success: false, error: 'Email already exists' }
    }

    // Hash password if provided
    let hashedPassword: string | undefined
    if (data.password) {
      hashedPassword = await hash(data.password, 12)
    }

    // Create user
    const [newUser] = await db.insert(users).values({
      id: createId(),
      email: data.email,
      name: data.name,
      role: data.role,
      status: data.status || 'active',
      password: hashedPassword,
      emailVerified: null // Will be set when user verifies email
    }).returning()

    // Log audit action
    await auditActions.userCreated(newUser.id, newUser.email, {
      name: newUser.name,
      role: newUser.role,
      status: newUser.status,
      method: data.sendInvite ? 'invite' : 'direct'
    })

    // TODO: Send invitation email if requested
    if (data.sendInvite) {
      // Implementation would go here
      console.log(`TODO: Send invitation email to ${data.email}`)
    }

    revalidatePath('/admin/users')
    return { success: true, user: newUser }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: 'Failed to create user' }
  }
}

/**
 * Update user
 */
export async function updateUser(data: UpdateUserData) {
  try {
    // Get current user data for audit log
    const currentUser = await db.select().from(users).where(eq(users.id, data.id)).limit(1)
    
    if (!currentUser[0]) {
      return { success: false, error: 'User not found' }
    }

    const before = currentUser[0]

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.role !== undefined) updateData.role = data.role
    if (data.status !== undefined) updateData.status = data.status

    // Hash new password if provided
    if (data.password) {
      updateData.password = await hash(data.password, 12)
    }

    // Update user
    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, data.id))
      .returning()

    // Log audit action
    await auditActions.userUpdated(updatedUser.id, updatedUser.email, before, updatedUser)

    revalidatePath('/admin/users')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Error updating user:', error)
    return { success: false, error: 'Failed to update user' }
  }
}

/**
 * Delete user (soft delete by setting status to inactive)
 */
export async function deleteUser(id: string) {
  try {
    // Get current user data
    const currentUser = await db.select().from(users).where(eq(users.id, id)).limit(1)
    
    if (!currentUser[0]) {
      return { success: false, error: 'User not found' }
    }

    const user = currentUser[0]

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await db.select().from(users)
        .where(and(
          eq(users.role, 'admin'),
          eq(users.status, 'active')
        ))
      
      if (adminCount.length <= 1) {
        return { success: false, error: 'Cannot delete the last admin user' }
      }
    }

    // Soft delete by setting status to inactive
    const [deletedUser] = await db.update(users)
      .set({ 
        status: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log audit action
    await auditActions.userDeleted(deletedUser.id, deletedUser.email, user)

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}

/**
 * Suspend user
 */
export async function suspendUser(id: string, reason?: string) {
  try {
    const currentUser = await db.select().from(users).where(eq(users.id, id)).limit(1)
    
    if (!currentUser[0]) {
      return { success: false, error: 'User not found' }
    }

    const before = currentUser[0]

    const [suspendedUser] = await db.update(users)
      .set({ 
        status: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log audit action
    await auditActions.userSuspended(suspendedUser.id, suspendedUser.email, {
      reason,
      previousStatus: before.status
    })

    revalidatePath('/admin/users')
    return { success: true, user: suspendedUser }
  } catch (error) {
    console.error('Error suspending user:', error)
    return { success: false, error: 'Failed to suspend user' }
  }
}

/**
 * Reactivate user
 */
export async function reactivateUser(id: string) {
  try {
    const currentUser = await db.select().from(users).where(eq(users.id, id)).limit(1)
    
    if (!currentUser[0]) {
      return { success: false, error: 'User not found' }
    }

    const before = currentUser[0]

    const [reactivatedUser] = await db.update(users)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning()

    // Log audit action  
    await auditActions.userReactivated(reactivatedUser.id, reactivatedUser.email, {
      previousStatus: before.status
    })

    revalidatePath('/admin/users')
    return { success: true, user: reactivatedUser }
  } catch (error) {
    console.error('Error reactivating user:', error)
    return { success: false, error: 'Failed to reactivate user' }
  }
}

/**
 * Bulk update user roles
 */
export async function bulkUpdateUserRoles(userIds: string[], role: string) {
  if (userIds.length === 0) {
    return { success: false, error: 'No users selected' }
  }

  try {
    // Get current users for audit
    const currentUsers = await db.select()
      .from(users)
      .where(sql`${users.id} = ANY(${userIds})`)

    // Check if we're removing admin role from all admins
    if (role !== 'admin') {
      const remainingAdmins = await db.select()
        .from(users)
        .where(and(
          eq(users.role, 'admin'),
          eq(users.status, 'active'),
          sql`${users.id} != ALL(${userIds})`
        ))
      
      if (remainingAdmins.length === 0) {
        return { success: false, error: 'Cannot remove admin role from all admin users' }
      }
    }

    // Update users
    const updatedUsers = await db.update(users)
      .set({ 
        role: role as any,
        updatedAt: new Date()
      })
      .where(sql`${users.id} = ANY(${userIds})`)
      .returning()

    // Log bulk audit action
    const auditItems = updatedUsers.map((user, index) => {
      const before = currentUsers.find(u => u.id === user.id)
      return {
        resourceId: user.id,
        resourceTitle: user.email,
        status: 'success' as const,
        changes: {
          before: { role: before?.role },
          after: { role: user.role }
        }
      }
    })

    await auditActions.usersBulkUpdated(auditItems, {
      operation: 'role_update',
      newRole: role
    })

    revalidatePath('/admin/users')
    return { success: true, updatedCount: updatedUsers.length }
  } catch (error) {
    console.error('Error bulk updating user roles:', error)
    return { success: false, error: 'Failed to update user roles' }
  }
}

/**
 * Bulk update user status
 */
export async function bulkUpdateUserStatus(userIds: string[], status: string) {
  if (userIds.length === 0) {
    return { success: false, error: 'No users selected' }
  }

  try {
    // Get current users for audit
    const currentUsers = await db.select()
      .from(users)
      .where(sql`${users.id} = ANY(${userIds})`)

    // Check if we're deactivating all admin users
    if (status !== 'active') {
      const remainingActiveAdmins = await db.select()
        .from(users)
        .where(and(
          eq(users.role, 'admin'),
          eq(users.status, 'active'),
          sql`${users.id} != ALL(${userIds})`
        ))
      
      if (remainingActiveAdmins.length === 0) {
        return { success: false, error: 'Cannot deactivate all admin users' }
      }
    }

    // Update users
    const updatedUsers = await db.update(users)
      .set({ 
        status: status as any,
        updatedAt: new Date()
      })
      .where(sql`${users.id} = ANY(${userIds})`)
      .returning()

    // Log bulk audit action
    const auditItems = updatedUsers.map((user, index) => {
      const before = currentUsers.find(u => u.id === user.id)
      return {
        resourceId: user.id,
        resourceTitle: user.email,
        status: 'success' as const,
        changes: {
          before: { status: before?.status },
          after: { status: user.status }
        }
      }
    })

    await auditActions.usersBulkUpdated(auditItems, {
      operation: 'status_update',
      newStatus: status
    })

    revalidatePath('/admin/users')
    return { success: true, updatedCount: updatedUsers.length }
  } catch (error) {
    console.error('Error bulk updating user status:', error)
    return { success: false, error: 'Failed to update user status' }
  }
}