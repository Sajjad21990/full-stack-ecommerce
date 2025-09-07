import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Package, Eye, ArrowRight, Calendar, CreditCard, Truck } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My Orders | Order History',
  description: 'View your order history and track your purchases.',
}

// This would be fetched from the database in a real implementation
const mockOrders = [
  {
    id: '1',
    orderNumber: 'ORD-20240301-0001',
    status: 'delivered',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    totalAmount: 2497,
    currency: 'INR',
    createdAt: new Date('2024-03-01T10:30:00'),
    deliveredAt: new Date('2024-03-05T14:20:00'),
    itemCount: 3,
    items: [
      {
        productTitle: 'Premium Wireless Headphones',
        variantTitle: 'Black',
        quantity: 1,
        price: 1999,
        image: '/api/placeholder/80/80'
      },
      {
        productTitle: 'USB-C Cable',
        variantTitle: '2m',
        quantity: 2,
        price: 249,
        image: '/api/placeholder/80/80'
      }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-20240215-0002',
    status: 'shipped',
    paymentStatus: 'paid',
    fulfillmentStatus: 'partial',
    totalAmount: 1899,
    currency: 'INR',
    createdAt: new Date('2024-02-15T16:45:00'),
    estimatedDelivery: new Date('2024-03-08T00:00:00'),
    itemCount: 2,
    trackingNumber: 'TRK123456789',
    items: [
      {
        productTitle: 'Smart Watch',
        variantTitle: 'Silver',
        quantity: 1,
        price: 1599,
        image: '/api/placeholder/80/80'
      },
      {
        productTitle: 'Watch Strap',
        variantTitle: 'Leather Brown',
        quantity: 1,
        price: 300,
        image: '/api/placeholder/80/80'
      }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-20240201-0003',
    status: 'processing',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    totalAmount: 799,
    currency: 'INR',
    createdAt: new Date('2024-02-01T09:15:00'),
    itemCount: 1,
    items: [
      {
        productTitle: 'Bluetooth Speaker',
        variantTitle: 'Red',
        quantity: 1,
        price: 799,
        image: '/api/placeholder/80/80'
      }
    ]
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'shipped':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'pending':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'Delivered'
    case 'shipped':
      return 'Shipped'
    case 'processing':
      return 'Processing'
    case 'pending':
      return 'Pending'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          </div>
          <p className="text-gray-600 mt-1">Track and manage your order history</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mockOrders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
              <Button asChild>
                <Link href="/">
                  Start Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {mockOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Ordered {formatDate(order.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          {formatPrice(order.totalAmount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/account/orders/${order.orderNumber}`}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Order Status Updates */}
                  <div className="mb-6">
                    {order.status === 'delivered' && order.deliveredAt && (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                        <Package className="w-4 h-4" />
                        Delivered on {formatDate(order.deliveredAt)}
                      </div>
                    )}
                    
                    {order.status === 'shipped' && (
                      <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                        <Truck className="w-4 h-4" />
                        <div>
                          Shipped - Expected delivery by{' '}
                          {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : 'N/A'}
                          {order.trackingNumber && (
                            <div className="mt-1">
                              Tracking: <span className="font-mono">{order.trackingNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {order.status === 'processing' && (
                      <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg p-3">
                        <Package className="w-4 h-4" />
                        Your order is being processed
                      </div>
                    )}
                  </div>

                  {/* Order Items Preview */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Items ({order.itemCount})
                    </h4>
                    <div className="space-y-3">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                            {/* Placeholder for product image */}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm line-clamp-1">
                              {item.productTitle}
                            </h5>
                            {item.variantTitle !== 'Default Title' && (
                              <p className="text-xs text-gray-500">{item.variantTitle}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                              <span className="font-medium text-sm">
                                {formatPrice(item.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {order.items.length > 3 && (
                        <div className="text-sm text-gray-600 text-center py-2">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}