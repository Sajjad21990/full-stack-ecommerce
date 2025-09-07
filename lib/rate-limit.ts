import { NextRequest } from 'next/server'

// Rate limiting is currently disabled
// To enable rate limiting, you need to set up Upstash Redis and uncomment the code below

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: Date
  limit: number
  blocked: boolean
}

/**
 * Mock rate limit check - always allows requests
 * Replace this with actual rate limiting when Upstash Redis is configured
 */
export async function checkRateLimit(
  type: string,
  identifier: string,
  request?: NextRequest
): Promise<RateLimitResult> {
  // Rate limiting is disabled - allow all requests
  return {
    success: true,
    remaining: 999,
    reset: new Date(Date.now() + 60000),
    limit: 999,
    blocked: false,
  }
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(
  request: NextRequest,
  fallback?: string
): string {
  // Try to get IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp

  // Fallback to provided identifier or 'anonymous'
  return ip || fallback || 'anonymous'
}

/**
 * Get user-specific identifier for authenticated requests
 */
export function getUserIdentifier(userId: string, ip?: string): string {
  return ip ? `user:${userId}:${ip}` : `user:${userId}`
}

/**
 * Log rate limit violations (currently no-op)
 */
export async function logRateLimitViolation(
  action: string,
  identifier: string,
  request: NextRequest,
  metadata?: Record<string, any>
): Promise<void> {
  // Logging is disabled when rate limiting is disabled
  console.log('Rate limit violation (disabled):', {
    action,
    identifier,
    metadata,
  })
}

// Export empty rate limits object for compatibility
export const rateLimits = {}
