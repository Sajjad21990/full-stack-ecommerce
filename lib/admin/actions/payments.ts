'use server'

import { db } from '@/db'
import { payments, orders, auditLogs, settings } from '@/db/schema'
import { eq, and, like } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createId } from '@paralleldrive/cuid2'

export interface ProcessRefundData {
  paymentId: string
  amount?: number
  reason?: string
  notifyCustomer?: boolean
}

export async function processRefund(data: ProcessRefundData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const { paymentId, amount, reason, notifyCustomer = false } = data

    // Get the original payment
    const originalPayment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
      with: {
        order: true
      }
    })

    if (!originalPayment) {
      throw new Error('Payment not found')
    }

    if (originalPayment.status !== 'captured') {
      throw new Error('Only captured payments can be refunded')
    }

    const refundAmount = amount || originalPayment.amount
    
    if (refundAmount > originalPayment.amount) {
      throw new Error('Refund amount cannot exceed original payment amount')
    }

    await db.transaction(async (tx) => {
      // Create refund payment record
      const refundPayment = {
        id: createId(),
        orderId: originalPayment.orderId,
        amount: -refundAmount, // Negative amount for refund
        currency: originalPayment.currency,
        status: 'refunded' as const,
        gateway: originalPayment.gateway,
        gatewayTransactionId: `refund_${createId()}`,
        paymentMethod: originalPayment.paymentMethod,
        refundedAt: new Date(),
        refundReason: reason,
        metadata: {
          originalPaymentId: paymentId,
          processedBy: session.user.id
        }
      }

      await tx.insert(payments).values(refundPayment)

      // Update order refunded amount
      const currentRefunded = originalPayment.order?.refundedAmount || 0
      const newRefundedAmount = currentRefunded + refundAmount
      const isFullRefund = newRefundedAmount >= (originalPayment.order?.totalAmount || 0)

      await tx.update(orders)
        .set({
          refundedAmount: newRefundedAmount,
          paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
          updatedAt: new Date()
        })
        .where(eq(orders.id, originalPayment.orderId))

      // Log the action
      await tx.insert(auditLogs).values({
        userId: session.user.id,
        action: 'process_refund',
        entity: 'payment',
        entityId: paymentId,
        metadata: {
          refundAmount,
          reason,
          orderId: originalPayment.orderId
        },
        ipAddress: null,
        userAgent: null
      })

      // TODO: Integrate with actual payment gateway to process refund
      // For Razorpay: await razorpay.payments.refund(originalPayment.gatewayTransactionId, { amount: refundAmount * 100 })
    })

    revalidatePath('/admin/payments')
    revalidatePath(`/admin/orders/${originalPayment.orderId}`)

    return { success: true, refundAmount }
  } catch (error) {
    console.error('Error processing refund:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process refund' }
  }
}

