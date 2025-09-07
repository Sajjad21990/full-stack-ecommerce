'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  ShoppingCart, 
  ExternalLink,
  Loader2,
  Heart
} from 'lucide-react'
import { removeFromWishlist, moveToCart } from '@/lib/storefront/actions/wishlist'
import { formatPrice, formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface WishlistItem {
  id: string
  productId: string
  variantId: string | null
  productTitle: string
  productHandle: string
  productImage: string | null
  variantTitle: string | null
  variantImage: string | null
  price: number
  compareAtPrice: number | null
  notes: string | null
  createdAt: Date
}

interface Wishlist {
  id: string
  name: string
  items: WishlistItem[]
}

interface WishlistItemsProps {
  wishlist: Wishlist
}

export function WishlistItems({ wishlist }: WishlistItemsProps) {
  const router = useRouter()
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId))
    
    try {
      const result = await removeFromWishlist(itemId)
      if (result.success) {
        router.refresh()
      } else {
        console.error('Failed to remove item:', result.error)
      }
    } catch (error) {
      console.error('Error removing item:', error)
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const handleMoveToCart = async (itemId: string) => {
    setLoadingItems(prev => new Set(prev).add(itemId))
    
    try {
      const result = await moveToCart(itemId)
      if (result.success) {
        router.refresh()
      } else {
        console.error('Failed to move to cart:', result.error)
      }
    } catch (error) {
      console.error('Error moving to cart:', error)
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Wishlist Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{wishlist.name}</h2>
          <p className="text-gray-600">{wishlist.items.length} items</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Move all items to cart
              wishlist.items.forEach(item => {
                if (!loadingItems.has(item.id)) {
                  handleMoveToCart(item.id)
                }
              })
            }}
            disabled={wishlist.items.some(item => loadingItems.has(item.id))}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add All to Cart
          </Button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlist.items.map((item) => {
          const isLoading = loadingItems.has(item.id)
          const isRemoving = removingItems.has(item.id)
          
          return (
            <Card key={item.id} className={`group relative overflow-hidden ${isRemoving ? 'opacity-50' : ''}`}>
              <div className="relative">
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isRemoving}
                  className="absolute top-2 right-2 z-10 w-8 h-8 p-0 bg-white/80 hover:bg-white border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isRemoving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>

                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {item.productImage || item.variantImage ? (
                    <Image
                      src={item.productImage || item.variantImage!}
                      alt={item.productTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Heart className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {item.compareAtPrice && item.compareAtPrice > item.price && (
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                      Sale
                    </Badge>
                  )}
                </div>

                {/* Product Info */}
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Link
                      href={`/products/${item.productHandle}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {item.productTitle}
                    </Link>
                    
                    {item.variantTitle && item.variantTitle !== 'Default Title' && (
                      <p className="text-sm text-gray-500">{item.variantTitle}</p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(item.price)}
                      </span>
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(item.compareAtPrice)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Added {formatDate(item.createdAt)}
                    </p>

                    {item.notes && (
                      <p className="text-sm text-gray-600 italic">"{item.notes}"</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleMoveToCart(item.id)}
                      disabled={isLoading}
                      className="flex-1"
                      size="sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-10 p-0"
                    >
                      <Link href={`/products/${item.productHandle}`}>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Continue Shopping */}
      <div className="flex justify-center pt-8">
        <Button variant="outline" asChild>
          <Link href="/">
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  )
}