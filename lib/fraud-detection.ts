// Fraud detection module

import { db } from '@/lib/db'
import { orders, payments } from '@/db/schema/orders'
import { auditLogs } from '@/db/schema/audit'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export interface FraudRisk {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100
  reasons: string[]
  flags: string[]
  recommendations: string[]
}

export interface PaymentContext {
  orderId: string
  amount: number
  currency: string
  email: string
  ipAddress?: string
  userAgent?: string
  billingAddress?: any
  shippingAddress?: any
  paymentMethod?: string
  cardLast4?: string
  cardBrand?: string
}

/**
 * Analyze payment for fraud risk
 */
export async function analyzePaymentFraud(
  context: PaymentContext
): Promise<FraudRisk> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    // 1. Amount-based checks
    const amountRisk = await checkAmountAnomalies(context)
    score += amountRisk.score
    flags.push(...amountRisk.flags)
    reasons.push(...amountRisk.reasons)

    // 2. Velocity checks (frequency of orders)
    const velocityRisk = await checkVelocityAnomalies(context)
    score += velocityRisk.score
    flags.push(...velocityRisk.flags)
    reasons.push(...velocityRisk.reasons)

    // 3. Geographic checks
    const geoRisk = await checkGeographicAnomalies(context)
    score += geoRisk.score
    flags.push(...geoRisk.flags)
    reasons.push(...geoRisk.reasons)

    // 4. Email/Identity checks
    const identityRisk = await checkIdentityAnomalies(context)
    score += identityRisk.score
    flags.push(...identityRisk.flags)
    reasons.push(...identityRisk.reasons)

    // 5. Device/Browser checks
    const deviceRisk = await checkDeviceAnomalies(context)
    score += deviceRisk.score
    flags.push(...deviceRisk.flags)
    reasons.push(...deviceRisk.reasons)

    // 6. Historical pattern checks
    const patternRisk = await checkPatternAnomalies(context)
    score += patternRisk.score
    flags.push(...patternRisk.flags)
    reasons.push(...patternRisk.reasons)

    // Determine risk level
    const level = getRiskLevel(score)
    const recommendations = generateRecommendations(level, flags)

    // Log the analysis
    await logFraudAnalysis(context, {
      level,
      score,
      reasons,
      flags,
      recommendations,
    })

    return {
      level,
      score: Math.min(score, 100), // Cap at 100
      reasons: [...new Set(reasons)], // Remove duplicates
      flags: [...new Set(flags)],
      recommendations,
    }
  } catch (error) {
    console.error('Error in fraud analysis:', error)

    // Return safe default on error
    return {
      level: 'medium',
      score: 50,
      reasons: ['Analysis failed - manual review required'],
      flags: ['ANALYSIS_ERROR'],
      recommendations: ['Manual review required'],
    }
  }
}

/**
 * Check for unusual payment amounts
 */
