'use server'

import { Redis } from '@upstash/redis'

// Initialize Redis client for security logging
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || 'redis://localhost:6379',
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export interface SecurityLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'critical'
  category: 'payment' | 'authentication' | 'authorization' | 'fraud' | 'rate_limit' | 'webhook' | 'api'
  event: string
  userId?: string
  sessionId?: string
  ip: string
  userAgent?: string
  payload?: any
  metadata?: Record<string, any>
  risk_score?: number
  action_taken?: string
}

export interface SecurityMetrics {
  total_events: number
  by_level: Record<string, number>
  by_category: Record<string, number>
  high_risk_events: number
  unique_ips: number
  top_events: Array<{ event: string; count: number }>
}

/**
 * Log a security event
 */
export async function logSecurityEvent(entry: Omit<SecurityLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logEntry: SecurityLogEntry = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry
    }

    // Store the log entry
    await redis.lpush('security_logs', JSON.stringify(logEntry))
    
    // Keep only last 10000 entries to manage memory
    await redis.ltrim('security_logs', 0, 9999)

    // Update metrics
    await updateSecurityMetrics(logEntry)

    // Console logging for immediate visibility
    const logLevel = entry.level === 'critical' ? 'error' : entry.level
    console[logLevel]('[SECURITY_LOG]', {
      event: entry.event,
      category: entry.category,
      level: entry.level,
      ip: entry.ip,
      userId: entry.userId,
      risk_score: entry.risk_score,
      action_taken: entry.action_taken,
      timestamp: logEntry.timestamp
    })

    // Send alerts for critical events
    if (entry.level === 'critical') {
      await sendSecurityAlert(logEntry)
    }

  } catch (error) {
    console.error('Failed to log security event:', error)
    // Fallback to console logging
    console.error('[SECURITY_FALLBACK]', entry)
  }
}

/**
 * Update security metrics
 */
async function updateSecurityMetrics(entry: SecurityLogEntry): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const metricsKey = `security_metrics:${today}`

    // Increment counters
    await redis.hincrby(metricsKey, 'total_events', 1)
    await redis.hincrby(metricsKey, `level:${entry.level}`, 1)
    await redis.hincrby(metricsKey, `category:${entry.category}`, 1)
    await redis.hincrby(metricsKey, `event:${entry.event}`, 1)
    
    if (entry.risk_score && entry.risk_score >= 70) {
      await redis.hincrby(metricsKey, 'high_risk_events', 1)
    }

    // Track unique IPs
    await redis.sadd(`security_ips:${today}`, entry.ip)
    
    // Set expiration (30 days)
    await redis.expire(metricsKey, 30 * 24 * 60 * 60)
    await redis.expire(`security_ips:${today}`, 30 * 24 * 60 * 60)

  } catch (error) {
    console.error('Failed to update security metrics:', error)
  }
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(entry: SecurityLogEntry): Promise<void> {
  try {
    // Store alert for admin dashboard
    const alert = {
      id: `alert_${Date.now()}`,
      timestamp: entry.timestamp,
      level: 'critical',
      message: `Critical security event: ${entry.event}`,
      details: entry,
      acknowledged: false
    }

    await redis.lpush('security_alerts', JSON.stringify(alert))
    await redis.ltrim('security_alerts', 0, 999) // Keep last 1000 alerts

    // In production, you would integrate with:
    // - Email notifications
    // - Slack/Discord webhooks
    // - PagerDuty or similar incident management
    // - SMS alerts for critical events

    console.error('[CRITICAL_SECURITY_ALERT]', alert)

  } catch (error) {
    console.error('Failed to send security alert:', error)
  }
}

/**
 * Get security logs with filtering
 */
export async function getSecurityLogs(options: {
  limit?: number
  level?: string
  category?: string
  hours?: number
} = {}): Promise<SecurityLogEntry[]> {
  try {
    const limit = options.limit || 100
    const logs = await redis.lrange('security_logs', 0, limit - 1)
    
    let parsedLogs = logs.map(log => JSON.parse(log) as SecurityLogEntry)

    // Apply filters
    if (options.level) {
      parsedLogs = parsedLogs.filter(log => log.level === options.level)
    }

    if (options.category) {
      parsedLogs = parsedLogs.filter(log => log.category === options.category)
    }

    if (options.hours) {
      const cutoff = new Date(Date.now() - options.hours * 60 * 60 * 1000)
      parsedLogs = parsedLogs.filter(log => new Date(log.timestamp) > cutoff)
    }

    return parsedLogs

  } catch (error) {
    console.error('Failed to retrieve security logs:', error)
    return []
  }
}

/**
 * Get security metrics for dashboard
 */
