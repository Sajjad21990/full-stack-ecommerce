import { Suspense } from 'react'
import { getPayments, getCachedPaymentStats } from '@/lib/admin/queries/payments'
import PaymentsTable from '@/components/admin/payments/payments-table'
import PaymentStats from '@/components/admin/payments/payment-stats'
import PaymentFilters from '@/components/admin/payments/payment-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Settings, RefreshCw, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    gateway?: string
    paymentMethod?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
    minAmount?: string
    maxAmount?: string
  }
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const filters = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search,
    status: searchParams.status as any,
    gateway: searchParams.gateway,
    paymentMethod: searchParams.paymentMethod,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any,
    minAmount: searchParams.minAmount ? parseFloat(searchParams.minAmount) : undefined,
    maxAmount: searchParams.maxAmount ? parseFloat(searchParams.maxAmount) : undefined
  }

  const [paymentsData, stats] = await Promise.all([
    getPayments(filters),
    getCachedPaymentStats()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Monitor and manage payment transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/payments/analytics">
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/payments/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <PaymentStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <PaymentFilters filters={filters} />
          </Suspense>
          
          <Suspense fallback={<div>Loading payments...</div>}>
            <PaymentsTable 
              payments={paymentsData.payments} 
              pagination={paymentsData.pagination}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}