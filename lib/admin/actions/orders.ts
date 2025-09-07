'use server'

import { db } from '@/db'
import { orders, orderItems, payments, refunds, shipments } from '@/db/schema/orders'
import { stockLevels } from '@/db/schema/inventory'
import { eq, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createId } from '@paralleldrive/cuid2'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export interface UpdateOrderStatusData {
  orderId: string
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'failed'
  paymentStatus?: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed' | 'cancelled' | 'authorized'
  fulfillmentStatus?: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'returned' | 'cancelled'
  note?: string
  notifyCustomer?: boolean
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
}

export async function updateOrderStatus(data: UpdateOrderStatusData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const { orderId, status, paymentStatus, fulfillmentStatus, note, trackingNumber, trackingUrl, carrier } = data

    // Get current order
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true
      }
    })

    if (!currentOrder) {
      throw new Error('Order not found')
    }

    // Start transaction
    await db.transaction(async (tx) => {
      const updates: any = {
        updatedAt: new Date()
      }

      // Update order status
      if (status && status !== currentOrder.status) {
        updates.status = status
        
        // Add to status history
        await tx.insert(orderStatusHistory).values({
          orderId,
          fromStatus: currentOrder.status,
          toStatus: status,
          note,
          changedBy: session.user.id,
          changedByEmail: session.user.email!
        })

        // TODO: Handle inventory based on status
        // if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
        //   // Release reserved inventory
        //   // Need to implement with stockLevels table
        // }

        // Update timestamps based on status
        if (status === 'confirmed') {
          updates.confirmedAt = new Date()
        } else if (status === 'processing') {
          updates.processedAt = new Date()
        } else if (status === 'shipped') {
          updates.shippedAt = new Date()
        } else if (status === 'delivered') {
          updates.deliveredAt = new Date()
        } else if (status === 'cancelled') {
          updates.cancelledAt = new Date()
        }
      }

      // Update payment status
      if (paymentStatus && paymentStatus !== currentOrder.paymentStatus) {
        updates.paymentStatus = paymentStatus
        
        await tx.insert(orderStatusHistory).values({
          orderId,
          fromStatus: `payment_${currentOrder.paymentStatus}`,
          toStatus: `payment_${paymentStatus}`,
          note,
          changedBy: session.user.id,
          changedByEmail: session.user.email!
        })
      }

      // Update fulfillment status
      if (fulfillmentStatus && fulfillmentStatus !== currentOrder.fulfillmentStatus) {
        updates.fulfillmentStatus = fulfillmentStatus
        
        await tx.insert(orderStatusHistory).values({
          orderId,
          fromStatus: `fulfillment_${currentOrder.fulfillmentStatus}`,
          toStatus: `fulfillment_${fulfillmentStatus}`,
          note,
          changedBy: session.user.id,
          changedByEmail: session.user.email!
        })

        if (fulfillmentStatus === 'fulfilled') {
          updates.fulfilledAt = new Date()
        }
      }

      // Update tracking info
      if (trackingNumber !== undefined) {
        updates.trackingNumber = trackingNumber
      }
      if (trackingUrl !== undefined) {
        updates.trackingUrl = trackingUrl
      }
      if (carrier !== undefined) {
        updates.carrier = carrier
      }

      // Update the order
      await tx.update(orders)
        .set(updates)
        .where(eq(orders.id, orderId))

      // TODO: Send notification email if notifyCustomer is true
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update order status' }
  }
}

export async function fulfillOrder(orderId: string, items?: { itemId: string; quantity: number }[]) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get current order
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true
      }
    })

    if (!currentOrder) {
      throw new Error('Order not found')
    }

    await db.transaction(async (tx) => {
      if (items && items.length > 0) {
        // Partial fulfillment
        for (const item of items) {
          const orderItem = currentOrder.items.find(i => i.id === item.itemId)
          if (!orderItem) continue

          // Update fulfilled quantity
          await tx.update(orderItems)
            .set({
              fulfilledQuantity: sql`LEAST(${orderItems.fulfilledQuantity} + ${item.quantity}, ${orderItems.quantity})`,
              updatedAt: new Date()
            })
            .where(eq(orderItems.id, item.itemId))

          // TODO: Update inventory
          // Need to implement with stockLevels table
        }

        // Check if all items are fulfilled
        const updatedItems = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, orderId)
        })

        const allFulfilled = updatedItems.every(item => item.fulfilledQuantity >= item.quantity)
        const partiallyFulfilled = updatedItems.some(item => item.fulfilledQuantity > 0)

        await tx.update(orders)
          .set({
            fulfillmentStatus: allFulfilled ? 'fulfilled' : partiallyFulfilled ? 'partially_fulfilled' : 'unfulfilled',
            fulfilledAt: allFulfilled ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId))

      } else {
        // Full fulfillment
        for (const item of currentOrder.items) {
          // Update fulfilled quantity
          await tx.update(orderItems)
            .set({
              fulfilledQuantity: item.quantity,
              updatedAt: new Date()
            })
            .where(eq(orderItems.id, item.id))

          // TODO: Update inventory
          // Need to implement with stockLevels table
        }

        await tx.update(orders)
          .set({
            fulfillmentStatus: 'fulfilled',
            fulfilledAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId))
      }

      // Add to status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: `fulfillment_${currentOrder.fulfillmentStatus}`,
        toStatus: items ? 'fulfillment_partially_fulfilled' : 'fulfillment_fulfilled',
        note: items ? `Partially fulfilled ${items.length} items` : 'Order fully fulfilled',
        changedBy: session.user.id,
        changedByEmail: session.user.email!
      })
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error fulfilling order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fulfill order' }
  }
}

