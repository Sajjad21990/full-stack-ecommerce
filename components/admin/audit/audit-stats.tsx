import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Shield, AlertCircle, CheckCircle } from 'lucide-react'

interface AuditStatsProps {
  stats?: any
}

export default function AuditStats({ stats }: AuditStatsProps) {
  const defaultStats = {
    totalActions: 0,
    errorActions: 0,
    successRate: 100,
    actionsByType: [],
    actionsByUser: [],
    recentActions: []
  }
  
  const data = { ...defaultStats, ...stats }
  
  const cards = [
    {
      title: 'Total Events',
      value: (data.totalActions || 0).toLocaleString(),
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Error Events',
      value: (data.errorActions || 0).toLocaleString(),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Success Rate',
      value: `${(data.successRate || 100).toFixed(1)}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Action Types',
      value: (data.actionsByType?.length || 0).toLocaleString(),
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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