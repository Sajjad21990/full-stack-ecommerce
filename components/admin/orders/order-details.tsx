import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface OrderDetailsProps {
  order: any
}

export default function OrderDetails({ order }: OrderDetailsProps) {
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
      <Badge variant="outline" className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getFulfillmentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      unfulfilled: 'bg-gray-100 text-gray-800',
      partially_fulfilled: 'bg-orange-100 text-orange-800',
      fulfilled: 'bg-green-100 text-green-800',
      returned: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <div className="flex gap-2">
              {getPaymentStatusBadge(order.paymentStatus)}
              {getFulfillmentStatusBadge(order.fulfillmentStatus)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100">
                  {item.product?.images?.[0] ? (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{item.product?.name || 'Product'}</h4>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product?.sku || item.variant?.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Ordered: {item.quantity}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>Fulfilled: {item.fulfilledQuantity}</span>
                    {item.returnedQuantity > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-red-600">Returned: {item.returnedQuantity}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotalAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
            )}
            {order.shippingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Refunded</span>
                <span>-{formatCurrency(order.refundedAmount)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.payments.map((payment: any, index: number) => (
            <div key={index} className="border-b pb-3 last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{payment.paymentMethod || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.gateway} • {payment.gatewayTransactionId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {payment.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(payment.amount))}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {payment.status}
                  </Badge>
                </div>
              </div>
              {payment.failureMessage && (
                <p className="text-sm text-red-600 mt-2">
                  Error: {payment.failureMessage}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {order.trackingNumber && (
        <Card>
          <CardHeader>
            <CardTitle>Shipping Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Carrier</span>
                <span className="font-medium">{order.carrier || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Tracking Number</span>
                <span className="font-medium">{order.trackingNumber}</span>
              </div>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-primary hover:underline text-sm"
                >
                  Track Package →
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}