export async function cancelOrder(orderId: string, reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        payments: true
      }
    })

    if (!currentOrder) {
      throw new Error('Order not found')
    }

    if (currentOrder.status === 'cancelled') {
      throw new Error('Order is already cancelled')
    }

    await db.transaction(async (tx) => {
      // Cancel the order
      await tx.update(orders)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

      // Release inventory
      for (const item of currentOrder.items) {
        if (item.variantId && item.fulfilledQuantity < item.quantity) {
          const unreservedQty = item.quantity - item.fulfilledQuantity
          
          // TODO: Update inventory
          // Need to implement with stockLevels table
        }
      }

      // Update payment status if needed
      if (currentOrder.paymentStatus === 'pending' || currentOrder.paymentStatus === 'authorized') {
        await tx.update(orders)
          .set({
            paymentStatus: 'cancelled',
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId))
      }

      // Add to status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: currentOrder.status,
        toStatus: 'cancelled',
        note: reason || 'Order cancelled by admin',
        changedBy: session.user.id,
        changedByEmail: session.user.email!
      })
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error cancelling order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' }
  }
}

export async function refundOrder(orderId: string, amount?: number, reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        payments: {
          where: eq(payments.status, 'captured')
        }
      }
    })

    if (!currentOrder) {
      throw new Error('Order not found')
    }

    if (!currentOrder.payments || currentOrder.payments.length === 0) {
      throw new Error('No captured payments found for this order')
    }

    const capturedPayment = currentOrder.payments[0]
    const refundAmount = amount || currentOrder.totalAmount

    if (refundAmount > currentOrder.totalAmount) {
      throw new Error('Refund amount cannot exceed order total')
    }

    // TODO: Integrate with Razorpay refund API
    // For now, we'll just update the database

    await db.transaction(async (tx) => {
      // Create refund payment record
      await tx.insert(payments).values({
        orderId,
        amount: -refundAmount, // Negative amount for refund
        currency: currentOrder.currency,
        status: 'refunded',
        gateway: 'razorpay',
        gatewayTransactionId: `refund_${createId()}`,
        paymentMethod: capturedPayment.paymentMethod,
        refundedAt: new Date(),
        refundReason: reason
      })

      // Update order payment status
      const isFullRefund = refundAmount === currentOrder.totalAmount
      await tx.update(orders)
        .set({
          paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
          refundedAmount: sql`COALESCE(${orders.refundedAmount}, 0) + ${refundAmount}`,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

      // Add to status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: `payment_${currentOrder.paymentStatus}`,
        toStatus: isFullRefund ? 'payment_refunded' : 'payment_partially_refunded',
        note: reason || `Refunded ${refundAmount} ${currentOrder.currency}`,
        changedBy: session.user.id,
        changedByEmail: session.user.email!
      })
    })

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true, refundAmount }
  } catch (error) {
    console.error('Error refunding order:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to refund order' }
  }
}

export async function addOrderNote(orderId: string, note: string, isInternal: boolean = true) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.insert(orderStatusHistory).values({
      orderId,
      fromStatus: 'note',
      toStatus: 'note',
      note,
      isInternal,
      changedBy: session.user.id,
      changedByEmail: session.user.email!
    })

    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error adding order note:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add note' }
  }
}

export async function resendOrderConfirmation(orderId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            variant: true
          }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // TODO: Integrate with email service to send order confirmation
    console.log('Sending order confirmation email to:', order.email)

    await addOrderNote(orderId, 'Order confirmation email resent', true)

    return { success: true }
  } catch (error) {
    console.error('Error resending order confirmation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to resend confirmation' }
  }
}

export interface GenerateShippingLabelData {
  orderId: string
  carrier: string
  service: string
  trackingNumber?: string
  trackingUrl?: string
  weight?: number
  dimensions?: {
    length: string
    width: string
    height: string
  }
  packageType?: string
  notes?: string
}

