import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, payments } from '@/db/schema/orders'
import { eq, and } from 'drizzle-orm'
import { createRazorpayOrder, getRazorpayConfig } from '@/lib/razorpay'
import { createId } from '@paralleldrive/cuid2'
import { checkRateLimit, getClientIdentifier, logRateLimitViolation } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await checkRateLimit('orderCreation', clientId, request)
    
    if (rateLimitResult.blocked) {
      await logRateLimitViolation('order_payment_creation', clientId, request, {
        order_id: params.id,
        action: 'payment_order_creation',
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      })
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          retry_after: Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toISOString()
          }
        }
      )
    }
    
    const orderId = params.id

    // Get order details
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        payments: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if order already has a successful payment
    const successfulPayment = order.payments?.find(p => 
      p.status === 'captured' || p.status === 'authorized'
    )

    if (successfulPayment) {
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      )
    }

    // Check if there's already a pending Razorpay order
    const pendingPayment = order.payments?.find(p => 
      p.gateway === 'razorpay' && 
      p.status === 'pending' && 
      p.gatewayTransactionId
    )

    let razorpayOrder
    let paymentRecord

    if (pendingPayment?.gatewayTransactionId) {
      // Use existing Razorpay order
      razorpayOrder = {
        id: pendingPayment.gatewayTransactionId,
        amount: pendingPayment.amount,
        currency: pendingPayment.currency || 'INR'
      }
      paymentRecord = pendingPayment
    } else {
      // Create new Razorpay order
      const receipt = `${order.orderNumber}-${createId()}`
      
      razorpayOrder = await createRazorpayOrder({
        amount: order.totalAmount,
        currency: order.currency,
        receipt,
        notes: {
          order_id: order.id,
          order_number: order.orderNumber,
          customer_email: order.email
        }
      })

      // Create payment record
      const [newPayment] = await db.insert(payments).values({
        orderId: order.id,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'pending',
        gateway: 'razorpay',
        gatewayTransactionId: razorpayOrder.id,
        gatewayResponse: razorpayOrder,
        paymentMethod: 'card',
        idempotencyKey: createId()
      }).returning()

      paymentRecord = newPayment
    }

    // Get Razorpay config for client
    const razorpayConfig = getRazorpayConfig()

    return NextResponse.json({
      success: true,
      razorpay: {
        key: razorpayConfig.key_id,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Your Store',
        description: `Order #${order.orderNumber}`,
        prefill: {
          name: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
          email: order.email,
          contact: order.phone || ''
        },
        notes: {
          order_id: order.id,
          order_number: order.orderNumber
        },
        theme: {
          color: '#000000'
        }
      },
      payment_id: paymentRecord.id
    })

  } catch (error) {
    console.error('Error creating payment order:', error)
    
    // Log security error
    const clientId = getClientIdentifier(request)
    console.error('[SECURITY_ERROR] Payment order creation failed', {
      timestamp: new Date().toISOString(),
      client_id: clientId,
      ip: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      url: request.url,
      order_id: params.id,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    )
  }
}

// GET endpoint to check payment status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        payments: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const latestPayment = order.payments?.[0] // Assuming ordered by created_at DESC

    return NextResponse.json({
      order_id: order.id,
      order_number: order.orderNumber,
      status: order.status,
      payment_status: order.paymentStatus,
      total_amount: order.totalAmount,
      currency: order.currency,
      payment: latestPayment ? {
        id: latestPayment.id,
        status: latestPayment.status,
        gateway: latestPayment.gateway,
        payment_method: latestPayment.paymentMethod,
        gateway_transaction_id: latestPayment.gatewayTransactionId,
        created_at: latestPayment.createdAt,
        captured_at: latestPayment.capturedAt
      } : null
    })

  } catch (error) {
    console.error('Error fetching order payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}