async function checkAmountAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    // Get recent payment statistics for this email
    const recentPayments = await db.query.orders.findMany({
      where: and(
        eq(orders.email, context.email),
        gte(orders.createdAt, sql`NOW() - INTERVAL '30 days'`)
      ),
      limit: 50,
      orderBy: desc(orders.createdAt),
    })

    if (recentPayments.length > 0) {
      const amounts = recentPayments.map((p) => p.totalAmount)
      const avgAmount =
        amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
      const maxAmount = Math.max(...amounts)

      // Very high amount compared to history
      if (context.amount > avgAmount * 10) {
        score += 25
        flags.push('HIGH_AMOUNT_DEVIATION')
        reasons.push(
          `Amount ${context.amount / 100} is 10x higher than average ${avgAmount / 100}`
        )
      } else if (context.amount > avgAmount * 5) {
        score += 15
        flags.push('MEDIUM_AMOUNT_DEVIATION')
        reasons.push(
          `Amount ${context.amount / 100} is 5x higher than average ${avgAmount / 100}`
        )
      }

      // Suspiciously round numbers
      if (context.amount % 100000 === 0 && context.amount > 500000) {
        // Round to thousands and > 5000
        score += 10
        flags.push('ROUND_AMOUNT')
        reasons.push('Suspiciously round payment amount')
      }
    }

    // Very high amounts (potential stolen cards)
    if (context.amount > 10000000) {
      // > 100,000 INR
      score += 20
      flags.push('VERY_HIGH_AMOUNT')
      reasons.push('Very high payment amount')
    } else if (context.amount > 5000000) {
      // > 50,000 INR
      score += 10
      flags.push('HIGH_AMOUNT')
      reasons.push('High payment amount')
    }

    // Very small amounts (potential card testing)
    if (context.amount < 100) {
      // < 1 INR
      score += 15
      flags.push('CARD_TESTING')
      reasons.push('Very small amount - possible card testing')
    }
  } catch (error) {
    console.error('Error in amount anomaly check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Check for unusual order frequency (velocity)
 */
async function checkVelocityAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    // Check orders in last hour
    const lastHourOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.email, context.email),
        gte(orders.createdAt, sql`NOW() - INTERVAL '1 hour'`)
      ),
    })

    // Check orders in last 24 hours
    const last24HoursOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.email, context.email),
        gte(orders.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      ),
    })

    // Too many orders in short time
    if (lastHourOrders.length > 5) {
      score += 30
      flags.push('HIGH_VELOCITY_HOUR')
      reasons.push(`${lastHourOrders.length} orders in last hour`)
    } else if (lastHourOrders.length > 2) {
      score += 15
      flags.push('MEDIUM_VELOCITY_HOUR')
      reasons.push(`${lastHourOrders.length} orders in last hour`)
    }

    if (last24HoursOrders.length > 20) {
      score += 25
      flags.push('HIGH_VELOCITY_DAY')
      reasons.push(`${last24HoursOrders.length} orders in last 24 hours`)
    } else if (last24HoursOrders.length > 10) {
      score += 15
      flags.push('MEDIUM_VELOCITY_DAY')
      reasons.push(`${last24HoursOrders.length} orders in last 24 hours`)
    }

    // Check for rapid successive orders (within minutes)
    if (lastHourOrders.length > 1) {
      const sortedOrders = lastHourOrders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      for (let i = 0; i < sortedOrders.length - 1; i++) {
        const timeDiff =
          new Date(sortedOrders[i].createdAt).getTime() -
          new Date(sortedOrders[i + 1].createdAt).getTime()

        if (timeDiff < 60000) {
          // Less than 1 minute
          score += 20
          flags.push('RAPID_SUCCESSION')
          reasons.push('Multiple orders within minutes')
          break
        }
      }
    }
  } catch (error) {
    console.error('Error in velocity check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Check for geographic anomalies
 */
async function checkGeographicAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    const { billingAddress, shippingAddress } = context

    if (billingAddress && shippingAddress) {
      // Different countries
      if (billingAddress.country !== shippingAddress.country) {
        score += 15
        flags.push('COUNTRY_MISMATCH')
        reasons.push(
          `Billing (${billingAddress.country}) and shipping (${shippingAddress.country}) in different countries`
        )
      }

      // Very different states (for same country)
      if (
        billingAddress.country === shippingAddress.country &&
        billingAddress.country === 'India' &&
        billingAddress.state !== shippingAddress.state
      ) {
        // Check if states are far apart (basic check)
        const distantStates = ['Kashmir', 'Kerala', 'Tamil Nadu', 'West Bengal']
        if (
          distantStates.includes(billingAddress.state) &&
          distantStates.includes(shippingAddress.state) &&
          billingAddress.state !== shippingAddress.state
        ) {
          score += 10
          flags.push('DISTANT_ADDRESSES')
          reasons.push('Billing and shipping addresses in distant states')
        }
      }
    }

    // Get historical addresses for this email
    const recentOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.email, context.email),
        gte(orders.createdAt, sql`NOW() - INTERVAL '90 days'`)
      ),
      limit: 20,
    })

    if (recentOrders.length > 0) {
      const historicalCountries = new Set(
        recentOrders.map((o) => o.shippingAddress?.country).filter(Boolean)
      )

      // Shipping to new country
      if (
        shippingAddress?.country &&
        !historicalCountries.has(shippingAddress.country)
      ) {
        score += 10
        flags.push('NEW_SHIPPING_COUNTRY')
        reasons.push(`First time shipping to ${shippingAddress.country}`)
      }
    }
  } catch (error) {
    console.error('Error in geographic check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Check for identity-related anomalies
 */
async function checkIdentityAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    // Suspicious email patterns
    const email = context.email.toLowerCase()

    // Temporary/disposable email domains
    const disposableEmailDomains = [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email',
    ]

    const emailDomain = email.split('@')[1]
    if (disposableEmailDomains.includes(emailDomain)) {
      score += 20
      flags.push('DISPOSABLE_EMAIL')
      reasons.push('Using disposable email service')
    }

    // Recently created email (if we can detect)
    if (email.includes('+')) {
      score += 5
      flags.push('EMAIL_ALIAS')
      reasons.push('Using email alias')
    }

    // Check for multiple orders with different emails but similar patterns
    const emailBase = email
      .split('@')[0]
      .replace(/[0-9]+$/, '')
      .replace(/[._-]/g, '')
    if (emailBase.length < 5) {
      score += 10
      flags.push('SHORT_EMAIL_PREFIX')
      reasons.push('Very short email prefix')
    }

    // Check payment method changes
    const recentPayments = await db.query.payments.findMany({
      where: sql`
        EXISTS (
          SELECT 1 FROM ${orders} o 
          WHERE o.id = ${payments.orderId} 
          AND o.email = ${context.email}
          AND o.created_at > NOW() - INTERVAL '30 days'
        )
      `,
      limit: 10,
      orderBy: desc(payments.createdAt),
    })

    if (recentPayments.length > 0) {
      const paymentMethods = new Set(recentPayments.map((p) => p.paymentMethod))
      const cardBrands = new Set(
        recentPayments.map((p) => p.cardBrand).filter(Boolean)
      )

      // Multiple payment methods
      if (paymentMethods.size > 3) {
        score += 15
        flags.push('MULTIPLE_PAYMENT_METHODS')
        reasons.push(`Used ${paymentMethods.size} different payment methods`)
      }

      // Multiple card brands
      if (cardBrands.size > 2) {
        score += 10
        flags.push('MULTIPLE_CARD_BRANDS')
        reasons.push(`Used ${cardBrands.size} different card brands`)
      }
    }
  } catch (error) {
    console.error('Error in identity check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Check for device/browser anomalies
 */
async function checkDeviceAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    if (context.userAgent) {
      // Suspicious user agents
      const userAgent = context.userAgent.toLowerCase()

      // Headless browsers
      if (
        userAgent.includes('headless') ||
        userAgent.includes('phantom') ||
        userAgent.includes('selenium')
      ) {
        score += 25
        flags.push('HEADLESS_BROWSER')
        reasons.push('Using headless browser')
      }

      // Bot indicators
      if (
        userAgent.includes('bot') ||
        userAgent.includes('crawler') ||
        userAgent.includes('spider')
      ) {
        score += 20
        flags.push('BOT_USER_AGENT')
        reasons.push('Bot-like user agent')
      }

      // Very old browsers (potential fraud tools)
      if (userAgent.includes('msie') && userAgent.includes('6.0')) {
        score += 15
        flags.push('OLD_BROWSER')
        reasons.push('Using very old browser')
      }

      // No user agent
      if (!context.userAgent || context.userAgent === '') {
        score += 10
        flags.push('NO_USER_AGENT')
        reasons.push('No user agent provided')
      }
    }

    // IP address checks
    if (context.ipAddress) {
      // Check for known proxy/VPN ranges (basic check)
      if (
        context.ipAddress.startsWith('10.') ||
        context.ipAddress.startsWith('192.168.') ||
        context.ipAddress.startsWith('172.')
      ) {
        // Private IP ranges - could be behind proxy
        score += 5
        flags.push('PRIVATE_IP')
        reasons.push('Using private IP address')
      }

      // Check recent IP changes for this email
      const recentOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.email, context.email),
          gte(orders.createdAt, sql`NOW() - INTERVAL '7 days'`)
        ),
        limit: 10,
      })

      if (recentOrders.length > 0) {
        const recentIPs = new Set(
          recentOrders.map((o) => o.ipAddress).filter(Boolean)
        )

        if (!recentIPs.has(context.ipAddress) && recentIPs.size > 0) {
          score += 5
          flags.push('IP_CHANGE')
          reasons.push('New IP address for this email')
        }

        // Too many different IPs
        if (recentIPs.size > 5) {
          score += 15
          flags.push('MULTIPLE_IPS')
          reasons.push(`Used ${recentIPs.size} different IP addresses recently`)
        }
      }
    }
  } catch (error) {
    console.error('Error in device check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Check for suspicious patterns
 */
async function checkPatternAnomalies(context: PaymentContext): Promise<{
  score: number
  flags: string[]
  reasons: string[]
}> {
  const flags: string[] = []
  const reasons: string[] = []
  let score = 0

  try {
    // Check for failed payments recently
    const recentFailedPayments = await db.query.payments.findMany({
      where: and(
        sql`
          EXISTS (
            SELECT 1 FROM ${orders} o 
            WHERE o.id = ${payments.orderId} 
            AND o.email = ${context.email}
          )
        `,
        eq(payments.status, 'failed'),
        gte(payments.createdAt, sql`NOW() - INTERVAL '24 hours'`)
      ),
    })

    if (recentFailedPayments.length > 5) {
      score += 30
      flags.push('MULTIPLE_FAILURES')
      reasons.push(`${recentFailedPayments.length} failed payments in 24 hours`)
    } else if (recentFailedPayments.length > 2) {
      score += 15
      flags.push('SOME_FAILURES')
      reasons.push(`${recentFailedPayments.length} failed payments in 24 hours`)
    }

    // Check for chargebacks or refunds
    const recentRefunds = await db.query.payments.findMany({
      where: and(
        sql`
          EXISTS (
            SELECT 1 FROM ${orders} o 
            WHERE o.id = ${payments.orderId} 
            AND o.email = ${context.email}
          )
        `,
        eq(payments.status, 'refunded'),
        gte(payments.createdAt, sql`NOW() - INTERVAL '30 days'`)
      ),
    })

    if (recentRefunds.length > 2) {
      score += 20
      flags.push('MULTIPLE_REFUNDS')
      reasons.push(`${recentRefunds.length} refunds in last 30 days`)
    }
  } catch (error) {
    console.error('Error in pattern check:', error)
  }

  return { score, flags, reasons }
}

/**
 * Determine risk level based on score
 */
function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

/**
 * Generate recommendations based on risk level and flags
 */
function generateRecommendations(level: string, flags: string[]): string[] {
  const recommendations: string[] = []

  switch (level) {
    case 'critical':
      recommendations.push('BLOCK PAYMENT - Manual review required')
      recommendations.push('Contact customer for verification')
      recommendations.push('Verify identity documents')
      break

    case 'high':
      recommendations.push('Hold payment for manual review')
      recommendations.push('Require additional verification')
      recommendations.push('Contact customer')
      break

    case 'medium':
      recommendations.push('Monitor payment closely')
      recommendations.push('Consider additional verification')
      break

    case 'low':
      recommendations.push('Process normally with standard monitoring')
      break
  }

  // Specific recommendations based on flags
  if (flags.includes('HIGH_VELOCITY_HOUR')) {
    recommendations.push('Implement velocity limits')
  }

  if (flags.includes('DISPOSABLE_EMAIL')) {
    recommendations.push('Require phone verification')
  }

  if (flags.includes('CARD_TESTING')) {
    recommendations.push('Implement CAPTCHA')
  }

  if (flags.includes('HEADLESS_BROWSER')) {
    recommendations.push('Implement bot detection')
  }

  return [...new Set(recommendations)]
}

/**
 * Log fraud analysis results
 */
export async function logRiskAnalysis(data: {
  paymentId: string
  orderId: string
  riskScore: number
  riskLevel: string
  factors: string[]
  recommendation: string
  ip: string
  userAgent: string
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: 'system',
      userEmail: 'system@fraud-detection',
      action: 'FRAUD_ANALYSIS',
      resourceType: 'payment',
      resourceId: data.paymentId,
      resourceTitle: `Payment ${data.paymentId}`,
      changes: {
        fraud_score: data.riskScore,
        fraud_level: data.riskLevel,
        flags: data.factors,
        recommendation: data.recommendation,
        order_id: data.orderId,
      },
      ipAddress: data.ip,
      userAgent: data.userAgent,
    })
  } catch (error) {
    console.error('Error logging fraud analysis:', error)
  }
}

