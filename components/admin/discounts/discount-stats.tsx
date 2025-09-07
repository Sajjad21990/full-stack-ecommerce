import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Gift, TrendingUp, Calendar, DollarSign, Users, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DiscountStatsProps {
  stats: {
    total: number
    active: number
    scheduled: number
    expired: number
    totalUsage: number
    totalSaved: number
    recentUsage: number
    conversionRate: number
    topDiscounts: Array<{
      discountId: string
      code: string
      title: string
      usageCount: number
      totalSaved: number
    }>
  }
}

export default function DiscountStats({ stats }: DiscountStatsProps) {
  const cards = [
    {
      title: 'Total Discounts',
      value: stats.total.toLocaleString(),
      icon: Gift,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: `${stats.active} active`
    },
    {
      title: 'Total Usage',
      value: stats.totalUsage.toLocaleString(),
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: `${stats.recentUsage} in last 30 days`
    },
    {
      title: 'Total Saved',
      value: formatCurrency(stats.totalSaved),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Customer savings'
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Usage rate'
    },
    {
      title: 'Scheduled',
      value: stats.scheduled.toLocaleString(),
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: 'Upcoming discounts'
    },
    {
      title: 'Expired',
      value: stats.expired.toLocaleString(),
      icon: Percent,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'Past discounts'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.bgColor} p-2 rounded-lg`}>
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

      {stats.topDiscounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Discounts (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topDiscounts.map((discount, index) => (
                <div key={discount.discountId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{discount.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Code: {discount.code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{discount.usageCount} uses</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(discount.totalSaved)} saved
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}