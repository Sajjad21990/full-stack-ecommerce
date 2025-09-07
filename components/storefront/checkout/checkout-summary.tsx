import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, Truck, CreditCard } from 'lucide-react'
import { Cart } from '@/lib/storefront/queries/cart'
import { formatPrice } from '@/lib/utils'

interface CheckoutSummaryProps {
  cart: Cart
  shippingCost?: number
}

export function CheckoutSummary({ cart, shippingCost = 0 }: CheckoutSummaryProps) {
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = Math.round(subtotal * 0.18) // 18% GST
  const total = subtotal + shippingCost + tax

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
          {/* Cart Items */}
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={`${item.variantId}`} className="flex gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.productTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 text-xs min-w-[20px] h-5 flex items-center justify-center"
                  >
                    {item.quantity}
                  </Badge>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">{item.productTitle}</h4>
                  {item.variantTitle !== 'Default Title' && (
                    <p className="text-xs text-gray-500">{item.variantTitle}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                    <span className="font-medium text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Separator />
          
          {/* Pricing Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({cart.totalQuantity} items)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Shipping
              </span>
              <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Tax (GST 18%)</span>
              <span>{formatPrice(tax)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Security Badge */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <CreditCard className="w-4 h-4" />
            <span>Secure 256-bit SSL encryption</span>
          </div>
          <div className="text-xs text-center text-gray-500 mt-1">
            Your payment information is processed securely
          </div>
        </CardContent>
      </Card>
      
      {/* Money Back Guarantee */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm font-medium text-green-800">Money Back Guarantee</div>
            <div className="text-xs text-green-600 mt-1">
              30-day return policy on all orders
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}