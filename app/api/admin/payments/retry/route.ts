import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { hasPermission } from '@/lib/rbac'
import { retryFailedPayments, syncPaymentStatus, cleanupOldFailures } from '@/lib/payment-retry'

// POST /api/admin/payments/retry - Retry failed payments
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:payments')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      maxRetries = 3, 
      retryDelayMinutes = 30, 
      skipRecentFailures = true 
    } = body

    // Retry failed payments
    const result = await retryFailedPayments({
      maxRetries,
      retryDelayMinutes,
      skipRecentFailures
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        retries_processed: result.retriesProcessed,
        errors: result.errors
      })
    } else {
      return NextResponse.json(
        {
          error: result.message,
          retries_processed: result.retriesProcessed,
          errors: result.errors
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in payment retry endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/payments/retry - Sync payment status
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:payments')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Sync payment status with Razorpay
    const result = await syncPaymentStatus(paymentId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        updated: result.updated
      })
    } else {
      return NextResponse.json(
        {
          error: result.message,
          updated: result.updated
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in payment sync endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/payments/retry - Cleanup old failed payments
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:payments')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const daysOld = parseInt(searchParams.get('daysOld') || '30')

    if (daysOld < 7) {
      return NextResponse.json(
        { error: 'Cannot cleanup payments less than 7 days old' },
        { status: 400 }
      )
    }

    // Cleanup old failed payments
    const result = await cleanupOldFailures(daysOld)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        cleaned: result.cleaned
      })
    } else {
      return NextResponse.json(
        {
          error: result.message,
          cleaned: result.cleaned
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in payment cleanup endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}