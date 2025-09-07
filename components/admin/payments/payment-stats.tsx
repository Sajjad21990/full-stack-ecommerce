import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Users,
  Target
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PaymentStatsProps {
  stats: {
    totalTransactions: number
    successfulTransactions: number
    failedTransactions: number
    pendingTransactions: number
    refundedTransactions: number
    totalVolume: number
    totalRefunded: number
    todayVolume: number
    monthVolume: number
    todayTransactions: number
    monthTransactions: number
    successRate: number
    paymentMethods: Array<{
      method: string
      count: number
      volume: number
    }>
    gateways: Array<{
      gateway: string
      count: number
      volume: number
      successRate: number
    }>
    dailyTrend: Array<{
      date: string
      volume: number
      transactions: number
    }>
    recentFailures: Array<{
      id: string
      amount: number
      currency: string
      gateway: string
      failureMessage: string
      createdAt: Date
      orderNumber: string
      customerEmail: string
    }>
    topCustomers: Array<{
      customerId: string
      customerName: string
      customerEmail: string
      totalSpent: number
      transactionCount: number
    }>
  }
}

export default function PaymentStats({ stats }: PaymentStatsProps) {
  const cards = [
    {
      title: 'Total Volume',
      value: formatCurrency(stats.totalVolume),
      description: `${formatCurrency(stats.monthVolume)} this month`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todayVolume),
      description: `${stats.todayTransactions} transactions`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate.toFixed(1)}%`,
      description: `${stats.successfulTransactions} successful`,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Total Transactions',
      value: stats.totalTransactions.toLocaleString(),
      description: `${stats.monthTransactions} this month`,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Failed Payments',
      value: stats.failedTransactions.toLocaleString(),
      description: `${((stats.failedTransactions / stats.totalTransactions) * 100).toFixed(1)}% failure rate`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Pending Payments',
      value: stats.pendingTransactions.toLocaleString(),
      description: 'Awaiting processing',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Total Refunded',
      value: formatCurrency(stats.totalRefunded),
      description: `${stats.refundedTransactions} refunds`,
      icon: RefreshCw,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.paymentMethods.slice(0, 5).map((method, index) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-purple-500' :
                      index === 2 ? 'bg-green-500' :
                      index === 3 ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="capitalize">{method.method || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(method.volume)}</div>
                    <div className="text-xs text-muted-foreground">{method.count} txns</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gateway Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Gateway Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.gateways.map((gateway) => (
                <div key={gateway.gateway} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{gateway.gateway}</span>
                    <Badge variant="outline" className="text-xs">
                      {gateway.successRate}% success
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(gateway.volume)}</span>
                    <span>{gateway.count} transactions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Volume Trend (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.dailyTrend.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((day.volume / Math.max(...stats.dailyTrend.map(d => d.volume))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {formatCurrency(day.volume)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Failures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Failed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentFailures.slice(0, 5).map((failure) => (
                <div key={failure.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">#{failure.orderNumber}</span>
                    <span className="font-medium">{formatCurrency(failure.amount)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {failure.customerEmail}
                  </div>
                  <div className="text-xs text-red-600 mb-1">
                    {failure.failureMessage}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(new Date(failure.createdAt))} • {failure.gateway}
                  </div>
                </div>
              ))}
              {stats.recentFailures.length === 0 && (
                <p className="text-muted-foreground text-sm">No recent failures</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Top Customers by Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.customerName}</p>
                      <p className="text-xs text-muted-foreground">{customer.customerEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">{customer.transactionCount} txns</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}