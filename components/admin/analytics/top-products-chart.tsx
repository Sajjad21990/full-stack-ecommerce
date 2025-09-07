import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, Crown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TopProductsChartProps {
  data: Array<{
    productId: string
    productName: string
    variantId?: string
    variantName?: string
    totalQuantity: number
    totalSales: number
    orderCount: number
  }>
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  const maxSales = Math.max(...data.map(p => p.totalSales))
  const maxQuantity = Math.max(...data.map(p => p.totalQuantity))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-green-500" />
          Top Selling Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.slice(0, 8).map((product, index) => (
            <div key={`${product.productId}-${product.variantId || 'default'}`} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {index === 0 ? <Crown className="h-3 w-3" /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{product.productName}</h4>
                    {product.variantName && (
                      <p className="text-xs text-muted-foreground">{product.variantName}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {product.totalQuantity} sold
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {product.orderCount} orders
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(product.totalSales)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(product.totalSales / product.totalQuantity)} avg
                  </div>
                </div>
              </div>

              {/* Sales Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Revenue</span>
                  <span>{((product.totalSales / maxSales) * 100).toFixed(1)}% of top</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-500' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${Math.max((product.totalSales / maxSales) * 100, 3)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Quantity Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Quantity</span>
                  <span>{((product.totalQuantity / maxQuantity) * 100).toFixed(1)}% of top</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${
                      index === 0 ? 'bg-yellow-400' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-400' :
                      'bg-blue-400'
                    }`}
                    style={{ 
                      width: `${Math.max((product.totalQuantity / maxQuantity) * 100, 3)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales data available for this period</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}