'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SalesChartProps {
  data: Array<{
    date: string
    sales: number
    orders: number
    customers: number
  }>
}

export default function SalesChart({ data }: SalesChartProps) {
  const maxSales = Math.max(...data.map(d => d.sales))
  const totalSales = data.reduce((sum, d) => sum + d.sales, 0)
  const averageSales = data.length > 0 ? totalSales / data.length : 0
  
  // Calculate growth from first to last day
  const growth = data.length > 1 
    ? ((data[data.length - 1].sales - data[0].sales) / data[0].sales) * 100 
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Sales Trend
          </CardTitle>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="font-bold">{formatCurrency(totalSales)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Area */}
          <div className="space-y-2">
            {data.slice(-15).map((day, index) => (
              <div key={day.date} className="flex items-center gap-3">
                <div className="w-16 text-xs text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1 relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full relative"
                      style={{ 
                        width: `${Math.max((day.sales / maxSales) * 100, 2)}%` 
                      }}
                    >
                      {day.sales > averageSales && (
                        <div className="absolute -top-6 right-0 text-xs bg-blue-500 text-white px-1 rounded">
                          {formatCurrency(day.sales)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Orders indicator */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{day.orders} orders</span>
                    <span>{day.customers} customers</span>
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-medium">
                  {formatCurrency(day.sales)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Average Daily</div>
              <div className="font-semibold">{formatCurrency(averageSales)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Best Day</div>
              <div className="font-semibold">{formatCurrency(maxSales)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Growth</div>
              <div className={`font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}