import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

interface OrderDetailPageProps {
  params: { orderNumber: string }
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  return {
    title: `Order ${params.orderNumber} | Order Details`,
    description: 'View detailed information about your order.',
  }
}

// Mock order data - in real implementation, fetch from database
const getOrderByNumber = async (orderNumber: string) => {
  // Simulate database fetch
  const mockOrder = {
    id: '1',
    orderNumber: 'ORD-20240301-0001',
    status: 'delivered',
    paymentStatus: 'paid',
    fulfillmentStatus: 'fulfilled',
    totalAmount: 2497,
    subtotalAmount: 2148,
    taxAmount: 199,
    shippingAmount: 150,
    currency: 'INR',
    email: 'customer@example.com',
    phone: '+91 9876543210',
    createdAt: new Date('2024-03-01T10:30:00'),
    processedAt: new Date('2024-03-01T11:00:00'),
    shippedAt: new Date('2024-03-02T14:30:00'),
    deliveredAt: new Date('2024-03-05T14:20:00'),
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main Street',
      address2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
      phone: '+91 9876543210'
    },
    billingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main Street',
      address2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India'
    },
    shippingMethodName: 'Express Delivery',
    trackingNumber: 'TRK123456789',
    items: [
      {
        id: '1',
        productTitle: 'Premium Wireless Headphones',
        productHandle: 'premium-wireless-headphones',
        variantTitle: 'Black',
        variantImage: '/api/placeholder/100/100',
        quantity: 1,
        price: 1999,
        compareAtPrice: 2499,
        total: 1999,
        sku: 'PWH-001-BLACK'
      },
      {
        id: '2',
        productTitle: 'USB-C Cable',
        productHandle: 'usb-c-cable',
        variantTitle: '2m',
        variantImage: '/api/placeholder/100/100',
        quantity: 2,
        price: 249,
        total: 498,
        sku: 'USB-C-2M'
      }
    ],
    payments: [
      {
        id: '1',
        amount: 2497,
        currency: 'INR',
        status: 'captured',
        gateway: 'razorpay',
        paymentMethod: 'card',
        cardLast4: '4242',
        cardBrand: 'visa',
        capturedAt: new Date('2024-03-01T10:35:00')
      }
    ]
  }

  return orderNumber === mockOrder.orderNumber ? mockOrder : null
}

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="w-4 h-4" />
    case 'shipped':
      return <Truck className="w-4 h-4" />
    case 'processing':
      return <Clock className="w-4 h-4" />
    case 'pending':
      return <AlertCircle className="w-4 h-4" />
    default:
      return <Package className="w-4 h-4" />
  }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const order = await getOrderByNumber(params.orderNumber)

  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/account/orders">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Placed on {formatDate(order.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  {formatPrice(order.totalAmount)}
                </div>
              </div>
            </div>
            <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
              {getStatusIcon(order.status)}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.deliveredAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-green-800">Delivered</div>
                        <div className="text-sm text-gray-600">{formatDate(order.deliveredAt)}</div>
                      </div>
                    </div>
                  )}
                  
                  {order.shippedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-blue-800">Shipped</div>
                        <div className="text-sm text-gray-600">{formatDate(order.shippedAt)}</div>
                        {order.trackingNumber && (
                          <div className="text-sm text-gray-600">
                            Tracking: <span className="font-mono">{order.trackingNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {order.processedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-yellow-800">Processing</div>
                        <div className="text-sm text-gray-600">{formatDate(order.processedAt)}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Order Placed</div>
                      <div className="text-sm text-gray-600">{formatDate(order.createdAt)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.variantImage && (
                          <Image
                            src={item.variantImage}
                            alt={item.productTitle}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <Link 
                          href={`/products/${item.productHandle}`}
                          className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {item.productTitle}
                        </Link>
                        {item.variantTitle !== 'Default Title' && (
                          <p className="text-sm text-gray-500 mt-1">{item.variantTitle}</p>
                        )}
                        {item.sku && (
                          <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                            <span className="text-sm font-medium">{formatPrice(item.price)}</span>
                            {item.compareAtPrice && item.compareAtPrice > item.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(item.compareAtPrice)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold">{formatPrice(item.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping ({order.shippingMethodName})</span>
                  <span>{formatPrice(order.shippingAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{formatPrice(order.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </div>
                  <div>{order.shippingAddress.address1}</div>
                  {order.shippingAddress.address2 && (
                    <div>{order.shippingAddress.address2}</div>
                  )}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </div>
                  <div>{order.shippingAddress.country}</div>
                  {order.shippingAddress.phone && (
                    <div className="flex items-center gap-1 mt-2">
                      <Phone className="w-3 h-3" />
                      {order.shippingAddress.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    {order.email}
                  </div>
                  {order.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4" />
                      {order.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.payments.map((payment) => (
                  <div key={payment.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Method</span>
                      <span className="capitalize">
                        {payment.paymentMethod === 'card' && payment.cardBrand 
                          ? `${payment.cardBrand} ****${payment.cardLast4}`
                          : payment.paymentMethod
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status</span>
                      <Badge variant="secondary">
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                    {payment.capturedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Paid</span>
                        <span>{formatDate(payment.capturedAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}