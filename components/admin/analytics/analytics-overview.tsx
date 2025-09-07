import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  Target,
  Clock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AnalyticsOverviewProps {
  analytics: {
    overview: {
      totalSales: number
      totalOrders: number
      averageOrderValue: number
      totalCustomers: number
      totalItems: number
      successfulOrders: number
      pendingOrders: number
      cancelledOrders: number
    }
  }
}

export default function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  const { overview } = analytics

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(overview.totalSales),
      description: 'Total sales revenue',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: '+12.5%' // This would be calculated from previous period
    },
    {
      title: 'Total Orders',
      value: overview.totalOrders.toLocaleString(),
      description: 'Orders placed',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: '+8.2%'
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(overview.averageOrderValue),
      description: 'Per order',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: '+3.1%'
    },
    {
      title: 'Total Customers',
      value: overview.totalCustomers.toLocaleString(),
      description: 'Unique customers',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: '+15.3%'
    },
    {
      title: 'Items Sold',
      value: overview.totalItems.toLocaleString(),
      description: 'Total quantity',
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      trend: '+6.7%'
    },
    {
      title: 'Success Rate',
      value: overview.totalOrders > 0 
        ? `${((overview.successfulOrders / overview.totalOrders) * 100).toFixed(1)}%`
        : '0%',
      description: 'Order completion',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      trend: '+2.4%'
    },
    {
      title: 'Pending Orders',
      value: overview.pendingOrders.toLocaleString(),
      description: 'Awaiting processing',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      trend: '-1.2%'
    },
    {
      title: 'Cancelled Orders',
      value: overview.cancelledOrders.toLocaleString(),
      description: 'Cancelled by customer',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      trend: '-0.8%'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const isPositiveTrend = card.trend.startsWith('+')
        
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
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                <div className={`flex items-center text-xs ${
                  isPositiveTrend ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {card.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}