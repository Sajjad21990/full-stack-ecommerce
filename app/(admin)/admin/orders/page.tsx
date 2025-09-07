import { Suspense } from 'react'
import { getOrders, getOrderStats } from '@/lib/admin/queries/orders'
import OrdersTable from '@/components/admin/orders/orders-table'
import OrderStats from '@/components/admin/orders/order-stats'
import OrderFilters from '@/components/admin/orders/order-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    paymentStatus?: string
    fulfillmentStatus?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
  }
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const filters = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search,
    status: searchParams.status,
    paymentStatus: searchParams.paymentStatus,
    fulfillmentStatus: searchParams.fulfillmentStatus,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any
  }

  const [ordersData, stats] = await Promise.all([
    getOrders(filters),
    getOrderStats()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track customer orders
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
        <OrderStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <OrderFilters filters={filters} />
          </Suspense>
          
          <Suspense fallback={<div>Loading orders...</div>}>
            <OrdersTable 
              orders={ordersData.orders} 
              pagination={ordersData.pagination}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}