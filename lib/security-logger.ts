// Security logging module
// Currently disabled - to enable, set up a proper Redis instance
// This module provides mock implementations to prevent build failures

export interface SecurityLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'critical'
  category:
    | 'payment'
    | 'authentication'
    | 'authorization'
    | 'fraud'
    | 'rate_limit'
    | 'webhook'
    | 'api'
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
export async function logSecurityEvent(
  entry: Omit<SecurityLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const logEntry: SecurityLogEntry = {
    id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  }

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
    timestamp: logEntry.timestamp,
  })

  // Send alerts for critical events
  if (entry.level === 'critical') {
    await sendSecurityAlert(logEntry)
  }
}

/**
 * Update security metrics
 */
async function updateSecurityMetrics(entry: SecurityLogEntry): Promise<void> {
  // Metrics tracking disabled when Redis is not configured
  // In production, this would update Redis counters
  console.log('[METRICS] Would update metrics for:', {
    event: entry.event,
    level: entry.level,
    category: entry.category,
  })
}

/**
 * Send security alert for critical events
 */
async function sendSecurityAlert(entry: SecurityLogEntry): Promise<void> {
  // Store alert for admin dashboard
  const alert = {
    id: `alert_${Date.now()}`,
    timestamp: entry.timestamp,
    level: 'critical',
    message: `Critical security event: ${entry.event}`,
    details: entry,
    acknowledged: false,
  }

  // In production, you would integrate with:
  // - Email notifications
  // - Slack/Discord webhooks
  // - PagerDuty or similar incident management
  // - SMS alerts for critical events

  console.error('[CRITICAL_SECURITY_ALERT]', alert)
}

/**
 * Get security logs with filtering
 */
export async function getSecurityLogs(
  options: {
    limit?: number
    level?: string
    category?: string
    hours?: number
  } = {}
): Promise<SecurityLogEntry[]> {
  // Return empty array when Redis is not configured
  console.log('[SECURITY_LOGS] Redis not configured, returning empty logs')
  return []
}

/**
 * Get security metrics for dashboard
 */
export async function getSecurityMetrics(
  days: number = 1
): Promise<SecurityMetrics> {
  // Return empty metrics when Redis is not configured
  return {
    total_events: 0,
    by_level: {},
    by_category: {},
    high_risk_events: 0,
    unique_ips: 0,
    top_events: [],
  }
}

/**
 * Get security alerts
 */
export async function getSecurityAlerts(): Promise<any[]> {
  // Return empty array when Redis is not configured
  return []
}

/**
 * Acknowledge security alert
 */
export async function acknowledgeSecurityAlert(
  alertId: string,
  userId: string
): Promise<boolean> {
  // Alert acknowledgement disabled when Redis is not configured
  console.log('[SECURITY_ALERT] Would acknowledge alert:', { alertId, userId })
  return true
}

/**
 * Predefined security event loggers for common scenarios
 */
export const SecurityEvents = {
  // Payment events
  paymentFraudBlocked: (
    paymentId: string,
    ip: string,
    riskScore: number,
    factors: string[]
  ) =>
    logSecurityEvent({
      level: 'critical',
      category: 'fraud',
      event: 'payment_fraud_blocked',
      ip,
      risk_score: riskScore,
      action_taken: 'blocked',
      payload: { paymentId, factors },
      metadata: { detection_method: 'automated' },
    }),

  paymentHighRisk: (
    paymentId: string,
    ip: string,
    riskScore: number,
    factors: string[]
  ) =>
    logSecurityEvent({
      level: 'warn',
      category: 'fraud',
      event: 'payment_high_risk',
      ip,
      risk_score: riskScore,
      action_taken: 'flagged',
      payload: { paymentId, factors },
    }),

  // Rate limiting events
  rateLimitExceeded: (
    endpoint: string,
    ip: string,
    limit: number,
    window: string
  ) =>
    logSecurityEvent({
      level: 'warn',
      category: 'rate_limit',
      event: 'rate_limit_exceeded',
      ip,
      action_taken: 'blocked',
      payload: { endpoint, limit, window },
      metadata: { protection_type: 'rate_limiting' },
    }),

  // Authentication events
  authenticationFailure: (email: string, ip: string, reason: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'authentication',
      event: 'authentication_failure',
      ip,
      payload: { email, reason },
      metadata: { attempt_type: 'login' },
    }),

  suspiciousLogin: (
    userId: string,
    ip: string,
    reason: string,
    riskScore: number
  ) =>
    logSecurityEvent({
      level: 'warn',
      category: 'authentication',
      event: 'suspicious_login',
      userId,
      ip,
      risk_score: riskScore,
      payload: { reason },
      metadata: { detection_method: 'behavioral_analysis' },
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
      metadata: { security_check: 'hmac_verification' },
    }),

  webhookIPBlocked: (ip: string) =>
    logSecurityEvent({
      level: 'warn',
      category: 'webhook',
      event: 'webhook_ip_blocked',
      ip,
      action_taken: 'blocked',
      metadata: { protection_type: 'ip_whitelist' },
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
      metadata: { protection_type: 'rbac' },
    }),

  apiAbuseDetected: (
    ip: string,
    pattern: string,
    severity: 'low' | 'medium' | 'high'
  ) =>
    logSecurityEvent({
      level: severity === 'high' ? 'error' : 'warn',
      category: 'api',
      event: 'api_abuse_detected',
      ip,
      action_taken: severity === 'high' ? 'blocked' : 'monitored',
      payload: { pattern },
      metadata: { detection_method: 'pattern_analysis' },
    }),
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
      resourceId: options.resourceId,
    },
    metadata: {
      audit: true,
      compliance: 'pci_dss',
      ...options.metadata,
    },
  })
}
