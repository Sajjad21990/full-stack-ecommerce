import { Suspense } from 'react'
import { getDiscounts, getDiscountStats } from '@/lib/admin/queries/discounts'
import DiscountsTable from '@/components/admin/discounts/discounts-table'
import DiscountStats from '@/components/admin/discounts/discount-stats'
import DiscountFilters from '@/components/admin/discounts/discount-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, Calendar } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    type?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
  }
}

export default async function DiscountsPage({ searchParams }: PageProps) {
  const filters = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search,
    type: searchParams.type,
    status: searchParams.status,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any
  }

  const [discountsData, stats] = await Promise.all([
    getDiscounts(filters),
    getDiscountStats()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts & Promotions</h1>
          <p className="text-muted-foreground">
            Manage discount codes, promotions, and special offers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/discounts/schedule">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/discounts/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Discount
            </Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <DiscountStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>All Discounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <DiscountFilters filters={filters} />
          </Suspense>
          
          <Suspense fallback={<div>Loading discounts...</div>}>
            <DiscountsTable 
              discounts={discountsData.discounts} 
              pagination={discountsData.pagination}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}