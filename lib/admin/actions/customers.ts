'use server'

import { db } from '@/db'
import { customers, addresses, customerGroups, customerGroupMembers, auditLogs } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createId } from '@paralleldrive/cuid2'
import bcrypt from 'bcryptjs'

export interface UpdateCustomerData {
  customerId: string
  name?: string
  email?: string
  phone?: string
  status?: 'active' | 'inactive' | 'blocked'
  emailVerified?: boolean
  metadata?: Record<string, any>
}

export async function updateCustomer(data: UpdateCustomerData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const { customerId, ...updates } = data

    await db.update(customers)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'update_customer',
      entity: 'customer',
      entityId: customerId,
      metadata: { updates },
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath(`/admin/customers/${customerId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update customer' }
  }
}

export async function blockCustomer(customerId: string, reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(customers)
      .set({
        status: 'blocked',
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'block_customer',
      entity: 'customer',
      entityId: customerId,
      metadata: { reason },
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath(`/admin/customers/${customerId}`)

    return { success: true }
  } catch (error) {
    console.error('Error blocking customer:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to block customer' }
  }
}

export async function unblockCustomer(customerId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(customers)
      .set({
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'unblock_customer',
      entity: 'customer',
      entityId: customerId,
      metadata: {},
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath(`/admin/customers/${customerId}`)

    return { success: true }
  } catch (error) {
    console.error('Error unblocking customer:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to unblock customer' }
  }
}

export async function deleteCustomer(customerId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Check if customer has orders
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      with: {
        orders: {
          columns: { id: true },
          limit: 1
        }
      }
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    if (customer.orders && customer.orders.length > 0) {
      throw new Error('Cannot delete customer with existing orders')
    }

    // Delete customer addresses
    await db.delete(addresses)
      .where(eq(addresses.customerId, customerId))

    // Remove from all groups
    await db.delete(customerGroupMembers)
      .where(eq(customerGroupMembers.customerId, customerId))

    // Delete the customer
    await db.delete(customers)
      .where(eq(customers.id, customerId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'delete_customer',
      entity: 'customer',
      entityId: customerId,
      metadata: { customer },
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')

    return { success: true }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete customer' }
  }
}

export async function resetCustomerPassword(customerId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    await db.update(customers)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId))

    // TODO: Send email with temporary password

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'reset_customer_password',
      entity: 'customer',
      entityId: customerId,
      metadata: {},
      ipAddress: null,
      userAgent: null
    })

    revalidatePath(`/admin/customers/${customerId}`)

    return { success: true, tempPassword }
  } catch (error) {
    console.error('Error resetting customer password:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset password' }
  }
}

export async function createCustomerGroup(data: {
  name: string
  description?: string
  metadata?: Record<string, any>
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const groupId = createId()
    
    await db.insert(customerGroups).values({
      id: groupId,
      ...data
    })

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'create_customer_group',
      entity: 'customer_group',
      entityId: groupId,
      metadata: data,
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath('/admin/customers/groups')

    return { success: true, groupId }
  } catch (error) {
    console.error('Error creating customer group:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create group' }
  }
}

export async function updateCustomerGroup(groupId: string, data: {
  name?: string
  description?: string
  metadata?: Record<string, any>
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(customerGroups)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(customerGroups.id, groupId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'update_customer_group',
      entity: 'customer_group',
      entityId: groupId,
      metadata: data,
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath('/admin/customers/groups')

    return { success: true }
  } catch (error) {
    console.error('Error updating customer group:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update group' }
  }
}

export async function deleteCustomerGroup(groupId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Remove all members from the group
    await db.delete(customerGroupMembers)
      .where(eq(customerGroupMembers.groupId, groupId))

    // Delete the group
    await db.delete(customerGroups)
      .where(eq(customerGroups.id, groupId))

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'delete_customer_group',
      entity: 'customer_group',
      entityId: groupId,
      metadata: {},
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath('/admin/customers/groups')

    return { success: true }
  } catch (error) {
    console.error('Error deleting customer group:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete group' }
  }
}

export async function addCustomersToGroup(groupId: string, customerIds: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Check which customers are already in the group
    const existingMembers = await db.query.customerGroupMembers.findMany({
      where: and(
        eq(customerGroupMembers.groupId, groupId),
        inArray(customerGroupMembers.customerId, customerIds)
      ),
      columns: { customerId: true }
    })

    const existingIds = new Set(existingMembers.map(m => m.customerId))
    const newCustomerIds = customerIds.filter(id => !existingIds.has(id))

    if (newCustomerIds.length > 0) {
      await db.insert(customerGroupMembers).values(
        newCustomerIds.map(customerId => ({
          groupId,
          customerId
        }))
      )
    }

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'add_customers_to_group',
      entity: 'customer_group',
      entityId: groupId,
      metadata: { customerIds: newCustomerIds },
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath('/admin/customers/groups')

    return { success: true, addedCount: newCustomerIds.length }
  } catch (error) {
    console.error('Error adding customers to group:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add customers to group' }
  }
}

export async function removeCustomersFromGroup(groupId: string, customerIds: string[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.delete(customerGroupMembers)
      .where(
        and(
          eq(customerGroupMembers.groupId, groupId),
          inArray(customerGroupMembers.customerId, customerIds)
        )
      )

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'remove_customers_from_group',
      entity: 'customer_group',
      entityId: groupId,
      metadata: { customerIds },
      ipAddress: null,
      userAgent: null
    })

    revalidatePath('/admin/customers')
    revalidatePath('/admin/customers/groups')

    return { success: true }
  } catch (error) {
    console.error('Error removing customers from group:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to remove customers from group' }
  }
}

export async function sendBulkEmail(customerIds: string[], subject: string, content: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get customer emails
    const customersData = await db.query.customers.findMany({
      where: inArray(customers.id, customerIds),
      columns: { id: true, email: true, name: true }
    })

    // TODO: Integrate with email service to send bulk emails
    console.log('Sending bulk email to:', customersData.map(c => c.email))
    console.log('Subject:', subject)
    console.log('Content:', content)

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'send_bulk_email',
      entity: 'customer',
      entityId: null,
      metadata: { 
        customerCount: customersData.length,
        subject,
        customerIds 
      },
      ipAddress: null,
      userAgent: null
    })

    return { success: true, sentCount: customersData.length }
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send bulk email' }
  }
}