export async function generateShippingLabel(data: GenerateShippingLabelData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const { orderId, carrier, service, trackingNumber, trackingUrl, weight, dimensions, packageType, notes } = data

    // Check if order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Create or update shipment
    const shipmentId = createId()
    await db.transaction(async (tx) => {
      // Check if shipment already exists
      const existingShipment = await tx.query.shipments.findFirst({
        where: eq(shipments.orderId, orderId)
      })

      if (existingShipment) {
        // Update existing shipment
        await tx.update(shipments)
          .set({
            carrier,
            service,
            trackingNumber,
            trackingUrl,
            status: 'ready',
            updatedAt: new Date()
          })
          .where(eq(shipments.id, existingShipment.id))
      } else {
        // Create new shipment
        await tx.insert(shipments).values({
          id: shipmentId,
          orderId,
          carrier,
          service,
          trackingNumber,
          trackingUrl,
          status: 'ready',
          shippingAddress: order.shippingAddress
        })
      }

      // Update order fulfillment status
      await tx.update(orders)
        .set({
          fulfillmentStatus: 'fulfilled',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

      // Add to status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: 'fulfillment_' + order.fulfillmentStatus,
        toStatus: 'fulfillment_fulfilled',
        note: `Shipping label generated - ${carrier} ${service}`,
        changedBy: session.user.id,
        changedByEmail: session.user.email!
      })
    })

    // TODO: Integrate with actual shipping APIs (FedEx, UPS, etc.)
    // For now, generate a mock label URL
    const labelUrl = `/api/shipping/label/${shipmentId}`

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true, labelUrl, shipmentId }
  } catch (error) {
    console.error('Error generating shipping label:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate shipping label' }
  }
}

export interface ProcessRefundData {
  orderId: string
  paymentId?: string
  amount: number
  reason: string
  notes?: string
  notifyCustomer?: boolean
  restockItems?: boolean
  items?: {
    orderItemId: string
    quantity: number
    amount: number
  }[]
}

export async function processRefund(data: ProcessRefundData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const { orderId, paymentId, amount, reason, notes, notifyCustomer, restockItems, items } = data

    // Get order with items
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        payments: true
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Validate refund amount
    const previousRefunds = order.payments
      ?.filter(p => p.status === 'refunded')
      ?.reduce((sum, p) => sum + Math.abs(p.amount), 0) || 0

    const maxRefundAmount = order.totalAmount - previousRefunds

    if (amount > maxRefundAmount) {
      throw new Error(`Refund amount exceeds maximum refundable amount: ${maxRefundAmount}`)
    }

    await db.transaction(async (tx) => {
      // Create refund record
      const refundId = createId()
      await tx.insert(refunds).values({
        id: refundId,
        orderId,
        paymentId: paymentId || order.payments?.[0]?.id,
        amount,
        reason,
        notes,
        status: 'pending',
        createdBy: session.user.id
      })

      // If restocking items
      if (restockItems && items && items.length > 0) {
        for (const item of items) {
          const orderItem = order.items.find(i => i.id === item.orderItemId)
          if (orderItem && orderItem.variantId) {
            // TODO: Increase inventory
            // Need to implement with stockLevels table
          }
        }
      }

      // Create payment record for refund
      await tx.insert(payments).values({
        orderId,
        amount: -amount,
        currency: order.currency,
        status: 'refunded',
        gateway: 'razorpay',
        gatewayTransactionId: `refund_${createId()}`,
        refundedAt: new Date(),
        refundReason: reason
      })

      // Update order status
      const totalRefunded = previousRefunds + amount
      const isFullRefund = totalRefunded >= order.totalAmount

      await tx.update(orders)
        .set({
          paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
          refundedAmount: totalRefunded,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))

      // Add to status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: 'payment_' + order.paymentStatus,
        toStatus: isFullRefund ? 'payment_refunded' : 'payment_partially_refunded',
        note: `Refunded ${amount} ${order.currency} - Reason: ${reason}`,
        changedBy: session.user.id,
        changedByEmail: session.user.email!
      })

      // Update refund status to success
      await tx.update(refunds)
        .set({
          status: 'success',
          processedAt: new Date()
        })
        .where(eq(refunds.id, refundId))
    })

    // Send notification if requested
    if (notifyCustomer) {
      // TODO: Send refund confirmation email
      console.log('Sending refund notification to:', order.email)
    }

    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)

    return { success: true, refundAmount: amount }
  } catch (error) {
    console.error('Error processing refund:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process refund' }
  }
}

export async function updateShipment(shipmentId: string, data: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.update(shipments)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(shipments.id, shipmentId))

    revalidatePath('/admin/orders')
    return { success: true }
  } catch (error) {
    console.error('Error updating shipment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update shipment' }
  }
}