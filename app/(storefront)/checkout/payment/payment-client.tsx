'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, MapPin, CreditCard } from 'lucide-react'
import { RazorpayCheckout } from '@/components/storefront/checkout/razorpay-checkout'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface Order {
  id: string
  orderNumber: string
  email: string
  phone?: string
  totalAmount: number
  subtotalAmount: number
  shippingAmount: number
  taxAmount: number
  currency: string
  status: string
  paymentStatus: string
  shippingAddress: any
  billingAddress: any
  items: any[]
}

interface PaymentPageProps {
  order: Order
}

export function PaymentPage({ order }: PaymentPageProps) {
  const handlePaymentSuccess = (paymentId: string, orderId: string) => {
    // This will be handled by the RazorpayCheckout component
    console.log('Payment successful:', { paymentId, orderId })
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    // Could show error toast or modal here
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/checkout">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Complete Payment</h1>
          <p className="text-gray-600">Order #{order.orderNumber}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Order Status</span>
                <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Status</span>
                <Badge variant={order.paymentStatus === 'pending' ? 'destructive' : 'default'}>
                  {order.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <RazorpayCheckout
            orderId={order.id}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            disabled={order.paymentStatus !== 'pending'}
          />

          {/* Security Notice */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-green-800">
                    Secure Payment
                  </h4>
                  <p className="text-sm text-green-700">
                    Your payment is processed securely through Razorpay's encrypted gateway. 
                    We don't store your card details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Items */}
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.productTitle}</p>
                      {item.variantTitle !== 'Default Title' && (
                        <p className="text-gray-500">{item.variantTitle}</p>
                      )}
                      <p className="text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(order.subtotalAmount)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>
                    {order.shippingAmount === 0 
                      ? 'Free' 
                      : formatPrice(order.shippingAmount)
                    }
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatPrice(order.taxAmount)}</span>
                </div>
                
                <div className="flex justify-between font-medium text-base pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && (
                  <p>{order.shippingAddress.address2}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="pt-2 text-gray-600">
                    Phone: {order.shippingAddress.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><strong>Email:</strong> {order.email}</p>
                {order.phone && (
                  <p><strong>Phone:</strong> {order.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}