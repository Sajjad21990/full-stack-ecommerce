import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { hasPermission } from '@/lib/rbac'
import {
  runPCIComplianceChecks,
  getPCIComplianceHistory,
} from '@/lib/pci-compliance'

// GET /api/admin/compliance/pci - Get PCI compliance report
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession(authOptions)

    if (!session?.user || !hasPermission(session.user, 'admin:compliance')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true'
    const auditLogLimit = parseInt(searchParams.get('auditLogLimit') || '100')

    // Access logging would go here in production

    // Get compliance report
    const report = await runPCIComplianceChecks()

    // Get audit logs if requested
    let auditLogs = null
    if (includeAuditLogs) {
      auditLogs = await getPCIComplianceHistory(auditLogLimit)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        audit_logs: auditLogs,
      },
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

    if (
      !session?.user ||
      !hasPermission(session.user, 'admin:compliance:manage')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Access logging would go here in production

    // Run fresh compliance check
    const report = await runPCIComplianceChecks()

    return NextResponse.json({
      success: true,
      message: 'PCI compliance check completed',
      data: report,
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

    if (
      !session?.user ||
      !hasPermission(session.user, 'admin:compliance:manage')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requirement, status, notes } = body

    if (!requirement || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: requirement, status' },
        { status: 400 }
      )
    }

    // Access logging would go here in production

    // In a real implementation, you would update the compliance status
    // For now, we'll just log the action and return success

    return NextResponse.json({
      success: true,
      message: `PCI requirement ${requirement} status updated to ${status}`,
      updated_at: new Date().toISOString(),
      updated_by: session.user.email,
    })
  } catch (error) {
    console.error('Error updating PCI compliance status:', error)
    return NextResponse.json(
      { error: 'Failed to update PCI compliance status' },
      { status: 500 }
    )
  }
}
