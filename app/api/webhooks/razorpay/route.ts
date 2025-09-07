import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { validateWebhookSignature } from '@/lib/razorpay'
import { processRazorpayWebhook, WebhookPayload } from '@/lib/webhook-processor'
import { createId } from '@paralleldrive/cuid2'
import { checkRateLimit, getClientIdentifier, checkWebhookIPWhitelist, logRateLimitViolation } from '@/lib/rate-limit'
import { checkIdempotency, saveIdempotencyResult } from '@/lib/idempotency'
import { SecurityEvents } from '@/lib/security-logger'

// Disable body parsing for raw webhook verification
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const deliveryId = createId()

  try {
    // Get client IP for security checks
    const clientId = getClientIdentifier(request)
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || request.ip || 'unknown'
    
    // Check IP whitelist for webhooks
    const isWhitelisted = await checkWebhookIPWhitelist(clientIP)
    if (!isWhitelisted) {
      console.warn(`[WEBHOOK_SECURITY] Blocked webhook from non-whitelisted IP: ${clientIP}`, {
        deliveryId,
        ip: clientIP,
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      })
      
      // Log security event
      await SecurityEvents.webhookIPBlocked(clientIP)
      
      return NextResponse.json(
        { error: 'Forbidden - IP not whitelisted' },
        { status: 403 }
      )
    }
    
    // Apply rate limiting for webhooks
    const rateLimitResult = await checkRateLimit('webhook', clientId, request)
    
    if (rateLimitResult.blocked) {
      await logRateLimitViolation('webhook', clientId, request, {
        delivery_id: deliveryId,
        action: 'webhook_processing',
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      })
      
      console.warn(`[WEBHOOK_RATE_LIMIT] Rate limit exceeded for webhook from IP: ${clientIP}`, {
        deliveryId,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      })
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          delivery_id: deliveryId,
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

    // Get raw body for signature verification
    const body = await request.text()
    const headersList = headers()
    
    // Check for idempotency using webhook signature or event ID
    let idempotencyKey = `webhook:${deliveryId}`
    try {
      const payload = JSON.parse(body)
      if (payload.entity?.id) {
        idempotencyKey = `webhook:${payload.event}:${payload.entity.id}`
      }
    } catch (e) {
      // Use delivery ID if payload parsing fails
    }
    
    const existingResult = await checkIdempotency(idempotencyKey)
    if (existingResult) {
      console.log(`[WEBHOOK_IDEMPOTENCY] Duplicate webhook detected: ${idempotencyKey}`, {
        deliveryId,
        existingResult
      })
      return NextResponse.json(existingResult)
    }
    
    // Get Razorpay signature from headers
    const razorpaySignature = headersList.get('x-razorpay-signature')
    
    if (!razorpaySignature) {
      console.error('Missing Razorpay signature header')
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      )
    }

    // Validate webhook signature
    const isValidSignature = validateWebhookSignature(body, razorpaySignature)
    
    if (!isValidSignature) {
      console.error('Invalid Razorpay webhook signature')
      
      // Log security event for invalid signature
      await SecurityEvents.webhookSignatureInvalid(clientIP, '/api/webhooks/razorpay')
      
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the webhook payload
    let payload: WebhookPayload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Invalid JSON in webhook payload:', error)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!payload.event || !payload.entity) {
      console.error('Missing required fields in webhook payload:', payload)
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      )
    }

    // Log webhook received with security info
    console.log(`[WEBHOOK] Received Razorpay webhook:`, {
      deliveryId,
      event: payload.event,
      entity: payload.entity,
      ip: clientIP,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      whitelisted: true,
      rateLimitRemaining: rateLimitResult.remaining
    })

    // Process the webhook
    const result = await processRazorpayWebhook(payload, deliveryId)

    const processingTime = Date.now() - startTime

    // Log processing result
    console.log(`[WEBHOOK] Processing completed:`, {
      deliveryId,
      success: result.success,
      processed: result.processed,
      message: result.message,
      processingTime: `${processingTime}ms`,
      error: result.error
    })

    // Return appropriate response
    const response = result.success ? {
      success: true,
      message: result.message,
      processed: result.processed,
      delivery_id: deliveryId,
      processing_time: processingTime
    } : {
      error: result.message,
      details: result.error,
      delivery_id: deliveryId,
      processing_time: processingTime
    }
    
    // Save result for idempotency
    const ttl = result.success ? 3600 : 300 // 1 hour for success, 5 min for errors
    await saveIdempotencyResult(idempotencyKey, response, ttl)
    
    if (result.success) {
      return NextResponse.json(response)
    } else {
      return NextResponse.json(response, { status: 500 })
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    console.error('[WEBHOOK] Unexpected error processing webhook:', {
      deliveryId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    })

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        delivery_id: deliveryId,
        processing_time: processingTime
      },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'razorpay-webhook',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}

// Handle other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}