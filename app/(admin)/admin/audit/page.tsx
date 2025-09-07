import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getAuditLogs, getAuditStats, getAuditActionTypes, getAuditResourceTypes } from '@/lib/admin/queries/audit'
import AuditLogsTable from '@/components/admin/audit/audit-logs-table'
import AuditFilters from '@/components/admin/audit/audit-filters'
import AuditStats from '@/components/admin/audit/audit-stats'
import { Shield, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

interface AuditPageProps {
  searchParams: {
    search?: string
    userId?: string
    action?: string
    resourceType?: string
    status?: 'success' | 'error' | 'partial'
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    limit?: string
  }
}

export default function AuditPage({ searchParams }: AuditPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track and monitor all admin activities and system events
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<AuditStatsSkeleton />}>
        <AuditStatsWrapper />
      </Suspense>

      {/* Filters */}
      <Suspense fallback={<div className="h-20" />}>
        <AuditFiltersWrapper />
      </Suspense>

      {/* Audit Logs Table */}
      <Suspense fallback={<AuditTableSkeleton />}>
        <AuditLogsWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function AuditStatsWrapper() {
  const stats = await getAuditStats(30)

  return <AuditStats stats={stats} />
}

async function AuditFiltersWrapper() {
  const [actionTypes, resourceTypes] = await Promise.all([
    getAuditActionTypes(),
    getAuditResourceTypes()
  ])
  
  return <AuditFilters actionTypes={actionTypes} resourceTypes={resourceTypes} />
}

async function AuditLogsWrapper({ searchParams }: { searchParams: AuditPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    userId: searchParams.userId,
    action: searchParams.action,
    resourceType: searchParams.resourceType,
    status: searchParams.status,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any || 'timestamp',
    sortOrder: searchParams.sortOrder || 'desc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '50')
  }

  const { logs, pagination } = await getAuditLogs(filters)

  return (
    <AuditLogsTable 
      logs={logs}
      pagination={pagination}
      currentFilters={filters}
    />
  )
}

function AuditStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AuditTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}