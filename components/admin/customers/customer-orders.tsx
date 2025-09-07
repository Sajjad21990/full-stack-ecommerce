import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Package, DollarSign } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface CustomerOrdersProps {
  orders: any[]
  customerId: string
}

export default function CustomerOrders({ orders, customerId }: CustomerOrdersProps) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800',
      partially_refunded: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
      authorized: 'bg-blue-100 text-blue-800'
    }

    return (
      <Badge variant="outline" className={colors[status]} size="sm">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-muted-foreground">This customer hasn't placed any orders.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <Link href={`/admin/orders?customerId=${customerId}`}>
          <Button variant="outline" size="sm">
            View All Orders
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <Link 
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{formatDate(new Date(order.createdAt))}</p>
                    <p>{order.items?.length || 0} item(s)</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(order.totalAmount)}</div>
                    {order.refundedAmount > 0 && (
                      <div className="text-sm text-red-600">
                        -{formatCurrency(order.refundedAmount)} refunded
                      </div>
                    )}
                  </div>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.product?.name || 'Product'}</span>
                          {item.variant && (
                            <span className="text-muted-foreground">({item.variant.name})</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.price)}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        +{order.items.length - 3} more item(s)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}