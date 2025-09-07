import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Clock, CheckCircle, AlertCircle, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReturnStatsProps {
  stats: {
    total: number
    pending: number
    approved: number
    processed: number
    recentCount: number
    returnValue: number
    byReason: { reason: string; count: number }[]
  }
}

export default function ReturnStats({ stats }: ReturnStatsProps) {
  const cards = [
    {
      title: 'Total Returns',
      value: stats.total.toLocaleString(),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending Review',
      value: stats.pending.toLocaleString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Approved',
      value: stats.approved.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Processed',
      value: stats.processed.toLocaleString(),
      icon: AlertCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Return Value (30d)',
      value: formatCurrency(stats.returnValue),
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Recent Returns (30d)',
      value: stats.recentCount.toLocaleString(),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ]

  return (
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}