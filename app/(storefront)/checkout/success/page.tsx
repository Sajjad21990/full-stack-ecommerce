import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Order Confirmed | Thank You for Your Purchase',
  description: 'Your order has been successfully placed and is being processed.',
}

interface CheckoutSuccessPageProps {
  searchParams: { order?: string }
}

export default function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const orderNumber = searchParams.order || '#ORD-UNKNOWN'
  // TODO: Fetch actual order details from database using orderNumber
  const orderTotal = '₹2,497'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="text-center">
          <CardContent className="pt-8 pb-6">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
            
            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Order Number</span>
                <span className="font-semibold">{orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount</span>
                <span className="font-semibold">{orderTotal}</span>
              </div>
            </div>
            
            {/* What's Next */}
            <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                What happens next?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You'll receive an order confirmation email shortly</li>
                <li>• We'll send you tracking information once shipped</li>
                <li>• Estimated delivery: 5-7 business days</li>
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/account/orders">
                  View Order Details
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Continue Shopping
                </Link>
              </Button>
            </div>
            
            {/* Contact Support */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-500">
                Need help? Contact our{' '}
                <Link href="/support" className="text-blue-600 hover:underline">
                  customer support team
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}