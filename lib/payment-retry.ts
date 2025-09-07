'use server'

import { db } from '@/lib/db'
import { orders, payments } from '@/db/schema/orders'
import { eq, and, lt, sql } from 'drizzle-orm'
import { createRazorpayOrder, getPaymentDetails } from '@/lib/razorpay'
import { createId } from '@paralleldrive/cuid2'
import { logAdminAction } from '@/lib/admin/audit'

interface PaymentRetryOptions {
  maxRetries?: number
  retryDelayMinutes?: number
  skipRecentFailures?: boolean
}

interface PaymentRetryResult {
  success: boolean
  message: string
  retriesProcessed: number
  errors: string[]
}

/**
 * Retry failed payments that are eligible for retry
 */
export async function retryFailedPayments(
  options: PaymentRetryOptions = {}
): Promise<PaymentRetryResult> {
  const {
    maxRetries = 3,
    retryDelayMinutes = 30,
    skipRecentFailures = true
  } = options

  const errors: string[] = []
  let retriesProcessed = 0

  try {
    // Find orders with failed payments that are eligible for retry
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - retryDelayMinutes)

    const failedOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.paymentStatus, 'failed'),
        eq(orders.status, 'payment_failed'),
        skipRecentFailures ? lt(orders.updatedAt, cutoffTime) : undefined
      ),
      with: {
        payments: {
          where: eq(payments.status, 'failed')
        }
      },
      limit: 50 // Process in batches
    })

    if (failedOrders.length === 0) {
      return {
        success: true,
        message: 'No failed payments eligible for retry',
        retriesProcessed: 0,
        errors: []
      }
    }

    // Process each failed order
    for (const order of failedOrders) {
      try {
        const failedPayment = order.payments[0] // Get the latest failed payment
        
        if (!failedPayment) {
          errors.push(`No failed payment found for order ${order.orderNumber}`)
          continue
        }

        // Check retry count
        const retryCount = failedPayment.gatewayResponse?.retry_count || 0
        
        if (retryCount >= maxRetries) {
          errors.push(`Max retries exceeded for order ${order.orderNumber}`)
          continue
        }

        // Create new payment attempt
        const retryResult = await createPaymentRetry(order, failedPayment)
        
        if (retryResult.success) {
          retriesProcessed++
          
          // Log successful retry creation
          await logAdminAction({
            userId: 'system',
            action: 'PAYMENT_RETRY_CREATED',
            resourceType: 'payment',
            resourceId: failedPayment.id,
            changes: {
              order_id: order.id,
              retry_count: retryCount + 1,
              new_payment_id: retryResult.paymentId
            }
          })
        } else {
          errors.push(`Failed to create retry for order ${order.orderNumber}: ${retryResult.error}`)
        }

      } catch (error) {
        const errorMessage = `Error processing order ${order.orderNumber}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
        
        errors.push(errorMessage)
        console.error(errorMessage, error)
      }
    }

    return {
      success: true,
      message: `Processed ${retriesProcessed} payment retries`,
      retriesProcessed,
      errors
    }

  } catch (error) {
    console.error('Error in retryFailedPayments:', error)
    return {
      success: false,
      message: 'Failed to process payment retries',
      retriesProcessed,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

/**
 * Create a new payment retry for a failed order
 */
async function createPaymentRetry(
  order: any,
  failedPayment: any
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  try {
    // Create new Razorpay order for retry
    const receipt = `${order.orderNumber}-retry-${createId()}`
    const retryCount = (failedPayment.gatewayResponse?.retry_count || 0) + 1
    
    const razorpayOrder = await createRazorpayOrder({
      amount: order.totalAmount,
      currency: order.currency,
      receipt,
      notes: {
        order_id: order.id,
        order_number: order.orderNumber,
        customer_email: order.email,
        retry_count: retryCount.toString(),
        original_payment_id: failedPayment.id
      }
    })

    // Create new payment record
    const [newPayment] = await db.insert(payments).values({
      orderId: order.id,
      amount: order.totalAmount,
      currency: order.currency,
      status: 'pending',
      gateway: 'razorpay',
      gatewayTransactionId: razorpayOrder.id,
      gatewayResponse: {
        ...razorpayOrder,
        retry_count: retryCount,
        original_payment_id: failedPayment.id
      },
      paymentMethod: failedPayment.paymentMethod,
      idempotencyKey: createId()
    }).returning()

    // Update order status to allow retry
    await db.update(orders)
      .set({
        status: 'pending',
        paymentStatus: 'pending',
        updatedAt: new Date()
      })
      .where(eq(orders.id, order.id))

    return {
      success: true,
      paymentId: newPayment.id
    }

  } catch (error) {
    console.error('Error creating payment retry:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check payment status and sync with Razorpay
 */
export async function syncPaymentStatus(paymentId: string): Promise<{
  success: boolean
  message: string
  updated: boolean
}> {
  try {
    // Get payment from database
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: {
        order: true
      }
    })

    if (!payment) {
      return {
        success: false,
        message: 'Payment not found',
        updated: false
      }
    }

    if (!payment.gatewayTransactionId) {
      return {
        success: false,
        message: 'No gateway transaction ID found',
        updated: false
      }
    }

    // Get order payments from Razorpay
    const razorpayPayments = await db.query.payments.findMany({
      where: eq(payments.gatewayTransactionId, payment.gatewayTransactionId)
    })

    if (razorpayPayments.length === 0) {
      return {
        success: true,
        message: 'No payments found for this order in Razorpay',
        updated: false
      }
    }

    let updated = false

    // Check each payment for status updates
    for (const razorpayPayment of razorpayPayments) {
      try {
        const paymentDetails = await getPaymentDetails(razorpayPayment.gatewayTransactionId!)
        
        // Check if status has changed
        if (paymentDetails.status !== razorpayPayment.status) {
          // Update payment status
          await db.update(payments)
            .set({
              status: paymentDetails.status as any,
              gatewayResponse: paymentDetails,
              capturedAt: paymentDetails.status === 'captured' ? new Date() : razorpayPayment.capturedAt,
              authorizedAt: paymentDetails.status === 'authorized' ? new Date() : razorpayPayment.authorizedAt,
              failedAt: paymentDetails.status === 'failed' ? new Date() : razorpayPayment.failedAt,
              updatedAt: new Date()
            })
            .where(eq(payments.id, razorpayPayment.id))

          // Update order status if needed
          if (paymentDetails.status === 'captured') {
            await db.update(orders)
              .set({
                status: 'processing',
                paymentStatus: 'paid',
                processedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(orders.id, payment.orderId))
          } else if (paymentDetails.status === 'failed') {
            await db.update(orders)
              .set({
                status: 'payment_failed',
                paymentStatus: 'failed',
                updatedAt: new Date()
              })
              .where(eq(orders.id, payment.orderId))
          }

          updated = true

          // Log the sync
          await logAdminAction({
            userId: 'system',
            action: 'PAYMENT_STATUS_SYNCED',
            resourceType: 'payment',
            resourceId: razorpayPayment.id,
            changes: {
              old_status: razorpayPayment.status,
              new_status: paymentDetails.status,
              gateway_payment_id: paymentDetails.id
            }
          })
        }

      } catch (error) {
        console.error(`Error syncing payment ${razorpayPayment.id}:`, error)
      }
    }

    return {
      success: true,
      message: updated ? 'Payment status updated' : 'No updates needed',
      updated
    }

  } catch (error) {
    console.error('Error syncing payment status:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      updated: false
    }
  }
}

/**
 * Clean up old failed payments
 */
export async function cleanupOldFailures(daysOld: number = 30): Promise<{
  success: boolean
  message: string
  cleaned: number
}> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // Find old failed payments
    const oldFailedPayments = await db.query.payments.findMany({
      where: and(
        eq(payments.status, 'failed'),
        lt(payments.updatedAt, cutoffDate)
      ),
      with: {
        order: true
      }
    })

    let cleaned = 0

    for (const payment of oldFailedPayments) {
      // Only clean up if order has newer successful payment or is cancelled
      const newerPayments = await db.query.payments.findMany({
        where: and(
          eq(payments.orderId, payment.orderId),
          sql`created_at > ${payment.createdAt}`
        )
      })

      const hasSuccessfulPayment = newerPayments.some(p => 
        p.status === 'captured' || p.status === 'authorized'
      )

      if (hasSuccessfulPayment || payment.order.status === 'cancelled') {
        // Archive the failed payment
        await db.update(payments)
          .set({
            status: 'archived',
            updatedAt: new Date()
          })
          .where(eq(payments.id, payment.id))

        cleaned++
      }
    }

    return {
      success: true,
      message: `Cleaned up ${cleaned} old failed payments`,
      cleaned
    }

  } catch (error) {
    console.error('Error cleaning up old failures:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      cleaned: 0
    }
  }
}