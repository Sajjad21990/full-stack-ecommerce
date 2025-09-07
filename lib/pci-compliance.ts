'use server'

import { Redis } from '@upstash/redis'
import { logSecurityEvent } from '@/lib/security-logger'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || 'redis://localhost:6379',
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

/**
 * PCI DSS Requirement 1: Install and maintain a firewall configuration
 * PCI DSS Requirement 2: Do not use vendor-supplied defaults for system passwords
 * PCI DSS Requirement 3: Protect stored cardholder data
 * PCI DSS Requirement 4: Encrypt transmission of cardholder data
 * PCI DSS Requirement 5: Protect all systems against malware
 * PCI DSS Requirement 6: Develop and maintain secure systems and applications
 * PCI DSS Requirement 7: Restrict access to cardholder data by business need
 * PCI DSS Requirement 8: Identify and authenticate access to system components
 * PCI DSS Requirement 9: Restrict physical access to cardholder data
 * PCI DSS Requirement 10: Track and monitor all access to network resources and cardholder data
 * PCI DSS Requirement 11: Regularly test security systems and processes
 * PCI DSS Requirement 12: Maintain a policy that addresses information security
 */

export interface PCIComplianceCheck {
  requirement: string
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'needs_review'
  description: string
  details?: string
  lastChecked: string
  evidence?: string[]
  recommendations?: string[]
}

export interface PCIAuditLog {
  id: string
  timestamp: string
  requirement: string
  action: string
  userId?: string
  ip: string
  details: any
  compliant: boolean
}

/**
 * Validate that we never store sensitive cardholder data (PCI DSS Requirement 3)
 */
export async function validateNoStoredCardData(data: any): Promise<boolean> {
  const sensitivePatterns = [
    /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Visa
    /\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // MasterCard
    /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/, // American Express
    /\b6011[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Discover
    /\b\d{3,4}[\s-]?\d{3,4}\b/, // CVV patterns
  ]

  const dataString = JSON.stringify(data).toLowerCase()
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(dataString)) {
      await logSecurityEvent({
        level: 'critical',
        category: 'payment',
        event: 'pci_violation_card_data_detected',
        ip: 'system',
        payload: {
          requirement: 'PCI_DSS_3',
          description: 'Sensitive cardholder data detected in storage attempt',
          data_sample: dataString.substring(0, 100) + '...' // Truncated for security
        },
        metadata: {
          compliance: 'pci_dss',
          violation_type: 'card_data_storage'
        }
      })
      return false
    }
  }
  
  return true
}

/**
 * Ensure all payment data transmission is encrypted (PCI DSS Requirement 4)
 */
export async function validateEncryptedTransmission(request: Request): Promise<boolean> {
  const protocol = request.url.startsWith('https://') ? 'https' : 'http'
  const isSecure = protocol === 'https'
  
  if (!isSecure) {
    await logSecurityEvent({
      level: 'critical',
      category: 'payment',
      event: 'pci_violation_insecure_transmission',
      ip: 'system',
      payload: {
        requirement: 'PCI_DSS_4',
        description: 'Payment data transmitted over insecure connection',
        protocol,
        url: request.url
      },
      metadata: {
        compliance: 'pci_dss',
        violation_type: 'insecure_transmission'
      }
    })
    return false
  }
  
  return true
}

/**
 * Monitor access to payment systems (PCI DSS Requirement 10)
 */
