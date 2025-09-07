import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Calendar,
  Crown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CustomerStatsProps {
  stats: {
    totalCustomers: number
    activeCustomers: number
    verifiedCustomers: number
    customersWithOrders: number
    newCustomersToday: number
    newCustomersMonth: number
    avgLifetimeValue: number
    topCustomers: Array<{
      id: string
      name: string
      email: string
      orderCount: number
      totalSpent: number
    }>
    acquisitionTrend: Array<{
      date: string
      count: number
    }>
  }
}

export default function CustomerStats({ stats }: CustomerStatsProps) {
  const cards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      description: `${stats.newCustomersMonth} this month`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Customers',
      value: stats.activeCustomers.toLocaleString(),
      description: `${((stats.activeCustomers / stats.totalCustomers) * 100).toFixed(1)}% of total`,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Email Verified',
      value: stats.verifiedCustomers.toLocaleString(),
      description: `${((stats.verifiedCustomers / stats.totalCustomers) * 100).toFixed(1)}% verified`,
      icon: ShieldCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Customers with Orders',
      value: stats.customersWithOrders.toLocaleString(),
      description: `${((stats.customersWithOrders / stats.totalCustomers) * 100).toFixed(1)}% conversion`,
      icon: ShoppingBag,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'New Today',
      value: stats.newCustomersToday.toLocaleString(),
      description: 'Customers joined today',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Avg. Lifetime Value',
      value: formatCurrency(stats.avgLifetimeValue),
      description: 'Per customer',
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between">
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
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-muted-foreground">{customer.orderCount} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Acquisition Trend (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.acquisitionTrend.slice(-7).map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min((day.count / Math.max(...stats.acquisitionTrend.map(d => d.count))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{day.count}</span>
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