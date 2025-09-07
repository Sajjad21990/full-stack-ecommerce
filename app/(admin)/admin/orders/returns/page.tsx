import { Suspense } from 'react'
import { getReturns, getReturnStats } from '@/lib/admin/queries/returns'
import ReturnsTable from '@/components/admin/orders/returns-table'
import ReturnStats from '@/components/admin/orders/return-stats'
import ReturnFilters from '@/components/admin/orders/return-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    reason?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
  }
}

export default async function ReturnsPage({ searchParams }: PageProps) {
  const filters = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search,
    status: searchParams.status,
    reason: searchParams.reason,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any
  }

  const [returnsData, stats] = await Promise.all([
    getReturns(filters),
    getReturnStats()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Returns & RMAs</h1>
          <p className="text-muted-foreground">
            Manage product returns and return merchandise authorizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <ReturnStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>All Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <ReturnFilters filters={filters} />
          </Suspense>
          
          <Suspense fallback={<div>Loading returns...</div>}>
            <ReturnsTable 
              returns={returnsData.returns} 
              pagination={returnsData.pagination}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}