export async function getSecurityMetrics(days: number = 1): Promise<SecurityMetrics> {
  try {
    const metrics: SecurityMetrics = {
      total_events: 0,
      by_level: {},
      by_category: {},
      high_risk_events: 0,
      unique_ips: 0,
      top_events: []
    }

    // Aggregate metrics across requested days
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      
      const metricsKey = `security_metrics:${dateKey}`
      const dayMetrics = await redis.hgetall(metricsKey)
      
      if (dayMetrics) {
        metrics.total_events += parseInt(dayMetrics.total_events || '0')
        metrics.high_risk_events += parseInt(dayMetrics.high_risk_events || '0')

        // Aggregate by level
        Object.keys(dayMetrics).forEach(key => {
          if (key.startsWith('level:')) {
            const level = key.replace('level:', '')
            metrics.by_level[level] = (metrics.by_level[level] || 0) + parseInt(dayMetrics[key])
          }
        })

        // Aggregate by category
        Object.keys(dayMetrics).forEach(key => {
          if (key.startsWith('category:')) {
            const category = key.replace('category:', '')
            metrics.by_category[category] = (metrics.by_category[category] || 0) + parseInt(dayMetrics[key])
          }
        })
      }

      // Count unique IPs
      const ips = await redis.scard(`security_ips:${dateKey}`)
      metrics.unique_ips += ips
    }

    // Get top events (simplified - in production would be more sophisticated)
    const recentLogs = await getSecurityLogs({ limit: 1000, hours: days * 24 })
    const eventCounts: Record<string, number> = {}
    
    recentLogs.forEach(log => {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1
    })

    metrics.top_events = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }))

    return metrics

  } catch (error) {
    console.error('Failed to get security metrics:', error)
    return {
      total_events: 0,
      by_level: {},
      by_category: {},
      high_risk_events: 0,
      unique_ips: 0,
      top_events: []
    }
  }
}

/**
 * Get security alerts
 */
export async function getSecurityAlerts(): Promise<any[]> {
  try {
    const alerts = await redis.lrange('security_alerts', 0, 99) // Last 100 alerts
    return alerts.map(alert => JSON.parse(alert))
  } catch (error) {
    console.error('Failed to get security alerts:', error)
    return []
  }
}

/**
 * Acknowledge security alert
 */
export async function acknowledgeSecurityAlert(alertId: string, userId: string): Promise<boolean> {
  try {
    const alerts = await redis.lrange('security_alerts', 0, -1)
    const updatedAlerts: string[] = []

    for (const alertJson of alerts) {
      const alert = JSON.parse(alertJson)
      if (alert.id === alertId) {
        alert.acknowledged = true
        alert.acknowledged_by = userId
        alert.acknowledged_at = new Date().toISOString()
      }
      updatedAlerts.push(JSON.stringify(alert))
    }

    // Replace all alerts
    await redis.del('security_alerts')
    if (updatedAlerts.length > 0) {
      await redis.lpush('security_alerts', ...updatedAlerts)
    }

    return true

  } catch (error) {
    console.error('Failed to acknowledge security alert:', error)
    return false
  }
}

/**
 * Predefined security event loggers for common scenarios
 */
export const SecurityEvents = {
  // Payment events
  paymentFraudBlocked: (paymentId: string, ip: string, riskScore: number, factors: string[]) =>
    logSecurityEvent({
      level: 'critical',
      category: 'fraud',
      event: 'payment_fraud_blocked',
      ip,
      risk_score: riskScore,
      action_taken: 'blocked',
      payload: { paymentId, factors },
      metadata: { detection_method: 'automated' }
    }),

  paymentHighRisk: (paymentId: string, ip: string, riskScore: number, factors: string[]) =>
    logSecurityEvent({
      level: 'warn',
      category: 'fraud',
      event: 'payment_high_risk',
      ip,
      risk_score: riskScore,
      action_taken: 'flagged',
      payload: { paymentId, factors }
    }),

  // Rate limiting events
  rateLimitExceeded: (endpoint: string, ip: string, limit: number, window: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'rate_limit',
      event: 'rate_limit_exceeded',
      ip,
      action_taken: 'blocked',
      payload: { endpoint, limit, window },
      metadata: { protection_type: 'rate_limiting' }
    }),

  // Authentication events
  authenticationFailure: (email: string, ip: string, reason: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'authentication',
      event: 'authentication_failure',
      ip,
      payload: { email, reason },
      metadata: { attempt_type: 'login' }
    }),

  suspiciousLogin: (userId: string, ip: string, reason: string, riskScore: number) =>
    logSecurityEvent({
      level: 'warn',
      category: 'authentication',
      event: 'suspicious_login',
      userId,
      ip,
      risk_score: riskScore,
      payload: { reason },
      metadata: { detection_method: 'behavioral_analysis' }
    }),

  // Webhook events  
  webhookSignatureInvalid: (ip: string, endpoint: string) =>
    logSecurityEvent({
      level: 'error',
      category: 'webhook',
      event: 'webhook_signature_invalid',
      ip,
      action_taken: 'blocked',
      payload: { endpoint },
      metadata: { security_check: 'hmac_verification' }
    }),

  webhookIPBlocked: (ip: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'webhook',
      event: 'webhook_ip_blocked',
      ip,
      action_taken: 'blocked',
      metadata: { protection_type: 'ip_whitelist' }
    }),

  // API events
  unauthorizedAccess: (endpoint: string, ip: string, userId?: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'authorization',
      event: 'unauthorized_access',
      userId,
      ip,
      action_taken: 'blocked',
      payload: { endpoint },
      metadata: { protection_type: 'rbac' }
    }),

  apiAbuseDetected: (ip: string, pattern: string, severity: 'low' | 'medium' | 'high') =>
    logSecurityEvent({
      level: severity === 'high' ? 'error' : 'warn',
      category: 'api',
      event: 'api_abuse_detected',
      ip,
      action_taken: severity === 'high' ? 'blocked' : 'monitored',
      payload: { pattern },
      metadata: { detection_method: 'pattern_analysis' }
    })
}

/**
 * Security audit trail for compliance
 */
export async function createAuditTrail(options: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  ip: string
  userAgent?: string
  metadata?: Record<string, any>
}): Promise<void> {
  await logSecurityEvent({
    level: 'info',
    category: 'authorization',
    event: 'audit_trail',
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    payload: {
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId
    },
    metadata: {
      audit: true,
      compliance: 'pci_dss',
      ...options.metadata
    }
  })
}