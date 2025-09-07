'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, PieChart, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentAnalyticsChartsProps {
  analytics: {
    revenueByDay: Array<{
      date: string
      revenue: number
      transactions: number
      refunds: number
    }>
    revenueByHour: Array<{
      hour: number
      revenue: number
      transactions: number
    }>
    statusDistribution: Array<{
      status: string
      count: number
      volume: number
    }>
  }
}

export default function PaymentAnalyticsCharts({ analytics }: PaymentAnalyticsChartsProps) {
  const maxDailyRevenue = Math.max(...analytics.revenueByDay.map(d => d.revenue))
  const maxHourlyRevenue = Math.max(...analytics.revenueByHour.map(h => h.revenue))
  const totalVolume = analytics.statusDistribution.reduce((sum, s) => sum + Math.abs(s.volume), 0)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      captured: 'bg-green-500',
      pending: 'bg-yellow-500',
      authorized: 'bg-blue-500',
      failed: 'bg-red-500',
      refunded: 'bg-gray-500',
      cancelled: 'bg-red-400'
    }
    return colors[status] || 'bg-gray-400'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Daily Revenue Trend */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Revenue Trend (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.revenueByDay.slice(-15).map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[200px]">
                    <div 
                      className="bg-blue-500 h-3 rounded-full relative"
                      style={{ 
                        width: `${Math.max((day.revenue / maxDailyRevenue) * 100, 2)}%` 
                      }}
                    />
                    {day.refunds > 0 && (
                      <div 
                        className="bg-red-400 h-1 rounded-full mt-1"
                        style={{ 
                          width: `${Math.max((day.refunds / maxDailyRevenue) * 100, 1)}%` 
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(day.revenue)}</div>
                  <div className="text-xs text-muted-foreground">
                    {day.transactions} txns
                    {day.refunds > 0 && (
                      <span className="text-red-600 ml-1">
                        -{formatCurrency(day.refunds)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            Today's Hourly Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourData = analytics.revenueByHour.find(h => h.hour === hour)
              const revenue = hourData?.revenue || 0
              const transactions = hourData?.transactions || 0
              
              return (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-sm w-12">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ 
                          width: maxHourlyRevenue > 0 
                            ? `${Math.max((revenue / maxHourlyRevenue) * 100, revenue > 0 ? 2 : 0)}%` 
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16">
                      {transactions > 0 ? `${transactions} txns` : ''}
                    </span>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {revenue > 0 ? formatCurrency(revenue) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-500" />
            Payment Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.statusDistribution
              .sort((a, b) => Math.abs(b.volume) - Math.abs(a.volume))
              .map((status) => {
                const percentage = totalVolume > 0 
                  ? (Math.abs(status.volume) / totalVolume) * 100 
                  : 0
                
                return (
                  <div key={status.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`} />
                        <span className="capitalize font-medium">{status.status}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {status.volume < 0 ? '-' : ''}{formatCurrency(Math.abs(status.volume))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {status.count} transactions
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getStatusColor(status.status)}`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of total volume
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}