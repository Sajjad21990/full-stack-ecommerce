import { Suspense } from 'react'
import { getCachedSalesAnalytics } from '@/lib/admin/queries/analytics'
import SalesChart from '@/components/admin/analytics/sales-chart'
import SalesBreakdown from '@/components/admin/analytics/sales-breakdown'
import SalesFilters from '@/components/admin/analytics/sales-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Calendar } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    period?: string
    dateFrom?: string
    dateTo?: string
  }
}

export default async function SalesReportsPage({ searchParams }: PageProps) {
  const filters = {
    period: searchParams.period as any || 'month',
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined
  }

  const analytics = await getCachedSalesAnalytics(filters)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Reports</h1>
            <p className="text-muted-foreground">
              Detailed analysis of sales performance and trends
            </p>
          </div>
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

      <Suspense fallback={<div>Loading filters...</div>}>
        <SalesFilters filters={filters} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<div>Loading sales chart...</div>}>
            <SalesChart data={analytics.salesByPeriod.map(item => ({
              date: item.date,
              sales: item.totalSales,
              orders: item.totalOrders,
              customers: 0 // We don't track customers per day yet
            }))} />
          </Suspense>

          {analytics.salesByHour.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Hour (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const hourData = analytics.salesByHour.find(h => h.hour === hour)
                    const sales = hourData?.totalSales || 0
                    const orders = hourData?.totalOrders || 0
                    const maxHourlySales = Math.max(...analytics.salesByHour.map(h => h.totalSales || 0))
                    
                    return (
                      <div key={hour} className="flex items-center gap-3">
                        <div className="w-12 text-sm">
                          {hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ 
                                width: maxHourlySales > 0 
                                  ? `${Math.max((sales / maxHourlySales) * 100, sales > 0 ? 2 : 0)}%` 
                                  : '0%'
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right text-sm">
                          ${sales.toFixed(0)}
                        </div>
                        <div className="w-16 text-right text-xs text-muted-foreground">
                          {orders} orders
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Suspense fallback={<div>Loading breakdown...</div>}>
            <SalesBreakdown data={analytics} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}