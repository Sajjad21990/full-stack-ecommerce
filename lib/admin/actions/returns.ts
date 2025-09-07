'use server'

import { db } from '@/db'
import { returns, returnItems, orders, orderItems } from '@/db/schema/orders'
import { stockLevels } from '@/db/schema/inventory'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function approveReturn(returnId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(returns)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(returns.id, returnId))

    revalidatePath('/admin/orders/returns')
    revalidatePath(`/admin/orders/returns/${returnId}`)

    return { success: true }
  } catch (error) {
    console.error('Error approving return:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve return' }
  }
}

export async function rejectReturn(returnId: string, reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(returns)
      .set({
        status: 'rejected',
        notes: reason,
        updatedAt: new Date()
      })
      .where(eq(returns.id, returnId))

    revalidatePath('/admin/orders/returns')
    revalidatePath(`/admin/orders/returns/${returnId}`)

    return { success: true }
  } catch (error) {
    console.error('Error rejecting return:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reject return' }
  }
}

export async function processReturn(returnId: string, resolution: 'refund' | 'exchange' | 'store_credit') {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get return with items
    const returnData = await db.query.returns.findFirst({
      where: eq(returns.id, returnId),
      with: {
        items: {
          with: {
            orderItem: true
          }
        }
      }
    })

    if (!returnData) {
      throw new Error('Return not found')
    }

    await db.transaction(async (tx) => {
      // Update return status
      await tx.update(returns)
        .set({
          status: 'processed',
          resolution,
          processedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId))

      // Restock items if applicable
      if (returnData.items) {
        for (const item of returnData.items) {
          if (item.restockable && item.orderItem.variantId) {
            await tx.update(inventory)
              .set({
                quantity: sql`${inventory.quantity} + ${item.quantity}`,
                updatedAt: new Date()
              })
              .where(eq(inventory.variantId, item.orderItem.variantId))
          }
        }
      }

      // TODO: Process refund/exchange/store credit based on resolution
    })

    revalidatePath('/admin/orders/returns')
    revalidatePath(`/admin/orders/returns/${returnId}`)

    return { success: true }
  } catch (error) {
    console.error('Error processing return:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process return' }
  }
}