export async function capturePayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId)
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'authorized') {
      throw new Error('Only authorized payments can be captured')
    }

    await db.transaction(async (tx) => {
      // Update payment status
      await tx.update(payments)
        .set({
          status: 'captured',
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId))

      // Update order payment status
      await tx.update(orders)
        .set({
          paymentStatus: 'paid',
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Log the action
      await tx.insert(auditLogs).values({
        userId: session.user.id,
        action: 'capture_payment',
        entity: 'payment',
        entityId: paymentId,
        metadata: { orderId: payment.orderId },
        ipAddress: null,
        userAgent: null
      })
    })

    // TODO: Integrate with actual payment gateway
    // For Razorpay: await razorpay.payments.capture(payment.gatewayTransactionId, payment.amount * 100)

    revalidatePath('/admin/payments')
    revalidatePath(`/admin/orders/${payment.orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error capturing payment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to capture payment' }
  }
}

export async function voidPayment(paymentId: string, reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId)
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'authorized') {
      throw new Error('Only authorized payments can be voided')
    }

    await db.transaction(async (tx) => {
      // Update payment status
      await tx.update(payments)
        .set({
          status: 'cancelled',
          failureMessage: reason || 'Payment voided by admin',
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId))

      // Update order payment status
      await tx.update(orders)
        .set({
          paymentStatus: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Log the action
      await tx.insert(auditLogs).values({
        userId: session.user.id,
        action: 'void_payment',
        entity: 'payment',
        entityId: paymentId,
        metadata: { reason, orderId: payment.orderId },
        ipAddress: null,
        userAgent: null
      })
    })

    // TODO: Integrate with actual payment gateway
    // For Razorpay: await razorpay.payments.cancel(payment.gatewayTransactionId)

    revalidatePath('/admin/payments')
    revalidatePath(`/admin/orders/${payment.orderId}`)

    return { success: true }
  } catch (error) {
    console.error('Error voiding payment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to void payment' }
  }
}

export async function updatePaymentSettings(settingsData: {
  razorpayKeyId?: string
  razorpayKeySecret?: string
  webhookSecret?: string
  enableTestMode?: boolean
  enabledPaymentMethods?: string[]
  minAmount?: number
  maxAmount?: number
  currency?: string
  autoCapture?: boolean
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.transaction(async (tx) => {
      // Update each setting
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== undefined) {
          await tx.insert(settings)
            .values({
              key: `payment_${key}`,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value),
              type: typeof value === 'boolean' ? 'boolean' : 
                    typeof value === 'number' ? 'number' : 
                    Array.isArray(value) ? 'array' : 'string'
            })
            .onConflictDoUpdate({
              target: settings.key,
              set: {
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                updatedAt: new Date()
              }
            })
        }
      }

      // Log the action
      await tx.insert(auditLogs).values({
        userId: session.user.id,
        action: 'update_payment_settings',
        entity: 'settings',
        entityId: 'payment_settings',
        metadata: { 
          settings: Object.keys(settingsData),
          // Don't log sensitive values
          sensitiveFieldsUpdated: ['razorpayKeySecret', 'webhookSecret'].filter(key => key in settingsData)
        },
        ipAddress: null,
        userAgent: null
      })
    })

    revalidatePath('/admin/payments/settings')

    return { success: true }
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update payment settings' }
  }
}

export async function getPaymentSettings() {
  try {
    const paymentSettings = await db.query.settings.findMany({
      where: like(settings.key, 'payment_%')
    })

    const settingsMap: Record<string, any> = {}
    
    paymentSettings.forEach(setting => {
      const key = setting.key.replace('payment_', '')
      let value = setting.value

      if (setting.type === 'boolean') {
        value = value === 'true'
      } else if (setting.type === 'number') {
        value = parseFloat(value)
      } else if (setting.type === 'array') {
        value = JSON.parse(value)
      }

      settingsMap[key] = value
    })

    // Don't return sensitive values to the client
    return {
      ...settingsMap,
      razorpayKeySecret: settingsMap.razorpayKeySecret ? '[HIDDEN]' : null,
      webhookSecret: settingsMap.webhookSecret ? '[HIDDEN]' : null
    }
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    throw error
  }
}

export async function retryFailedPayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, paymentId)
    })

    if (!payment) {
      throw new Error('Payment not found')
    }

    if (payment.status !== 'failed') {
      throw new Error('Only failed payments can be retried')
    }

    // TODO: Implement retry logic
    // This would typically involve:
    // 1. Creating a new payment attempt
    // 2. Redirecting customer to payment gateway
    // 3. Updating payment status based on result

    // Log the action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'retry_failed_payment',
      entity: 'payment',
      entityId: paymentId,
      metadata: { orderId: payment.orderId },
      ipAddress: null,
      userAgent: null
    })

    return { success: true, message: 'Payment retry initiated' }
  } catch (error) {
    console.error('Error retrying payment:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to retry payment' }
  }
}

export async function bulkRefund(paymentIds: string[], reason?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const results = []
    
    for (const paymentId of paymentIds) {
      const result = await processRefund({
        paymentId,
        reason: reason || 'Bulk refund processed by admin'
      })
      results.push({ paymentId, ...result })
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    // Log bulk action
    await db.insert(auditLogs).values({
      userId: session.user.id,
      action: 'bulk_refund',
      entity: 'payment',
      entityId: null,
      metadata: { 
        paymentIds,
        successCount,
        failureCount,
        reason 
      },
      ipAddress: null,
      userAgent: null
    })

    return { 
      success: true, 
      results,
      successCount,
      failureCount
    }
  } catch (error) {
    console.error('Error processing bulk refund:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process bulk refund' }
  }
}