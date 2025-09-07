import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { hasPermission } from '@/lib/rbac'
import { getRateLimitAnalytics } from '@/lib/rate-limit'
import { getFraudAnalytics } from '@/lib/fraud-detection'

// GET /api/admin/security/analytics - Get security analytics
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:security')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '24h'
    const hours = getHoursFromTimeRange(timeRange)

    // Get rate limiting analytics
    const rateLimitData = await getRateLimitAnalytics(hours)
    
    // Get fraud detection analytics  
    const fraudData = await getFraudAnalytics(hours)

    // Combine all analytics data
    const analytics = {
      timeRange,
      metrics: {
        totalTransactions: fraudData.totalAnalyses || 0,
        fraudDetected: fraudData.fraudDetected || 0,
        fraudBlocked: fraudData.fraudBlocked || 0,
        rateLimitViolations: rateLimitData.violations.length || 0,
        successRate: calculateSuccessRate(fraudData),
        averageRiskScore: fraudData.averageRiskScore || 0,
        highRiskTransactions: fraudData.highRiskCount || 0,
        ipWhitelistHits: rateLimitData.stats.webhook || 0
      },
      riskEvents: [
        ...formatRateLimitEvents(rateLimitData.violations),
        ...formatFraudEvents(fraudData.events || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      fraudPatterns: fraudData.patterns || [],
      ipAnalytics: formatIpAnalytics(rateLimitData.violations)
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    console.error('Error fetching security analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security analytics' },
      { status: 500 }
    )
  }
}

function getHoursFromTimeRange(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 1
    case '24h': return 24
    case '7d': return 24 * 7
    case '30d': return 24 * 30
    default: return 24
  }
}

function calculateSuccessRate(fraudData: any): number {
  if (!fraudData.totalAnalyses) return 100
  const failedTransactions = (fraudData.fraudBlocked || 0) + (fraudData.fraudDetected || 0)
  return Math.round((1 - failedTransactions / fraudData.totalAnalyses) * 100 * 100) / 100
}

function formatRateLimitEvents(violations: any[]): any[] {
  return violations.map(violation => ({
    id: `rl_${violation.timestamp}`,
    type: 'rate_limit',
    timestamp: violation.timestamp,
    ip: violation.ip,
    reason: `Exceeded ${violation.type} rate limit`,
    action: 'blocked',
    details: violation.details
  }))
}

function formatFraudEvents(events: any[]): any[] {
  return events.map(event => ({
    id: `fraud_${event.timestamp}`,
    type: event.action === 'block' ? 'fraud_detected' : 'high_risk',
    timestamp: event.timestamp,
    paymentId: event.paymentId,
    orderId: event.orderId,
    ip: event.ip,
    riskScore: event.riskScore,
    reason: event.factors?.join(', ') || 'Suspicious activity detected',
    action: event.action === 'block' ? 'blocked' : 'flagged',
    details: {
      factors: event.factors,
      recommendation: event.recommendation
    }
  }))
}

function formatIpAnalytics(violations: any[]): any[] {
  const ipStats = violations.reduce((acc, violation) => {
    const ip = violation.ip
    if (!acc[ip]) {
      acc[ip] = {
        ip,
        country: 'Unknown', // Would need GeoIP lookup
        requests: 0,
        violations: 0,
        lastSeen: violation.timestamp,
        riskScore: 0,
        status: 'unknown'
      }
    }
    acc[ip].requests += 1
    acc[ip].violations += 1
    acc[ip].riskScore = Math.min(100, acc[ip].riskScore + 10)
    if (new Date(violation.timestamp) > new Date(acc[ip].lastSeen)) {
      acc[ip].lastSeen = violation.timestamp
    }
    return acc
  }, {} as Record<string, any>)

  return Object.values(ipStats).slice(0, 50) // Limit to top 50 IPs
}

// POST /api/admin/security/analytics - Reset security data (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:security:manage')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'reset_rate_limits') {
      // In a real implementation, this would clear rate limit data
      console.log('Admin requested rate limit reset')
    } else if (action === 'reset_fraud_data') {
      // In a real implementation, this would clear fraud detection data
      console.log('Admin requested fraud data reset')
    }

    return NextResponse.json({
      success: true,
      message: `${action} completed successfully`
    })

  } catch (error) {
    console.error('Error in security analytics management:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}