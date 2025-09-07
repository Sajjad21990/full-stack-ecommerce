import { Suspense } from 'react'
import { getCachedSalesAnalytics } from '@/lib/admin/queries/analytics'
import AnalyticsOverview from '@/components/admin/analytics/analytics-overview'
import SalesChart from '@/components/admin/analytics/sales-chart'
import TopProductsChart from '@/components/admin/analytics/top-products-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  Calendar, 
  TrendingUp,
  BarChart3,
  Users,
  Package
} from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    period?: string
    dateFrom?: string
    dateTo?: string
  }
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const filters = {
    period: searchParams.period as any || 'month',
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined
  }

  const analytics = await getCachedSalesAnalytics(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/admin/analytics/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Sales Reports</h3>
                  <p className="text-sm text-muted-foreground">Revenue & orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/analytics/revenue">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Revenue Analytics</h3>
                  <p className="text-sm text-muted-foreground">Financial insights</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/analytics/products">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Product Performance</h3>
                  <p className="text-sm text-muted-foreground">Best sellers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/analytics/customers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Customer Analytics</h3>
                  <p className="text-sm text-muted-foreground">User behavior</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Overview Dashboard */}
      <Suspense fallback={<div>Loading overview...</div>}>
        <AnalyticsOverview analytics={analytics} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<div>Loading sales chart...</div>}>
          <SalesChart data={analytics.salesByPeriod} />
        </Suspense>

        <Suspense fallback={<div>Loading products chart...</div>}>
          <TopProductsChart data={analytics.topProducts} />
        </Suspense>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <h4 className="font-medium">Order Success Rate</h4>
              </div>
              <p className="text-2xl font-bold">
                {analytics.overview.totalOrders > 0 
                  ? ((analytics.overview.successfulOrders / analytics.overview.totalOrders) * 100).toFixed(1)
                  : 0
                }%
              </p>
              <p className="text-sm text-muted-foreground">
                {analytics.overview.successfulOrders} of {analytics.overview.totalOrders} orders
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <h4 className="font-medium">Customer Acquisition</h4>
              </div>
              <p className="text-2xl font-bold">{analytics.customerMetrics.newCustomers}</p>
              <p className="text-sm text-muted-foreground">
                New customers this period
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <h4 className="font-medium">Items per Order</h4>
              </div>
              <p className="text-2xl font-bold">
                {analytics.overview.totalOrders > 0 
                  ? (analytics.overview.totalItems / analytics.overview.totalOrders).toFixed(1)
                  : 0
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Average items per order
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}