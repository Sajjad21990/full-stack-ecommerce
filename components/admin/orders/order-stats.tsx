import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShoppingBag
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface OrderStatsProps {
  stats: {
    totalOrders: number
    todayOrders: number
    monthOrders: number
    pendingOrders: number
    processingOrders: number
    completedOrders: number
    revenue: {
      total: number
      today: number
      month: number
    }
  }
}

export default function OrderStats({ stats }: OrderStatsProps) {
  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      description: `${stats.monthOrders} this month`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders.toLocaleString(),
      description: `${((stats.todayOrders / stats.totalOrders) * 100).toFixed(1)}% of total`,
      icon: ShoppingBag,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.revenue.total),
      description: `${formatCurrency(stats.revenue.month)} this month`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.revenue.today),
      description: `Average: ${formatCurrency(stats.revenue.today / Math.max(stats.todayOrders, 1))}`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toLocaleString(),
      description: 'Awaiting confirmation',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Processing',
      value: stats.processingOrders.toLocaleString(),
      description: 'Being prepared',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Completed',
      value: stats.completedOrders.toLocaleString(),
      description: `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}% success rate`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Cancelled',
      value: (stats.totalOrders - stats.pendingOrders - stats.processingOrders - stats.completedOrders).toLocaleString(),
      description: 'Orders cancelled',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  return (
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
  )
}