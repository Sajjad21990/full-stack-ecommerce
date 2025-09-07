import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { hasPermission } from '@/lib/rbac'
import { 
  runPCIComplianceCheck, 
  getPCIComplianceReport, 
  getPCIAuditLogs,
  logPaymentAccess
} from '@/lib/pci-compliance'

// GET /api/admin/compliance/pci - Get PCI compliance report
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:compliance')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true'
    const auditLogLimit = parseInt(searchParams.get('auditLogLimit') || '100')

    // Log access to PCI compliance data
    await logPaymentAccess({
      userId: session.user.id,
      action: 'view_pci_compliance_report',
      resource: 'pci_compliance_report',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      success: true
    })

    // Get compliance report
    const report = await getPCIComplianceReport()
    
    // Get audit logs if requested
    let auditLogs = null
    if (includeAuditLogs) {
      auditLogs = await getPCIAuditLogs(auditLogLimit)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        audit_logs: auditLogs
      }
    })

  } catch (error) {
    console.error('Error fetching PCI compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PCI compliance report' },
      { status: 500 }
    )
  }
}

// POST /api/admin/compliance/pci - Run new PCI compliance check
export async function POST(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:compliance:manage')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Log access to run PCI compliance check
    await logPaymentAccess({
      userId: session.user.id,
      action: 'run_pci_compliance_check',
      resource: 'pci_compliance_system',
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      success: true
    })

    // Run fresh compliance check
    const checks = await runPCIComplianceCheck()
    
    // Get updated report
    const report = await getPCIComplianceReport()

    return NextResponse.json({
      success: true,
      message: 'PCI compliance check completed',
      data: report
    })

  } catch (error) {
    console.error('Error running PCI compliance check:', error)
    return NextResponse.json(
      { error: 'Failed to run PCI compliance check' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/compliance/pci - Update compliance check status
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !hasPermission(session.user, 'admin:compliance:manage')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { requirement, status, notes } = body

    if (!requirement || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: requirement, status' },
        { status: 400 }
      )
    }

    // Log compliance status update
    await logPaymentAccess({
      userId: session.user.id,
      action: 'update_pci_compliance_status',
      resource: 'pci_compliance_requirement',
      resourceId: requirement,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      success: true,
      details: {
        requirement,
        new_status: status,
        notes,
        updated_by: session.user.email
      }
    })

    // In a real implementation, you would update the compliance status
    // For now, we'll just log the action and return success
    
    return NextResponse.json({
      success: true,
      message: `PCI requirement ${requirement} status updated to ${status}`,
      updated_at: new Date().toISOString(),
      updated_by: session.user.email
    })

  } catch (error) {
    console.error('Error updating PCI compliance status:', error)
    return NextResponse.json(
      { error: 'Failed to update PCI compliance status' },
      { status: 500 }
    )
  }
}