import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { orders, payments } from '@/db/schema/orders'
import { inventory } from '@/db/schema/inventory'
import { eq, and } from 'drizzle-orm'
import { verifyPaymentSignature, getPaymentDetails } from '@/lib/razorpay'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIdentifier, logRateLimitViolation } from '@/lib/rate-limit'
import { analyzePaymentRisk, logRiskAnalysis } from '@/lib/fraud-detection'
import { checkIdempotency, saveIdempotencyResult } from '@/lib/idempotency'
import { SecurityEvents, createAuditTrail } from '@/lib/security-logger'

interface PaymentVerificationRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  payment_id: string // Our internal payment ID
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await checkRateLimit('payment', clientId, request)
    
    if (rateLimitResult.blocked) {
      await logRateLimitViolation('payment_verification', clientId, request, {
        action: 'payment_verification',
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

    const body: PaymentVerificationRequest = await request.json()
    
    // Check idempotency
    const idempotencyKey = `payment_verify:${body.razorpay_payment_id}`
    const existingResult = await checkIdempotency(idempotencyKey)
    if (existingResult) {
      return NextResponse.json(existingResult)
    }

    // Validate required fields
    if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature || !body.payment_id) {
      return NextResponse.json(
        { error: 'Missing required payment verification data' },
        { status: 400 }
      )
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature({
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id,
      razorpay_signature: body.razorpay_signature
    })

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Get payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, body.payment_id),
      with: {
        order: {
          with: {
            items: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Check if payment is already processed
    if (payment.status === 'captured' || payment.status === 'authorized') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        order_id: payment.orderId,
        status: payment.status
      })
    }

    // Get payment details from Razorpay
    let razorpayPayment
    try {
      razorpayPayment = await getPaymentDetails(body.razorpay_payment_id)
    } catch (error) {
      console.error('Error fetching payment details:', error)
      const errorResult = { error: 'Failed to verify payment with Razorpay' }
      await saveIdempotencyResult(idempotencyKey, errorResult, 300) // 5 min TTL for errors
      return NextResponse.json(errorResult, { status: 500 })
    }

    // Perform fraud detection analysis
    const riskAnalysis = await analyzePaymentRisk({
      paymentId: body.razorpay_payment_id,
      orderId: body.razorpay_order_id,
      amount: razorpayPayment.amount,
      currency: razorpayPayment.currency,
      method: razorpayPayment.method,
      email: razorpayPayment.email,
      contact: razorpayPayment.contact,
      ip: getClientIdentifier(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      card: razorpayPayment.card
    })

    // Log risk analysis
    await logRiskAnalysis({
      paymentId: body.razorpay_payment_id,
      orderId: body.razorpay_order_id,
      riskScore: riskAnalysis.riskScore,
      riskLevel: riskAnalysis.riskLevel,
      factors: riskAnalysis.riskFactors,
      recommendation: riskAnalysis.recommendation,
      ip: getClientIdentifier(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Handle high-risk payments
    if (riskAnalysis.riskLevel === 'high' && riskAnalysis.recommendation === 'block') {
      console.warn(`High-risk payment blocked: ${body.razorpay_payment_id}`, {
        riskScore: riskAnalysis.riskScore,
        factors: riskAnalysis.riskFactors
      })
      
      // Log security event for fraud detection
      await SecurityEvents.paymentFraudBlocked(
        body.razorpay_payment_id,
        getClientIdentifier(request),
        riskAnalysis.riskScore,
        riskAnalysis.riskFactors
      )
      
      // Update payment as fraud-blocked
      await db.update(payments)
        .set({
          status: 'failed',
          failureReason: 'fraud_detected',
          fraudRiskScore: riskAnalysis.riskScore,
          fraudRiskLevel: riskAnalysis.riskLevel,
          failedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(payments.id, body.payment_id))
      
      const fraudResult = {
        success: false,
        error: 'Payment blocked due to suspicious activity',
        risk_score: riskAnalysis.riskScore,
        risk_level: riskAnalysis.riskLevel
      }
      await saveIdempotencyResult(idempotencyKey, fraudResult, 86400) // 24 hour TTL
      return NextResponse.json(fraudResult, { status: 403 })
    }
    
    // Log high-risk payments for monitoring
    if (riskAnalysis.riskLevel === 'high' || riskAnalysis.riskScore >= 60) {
      await SecurityEvents.paymentHighRisk(
        body.razorpay_payment_id,
        getClientIdentifier(request),
        riskAnalysis.riskScore,
        riskAnalysis.riskFactors
      )
    }

    // Verify payment details match
    if (razorpayPayment.order_id !== body.razorpay_order_id) {
      // Log potential fraud attempt
      await SecurityEvents.paymentHighRisk(
        body.razorpay_payment_id,
        getClientIdentifier(request),
        90,
        ['order_id_mismatch', 'potential_fraud']
      )
      
      return NextResponse.json(
        { error: 'Payment order mismatch' },
        { status: 400 }
      )
    }

    if (razorpayPayment.amount !== payment.amount) {
      // Log potential fraud attempt
      await SecurityEvents.paymentHighRisk(
        body.razorpay_payment_id,
        getClientIdentifier(request),
        95,
        ['amount_mismatch', 'potential_fraud']
      )
      
      return NextResponse.json(
        { error: 'Payment amount mismatch' },
        { status: 400 }
      )
    }

    // Determine payment status based on Razorpay response
    let paymentStatus = 'failed'
    let orderStatus = payment.order.status
    let paymentStatusOrder = payment.order.paymentStatus

    if (razorpayPayment.status === 'captured') {
      paymentStatus = 'captured'
      orderStatus = 'processing'
      paymentStatusOrder = 'paid'
    } else if (razorpayPayment.status === 'authorized') {
      paymentStatus = 'authorized'
      orderStatus = 'pending'
      paymentStatusOrder = 'authorized'
    } else if (razorpayPayment.status === 'failed') {
      paymentStatus = 'failed'
      orderStatus = 'failed'
      paymentStatusOrder = 'failed'
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Update payment record
      await tx.update(payments)
        .set({
          status: paymentStatus as any,
          gatewayResponse: razorpayPayment,
          paymentMethod: razorpayPayment.method || 'card',
          cardLast4: razorpayPayment.card?.last4,
          cardBrand: razorpayPayment.card?.network,
          capturedAt: razorpayPayment.status === 'captured' ? new Date() : null,
          authorizedAt: razorpayPayment.status === 'authorized' ? new Date() : null,
          failedAt: razorpayPayment.status === 'failed' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(payments.id, body.payment_id))

      // Update order status
      await tx.update(orders)
        .set({
          status: orderStatus as any,
          paymentStatus: paymentStatusOrder as any,
          processedAt: paymentStatus === 'captured' ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(orders.id, payment.orderId))

      // Reserve inventory for successful payments
      if (paymentStatus === 'captured' || paymentStatus === 'authorized') {
        for (const item of payment.order.items) {
          if (item.variantId) {
            // Decrement available quantity and increment reserved quantity
            await tx.update(inventory)
              .set({
                availableQuantity: inventory.availableQuantity - item.quantity,
                reservedQuantity: inventory.reservedQuantity + item.quantity,
                updatedAt: new Date()
              })
              .where(and(
                eq(inventory.productVariantId, item.variantId),
                eq(inventory.locationId, 'default') // Assuming default location
              ))
          }
        }
      }
    })

    // Revalidate relevant pages
    revalidatePath('/admin/orders')
    revalidatePath(`/account/orders/${payment.order.orderNumber}`)

    const successResult = {
      success: true,
      message: 'Payment verified successfully',
      order_id: payment.orderId,
      order_number: payment.order.orderNumber,
      status: paymentStatus,
      payment_method: razorpayPayment.method,
      amount: razorpayPayment.amount,
      risk_score: riskAnalysis.riskScore,
      risk_level: riskAnalysis.riskLevel
    }

    // Create audit trail for successful payment
    await createAuditTrail({
      userId: payment.order.userId || 'anonymous',
      action: 'payment_verified',
      resource: 'payment',
      resourceId: body.razorpay_payment_id,
      ip: getClientIdentifier(request),
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        order_id: payment.orderId,
        amount: razorpayPayment.amount,
        currency: razorpayPayment.currency,
        payment_method: razorpayPayment.method,
        risk_score: riskAnalysis.riskScore,
        risk_level: riskAnalysis.riskLevel,
        status: paymentStatus
      }
    })
    
    // Save result for idempotency
    await saveIdempotencyResult(idempotencyKey, successResult, 3600) // 1 hour TTL for success
    
    return NextResponse.json(successResult)

  } catch (error) {
    console.error('Error verifying payment:', error)
    
    // Log security error
    const clientId = getClientIdentifier(request)
    console.error('[SECURITY_ERROR] Payment verification failed', {
      timestamp: new Date().toISOString(),
      client_id: clientId,
      ip: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      url: request.url,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}