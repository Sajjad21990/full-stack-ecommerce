'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Minus, 
  Plus, 
  X, 
  Heart, 
  ShoppingCart,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Cart } from '@/lib/storefront/queries/cart'
import { updateCartItem, removeFromCart } from '@/lib/storefront/actions/cart'
import { formatPrice } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface CartItemsProps {
  cart: Cart
}

export function CartItems({ cart }: CartItemsProps) {
  const router = useRouter()
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())

  const handleQuantityUpdate = async (variantId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    setLoadingItems(prev => new Set(prev).add(variantId))
    
    try {
      await updateCartItem(variantId, newQuantity)
      router.refresh()
    } catch (error) {
      console.error('Error updating cart item:', error)
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(variantId)
        return newSet
      })
    }
  }

  const handleRemoveItem = async (variantId: string) => {
    setRemovingItems(prev => new Set(prev).add(variantId))
    
    try {
      await removeFromCart(variantId)
      router.refresh()
    } catch (error) {
      console.error('Error removing cart item:', error)
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(variantId)
        return newSet
      })
    }
  }

  const handleSaveForLater = async (variantId: string) => {
    // TODO: Implement save for later functionality
    console.log('Save for later:', variantId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Cart Items ({cart.totalQuantity})
        </h2>
      </div>

      <Card>
        <CardContent className="p-0">
          {cart.items.map((item, index) => {
            const isLoading = loadingItems.has(item.variantId)
            const isRemoving = removingItems.has(item.variantId)
            
            return (
              <div key={item.variantId}>
                <div className={`p-6 ${isRemoving ? 'opacity-50' : ''}`}>
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <Badge className="absolute top-1 left-1 text-xs bg-red-500">
                          Sale
                        </Badge>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Link
                            href={`/products/${item.productHandle}`}
                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                          >
                            {item.productTitle}
                          </Link>
                          {item.variantTitle && item.variantTitle !== 'Default Title' && (
                            <p className="text-sm text-gray-500 mt-1">{item.variantTitle}</p>
                          )}
                          {item.sku && (
                            <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.variantId)}
                          disabled={isRemoving}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(item.price)}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(item.compareAtPrice)}
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityUpdate(item.variantId, item.quantity - 1)}
                              disabled={isLoading || item.quantity <= 1}
                              className="w-8 h-8 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuantityUpdate(item.variantId, item.quantity + 1)}
                              disabled={isLoading}
                              className="w-8 h-8 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveForLater(item.variantId)}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            <Heart className="w-4 h-4 mr-1" />
                            Save for Later
                          </Button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <span className="text-sm text-gray-600">
                          {item.quantity} × {formatPrice(item.price)}
                        </span>
                        <span className="font-semibold text-lg">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < cart.items.length - 1 && <Separator />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Shipping Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Free shipping on orders over ₹999</div>
              <div>
                Add {formatPrice(Math.max(0, 999 - (cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))))} more to qualify for free shipping
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Shopping */}
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/">
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}