async function logFraudAnalysis(
  context: PaymentContext,
  result: FraudRisk
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: 'system',
      userEmail: 'system@fraud-detection',
      action: 'FRAUD_ANALYSIS',
      resourceType: 'payment',
      resourceId: context.orderId,
      changes: {
        fraud_score: result.score,
        fraud_level: result.level,
        flags: result.flags,
        email: context.email,
        amount: context.amount,
        ip_address: context.ipAddress,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  } catch (error) {
    console.error('Error logging fraud analysis:', error)
  }
}

/**
 * Get fraud analytics data for dashboard
 */
export async function getFraudAnalytics(hours: number = 24): Promise<{
  totalAnalyses: number
  fraudDetected: number
  fraudBlocked: number
  averageRiskScore: number
  highRiskCount: number
  patterns: any[]
  events: any[]
}> {
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get recent fraud analyses from audit logs
    const analyses = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.action, 'FRAUD_ANALYSIS'),
        gte(auditLogs.timestamp, cutoff)
      ),
      orderBy: [desc(auditLogs.timestamp)],
      limit: 1000,
    })

    let totalAnalyses = analyses.length
    let fraudDetected = 0
    let fraudBlocked = 0
    let totalRiskScore = 0
    let highRiskCount = 0
    const events: any[] = []

    for (const analysis of analyses) {
      const changes = analysis.changes as any
      const riskScore = changes?.fraud_score || 0
      const riskLevel = changes?.fraud_level || 'low'

      totalRiskScore += riskScore

      if (riskScore >= 70) {
        fraudBlocked++
      } else if (riskScore >= 60) {
        fraudDetected++
      }

      if (riskLevel === 'high' || riskLevel === 'critical') {
        highRiskCount++
      }

      events.push({
        timestamp: analysis.timestamp,
        paymentId: analysis.resourceId,
        riskScore,
        riskLevel,
        factors: changes?.flags || [],
        action: riskScore >= 70 ? 'block' : 'flag',
        ip: analysis.ipAddress,
      })
    }

    return {
      totalAnalyses,
      fraudDetected,
      fraudBlocked,
      averageRiskScore:
        totalAnalyses > 0
          ? Math.round((totalRiskScore / totalAnalyses) * 100) / 100
          : 0,
      highRiskCount,
      patterns: [], // Could be enhanced with pattern analysis
      events: events.slice(0, 50), // Return recent 50 events
    }
  } catch (error) {
    console.error('Error getting fraud analytics:', error)
    return {
      totalAnalyses: 0,
      fraudDetected: 0,
      fraudBlocked: 0,
      averageRiskScore: 0,
      highRiskCount: 0,
      patterns: [],
      events: [],
    }
  }
}
