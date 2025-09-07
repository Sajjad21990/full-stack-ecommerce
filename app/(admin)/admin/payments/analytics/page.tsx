import { Suspense } from 'react'
import { getPaymentAnalytics, getCachedPaymentStats } from '@/lib/admin/queries/payments'
import PaymentAnalyticsCharts from '@/components/admin/payments/payment-analytics-charts'
import PaymentInsights from '@/components/admin/payments/payment-insights'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Calendar } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    dateFrom?: string
    dateTo?: string
  }
}

export default async function PaymentAnalyticsPage({ searchParams }: PageProps) {
  const dateFrom = searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined
  const dateTo = searchParams.dateTo ? new Date(searchParams.dateTo) : undefined

  const [analytics, stats] = await Promise.all([
    getPaymentAnalytics(dateFrom, dateTo),
    getCachedPaymentStats()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/payments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Analytics</h1>
            <p className="text-muted-foreground">
              Detailed insights into payment performance and trends
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

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.totalVolume / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTransactions.toLocaleString()} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.successfulTransactions} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.totalVolume && stats.successfulTransactions 
                ? (stats.totalVolume / stats.successfulTransactions).toFixed(0) 
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per successful transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {((stats.failedTransactions / stats.totalTransactions) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.failedTransactions} failed payments
            </p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<div>Loading charts...</div>}>
        <PaymentAnalyticsCharts analytics={analytics} />
      </Suspense>

      <Suspense fallback={<div>Loading insights...</div>}>
        <PaymentInsights stats={stats} analytics={analytics} />
      </Suspense>
    </div>
  )
}