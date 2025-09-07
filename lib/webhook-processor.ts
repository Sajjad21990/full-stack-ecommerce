'use server'

import { db } from '@/lib/db'
import { orders, payments } from '@/db/schema/orders'
import { stockLevels } from '@/db/schema/inventory'
import { webhookDeliveries } from '@/db/schema/system'
import { eq, and, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { getPaymentDetails, getOrderDetails } from '@/lib/razorpay'
import { checkIdempotency, saveIdempotencyResult, generateWebhookIdempotencyKey } from '@/lib/idempotency'
import { auditActions } from '@/lib/admin/audit'
import { revalidatePath } from 'next/cache'

export interface WebhookPayload {
  entity: string
  account_id: string
  event: string
  contains: string[]
  payload: {
    payment?: {
      entity: any
    }
    order?: {
      entity: any
    }
  }
  created_at: number
}

export interface WebhookProcessingResult {
  success: boolean
  message: string
  processed: boolean
  error?: string
}

/**
 * Process Razorpay webhook payload
 */
export async function processRazorpayWebhook(
  payload: WebhookPayload,
  deliveryId?: string
): Promise<WebhookProcessingResult> {
  const startTime = Date.now()
  
  try {
    // Generate idempotency key
    const resourceId = payload.payload.payment?.entity?.id || 
                      payload.payload.order?.entity?.id || 
                      'unknown'
    
    const idempotencyKey = generateWebhookIdempotencyKey(
      deliveryId || createId(),
      payload.event,
      resourceId
    )

    // Check idempotency
    const idempotencyCheck = await checkIdempotency(idempotencyKey, 120) // 2 hours TTL

    if (!idempotencyCheck.isNew) {
      return {
        success: true,
        message: 'Webhook already processed',
        processed: false,
        ...(idempotencyCheck.result as any)
      }
    }

    let result: WebhookProcessingResult

    // Process based on event type
    switch (payload.event) {
      case 'payment.captured':
        result = await handlePaymentCaptured(payload)
        break
      
      case 'payment.authorized':
        result = await handlePaymentAuthorized(payload)
        break
      
      case 'payment.failed':
        result = await handlePaymentFailed(payload)
        break
      
      case 'order.paid':
        result = await handleOrderPaid(payload)
        break
      
      default:
        result = {
          success: true,
          message: `Unhandled event type: ${payload.event}`,
          processed: false
        }
    }

    // Save idempotency result
    await saveIdempotencyResult(
      idempotencyKey,
      result,
      result.success ? 'success' : 'error',
      result.error
    )

    // Log webhook processing
    if (deliveryId) {
      await logWebhookDelivery(deliveryId, payload, result, Date.now() - startTime)
    }

    return result

  } catch (error) {
    console.error('Error processing webhook:', error)
    
    const errorResult = {
      success: false,
      message: 'Webhook processing failed',
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }

    // Log failed processing
    if (deliveryId) {
      await logWebhookDelivery(deliveryId, payload, errorResult, Date.now() - startTime)
    }

    return errorResult
  }
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payload: WebhookPayload): Promise<WebhookProcessingResult> {
  const paymentEntity = payload.payload.payment?.entity
  
  if (!paymentEntity) {
    return {
      success: false,
      message: 'Payment entity not found in payload',
      processed: false,
      error: 'Missing payment entity'
    }
  }

  try {
    // Fetch full payment details from Razorpay
    const paymentDetails = await getPaymentDetails(paymentEntity.id)
    
    // Find the payment record in our database
    const payment = await db.query.payments.findFirst({
      where: eq(payments.gatewayTransactionId, paymentEntity.order_id),
      with: {
        order: {
          with: {
            items: true
          }
        }
      }
    })

    if (!payment) {
      return {
        success: false,
        message: `Payment record not found for order: ${paymentEntity.order_id}`,
        processed: false,
        error: 'Payment record not found'
      }
    }

    // Check if already processed
    if (payment.status === 'captured') {
      return {
        success: true,
        message: 'Payment already captured',
        processed: false
      }
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Update payment status
      await tx.update(payments)
        .set({
          status: 'captured',
          gatewayResponse: paymentDetails,
          paymentMethod: paymentDetails.method || payment.paymentMethod,
          cardLast4: paymentDetails.card?.last4,
          cardBrand: paymentDetails.card?.network,
          capturedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(payments.id, payment.id))

      // Update order status
      await tx.update(orders)
        .set({
          status: 'processing',
          paymentStatus: 'paid',
          processedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Update inventory - convert reserved to committed
      for (const item of payment.order.items) {
        if (item.variantId) {
          await tx.update(inventory)
            .set({
              reservedQuantity: sql`GREATEST(${inventory.reservedQuantity} - ${item.quantity}, 0)`,
              committedQuantity: inventory.committedQuantity + item.quantity,
              updatedAt: new Date()
            })
            .where(and(
              eq(inventory.productVariantId, item.variantId),
              eq(inventory.locationId, 'default')
            ))
        }
      }

      // Log the action
      await auditActions.log({
        userId: 'system',
        action: 'PAYMENT_CAPTURED',
        resourceType: 'payment',
        resourceId: payment.id,
        changes: {
          payment_id: paymentEntity.id,
          order_id: payment.orderId,
          amount: paymentDetails.amount,
          method: paymentDetails.method
        }
      })
    })

    // Revalidate relevant pages
    revalidatePath('/admin/orders')
    revalidatePath(`/account/orders/${payment.order.orderNumber}`)

    return {
      success: true,
      message: 'Payment captured successfully',
      processed: true
    }

  } catch (error) {
    console.error('Error handling payment.captured:', error)
    return {
      success: false,
      message: 'Failed to process payment capture',
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle payment.authorized event
 */
async function handlePaymentAuthorized(payload: WebhookPayload): Promise<WebhookProcessingResult> {
  const paymentEntity = payload.payload.payment?.entity
  
  if (!paymentEntity) {
    return {
      success: false,
      message: 'Payment entity not found in payload',
      processed: false,
      error: 'Missing payment entity'
    }
  }

  try {
    // Find the payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.gatewayTransactionId, paymentEntity.order_id),
      with: {
        order: true
      }
    })

    if (!payment) {
      return {
        success: false,
        message: `Payment record not found for order: ${paymentEntity.order_id}`,
        processed: false,
        error: 'Payment record not found'
      }
    }

    // Check if already processed
    if (payment.status === 'authorized' || payment.status === 'captured') {
      return {
        success: true,
        message: 'Payment already authorized',
        processed: false
      }
    }

    // Update payment and order status
    await db.transaction(async (tx) => {
      await tx.update(payments)
        .set({
          status: 'authorized',
          authorizedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(payments.id, payment.id))

      await tx.update(orders)
        .set({
          status: 'pending',
          paymentStatus: 'authorized',
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Log the action
      await auditActions.log({
        userId: 'system',
        action: 'PAYMENT_AUTHORIZED',
        resourceType: 'payment',
        resourceId: payment.id,
        changes: {
          payment_id: paymentEntity.id,
          order_id: payment.orderId,
          amount: paymentEntity.amount
        }
      })
    })

    return {
      success: true,
      message: 'Payment authorized successfully',
      processed: true
    }

  } catch (error) {
    console.error('Error handling payment.authorized:', error)
    return {
      success: false,
      message: 'Failed to process payment authorization',
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload: WebhookPayload): Promise<WebhookProcessingResult> {
  const paymentEntity = payload.payload.payment?.entity
  
  if (!paymentEntity) {
    return {
      success: false,
      message: 'Payment entity not found in payload',
      processed: false,
      error: 'Missing payment entity'
    }
  }

  try {
    // Find the payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.gatewayTransactionId, paymentEntity.order_id),
      with: {
        order: {
          with: {
            items: true
          }
        }
      }
    })

    if (!payment) {
      return {
        success: false,
        message: `Payment record not found for order: ${paymentEntity.order_id}`,
        processed: false,
        error: 'Payment record not found'
      }
    }

    // Start transaction to handle failure
    await db.transaction(async (tx) => {
      // Update payment status
      await tx.update(payments)
        .set({
          status: 'failed',
          gatewayResponse: paymentEntity,
          failedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(payments.id, payment.id))

      // Update order status
      await tx.update(orders)
        .set({
          status: 'payment_failed',
          paymentStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Release reserved inventory
      for (const item of payment.order.items) {
        if (item.variantId) {
          await tx.update(inventory)
            .set({
              availableQuantity: inventory.availableQuantity + item.quantity,
              reservedQuantity: sql`GREATEST(${inventory.reservedQuantity} - ${item.quantity}, 0)`,
              updatedAt: new Date()
            })
            .where(and(
              eq(inventory.productVariantId, item.variantId),
              eq(inventory.locationId, 'default')
            ))
        }
      }

      // Log the action
      await auditActions.log({
        userId: 'system',
        action: 'PAYMENT_FAILED',
        resourceType: 'payment',
        resourceId: payment.id,
        changes: {
          payment_id: paymentEntity.id,
          order_id: payment.orderId,
          error_code: paymentEntity.error_code,
          error_description: paymentEntity.error_description
        }
      })
    })

    return {
      success: true,
      message: 'Payment failure processed successfully',
      processed: true
    }

  } catch (error) {
    console.error('Error handling payment.failed:', error)
    return {
      success: false,
      message: 'Failed to process payment failure',
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(payload: WebhookPayload): Promise<WebhookProcessingResult> {
  const orderEntity = payload.payload.order?.entity
  
  if (!orderEntity) {
    return {
      success: false,
      message: 'Order entity not found in payload',
      processed: false,
      error: 'Missing order entity'
    }
  }

  try {
    // Find the order record
    const order = await db.query.orders.findFirst({
      where: sql`
        EXISTS (
          SELECT 1 FROM ${payments} p 
          WHERE p.order_id = ${orders.id} 
          AND p.gateway_transaction_id = ${orderEntity.id}
        )
      `,
      with: {
        payments: true
      }
    })

    if (!order) {
      return {
        success: false,
        message: `Order record not found for Razorpay order: ${orderEntity.id}`,
        processed: false,
        error: 'Order record not found'
      }
    }

    // Check if already marked as paid
    if (order.paymentStatus === 'paid') {
      return {
        success: true,
        message: 'Order already marked as paid',
        processed: false
      }
    }

    // Update order status
    await db.update(orders)
      .set({
        paymentStatus: 'paid',
        updatedAt: new Date()
      })
      .where(eq(orders.id, order.id))

    return {
      success: true,
      message: 'Order marked as paid successfully',
      processed: true
    }

  } catch (error) {
    console.error('Error handling order.paid:', error)
    return {
      success: false,
      message: 'Failed to process order paid event',
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Log webhook delivery for monitoring
 */
async function logWebhookDelivery(
  deliveryId: string,
  payload: WebhookPayload,
  result: WebhookProcessingResult,
  processingTime: number
): Promise<void> {
  try {
    await db.insert(webhookDeliveries).values({
      id: deliveryId,
      webhookId: 'razorpay-webhook',
      eventType: payload.event,
      payload: payload,
      status: result.success ? 'success' : 'failed',
      response: result,
      processingTime,
      completedAt: new Date()
    })
  } catch (error) {
    console.error('Error logging webhook delivery:', error)
    // Don't throw - this is just logging
  }
}