import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Target,
  Zap
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentInsightsProps {
  stats: any
  analytics: any
}

export default function PaymentInsights({ stats, analytics }: PaymentInsightsProps) {
  // Calculate insights
  const bestPerformingGateway = stats.gateways.reduce((best: any, gateway: any) => {
    return (!best || gateway.successRate > best.successRate) ? gateway : best
  }, null)

  const mostPopularMethod = stats.paymentMethods.reduce((popular: any, method: any) => {
    return (!popular || method.count > popular.count) ? method : popular
  }, null)

  const peakHour = analytics.revenueByHour.reduce((peak: any, hour: any) => {
    return (!peak || hour.revenue > peak.revenue) ? hour : peak
  }, null)

  const recentTrend = analytics.revenueByDay.slice(-7)
  const previousWeekRevenue = recentTrend.slice(0, 3).reduce((sum: number, day: any) => sum + day.revenue, 0)
  const currentWeekRevenue = recentTrend.slice(4, 7).reduce((sum: number, day: any) => sum + day.revenue, 0)
  const weeklyGrowth = previousWeekRevenue > 0 
    ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
    : 0

  const insights = [
    {
      title: 'Weekly Growth',
      value: `${weeklyGrowth > 0 ? '+' : ''}${weeklyGrowth.toFixed(1)}%`,
      description: weeklyGrowth > 0 ? 'Revenue increased this week' : 'Revenue decreased this week',
      icon: weeklyGrowth > 0 ? TrendingUp : TrendingDown,
      color: weeklyGrowth > 0 ? 'text-green-600' : 'text-red-600',
      bgColor: weeklyGrowth > 0 ? 'bg-green-100' : 'bg-red-100'
    },
    {
      title: 'Best Gateway',
      value: bestPerformingGateway?.gateway || 'N/A',
      description: bestPerformingGateway ? `${bestPerformingGateway.successRate}% success rate` : 'No data',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Peak Hour',
      value: peakHour ? `${peakHour.hour}:00` : 'N/A',
      description: peakHour ? formatCurrency(peakHour.revenue) : 'No transactions today',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Top Method',
      value: mostPopularMethod?.method || 'N/A',
      description: mostPopularMethod ? `${mostPopularMethod.count} transactions` : 'No data',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  // Calculate recommendations
  const recommendations = []
  
  if (stats.failedTransactions / stats.totalTransactions > 0.05) {
    recommendations.push({
      type: 'warning',
      title: 'High Failure Rate',
      description: `${((stats.failedTransactions / stats.totalTransactions) * 100).toFixed(1)}% of transactions are failing. Consider reviewing payment gateway configuration.`,
      action: 'Review Gateway Settings'
    })
  }

  if (stats.pendingTransactions > 0) {
    recommendations.push({
      type: 'info',
      title: 'Pending Payments',
      description: `${stats.pendingTransactions} payments are pending. These may need manual review or auto-capture configuration.`,
      action: 'Review Pending Payments'
    })
  }

  if (weeklyGrowth < -10) {
    recommendations.push({
      type: 'warning',
      title: 'Revenue Decline',
      description: `Payment volume has decreased by ${Math.abs(weeklyGrowth).toFixed(1)}% this week. Consider investigating the cause.`,
      action: 'Analyze Trends'
    })
  }

  if (stats.gateways.some((g: any) => g.successRate < 90)) {
    const poorGateways = stats.gateways.filter((g: any) => g.successRate < 90)
    recommendations.push({
      type: 'warning',
      title: 'Gateway Performance Issues',
      description: `${poorGateways.length} gateway(s) have success rates below 90%. Consider switching or optimizing.`,
      action: 'Check Gateway Status'
    })
  }

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {insight.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                  <Icon className={`h-4 w-4 ${insight.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insight.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {insight.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border-l-4 ${
                      rec.type === 'warning' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rec.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {rec.action}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All systems optimal</p>
                  <p className="text-muted-foreground">
                    Your payment system is performing well with no immediate issues detected.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Payment Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {Math.round(stats.successRate)}
                </div>
                <p className="text-muted-foreground">Overall Health Score</p>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span>{stats.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(stats.successRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Gateway Reliability</span>
                    <span>
                      {bestPerformingGateway ? `${bestPerformingGateway.successRate}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: bestPerformingGateway 
                          ? `${Math.min(bestPerformingGateway.successRate, 100)}%` 
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Volume Growth</span>
                    <span>{weeklyGrowth > 0 ? '+' : ''}{weeklyGrowth.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${weeklyGrowth > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(Math.abs(weeklyGrowth) * 2, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Score based on success rate, gateway performance, and growth trends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}