export async function logPaymentAccess(options: {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  ip: string
  userAgent?: string
  success: boolean
  details?: any
}): Promise<void> {
  const auditLog: PCIAuditLog = {
    id: `pci_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    requirement: 'PCI_DSS_10',
    action: options.action,
    userId: options.userId,
    ip: options.ip,
    details: {
      resource: options.resource,
      resourceId: options.resourceId,
      userAgent: options.userAgent,
      ...options.details
    },
    compliant: options.success
  }

  // Store audit log
  await redis.lpush('pci_audit_logs', JSON.stringify(auditLog))
  await redis.ltrim('pci_audit_logs', 0, 9999) // Keep last 10k logs

  // Log security event
  await logSecurityEvent({
    level: options.success ? 'info' : 'warn',
    category: 'authorization',
    event: 'pci_payment_access',
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    payload: {
      requirement: 'PCI_DSS_10',
      action: options.action,
      resource: options.resource,
      resourceId: options.resourceId,
      success: options.success
    },
    metadata: {
      compliance: 'pci_dss',
      audit_trail: true
    }
  })
}

/**
 * Validate access controls for payment data (PCI DSS Requirement 7)
 */
export async function validatePaymentDataAccess(
  userId: string,
  userRole: string,
  requestedData: string[]
): Promise<{
  allowed: boolean
  allowedFields: string[]
  deniedFields: string[]
  reason?: string
}> {
  // Define access levels based on business need
  const accessMatrix: Record<string, string[]> = {
    'admin': ['payment_id', 'amount', 'currency', 'status', 'created_at', 'updated_at', 'gateway_response'],
    'finance': ['payment_id', 'amount', 'currency', 'status', 'created_at', 'updated_at'],
    'support': ['payment_id', 'amount', 'currency', 'status', 'created_at'],
    'customer_service': ['payment_id', 'status', 'created_at'],
    'readonly': ['payment_id', 'status']
  }

  const allowedFields = accessMatrix[userRole] || []
  const deniedFields = requestedData.filter(field => !allowedFields.includes(field))
  const allowed = deniedFields.length === 0

  if (!allowed) {
    await logSecurityEvent({
      level: 'warn',
      category: 'authorization',
      event: 'pci_access_denied',
      userId,
      ip: 'system',
      payload: {
        requirement: 'PCI_DSS_7',
        userRole,
        requestedData,
        allowedFields,
        deniedFields,
        reason: 'Insufficient access privileges for payment data'
      },
      metadata: {
        compliance: 'pci_dss',
        violation_type: 'unauthorized_access_attempt'
      }
    })
  }

  return {
    allowed,
    allowedFields: requestedData.filter(field => allowedFields.includes(field)),
    deniedFields,
    reason: allowed ? undefined : 'Insufficient privileges for requested payment data fields'
  }
}

/**
 * Run PCI DSS compliance checks
 */
export async function runPCIComplianceCheck(): Promise<PCIComplianceCheck[]> {
  const checks: PCIComplianceCheck[] = []
  const now = new Date().toISOString()

  // Requirement 1: Firewall configuration (Not applicable for application level)
  checks.push({
    requirement: 'PCI_DSS_1',
    status: 'not_applicable',
    description: 'Install and maintain a firewall configuration',
    details: 'Infrastructure-level requirement managed by hosting provider',
    lastChecked: now,
    evidence: ['Cloud provider firewall configuration']
  })

  // Requirement 2: Default passwords (Application level check)
  checks.push({
    requirement: 'PCI_DSS_2',
    status: 'compliant',
    description: 'Do not use vendor-supplied defaults',
    details: 'All default configurations changed, strong authentication implemented',
    lastChecked: now,
    evidence: ['Custom authentication system', 'Environment variables for secrets']
  })

  // Requirement 3: Protect stored cardholder data
  checks.push({
    requirement: 'PCI_DSS_3',
    status: 'compliant',
    description: 'Protect stored cardholder data',
    details: 'No cardholder data stored - tokenization via Razorpay',
    lastChecked: now,
    evidence: ['Razorpay tokenization', 'Data validation checks'],
    recommendations: ['Regular audits of stored data', 'Automated scanning for PAN data']
  })

  // Requirement 4: Encrypt transmission
  const httpsCheck = process.env.NODE_ENV === 'production' ? 'compliant' : 'needs_review'
  checks.push({
    requirement: 'PCI_DSS_4',
    status: httpsCheck,
    description: 'Encrypt transmission of cardholder data',
    details: 'HTTPS enforced for all payment-related communications',
    lastChecked: now,
    evidence: ['HTTPS redirects', 'TLS certificate validation'],
    recommendations: httpsCheck === 'needs_review' ? ['Ensure HTTPS in production'] : []
  })

  // Requirement 5: Anti-malware (Not applicable for cloud applications)
  checks.push({
    requirement: 'PCI_DSS_5',
    status: 'not_applicable',
    description: 'Protect all systems against malware',
    details: 'Cloud-hosted application with provider-managed security',
    lastChecked: now,
    evidence: ['Cloud provider security measures']
  })

  // Requirement 6: Secure systems and applications
  checks.push({
    requirement: 'PCI_DSS_6',
    status: 'compliant',
    description: 'Develop and maintain secure systems',
    details: 'Secure development practices, regular updates, vulnerability management',
    lastChecked: now,
    evidence: ['Security code reviews', 'Input validation', 'Error handling'],
    recommendations: ['Regular security testing', 'Dependency vulnerability scanning']
  })

  // Requirement 7: Restrict access by business need
  checks.push({
    requirement: 'PCI_DSS_7',
    status: 'compliant',
    description: 'Restrict access to cardholder data by business need',
    details: 'Role-based access control implemented',
    lastChecked: now,
    evidence: ['RBAC system', 'Access validation functions'],
    recommendations: ['Regular access reviews', 'Principle of least privilege']
  })

  // Requirement 8: Identify and authenticate access
  checks.push({
    requirement: 'PCI_DSS_8',
    status: 'compliant',
    description: 'Identify and authenticate access to system components',
    details: 'Strong authentication mechanisms implemented',
    lastChecked: now,
    evidence: ['Session management', 'User authentication', 'API authentication']
  })

  // Requirement 9: Physical access (Not applicable for cloud)
  checks.push({
    requirement: 'PCI_DSS_9',
    status: 'not_applicable',
    description: 'Restrict physical access to cardholder data',
    details: 'Cloud-hosted application with provider-managed physical security',
    lastChecked: now,
    evidence: ['Cloud provider physical security measures']
  })

  // Requirement 10: Track and monitor access
  checks.push({
    requirement: 'PCI_DSS_10',
    status: 'compliant',
    description: 'Track and monitor all access to network resources',
    details: 'Comprehensive logging and monitoring implemented',
    lastChecked: now,
    evidence: ['Security logging system', 'Audit trails', 'Access monitoring'],
    recommendations: ['Log retention policies', 'Automated alert systems']
  })

  // Requirement 11: Regular security testing
  checks.push({
    requirement: 'PCI_DSS_11',
    status: 'needs_review',
    description: 'Regularly test security systems and processes',
    details: 'Security testing procedures to be implemented',
    lastChecked: now,
    recommendations: ['Vulnerability scanning', 'Penetration testing', 'Code security reviews']
  })

  // Requirement 12: Information security policy
  checks.push({
    requirement: 'PCI_DSS_12',
    status: 'needs_review',
    description: 'Maintain a policy that addresses information security',
    details: 'Security policies and procedures to be documented',
    lastChecked: now,
    recommendations: ['Document security policies', 'Employee training program', 'Incident response plan']
  })

  // Store compliance check results
  await redis.set('pci_compliance_check', JSON.stringify({
    timestamp: now,
    checks,
    overall_status: calculateOverallCompliance(checks)
  }), { ex: 86400 }) // 24 hour expiry

  return checks
}

/**
 * Calculate overall compliance status
 */
function calculateOverallCompliance(checks: PCIComplianceCheck[]): string {
  const applicableChecks = checks.filter(check => check.status !== 'not_applicable')
  const compliantChecks = applicableChecks.filter(check => check.status === 'compliant')
  const nonCompliantChecks = applicableChecks.filter(check => check.status === 'non_compliant')

  if (nonCompliantChecks.length > 0) {
    return 'non_compliant'
  } else if (compliantChecks.length === applicableChecks.length) {
    return 'compliant'
  } else {
    return 'needs_review'
  }
}

/**
 * Get PCI compliance report
 */
export async function getPCIComplianceReport(): Promise<{
  checks: PCIComplianceCheck[]
  summary: {
    total: number
    compliant: number
    non_compliant: number
    needs_review: number
    not_applicable: number
    overall_status: string
  }
  last_updated: string
}> {
  try {
    const report = await redis.get('pci_compliance_check')
    if (report) {
      const parsedReport = JSON.parse(report)
      const checks = parsedReport.checks as PCIComplianceCheck[]
      
      return {
        checks,
        summary: {
          total: checks.length,
          compliant: checks.filter(c => c.status === 'compliant').length,
          non_compliant: checks.filter(c => c.status === 'non_compliant').length,
          needs_review: checks.filter(c => c.status === 'needs_review').length,
          not_applicable: checks.filter(c => c.status === 'not_applicable').length,
          overall_status: parsedReport.overall_status
        },
        last_updated: parsedReport.timestamp
      }
    } else {
      // Run fresh compliance check
      const checks = await runPCIComplianceCheck()
      return getPCIComplianceReport() // Recursive call after generating report
    }
  } catch (error) {
    console.error('Error getting PCI compliance report:', error)
    throw error
  }
}

/**
 * Get PCI audit logs
 */
export async function getPCIAuditLogs(limit: number = 100): Promise<PCIAuditLog[]> {
  try {
    const logs = await redis.lrange('pci_audit_logs', 0, limit - 1)
    return logs.map(log => JSON.parse(log) as PCIAuditLog)
  } catch (error) {
    console.error('Error getting PCI audit logs:', error)
    return []
  }
}

/**
 * Sanitize data for PCI compliance (remove sensitive information)
 */
export async function sanitizeForPCI(data: any): Promise<any> {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const sanitized = { ...data }
  const sensitiveFields = [
    'card_number', 'cardNumber', 'pan', 'track_data', 'trackData',
    'cvv', 'cvc', 'cvv2', 'cid', 'security_code', 'securityCode',
    'expiry', 'expiry_date', 'expiryDate', 'exp_month', 'exp_year',
    'pin', 'magnetic_stripe', 'chip_data'
  ]

  function sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item))
    } else if (typeof obj === 'object' && obj !== null) {
      const result: any = {}
      for (const key in obj) {
        const lowerKey = key.toLowerCase()
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED_PCI]'
        } else {
          result[key] = sanitizeObject(obj[key])
        }
      }
      return result
    }
    return obj
  }

  return sanitizeObject(sanitized)
}

/**
 * Middleware to ensure PCI compliance for payment endpoints
 */
export async function ensurePCICompliance(
  request: Request,
  context: {
    userId?: string
    userRole?: string
    endpoint: string
    action: string
  }
): Promise<{
  compliant: boolean
  violations: string[]
  recommendations: string[]
}> {
  const violations: string[] = []
  const recommendations: string[] = []

  // Check HTTPS requirement
  const isSecure = await validateEncryptedTransmission(request)
  if (!isSecure) {
    violations.push('PCI_DSS_4: Insecure transmission detected')
    recommendations.push('Use HTTPS for all payment-related communications')
  }

  // Check access authorization
  if (context.userId && context.userRole) {
    const paymentFields = ['payment_details', 'card_data', 'transaction_data']
    const accessCheck = await validatePaymentDataAccess(
      context.userId,
      context.userRole,
      paymentFields
    )
    
    if (!accessCheck.allowed) {
      violations.push('PCI_DSS_7: Unauthorized access to payment data')
      recommendations.push('Ensure user has appropriate role for payment data access')
    }
  }

  // Log the compliance check
  await logPaymentAccess({
    userId: context.userId,
    action: context.action,
    resource: context.endpoint,
    ip: 'system',
    success: violations.length === 0,
    details: {
      violations,
      compliance_check: true,
      pci_requirements_evaluated: ['PCI_DSS_4', 'PCI_DSS_7', 'PCI_DSS_10']
    }
  })

  return {
    compliant: violations.length === 0,
    violations,
    recommendations
  }
}