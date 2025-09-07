import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'

// Check if Upstash Redis is configured
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// Initialize Redis client only if Upstash is configured
const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Different rate limit configurations for different endpoints
export const rateLimits = redis ? {
  // Payment endpoints - strict limits
  payment: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
  }),

  // Webhook endpoints - allow bursts but limit over time
  webhook: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
  }),

  // Order creation - moderate limits
  orderCreation: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 orders per minute
    analytics: true,
  }),

  // Cart operations - lenient limits
  cart: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 cart operations per minute
    analytics: true,
  }),

  // Admin API - per user limits
  admin: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 admin requests per minute
    analytics: true,
  }),

  // General API - default limits
  api: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
  }),

  // Authentication endpoints
  auth: new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(10, '5 m'), // 10 auth attempts per 5 minutes
    analytics: true,
  })
} : {}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: Date
  limit: number
  blocked: boolean
}

/**
 * Apply rate limiting based on endpoint type and identifier
 */
export async function checkRateLimit(
  type: string,
  identifier: string,
  request?: NextRequest
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!redis) {
    return {
      success: true,
      remaining: 999,
      reset: new Date(Date.now() + 60000),
      limit: 999,
      blocked: false
    }
  }
  
  try {
    const ratelimit = (rateLimits as any)[type]
    
    if (!ratelimit) {
      throw new Error(`Unknown rate limit type: ${type}`)
    }

    const result = await ratelimit.limit(identifier)

    return {
      success: result.success,
      remaining: result.remaining,
      reset: new Date(result.reset),
      limit: result.limit,
      blocked: !result.success
    }

  } catch (error) {
    console.error('Rate limit check failed:', error)
    
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      remaining: -1,
      reset: new Date(),
      limit: -1,
      blocked: false
    }
  }
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: NextRequest, fallback?: string): string {
  // Try to get IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || request.ip

  if (ip && ip !== '127.0.0.1' && ip !== '::1') {
    return ip
  }

  // Fallback to user agent + other headers for local development
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  
  return fallback || `${userAgent}-${acceptLanguage}`.slice(0, 100)
}

/**
 * Get user-specific identifier for authenticated requests
 */
export function getUserIdentifier(userId: string, ip?: string): string {
  return ip ? `user:${userId}:${ip}` : `user:${userId}`
}

/**
 * Check if IP is in whitelist for webhooks
 */
export async function checkWebhookIPWhitelist(ip: string): Promise<boolean> {
  // Razorpay webhook IPs (these should be configured in environment)
  const razorpayIPs = process.env.RAZORPAY_WEBHOOK_IPS?.split(',').map(ip => ip.trim()) || []
  
  // Default Razorpay webhook IP ranges (update these based on Razorpay documentation)
  const defaultRazorpayIPs = [
    '54.251.82.0/24',
    '54.251.83.0/24',
    // Add more Razorpay IP ranges as needed
  ]

  const allowedIPs = [...razorpayIPs, ...defaultRazorpayIPs]

  // Check if IP matches any allowed IP/range
  for (const allowedIP of allowedIPs) {
    if (allowedIP.includes('/')) {
      // CIDR notation check
      if (isIPInCIDR(ip, allowedIP)) {
        return true
      }
    } else {
      // Direct IP match
      if (ip === allowedIP) {
        return true
      }
    }
  }

  // For development, allow localhost
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost')) {
    return true
  }

  return false
}

/**
 * Check if IP is within CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const [network, prefixLength] = cidr.split('/')
    const networkLong = ipToLong(network)
    const ipLong = ipToLong(ip)
    const mask = ~((1 << (32 - parseInt(prefixLength))) - 1)
    
    return (networkLong & mask) === (ipLong & mask)
  } catch (error) {
    console.error('Error checking CIDR:', error)
    return false
  }
}

/**
 * Convert IP address to long integer
 */
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(part => parseInt(part, 10))
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

/**
 * Log rate limit violation
 */
export async function logRateLimitViolation(
  type: string,
  identifier: string,
  request: NextRequest,
  details?: any
): Promise<void> {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      identifier,
      ip: getClientIdentifier(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      details
    }

    // Log to console (in production, you'd want to log to a proper logging service)
    console.warn('[RATE_LIMIT_VIOLATION]', JSON.stringify(logEntry, null, 2))

    // Store in Redis for analysis
    await redis.lpush('rate_limit_violations', JSON.stringify(logEntry))
    
    // Keep only last 1000 violations
    await redis.ltrim('rate_limit_violations', 0, 999)

  } catch (error) {
    console.error('Error logging rate limit violation:', error)
  }
}

/**
 * Get rate limit analytics
 */
export async function getRateLimitAnalytics(hours: number = 24): Promise<{
  violations: any[]
  stats: Record<string, number>
}> {
  try {
    const violations = await redis.lrange('rate_limit_violations', 0, -1)
    const parsedViolations = violations.map(v => JSON.parse(v))

    // Filter by time range
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    const recentViolations = parsedViolations.filter(v => 
      new Date(v.timestamp) > cutoff
    )

    // Calculate stats
    const stats = recentViolations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      violations: recentViolations,
      stats
    }

  } catch (error) {
    console.error('Error getting rate limit analytics:', error)
    return { violations: [], stats: {} }
  }
}

/**
 * Reset rate limit for a specific identifier (admin function)
 */
export async function resetRateLimit(
  type: keyof typeof rateLimits,
  identifier: string
): Promise<boolean> {
  try {
    const ratelimit = rateLimits[type]
    
    if (!ratelimit) {
      return false
    }

    // This is a bit hacky, but there's no direct reset method in @upstash/ratelimit
    // We'll delete the key directly from Redis
    const key = `rate_limit:${type}:${identifier}`
    await redis.del(key)

    return true

  } catch (error) {
    console.error('Error resetting rate limit:', error)
    return false
  }
}