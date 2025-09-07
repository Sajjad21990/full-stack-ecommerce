import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  Truck, 
  Shield,
  CreditCard
} from 'lucide-react'
import { Cart } from '@/lib/storefront/queries/cart'
import { formatPrice } from '@/lib/utils'

interface CartSummaryProps {
  cart: Cart
}

export function CartSummary({ cart }: CartSummaryProps) {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const freeShippingThreshold = 999
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 150
  const tax = Math.round(subtotal * 0.18) // 18% GST
  const total = subtotal + shippingCost + tax

  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal)
  const freeShippingPercentage = Math.min(100, (subtotal / freeShippingThreshold) * 100)

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between">
            <span>Subtotal ({cart.totalQuantity} items)</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {/* Free Shipping Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Truck className="w-4 h-4" />
                Shipping
              </span>
              <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
            </div>
            
            {amountToFreeShipping > 0 ? (
              <div className="space-y-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${freeShippingPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 text-center">
                  Add {formatPrice(amountToFreeShipping)} more for free shipping
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 text-sm text-green-600 bg-green-50 rounded-lg p-2">
                <Shield className="w-4 h-4" />
                <span>You qualify for free shipping!</span>
              </div>
            )}
          </div>

          {/* Tax */}
          <div className="flex justify-between">
            <span>Tax (GST 18%)</span>
            <span>{formatPrice(tax)}</span>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {/* Checkout Button */}
          <Button asChild className="w-full" size="lg">
            <Link href="/checkout">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Promo Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="w-4 h-4" />
            Promo Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              placeholder="Enter promo code" 
              className="flex-1"
            />
            <Button variant="outline">Apply</Button>
          </div>
          
          {/* Available Offers */}
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">Available Offers:</p>
            <div className="space-y-1">
              <Badge variant="secondary" className="mr-2">SAVE10</Badge>
              <span className="text-xs text-gray-600">10% off on orders above ₹1000</span>
            </div>
            <div className="space-y-1">
              <Badge variant="secondary" className="mr-2">NEWUSER</Badge>
              <span className="text-xs text-gray-600">15% off for first-time customers</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Security */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Secure Payment</span>
            </div>
            <p className="text-xs text-gray-600">
              Your payment information is processed securely with 256-bit SSL encryption
            </p>
            <div className="flex justify-center gap-1">
              {/* Payment method icons would go here */}
              <div className="text-xs text-gray-500">
                Visa • Mastercard • UPI • Wallets
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Delivery */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Fast Delivery</p>
              <p className="text-sm text-green-700">
                Estimated delivery: {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Need help?{' '}
          <Link href="/support" className="text-blue-600 hover:underline">
            Contact our support team
          </Link>
        </p>
      </div>
    </div>
  )
}